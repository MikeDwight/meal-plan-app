import { prisma } from "@/lib/prisma";
import type {
  GenerateMealPlanRequest,
  GenerateMealPlanResponse,
  RecipeWithRelations,
  PantryItemData,
  HistoryEntry,
  SlotAssignment,
  SlotScoreBreakdown,
  ScoredRecipe,
  SlotKey,
  MealSlot,
  TagQuota,
  LeftoversOverrideResolved,
} from "./types";
import {
  MEAL_SLOTS,
  DAYS_IN_WEEK,
  DEFAULT_ANTI_REPEAT,
  DEFAULT_QUOTA_BONUS,
} from "./types";
import { computePantryCoverage } from "./scoring";
import { computeAntiRepeatPenalty } from "./antiRepeat";
import { computeQuotaBonus, incrementTagCounts } from "./quotas";

export class MealPlanGeneratorError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "MealPlanGeneratorError";
  }
}

/**
 * Normalise une date au lundi de sa semaine.
 * Retourne aussi la chaîne formatée YYYY-MM-DD pour la réponse.
 */
function normalizeToMonday(dateStr: string): { date: Date; formatted: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  const dayOfWeek = date.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setUTCDate(date.getUTCDate() + diff);
  
  const formatted = date.toISOString().split("T")[0];
  return { date, formatted };
}

function slotKeyToString(slot: SlotKey): string {
  return `${slot.dayIndex}-${slot.mealSlot}`;
}

async function fetchRecipes(householdId: string): Promise<RecipeWithRelations[]> {
  const recipes = await prisma.recipe.findMany({
    where: { householdId },
    include: {
      tags: { select: { tagId: true } },
      ingredients: { select: { ingredientId: true } },
    },
  });
  return recipes;
}

async function fetchPantryItems(householdId: string): Promise<PantryItemData[]> {
  const items = await prisma.pantryItem.findMany({
    where: { householdId },
    select: { ingredientId: true, quantity: true },
  });
  return items;
}

async function fetchHistory(
  householdId: string,
  weekStart: Date,
  lookbackWeeks: number
): Promise<HistoryEntry[]> {
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() - 7);

  const startDate = new Date(weekStart);
  startDate.setDate(startDate.getDate() - lookbackWeeks * 7);

  const weekPlans = await prisma.weekPlan.findMany({
    where: {
      householdId,
      weekStart: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      recipes: { select: { recipeId: true } },
    },
    orderBy: { weekStart: "desc" },
  });

  const history: HistoryEntry[] = [];

  for (const plan of weekPlans) {
    const planDate = new Date(plan.weekStart);
    const diffMs = weekStart.getTime() - planDate.getTime();
    const weeksAgo = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));

    for (const recipe of plan.recipes) {
      history.push({
        recipeId: recipe.recipeId,
        weeksAgo,
      });
    }
  }

  return history;
}

function filterEligibleRecipes(
  recipes: RecipeWithRelations[],
  excludedRecipeIds: Set<string>,
  excludedTagIds: Set<string>
): RecipeWithRelations[] {
  return recipes.filter((recipe) => {
    if (excludedRecipeIds.has(recipe.id)) {
      return false;
    }
    const recipeTagIds = recipe.tags.map((t) => t.tagId);
    if (recipeTagIds.some((tagId) => excludedTagIds.has(tagId))) {
      return false;
    }
    return true;
  });
}

function scoreRecipe(
  recipe: RecipeWithRelations,
  pantryItems: PantryItemData[],
  history: HistoryEntry[],
  basePenalty: number,
  decay: number,
  leftoversOverride: LeftoversOverrideResolved,
  currentTagCounts: Map<string, number>,
  tagQuotas: TagQuota[],
  quotaBonusValue: number
): ScoredRecipe {
  const pantryCoverageRatio = computePantryCoverage(recipe, pantryItems);

  const antiRepeatPenalty = computeAntiRepeatPenalty(
    recipe.id,
    history,
    basePenalty,
    decay,
    leftoversOverride,
    pantryCoverageRatio
  );

  const recipeTagIds = recipe.tags.map((t) => t.tagId);
  const quotaBonus = computeQuotaBonus(
    recipeTagIds,
    currentTagCounts,
    tagQuotas,
    quotaBonusValue
  );

  const finalScore = pantryCoverageRatio + quotaBonus - antiRepeatPenalty;

  return {
    recipe,
    pantryCoverageRatio,
    antiRepeatPenalty,
    quotaBonus,
    finalScore,
  };
}

function selectBestRecipe(
  eligibleRecipes: RecipeWithRelations[],
  usedRecipeIds: Set<string>,
  pantryItems: PantryItemData[],
  history: HistoryEntry[],
  basePenalty: number,
  decay: number,
  leftoversOverride: LeftoversOverrideResolved,
  currentTagCounts: Map<string, number>,
  tagQuotas: TagQuota[],
  quotaBonusValue: number
): ScoredRecipe | null {
  const availableRecipes = eligibleRecipes.filter(
    (r) => !usedRecipeIds.has(r.id)
  );

  if (availableRecipes.length === 0) {
    return null;
  }

  const scoredRecipes = availableRecipes.map((recipe) =>
    scoreRecipe(
      recipe,
      pantryItems,
      history,
      basePenalty,
      decay,
      leftoversOverride,
      currentTagCounts,
      tagQuotas,
      quotaBonusValue
    )
  );

  scoredRecipes.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    return a.recipe.id.localeCompare(b.recipe.id);
  });

  return scoredRecipes[0];
}

export async function generateMealPlan(
  request: GenerateMealPlanRequest
): Promise<GenerateMealPlanResponse> {
  const {
    householdId,
    weekStart: weekStartStr,
    days = DAYS_IN_WEEK,
    mealSlots = MEAL_SLOTS,
    required = [],
    exclude = {},
    antiRepeat = {},
    tagQuotas = [],
    quotaBonus = DEFAULT_QUOTA_BONUS,
    preserveManualSlots = false,
    debug = false,
  } = request;

  const household = await prisma.household.findUnique({
    where: { id: householdId },
  });

  if (!household) {
    throw new MealPlanGeneratorError(
      `Household not found: ${householdId}`,
      404
    );
  }

  const { date: weekStart, formatted: weekStartFormatted } = normalizeToMonday(weekStartStr);

  const requiredRecipeIds = required.map((r) => r.recipeId);
  const duplicateRecipeIds = requiredRecipeIds.filter(
    (id, index) => requiredRecipeIds.indexOf(id) !== index
  );
  if (duplicateRecipeIds.length > 0) {
    throw new MealPlanGeneratorError(
      `Duplicate recipeId in required placements: ${[...new Set(duplicateRecipeIds)].join(", ")}`,
      400
    );
  }

  const lookbackWeeks = antiRepeat.lookbackWeeks ?? DEFAULT_ANTI_REPEAT.lookbackWeeks;
  const basePenalty = antiRepeat.basePenalty ?? DEFAULT_ANTI_REPEAT.basePenalty;
  const decay = antiRepeat.decay ?? DEFAULT_ANTI_REPEAT.decay;
  const leftoversOverride: LeftoversOverrideResolved = {
    ...DEFAULT_ANTI_REPEAT.leftoversOverride,
    ...antiRepeat.leftoversOverride,
  };

  const [recipes, pantryItems, history] = await Promise.all([
    fetchRecipes(householdId),
    fetchPantryItems(householdId),
    fetchHistory(householdId, weekStart, lookbackWeeks),
  ]);

  if (recipes.length === 0) {
    throw new MealPlanGeneratorError(
      "No recipes available for this household",
      409
    );
  }

  const excludedRecipeIds = new Set(exclude.recipeIds ?? []);
  const excludedTagIds = new Set(exclude.tagIds ?? []);

  const eligibleRecipes = filterEligibleRecipes(
    recipes,
    excludedRecipeIds,
    excludedTagIds
  );

  const allSlots: SlotKey[] = [];
  for (let dayIndex = 0; dayIndex < days; dayIndex++) {
    for (const mealSlot of mealSlots) {
      allSlots.push({ dayIndex, mealSlot });
    }
  }

  const totalSlots = allSlots.length;

  const requiredPlacementsMap = new Map<string, string>();
  for (const placement of required) {
    if (placement.dayIndex < 0 || placement.dayIndex >= days) {
      throw new MealPlanGeneratorError(
        `Invalid dayIndex ${placement.dayIndex} in required`,
        400
      );
    }
    if (!mealSlots.includes(placement.mealSlot)) {
      throw new MealPlanGeneratorError(
        `Invalid mealSlot ${placement.mealSlot} in required`,
        400
      );
    }
    const recipe = recipes.find((r) => r.id === placement.recipeId);
    if (!recipe) {
      throw new MealPlanGeneratorError(
        `Recipe not found for required placement: ${placement.recipeId}`,
        404
      );
    }
    const key = slotKeyToString({ dayIndex: placement.dayIndex, mealSlot: placement.mealSlot });
    requiredPlacementsMap.set(key, placement.recipeId);
  }

  const weekPlan = await prisma.weekPlan.upsert({
    where: {
      householdId_weekStart: {
        householdId,
        weekStart,
      },
    },
    update: {
      updatedAt: new Date(),
    },
    create: {
      householdId,
      weekStart,
    },
  });

  // Load manual slots to preserve them during generation
  const manualSlotsMap = new Map<string, string>();
  if (preserveManualSlots) {
    const manualSlots = await prisma.weekPlanRecipe.findMany({
      where: { weekPlanId: weekPlan.id, isManual: true },
    });
    for (const ms of manualSlots) {
      const key = slotKeyToString({ dayIndex: ms.dayIndex, mealSlot: ms.mealSlot as MealSlot });
      manualSlotsMap.set(key, ms.recipeId);
    }
  }

  const assignments: SlotAssignment[] = [];
  const scoreBreakdowns: SlotScoreBreakdown[] = [];
  const usedRecipeIds = new Set<string>();
  const currentTagCounts = new Map<string, number>();

  // Pre-seed scoring context with manual recipes so the generator
  // avoids re-selecting them for other slots.
  for (const [, recipeId] of manualSlotsMap) {
    usedRecipeIds.add(recipeId);
    const recipe = recipes.find((r) => r.id === recipeId);
    if (recipe) {
      incrementTagCounts(
        recipe.tags.map((t) => t.tagId),
        currentTagCounts
      );
    }
  }

  let sortOrder = 0;

  for (const slot of allSlots) {
    const slotKey = slotKeyToString(slot);

    if (manualSlotsMap.has(slotKey)) {
      continue;
    }

    if (requiredPlacementsMap.has(slotKey)) {
      const recipeId = requiredPlacementsMap.get(slotKey)!;
      const recipe = recipes.find((r) => r.id === recipeId)!;

      assignments.push({
        dayIndex: slot.dayIndex,
        mealSlot: slot.mealSlot,
        recipeId,
        sortOrder: sortOrder++,
      });

      usedRecipeIds.add(recipeId);
      incrementTagCounts(
        recipe.tags.map((t) => t.tagId),
        currentTagCounts
      );

      if (debug) {
        const scored = scoreRecipe(
          recipe,
          pantryItems,
          history,
          basePenalty,
          decay,
          leftoversOverride,
          currentTagCounts,
          tagQuotas,
          quotaBonus
        );
        scoreBreakdowns.push({
          dayIndex: slot.dayIndex,
          mealSlot: slot.mealSlot,
          recipeId,
          recipeTitle: recipe.title,
          pantryCoverageRatio: scored.pantryCoverageRatio,
          antiRepeatPenalty: scored.antiRepeatPenalty,
          quotaBonus: scored.quotaBonus,
          finalScore: scored.finalScore,
        });
      }

      continue;
    }

    const bestRecipe = selectBestRecipe(
      eligibleRecipes,
      usedRecipeIds,
      pantryItems,
      history,
      basePenalty,
      decay,
      leftoversOverride,
      currentTagCounts,
      tagQuotas,
      quotaBonus
    );

    if (!bestRecipe) {
      throw new MealPlanGeneratorError(
        `Unable to fill all slots: not enough eligible recipes. Filled ${assignments.length}/${totalSlots}`,
        409
      );
    }

    assignments.push({
      dayIndex: slot.dayIndex,
      mealSlot: slot.mealSlot,
      recipeId: bestRecipe.recipe.id,
      sortOrder: sortOrder++,
    });

    usedRecipeIds.add(bestRecipe.recipe.id);
    incrementTagCounts(
      bestRecipe.recipe.tags.map((t) => t.tagId),
      currentTagCounts
    );

    if (debug) {
      scoreBreakdowns.push({
        dayIndex: slot.dayIndex,
        mealSlot: slot.mealSlot,
        recipeId: bestRecipe.recipe.id,
        recipeTitle: bestRecipe.recipe.title,
        pantryCoverageRatio: bestRecipe.pantryCoverageRatio,
        antiRepeatPenalty: bestRecipe.antiRepeatPenalty,
        quotaBonus: bestRecipe.quotaBonus,
        finalScore: bestRecipe.finalScore,
      });
    }
  }

  if (preserveManualSlots) {
    await prisma.weekPlanRecipe.deleteMany({
      where: { weekPlanId: weekPlan.id, isManual: false },
    });
  } else {
    await prisma.weekPlanRecipe.deleteMany({
      where: { weekPlanId: weekPlan.id },
    });
  }

  await prisma.weekPlanRecipe.createMany({
    data: assignments.map((a) => ({
      weekPlanId: weekPlan.id,
      recipeId: a.recipeId,
      dayIndex: a.dayIndex,
      mealSlot: a.mealSlot,
      sortOrder: a.sortOrder,
      isManual: false,
    })),
  });

  const response: GenerateMealPlanResponse = {
    weekPlanId: weekPlan.id,
    weekStart: weekStartFormatted,
    slots: assignments,
    meta: {
      totalSlots,
      filledSlots: assignments.length,
    },
  };

  if (debug && response.meta) {
    response.meta.scoreBreakdown = scoreBreakdowns;
  }

  return response;
}

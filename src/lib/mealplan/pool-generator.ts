import { prisma } from "@/lib/prisma";
import type {
  RecipeWithRelations,
  PantryItemData,
  HistoryEntry,
  LeftoversOverrideResolved,
} from "./types";
import { DEFAULT_ANTI_REPEAT } from "./types";
import { computePantryCoverage } from "./scoring";
import { computeAntiRepeatPenalty } from "./antiRepeat";

export class PoolGeneratorError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "PoolGeneratorError";
  }
}

export interface GeneratePoolRequest {
  householdId: string;
  weekStart: string;
  count: number;
  exclude?: {
    recipeIds?: string[];
    tagIds?: string[];
  };
  antiRepeat?: {
    lookbackWeeks?: number;
    basePenalty?: number;
    decay?: number;
    leftoversOverride?: Partial<LeftoversOverrideResolved>;
  };
}

export interface PoolRecipeItem {
  recipeId: string;
  score: number;
  sortOrder: number;
}

export interface GeneratePoolResponse {
  items: PoolRecipeItem[];
  meta: {
    requested: number;
    generated: number;
  };
}

function normalizeToMonday(dateStr: string): { date: Date; formatted: string } {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

  const dayOfWeek = date.getUTCDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  date.setUTCDate(date.getUTCDate() + diff);

  const formatted = date.toISOString().split("T")[0];
  return { date, formatted };
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

interface ScoredPoolRecipe {
  recipe: RecipeWithRelations;
  pantryCoverageRatio: number;
  antiRepeatPenalty: number;
  finalScore: number;
}

function scoreRecipeForPool(
  recipe: RecipeWithRelations,
  pantryItems: PantryItemData[],
  history: HistoryEntry[],
  basePenalty: number,
  decay: number,
  leftoversOverride: LeftoversOverrideResolved
): ScoredPoolRecipe {
  const pantryCoverageRatio = computePantryCoverage(recipe, pantryItems);

  const antiRepeatPenalty = computeAntiRepeatPenalty(
    recipe.id,
    history,
    basePenalty,
    decay,
    leftoversOverride,
    pantryCoverageRatio
  );

  const finalScore = pantryCoverageRatio - antiRepeatPenalty;

  return {
    recipe,
    pantryCoverageRatio,
    antiRepeatPenalty,
    finalScore,
  };
}

/**
 * Génère une liste de N recettes scorées pour un pool,
 * sans créer de WeekPlanRecipe (pas d'assignation aux slots).
 */
export async function generatePoolRecipes(
  request: GeneratePoolRequest
): Promise<GeneratePoolResponse> {
  const {
    householdId,
    weekStart: weekStartStr,
    count,
    exclude = {},
    antiRepeat = {},
  } = request;

  if (count < 1 || count > 50) {
    throw new PoolGeneratorError("count must be between 1 and 50", 400);
  }

  const household = await prisma.household.findUnique({
    where: { id: householdId },
  });

  if (!household) {
    throw new PoolGeneratorError(`Household not found: ${householdId}`, 404);
  }

  const { date: weekStart } = normalizeToMonday(weekStartStr);

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
    throw new PoolGeneratorError("No recipes available for this household", 409);
  }

  const excludedRecipeIds = new Set(exclude.recipeIds ?? []);
  const excludedTagIds = new Set(exclude.tagIds ?? []);

  const eligibleRecipes = filterEligibleRecipes(
    recipes,
    excludedRecipeIds,
    excludedTagIds
  );

  if (eligibleRecipes.length === 0) {
    throw new PoolGeneratorError("No eligible recipes after exclusions", 409);
  }

  const scoredRecipes = eligibleRecipes.map((recipe) =>
    scoreRecipeForPool(
      recipe,
      pantryItems,
      history,
      basePenalty,
      decay,
      leftoversOverride
    )
  );

  scoredRecipes.sort((a, b) => {
    if (b.finalScore !== a.finalScore) {
      return b.finalScore - a.finalScore;
    }
    return a.recipe.id.localeCompare(b.recipe.id);
  });

  const topN = scoredRecipes.slice(0, count);

  const items: PoolRecipeItem[] = topN.map((scored, index) => ({
    recipeId: scored.recipe.id,
    score: scored.finalScore,
    sortOrder: index,
  }));

  return {
    items,
    meta: {
      requested: count,
      generated: items.length,
    },
  };
}

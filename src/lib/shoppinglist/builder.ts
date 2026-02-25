import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/prisma";
import type {
  BuildShoppingListRequest,
  BuildShoppingListResponse,
  ShoppingItemRow,
  AggregatedNeed,
  PantryStock,
} from "./types";

export class ShoppingListBuilderError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = "ShoppingListBuilderError";
  }
}

function normalizeToMonday(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const dow = date.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

async function resolveWeekPlan(req: BuildShoppingListRequest) {
  if (req.weekPlanId) {
    const wp = await prisma.weekPlan.findUnique({
      where: { id: req.weekPlanId },
    });
    if (!wp) {
      throw new ShoppingListBuilderError(
        `WeekPlan not found: ${req.weekPlanId}`,
        404
      );
    }
    if (wp.householdId !== req.householdId) {
      throw new ShoppingListBuilderError(
        "WeekPlan does not belong to this household",
        403
      );
    }
    return wp;
  }

  const weekStart = normalizeToMonday(req.weekStart!);
  const wp = await prisma.weekPlan.findUnique({
    where: {
      householdId_weekStart: {
        householdId: req.householdId,
        weekStart,
      },
    },
  });
  if (!wp) {
    throw new ShoppingListBuilderError(
      `No WeekPlan found for household ${req.householdId} week ${req.weekStart}`,
      404
    );
  }
  return wp;
}

async function loadWeekPlanNeeds(weekPlanId: string) {
  return prisma.weekPlanRecipe.findMany({
    where: { weekPlanId },
    include: {
      recipe: {
        select: {
          servings: true,
          ingredients: {
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  defaultUnitId: true,
                  defaultAisleId: true,
                },
              },
              unit: { select: { id: true } },
            },
          },
        },
      },
    },
  });
}

async function loadPantryStock(householdId: string): Promise<PantryStock[]> {
  const items = await prisma.pantryItem.findMany({
    where: { householdId },
    select: { ingredientId: true, quantity: true, unitId: true },
  });
  return items;
}

function aggregationKey(ingredientId: string, unitId: string | null): string {
  return `${ingredientId}::${unitId ?? "NO_UNIT"}`;
}

function aggregateNeeds(
  weekPlanRecipes: Awaited<ReturnType<typeof loadWeekPlanNeeds>>
): Map<string, AggregatedNeed> {
  const needs = new Map<string, AggregatedNeed>();

  for (const wpr of weekPlanRecipes) {
    const recipeServings = wpr.recipe.servings ?? 1;
    const requestedServings = wpr.servings ?? recipeServings;
    const factor =
      recipeServings > 0
        ? new Decimal(requestedServings).div(recipeServings)
        : new Decimal(1);

    for (const ri of wpr.recipe.ingredients) {
      const resolvedUnitId =
        ri.unit?.id ?? ri.ingredient.defaultUnitId ?? null;

      const key = aggregationKey(ri.ingredient.id, resolvedUnitId);
      const scaledQty = ri.quantity.mul(factor);

      const existing = needs.get(key);
      if (existing) {
        existing.totalQuantity = existing.totalQuantity.add(scaledQty);
      } else {
        needs.set(key, {
          ingredientId: ri.ingredient.id,
          ingredientName: ri.ingredient.name,
          totalQuantity: scaledQty,
          unitId: resolvedUnitId,
          aisleId: ri.ingredient.defaultAisleId ?? null,
        });
      }
    }
  }

  return needs;
}

function buildPantryIndex(stock: PantryStock[]): Map<string, Decimal> {
  const index = new Map<string, Decimal>();
  for (const item of stock) {
    const key = aggregationKey(item.ingredientId, item.unitId);
    const existing = index.get(key) ?? new Decimal(0);
    index.set(key, existing.add(item.quantity));
  }
  return index;
}

function subtractPantry(
  needs: Map<string, AggregatedNeed>,
  pantryIndex: Map<string, Decimal>
): { remaining: Map<string, AggregatedNeed>; pantryDeductions: number } {
  const remaining = new Map<string, AggregatedNeed>();
  let pantryDeductions = 0;

  for (const [key, need] of needs) {
    const stock = pantryIndex.get(key);
    if (stock && stock.gt(0)) {
      pantryDeductions++;
      const afterDeduction = need.totalQuantity.sub(stock);
      if (afterDeduction.gt(0)) {
        remaining.set(key, { ...need, totalQuantity: afterDeduction });
      }
    } else {
      remaining.set(key, need);
    }
  }

  return { remaining, pantryDeductions };
}

/**
 * Reconstruit la clé d'agrégation à partir d'un ShoppingItem existant.
 */
function existingItemKey(item: {
  ingredientId: string | null;
  unitId: string | null;
}): string | null {
  if (!item.ingredientId) return null;
  return aggregationKey(item.ingredientId, item.unitId);
}

export async function buildShoppingList(
  request: BuildShoppingListRequest
): Promise<BuildShoppingListResponse> {
  const household = await prisma.household.findUnique({
    where: { id: request.householdId },
  });
  if (!household) {
    throw new ShoppingListBuilderError(
      `Household not found: ${request.householdId}`,
      404
    );
  }

  const weekPlan = await resolveWeekPlan(request);
  const weekPlanRecipes = await loadWeekPlanNeeds(weekPlan.id);

  if (weekPlanRecipes.length === 0) {
    throw new ShoppingListBuilderError(
      "WeekPlan has no recipes assigned",
      409
    );
  }

  const needs = aggregateNeeds(weekPlanRecipes);
  const ingredientsAggregated = needs.size;

  const pantryStock = await loadPantryStock(request.householdId);
  const pantryIndex = buildPantryIndex(pantryStock);
  const { remaining: neededMap, pantryDeductions } = subtractPantry(
    needs,
    pantryIndex
  );

  // -------------------------------------------------------------------------
  // Merge logic
  // -------------------------------------------------------------------------

  const existingItems = await prisma.shoppingItem.findMany({
    where: { weekPlanId: weekPlan.id, source: "MEALPLAN" },
  });

  const existingByKey = new Map<
    string,
    (typeof existingItems)[number]
  >();
  const unmatchedExisting: (typeof existingItems)[number][] = [];

  for (const item of existingItems) {
    const key = existingItemKey(item);
    if (key) {
      existingByKey.set(key, item);
    } else {
      unmatchedExisting.push(item);
    }
  }

  const toUpdate: { id: string; data: { label: string; quantity: Decimal; unitId: string | null; aisleId: string | null; status: "TODO"; archivedAt: null } }[] = [];
  const toCreate: { householdId: string; weekPlanId: string; ingredientId: string; label: string; quantity: Decimal; unitId: string | null; aisleId: string | null; status: "TODO"; source: "MEALPLAN"; archivedAt: null }[] = [];
  const toArchiveIds: string[] = [];

  const matchedKeys = new Set<string>();

  for (const [key, need] of neededMap) {
    const existing = existingByKey.get(key);
    if (existing) {
      matchedKeys.add(key);
      toUpdate.push({
        id: existing.id,
        data: {
          label: need.ingredientName,
          quantity: need.totalQuantity,
          unitId: need.unitId,
          aisleId: need.aisleId,
          status: "TODO",
          archivedAt: null,
        },
      });
    } else {
      toCreate.push({
        householdId: request.householdId,
        weekPlanId: weekPlan.id,
        ingredientId: need.ingredientId,
        label: need.ingredientName,
        quantity: need.totalQuantity,
        unitId: need.unitId,
        aisleId: need.aisleId,
        status: "TODO",
        source: "MEALPLAN",
        archivedAt: null,
      });
    }
  }

  for (const [key, item] of existingByKey) {
    if (!matchedKeys.has(key)) {
      toArchiveIds.push(item.id);
    }
  }
  for (const item of unmatchedExisting) {
    toArchiveIds.push(item.id);
  }

  // -------------------------------------------------------------------------
  // Execute in transaction
  // -------------------------------------------------------------------------

  await prisma.$transaction(async (tx) => {
    for (const upd of toUpdate) {
      await tx.shoppingItem.update({
        where: { id: upd.id },
        data: upd.data,
      });
    }

    if (toArchiveIds.length > 0) {
      await tx.shoppingItem.updateMany({
        where: { id: { in: toArchiveIds } },
        data: { archivedAt: new Date() },
      });
    }

    if (toCreate.length > 0) {
      await tx.shoppingItem.createMany({ data: toCreate });
    }
  });

  // -------------------------------------------------------------------------
  // Reload active items
  // -------------------------------------------------------------------------

  const activeItems = await prisma.shoppingItem.findMany({
    where: {
      weekPlanId: weekPlan.id,
      source: "MEALPLAN",
      archivedAt: null,
    },
    include: {
      unit: { select: { abbr: true } },
      aisle: { select: { name: true, sortOrder: true } },
    },
    orderBy: [
      { aisle: { sortOrder: "asc" } },
      { label: "asc" },
    ],
  });

  const items: ShoppingItemRow[] = activeItems.map((item) => ({
    id: item.id,
    ingredientId: item.ingredientId,
    label: item.label,
    quantity: item.quantity,
    unitId: item.unitId,
    unitAbbr: item.unit?.abbr ?? null,
    aisleId: item.aisleId,
    aisleName: item.aisle?.name ?? null,
    aisleSortOrder: item.aisle?.sortOrder ?? null,
    status: item.status as "TODO" | "DONE",
    source: "MEALPLAN",
    archivedAt: null,
  }));

  const weekStartStr =
    weekPlan.weekStart instanceof Date
      ? weekPlan.weekStart.toISOString().split("T")[0]
      : String(weekPlan.weekStart).split("T")[0];

  return {
    weekPlanId: weekPlan.id,
    weekStart: weekStartStr,
    items,
    meta: {
      totalActive: items.length,
      ingredientsAggregated,
      pantryDeductions,
      created: toCreate.length,
      updated: toUpdate.length,
      archived: toArchiveIds.length,
    },
  };
}

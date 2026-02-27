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

function currentMondayUTC(): Date {
  const now = new Date();
  const dow = now.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diff)
  );
  return monday;
}

async function loadActiveWeekPlans(householdId: string) {
  const monday = currentMondayUTC();
  return prisma.weekPlan.findMany({
    where: {
      householdId,
      weekStart: { gte: monday },
    },
    select: { id: true },
  });
}

async function loadWeekPlanNeeds(weekPlanIds: string[]) {
  return prisma.weekPlanRecipe.findMany({
    where: { weekPlanId: { in: weekPlanIds } },
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

  const activeWeekPlans = await loadActiveWeekPlans(request.householdId);
  const weekPlanIds = activeWeekPlans.map((wp) => wp.id);

  if (weekPlanIds.length === 0) {
    const archived = await prisma.shoppingItem.updateMany({
      where: {
        householdId: request.householdId,
        source: "MEALPLAN",
        status: "TODO",
        archivedAt: null,
      },
      data: { archivedAt: new Date() },
    });

    return {
      items: [],
      meta: {
        totalActive: 0,
        ingredientsAggregated: 0,
        pantryDeductions: 0,
        created: 0,
        updated: 0,
        archived: archived.count,
      },
    };
  }

  const weekPlanRecipes = await loadWeekPlanNeeds(weekPlanIds);

  if (weekPlanRecipes.length === 0) {
    const archived = await prisma.shoppingItem.updateMany({
      where: {
        householdId: request.householdId,
        source: "MEALPLAN",
        status: "TODO",
        archivedAt: null,
      },
      data: { archivedAt: new Date() },
    });

    return {
      items: [],
      meta: {
        totalActive: 0,
        ingredientsAggregated: 0,
        pantryDeductions: 0,
        created: 0,
        updated: 0,
        archived: archived.count,
      },
    };
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
  // Merge logic — DONE items are never touched; TODO = delta over DONE qty
  // -------------------------------------------------------------------------

  const existingItems = await prisma.shoppingItem.findMany({
    where: {
      householdId: request.householdId,
      source: "MEALPLAN",
      archivedAt: null,
    },
  });

  const doneQtyByKey = new Map<string, Decimal>();
  const todoByKey = new Map<string, (typeof existingItems)[number]>();
  const unmatchedTodo: (typeof existingItems)[number][] = [];

  for (const item of existingItems) {
    const key = existingItemKey(item);
    if (item.status === "DONE") {
      if (key) {
        const prev = doneQtyByKey.get(key) ?? new Decimal(0);
        doneQtyByKey.set(key, prev.add(item.quantity ?? new Decimal(0)));
      }
      continue;
    }
    if (key) {
      todoByKey.set(key, item);
    } else {
      unmatchedTodo.push(item);
    }
  }

  const toUpdate: { id: string; data: { label: string; quantity: Decimal; unitId: string | null; aisleId: string | null; status: "TODO"; archivedAt: null; weekPlanId: null } }[] = [];
  const toCreate: { householdId: string; weekPlanId: null; ingredientId: string; label: string; quantity: Decimal; unitId: string | null; aisleId: string | null; status: "TODO"; source: "MEALPLAN"; archivedAt: null }[] = [];
  const toArchiveIds: string[] = [];

  const matchedTodoKeys = new Set<string>();

  for (const [key, need] of neededMap) {
    const doneQty = doneQtyByKey.get(key);
    const remaining = doneQty ? need.totalQuantity.sub(doneQty) : need.totalQuantity;

    const existingTodo = todoByKey.get(key);

    if (remaining.lte(0)) {
      if (existingTodo) {
        matchedTodoKeys.add(key);
        toArchiveIds.push(existingTodo.id);
      }
      continue;
    }

    if (existingTodo) {
      matchedTodoKeys.add(key);
      toUpdate.push({
        id: existingTodo.id,
        data: {
          label: need.ingredientName,
          quantity: remaining,
          unitId: need.unitId,
          aisleId: need.aisleId,
          status: "TODO",
          archivedAt: null,
          weekPlanId: null,
        },
      });
    } else {
      toCreate.push({
        householdId: request.householdId,
        weekPlanId: null,
        ingredientId: need.ingredientId,
        label: need.ingredientName,
        quantity: remaining,
        unitId: need.unitId,
        aisleId: need.aisleId,
        status: "TODO",
        source: "MEALPLAN",
        archivedAt: null,
      });
    }
  }

  for (const [key, item] of todoByKey) {
    if (!matchedTodoKeys.has(key)) {
      toArchiveIds.push(item.id);
    }
  }
  for (const item of unmatchedTodo) {
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
  // Reload active items (all sources, global)
  // -------------------------------------------------------------------------

  const activeItems = await prisma.shoppingItem.findMany({
    where: {
      householdId: request.householdId,
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
    source: item.source as "MEALPLAN" | "MANUAL" | "TRANSITION",
    archivedAt: null,
  }));

  return {
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

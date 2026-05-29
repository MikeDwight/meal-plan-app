import { ShoppingItemStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateMealPlanAI } from "@/lib/assistant/ai-generator";
import { buildShoppingList } from "@/lib/shoppinglist/builder";
import { normalizeToMonday, getCurrentMondayString } from "@/lib/mealplan/utils";

const HOUSEHOLD_ID = "home-household";

async function getWeekPlan(args: { weekStart?: string }) {
  const weekStart = args.weekStart ?? getCurrentMondayString();
  const monday = normalizeToMonday(weekStart);

  const weekPlan = await prisma.weekPlan.findUnique({
    where: { householdId_weekStart: { householdId: HOUSEHOLD_ID, weekStart: monday } },
    include: {
      recipes: {
        include: {
          recipe: {
            select: {
              id: true,
              title: true,
              tags: { select: { tag: { select: { name: true } } } },
            },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!weekPlan) return { weekStart, items: [] };

  return {
    weekStart,
    items: weekPlan.recipes.map((wpr) => ({
      position: wpr.position,
      recipeId: wpr.recipe.id,
      title: wpr.recipe.title,
      tags: wpr.recipe.tags.map((rt) => rt.tag.name),
    })),
  };
}

async function generateMealPlanTool(args: { weekStart: string; count?: number }) {
  const result = await generateMealPlanAI(
    HOUSEHOLD_ID,
    args.weekStart,
    args.count ?? 14
  );

  const recipeIds = result.items.map((i) => i.recipeId);
  const recipes = await prisma.recipe.findMany({
    where: { id: { in: recipeIds } },
    select: { id: true, title: true },
  });
  const recipeMap = new Map(recipes.map((r) => [r.id, r.title]));

  return {
    weekStart: result.weekStart,
    count: result.items.length,
    items: result.items.map((i) => ({
      position: i.position,
      recipeId: i.recipeId,
      title: recipeMap.get(i.recipeId) ?? "?",
    })),
  };
}

async function getRecipes(args: { search?: string }) {
  const search = args.search?.trim();

  const recipes = await prisma.recipe.findMany({
    where: {
      householdId: HOUSEHOLD_ID,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { tags: { some: { tag: { name: { contains: search, mode: "insensitive" } } } } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      title: true,
      tags: { select: { tag: { select: { name: true } } } },
    },
    orderBy: { title: "asc" },
  });

  return recipes.map((r) => ({
    id: r.id,
    title: r.title,
    tags: r.tags.map((rt) => rt.tag.name),
  }));
}

async function getPantry() {
  const items = await prisma.pantryItem.findMany({
    where: { householdId: HOUSEHOLD_ID },
    include: {
      ingredient: { select: { name: true } },
      unit: { select: { abbr: true } },
    },
    orderBy: { ingredient: { name: "asc" } },
  });

  return items.map((item) => ({
    id: item.id,
    name: item.ingredient.name,
    quantity: Number(item.quantity),
    unit: item.unit?.abbr ?? null,
  }));
}

async function getShoppingList() {
  const items = await prisma.shoppingItem.findMany({
    where: { householdId: HOUSEHOLD_ID, archivedAt: null },
    include: {
      unit: { select: { abbr: true } },
      aisle: { select: { name: true } },
    },
    orderBy: [{ aisle: { sortOrder: "asc" } }, { label: "asc" }],
  });

  return items.map((item) => ({
    id: item.id,
    label: item.label,
    quantity: item.quantity !== null ? Number(item.quantity) : null,
    unit: item.unit?.abbr ?? null,
    aisle: item.aisle?.name ?? null,
    status: item.status,
  }));
}

async function buildShoppingListTool() {
  const result = await buildShoppingList({ householdId: HOUSEHOLD_ID });
  return { success: true, created: result.meta.created, updated: result.meta.updated };
}

async function toggleShoppingItem(args: { itemId: string; status?: string }) {
  const item = await prisma.shoppingItem.findUnique({ where: { id: args.itemId } });

  if (!item || item.householdId !== HOUSEHOLD_ID) {
    throw new Error("Article introuvable");
  }

  const newStatus: ShoppingItemStatus =
    (args.status as ShoppingItemStatus) ??
    (item.status === ShoppingItemStatus.TODO ? ShoppingItemStatus.DONE : ShoppingItemStatus.TODO);

  await prisma.shoppingItem.update({
    where: { id: args.itemId },
    data: { status: newStatus },
  });

  return { id: args.itemId, label: item.label, status: newStatus };
}

async function assignRecipeToSlot(args: { weekStart: string; recipeId: string; position: number }) {
  const recipe = await prisma.recipe.findUnique({
    where: { id: args.recipeId },
    select: { id: true, title: true, householdId: true },
  });

  if (!recipe || recipe.householdId !== HOUSEHOLD_ID) {
    throw new Error("Recette introuvable");
  }

  const monday = normalizeToMonday(args.weekStart);

  const weekPlan = await prisma.weekPlan.upsert({
    where: { householdId_weekStart: { householdId: HOUSEHOLD_ID, weekStart: monday } },
    update: { updatedAt: new Date() },
    create: { householdId: HOUSEHOLD_ID, weekStart: monday },
  });

  const existing = await prisma.weekPlanRecipe.findUnique({
    where: { weekPlanId_position: { weekPlanId: weekPlan.id, position: args.position } },
  });

  if (existing) {
    await prisma.weekPlanRecipe.update({
      where: { id: existing.id },
      data: { recipeId: args.recipeId, isManual: true },
    });
  } else {
    await prisma.weekPlanRecipe.create({
      data: { weekPlanId: weekPlan.id, recipeId: args.recipeId, position: args.position, isManual: true },
    });
  }

  await buildShoppingList({ householdId: HOUSEHOLD_ID });

  return { success: true, position: args.position, title: recipe.title };
}

async function clearWeek(args: { weekStart: string }) {
  const monday = normalizeToMonday(args.weekStart);

  const weekPlan = await prisma.weekPlan.findUnique({
    where: { householdId_weekStart: { householdId: HOUSEHOLD_ID, weekStart: monday } },
  });

  if (!weekPlan) return { success: true, deleted: 0 };

  const { count } = await prisma.weekPlanRecipe.deleteMany({
    where: { weekPlanId: weekPlan.id },
  });

  return { success: true, deleted: count };
}

const TOOL_MAP: Record<string, (args: Record<string, unknown>) => Promise<unknown>> = {
  get_week_plan: (args) => getWeekPlan(args as { weekStart?: string }),
  generate_meal_plan: (args) => generateMealPlanTool(args as { weekStart: string; count?: number }),
  get_recipes: (args) => getRecipes(args as { search?: string }),
  get_pantry: () => getPantry(),
  get_shopping_list: () => getShoppingList(),
  build_shopping_list: () => buildShoppingListTool(),
  toggle_shopping_item: (args) => toggleShoppingItem(args as { itemId: string; status?: string }),
  assign_recipe_to_slot: (args) =>
    assignRecipeToSlot(args as { weekStart: string; recipeId: string; position: number }),
  clear_week: (args) => clearWeek(args as { weekStart: string }),
};

export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const fn = TOOL_MAP[name];
  if (!fn) throw new Error(`Tool inconnu: ${name}`);
  return fn(args);
}

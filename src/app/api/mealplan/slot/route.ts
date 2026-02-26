import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeToMonday } from "@/lib/mealplan/utils";
import { buildShoppingList } from "@/lib/shoppinglist/builder";

const MealSlotSchema = z.enum(["lunch", "dinner"]);

const SlotSetRequestSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD format"),
  dayIndex: z.number().int().min(0).max(6),
  mealSlot: MealSlotSchema,
  recipeId: z.string().min(1, "recipeId is required"),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = SlotSetRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { householdId, weekStart, dayIndex, mealSlot, recipeId } =
      parseResult.data;

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: {
        id: true,
        title: true,
        householdId: true,
        tags: { select: { tag: { select: { name: true } } } },
      },
    });

    if (!recipe || recipe.householdId !== householdId) {
      return NextResponse.json(
        { error: "Recipe not found in this household" },
        { status: 404 }
      );
    }

    const monday = normalizeToMonday(weekStart);

    const weekPlan = await prisma.weekPlan.upsert({
      where: {
        householdId_weekStart: { householdId, weekStart: monday },
      },
      update: { updatedAt: new Date() },
      create: { householdId, weekStart: monday },
    });

    await prisma.weekPlanRecipe.deleteMany({
      where: { weekPlanId: weekPlan.id, dayIndex, mealSlot },
    });

    await prisma.weekPlanRecipe.create({
      data: {
        weekPlanId: weekPlan.id,
        recipeId,
        dayIndex,
        mealSlot,
        sortOrder: 0,
        isManual: true,
      },
    });

    await buildShoppingList({ householdId, weekPlanId: weekPlan.id });

    const weekStartStr = monday.toISOString().split("T")[0];

    return NextResponse.json(
      {
        weekPlanId: weekPlan.id,
        weekStart: weekStartStr,
        slot: {
          dayIndex,
          mealSlot,
          recipe: {
            id: recipe.id,
            title: recipe.title,
            tags: recipe.tags.map((rt) => rt.tag.name),
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in PUT /api/mealplan/slot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

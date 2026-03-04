import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeToMonday } from "@/lib/mealplan/utils";
import { buildShoppingList } from "@/lib/shoppinglist/builder";

const SlotDeleteRequestSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD format"),
  position: z.number().int().min(0),
});

const SlotSetRequestSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD format"),
  position: z.number().int().min(0),
  recipeId: z.string().min(1, "recipeId is required"),
  servings: z.number().int().min(1).optional(),
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = SlotDeleteRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { householdId, weekStart, position } = parseResult.data;
    const monday = normalizeToMonday(weekStart);

    const weekPlan = await prisma.weekPlan.findUnique({
      where: {
        householdId_weekStart: { householdId, weekStart: monday },
      },
    });

    if (!weekPlan) {
      return NextResponse.json({ ok: true, deleted: 0 }, { status: 200 });
    }

    const deletedItem = await prisma.weekPlanRecipe.findFirst({
      where: { weekPlanId: weekPlan.id, position },
    });

    if (!deletedItem) {
      return NextResponse.json({ ok: true, deleted: 0 }, { status: 200 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.weekPlanRecipe.delete({
        where: { id: deletedItem.id },
      });

      await tx.weekPlanRecipe.updateMany({
        where: {
          weekPlanId: weekPlan.id,
          position: { gt: position },
        },
        data: {
          position: { decrement: 1 },
        },
      });
    });

    await buildShoppingList({ householdId });

    return NextResponse.json({ ok: true, deleted: 1 }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/mealplan/slot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const { householdId, weekStart, position, recipeId, servings } =
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

    const existingItem = await prisma.weekPlanRecipe.findUnique({
      where: {
        weekPlanId_position: {
          weekPlanId: weekPlan.id,
          position,
        },
      },
    });

    if (existingItem) {
      await prisma.weekPlanRecipe.update({
        where: { id: existingItem.id },
        data: {
          recipeId,
          servings: servings ?? null,
          isManual: true,
        },
      });
    } else {
      await prisma.weekPlanRecipe.create({
        data: {
          weekPlanId: weekPlan.id,
          recipeId,
          position,
          servings: servings ?? null,
          isManual: true,
        },
      });
    }

    await buildShoppingList({ householdId });

    const weekStartStr = monday.toISOString().split("T")[0];

    return NextResponse.json(
      {
        weekPlanId: weekPlan.id,
        weekStart: weekStartStr,
        item: {
          position,
          recipe: {
            id: recipe.id,
            title: recipe.title,
            tags: recipe.tags.map((rt) => rt.tag.name),
          },
          isManual: true,
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

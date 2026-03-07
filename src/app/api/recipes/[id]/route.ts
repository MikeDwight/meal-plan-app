import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const RecipeIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().positive(),
  unitId: z.string().nullish(),
  notes: z.string().nullish(),
});

const UpdateRecipeSchema = z.object({
  householdId: z.string().min(1),
  title: z.string().min(1),
  sourceUrl: z.string().url().nullish(),
  servings: z.number().int().min(1).nullish(),
  instructions: z.string().nullish(),
  notes: z.string().nullish(),
  tagIds: z.array(z.string()).optional(),
  ingredients: z.array(RecipeIngredientSchema).min(1),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const householdId = request.nextUrl.searchParams.get("householdId");

    if (!householdId) {
      return NextResponse.json(
        { error: "householdId is required" },
        { status: 400 }
      );
    }

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        tags: {
          select: {
            tag: { select: { id: true, name: true } },
          },
        },
        ingredients: {
          include: {
            ingredient: { select: { id: true, name: true } },
            unit: { select: { id: true, name: true, abbr: true } },
          },
        },
      },
    });

    if (!recipe || recipe.householdId !== householdId) {
      return NextResponse.json(
        { error: "Recipe not found" },
        { status: 404 }
      );
    }

    const result = {
      id: recipe.id,
      title: recipe.title,
      sourceUrl: recipe.sourceUrl,
      servings: recipe.servings,
      instructions: recipe.instructions,
      notes: recipe.notes,
      tags: recipe.tags.map((rt) => ({ id: rt.tag.id, name: rt.tag.name })),
      ingredients: recipe.ingredients.map((ri) => ({
        id: ri.id,
        ingredient: ri.ingredient,
        quantity: ri.quantity.toString(),
        unit: ri.unit,
        notes: ri.notes,
      })),
    };

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/recipes/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parseResult = UpdateRecipeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const existing = await prisma.recipe.findUnique({ where: { id }, select: { householdId: true } });
    if (!existing || existing.householdId !== data.householdId) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    const recipe = await prisma.$transaction(async (tx) => {
      await tx.recipe.update({
        where: { id },
        data: {
          title: data.title,
          sourceUrl: data.sourceUrl ?? null,
          servings: data.servings ?? null,
          instructions: data.instructions ?? null,
          notes: data.notes ?? null,
        },
      });

      await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
      await tx.recipeTag.deleteMany({ where: { recipeId: id } });

      await tx.recipeIngredient.createMany({
        data: data.ingredients.map((ing) => ({
          recipeId: id,
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unitId: ing.unitId ?? null,
          notes: ing.notes ?? null,
        })),
      });

      if (data.tagIds && data.tagIds.length > 0) {
        await tx.recipeTag.createMany({
          data: data.tagIds.map((tagId) => ({ recipeId: id, tagId })),
        });
      }

      return tx.recipe.findUnique({
        where: { id },
        select: { id: true },
      });
    });

    return NextResponse.json(recipe, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in PUT /api/recipes/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const householdId = request.nextUrl.searchParams.get("householdId");

    if (!householdId) {
      return NextResponse.json({ error: "householdId is required" }, { status: 400 });
    }

    const existing = await prisma.recipe.findUnique({ where: { id }, select: { householdId: true } });
    if (!existing || existing.householdId !== householdId) {
      return NextResponse.json({ error: "Recipe not found" }, { status: 404 });
    }

    await prisma.recipe.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/recipes/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

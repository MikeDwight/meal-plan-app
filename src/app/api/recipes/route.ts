import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const RecipeIngredientSchema = z.object({
  ingredientId: z.string().min(1),
  quantity: z.number().positive(),
  unitId: z.string().nullish(),
  notes: z.string().nullish(),
});

const CreateRecipeSchema = z.object({
  householdId: z.string().min(1),
  title: z.string().min(1),
  sourceUrl: z.string().url().nullish(),
  servings: z.number().int().min(1).nullish(),
  instructions: z.string().nullish(),
  notes: z.string().nullish(),
  tagIds: z.array(z.string()).optional(),
  ingredients: z.array(RecipeIngredientSchema).min(1),
});

export async function GET(request: NextRequest) {
  try {
    const householdId = request.nextUrl.searchParams.get("householdId");

    if (!householdId) {
      return NextResponse.json(
        { error: "householdId is required" },
        { status: 400 }
      );
    }

    const recipes = await prisma.recipe.findMany({
      where: { householdId },
      select: {
        id: true,
        title: true,
        tags: {
          select: { tag: { select: { name: true } } },
        },
      },
      orderBy: { title: "asc" },
    });

    const result = recipes.map((r) => ({
      id: r.id,
      title: r.title,
      tags: r.tags.map((rt) => rt.tag.name),
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/recipes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = CreateRecipeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const recipe = await prisma.$transaction(async (tx) => {
      const created = await tx.recipe.create({
        data: {
          householdId: data.householdId,
          title: data.title,
          sourceUrl: data.sourceUrl ?? null,
          servings: data.servings ?? null,
          instructions: data.instructions ?? null,
          notes: data.notes ?? null,
        },
      });

      await tx.recipeIngredient.createMany({
        data: data.ingredients.map((ing) => ({
          recipeId: created.id,
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unitId: ing.unitId ?? null,
          notes: ing.notes ?? null,
        })),
      });

      if (data.tagIds && data.tagIds.length > 0) {
        await tx.recipeTag.createMany({
          data: data.tagIds.map((tagId) => ({
            recipeId: created.id,
            tagId,
          })),
        });
      }

      return tx.recipe.findUnique({
        where: { id: created.id },
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
    });

    if (!recipe) {
      return NextResponse.json(
        { error: "Failed to create recipe" },
        { status: 500 }
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

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/recipes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

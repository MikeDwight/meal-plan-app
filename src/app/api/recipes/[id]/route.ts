import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      servings: recipe.servings,
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
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

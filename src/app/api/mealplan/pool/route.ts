import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeToMonday } from "@/lib/mealplan/utils";

export interface PoolRecipeResponse {
  id: string;
  recipeId: string;
  title: string;
  tags: string[];
  score: number | null;
  sortOrder: number;
}

export interface GetPoolResponse {
  poolId: string | null;
  weekStart: string;
  recipes: PoolRecipeResponse[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const householdId = searchParams.get("householdId");
    const weekStart = searchParams.get("weekStart");

    if (!householdId) {
      return NextResponse.json(
        { error: "householdId is required" },
        { status: 400 }
      );
    }

    if (!weekStart) {
      return NextResponse.json(
        { error: "weekStart is required" },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json(
        { error: "weekStart must be YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    const monday = normalizeToMonday(weekStart);

    const pool = await prisma.weekRecipePool.findUnique({
      where: {
        householdId_weekStart: { householdId, weekStart: monday },
      },
      include: {
        items: {
          include: {
            recipe: {
              select: {
                id: true,
                title: true,
                tags: {
                  select: { tag: { select: { name: true } } },
                },
              },
            },
          },
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    const weekStartStr = monday.toISOString().split("T")[0];

    if (!pool) {
      const response: GetPoolResponse = {
        poolId: null,
        weekStart: weekStartStr,
        recipes: [],
      };
      return NextResponse.json(response, { status: 200 });
    }

    const recipes: PoolRecipeResponse[] = pool.items.map((item) => ({
      id: item.id,
      recipeId: item.recipe.id,
      title: item.recipe.title,
      tags: item.recipe.tags.map((rt) => rt.tag.name),
      score: item.score,
      sortOrder: item.sortOrder,
    }));

    const response: GetPoolResponse = {
      poolId: pool.id,
      weekStart: weekStartStr,
      recipes,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/mealplan/pool:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

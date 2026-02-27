import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeToMonday } from "@/lib/mealplan/utils";
import {
  generatePoolRecipes,
  PoolGeneratorError,
} from "@/lib/mealplan/pool-generator";
import type { PoolRecipeResponse } from "../route";

const requestSchema = z.object({
  householdId: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  count: z.number().int().min(1).max(50),
  exclude: z
    .object({
      recipeIds: z.array(z.string()).optional(),
      tagIds: z.array(z.string()).optional(),
    })
    .optional(),
});

export interface GeneratePoolApiResponse {
  poolId: string;
  weekStart: string;
  recipes: PoolRecipeResponse[];
  meta: {
    requested: number;
    generated: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { householdId, weekStart: weekStartStr, count, exclude } = parsed.data;

    const result = await generatePoolRecipes({
      householdId,
      weekStart: weekStartStr,
      count,
      exclude,
    });

    const monday = normalizeToMonday(weekStartStr);
    const weekStartFormatted = monday.toISOString().split("T")[0];

    const pool = await prisma.weekRecipePool.upsert({
      where: {
        householdId_weekStart: { householdId, weekStart: monday },
      },
      update: {
        updatedAt: new Date(),
      },
      create: {
        householdId,
        weekStart: monday,
      },
    });

    await prisma.weekRecipePoolItem.deleteMany({
      where: { poolId: pool.id },
    });

    await prisma.weekRecipePoolItem.createMany({
      data: result.items.map((item) => ({
        poolId: pool.id,
        recipeId: item.recipeId,
        score: item.score,
        sortOrder: item.sortOrder,
      })),
    });

    const poolWithRecipes = await prisma.weekRecipePool.findUnique({
      where: { id: pool.id },
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

    const recipes: PoolRecipeResponse[] =
      poolWithRecipes?.items.map((item) => ({
        id: item.id,
        recipeId: item.recipe.id,
        title: item.recipe.title,
        tags: item.recipe.tags.map((rt) => rt.tag.name),
        score: item.score,
        sortOrder: item.sortOrder,
      })) ?? [];

    const response: GeneratePoolApiResponse = {
      poolId: pool.id,
      weekStart: weekStartFormatted,
      recipes,
      meta: result.meta,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof PoolGeneratorError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }

    console.error("Unexpected error in POST /api/mealplan/pool/generate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

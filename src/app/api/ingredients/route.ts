import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createIngredientSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
  name: z.string().min(1, "name is required"),
  defaultUnitId: z.string().nullable().optional(),
  defaultAisleId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const householdId = request.nextUrl.searchParams.get("householdId");
    const q = request.nextUrl.searchParams.get("q");
    const limitParam = request.nextUrl.searchParams.get("limit");

    if (!householdId) {
      return NextResponse.json(
        { error: "householdId is required" },
        { status: 400 }
      );
    }

    let limit = 50;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 200);
      }
    }

    const ingredients = await prisma.ingredient.findMany({
      where: {
        householdId,
        ...(q && {
          name: {
            contains: q,
            mode: "insensitive",
          },
        }),
      },
      select: {
        id: true,
        name: true,
        defaultUnitId: true,
        defaultAisleId: true,
      },
      orderBy: { name: "asc" },
      take: limit,
    });

    return NextResponse.json(ingredients, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/ingredients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createIngredientSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request body" },
        { status: 400 }
      );
    }

    const { householdId, name, defaultUnitId, defaultAisleId } = parsed.data;
    const nameTrim = name.trim();

    if (nameTrim.length === 0) {
      return NextResponse.json(
        { error: "name cannot be empty" },
        { status: 400 }
      );
    }

    const existing = await prisma.ingredient.findFirst({
      where: {
        householdId,
        name: { equals: nameTrim, mode: "insensitive" },
      },
      select: {
        id: true,
        name: true,
        defaultUnitId: true,
        defaultAisleId: true,
      },
    });

    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const created = await prisma.ingredient.create({
      data: {
        householdId,
        name: nameTrim,
        defaultUnitId: defaultUnitId ?? null,
        defaultAisleId: defaultAisleId ?? null,
      },
      select: {
        id: true,
        name: true,
        defaultUnitId: true,
        defaultAisleId: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: string }).code === "P2002"
    ) {
      const body = await request.json().catch(() => null);
      if (body?.householdId && body?.name) {
        const existing = await prisma.ingredient.findFirst({
          where: {
            householdId: body.householdId,
            name: { equals: body.name.trim(), mode: "insensitive" },
          },
          select: {
            id: true,
            name: true,
            defaultUnitId: true,
            defaultAisleId: true,
          },
        });
        if (existing) {
          return NextResponse.json(existing, { status: 200 });
        }
      }
    }

    console.error("Unexpected error in POST /api/ingredients:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  householdId: z.string().min(1),
  ingredientId: z.string().min(1),
  quantity: z.number().positive(),
  unitId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const householdId = request.nextUrl.searchParams.get("householdId");
  if (!householdId) {
    return NextResponse.json({ error: "householdId is required" }, { status: 400 });
  }

  try {
    const items = await prisma.pantryItem.findMany({
      where: { householdId },
      include: {
        ingredient: { select: { name: true } },
        unit: { select: { abbr: true } },
      },
      orderBy: { ingredient: { name: "asc" } },
    });

    return NextResponse.json(
      items.map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient.name,
        quantity: Number(item.quantity),
        unitId: item.unitId,
        unitAbbr: item.unit?.abbr ?? null,
      }))
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/pantry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { householdId, ingredientId, quantity, unitId } = parsed.data;

    const existing = await prisma.pantryItem.findFirst({
      where: { householdId, ingredientId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Cet ingrédient est déjà dans le garde-manger" },
        { status: 409 }
      );
    }

    const item = await prisma.pantryItem.create({
      data: { householdId, ingredientId, quantity, unitId: unitId ?? null },
      include: {
        ingredient: { select: { name: true } },
        unit: { select: { abbr: true } },
      },
    });

    return NextResponse.json(
      {
        id: item.id,
        ingredientId: item.ingredientId,
        ingredientName: item.ingredient.name,
        quantity: Number(item.quantity),
        unitId: item.unitId,
        unitAbbr: item.unit?.abbr ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/pantry:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

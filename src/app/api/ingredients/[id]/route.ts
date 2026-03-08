import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const refs = await prisma.ingredient.findUnique({
      where: { id },
      select: {
        _count: {
          select: {
            recipeIngredients: true,
            pantryItems: true,
            shoppingItems: true,
            transitionItems: true,
          },
        },
      },
    });

    if (!refs) {
      return NextResponse.json({ error: "Introuvable" }, { status: 404 });
    }

    const total = refs._count.recipeIngredients + refs._count.pantryItems + refs._count.shoppingItems + refs._count.transitionItems;
    if (total > 0) {
      return NextResponse.json(
        { error: `Cet article est utilisé (${refs._count.recipeIngredients} recette(s), ${refs._count.pantryItems} garde-manger, ${refs._count.shoppingItems} courses). Retirez-le d'abord.` },
        { status: 409 }
      );
    }

    await prisma.ingredient.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/ingredients/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  defaultUnitId: z.string().nullable().optional(),
  defaultAisleId: z.string().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const ingredient = await prisma.ingredient.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.defaultUnitId !== undefined && { defaultUnitId: parsed.data.defaultUnitId }),
        ...(parsed.data.defaultAisleId !== undefined && { defaultAisleId: parsed.data.defaultAisleId }),
      },
      select: {
        id: true,
        name: true,
        defaultUnitId: true,
        defaultAisleId: true,
        defaultUnit: { select: { abbr: true } },
        defaultAisle: { select: { name: true } },
      },
    });

    return NextResponse.json({
      id: ingredient.id,
      name: ingredient.name,
      defaultUnitId: ingredient.defaultUnitId,
      defaultUnitAbbr: ingredient.defaultUnit?.abbr ?? null,
      defaultAisleId: ingredient.defaultAisleId,
      defaultAisleName: ingredient.defaultAisle?.name ?? null,
    });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/ingredients/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

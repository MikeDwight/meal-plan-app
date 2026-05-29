import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  abbr: z.string().min(1).optional(),
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
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }

    const unit = await prisma.unit.findUnique({ where: { id } });
    if (!unit) {
      return NextResponse.json({ error: "Unité introuvable" }, { status: 404 });
    }

    const { name, abbr } = parsed.data;

    if (abbr && abbr !== unit.abbr) {
      const conflict = await prisma.unit.findUnique({
        where: { householdId_abbr: { householdId: unit.householdId, abbr } },
      });
      if (conflict) {
        return NextResponse.json({ error: `L'abréviation « ${abbr} » existe déjà` }, { status: 409 });
      }
    }

    const updated = await prisma.unit.update({
      where: { id },
      data: { name: name ?? unit.name, abbr: abbr ?? unit.abbr },
      select: { id: true, name: true, abbr: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Unexpected error in PATCH /api/units/[id]:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const unit = await prisma.unit.findUnique({ where: { id } });
    if (!unit) {
      return NextResponse.json({ error: "Unité introuvable" }, { status: 404 });
    }

    const [ingredients, recipeIngredients, pantryItems, shoppingItems, transitionItems] =
      await Promise.all([
        prisma.ingredient.count({ where: { defaultUnitId: id } }),
        prisma.recipeIngredient.count({ where: { unitId: id } }),
        prisma.pantryItem.count({ where: { unitId: id } }),
        prisma.shoppingItem.count({ where: { unitId: id } }),
        prisma.transitionItem.count({ where: { unitId: id } }),
      ]);

    const total = ingredients + recipeIngredients + pantryItems + shoppingItems + transitionItems;
    if (total > 0) {
      return NextResponse.json(
        { error: `Unité utilisée (${total} référence${total > 1 ? "s" : ""}) — modifiez-la plutôt que de la supprimer` },
        { status: 409 }
      );
    }

    await prisma.unit.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/units/[id]:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}

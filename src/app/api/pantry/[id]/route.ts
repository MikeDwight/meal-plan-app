import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  quantity: z.number().positive().optional(),
  unitId: z.string().nullable().optional(),
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

    const item = await prisma.pantryItem.update({
      where: { id },
      data: {
        ...(parsed.data.quantity !== undefined && { quantity: parsed.data.quantity }),
        ...(parsed.data.unitId !== undefined && { unitId: parsed.data.unitId }),
      },
      include: {
        ingredient: { select: { name: true } },
        unit: { select: { abbr: true } },
      },
    });

    return NextResponse.json({
      id: item.id,
      ingredientId: item.ingredientId,
      ingredientName: item.ingredient.name,
      quantity: Number(item.quantity),
      unitId: item.unitId,
      unitAbbr: item.unit?.abbr ?? null,
    });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/pantry/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.pantryItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unexpected error in DELETE /api/pantry/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

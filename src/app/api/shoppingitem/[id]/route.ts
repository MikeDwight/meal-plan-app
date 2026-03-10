import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ShoppingItemRow } from "@/lib/shoppinglist/types";

const PatchSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
  status: z.enum(["TODO", "DONE"]).optional(),
  quantity: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const n = Number(v);
      if (Number.isNaN(n)) return null;
      return n;
    }),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parseResult = PatchSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { householdId, status: explicitStatus, quantity } = parseResult.data;

    const item = await prisma.shoppingItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: `ShoppingItem not found: ${id}` },
        { status: 404 }
      );
    }

    if (item.householdId !== householdId) {
      return NextResponse.json(
        { error: "ShoppingItem does not belong to this household" },
        { status: 403 }
      );
    }

    const newStatus =
      explicitStatus ?? (item.status === "TODO" ? "DONE" : "TODO");

    const updateData: Record<string, unknown> = { status: newStatus };
    if (quantity !== undefined) updateData.quantity = quantity;

    const updated = await prisma.shoppingItem.update({
      where: { id },
      data: updateData,
      include: {
        unit: { select: { abbr: true } },
        aisle: { select: { name: true, sortOrder: true } },
      },
    });

    const row: ShoppingItemRow = {
      id: updated.id,
      ingredientId: updated.ingredientId,
      label: updated.label,
      quantity: updated.quantity,
      unitId: updated.unitId,
      unitAbbr: updated.unit?.abbr ?? null,
      aisleId: updated.aisleId,
      aisleName: updated.aisle?.name ?? null,
      aisleSortOrder: updated.aisle?.sortOrder ?? null,
      status: updated.status as "TODO" | "DONE",
      source: updated.source as ShoppingItemRow["source"],
      archivedAt: updated.archivedAt?.toISOString() ?? null,
    };

    return NextResponse.json(row, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/shoppingitem/[id]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

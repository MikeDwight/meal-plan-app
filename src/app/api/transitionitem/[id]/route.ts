import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { TransitionItemRow } from "@/lib/transition/types";

function toRow(item: {
  id: string;
  householdId: string;
  ingredientId: string | null;
  label: string;
  quantity: import("@prisma/client/runtime/library").Decimal | null;
  unitId: string | null;
  aisleId: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): TransitionItemRow {
  return {
    id: item.id,
    householdId: item.householdId,
    ingredientId: item.ingredientId,
    label: item.label,
    quantity: item.quantity,
    unitId: item.unitId,
    aisleId: item.aisleId,
    status: item.status as "TODO" | "DONE",
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// PATCH /api/transitionitem/:id
// ---------------------------------------------------------------------------

const PatchSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
  status: z.enum(["TODO", "DONE"]).optional(),
  label: z.string().min(1, "label must not be empty").optional(),
  quantity: z
    .union([z.number(), z.string()])
    .nullish()
    .transform((v) => {
      if (v === null || v === undefined) return null;
      const n = Number(v);
      if (Number.isNaN(n)) return null;
      return n;
    }),
  unitId: z.string().min(1).nullish(),
  aisleId: z.string().min(1).nullish(),
  ingredientId: z.string().min(1).nullish(),
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

    const { householdId, status: explicitStatus, ...fields } = parseResult.data;

    const item = await prisma.transitionItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: `TransitionItem not found: ${id}` },
        { status: 404 }
      );
    }

    if (item.householdId !== householdId) {
      return NextResponse.json(
        { error: "TransitionItem does not belong to this household" },
        { status: 403 }
      );
    }

    const newStatus =
      explicitStatus ?? (item.status === "TODO" ? "DONE" : "TODO");

    const updateData: Record<string, unknown> = { status: newStatus };

    if ("label" in fields && fields.label !== undefined) {
      updateData.label = fields.label;
    }
    if ("quantity" in fields) {
      updateData.quantity = fields.quantity;
    }
    if ("unitId" in fields) {
      updateData.unitId = fields.unitId ?? null;
    }
    if ("aisleId" in fields) {
      updateData.aisleId = fields.aisleId ?? null;
    }
    if ("ingredientId" in fields) {
      updateData.ingredientId = fields.ingredientId ?? null;
    }

    const updated = await prisma.transitionItem.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(toRow(updated), { status: 200 });
  } catch (error) {
    console.error(
      "Unexpected error in PATCH /api/transitionitem/[id]:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/transitionitem/:id
// ---------------------------------------------------------------------------

const DeleteSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parseResult = DeleteSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { householdId } = parseResult.data;

    const item = await prisma.transitionItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: `TransitionItem not found: ${id}` },
        { status: 404 }
      );
    }

    if (item.householdId !== householdId) {
      return NextResponse.json(
        { error: "TransitionItem does not belong to this household" },
        { status: 403 }
      );
    }

    await prisma.transitionItem.delete({ where: { id } });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error(
      "Unexpected error in DELETE /api/transitionitem/[id]:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

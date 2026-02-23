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
// GET /api/transitionitems?householdId=...&includeDone=true|false
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const householdId = searchParams.get("householdId");
    const includeDone = searchParams.get("includeDone") === "true";

    if (!householdId) {
      return NextResponse.json(
        { error: "householdId is required" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { householdId };
    if (!includeDone) {
      where.status = "TODO";
    }

    const items = await prisma.transitionItem.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(items.map(toRow), { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/transitionitems:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/transitionitems
// ---------------------------------------------------------------------------

const CreateSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
  ingredientId: z.string().min(1).nullish(),
  label: z.string().min(1, "label is required"),
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
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = CreateSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const household = await prisma.household.findUnique({
      where: { id: data.householdId },
    });
    if (!household) {
      return NextResponse.json(
        { error: `Household not found: ${data.householdId}` },
        { status: 404 }
      );
    }

    const item = await prisma.transitionItem.create({
      data: {
        householdId: data.householdId,
        ingredientId: data.ingredientId ?? null,
        label: data.label,
        quantity: data.quantity,
        unitId: data.unitId ?? null,
        aisleId: data.aisleId ?? null,
      },
    });

    return NextResponse.json(toRow(item), { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/transitionitems:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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

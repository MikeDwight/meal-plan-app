import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeToMonday } from "@/lib/mealplan/utils";

const requestSchema = z.object({
  householdId: z.string().min(1),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

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

    const { householdId, weekStart: weekStartStr } = parsed.data;

    const monday = normalizeToMonday(weekStartStr);

    const pool = await prisma.weekRecipePool.findUnique({
      where: {
        householdId_weekStart: { householdId, weekStart: monday },
      },
    });

    if (pool) {
      await prisma.weekRecipePoolItem.deleteMany({
        where: { poolId: pool.id },
      });

      await prisma.weekRecipePool.delete({
        where: { id: pool.id },
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in POST /api/mealplan/pool/clear:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

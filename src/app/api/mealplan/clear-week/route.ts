import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { normalizeToMonday } from "@/lib/mealplan/utils";
import { buildShoppingList } from "@/lib/shoppinglist/builder";

const ClearWeekSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
  weekStart: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD format"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = ClearWeekSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { householdId, weekStart } = parseResult.data;
    const monday = normalizeToMonday(weekStart);

    const weekPlan = await prisma.weekPlan.findUnique({
      where: {
        householdId_weekStart: { householdId, weekStart: monday },
      },
    });

    if (!weekPlan) {
      return NextResponse.json({ ok: true, deleted: 0 }, { status: 200 });
    }

    const { count } = await prisma.weekPlanRecipe.deleteMany({
      where: { weekPlanId: weekPlan.id },
    });

    await buildShoppingList({ householdId });

    return NextResponse.json({ ok: true, deleted: count }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in POST /api/mealplan/clear-week:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

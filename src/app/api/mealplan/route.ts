import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { GetWeekPlanResponse, WeekPlanSlot } from "@/lib/mealplan/types";

function normalizeToMonday(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const dow = date.getUTCDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  date.setUTCDate(date.getUTCDate() + diff);
  return date;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const householdId = searchParams.get("householdId");
    const weekStart = searchParams.get("weekStart");

    if (!householdId) {
      return NextResponse.json(
        { error: "householdId is required" },
        { status: 400 }
      );
    }

    if (!weekStart) {
      return NextResponse.json(
        { error: "weekStart is required" },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json(
        { error: "weekStart must be YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    const monday = normalizeToMonday(weekStart);

    const weekPlan = await prisma.weekPlan.findUnique({
      where: {
        householdId_weekStart: { householdId, weekStart: monday },
      },
      include: {
        recipes: {
          include: {
            recipe: {
              select: {
                id: true,
                title: true,
                tags: {
                  select: { tag: { select: { name: true } } },
                },
              },
            },
          },
          orderBy: [{ dayIndex: "asc" }, { sortOrder: "asc" }],
        },
      },
    });

    if (!weekPlan) {
      return NextResponse.json(
        {
          error: `No WeekPlan found for household ${householdId} week ${weekStart}`,
        },
        { status: 404 }
      );
    }

    if (weekPlan.householdId !== householdId) {
      return NextResponse.json(
        { error: "WeekPlan does not belong to this household" },
        { status: 403 }
      );
    }

    const weekStartStr =
      weekPlan.weekStart instanceof Date
        ? weekPlan.weekStart.toISOString().split("T")[0]
        : String(weekPlan.weekStart).split("T")[0];

    const slots: WeekPlanSlot[] = weekPlan.recipes.map((wpr) => ({
      dayIndex: wpr.dayIndex,
      mealSlot: wpr.mealSlot as WeekPlanSlot["mealSlot"],
      sortOrder: wpr.sortOrder,
      recipe: {
        id: wpr.recipe.id,
        title: wpr.recipe.title,
        tags: wpr.recipe.tags.map((rt) => rt.tag.name),
      },
    }));

    const response: GetWeekPlanResponse = {
      weekPlanId: weekPlan.id,
      weekStart: weekStartStr,
      slots,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/mealplan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

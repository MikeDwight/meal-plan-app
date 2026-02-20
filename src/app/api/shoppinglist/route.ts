import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  GetShoppingListResponse,
  ShoppingItemRow,
} from "@/lib/shoppinglist/types";

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
    const weekPlanId = searchParams.get("weekPlanId");
    const weekStart = searchParams.get("weekStart");
    const includeArchived = searchParams.get("includeArchived") === "true";
    const includeDone = searchParams.get("includeDone") !== "false";

    if (!householdId) {
      return NextResponse.json(
        { error: "householdId is required" },
        { status: 400 }
      );
    }

    if (!weekPlanId && !weekStart) {
      return NextResponse.json(
        { error: "Either weekPlanId or weekStart must be provided" },
        { status: 400 }
      );
    }

    if (weekPlanId && weekStart) {
      return NextResponse.json(
        { error: "Provide weekPlanId or weekStart, not both" },
        { status: 400 }
      );
    }

    if (weekStart && !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json(
        { error: "weekStart must be YYYY-MM-DD format" },
        { status: 400 }
      );
    }

    // ----- resolve WeekPlan -----

    let weekPlan;

    if (weekPlanId) {
      weekPlan = await prisma.weekPlan.findUnique({
        where: { id: weekPlanId },
      });
      if (!weekPlan) {
        return NextResponse.json(
          { error: `WeekPlan not found: ${weekPlanId}` },
          { status: 404 }
        );
      }
      if (weekPlan.householdId !== householdId) {
        return NextResponse.json(
          { error: "WeekPlan does not belong to this household" },
          { status: 403 }
        );
      }
    } else {
      const monday = normalizeToMonday(weekStart!);
      weekPlan = await prisma.weekPlan.findUnique({
        where: {
          householdId_weekStart: { householdId, weekStart: monday },
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
    }

    // ----- build where clause -----

    const where: Record<string, unknown> = {
      weekPlanId: weekPlan.id,
    };

    if (!includeArchived) {
      where.archivedAt = null;
    }

    if (!includeDone) {
      where.status = "TODO";
    }

    // ----- query -----

    const rawItems = await prisma.shoppingItem.findMany({
      where,
      include: {
        unit: { select: { abbr: true } },
        aisle: { select: { name: true, sortOrder: true } },
      },
      orderBy: [
        { aisle: { sortOrder: "asc" } },
        { label: "asc" },
      ],
    });

    const items: ShoppingItemRow[] = rawItems.map((item) => ({
      id: item.id,
      ingredientId: item.ingredientId,
      label: item.label,
      quantity: item.quantity,
      unitId: item.unitId,
      unitAbbr: item.unit?.abbr ?? null,
      aisleId: item.aisleId,
      aisleName: item.aisle?.name ?? null,
      aisleSortOrder: item.aisle?.sortOrder ?? null,
      status: item.status as "TODO" | "DONE",
      source: item.source as ShoppingItemRow["source"],
      archivedAt: item.archivedAt?.toISOString() ?? null,
    }));

    // ----- meta counters (over ALL items of the weekPlan, unfiltered) -----

    const allItems = await prisma.shoppingItem.findMany({
      where: { weekPlanId: weekPlan.id },
      select: { status: true, archivedAt: true },
    });

    const done = allItems.filter((i) => i.status === "DONE").length;
    const todo = allItems.filter((i) => i.status === "TODO").length;
    const archived = allItems.filter((i) => i.archivedAt !== null).length;

    const weekStartStr =
      weekPlan.weekStart instanceof Date
        ? weekPlan.weekStart.toISOString().split("T")[0]
        : String(weekPlan.weekStart).split("T")[0];

    const response: GetShoppingListResponse = {
      weekPlanId: weekPlan.id,
      weekStart: weekStartStr,
      items,
      meta: {
        total: items.length,
        done,
        todo,
        archived,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/shoppinglist:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

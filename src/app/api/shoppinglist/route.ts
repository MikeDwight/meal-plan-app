import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type {
  GetShoppingListResponse,
  ShoppingItemRow,
} from "@/lib/shoppinglist/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const householdId = searchParams.get("householdId");
    const includeArchived = searchParams.get("includeArchived") === "true";
    const includeDone = searchParams.get("includeDone") !== "false";

    if (!householdId) {
      return NextResponse.json(
        { error: "householdId is required" },
        { status: 400 }
      );
    }

    const where: Record<string, unknown> = { householdId };

    if (!includeArchived) {
      where.archivedAt = null;
    }

    if (!includeDone) {
      where.status = "TODO";
    }

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

    const activeItems = await prisma.shoppingItem.findMany({
      where: { householdId, archivedAt: null },
      select: { status: true },
    });

    const done = activeItems.filter((i) => i.status === "DONE").length;
    const todo = activeItems.filter((i) => i.status === "TODO").length;

    const response: GetShoppingListResponse = {
      items,
      meta: {
        total: items.length,
        done,
        todo,
        archived: 0,
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

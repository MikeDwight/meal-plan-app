import { Decimal } from "@prisma/client/runtime/library";

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

export interface ShoppingItemRow {
  id: string;
  ingredientId: string | null;
  label: string;
  quantity: Decimal | null;
  unitId: string | null;
  unitAbbr: string | null;
  aisleId: string | null;
  aisleName: string | null;
  aisleSortOrder: number | null;
  status: "TODO" | "DONE";
  source: "MEALPLAN" | "MANUAL" | "TRANSITION";
  archivedAt: string | null;
}

// ---------------------------------------------------------------------------
// POST /api/shoppinglist/build
// ---------------------------------------------------------------------------

export interface BuildShoppingListRequest {
  householdId: string;
  weekPlanId?: string;
  weekStart?: string;
}

export interface BuildShoppingListResponse {
  weekPlanId: string;
  weekStart: string;
  items: ShoppingItemRow[];
  meta: {
    totalActive: number;
    ingredientsAggregated: number;
    pantryDeductions: number;
    created: number;
    updated: number;
    archived: number;
  };
}

// ---------------------------------------------------------------------------
// GET /api/shoppinglist
// ---------------------------------------------------------------------------

export interface GetShoppingListRequest {
  householdId: string;
  weekPlanId?: string;
  weekStart?: string;
  includeArchived: boolean;
  includeDone: boolean;
}

export interface GetShoppingListResponse {
  weekPlanId: string;
  weekStart: string;
  items: ShoppingItemRow[];
  meta: {
    total: number;
    done: number;
    todo: number;
    archived: number;
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

export interface AggregatedNeed {
  ingredientId: string;
  ingredientName: string;
  totalQuantity: Decimal;
  unitId: string | null;
  aisleId: string | null;
}

export interface PantryStock {
  ingredientId: string;
  quantity: Decimal;
  unitId: string | null;
}

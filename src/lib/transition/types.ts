import { Decimal } from "@prisma/client/runtime/library";

export interface TransitionItemRow {
  id: string;
  householdId: string;
  ingredientId: string | null;
  label: string;
  quantity: Decimal | null;
  unitId: string | null;
  aisleId: string | null;
  status: "TODO" | "DONE";
  createdAt: string;
  updatedAt: string;
}

export interface ApplyTransitionResponse {
  weekPlanId: string;
  weekStart: string;
  applied: number;
  merged: number;
  created: number;
}

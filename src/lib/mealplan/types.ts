import { Decimal } from "@prisma/client/runtime/library";

// ---------------------------------------------------------------------------
// CONSTANTS
// ---------------------------------------------------------------------------

export const DEFAULT_MEAL_COUNT = 14;

// ---------------------------------------------------------------------------
// REQUIRED PLACEMENT (position-based)
// ---------------------------------------------------------------------------

export interface RequiredPlacement {
  position: number;
  recipeId: string;
}

// ---------------------------------------------------------------------------
// TAG QUOTAS
// ---------------------------------------------------------------------------

export interface TagQuota {
  tagId: string;
  min: number;
}

// ---------------------------------------------------------------------------
// LEFTOVERS OVERRIDE
// ---------------------------------------------------------------------------

export interface LeftoversOverride {
  enabled?: boolean;
  minPantryCoverageRatio?: number;
  penaltyMultiplierWhenCovered?: number;
}

export interface LeftoversOverrideResolved {
  enabled: boolean;
  minPantryCoverageRatio: number;
  penaltyMultiplierWhenCovered: number;
}

// ---------------------------------------------------------------------------
// EXCLUSIONS
// ---------------------------------------------------------------------------

export interface Exclusions {
  recipeIds?: string[];
  tagIds?: string[];
}

// ---------------------------------------------------------------------------
// GENERATE MEAL PLAN REQUEST (position-based)
// ---------------------------------------------------------------------------

export interface GenerateMealPlanRequest {
  householdId: string;
  weekStart: string;
  count?: number;
  required?: RequiredPlacement[];
  exclude?: {
    recipeIds?: string[];
    tagIds?: string[];
  };
  antiRepeat?: {
    lookbackWeeks?: number;
    basePenalty?: number;
    decay?: number;
    leftoversOverride?: LeftoversOverride;
  };
  tagQuotas?: TagQuota[];
  quotaBonus?: number;
  preserveManualPositions?: boolean;
  debug?: boolean;
}

// ---------------------------------------------------------------------------
// MEAL PLAN ITEM (single item in the plan)
// ---------------------------------------------------------------------------

export interface MealPlanItem {
  position: number;
  recipeId: string;
}

// ---------------------------------------------------------------------------
// SCORE BREAKDOWN (for debug)
// ---------------------------------------------------------------------------

export interface ItemScoreBreakdown {
  position: number;
  recipeId: string;
  recipeTitle: string;
  pantryCoverageRatio: number;
  antiRepeatPenalty: number;
  quotaBonus: number;
  finalScore: number;
}

// ---------------------------------------------------------------------------
// GENERATE MEAL PLAN RESPONSE
// ---------------------------------------------------------------------------

export interface GenerateMealPlanResponse {
  weekPlanId: string;
  weekStart: string;
  items: MealPlanItem[];
  meta?: {
    totalPositions: number;
    filledPositions: number;
    scoreBreakdown?: ItemScoreBreakdown[];
  };
}

// ---------------------------------------------------------------------------
// GET /api/mealplan RESPONSE TYPES
// ---------------------------------------------------------------------------

export interface WeekPlanItem {
  position: number;
  recipe: {
    id: string;
    title: string;
    tags: string[];
  };
}

export interface GetWeekPlanResponse {
  weekPlanId: string;
  weekStart: string;
  items: WeekPlanItem[];
}

// ---------------------------------------------------------------------------
// INTERNAL TYPES (used by generator)
// ---------------------------------------------------------------------------

export interface RecipeWithRelations {
  id: string;
  title: string;
  householdId: string;
  tags: { tagId: string }[];
  ingredients: { ingredientId: string }[];
}

export interface PantryItemData {
  ingredientId: string;
  quantity: Decimal;
}

export interface HistoryEntry {
  recipeId: string;
  weeksAgo: number;
}

export interface ScoredRecipe {
  recipe: RecipeWithRelations;
  pantryCoverageRatio: number;
  antiRepeatPenalty: number;
  quotaBonus: number;
  finalScore: number;
}

// ---------------------------------------------------------------------------
// DEFAULTS
// ---------------------------------------------------------------------------

export const DEFAULT_ANTI_REPEAT = {
  lookbackWeeks: 4,
  basePenalty: 0.5,
  decay: 0.5,
  leftoversOverride: {
    enabled: false,
    minPantryCoverageRatio: 0.8,
    penaltyMultiplierWhenCovered: 0.2,
  },
};

export const DEFAULT_QUOTA_BONUS = 0.1;

// ---------------------------------------------------------------------------
// LEGACY COMPAT (for API migration - Phase 3)
// These types are DEPRECATED and will be removed after API migration.
// ---------------------------------------------------------------------------

/** @deprecated Use position-based types instead */
export type MealSlot = "lunch" | "dinner";

/** @deprecated Use DEFAULT_MEAL_COUNT instead */
export const MEAL_SLOTS: MealSlot[] = ["lunch", "dinner"];

/** @deprecated Use DEFAULT_MEAL_COUNT instead */
export const DAYS_IN_WEEK = 7;

/** @deprecated Use MealPlanItem instead */
export interface SlotAssignment {
  dayIndex: number;
  mealSlot: MealSlot;
  recipeId: string;
  sortOrder: number;
}

/** @deprecated Use ItemScoreBreakdown instead */
export interface SlotScoreBreakdown {
  dayIndex: number;
  mealSlot: MealSlot;
  recipeId: string;
  recipeTitle: string;
  pantryCoverageRatio: number;
  antiRepeatPenalty: number;
  quotaBonus: number;
  finalScore: number;
}

/** @deprecated Use WeekPlanItem instead */
export interface WeekPlanSlot {
  dayIndex: number;
  mealSlot: MealSlot;
  sortOrder: number;
  recipe: {
    id: string;
    title: string;
    tags: string[];
  };
}

/** @deprecated Internal use only */
export interface SlotKey {
  dayIndex: number;
  mealSlot: MealSlot;
}

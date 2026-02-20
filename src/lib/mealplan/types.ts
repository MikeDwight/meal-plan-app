import { Decimal } from "@prisma/client/runtime/library";

export type MealSlot = "lunch" | "dinner";

export const MEAL_SLOTS: MealSlot[] = ["lunch", "dinner"];
export const DAYS_IN_WEEK = 7;

export interface RequiredPlacement {
  dayIndex: number;
  mealSlot: MealSlot;
  recipeId: string;
}

export interface TagQuota {
  tagId: string;
  min: number;
}

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

export interface Exclusions {
  recipeIds?: string[];
  tagIds?: string[];
}

export interface GenerateMealPlanRequest {
  householdId: string;
  weekStart: string;
  days?: number;
  mealSlots?: MealSlot[];
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
  debug?: boolean;
}


export interface SlotAssignment {
  dayIndex: number;
  mealSlot: MealSlot;
  recipeId: string;
  sortOrder: number;
}

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

export interface GenerateMealPlanResponse {
  weekPlanId: string;
  weekStart: string;
  slots: SlotAssignment[];
  meta?: {
    totalSlots: number;
    filledSlots: number;
    scoreBreakdown?: SlotScoreBreakdown[];
  };
}

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

export interface SlotKey {
  dayIndex: number;
  mealSlot: MealSlot;
}

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

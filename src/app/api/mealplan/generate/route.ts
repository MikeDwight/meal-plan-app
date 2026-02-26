import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateMealPlan, MealPlanGeneratorError } from "@/lib/mealplan/generator";
import type { GenerateMealPlanRequest } from "@/lib/mealplan/types";
import { buildShoppingList } from "@/lib/shoppinglist/builder";

const MealSlotSchema = z.enum(["lunch", "dinner"]);

const RequiredPlacementSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  mealSlot: MealSlotSchema,
  recipeId: z.string().min(1),
});

const TagQuotaSchema = z.object({
  tagId: z.string().min(1),
  min: z.number().int().min(0),
});

const LeftoversOverrideSchema = z.object({
  enabled: z.boolean().optional(),
  minPantryCoverageRatio: z.number().min(0).max(1).optional(),
  penaltyMultiplierWhenCovered: z.number().min(0).max(1).optional(),
});

const AntiRepeatSchema = z.object({
  lookbackWeeks: z.number().int().min(0).max(52).optional(),
  basePenalty: z.number().min(0).max(1).optional(),
  decay: z.number().min(0).max(1).optional(),
  leftoversOverride: LeftoversOverrideSchema.optional(),
});

const ExcludeSchema = z.object({
  recipeIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
});

const GenerateMealPlanRequestSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD format"),
  days: z.number().int().min(1).max(7).optional(),
  mealSlots: z.array(MealSlotSchema).min(1).optional(),

  // V1
  required: z.array(RequiredPlacementSchema).optional(),
  exclude: ExcludeSchema.optional(),

  // legacy
  requiredPlacements: z.array(RequiredPlacementSchema).optional(),
  exclusions: ExcludeSchema.optional(),

  antiRepeat: AntiRepeatSchema.optional(),
  tagQuotas: z.array(TagQuotaSchema).optional(),
  quotaBonus: z.number().min(0).max(1).optional(),
  preserveManualSlots: z.boolean().optional(),
  debug: z.boolean().optional(),
});

type NormalizeResult =
  | { ok: true; data: GenerateMealPlanRequest }
  | { ok: false; error: string };

function normalizeRequest(parsed: z.infer<typeof GenerateMealPlanRequestSchema>): NormalizeResult {
  if (parsed.required !== undefined && parsed.requiredPlacements !== undefined) {
    return { ok: false, error: "Ambiguous request: cannot specify both 'required' and 'requiredPlacements'" };
  }
  if (parsed.exclude !== undefined && parsed.exclusions !== undefined) {
    return { ok: false, error: "Ambiguous request: cannot specify both 'exclude' and 'exclusions'" };
  }

  const required = parsed.required ?? parsed.requiredPlacements ?? [];
  const exclude = parsed.exclude ?? parsed.exclusions ?? { recipeIds: [], tagIds: [] };

  return {
    ok: true,
    data: {
      householdId: parsed.householdId,
      weekStart: parsed.weekStart,
      days: parsed.days,
      mealSlots: parsed.mealSlots,
      required,
      exclude,
      antiRepeat: parsed.antiRepeat,
      tagQuotas: parsed.tagQuotas,
      quotaBonus: parsed.quotaBonus,
      preserveManualSlots: parsed.preserveManualSlots,
      debug: parsed.debug,
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = GenerateMealPlanRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation error", details: parseResult.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const normalizeResult = normalizeRequest(parseResult.data);
    if (!normalizeResult.ok) {
      return NextResponse.json({ error: normalizeResult.error }, { status: 400 });
    }

    const result = await generateMealPlan(normalizeResult.data);
    await buildShoppingList({
      householdId: normalizeResult.data.householdId,
      weekPlanId: result.weekPlanId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof MealPlanGeneratorError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Unexpected error in mealplan/generate:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateMealPlan, MealPlanGeneratorError } from "@/lib/mealplan/generator";
import type { GenerateMealPlanRequest, RequiredPlacement } from "@/lib/mealplan/types";
import { buildShoppingList } from "@/lib/shoppinglist/builder";

const MealSlotSchema = z.enum(["lunch", "dinner"]);

const LegacyRequiredPlacementSchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  mealSlot: MealSlotSchema,
  recipeId: z.string().min(1),
});

const PositionRequiredPlacementSchema = z.object({
  position: z.number().int().min(0),
  recipeId: z.string().min(1),
});

const RequiredPlacementSchema = z.union([
  PositionRequiredPlacementSchema,
  LegacyRequiredPlacementSchema,
]);

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

  count: z.number().int().min(1).max(100).optional(),

  days: z.number().int().min(1).max(7).optional(),
  mealSlots: z.array(MealSlotSchema).min(1).optional(),

  required: z.array(RequiredPlacementSchema).optional(),
  requiredPlacements: z.array(LegacyRequiredPlacementSchema).optional(),

  exclude: ExcludeSchema.optional(),
  exclusions: ExcludeSchema.optional(),

  antiRepeat: AntiRepeatSchema.optional(),
  tagQuotas: z.array(TagQuotaSchema).optional(),
  quotaBonus: z.number().min(0).max(1).optional(),

  preserveManualPositions: z.boolean().optional(),
  preserveManualSlots: z.boolean().optional(),

  debug: z.boolean().optional(),
});

type ParsedRequest = z.infer<typeof GenerateMealPlanRequestSchema>;

type NormalizeResult =
  | { ok: true; data: GenerateMealPlanRequest }
  | { ok: false; error: string };

function isLegacyPlacement(p: unknown): p is { dayIndex: number; mealSlot: string; recipeId: string } {
  return typeof p === "object" && p !== null && "dayIndex" in p && "mealSlot" in p;
}

function convertLegacyPlacement(p: { dayIndex: number; mealSlot: string; recipeId: string }): RequiredPlacement {
  const position = p.dayIndex * 2 + (p.mealSlot === "dinner" ? 1 : 0);
  return { position, recipeId: p.recipeId };
}

function normalizeRequest(parsed: ParsedRequest): NormalizeResult {
  if (parsed.required !== undefined && parsed.requiredPlacements !== undefined) {
    return { ok: false, error: "Ambiguous request: cannot specify both 'required' and 'requiredPlacements'" };
  }
  if (parsed.exclude !== undefined && parsed.exclusions !== undefined) {
    return { ok: false, error: "Ambiguous request: cannot specify both 'exclude' and 'exclusions'" };
  }

  let count: number;
  if (parsed.count !== undefined) {
    count = parsed.count;
  } else {
    const days = parsed.days ?? 7;
    const mealsPerDay = parsed.mealSlots?.length ?? 2;
    count = days * mealsPerDay;
  }

  const rawRequired = parsed.required ?? parsed.requiredPlacements ?? [];
  const required: RequiredPlacement[] = rawRequired.map((p) => {
    if (isLegacyPlacement(p)) {
      return convertLegacyPlacement(p);
    }
    return p as RequiredPlacement;
  });

  const exclude = parsed.exclude ?? parsed.exclusions ?? { recipeIds: [], tagIds: [] };

  const preserveManualPositions = parsed.preserveManualPositions ?? parsed.preserveManualSlots ?? false;

  return {
    ok: true,
    data: {
      householdId: parsed.householdId,
      weekStart: parsed.weekStart,
      count,
      required,
      exclude,
      antiRepeat: parsed.antiRepeat,
      tagQuotas: parsed.tagQuotas,
      quotaBonus: parsed.quotaBonus,
      preserveManualPositions,
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

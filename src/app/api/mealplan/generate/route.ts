import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateMealPlanAI } from "@/lib/assistant/ai-generator";

const GenerateSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD format"),
  count: z.number().int().min(1).max(100).optional(),
  days: z.number().int().min(1).max(7).optional(),
  mealSlots: z.array(z.string()).min(1).optional(),
  preserveManualPositions: z.boolean().optional(),
  preserveManualSlots: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = GenerateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { householdId, weekStart, days, mealSlots, preserveManualPositions, preserveManualSlots } =
      parsed.data;

    const count = parsed.data.count ?? (days ?? 7) * (mealSlots?.length ?? 2);
    const preserve = preserveManualPositions ?? preserveManualSlots ?? false;

    const result = await generateMealPlanAI(householdId, weekStart, count, preserve);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Unexpected error in mealplan/generate:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

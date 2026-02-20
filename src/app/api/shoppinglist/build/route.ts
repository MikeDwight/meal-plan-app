import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildShoppingList,
  ShoppingListBuilderError,
} from "@/lib/shoppinglist/builder";

const BuildShoppingListSchema = z
  .object({
    householdId: z.string().min(1, "householdId is required"),
    weekPlanId: z.string().min(1).optional(),
    weekStart: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "weekStart must be YYYY-MM-DD format")
      .optional(),
  })
  .refine((data) => data.weekPlanId || data.weekStart, {
    message: "Either weekPlanId or weekStart must be provided",
  })
  .refine((data) => !(data.weekPlanId && data.weekStart), {
    message: "Provide weekPlanId or weekStart, not both",
  });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = BuildShoppingListSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const result = await buildShoppingList(parseResult.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof ShoppingListBuilderError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Unexpected error in shoppinglist/build:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

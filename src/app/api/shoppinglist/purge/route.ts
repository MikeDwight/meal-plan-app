import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const PurgeSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = PurgeSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { householdId } = parseResult.data;

    const { count } = await prisma.shoppingItem.deleteMany({
      where: { householdId },
    });

    return NextResponse.json({ ok: true, deleted: count }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in POST /api/shoppinglist/purge:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

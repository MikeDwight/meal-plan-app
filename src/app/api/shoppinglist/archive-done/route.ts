import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ArchiveDoneSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
  weekPlanId: z.string().min(1, "weekPlanId is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parseResult = ArchiveDoneSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: parseResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { householdId, weekPlanId } = parseResult.data;

    const weekPlan = await prisma.weekPlan.findUnique({
      where: { id: weekPlanId },
    });

    if (!weekPlan) {
      return NextResponse.json(
        { error: `WeekPlan not found: ${weekPlanId}` },
        { status: 404 }
      );
    }

    if (weekPlan.householdId !== householdId) {
      return NextResponse.json(
        { error: "WeekPlan does not belong to this household" },
        { status: 403 }
      );
    }

    const result = await prisma.shoppingItem.updateMany({
      where: {
        householdId,
        weekPlanId,
        status: "DONE",
        archivedAt: null,
      },
      data: { archivedAt: new Date() },
    });

    return NextResponse.json(
      { archivedCount: result.count },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/shoppinglist/archive-done:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

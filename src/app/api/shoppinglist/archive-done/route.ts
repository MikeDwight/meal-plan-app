import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ArchiveDoneSchema = z.object({
  householdId: z.string().min(1, "householdId is required"),
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

    const { householdId } = parseResult.data;

    const result = await prisma.shoppingItem.updateMany({
      where: {
        householdId,
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

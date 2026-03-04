import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const householdId = request.nextUrl.searchParams.get("householdId");

    if (!householdId) {
      return NextResponse.json(
        { error: "householdId is required" },
        { status: 400 }
      );
    }

    const units = await prisma.unit.findMany({
      where: { householdId },
      select: {
        id: true,
        name: true,
        abbr: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(units, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/units:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

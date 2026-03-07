import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  householdId: z.string().min(1),
  abbr: z.string().min(1),
  name: z.string().min(1),
});

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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }

    const { householdId, abbr, name } = parsed.data;

    const existing = await prisma.unit.findUnique({
      where: { householdId_abbr: { householdId, abbr } },
    });
    if (existing) {
      return NextResponse.json({ id: existing.id, name: existing.name, abbr: existing.abbr });
    }

    const unit = await prisma.unit.create({
      data: { householdId, abbr, name },
      select: { id: true, name: true, abbr: true },
    });

    return NextResponse.json(unit, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/units:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

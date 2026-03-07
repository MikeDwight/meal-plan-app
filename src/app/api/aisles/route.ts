import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const createSchema = z.object({
  householdId: z.string().min(1),
  name: z.string().min(1),
});

export async function GET(request: NextRequest) {
  const householdId = request.nextUrl.searchParams.get("householdId");
  if (!householdId) {
    return NextResponse.json({ error: "householdId is required" }, { status: 400 });
  }

  try {
    const aisles = await prisma.aisle.findMany({
      where: { householdId },
      select: { id: true, name: true, sortOrder: true },
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(aisles);
  } catch (error) {
    console.error("Unexpected error in GET /api/aisles:", error);
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

    const { householdId, name } = parsed.data;

    const existing = await prisma.aisle.findUnique({
      where: { householdId_name: { householdId, name } },
    });
    if (existing) {
      return NextResponse.json({ id: existing.id, name: existing.name });
    }

    const last = await prisma.aisle.findFirst({
      where: { householdId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });

    const aisle = await prisma.aisle.create({
      data: { householdId, name, sortOrder: (last?.sortOrder ?? 0) + 1 },
      select: { id: true, name: true },
    });

    return NextResponse.json(aisle, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/aisles:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

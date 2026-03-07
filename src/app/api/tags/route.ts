import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
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

    const tags = await prisma.tag.findMany({
      where: { householdId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(tags, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const CreateTagSchema = z.object({
  householdId: z.string().min(1),
  name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error" }, { status: 400 });
    }
    const { householdId, name } = parsed.data;
    const tag = await prisma.tag.upsert({
      where: { householdId_name: { householdId, name } },
      update: {},
      create: { householdId, name },
      select: { id: true, name: true },
    });
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in POST /api/tags:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

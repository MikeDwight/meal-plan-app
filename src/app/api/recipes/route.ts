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

    const recipes = await prisma.recipe.findMany({
      where: { householdId },
      select: {
        id: true,
        title: true,
        tags: {
          select: { tag: { select: { name: true } } },
        },
      },
      orderBy: { title: "asc" },
    });

    const result = recipes.map((r) => ({
      id: r.id,
      title: r.title,
      tags: r.tags.map((rt) => rt.tag.name),
    }));

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in GET /api/recipes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

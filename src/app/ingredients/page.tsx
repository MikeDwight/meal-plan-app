import { prisma } from "@/lib/prisma";
import { IngredientsClient } from "./ingredients-client";

export const dynamic = "force-dynamic";

const HOUSEHOLD_ID = "home-household";

export default async function IngredientsPage() {
  const [ingredients, units, aisles] = await Promise.all([
    prisma.ingredient.findMany({
      where: { householdId: HOUSEHOLD_ID },
      select: {
        id: true,
        name: true,
        defaultUnitId: true,
        defaultUnit: { select: { abbr: true } },
        defaultAisleId: true,
        defaultAisle: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.unit.findMany({
      where: { householdId: HOUSEHOLD_ID },
      orderBy: { abbr: "asc" },
    }),
    prisma.aisle.findMany({
      where: { householdId: HOUSEHOLD_ID },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <main>
      <IngredientsClient
        initialIngredients={ingredients.map((i) => ({
          id: i.id,
          name: i.name,
          defaultUnitId: i.defaultUnitId,
          defaultUnitAbbr: i.defaultUnit?.abbr ?? null,
          defaultAisleId: i.defaultAisleId,
          defaultAisleName: i.defaultAisle?.name ?? null,
        }))}
        units={units.map((u) => ({ id: u.id, abbr: u.abbr }))}
        aisles={aisles.map((a) => ({ id: a.id, name: a.name }))}
      />
    </main>
  );
}

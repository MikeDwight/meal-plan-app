import { prisma } from "@/lib/prisma";
import { PantryClient } from "./pantry-client";

export const dynamic = "force-dynamic";

const HOUSEHOLD_ID = "home-household";

export default async function PantryPage() {
  const [items, units] = await Promise.all([
    prisma.pantryItem.findMany({
      where: { householdId: HOUSEHOLD_ID },
      include: {
        ingredient: { select: { name: true } },
        unit: { select: { abbr: true } },
      },
      orderBy: { ingredient: { name: "asc" } },
    }),
    prisma.unit.findMany({
      where: { householdId: HOUSEHOLD_ID },
      orderBy: { abbr: "asc" },
    }),
  ]);

  const serializedItems = items.map((item) => ({
    id: item.id,
    ingredientId: item.ingredientId,
    ingredientName: item.ingredient.name,
    quantity: Number(item.quantity),
    unitId: item.unitId,
    unitAbbr: item.unit?.abbr ?? null,
  }));

  const serializedUnits = units.map((u) => ({
    id: u.id,
    name: u.name,
    abbr: u.abbr,
  }));

  return (
    <main>
      <h1 style={{ marginBottom: "1.5rem" }}>Garde-manger</h1>
      <PantryClient
        householdId={HOUSEHOLD_ID}
        initialItems={serializedItems}
        units={serializedUnits}
      />
    </main>
  );
}

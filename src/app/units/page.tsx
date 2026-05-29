import { prisma } from "@/lib/prisma";
import { UnitsClient } from "./units-client";

const HOUSEHOLD_ID = "home-household";

export default async function UnitsPage() {
  const units = await prisma.unit.findMany({
    where: { householdId: HOUSEHOLD_ID },
    select: {
      id: true,
      name: true,
      abbr: true,
      _count: {
        select: {
          ingredientsDefault: true,
          recipeIngredients: true,
          pantryItems: true,
          shoppingItems: true,
          transitionItems: true,
        },
      },
    },
    orderBy: { abbr: "asc" },
  });

  const rows = units.map((u) => ({
    id: u.id,
    name: u.name,
    abbr: u.abbr,
    usageCount:
      u._count.ingredientsDefault +
      u._count.recipeIngredients +
      u._count.pantryItems +
      u._count.shoppingItems +
      u._count.transitionItems,
  }));

  return <UnitsClient initialUnits={rows} />;
}

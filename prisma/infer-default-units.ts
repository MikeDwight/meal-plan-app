/**
 * Infer default unit for each ingredient from its most frequent unit in recipes.
 *
 * Usage:
 *   npx tsx prisma/infer-default-units.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const HOUSEHOLD_ID = "home-household";

async function main() {
  const ingredients = await prisma.ingredient.findMany({
    where: { householdId: HOUSEHOLD_ID },
    select: {
      id: true,
      name: true,
      recipeIngredients: {
        select: { unitId: true },
        where: { unitId: { not: null } },
      },
    },
  });

  console.log(`\n📂 Processing ${ingredients.length} ingredients...\n`);

  let updated = 0;
  let skipped = 0;

  for (const ing of ingredients) {
    if (ing.recipeIngredients.length === 0) { skipped++; continue; }

    // Count frequency of each unitId
    const freq = new Map<string, number>();
    for (const ri of ing.recipeIngredients) {
      const uid = ri.unitId!;
      freq.set(uid, (freq.get(uid) ?? 0) + 1);
    }

    // Pick the most frequent
    const defaultUnitId = [...freq.entries()].sort((a, b) => b[1] - a[1])[0][0];

    await prisma.ingredient.update({
      where: { id: ing.id },
      data: { defaultUnitId },
    });

    updated++;
  }

  console.log(`✅ ${updated} updated, ${skipped} skipped (no unit in any recipe).\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

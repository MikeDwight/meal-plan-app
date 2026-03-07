/**
 * Update ingredients with aisle data from a Notion JSON export.
 *
 * Usage:
 *   npx tsx prisma/import-ingredients.ts prisma/my-ingredients.json
 *
 * Expected JSON format (array of ingredients):
 * [{ "name": "Beurre de cacahuète", "aisle": "Épicerie sucrée", ... }]
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const HOUSEHOLD_ID = "home-household";

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx tsx prisma/import-ingredients.ts <path-to-json>");
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(filePath), "utf-8");
  const data = JSON.parse(raw);
  const items: { name: string; aisle?: string }[] = Array.isArray(data) ? data : [data];

  console.log(`\n📂 Processing ${items.length} ingredients...\n`);

  const aisleCache = new Map<string, string>(); // name → id

  const maxSortOrder = await prisma.aisle.aggregate({
    where: { householdId: HOUSEHOLD_ID },
    _max: { sortOrder: true },
  });
  let nextSortOrder = (maxSortOrder._max.sortOrder ?? -1) + 1;

  async function getOrCreateAisle(name: string): Promise<string> {
    if (aisleCache.has(name)) return aisleCache.get(name)!;
    const existing = await prisma.aisle.findUnique({
      where: { householdId_name: { householdId: HOUSEHOLD_ID, name } },
      select: { id: true },
    });
    if (existing) {
      aisleCache.set(name, existing.id);
      return existing.id;
    }
    const aisle = await prisma.aisle.create({
      data: { householdId: HOUSEHOLD_ID, name, sortOrder: nextSortOrder++ },
      select: { id: true },
    });
    aisleCache.set(name, aisle.id);
    return aisle.id;
  }

  let updated = 0;
  let notFound = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item.name?.trim()) { skipped++; continue; }
    if (!item.aisle?.trim()) { skipped++; continue; }

    const ingredient = await prisma.ingredient.findUnique({
      where: { householdId_name: { householdId: HOUSEHOLD_ID, name: item.name.trim() } },
      select: { id: true },
    });

    if (!ingredient) {
      console.log(`  ⚠️  Not found: "${item.name}"`);
      notFound++;
      continue;
    }

    const aisleId = await getOrCreateAisle(item.aisle.trim());
    await prisma.ingredient.update({
      where: { id: ingredient.id },
      data: { defaultAisleId: aisleId },
    });

    console.log(`  ✅ "${item.name}" → ${item.aisle}`);
    updated++;
  }

  console.log(`\n🎉 Done: ${updated} updated, ${notFound} not found, ${skipped} skipped.\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

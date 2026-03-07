/**
 * Import script for user recipe JSON export.
 *
 * Usage:
 *   npx ts-node --project tsconfig.json prisma/import-recipes.ts prisma/my-recipes.json
 *
 * Expected JSON format (array of recipes):
 * [
 *   {
 *     "title": "Carbonara",
 *     "tags": ["Pâtes/Riz", "Repas"],
 *     "ingredientRefs": ["Pâtes", "Œufs", "Pancetta", "Parmesan"],
 *     "quantities": {
 *       "Pates": { "quantite": 400, "unite": "g" },
 *       "Oeufs": { "quantite": 6, "unite": "piece(s)" }
 *     },
 *     "instructions": "...",
 *     "servings": 4,
 *     "sourceUrl": "https://..."
 *   }
 * ]
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const HOUSEHOLD_ID = "home-household";

// Normalize accented characters for key matching (e.g. "Pâtes" → "Pates")
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Normalize unit labels to a canonical abbr
function normalizeUnit(unite: string): string {
  const u = unite.toLowerCase().trim();
  if (u === "piece(s)" || u === "piece" || u === "pièce" || u === "pièces" || u === "pcs") return "pcs";
  if (u === "ml" || u === "millilitre" || u === "millilitres") return "ml";
  if (u === "l" || u === "litre" || u === "litres") return "l";
  if (u === "kg" || u === "kilogramme" || u === "kilogrammes") return "kg";
  if (u === "g" || u === "gramme" || u === "grammes") return "g";
  if (u === "c.s." || u === "cs" || u === "cuillère à soupe" || u === "tbsp") return "c.s.";
  if (u === "c.c." || u === "cc" || u === "cuillère à café" || u === "tsp") return "c.c.";
  return u; // keep as-is if unknown
}

interface RecipeImport {
  title: string;
  tags?: string[];
  ingredientRefs?: string[];
  quantities?: Record<string, { quantite: number; unite: string }>;
  instructions?: string;
  servings?: number;
  sourceUrl?: string;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npx ts-node prisma/import-recipes.ts <path-to-json>");
    process.exit(1);
  }

  const raw = fs.readFileSync(path.resolve(filePath), "utf-8");
  const data = JSON.parse(raw);
  const recipes: RecipeImport[] = Array.isArray(data) ? data : [data];

  console.log(`\n📂 Importing ${recipes.length} recipes...\n`);

  // Ensure household exists
  await prisma.household.upsert({
    where: { id: HOUSEHOLD_ID },
    update: {},
    create: { id: HOUSEHOLD_ID, name: "Home" },
  });

  // Cache maps
  const unitCache = new Map<string, string>(); // abbr → id
  const tagCache = new Map<string, string>(); // name → id
  const ingredientCache = new Map<string, string>(); // name → id

  async function getOrCreateUnit(abbr: string): Promise<string> {
    const key = abbr.toLowerCase();
    if (unitCache.has(key)) return unitCache.get(key)!;
    const unit = await prisma.unit.upsert({
      where: { householdId_abbr: { householdId: HOUSEHOLD_ID, abbr } },
      update: {},
      create: { householdId: HOUSEHOLD_ID, name: abbr, abbr },
      select: { id: true },
    });
    unitCache.set(key, unit.id);
    return unit.id;
  }

  async function getOrCreateTag(name: string): Promise<string> {
    if (tagCache.has(name)) return tagCache.get(name)!;
    const tag = await prisma.tag.upsert({
      where: { householdId_name: { householdId: HOUSEHOLD_ID, name } },
      update: {},
      create: { householdId: HOUSEHOLD_ID, name },
      select: { id: true },
    });
    tagCache.set(name, tag.id);
    return tag.id;
  }

  async function getOrCreateIngredient(name: string): Promise<string> {
    if (ingredientCache.has(name)) return ingredientCache.get(name)!;
    const ingredient = await prisma.ingredient.upsert({
      where: { householdId_name: { householdId: HOUSEHOLD_ID, name } },
      update: {},
      create: { householdId: HOUSEHOLD_ID, name },
      select: { id: true },
    });
    ingredientCache.set(name, ingredient.id);
    return ingredient.id;
  }

  let imported = 0;
  let skipped = 0;

  for (const recipe of recipes) {
    if (!recipe.title?.trim()) {
      console.warn("  ⚠️  Skipping recipe with no title");
      skipped++;
      continue;
    }

    // Skip if already exists
    const existing = await prisma.recipe.findFirst({
      where: { householdId: HOUSEHOLD_ID, title: recipe.title.trim() },
      select: { id: true },
    });
    if (existing) {
      console.log(`  ⏭️  Already exists: "${recipe.title}"`);
      skipped++;
      continue;
    }

    // Resolve tags
    const tagIds: string[] = [];
    for (const tagName of recipe.tags ?? []) {
      tagIds.push(await getOrCreateTag(tagName));
    }

    // Resolve ingredients + quantities
    // Build a lookup: normalize(ingredientName) → quantity info
    const quantityLookup = new Map<string, { quantite: number; unite: string }>();
    for (const [key, val] of Object.entries(recipe.quantities ?? {})) {
      quantityLookup.set(normalize(key), val);
    }

    const ingredientLines: { ingredientId: string; quantity: number; unitId: string | null }[] = [];

    for (const ingName of recipe.ingredientRefs ?? []) {
      const ingredientId = await getOrCreateIngredient(ingName.trim());
      const qKey = normalize(ingName);
      const qInfo = quantityLookup.get(qKey);

      let quantity = 1;
      let unitId: string | null = null;

      if (qInfo) {
        quantity = qInfo.quantite;
        const abbr = normalizeUnit(qInfo.unite);
        unitId = await getOrCreateUnit(abbr);
      }

      ingredientLines.push({ ingredientId, quantity, unitId });
    }

    if (ingredientLines.length === 0) {
      console.warn(`  ⚠️  "${recipe.title}" has no ingredients — skipping`);
      skipped++;
      continue;
    }

    // Create recipe
    await prisma.$transaction(async (tx) => {
      const created = await tx.recipe.create({
        data: {
          householdId: HOUSEHOLD_ID,
          title: recipe.title.trim(),
          servings: recipe.servings ?? null,
          sourceUrl: recipe.sourceUrl ?? null,
          instructions: recipe.instructions?.trim() ?? null,
        },
        select: { id: true },
      });

      await tx.recipeIngredient.createMany({
        data: ingredientLines.map((l) => ({
          recipeId: created.id,
          ingredientId: l.ingredientId,
          quantity: l.quantity,
          unitId: l.unitId,
        })),
      });

      if (tagIds.length > 0) {
        await tx.recipeTag.createMany({
          data: tagIds.map((tagId) => ({ recipeId: created.id, tagId })),
        });
      }
    });

    console.log(`  ✅ "${recipe.title}" (${ingredientLines.length} ingredients, ${tagIds.length} tags)`);
    imported++;
  }

  console.log(`\n🎉 Done: ${imported} imported, ${skipped} skipped.\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

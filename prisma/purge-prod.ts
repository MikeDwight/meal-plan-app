/**
 * ⚠️  SCRIPT DE PURGE PRODUCTION ⚠️
 *
 * Ce script supprime UNIQUEMENT les données de mealplan/shopping/transition/pantry.
 * Il NE TOUCHE PAS aux recettes, ingrédients, tags, unités, aisles, ni au household.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx prisma/purge-prod.ts
 *
 * Ce script demande confirmation via variable d'environnement:
 *   CONFIRM_PURGE=yes DATABASE_URL="..." npx tsx prisma/purge-prod.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  if (process.env.CONFIRM_PURGE !== "yes") {
    console.error("⛔ ATTENTION: Ce script va SUPPRIMER les données suivantes en PRODUCTION:");
    console.error("   - ShoppingItem (tous)");
    console.error("   - WeekPlanRecipe (tous)");
    console.error("   - WeekPlan (tous)");
    console.error("   - TransitionItem (tous)");
    console.error("   - PantryItem (tous)");
    console.error("");
    console.error("   Les recettes, ingrédients, tags, unités et aisles sont PRÉSERVÉS.");
    console.error("");
    console.error("Pour confirmer, relancez avec:");
    console.error("   CONFIRM_PURGE=yes DATABASE_URL=\"...\" npx tsx prisma/purge-prod.ts");
    process.exit(1);
  }

  console.log("🔥 Purge PROD en cours...");

  const counts = await prisma.$transaction(async (tx) => {
    const shopping = await tx.shoppingItem.deleteMany();
    const weekPlanRecipes = await tx.weekPlanRecipe.deleteMany();
    const weekPlans = await tx.weekPlan.deleteMany();
    const transition = await tx.transitionItem.deleteMany();
    const pantry = await tx.pantryItem.deleteMany();

    return { shopping, weekPlanRecipes, weekPlans, transition, pantry };
  });

  console.log("✅ Purge terminée:");
  console.log(`   - ShoppingItem: ${counts.shopping.count} supprimés`);
  console.log(`   - WeekPlanRecipe: ${counts.weekPlanRecipes.count} supprimés`);
  console.log(`   - WeekPlan: ${counts.weekPlans.count} supprimés`);
  console.log(`   - TransitionItem: ${counts.transition.count} supprimés`);
  console.log(`   - PantryItem: ${counts.pantry.count} supprimés`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

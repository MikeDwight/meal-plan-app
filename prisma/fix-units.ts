import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const HOUSEHOLD_ID = "home-household";

// Only seed recipes are fixed — manual recipes are untouched
const SEED_RECIPE_TITLES = [
  "Pâtes à la carbonara",
  "Poulet rôti aux légumes",
  "Risotto aux champignons",
  "Saumon grillé",
  "Bolognaise maison",
  "Curry de légumes",
  "Omelette aux légumes",
  "Gratin de courgettes",
  "Salade de lentilles",
  "Pâtes au pesto",
  "Poulet curry coco",
  "Pizza maison",
  "Quiche lorraine",
  "Buddha bowl",
];

async function main() {
  const gUnit = await prisma.unit.findFirst({
    where: { householdId: HOUSEHOLD_ID, abbr: "g" },
  });

  if (!gUnit) {
    console.log("Unit 'g' not found, nothing to fix.");
    return;
  }

  // Fix RecipeIngredients — only for seed recipes, only where unit is "g" but defaultUnit differs
  const seedRecipes = await prisma.recipe.findMany({
    where: { householdId: HOUSEHOLD_ID, title: { in: SEED_RECIPE_TITLES } },
    select: { id: true, title: true },
  });

  console.log(`Found ${seedRecipes.length}/${SEED_RECIPE_TITLES.length} seed recipes in DB`);

  let fixedIngredients = 0;

  for (const recipe of seedRecipes) {
    const recipeIngredients = await prisma.recipeIngredient.findMany({
      where: { recipeId: recipe.id, unitId: gUnit.id },
      include: { ingredient: { select: { name: true, defaultUnitId: true } } },
    });

    for (const ri of recipeIngredients) {
      const { defaultUnitId, name } = ri.ingredient;
      if (defaultUnitId && defaultUnitId !== gUnit.id) {
        await prisma.recipeIngredient.update({
          where: { id: ri.id },
          data: { unitId: defaultUnitId },
        });
        console.log(`  [recipe] ${recipe.title} / ${name}: g -> default unit`);
        fixedIngredients++;
      }
    }
  }

  // Fix PantryItems — all pantry items for the household where unit is "g" but defaultUnit differs
  const pantryItems = await prisma.pantryItem.findMany({
    where: { householdId: HOUSEHOLD_ID, unitId: gUnit.id },
    include: { ingredient: { select: { name: true, defaultUnitId: true } } },
  });

  let fixedPantry = 0;

  for (const item of pantryItems) {
    const { defaultUnitId, name } = item.ingredient;
    if (defaultUnitId && defaultUnitId !== gUnit.id) {
      await prisma.pantryItem.update({
        where: { id: item.id },
        data: { unitId: defaultUnitId },
      });
      console.log(`  [pantry] ${name}: g -> default unit`);
      fixedPantry++;
    }
  }

  console.log(`\nFixed ${fixedIngredients} recipe ingredients`);
  console.log(`Fixed ${fixedPantry} pantry items`);
  console.log("\nDone. Rebuild the shopping list to apply changes.");
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

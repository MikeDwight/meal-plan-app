import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🧹 Purge: suppression des données mealplan/shopping/transition/pantry...");

  await prisma.$transaction([
    prisma.shoppingItem.deleteMany(),
    prisma.weekPlanRecipe.deleteMany(),
    prisma.weekPlan.deleteMany(),
    prisma.transitionItem.deleteMany(),
    prisma.pantryItem.deleteMany(),
  ]);

  console.log("✅ Tables vidées: ShoppingItem, WeekPlanRecipe, WeekPlan, TransitionItem, PantryItem");

  console.log("🧹 Purge: suppression des recettes existantes (pour re-seed propre)...");

  await prisma.$transaction([
    prisma.recipeIngredient.deleteMany(),
    prisma.recipeTag.deleteMany(),
    prisma.recipe.deleteMany(),
  ]);

  console.log("✅ Tables vidées: RecipeIngredient, RecipeTag, Recipe");

  console.log("🌱 Seed: données de référence...");

  const household = await prisma.household.upsert({
    where: { id: "home-household" },
    update: {},
    create: { id: "home-household", name: "Home" },
  });

  const units = [
    { name: "gramme", abbr: "g" },
    { name: "kilogramme", abbr: "kg" },
    { name: "millilitre", abbr: "ml" },
    { name: "litre", abbr: "l" },
    { name: "pièce", abbr: "pcs" },
    { name: "cuillère à soupe", abbr: "c.s." },
    { name: "cuillère à café", abbr: "c.c." },
  ];

  const unitMap = new Map<string, string>();
  for (const unit of units) {
    const created = await prisma.unit.upsert({
      where: { householdId_abbr: { householdId: household.id, abbr: unit.abbr } },
      update: {},
      create: { householdId: household.id, name: unit.name, abbr: unit.abbr },
    });
    unitMap.set(unit.abbr, created.id);
  }
  console.log(`✅ Units: ${units.length}`);

  const aisles = [
    { name: "Fruits & légumes", sortOrder: 1 },
    { name: "Boucherie", sortOrder: 2 },
    { name: "Poissonnerie", sortOrder: 3 },
    { name: "Produits frais", sortOrder: 4 },
    { name: "Crémerie", sortOrder: 5 },
    { name: "Épicerie salée", sortOrder: 6 },
    { name: "Épicerie sucrée", sortOrder: 7 },
    { name: "Surgelés", sortOrder: 8 },
    { name: "Boissons", sortOrder: 9 },
    { name: "Hygiène & entretien", sortOrder: 10 },
  ];

  const aisleMap = new Map<string, string>();
  for (const aisle of aisles) {
    const created = await prisma.aisle.upsert({
      where: { householdId_name: { householdId: household.id, name: aisle.name } },
      update: { sortOrder: aisle.sortOrder },
      create: { householdId: household.id, name: aisle.name, sortOrder: aisle.sortOrder },
    });
    aisleMap.set(aisle.name, created.id);
  }
  console.log(`✅ Aisles: ${aisles.length}`);

  const tags = [
    { name: "Rapide" },
    { name: "Végétarien" },
    { name: "Végan" },
    { name: "Sans gluten" },
    { name: "Batch cooking" },
    { name: "Comfort food" },
  ];

  const tagMap = new Map<string, string>();
  for (const tag of tags) {
    const created = await prisma.tag.upsert({
      where: { householdId_name: { householdId: household.id, name: tag.name } },
      update: {},
      create: { householdId: household.id, name: tag.name },
    });
    tagMap.set(tag.name, created.id);
  }
  console.log(`✅ Tags: ${tags.length}`);

  const ingredientDefs = [
    { name: "Pâtes", defaultAisle: "Épicerie salée", defaultUnit: "g" },
    { name: "Riz", defaultAisle: "Épicerie salée", defaultUnit: "g" },
    { name: "Poulet", defaultAisle: "Boucherie", defaultUnit: "g" },
    { name: "Bœuf haché", defaultAisle: "Boucherie", defaultUnit: "g" },
    { name: "Saumon", defaultAisle: "Poissonnerie", defaultUnit: "g" },
    { name: "Tomates", defaultAisle: "Fruits & légumes", defaultUnit: "pcs" },
    { name: "Oignons", defaultAisle: "Fruits & légumes", defaultUnit: "pcs" },
    { name: "Ail", defaultAisle: "Fruits & légumes", defaultUnit: "pcs" },
    { name: "Carottes", defaultAisle: "Fruits & légumes", defaultUnit: "pcs" },
    { name: "Courgettes", defaultAisle: "Fruits & légumes", defaultUnit: "pcs" },
    { name: "Poivrons", defaultAisle: "Fruits & légumes", defaultUnit: "pcs" },
    { name: "Pommes de terre", defaultAisle: "Fruits & légumes", defaultUnit: "g" },
    { name: "Crème fraîche", defaultAisle: "Crémerie", defaultUnit: "ml" },
    { name: "Parmesan", defaultAisle: "Crémerie", defaultUnit: "g" },
    { name: "Mozzarella", defaultAisle: "Crémerie", defaultUnit: "g" },
    { name: "Œufs", defaultAisle: "Crémerie", defaultUnit: "pcs" },
    { name: "Lait", defaultAisle: "Crémerie", defaultUnit: "ml" },
    { name: "Beurre", defaultAisle: "Crémerie", defaultUnit: "g" },
    { name: "Huile d'olive", defaultAisle: "Épicerie salée", defaultUnit: "c.s." },
    { name: "Sauce tomate", defaultAisle: "Épicerie salée", defaultUnit: "g" },
    { name: "Lentilles", defaultAisle: "Épicerie salée", defaultUnit: "g" },
    { name: "Pois chiches", defaultAisle: "Épicerie salée", defaultUnit: "g" },
    { name: "Curry", defaultAisle: "Épicerie salée", defaultUnit: "c.s." },
    { name: "Lait de coco", defaultAisle: "Épicerie salée", defaultUnit: "ml" },
  ];

  const ingredientMap = new Map<string, string>();
  for (const ing of ingredientDefs) {
    const created = await prisma.ingredient.upsert({
      where: { householdId_name: { householdId: household.id, name: ing.name } },
      update: {},
      create: {
        householdId: household.id,
        name: ing.name,
        defaultUnitId: unitMap.get(ing.defaultUnit),
        defaultAisleId: aisleMap.get(ing.defaultAisle),
      },
    });
    ingredientMap.set(ing.name, created.id);
  }
  console.log(`✅ Ingredients: ${ingredientDefs.length}`);

  console.log("🌱 Seed: recettes...");

  const recipeDefs = [
    {
      title: "Pâtes à la carbonara",
      servings: 4,
      prepTime: 10,
      cookTime: 15,
      tags: ["Rapide", "Comfort food"],
      ingredients: [
        { name: "Pâtes", quantity: 400, unit: "g" },
        { name: "Œufs", quantity: 4, unit: "pcs" },
        { name: "Parmesan", quantity: 100, unit: "g" },
        { name: "Crème fraîche", quantity: 100, unit: "ml" },
      ],
    },
    {
      title: "Poulet rôti aux légumes",
      servings: 4,
      prepTime: 20,
      cookTime: 60,
      tags: ["Sans gluten", "Comfort food"],
      ingredients: [
        { name: "Poulet", quantity: 800, unit: "g" },
        { name: "Pommes de terre", quantity: 500, unit: "g" },
        { name: "Carottes", quantity: 4, unit: "pcs" },
        { name: "Oignons", quantity: 2, unit: "pcs" },
      ],
    },
    {
      title: "Risotto aux champignons",
      servings: 4,
      prepTime: 15,
      cookTime: 25,
      tags: ["Végétarien", "Comfort food"],
      ingredients: [
        { name: "Riz", quantity: 300, unit: "g" },
        { name: "Parmesan", quantity: 80, unit: "g" },
        { name: "Beurre", quantity: 50, unit: "g" },
        { name: "Oignons", quantity: 1, unit: "pcs" },
      ],
    },
    {
      title: "Saumon grillé",
      servings: 2,
      prepTime: 10,
      cookTime: 15,
      tags: ["Rapide", "Sans gluten"],
      ingredients: [
        { name: "Saumon", quantity: 400, unit: "g" },
        { name: "Huile d'olive", quantity: 2, unit: "c.s." },
        { name: "Ail", quantity: 2, unit: "pcs" },
      ],
    },
    {
      title: "Bolognaise maison",
      servings: 6,
      prepTime: 20,
      cookTime: 45,
      tags: ["Batch cooking", "Comfort food"],
      ingredients: [
        { name: "Bœuf haché", quantity: 500, unit: "g" },
        { name: "Sauce tomate", quantity: 400, unit: "g" },
        { name: "Oignons", quantity: 2, unit: "pcs" },
        { name: "Carottes", quantity: 2, unit: "pcs" },
        { name: "Ail", quantity: 3, unit: "pcs" },
      ],
    },
    {
      title: "Curry de légumes",
      servings: 4,
      prepTime: 15,
      cookTime: 30,
      tags: ["Végan", "Végétarien"],
      ingredients: [
        { name: "Pois chiches", quantity: 400, unit: "g" },
        { name: "Lait de coco", quantity: 400, unit: "ml" },
        { name: "Curry", quantity: 2, unit: "c.s." },
        { name: "Tomates", quantity: 3, unit: "pcs" },
        { name: "Oignons", quantity: 1, unit: "pcs" },
      ],
    },
    {
      title: "Omelette aux légumes",
      servings: 2,
      prepTime: 10,
      cookTime: 10,
      tags: ["Rapide", "Végétarien", "Sans gluten"],
      ingredients: [
        { name: "Œufs", quantity: 6, unit: "pcs" },
        { name: "Poivrons", quantity: 1, unit: "pcs" },
        { name: "Oignons", quantity: 1, unit: "pcs" },
        { name: "Beurre", quantity: 20, unit: "g" },
      ],
    },
    {
      title: "Gratin de courgettes",
      servings: 4,
      prepTime: 15,
      cookTime: 35,
      tags: ["Végétarien", "Comfort food"],
      ingredients: [
        { name: "Courgettes", quantity: 4, unit: "pcs" },
        { name: "Crème fraîche", quantity: 200, unit: "ml" },
        { name: "Mozzarella", quantity: 150, unit: "g" },
        { name: "Œufs", quantity: 2, unit: "pcs" },
      ],
    },
    {
      title: "Salade de lentilles",
      servings: 4,
      prepTime: 15,
      cookTime: 20,
      tags: ["Végan", "Batch cooking"],
      ingredients: [
        { name: "Lentilles", quantity: 300, unit: "g" },
        { name: "Tomates", quantity: 2, unit: "pcs" },
        { name: "Oignons", quantity: 1, unit: "pcs" },
        { name: "Huile d'olive", quantity: 3, unit: "c.s." },
      ],
    },
    {
      title: "Pâtes au pesto",
      servings: 4,
      prepTime: 10,
      cookTime: 12,
      tags: ["Rapide", "Végétarien"],
      ingredients: [
        { name: "Pâtes", quantity: 400, unit: "g" },
        { name: "Parmesan", quantity: 50, unit: "g" },
        { name: "Huile d'olive", quantity: 4, unit: "c.s." },
        { name: "Ail", quantity: 2, unit: "pcs" },
      ],
    },
    {
      title: "Poulet curry coco",
      servings: 4,
      prepTime: 15,
      cookTime: 25,
      tags: ["Sans gluten"],
      ingredients: [
        { name: "Poulet", quantity: 600, unit: "g" },
        { name: "Lait de coco", quantity: 400, unit: "ml" },
        { name: "Curry", quantity: 2, unit: "c.s." },
        { name: "Oignons", quantity: 1, unit: "pcs" },
        { name: "Riz", quantity: 300, unit: "g" },
      ],
    },
    {
      title: "Pizza maison",
      servings: 4,
      prepTime: 30,
      cookTime: 15,
      tags: ["Comfort food"],
      ingredients: [
        { name: "Sauce tomate", quantity: 200, unit: "g" },
        { name: "Mozzarella", quantity: 200, unit: "g" },
        { name: "Huile d'olive", quantity: 2, unit: "c.s." },
      ],
    },
    {
      title: "Quiche lorraine",
      servings: 6,
      prepTime: 20,
      cookTime: 40,
      tags: ["Batch cooking", "Comfort food"],
      ingredients: [
        { name: "Œufs", quantity: 4, unit: "pcs" },
        { name: "Crème fraîche", quantity: 250, unit: "ml" },
        { name: "Lait", quantity: 100, unit: "ml" },
        { name: "Beurre", quantity: 30, unit: "g" },
      ],
    },
    {
      title: "Buddha bowl",
      servings: 2,
      prepTime: 20,
      cookTime: 15,
      tags: ["Végan", "Végétarien"],
      ingredients: [
        { name: "Riz", quantity: 200, unit: "g" },
        { name: "Pois chiches", quantity: 200, unit: "g" },
        { name: "Carottes", quantity: 2, unit: "pcs" },
        { name: "Courgettes", quantity: 1, unit: "pcs" },
        { name: "Huile d'olive", quantity: 2, unit: "c.s." },
      ],
    },
  ];

  for (const recipeDef of recipeDefs) {
    const recipe = await prisma.recipe.create({
      data: {
        householdId: household.id,
        title: recipeDef.title,
        servings: recipeDef.servings,
        prepTime: recipeDef.prepTime,
        cookTime: recipeDef.cookTime,
      },
    });

    for (const tagName of recipeDef.tags) {
      const tagId = tagMap.get(tagName);
      if (tagId) {
        await prisma.recipeTag.create({
          data: { recipeId: recipe.id, tagId },
        });
      }
    }

    for (const ing of recipeDef.ingredients) {
      const ingredientId = ingredientMap.get(ing.name);
      const unitId = unitMap.get(ing.unit);
      if (ingredientId) {
        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            ingredientId,
            quantity: ing.quantity,
            unitId: unitId ?? null,
          },
        });
      }
    }
  }

  console.log(`✅ Recipes: ${recipeDefs.length} créées avec tags et ingrédients`);
  console.log("");
  console.log("🎉 Seed recipes-only terminé!");
  console.log("   - WeekPlan, ShoppingItem, TransitionItem, PantryItem: VIDÉS");
  console.log("   - Household, Unit, Tag, Aisle, Ingredient: conservés/upsertés");
  console.log(`   - Recipe: ${recipeDefs.length} recettes fraîches`);
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

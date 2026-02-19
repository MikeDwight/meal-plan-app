import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const household = await prisma.household.upsert({
    where: { id: "home-household" },
    update: {},
    create: {
      id: "home-household",
      name: "Home",
    },
  });

  console.log(`✅ Household: ${household.name}`);

  const units = [
    { name: "gramme", abbr: "g" },
    { name: "kilogramme", abbr: "kg" },
    { name: "millilitre", abbr: "ml" },
    { name: "litre", abbr: "l" },
    { name: "pièce", abbr: "pcs" },
    { name: "cuillère à soupe", abbr: "c.s." },
    { name: "cuillère à café", abbr: "c.c." },
  ];

  for (const unit of units) {
    await prisma.unit.upsert({
      where: {
        householdId_abbr: {
          householdId: household.id,
          abbr: unit.abbr,
        },
      },
      update: {},
      create: {
        householdId: household.id,
        name: unit.name,
        abbr: unit.abbr,
      },
    });
  }

  console.log(`✅ Units: ${units.length} created`);

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

  for (const aisle of aisles) {
    await prisma.aisle.upsert({
      where: {
        householdId_name: {
          householdId: household.id,
          name: aisle.name,
        },
      },
      update: { sortOrder: aisle.sortOrder },
      create: {
        householdId: household.id,
        name: aisle.name,
        sortOrder: aisle.sortOrder,
      },
    });
  }

  console.log(`✅ Aisles: ${aisles.length} created`);

  const tags = [
    { name: "Rapide" },
    { name: "Végétarien" },
    { name: "Végan" },
    { name: "Sans gluten" },
    { name: "Batch cooking" },
    { name: "Comfort food" },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: {
        householdId_name: {
          householdId: household.id,
          name: tag.name,
        },
      },
      update: {},
      create: {
        householdId: household.id,
        name: tag.name,
      },
    });
  }

  console.log(`✅ Tags: ${tags.length} created`);

  console.log("🎉 Seeding complete!");
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

/**
 * Reset all data for the household (cascade delete + recreate).
 * Usage: npx ts-node --project tsconfig.json prisma/reset.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const HOUSEHOLD_ID = "home-household";

async function main() {
  console.log(`\n⚠️  Deleting all data for household "${HOUSEHOLD_ID}"...\n`);

  await prisma.household.delete({ where: { id: HOUSEHOLD_ID } });

  await prisma.household.create({
    data: { id: HOUSEHOLD_ID, name: "Home" },
  });

  console.log("✅ Reset complete. Household recreated, all data cleared.\n");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

/*
  Warnings:

  - A unique constraint covering the columns `[weekPlanId,dayIndex,mealSlot]` on the table `WeekPlanRecipe` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "WeekPlanRecipe" ADD COLUMN     "isManual" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "WeekPlanRecipe_weekPlanId_dayIndex_mealSlot_key" ON "WeekPlanRecipe"("weekPlanId", "dayIndex", "mealSlot");

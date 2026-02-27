-- CreateTable
CREATE TABLE "WeekRecipePool" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeekRecipePool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeekRecipePoolItem" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeekRecipePoolItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeekRecipePool_householdId_idx" ON "WeekRecipePool"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "WeekRecipePool_householdId_weekStart_key" ON "WeekRecipePool"("householdId", "weekStart");

-- CreateIndex
CREATE INDEX "WeekRecipePoolItem_poolId_idx" ON "WeekRecipePoolItem"("poolId");

-- CreateIndex
CREATE INDEX "WeekRecipePoolItem_recipeId_idx" ON "WeekRecipePoolItem"("recipeId");

-- CreateIndex
CREATE UNIQUE INDEX "WeekRecipePoolItem_poolId_recipeId_key" ON "WeekRecipePoolItem"("poolId", "recipeId");

-- AddForeignKey
ALTER TABLE "WeekRecipePool" ADD CONSTRAINT "WeekRecipePool_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekRecipePoolItem" ADD CONSTRAINT "WeekRecipePoolItem_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "WeekRecipePool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeekRecipePoolItem" ADD CONSTRAINT "WeekRecipePoolItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

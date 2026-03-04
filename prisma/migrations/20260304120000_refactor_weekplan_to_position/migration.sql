/*
  Refactor WeekPlanRecipe: replace slot-based model (dayIndex + mealSlot + sortOrder)
  with a simple ordered list using `position`.

  Migration strategy:
  1. Add new column `position` with default 0
  2. Populate position from existing data:
     - If sortOrder already has meaningful values, use it
     - Otherwise compute: dayIndex * 2 + (mealSlot == 'dinner' ? 1 : 0)
  3. Drop old columns: dayIndex, mealSlot, sortOrder
  4. Drop old unique constraint, create new one on (weekPlanId, position)
*/

-- Step 1: Add new position column (nullable first to allow migration)
ALTER TABLE "WeekPlanRecipe" ADD COLUMN "position" INTEGER;

-- Step 2: Populate position from existing data
-- Use sortOrder if it has been set (non-zero), otherwise compute from dayIndex/mealSlot
UPDATE "WeekPlanRecipe"
SET "position" = CASE
  WHEN "sortOrder" > 0 THEN "sortOrder"
  ELSE "dayIndex" * 2 + CASE WHEN "mealSlot" = 'dinner' THEN 1 ELSE 0 END
END;

-- Step 3: Make position NOT NULL with default
ALTER TABLE "WeekPlanRecipe" ALTER COLUMN "position" SET NOT NULL;
ALTER TABLE "WeekPlanRecipe" ALTER COLUMN "position" SET DEFAULT 0;

-- Step 4: Drop old unique constraint
DROP INDEX IF EXISTS "WeekPlanRecipe_weekPlanId_dayIndex_mealSlot_key";

-- Step 5: Drop old columns
ALTER TABLE "WeekPlanRecipe" DROP COLUMN "dayIndex";
ALTER TABLE "WeekPlanRecipe" DROP COLUMN "mealSlot";
ALTER TABLE "WeekPlanRecipe" DROP COLUMN "sortOrder";

-- Step 6: Create new unique constraint
CREATE UNIQUE INDEX "WeekPlanRecipe_weekPlanId_position_key" ON "WeekPlanRecipe"("weekPlanId", "position");

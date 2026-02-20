-- AlterTable
ALTER TABLE "ShoppingItem" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "ShoppingItem_archivedAt_idx" ON "ShoppingItem"("archivedAt");

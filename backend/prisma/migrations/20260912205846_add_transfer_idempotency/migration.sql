/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Transfer` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Transfer_receiverId_idx";

-- DropIndex
DROP INDEX "Transfer_reference_idx";

-- DropIndex
DROP INDEX "Transfer_senderId_idx";

-- DropIndex
DROP INDEX "Transfer_status_idx";

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "idempotencyKey" TEXT,
ALTER COLUMN "type" DROP DEFAULT,
ALTER COLUMN "status" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_idempotencyKey_key" ON "Transfer"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

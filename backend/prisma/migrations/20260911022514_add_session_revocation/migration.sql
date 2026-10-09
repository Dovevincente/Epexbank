-- AlterTable
ALTER TABLE "SecuritySession" ADD COLUMN     "revokedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "SecuritySession_revokedAt_idx" ON "SecuritySession"("revokedAt");

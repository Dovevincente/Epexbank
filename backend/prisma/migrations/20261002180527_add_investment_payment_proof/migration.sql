-- AlterTable
ALTER TABLE "Investment" ADD COLUMN     "paymentProofMimeType" TEXT,
ADD COLUMN     "paymentProofName" TEXT,
ADD COLUMN     "paymentProofSize" INTEGER,
ADD COLUMN     "paymentProofUrl" TEXT;

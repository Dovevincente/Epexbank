-- AlterTable
ALTER TABLE "Kyc" ADD COLUMN     "amlCode" TEXT,
ADD COLUMN     "amlCodeVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "amlCodeVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "cftCode" TEXT,
ADD COLUMN     "cftCodeVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cftCodeVerifiedAt" TIMESTAMP(3);

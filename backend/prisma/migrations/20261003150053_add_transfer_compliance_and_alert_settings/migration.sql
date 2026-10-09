-- CreateEnum
CREATE TYPE "ComplianceCheckStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'PASSED', 'FAILED', 'REVIEW');

-- CreateEnum
CREATE TYPE "OverallComplianceStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'CLEARED', 'BLOCKED', 'REVIEW');

-- AlterTable
ALTER TABLE "Kyc" ADD COLUMN     "taxCodeVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxCodeVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "taxIdentificationNumber" TEXT;

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "amlCheckStatus" "ComplianceCheckStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "cftCheckStatus" "ComplianceCheckStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "complianceReason" TEXT,
ADD COLUMN     "complianceReviewedAt" TIMESTAMP(3),
ADD COLUMN     "complianceStatus" "OverallComplianceStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "tinCheckStatus" "ComplianceCheckStatus" NOT NULL DEFAULT 'NOT_REQUIRED';

-- CreateTable
CREATE TABLE "ComplianceSettings" (
    "id" TEXT NOT NULL,
    "tinCheckEnabled" BOOLEAN NOT NULL DEFAULT false,
    "amlCheckEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cftCheckEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emailDebitAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsDebitAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppDebitAlertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComplianceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComplianceSettings_createdAt_idx" ON "ComplianceSettings"("createdAt");

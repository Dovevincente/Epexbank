-- CreateEnum
CREATE TYPE "InvestmentFundingMethod" AS ENUM ('BTC');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_SUBMITTED', 'UNDER_REVIEW', 'ACTIVE', 'MATURED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvestmentPaymentStatus" AS ENUM ('PENDING', 'SUBMITTED', 'VERIFIED', 'REJECTED');

-- CreateTable
CREATE TABLE "InvestmentPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "minimumAmount" DECIMAL(20,4) NOT NULL,
    "maximumAmount" DECIMAL(20,4),
    "returnRate" DECIMAL(8,4) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "principal" DECIMAL(20,4) NOT NULL,
    "expectedReturn" DECIMAL(20,4) NOT NULL,
    "totalMaturityValue" DECIMAL(20,4) NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "fundingMethod" "InvestmentFundingMethod" NOT NULL,
    "status" "InvestmentStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "paymentStatus" "InvestmentPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "btcAddress" TEXT,
    "btcAmount" DECIMAL(20,8),
    "btcRate" DECIMAL(20,8),
    "transactionHash" TEXT,
    "paymentSubmittedAt" TIMESTAMP(3),
    "paymentVerifiedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "maturityDate" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentPaymentConfig" (
    "id" TEXT NOT NULL,
    "fundingMethod" "InvestmentFundingMethod" NOT NULL,
    "btcAddress" TEXT,
    "btcRate" DECIMAL(20,8),
    "instructions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentPaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestmentPlan_isActive_idx" ON "InvestmentPlan"("isActive");

-- CreateIndex
CREATE INDEX "InvestmentPlan_currencyCode_idx" ON "InvestmentPlan"("currencyCode");

-- CreateIndex
CREATE UNIQUE INDEX "Investment_reference_key" ON "Investment"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Investment_transactionHash_key" ON "Investment"("transactionHash");

-- CreateIndex
CREATE INDEX "Investment_userId_idx" ON "Investment"("userId");

-- CreateIndex
CREATE INDEX "Investment_planId_idx" ON "Investment"("planId");

-- CreateIndex
CREATE INDEX "Investment_status_idx" ON "Investment"("status");

-- CreateIndex
CREATE INDEX "Investment_paymentStatus_idx" ON "Investment"("paymentStatus");

-- CreateIndex
CREATE INDEX "Investment_fundingMethod_idx" ON "Investment"("fundingMethod");

-- CreateIndex
CREATE INDEX "InvestmentPaymentConfig_fundingMethod_idx" ON "InvestmentPaymentConfig"("fundingMethod");

-- CreateIndex
CREATE INDEX "InvestmentPaymentConfig_isActive_idx" ON "InvestmentPaymentConfig"("isActive");

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_planId_fkey" FOREIGN KEY ("planId") REFERENCES "InvestmentPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

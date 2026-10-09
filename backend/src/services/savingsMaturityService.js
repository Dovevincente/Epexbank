import crypto from "node:crypto";
import { Prisma } from "@prisma/client";

import prisma from "../config/database.js";
import { getSavingsProduct } from "./savingsProductService.js";

const ZERO = new Prisma.Decimal(0);

const reference = (prefix) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(5)
    .toString("hex")
    .toUpperCase()}`;

/*
 * ============================================================
 * AUTOMATIC FIXED SAVINGS MATURITY
 * ============================================================
 *
 * Rules:
 *
 * FIXED savings:
 * - Cannot be manually withdrawn.
 * - Remains locked until maturityDate.
 * - At maturity, the complete savings balance is automatically
 *   transferred to the customer's active CURRENT account.
 * - A SAVINGS_WITHDRAWAL transaction is created.
 * - A CREDIT ledger entry is created on the destination account.
 * - The Fixed Savings balance becomes 0.
 * - The Fixed Savings status becomes WITHDRAWN.
 *
 * Destination:
 * 1. Active CURRENT account in the same currency.
 * 2. If no CURRENT account exists, another active account
 *    belonging to the customer in the same currency.
 *
 * The operation is idempotent because only ACTIVE FIXED savings
 * are eligible for processing.
 * ============================================================
 */

export async function processFixedSavingsMaturities() {
  const now = new Date();

  let processed = 0;
  let skipped = 0;

  while (true) {
    const candidate =
      await prisma.savingsAccount.findFirst({
        where: {
          type: "FIXED",

          status: "ACTIVE",

          maturityDate: {
            lte: now,
          },
        },

        orderBy: {
          maturityDate: "asc",
        },

        select: {
          id: true,
        },
      });

    if (!candidate) {
      break;
    }

    try {
      const result =
        await prisma.$transaction(
          async (tx) => {
            /*
             * Re-read the record inside the transaction.
             *
             * This protects against another scheduler instance
             * processing the same savings account at the same time.
             */
            const fixed =
              await tx.savingsAccount.findUnique({
                where: {
                  id: candidate.id,
                },
              });

            if (
              !fixed ||
              fixed.type !== "FIXED" ||
              fixed.status !== "ACTIVE"
            ) {
              return {
                processed: false,
                skipped: true,
              };
            }

            if (
              !fixed.maturityDate ||
              fixed.maturityDate > now
            ) {
              return {
                processed: false,
                skipped: true,
              };
            }

            const product =
              getSavingsProduct("FIXED");

            const currency =
              await tx.currency.findUnique({
                where: {
                  code:
                    product.currencyCode,
                },

                select: {
                  id: true,
                  code: true,
                  isActive: true,
                },
              });

            if (!currency) {
              const error = new Error(
                `Currency ${product.currencyCode} is not configured.`,
              );

              error.statusCode = 500;

              throw error;
            }

            if (!currency.isActive) {
              const error = new Error(
                `Currency ${product.currencyCode} is inactive.`,
              );

              error.statusCode = 400;

              throw error;
            }

            /*
             * Prefer the customer's CURRENT account.
             */
            let destination =
              await tx.account.findFirst({
                where: {
                  userId: fixed.userId,
                  status: "ACTIVE",
                  type: "CURRENT",
                  currencyId: currency.id,
                },

                include: {
                  currency: true,
                },

                orderBy: {
                  createdAt: "asc",
                },
              });

            /*
             * Fallback to another active account in the
             * same currency if no CURRENT account exists.
             */
            if (!destination) {
              destination =
                await tx.account.findFirst({
                  where: {
                    userId: fixed.userId,
                    status: "ACTIVE",
                    currencyId: currency.id,
                  },

                  include: {
                    currency: true,
                  },

                  orderBy: {
                    createdAt: "asc",
                  },
                });
            }

            if (!destination) {
              const error = new Error(
                `No active ${currency.code} account is available for fixed-savings maturity payout.`,
              );

              error.statusCode = 409;

              throw error;
            }

            const amount =
              new Prisma.Decimal(
                fixed.balance || 0,
              );

            const destinationBalanceBefore =
              new Prisma.Decimal(
                destination.balance || 0,
              );

            const destinationAvailableBefore =
              new Prisma.Decimal(
                destination.availableBalance || 0,
              );

            const destinationLedgerBefore =
              new Prisma.Decimal(
                destination.ledgerBalance || 0,
              );

            const destinationBalanceAfter =
              destinationBalanceBefore.add(
                amount,
              );

            const destinationAvailableAfter =
              destinationAvailableBefore.add(
                amount,
              );

            const destinationLedgerAfter =
              destinationLedgerBefore.add(
                amount,
              );

            let transaction = null;

            /*
             * If the Fixed Savings has money, create the
             * financial transaction and ledger entry.
             */
            if (amount.gt(ZERO)) {
              transaction =
                await tx.transaction.create({
                  data: {
                    reference:
                      reference(
                        "FIXMAT",
                      ),

                    userId:
                      fixed.userId,

                    accountId:
                      destination.id,

                    currencyId:
                      currency.id,

                    type:
                      "SAVINGS_WITHDRAWAL",

                    status:
                      "COMPLETED",

                    amount,

                    fee: ZERO,

                    total: amount,

                    description:
                      `Automatic maturity payout from ${fixed.name}`,

                    metadata: {
                      operation:
                        "FIXED_SAVINGS_AUTO_MATURITY",

                      automatic:
                        true,

                      savingsId:
                        fixed.id,

                      savingsReference:
                        fixed.reference,

                      maturityDate:
                        fixed.maturityDate.toISOString(),

                      destinationAccountId:
                        destination.id,

                      destinationAccountNumber:
                        destination.accountNumber,
                    },
                  },
                });

              await tx.ledgerEntry.create({
                data: {
                  accountId:
                    destination.id,

                  transactionId:
                    transaction.id,

                  type:
                    "CREDIT",

                  amount,

                  balanceBefore:
                    destinationBalanceBefore,

                  balanceAfter:
                    destinationBalanceAfter,

                  description:
                    `Automatic maturity payout from ${fixed.name}`,
                },
              });

              await tx.account.update({
                where: {
                  id:
                    destination.id,
                },

                data: {
                  balance:
                    destinationBalanceAfter,

                  availableBalance:
                    destinationAvailableAfter,

                  ledgerBalance:
                    destinationLedgerAfter,
                },
              });
            }

            /*
             * Close the Fixed Savings.
             */
            const updatedSavings =
              await tx.savingsAccount.update({
                where: {
                  id: fixed.id,
                },

                data: {
                  balance: ZERO,

                  principal: ZERO,

                  status:
                    "WITHDRAWN",
                },
              });

            return {
              processed: true,

              skipped: false,

              savingsId:
                updatedSavings.id,

              reference:
                updatedSavings.reference,

              amount:
                amount.toString(),

              destinationAccountId:
                destination.id,

              transactionId:
                transaction?.id || null,
            };
          },

          {
            isolationLevel:
              Prisma.TransactionIsolationLevel
                .Serializable,

            maxWait: 5000,

            timeout: 15000,
          },
        );

      if (result.processed) {
        processed += 1;
      }

      if (result.skipped) {
        skipped += 1;
      }
    } catch (error) {
      skipped += 1;

      console.error(
        `[Savings Maturity] Failed to process ${candidate.id}:`,
        error.message,
      );

      /*
       * Do not loop forever on a broken account.
       * The next scheduler cycle will retry it.
       */
      break;
    }
  }

  return {
    processed,

    skipped,

    checkedAt:
      now.toISOString(),
  };
}

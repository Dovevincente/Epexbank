import prisma from "../config/database.js";
import {
  toDecimal,
  serializeMoney,
} from "../utils/money.js";
import { generateReference } from "../utils/reference.js";
import logger from "../utils/logger.js";

/* =========================================================
   CONSTANTS
========================================================= */

const LOAN_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  ACTIVE: "ACTIVE",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
  DEFAULTED: "DEFAULTED",
  CANCELLED: "CANCELLED",
});

const REPAYMENT_STATUS = Object.freeze({
  PENDING: "PENDING",
  PAID: "PAID",
  PARTIAL: "PARTIAL",
  OVERDUE: "OVERDUE",
  MISSED: "MISSED",
});

const MIN_LOAN_AMOUNT = 0.01;
const MAX_LOAN_AMOUNT = 1_000_000_000;

const MIN_TERM_MONTHS = 1;
const MAX_TERM_MONTHS = 360;

const MIN_INTEREST_RATE = 0;
const MAX_INTEREST_RATE = 100;

/* =========================================================
   VALIDATION HELPERS
========================================================= */

function assertUserId(userId) {
  if (!userId || typeof userId !== "string") {
    const error = new Error(
      "A valid user ID is required."
    );

    error.statusCode = 400;
    throw error;
  }
}

function assertLoanId(loanId) {
  if (!loanId || typeof loanId !== "string") {
    const error = new Error(
      "A valid loan ID is required."
    );

    error.statusCode = 400;
    throw error;
  }
}

function assertRepaymentId(repaymentId) {
  if (
    !repaymentId ||
    typeof repaymentId !== "string"
  ) {
    const error = new Error(
      "A valid repayment ID is required."
    );

    error.statusCode = 400;
    throw error;
  }
}

function assertPositiveAmount(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    const error = new Error(
      "Amount must be greater than zero."
    );

    error.statusCode = 400;
    throw error;
  }

  if (value < MIN_LOAN_AMOUNT) {
    const error = new Error(
      `Amount must be at least ${MIN_LOAN_AMOUNT}.`
    );

    error.statusCode = 400;
    throw error;
  }

  if (value > MAX_LOAN_AMOUNT) {
    const error = new Error(
      `Amount cannot exceed ${MAX_LOAN_AMOUNT}.`
    );

    error.statusCode = 400;
    throw error;
  }

  return value;
}

function assertTermMonths(termMonths) {
  const value = Number(termMonths);

  if (
    !Number.isInteger(value) ||
    value < MIN_TERM_MONTHS ||
    value > MAX_TERM_MONTHS
  ) {
    const error = new Error(
      `Loan term must be between ${MIN_TERM_MONTHS} and ${MAX_TERM_MONTHS} months.`
    );

    error.statusCode = 400;
    throw error;
  }

  return value;
}

function assertInterestRate(rate) {
  const value = Number(rate);

  if (
    !Number.isFinite(value) ||
    value < MIN_INTEREST_RATE ||
    value > MAX_INTEREST_RATE
  ) {
    const error = new Error(
      `Interest rate must be between ${MIN_INTEREST_RATE}% and ${MAX_INTEREST_RATE}%.`
    );

    error.statusCode = 400;
    throw error;
  }

  return value;
}

function normalizeOptionalString(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0
    ? normalized
    : null;
}

function serializeLoan(loan) {
  if (!loan) {
    return null;
  }

  return {
    ...loan,

    requestedAmount:
      serializeMoney(
        loan.requestedAmount
      ),

    approvedAmount:
      loan.approvedAmount !== null &&
      loan.approvedAmount !== undefined
        ? serializeMoney(
            loan.approvedAmount
          )
        : null,

    interestRate:
      serializeMoney(
        loan.interestRate
      ),

    monthlyPayment:
      loan.monthlyPayment !== null &&
      loan.monthlyPayment !== undefined
        ? serializeMoney(
            loan.monthlyPayment
          )
        : null,

    totalRepayment:
      loan.totalRepayment !== null &&
      loan.totalRepayment !== undefined
        ? serializeMoney(
            loan.totalRepayment
          )
        : null,

    outstandingBalance:
      loan.outstandingBalance !== null &&
      loan.outstandingBalance !== undefined
        ? serializeMoney(
            loan.outstandingBalance
          )
        : null,

    repayments:
      Array.isArray(loan.repayments)
        ? loan.repayments.map(
            serializeRepayment
          )
        : undefined,
  };
}

function serializeRepayment(repayment) {
  if (!repayment) {
    return null;
  }

  return {
    ...repayment,

    amount:
      serializeMoney(
        repayment.amount
      ),

    principal:
      serializeMoney(
        repayment.principal
      ),

    interest:
      serializeMoney(
        repayment.interest
      ),
  };
}

/* =========================================================
   LOAN CALCULATIONS
========================================================= */

/**
 * Calculate a standard amortized monthly payment.
 *
 * Interest rate is treated as an annual percentage.
 *
 * Formula:
 *
 * P = loan principal
 * r = annual rate / 12
 * n = number of months
 *
 * M = P * r * (1+r)^n / ((1+r)^n - 1)
 *
 * For zero-interest loans:
 *
 * M = P / n
 */
export function calculateMonthlyPayment({
  principal,
  annualInterestRate,
  termMonths,
}) {
  const P = toDecimal(principal);
  const annualRate =
    Number(annualInterestRate);
  const n = Number(termMonths);

  assertPositiveAmount(P.toString());
  assertInterestRate(annualRate);
  assertTermMonths(n);

  if (annualRate === 0) {
    return P.div(
      toDecimal(n)
    );
  }

  const monthlyRate =
    annualRate / 100 / 12;

  const factor = Math.pow(
    1 + monthlyRate,
    n
  );

  const payment =
    Number(P.toString()) *
    (
      monthlyRate *
      factor
    ) /
    (
      factor - 1
    );

  return toDecimal(
    payment.toFixed(4)
  );
}

/**
 * Calculate total repayment.
 */
export function calculateTotalRepayment({
  monthlyPayment,
  termMonths,
}) {
  const payment =
    toDecimal(monthlyPayment);

  const term =
    assertTermMonths(termMonths);

  return payment.mul(
    toDecimal(term)
  );
}

/**
 * Calculate principal and interest for an installment.
 *
 * Interest is calculated from the remaining balance at the
 * beginning of the installment.
 */
function calculateInstallmentBreakdown({
  remainingPrincipal,
  annualInterestRate,
  monthlyPayment,
}) {
  const balance =
    toDecimal(
      remainingPrincipal
    );

  const payment =
    toDecimal(
      monthlyPayment
    );

  const monthlyRate =
    Number(annualInterestRate) /
    100 /
    12;

  const interest =
    balance.mul(
      toDecimal(monthlyRate)
    );

  let principal =
    payment.sub(interest);

  if (principal.lt(0)) {
    principal = toDecimal(0);
  }

  if (principal.gt(balance)) {
    principal = balance;
  }

  return {
    principal,
    interest,
  };
}

/* =========================================================
   LOAN CREATION
========================================================= */

/**
 * Create a customer loan application.
 */
export async function createLoanApplication({
  userId,
  type,
  requestedAmount,
  interestRate,
  termMonths,
  purpose,
}) {
  assertUserId(userId);

  const amount =
    assertPositiveAmount(
      requestedAmount
    );

  const rate =
    assertInterestRate(
      interestRate
    );

  const term =
    assertTermMonths(
      termMonths
    );

  const normalizedPurpose =
    normalizeOptionalString(
      purpose
    );

  return prisma.$transaction(
    async (tx) => {
      const user =
        await tx.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
          },
        });

      if (!user) {
        const error = new Error(
          "User not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (!type) {
        const error = new Error(
          "Loan type is required."
        );

        error.statusCode = 400;
        throw error;
      }

      const reference =
        await generateLoanReference(tx);

      const loan =
        await tx.loan.create({
          data: {
            reference,

            userId,

            type,

            status:
              LOAN_STATUS.PENDING,

            requestedAmount:
              toDecimal(amount),

            approvedAmount: null,

            interestRate:
              toDecimal(rate),

            termMonths: term,

            monthlyPayment: null,

            totalRepayment: null,

            outstandingBalance: null,

            purpose:
              normalizedPurpose,
          },

          include: {
            repayments: true,
          },
        });

      logger.info(
        "Loan application created",
        {
          userId,
          loanId: loan.id,
          reference: loan.reference,
          requestedAmount:
            serializeMoney(
              loan.requestedAmount
            ),
        }
      );

      return serializeLoan(loan);
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

/* =========================================================
   CUSTOMER LOAN QUERIES
========================================================= */

/**
 * Get all loans belonging to a customer.
 */
export async function getUserLoans({
  userId,
  status,
  page = 1,
  limit = 20,
}) {
  assertUserId(userId);

  const parsedPage =
    Math.max(
      Number(page) || 1,
      1
    );

  const parsedLimit =
    Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      100
    );

  const where = {
    userId,
  };

  if (status) {
    where.status = status;
  }

  const [loans, total] =
    await prisma.$transaction([
      prisma.loan.findMany({
        where,

        include: {
          repayments: {
            orderBy: {
              installment: "asc",
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        skip:
          (parsedPage - 1) *
          parsedLimit,

        take: parsedLimit,
      }),

      prisma.loan.count({
        where,
      }),
    ]);

  return {
    items: loans.map(
      serializeLoan
    ),

    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages:
        Math.ceil(
          total / parsedLimit
        ),
    },
  };
}

/**
 * Get one customer's loan.
 */
export async function getUserLoan({
  userId,
  loanId,
}) {
  assertUserId(userId);
  assertLoanId(loanId);

  const loan =
    await prisma.loan.findFirst({
      where: {
        id: loanId,
        userId,
      },

      include: {
        repayments: {
          orderBy: {
            installment: "asc",
          },
        },
      },
    });

  if (!loan) {
    const error = new Error(
      "Loan not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return serializeLoan(loan);
}

/* =========================================================
   LOAN REVIEW
========================================================= */

/**
 * Move a PENDING loan to UNDER_REVIEW.
 */
export async function startLoanReview({
  loanId,
  adminUserId,
}) {
  assertLoanId(loanId);
  assertUserId(adminUserId);

  return prisma.$transaction(
    async (tx) => {
      const loan =
        await tx.loan.findUnique({
          where: {
            id: loanId,
          },
        });

      if (!loan) {
        const error = new Error(
          "Loan not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        loan.status !==
        LOAN_STATUS.PENDING
      ) {
        const error = new Error(
          `Loan cannot enter review from ${loan.status}.`
        );

        error.statusCode = 409;
        throw error;
      }

      const updated =
        await tx.loan.update({
          where: {
            id: loan.id,
          },

          data: {
            status:
              LOAN_STATUS.UNDER_REVIEW,
          },

          include: {
            repayments: true,
          },
        });

      await tx.auditLog.create({
        data: {
          userId:
            loan.userId,

          adminUserId,

          action: "UPDATE",

          entity: "Loan",

          entityId:
            loan.id,

          metadata: {
            action:
              "LOAN_REVIEW_STARTED",

            previousStatus:
              loan.status,

            newStatus:
              updated.status,
          },
        },
      });

      logger.info(
        "Loan review started",
        {
          loanId: loan.id,
          adminUserId,
        }
      );

      return serializeLoan(
        updated
      );
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

/* =========================================================
   LOAN APPROVAL
========================================================= */

/**
 * Approve a loan.
 *
 * Approval does not disburse funds.
 *
 * It calculates the repayment terms and generates the
 * repayment schedule. Disbursement remains a separate action.
 */
export async function approveLoan({
  loanId,
  adminUserId,
  approvedAmount,
  interestRate,
}) {
  assertLoanId(loanId);
  assertUserId(adminUserId);

  return prisma.$transaction(
    async (tx) => {
      const loan =
        await tx.loan.findUnique({
          where: {
            id: loanId,
          },

          include: {
            repayments: true,
          },
        });

      if (!loan) {
        const error = new Error(
          "Loan not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        ![
          LOAN_STATUS.PENDING,
          LOAN_STATUS.UNDER_REVIEW,
        ].includes(
          loan.status
        )
      ) {
        const error = new Error(
          `Loan cannot be approved from ${loan.status}.`
        );

        error.statusCode = 409;
        throw error;
      }

      const amount =
        assertPositiveAmount(
          approvedAmount ??
            loan.requestedAmount.toString()
        );

      const rate =
        assertInterestRate(
          interestRate ??
            loan.interestRate.toString()
        );

      const monthlyPayment =
        calculateMonthlyPayment({
          principal: amount,
          annualInterestRate:
            rate,
          termMonths:
            loan.termMonths,
        });

      const totalRepayment =
        calculateTotalRepayment({
          monthlyPayment,
          termMonths:
            loan.termMonths,
        });

      const now =
        new Date();

      const updated =
        await tx.loan.update({
          where: {
            id: loan.id,
          },

          data: {
            status:
              LOAN_STATUS.APPROVED,

            approvedAmount:
              toDecimal(amount),

            interestRate:
              toDecimal(rate),

            monthlyPayment,

            totalRepayment,

            outstandingBalance:
              totalRepayment,

            approvedAt:
              now,
          },
        });

      /*
       * A loan can only have one active repayment schedule.
       * Existing schedules are removed before generating the
       * approved schedule.
       */
      await tx.loanRepayment.deleteMany({
        where: {
          loanId: loan.id,
        },
      });

      const repaymentRows = [];

      let remainingPrincipal =
        toDecimal(amount);

      const monthlyRate =
        rate / 100 / 12;

      for (
        let installment = 1;
        installment <=
        loan.termMonths;
        installment += 1
      ) {
        const breakdown =
          calculateInstallmentBreakdown({
            remainingPrincipal,
            annualInterestRate:
              rate,
            monthlyPayment,
          });

        let principal =
          breakdown.principal;

        let interest =
          breakdown.interest;

        /*
         * Correct the final installment so that rounding
         * cannot leave a residual balance.
         */
        if (
          installment ===
          loan.termMonths
        ) {
          principal =
            remainingPrincipal;

          const finalPayment =
            principal.add(
              interest
            );

          repaymentRows.push({
            loanId: loan.id,
            installment,
            amount: finalPayment,
            principal,
            interest,
            dueDate:
              addMonths(
                now,
                installment
              ),
            status:
              REPAYMENT_STATUS.PENDING,
          });

          remainingPrincipal =
            toDecimal(0);

          continue;
        }

        repaymentRows.push({
          loanId: loan.id,
          installment,
          amount:
            principal.add(
              interest
            ),
          principal,
          interest,
          dueDate:
            addMonths(
              now,
              installment
            ),
          status:
            REPAYMENT_STATUS.PENDING,
        });

        remainingPrincipal =
          remainingPrincipal.sub(
            principal
          );

        if (
          remainingPrincipal.lt(
            toDecimal(0.0001)
          )
        ) {
          remainingPrincipal =
            toDecimal(0);
        }
      }

      await tx.loanRepayment.createMany({
        data: repaymentRows,
      });

      await tx.auditLog.create({
        data: {
          userId:
            loan.userId,

          adminUserId,

          action:
            "LOAN_APPROVAL",

          entity:
            "Loan",

          entityId:
            loan.id,

          metadata: {
            action:
              "LOAN_APPROVED",

            previousStatus:
              loan.status,

            newStatus:
              updated.status,

            approvedAmount:
              serializeMoney(
                updated.approvedAmount
              ),

            interestRate:
              serializeMoney(
                updated.interestRate
              ),

            termMonths:
              updated.termMonths,

            monthlyPayment:
              serializeMoney(
                updated.monthlyPayment
              ),

            totalRepayment:
              serializeMoney(
                updated.totalRepayment
              ),
          },
        },
      });

      const finalLoan =
        await tx.loan.findUnique({
          where: {
            id: loan.id,
          },

          include: {
            repayments: {
              orderBy: {
                installment:
                  "asc",
              },
            },
          },
        });

      logger.security(
        "Loan approved",
        {
          loanId: loan.id,
          customerUserId:
            loan.userId,
          adminUserId,
        }
      );

      return serializeLoan(
        finalLoan
      );
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

/* =========================================================
   LOAN REJECTION
========================================================= */

/**
 * Reject a loan application.
 */
export async function rejectLoan({
  loanId,
  adminUserId,
  rejectionReason,
}) {
  assertLoanId(loanId);
  assertUserId(adminUserId);

  const reason =
    normalizeOptionalString(
      rejectionReason
    );

  if (!reason) {
    const error = new Error(
      "Rejection reason is required."
    );

    error.statusCode = 400;
    throw error;
  }

  if (reason.length > 1000) {
    const error = new Error(
      "Rejection reason cannot exceed 1000 characters."
    );

    error.statusCode = 400;
    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      const loan =
        await tx.loan.findUnique({
          where: {
            id: loanId,
          },
        });

      if (!loan) {
        const error = new Error(
          "Loan not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        ![
          LOAN_STATUS.PENDING,
          LOAN_STATUS.UNDER_REVIEW,
        ].includes(
          loan.status
        )
      ) {
        const error = new Error(
          `Loan cannot be rejected from ${loan.status}.`
        );

        error.statusCode = 409;
        throw error;
      }

      const updated =
        await tx.loan.update({
          where: {
            id: loan.id,
          },

          data: {
            status:
              LOAN_STATUS.REJECTED,

            rejectionReason:
              reason,
          },

          include: {
            repayments: true,
          },
        });

      await tx.auditLog.create({
        data: {
          userId:
            loan.userId,

          adminUserId,

          action: "REJECT",

          entity: "Loan",

          entityId:
            loan.id,

          metadata: {
            action:
              "LOAN_REJECTED",

            previousStatus:
              loan.status,

            newStatus:
              updated.status,

            reason,
          },
        },
      });

      logger.security(
        "Loan rejected",
        {
          loanId: loan.id,
          customerUserId:
            loan.userId,
          adminUserId,
        }
      );

      return serializeLoan(
        updated
      );
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

/* =========================================================
   LOAN DISBURSEMENT
========================================================= */

/**
 * Mark an approved loan as ACTIVE and record the
 * disbursement timestamp.
 *
 * IMPORTANT:
 * This function changes the loan lifecycle only.
 *
 * Actual customer-account credit should be performed by the
 * core banking/account ledger transaction that is responsible
 * for loan disbursement.
 */
export async function disburseLoan({
  loanId,
  adminUserId,
}) {
  assertLoanId(loanId);
  assertUserId(adminUserId);

  return prisma.$transaction(
    async (tx) => {
      const loan =
        await tx.loan.findUnique({
          where: {
            id: loanId,
          },
        });

      if (!loan) {
        const error = new Error(
          "Loan not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        loan.status !==
        LOAN_STATUS.APPROVED
      ) {
        const error = new Error(
          `Only APPROVED loans can be disbursed. Current status: ${loan.status}.`
        );

        error.statusCode = 409;
        throw error;
      }

      if (
        !loan.approvedAmount
      ) {
        const error = new Error(
          "Loan has no approved amount."
        );

        error.statusCode = 409;
        throw error;
      }

      const now =
        new Date();

      const updated =
        await tx.loan.update({
          where: {
            id: loan.id,
          },

          data: {
            status:
              LOAN_STATUS.ACTIVE,

            disbursedAt:
              now,

            outstandingBalance:
              loan.totalRepayment,
          },

          include: {
            repayments: {
              orderBy: {
                installment:
                  "asc",
              },
            },
          },
        });

      await tx.auditLog.create({
        data: {
          userId:
            loan.userId,

          adminUserId,

          action:
            "UPDATE",

          entity:
            "Loan",

          entityId:
            loan.id,

          metadata: {
            action:
              "LOAN_DISBURSED",

            previousStatus:
              loan.status,

            newStatus:
              updated.status,

            approvedAmount:
              serializeMoney(
                loan.approvedAmount
              ),
          },
        },
      });

      logger.security(
        "Loan marked as disbursed",
        {
          loanId: loan.id,
          customerUserId:
            loan.userId,
          adminUserId,
        }
      );

      return serializeLoan(
        updated
      );
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

/* =========================================================
   REPAYMENT
========================================================= */

/**
 * Process a loan repayment.
 *
 * This function updates the loan and repayment records.
 * The actual debit from the customer's bank account should
 * happen through the core banking transaction layer.
 *
 * The caller should therefore only invoke this function once
 * the corresponding account debit has been successfully
 * authorized/settled.
 */
export async function processLoanRepayment({
  userId,
  loanId,
  repaymentId,
  amount,
}) {
  assertUserId(userId);
  assertLoanId(loanId);
  assertRepaymentId(
    repaymentId
  );

  const paymentAmount =
    assertPositiveAmount(
      amount
    );

  return prisma.$transaction(
    async (tx) => {
      const loan =
        await tx.loan.findFirst({
          where: {
            id: loanId,
            userId,
          },

          include: {
            repayments: {
              orderBy: {
                installment:
                  "asc",
              },
            },
          },
        });

      if (!loan) {
        const error = new Error(
          "Loan not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        ![
          LOAN_STATUS.ACTIVE,
          LOAN_STATUS.DEFAULTED,
        ].includes(
          loan.status
        )
      ) {
        const error = new Error(
          `Loan cannot receive repayments while ${loan.status}.`
        );

        error.statusCode = 409;
        throw error;
      }

      const repayment =
        await tx.loanRepayment.findFirst({
          where: {
            id: repaymentId,
            loanId: loan.id,
          },
        });

      if (!repayment) {
        const error = new Error(
          "Loan repayment not found."
        );

        error.statusCode = 404;
        throw error;
      }

      if (
        repayment.status ===
        REPAYMENT_STATUS.PAID
      ) {
        const error = new Error(
          "This repayment has already been paid."
        );

        error.statusCode = 409;
        throw error;
      }

      const scheduledAmount =
        toDecimal(
          repayment.amount
        );

      const alreadyPaid =
        repayment.paidAt
          ? scheduledAmount
          : toDecimal(0);

      const remainingInstallment =
        scheduledAmount.sub(
          alreadyPaid
        );

      const actualPayment =
        toDecimal(
          paymentAmount
        );

      if (
        actualPayment.gt(
          remainingInstallment
        )
      ) {
        const error = new Error(
          "Payment exceeds the remaining installment amount."
        );

        error.statusCode = 400;
        throw error;
      }

      const loanOutstanding =
        toDecimal(
          loan.outstandingBalance ??
            loan.totalRepayment ??
            0
        );

      if (
        actualPayment.gt(
          loanOutstanding
        )
      ) {
        const error = new Error(
          "Payment exceeds the loan outstanding balance."
        );

        error.statusCode = 400;
        throw error;
      }

      const isFullInstallment =
        actualPayment.eq(
          remainingInstallment
        );

      const repaymentStatus =
        isFullInstallment
          ? REPAYMENT_STATUS.PAID
          : REPAYMENT_STATUS.PARTIAL;

      /*
       * For a partial repayment, allocate payment
       * proportionally between principal and interest.
       */
      let principalPaid;
      let interestPaid;

      if (
        isFullInstallment
      ) {
        principalPaid =
          toDecimal(
            repayment.principal
          );

        interestPaid =
          toDecimal(
            repayment.interest
          );
      } else {
        const installmentTotal =
          scheduledAmount;

        const principalRatio =
          toDecimal(
            repayment.principal
          ).div(
            installmentTotal
          );

        principalPaid =
          actualPayment.mul(
            principalRatio
          );

        interestPaid =
          actualPayment.sub(
            principalPaid
          );
      }

      let updatedRepayment;

      if (
        isFullInstallment
      ) {
        updatedRepayment =
          await tx.loanRepayment.update({
            where: {
              id: repayment.id,
            },

            data: {
              amount:
                actualPayment,

              principal:
                principalPaid,

              interest:
                interestPaid,

              status:
                REPAYMENT_STATUS.PAID,

              paidAt:
                new Date(),
            },
          });
      } else {
        updatedRepayment =
          await tx.loanRepayment.update({
            where: {
              id: repayment.id,
            },

            data: {
              amount:
                actualPayment,

              principal:
                principalPaid,

              interest:
                interestPaid,

              status:
                REPAYMENT_STATUS.PARTIAL,
            },
          });
      }

      const newOutstanding =
        loanOutstanding.sub(
          actualPayment
        );

      const normalizedOutstanding =
        newOutstanding.lt(
          toDecimal(0.0001)
        )
          ? toDecimal(0)
          : newOutstanding;

      const loanCompleted =
        normalizedOutstanding.isZero();

      const updatedLoan =
        await tx.loan.update({
          where: {
            id: loan.id,
          },

          data: {
            outstandingBalance:
              normalizedOutstanding,

            status:
              loanCompleted
                ? LOAN_STATUS.COMPLETED
                : LOAN_STATUS.ACTIVE,

            completedAt:
              loanCompleted
                ? new Date()
                : null,
          },

          include: {
            repayments: {
              orderBy: {
                installment:
                  "asc",
              },
            },
          },
        });

      logger.info(
        "Loan repayment processed",
        {
          userId,
          loanId: loan.id,
          repaymentId:
            repayment.id,
          amount:
            serializeMoney(
              actualPayment
            ),
          remainingBalance:
            serializeMoney(
              normalizedOutstanding
            ),
        }
      );

      return {
        loan:
          serializeLoan(
            updatedLoan
          ),

        repayment:
          serializeRepayment(
            updatedRepayment
          ),
      };
    },
    {
      isolationLevel: "Serializable",
    }
  );
}

/* =========================================================
   REPAYMENT SCHEDULE
========================================================= */

/**
 * Get a customer's repayment schedule.
 */
export async function getLoanRepaymentSchedule({
  userId,
  loanId,
}) {
  assertUserId(userId);
  assertLoanId(loanId);

  const loan =
    await prisma.loan.findFirst({
      where: {
        id: loanId,
        userId,
      },
    });

  if (!loan) {
    const error = new Error(
      "Loan not found."
    );

    error.statusCode = 404;
    throw error;
  }

  const repayments =
    await prisma.loanRepayment.findMany({
      where: {
        loanId,
      },

      orderBy: {
        installment: "asc",
      },
    });

  return repayments.map(
    serializeRepayment
  );
}

/* =========================================================
   OVERDUE REPAYMENTS
========================================================= */

/**
 * Mark unpaid repayment installments as OVERDUE.
 *
 * This is intended for a scheduled background job.
 */
export async function markOverdueRepayments() {
  const now =
    new Date();

  const result =
    await prisma.loanRepayment.updateMany({
      where: {
        dueDate: {
          lt: now,
        },

        status: {
          in: [
            REPAYMENT_STATUS.PENDING,
            REPAYMENT_STATUS.PARTIAL,
          ],
        },
      },

      data: {
        status:
          REPAYMENT_STATUS.OVERDUE,
      },
    });

  logger.info(
    "Overdue loan repayments updated",
    {
      count:
        result.count,
    }
  );

  return {
    updated:
      result.count,
  };
}

/* =========================================================
   ADMIN LOAN QUERIES
========================================================= */

/**
 * List loans for administrative workflows.
 */
export async function listLoanApplications({
  status,
  type,
  page = 1,
  limit = 20,
}) {
  const parsedPage =
    Math.max(
      Number(page) || 1,
      1
    );

  const parsedLimit =
    Math.min(
      Math.max(
        Number(limit) || 20,
        1
      ),
      100
    );

  const where = {};

  if (status) {
    where.status = status;
  }

  if (type) {
    where.type = type;
  }

  const [loans, total] =
    await prisma.$transaction([
      prisma.loan.findMany({
        where,

        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              status: true,
            },
          },

          repayments: {
            orderBy: {
              installment:
                "asc",
            },
          },
        },

        orderBy: {
          createdAt: "desc",
        },

        skip:
          (parsedPage - 1) *
          parsedLimit,

        take:
          parsedLimit,
      }),

      prisma.loan.count({
        where,
      }),
    ]);

  return {
    items: loans.map(
      (loan) => ({
        ...serializeLoan(
          loan
        ),

        user: loan.user,
      })
    ),

    pagination: {
      page: parsedPage,
      limit: parsedLimit,
      total,
      totalPages:
        Math.ceil(
          total / parsedLimit
        ),
    },
  };
}

/**
 * Get a loan for administrative review.
 */
export async function getLoanForAdmin(
  loanId
) {
  assertLoanId(loanId);

  const loan =
    await prisma.loan.findUnique({
      where: {
        id: loanId,
      },

      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
            profile: true,
          },
        },

        repayments: {
          orderBy: {
            installment:
              "asc",
          },
        },
      },
    });

  if (!loan) {
    const error = new Error(
      "Loan not found."
    );

    error.statusCode = 404;
    throw error;
  }

  return {
    ...serializeLoan(
      loan
    ),

    user: loan.user,
  };
}

/* =========================================================
   REFERENCE GENERATION
========================================================= */

async function generateLoanReference(
  tx
) {
  for (
    let attempt = 0;
    attempt < 5;
    attempt += 1
  ) {
    const reference =
      generateReference(
        "LOAN"
      );

    const existing =
      await tx.loan.findUnique({
        where: {
          reference,
        },

        select: {
          id: true,
        },
      });

    if (!existing) {
      return reference;
    }
  }

  const error = new Error(
    "Unable to generate a unique loan reference."
  );

  error.statusCode = 500;

  throw error;
}

/* =========================================================
   DATE HELPERS
========================================================= */

/**
 * Add calendar months while preserving the day when possible.
 */
function addMonths(
  date,
  months
) {
  const result =
    new Date(date);

  const originalDay =
    result.getDate();

  result.setDate(1);

  result.setMonth(
    result.getMonth() +
      months
  );

  const lastDay =
    new Date(
      result.getFullYear(),
      result.getMonth() + 1,
      0
    ).getDate();

  result.setDate(
    Math.min(
      originalDay,
      lastDay
    )
  );

  return result;
}

/* =========================================================
   DEFAULT EXPORT
========================================================= */

const loanService = {
  calculateMonthlyPayment,
  calculateTotalRepayment,

  createLoanApplication,

  getUserLoans,
  getUserLoan,

  startLoanReview,
  approveLoan,
  rejectLoan,
  disburseLoan,

  processLoanRepayment,
  getLoanRepaymentSchedule,

  markOverdueRepayments,

  listLoanApplications,
  getLoanForAdmin,
};

export default loanService;
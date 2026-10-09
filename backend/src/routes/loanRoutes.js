import { Router } from "express";

import {
  applyForLoan,
  listMyLoans,
  getMyLoan,
  makeLoanRepayment,
  getRepaymentSchedule,
  listLoanRepayments,
  reviewLoanApplication,
  approveLoanApplication,
  rejectLoanApplication,
  disburseLoanApplication,
  listAllLoans,
  processOverdueLoanAccounts,
} from "../controllers/loanController.js";

import { requireStaff } from "../middleware/adminAuth.js";
import { financialRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/* =========================================================
   LOAN API RATE LIMITING
========================================================= */

router.use(financialRateLimiter);

/* =========================================================
   CUSTOMER LOANS
========================================================= */

router.post(
  "/",
  applyForLoan,
);

router.get(
  "/",
  listMyLoans,
);

router.get(
  "/:loanId",
  getMyLoan,
);

/* =========================================================
   LOAN REPAYMENTS
========================================================= */

router.post(
  "/:loanId/repay",
  makeLoanRepayment,
);

router.get(
  "/:loanId/repayments",
  listLoanRepayments,
);

router.get(
  "/:loanId/schedule",
  getRepaymentSchedule,
);

/* =========================================================
   STAFF / LOAN MANAGEMENT
========================================================= */

router.get(
  "/admin/all",
  requireStaff,
  listAllLoans,
);

router.post(
  "/admin/:loanId/review",
  requireStaff,
  reviewLoanApplication,
);

router.post(
  "/admin/:loanId/approve",
  requireStaff,
  approveLoanApplication,
);

router.post(
  "/admin/:loanId/reject",
  requireStaff,
  rejectLoanApplication,
);

router.post(
  "/admin/:loanId/disburse",
  requireStaff,
  disburseLoanApplication,
);

router.post(
  "/admin/process-overdue",
  requireStaff,
  processOverdueLoanAccounts,
);

export default router;

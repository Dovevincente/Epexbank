import { Router } from "express";

import {
  createSavings,
  listSavings,
  getSavingsProducts,
  getSavings,
  depositSavings,
  withdrawSavings,
  applyInterest,
  matureSavings,
  completeSavings,
  cancelSavings,
} from "../controllers/savingsController.js";

import {
  authenticate,
} from "../middleware/auth.js";

import {
  requireStaff,
} from "../middleware/adminAuth.js";

import {
  financialRateLimiter,
} from "../middleware/rateLimiter.js";

const router = Router();

/*
|--------------------------------------------------------------------------
| SAVINGS RATE LIMITING
|--------------------------------------------------------------------------
*/

router.use(financialRateLimiter);

/*
|--------------------------------------------------------------------------
| PUBLIC SAVINGS PRODUCTS
|--------------------------------------------------------------------------
|
| The frontend needs to be able to retrieve the available savings
| products before the customer creates an account.
|
| GET /api/savings/products
|
*/

router.get(
  "/products",
  getSavingsProducts,
);

/*
|--------------------------------------------------------------------------
| CUSTOMER AUTHENTICATION
|--------------------------------------------------------------------------
|
| Everything below this point operates on the authenticated user's
| savings accounts.
|
| The authenticate middleware reads the Epex Bank authentication
| cookies and attaches the authenticated user to req.user.
|
*/

router.use(authenticate);

/*
|--------------------------------------------------------------------------
| CUSTOMER SAVINGS
|--------------------------------------------------------------------------
*/

/*
 * Create a savings account
 *
 * POST /api/savings
 */
router.post(
  "/",
  createSavings,
);

/*
 * List authenticated customer's savings accounts
 *
 * GET /api/savings
 */
router.get(
  "/",
  listSavings,
);

/*
 * Get one authenticated customer's savings account
 *
 * GET /api/savings/:savingsId
 */
router.get(
  "/:savingsId",
  getSavings,
);

/*
 * Deposit into savings
 *
 * POST /api/savings/:savingsId/deposit
 */
router.post(
  "/:savingsId/deposit",
  depositSavings,
);

/*
 * Withdraw from savings
 *
 * POST /api/savings/:savingsId/withdraw
 */
router.post(
  "/:savingsId/withdraw",
  withdrawSavings,
);

/*
|--------------------------------------------------------------------------
| SAVINGS LIFECYCLE
|--------------------------------------------------------------------------
*/

/*
 * Complete a savings account
 *
 * POST /api/savings/:savingsId/complete
 */
router.post(
  "/:savingsId/complete",
  completeSavings,
);

/*
 * Cancel a savings account
 *
 * POST /api/savings/:savingsId/cancel
 */
router.post(
  "/:savingsId/cancel",
  cancelSavings,
);

/*
|--------------------------------------------------------------------------
| STAFF-ONLY SAVINGS OPERATIONS
|--------------------------------------------------------------------------
|
| These operations require both:
|
| 1. An authenticated user
| 2. Staff/admin authorization
|
*/

/*
 * Apply interest
 *
 * POST /api/savings/:savingsId/apply-interest
 */
router.post(
  "/:savingsId/apply-interest",
  requireStaff,
  applyInterest,
);

/*
 * Mature savings
 *
 * POST /api/savings/:savingsId/mature
 */
router.post(
  "/:savingsId/mature",
  requireStaff,
  matureSavings,
);

export default router;
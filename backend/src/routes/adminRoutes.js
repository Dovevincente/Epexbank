import express from "express";

import {
  getAdminStatistics,
  listCustomers,
  getCustomer,
  updateCustomerStatus,
  getCustomerAccounts,
  getCustomerAccount,
  updateAccountStatus,
  creditCustomerAccount,
  debitCustomerAccount,
  getCustomerTransactions,
  createCustomer,
  getAdminTransactions,
  updateAdminTransactionStatus,
  getAdminAuditLogs,
} from "../controllers/adminController.js";

import {
  listAdminKyc,
  getAdminKyc,
} from "../controllers/kycController.js";

import {
  getAdminInvestments,
  getAdminInvestmentDetails,
  reviewAdminInvestment,
  verifyAdminInvestment,
  rejectAdminInvestment,
  getAdminBtcPaymentConfig,
  updateAdminBtcPaymentConfig,
} from "../controllers/adminInvestmentController.js";

import {
  getComplianceSettings,
  updateComplianceSettings,
} from "../controllers/adminComplianceController.js";

import {
  listAllLoans,
} from "../controllers/loanController.js";

/*
|--------------------------------------------------------------------------
| ADMIN TRANSFERS
|--------------------------------------------------------------------------
*/

import {
  getAdminTransfers,
  getAdminTransfer,
  updateAdminTransferStatus,
} from "../controllers/adminTransferController.js";

import {
  authenticate,
  requireAdmin,
} from "../middleware/auth.js";

import {
  adminRateLimiter,
} from "../middleware/rateLimiter.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| ADMIN SECURITY
|--------------------------------------------------------------------------
*/

router.use(
  adminRateLimiter,
);

router.use(
  authenticate,
);

router.use(
  requireAdmin,
);

/*
|--------------------------------------------------------------------------
| SYSTEM SETTINGS
|--------------------------------------------------------------------------
|
| GET /api/admin/settings
|
*/

router.get(
  "/settings",
  async (req, res, next) => {
    try {
      return res.status(200).json({
        success: true,

        settings: {
          environment:
            process.env.NODE_ENV ||
            "development",

          apiStatus: "Running",

          databaseStatus:
            "Connected",

          realtimeStatus:
            "Running",

          maintenanceMode:
            false,

          registrationEnabled:
            true,

          transfersEnabled:
            true,

          withdrawalsEnabled:
            true,

          depositsEnabled:
            true,

          kycRequired:
            true,

          version:
            process.env.APP_VERSION ||
            "1.0.0",

          apiVersion:
            process.env.API_VERSION ||
            "v1",

          timezone:
            process.env.TZ ||
            "UTC",

          currency:
            process.env.DEFAULT_CURRENCY ||
            "USD",

          lastUpdated:
            new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

/*
|--------------------------------------------------------------------------
| TRANSFER COMPLIANCE & DEBIT ALERT SETTINGS
|--------------------------------------------------------------------------
|
| GET:
|   /api/admin/compliance/settings
|
| PUT:
|   /api/admin/compliance/settings
|
*/

router.get(
  "/compliance/settings",
  getComplianceSettings,
);

router.put(
  "/compliance/settings",
  updateComplianceSettings,
);

/*
|--------------------------------------------------------------------------
| ADMIN DASHBOARD
|--------------------------------------------------------------------------
*/

router.get(
  "/statistics",
  getAdminStatistics,
);

/*
|--------------------------------------------------------------------------
| KYC
|--------------------------------------------------------------------------
*/

router.get(
  "/kyc",
  listAdminKyc,
);

router.get(
  "/kyc/:kycId",
  getAdminKyc,
);

/*
|--------------------------------------------------------------------------
| CUSTOMER MANAGEMENT
|--------------------------------------------------------------------------
*/

router.get(
  "/customers",
  listCustomers,
);

router.post(
  "/customers",
  createCustomer,
);

router.get(
  "/customers/:userId",
  getCustomer,
);

router.patch(
  "/customers/:userId/status",
  updateCustomerStatus,
);

/*
|--------------------------------------------------------------------------
| CUSTOMER ACCOUNTS
|--------------------------------------------------------------------------
*/

router.get(
  "/customers/:userId/accounts",
  getCustomerAccounts,
);

router.get(
  "/customers/:userId/accounts/:accountId",
  getCustomerAccount,
);

router.patch(
  "/customers/:userId/accounts/:accountId/status",
  updateAccountStatus,
);

/*
|--------------------------------------------------------------------------
| ACCOUNT FINANCIAL OPERATIONS
|--------------------------------------------------------------------------
*/

router.post(
  "/customers/:userId/accounts/:accountId/credit",
  creditCustomerAccount,
);

router.post(
  "/customers/:userId/accounts/:accountId/debit",
  debitCustomerAccount,
);

/*
|--------------------------------------------------------------------------
| CUSTOMER TRANSACTIONS
|--------------------------------------------------------------------------
*/

router.get(
  "/customers/:userId/transactions",
  getCustomerTransactions,
);

/*
|--------------------------------------------------------------------------
| GLOBAL ADMIN TRANSACTIONS
|--------------------------------------------------------------------------
*/

router.get(
  "/transactions",
  getAdminTransactions,
);

router.patch(
  "/transactions/:transactionId/status",
  updateAdminTransactionStatus,
);

/*
|--------------------------------------------------------------------------
| ADMIN TRANSFERS
|--------------------------------------------------------------------------
|
| GET:
|   /api/admin/transfers
|
| GET:
|   /api/admin/transfers/:transferId
|
| PATCH:
|   /api/admin/transfers/:transferId/status
|
| IMPORTANT:
| These routes must be registered before any future
| generic /:transferId routes.
|
|--------------------------------------------------------------------------
*/

router.get(
  "/transfers",
  getAdminTransfers,
);

router.get(
  "/transfers/:transferId",
  getAdminTransfer,
);

router.patch(
  "/transfers/:transferId/status",
  updateAdminTransferStatus,
);

/*
|--------------------------------------------------------------------------
| ADMIN LOANS
|--------------------------------------------------------------------------
|
| GET:
|   /api/admin/loans
|
*/

router.get(
  "/loans",
  listAllLoans,
);

/*
|--------------------------------------------------------------------------
| INVESTMENTS
|--------------------------------------------------------------------------
|
| GET:
|   /api/admin/investments
|   /api/admin/investments/:investmentId
|
| REVIEW:
|   PATCH /api/admin/investments/:investmentId/review
|
| VERIFY:
|   POST /api/admin/investments/:investmentId/verify
|
| REJECT:
|   POST /api/admin/investments/:investmentId/reject
|
|--------------------------------------------------------------------------
*/

/*
 * BTC configuration routes must come BEFORE
 * /:investmentId so "btc" is not interpreted
 * as an investment ID.
 */

router.get(
  "/investments/btc/payment-config",
  getAdminBtcPaymentConfig,
);

router.put(
  "/investments/btc/payment-config",
  updateAdminBtcPaymentConfig,
);

router.get(
  "/investments",
  getAdminInvestments,
);

router.get(
  "/investments/:investmentId",
  getAdminInvestmentDetails,
);

router.patch(
  "/investments/:investmentId/review",
  reviewAdminInvestment,
);

router.post(
  "/investments/:investmentId/verify",
  verifyAdminInvestment,
);

router.post(
  "/investments/:investmentId/reject",
  rejectAdminInvestment,
);

/*
|--------------------------------------------------------------------------
| AUDIT LOGS
|--------------------------------------------------------------------------
*/

router.get(
  "/audit-logs",
  getAdminAuditLogs,
);

export default router;
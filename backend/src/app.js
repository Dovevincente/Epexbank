import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

/*
 * ============================================================
 * ROUTES
 * ============================================================
 */

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import beneficiaryRoutes from "./routes/beneficiaryRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import savingsRoutes from "./routes/savingsRoutes.js";
import kycRoutes from "./routes/kycRoutes.js";
import investmentRoutes from "./routes/investmentRoutes.js";
import cardRoutes from "./routes/cardRoutes.js";

import transactionRoutes, {
  accountTransactionRouter,
} from "./routes/transactionRoutes.js";

import transferRoutes from "./routes/transferRoutes.js";

import bankTransferRoutes from "./routes/bankTransferRoutes.js";
import bankTransferProcessingRoutes from "./routes/bankTransferProcessingRoutes.js";
import bankTransferDetailsRoutes from "./routes/bankTransferDetailsRoutes.js";

/*
 * ============================================================
 * ADMIN
 * ============================================================
 */

import adminRoutes from "./routes/adminRoutes.js";

/*
 * ============================================================
 * MIDDLEWARE
 * ============================================================
 */

import notFound from "./middleware/notFound.js";
import {
  errorHandler,
} from "./middleware/errorHandler.js";

import env from "./config/env.js";

/*
 * ============================================================
 * APP INITIALIZATION
 * ============================================================
 */

const app = express();

/*
 * ============================================================
 * FILE PATHS
 * ============================================================
 *
 * backend/
 * ├── src/
 * │   └── app.js
 * └── uploads/
 *
 * This exposes:
 *
 * /uploads/...
 *
 * as publicly accessible static files.
 *
 * Example:
 *
 * /uploads/investment-payments/example.jpg
 *
 * ============================================================
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDirectory = path.join(
  __dirname,
  "../uploads",
);

app.use(
  "/uploads",
  express.static(uploadsDirectory),
);

/*
 * ============================================================
 * SECURITY HEADERS
 * ============================================================
 */

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  }),
);

/*
 * ============================================================
 * CORS
 * ============================================================
 */

const allowedOrigins = new Set([
  "http://localhost:5173",
  "https://epexbank.vercel.app",
  ...(env.frontendUrl || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);

/*
 * ============================================================
 * REQUEST BODY PARSING
 * ============================================================
 */

app.use(
  express.json({
    limit: "2mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "2mb",
  }),
);

/*
 * ============================================================
 * COOKIES
 * ============================================================
 */

app.use(cookieParser());

/*
 * ============================================================
 * HTTP REQUEST LOGGING
 * ============================================================
 */

if (env.nodeEnv === "development") {
  app.use(
    morgan("dev"),
  );
}

/*
 * ============================================================
 * GLOBAL API RATE LIMIT
 * ============================================================
 */

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: "draft-7",
  legacyHeaders: false,

  message: {
    success: false,
    message:
      "Too many requests. Please try again later.",
  },
});

app.use(
  "/api",
  apiLimiter,
);

/*
 * ============================================================
 * ROOT
 * ============================================================
 */

app.get(
  "/",
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Welcome to Epex Bank API",
      version: "1.0.0",
      environment: env.nodeEnv,
    });
  },
);

/*
 * ============================================================
 * HEALTH CHECK
 * ============================================================
 *
 * Both endpoints are supported:
 *
 * GET /health
 * GET /api/health
 *
 * Keeping both makes deployment and monitoring easier.
 */

const healthHandler = (
  req,
  res,
) => {
  return res.status(200).json({
    success: true,
    service: "Epex Bank API",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
};

app.get(
  "/health",
  healthHandler,
);

app.get(
  "/api/health",
  healthHandler,
);

/*
 * ============================================================
 * AUTHENTICATION
 * ============================================================
 */

app.use(
  "/api/auth",
  authRoutes,
);

/*
 * ============================================================
 * USERS
 * ============================================================
 */

app.use(
  "/api/users",
  userRoutes,
);

/*
 * ============================================================
 * ACCOUNTS
 * ============================================================
 */

app.use(
  "/api/accounts",
  accountRoutes,
);
app.use(
  "/api/cards",
  cardRoutes,
);


/*
 * ============================================================
 * BENEFICIARIES
 * ============================================================
 */

app.use(
  "/api/beneficiaries",
  beneficiaryRoutes,
);

/*
 * ============================================================
 * WALLETS
 * ============================================================
 */

app.use(
  "/api/wallets",
  walletRoutes,
);

/*
 * ============================================================
 * TRANSACTIONS
 * ============================================================
 */

app.use(
  "/api/transactions",
  transactionRoutes,
);

app.use(
  "/api/accounts",
  accountTransactionRouter,
);

/*
 * ============================================================
 * INTERNAL TRANSFERS
 * ============================================================
 *
 * Examples:
 *
 * POST /api/transfers/internal
 * GET  /api/transfers
 * GET  /api/transfers/:transferId
 */

app.use(
  "/api/transfers",
  transferRoutes,
);

/*
 * ============================================================
 * CUSTOMER BANK TRANSFERS
 * ============================================================
 *
 * Examples:
 *
 * GET  /api/bank-transfers
 * POST /api/bank-transfers
 */

app.use(
  "/api/bank-transfers",
  bankTransferRoutes,
);

/*
 * ============================================================
 * CUSTOMER BANK TRANSFER DETAILS
 * ============================================================
 *
 * Example:
 *
 * GET /api/bank-transfers/:transferId
 *
 * This must be mounted BEFORE the admin processing router.
 * Customer requests must not pass through requireAdmin.
 */

app.use(
  "/api/bank-transfers",
  bankTransferDetailsRoutes,
);

/*
 * ============================================================
 * SAVINGS
 * ============================================================
 *
 * Customer savings:
 *
 * GET  /api/savings
 * POST /api/savings
 * GET  /api/savings/:savingsId
 * POST /api/savings/:savingsId/deposit
 * POST /api/savings/:savingsId/withdraw
 *
 * Staff operations:
 *
 * POST /api/savings/:savingsId/apply-interest
 * POST /api/savings/:savingsId/mature
 */

app.use(
  "/api/savings",
  savingsRoutes,
);

/*
 * ============================================================
 * KYC / IDENTITY VERIFICATION
 * ============================================================
 *
 * Customer:
 *
 * GET  /api/kyc/me
 * POST /api/kyc
 * POST /api/kyc/resubmit
 *
 * Staff:
 *
 * POST /api/kyc/:kycId/review
 * POST /api/kyc/:kycId/approve
 * POST /api/kyc/:kycId/reject
 */

app.use(
  "/api/kyc",
  kycRoutes,
);

/*
 * ============================================================
 * INVESTMENTS
 * ============================================================
 *
 * Customer:
 *
 * GET  /api/investments/account
 * GET  /api/investments/products
 * GET  /api/investments/products/:productId
 * POST /api/investments/orders/buy
 * POST /api/investments/orders/sell
 * GET  /api/investments/orders
 * GET  /api/investments/orders/:orderId
 * GET  /api/investments/portfolio
 *
 * Fixed-term investment:
 *
 * GET  /api/investments/plans
 * GET  /api/investments/btc/payment-config
 * POST /api/investments/fixed
 * POST /api/investments/fixed/:investmentId/payment
 *
 * Staff:
 *
 * POST  /api/investments/products
 * PATCH /api/investments/products/:productId
 * PATCH /api/investments/products/:productId/status
 */

app.use(
  "/api/investments",
  investmentRoutes,
);

/*
 * ============================================================
 * ADMIN BANK TRANSFER PROCESSING
 * ============================================================
 *
 * Examples:
 *
 * PATCH /api/bank-transfers/:transferId/process
 * PATCH /api/bank-transfers/:transferId/complete
 * PATCH /api/bank-transfers/:transferId/fail
 * PATCH /api/bank-transfers/:transferId/cancel
 */

app.use(
  "/api/bank-transfers",
  bankTransferProcessingRoutes,
);

/*
 * ============================================================
 * ADMIN
 * ============================================================
 *
 * All admin endpoints are protected by the admin router's
 * authentication/authorization middleware.
 *
 * Examples:
 *
 * GET  /api/admin/statistics
 * GET  /api/admin/customers
 * POST /api/admin/customers
 * GET  /api/admin/customers/:customerId
 * GET  /api/admin/customers/:customerId/accounts
 * POST /api/admin/customers/:customerId/accounts/:accountId/credit
 * POST /api/admin/customers/:customerId/accounts/:accountId/debit
 */

app.use(
  "/api/admin",
  adminRoutes,
);

/*
 * ============================================================
 * 404 HANDLER
 * ============================================================
 */

app.use(
  notFound,
);

/*
 * ============================================================
 * GLOBAL ERROR HANDLER
 * ============================================================
 */

app.use(
  errorHandler,
);

/*
 * ============================================================
 * EXPORT
 * ============================================================
 */

export default app;



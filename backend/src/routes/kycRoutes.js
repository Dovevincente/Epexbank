import { Router } from "express";

import {
  getMyKyc,
  uploadKycFile,
  submitKycRequest,
  resubmitKycRequest,
  reviewKycRequest,
  approveKycRequest,
  verifyTaxCodeRequest,
  verifyAmlCodeRequest,
  verifyCftCodeRequest,
  rejectKycRequest,
} from "../controllers/kycController.js";

import { authenticate } from "../middleware/auth.js";

import { requireStaff } from "../middleware/adminAuth.js";

import { generalRateLimiter } from "../middleware/rateLimiter.js";

const router = Router();

/* =========================================================
   KYC API RATE LIMITING
========================================================= */

router.use(generalRateLimiter);

/* =========================================================
   AUTHENTICATION
========================================================= */

router.use(authenticate);

/* =========================================================
   CUSTOMER KYC
========================================================= */

router.get(
  "/me",
  getMyKyc,
);

router.post(
  "/upload",
  uploadKycFile,
);

router.post(
  "/",
  submitKycRequest,
);

router.post(
  "/resubmit",
  resubmitKycRequest,
);

/* =========================================================
   COMPLIANCE / STAFF KYC REVIEW
========================================================= */

router.post(
  "/:kycId/review",
  requireStaff,
  reviewKycRequest,
);

router.post(
  "/:kycId/approve",
  requireStaff,
  approveKycRequest,
);

/*
|--------------------------------------------------------------------------
| TIN / TAX CODE VERIFICATION
|--------------------------------------------------------------------------
|
| Only authorized staff can verify a customer's
| Tax Identification Number.
|
| This is intentionally separate from KYC approval.
|
*/

router.post(
  "/:kycId/verify-tax-code",
  requireStaff,
  verifyTaxCodeRequest,
);

/*
|--------------------------------------------------------------------------
| AML CODE VERIFICATION
|--------------------------------------------------------------------------
|
| Only authorized staff can verify a customer's
| Anti-Money Laundering compliance code.
|
*/

router.post(
  "/:kycId/verify-aml-code",
  requireStaff,
  verifyAmlCodeRequest,
);

/*
|--------------------------------------------------------------------------
| CFT CODE VERIFICATION
|--------------------------------------------------------------------------
|
| Only authorized staff can verify a customer's
| Counter-Financing of Terrorism compliance code.
|
*/

router.post(
  "/:kycId/verify-cft-code",
  requireStaff,
  verifyCftCodeRequest,
);

/*
|--------------------------------------------------------------------------
| REJECT KYC
|--------------------------------------------------------------------------
*/

router.post(
  "/:kycId/reject",
  requireStaff,
  rejectKycRequest,
);

export default router;
import { Router } from "express";

import {
  createNewBeneficiary,
  getBeneficiary,
  listBeneficiaries,
  removeBeneficiary,
  restoreBeneficiary,
  updateExistingBeneficiary,
} from "../controllers/beneficiaryController.js";

import { authenticate } from "../middleware/auth.js";

const router = Router();

/*
 * All beneficiary operations require
 * an authenticated Epex Bank customer.
 */
router.use(authenticate);

/*
 * GET /api/beneficiaries
 *
 * Returns the authenticated customer's
 * active beneficiaries.
 *
 * Optional:
 * ?includeInactive=true
 */
router.get(
  "/",
  listBeneficiaries,
);

/*
 * POST /api/beneficiaries
 *
 * Creates a new beneficiary owned by
 * the authenticated customer.
 */
router.post(
  "/",
  createNewBeneficiary,
);

/*
 * GET /api/beneficiaries/:beneficiaryId
 *
 * Returns one beneficiary belonging to
 * the authenticated customer.
 */
router.get(
  "/:beneficiaryId",
  getBeneficiary,
);

/*
 * PATCH /api/beneficiaries/:beneficiaryId
 *
 * Updates an existing beneficiary.
 */
router.patch(
  "/:beneficiaryId",
  updateExistingBeneficiary,
);

/*
 * PATCH /api/beneficiaries/:beneficiaryId/activate
 *
 * Reactivates a previously deactivated
 * beneficiary.
 */
router.patch(
  "/:beneficiaryId/activate",
  restoreBeneficiary,
);

/*
 * DELETE /api/beneficiaries/:beneficiaryId
 *
 * Deactivates the beneficiary.
 *
 * We intentionally use a soft delete because
 * existing transfer records may reference
 * this beneficiary.
 */
router.delete(
  "/:beneficiaryId",
  removeBeneficiary,
);

export default router;

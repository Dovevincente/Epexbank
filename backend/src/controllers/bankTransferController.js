import {
  createBankTransfer,
  listBankTransfers,
  verifyTransferComplianceCode,
} from "../services/bankTransferService.js";


/*
 * ============================================================
 * CREATE BANK TRANSFER
 * ============================================================
 */

export const createExternalBankTransfer =
  async (req, res, next) => {
    try {
      const {
        accountId,
        beneficiaryId,
        amount,
        tinCode,
        amlCode,
        cftCode,
        description,
      } = req.body || {};

      const idempotencyKey =
        req.get("Idempotency-Key") ||
        req.body?.idempotencyKey ||
        null;

      const result =
        await createBankTransfer({
          userId: req.user.id,

          accountId,

          beneficiaryId,

          amount,

          tinCode,

          amlCode,

          cftCode,

          description,

          idempotencyKey,
        });

      return res
        .status(
          result.alreadyExists
            ? 200
            : 201,
        )
        .json({
          success: true,

          message:
            result.alreadyExists
              ? "Existing bank transfer returned"
              : "Bank transfer created and queued for processing",

          data: {
            transfer: result,
          },
        });
    } catch (error) {
      next(error);
    }
  };


/*
 * ============================================================
 * VERIFY ONE COMPLIANCE CODE
 * ============================================================
 *
 * POST
 * /api/bank-transfers/compliance/verify
 *
 * Body:
 *
 * {
 *   "codeType": "TIN",
 *   "code": "123456789"
 * }
 *
 * Then:
 *
 * {
 *   "codeType": "AML",
 *   "code": "AML123456"
 * }
 *
 * Then:
 *
 * {
 *   "codeType": "CFT",
 *   "code": "CFT123456"
 * }
 *
 * The endpoint verifies only ONE code per request.
 * ============================================================
 */

export const verifyBankTransferCompliance =
  async (req, res, next) => {
    try {
      const {
        codeType,
        code,
      } = req.body || {};

      const result =
        await verifyTransferComplianceCode({
          userId: req.user.id,

          codeType,

          code,
        });

      return res.status(200).json({
        success: true,

        message:
          result.message,

        data: result,
      });
    } catch (error) {
      next(error);
    }
  };


/*
 * ============================================================
 * LIST CUSTOMER BANK TRANSFERS
 * ============================================================
 */

export const listBankTransfersController =
  async (req, res, next) => {
    try {
      const {
        status,
        page,
        limit,
      } = req.query;

      const result =
        await listBankTransfers({
          userId: req.user.id,

          status,

          page,

          limit,
        });

      return res
        .status(200)
        .json({
          success: true,

          data: result,
        });
    } catch (error) {
      next(error);
    }
  };
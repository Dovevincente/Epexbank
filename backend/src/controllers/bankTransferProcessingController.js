import {
  markBankTransferProcessing,
  completeBankTransfer,
  failBankTransfer,
  cancelBankTransfer,
} from "../services/bankTransferProcessingService.js";

/*
 * ============================================================
 * MOVE TRANSFER TO PROCESSING
 * ============================================================
 */

export const processBankTransfer =
  async (req, res, next) => {
    try {
      const {
        transferId,
      } = req.params;

      const transfer =
        await markBankTransferProcessing({
          transferId,

          adminId:
            req.user.id,

          ipAddress:
            req.ip,
        });

      return res.status(200).json({
        success: true,

        message:
          "Bank transfer moved to processing",

        data: {
          transfer,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * ============================================================
 * COMPLETE TRANSFER
 * ============================================================
 */

export const completeBankTransferRequest =
  async (req, res, next) => {
    try {
      const {
        transferId,
      } = req.params;

      const {
        externalReference,
      } = req.body;

      const transfer =
        await completeBankTransfer({
          transferId,

          adminId:
            req.user.id,

          ipAddress:
            req.ip,

          externalReference,
        });

      return res.status(200).json({
        success: true,

        message:
          "Bank transfer completed",

        data: {
          transfer,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * ============================================================
 * FAIL TRANSFER
 * ============================================================
 */

export const failBankTransferRequest =
  async (req, res, next) => {
    try {
      const {
        transferId,
      } = req.params;

      const {
        reason,
      } = req.body;

      const transfer =
        await failBankTransfer({
          transferId,

          reason,

          adminId:
            req.user.id,

          ipAddress:
            req.ip,
        });

      return res.status(200).json({
        success: true,

        message:
          "Bank transfer failed and funds were restored",

        data: {
          transfer,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
 * ============================================================
 * CANCEL TRANSFER
 * ============================================================
 */

export const cancelBankTransferRequest =
  async (req, res, next) => {
    try {
      const {
        transferId,
      } = req.params;

      const {
        reason,
      } = req.body;

      const transfer =
        await cancelBankTransfer({
          transferId,

          reason,

          adminId:
            req.user.id,

          ipAddress:
            req.ip,
        });

      return res.status(200).json({
        success: true,

        message:
          "Bank transfer cancelled and funds were restored",

        data: {
          transfer,
        },
      });
    } catch (error) {
      next(error);
    }
  };
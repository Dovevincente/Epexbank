import {
  getUserBankTransferById,
} from "../services/bankTransferDetailsService.js";

/*
 * ============================================================
 * GET CUSTOMER BANK TRANSFER DETAILS
 * ============================================================
 */

export const getBankTransferDetails =
  async (req, res, next) => {
    try {
      const {
        transferId,
      } = req.params;

      const result =
        await getUserBankTransferById({
          userId:
            req.user.id,

          transferId,
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
import {
  createInternalTransfer,
  getUserTransfers,
  getUserTransferById,
} from "../services/transferService.js";

export const createTransfer = async (
  req,
  res,
  next,
) => {
  try {
    const {
      receiverAccountNumber,
      amount,
      description,
    } = req.body;

    /*
     * The idempotency key can be supplied by the
     * client through the HTTP header.
     */
    const idempotencyKey =
      req.get("Idempotency-Key") ||
      req.body.idempotencyKey ||
      null;

    /*
     * We intentionally derive the sender account from
     * the authenticated user rather than trusting a
     * sender user ID supplied by React.
     */
    const result =
      await createInternalTransfer({
        userId: req.user.id,

        senderAccountNumber:
          req.body.senderAccountNumber,

        receiverAccountNumber,

        amount,

        description,

        idempotencyKey,
      });

    return res
      .status(
        result.alreadyProcessed
          ? 200
          : 201,
      )
      .json({
        success: true,

        data: {
          transfer:
            result.transfer,

          alreadyProcessed:
            result.alreadyProcessed,
        },
      });
  } catch (error) {
    next(error);
  }
};

export const listTransfers = async (
  req,
  res,
  next,
) => {
  try {
    const {
      status,
      limit,
      cursor,
    } = req.query;

    const result =
      await getUserTransfers({
        userId: req.user.id,
        status,
        limit,
        cursor,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getTransfer = async (
  req,
  res,
  next,
) => {
  try {
    const transfer =
      await getUserTransferById({
        userId: req.user.id,
        transferId:
          req.params.transferId,
      });

    return res.status(200).json({
      success: true,
      data: {
        transfer,
      },
    });
  } catch (error) {
    next(error);
  }
};
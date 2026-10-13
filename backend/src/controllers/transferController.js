import {
  createInternalTransfer,
  createInternationalTransfer,
  getUserTransfers,
  getUserTransferById,
} from "../services/transferService.js";

export const createTransfer = async (req, res, next) => {
  try {
    const {
      receiverAccountNumber,
      amount,
      description,
    } = req.body;

    const idempotencyKey =
      req.get("Idempotency-Key") ||
      req.body.idempotencyKey ||
      null;

    const result = await createInternalTransfer({
      userId: req.user.id,
      senderAccountNumber: req.body.senderAccountNumber,
      receiverAccountNumber,
      amount,
      description,
      idempotencyKey,
    });

    return res
      .status(result.alreadyProcessed ? 200 : 201)
      .json({
        success: true,
        data: {
          transfer: result.transfer,
          alreadyProcessed: result.alreadyProcessed,
        },
      });
  } catch (error) {
    next(error);
  }
};

export const createInternationalTransferController = async (
  req,
  res,
  next,
) => {
  try {
    const idempotencyKey =
      req.get("Idempotency-Key") ||
      req.body.idempotencyKey ||
      null;

    const result = await createInternationalTransfer({
      userId: req.user.id,
      ...req.body,
      idempotencyKey,
    });

    return res
      .status(result.alreadyProcessed ? 200 : 201)
      .json({
        success: true,
        message: result.alreadyProcessed
          ? "This international transfer was already submitted."
          : "International transfer submitted and awaiting approval.",
        data: {
          transfer: result.transfer,
          alreadyProcessed: result.alreadyProcessed,
        },
      });
  } catch (error) {
    next(error);
  }
};

export const listTransfers = async (req, res, next) => {
  try {
    const { status, limit, cursor } = req.query;

    const result = await getUserTransfers({
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

export const getTransfer = async (req, res, next) => {
  try {
    const transfer = await getUserTransferById({
      userId: req.user.id,
      transferId: req.params.transferId,
    });

    return res.status(200).json({
      success: true,
      data: { transfer },
    });
  } catch (error) {
    next(error);
  }
};
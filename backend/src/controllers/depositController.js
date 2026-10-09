import {
  createDeposit,
  getUserDeposits,
  getUserDepositById,
  cancelDeposit,
} from "../services/depositService.js";

const getUserId = (req) => {
  if (!req.user?.id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  return req.user.id;
};

const getRequestIp = (req) => {
  return (
    req.ip ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    null
  );
};

const getDepositId = (req) => {
  const depositId = String(
    req.params.depositId || "",
  ).trim();

  if (!depositId) {
    const error = new Error("Deposit ID is required");
    error.statusCode = 400;
    throw error;
  }

  return depositId;
};

export const createDepositRequest = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const ipAddress = getRequestIp(req);

    const {
      amount,
      currencyCode,
      method,
      source,
      description,
      metadata,
    } = req.body || {};

    if (
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Deposit amount is required",
      });
    }

    if (!currencyCode) {
      return res.status(400).json({
        success: false,
        message: "Currency code is required",
      });
    }

    if (!method) {
      return res.status(400).json({
        success: false,
        message: "Deposit method is required",
      });
    }

    const deposit = await createDeposit({
      userId,
      amount,
      currencyCode,
      method,
      source,
      description,
      metadata,
      ipAddress,
    });

    return res.status(201).json({
      success: true,
      message: "Deposit request created successfully",
      data: deposit,
    });
  } catch (error) {
    return next(error);
  }
};

export const listDeposits = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const deposits = await getUserDeposits(
      userId,
      req.query || {},
    );

    return res.status(200).json({
      success: true,
      data: deposits,
    });
  } catch (error) {
    return next(error);
  }
};

export const getDeposit = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const depositId = getDepositId(req);

    const deposit = await getUserDepositById(
      userId,
      depositId,
    );

    return res.status(200).json({
      success: true,
      data: deposit,
    });
  } catch (error) {
    return next(error);
  }
};

export const cancelDepositRequest = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const depositId = getDepositId(req);
    const ipAddress = getRequestIp(req);

    const deposit = await cancelDeposit({
      userId,
      depositId,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Deposit cancelled successfully",
      data: deposit,
    });
  } catch (error) {
    return next(error);
  }
};

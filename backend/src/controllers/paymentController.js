import {
  createPayment,
  getUserPayments,
  getUserPaymentById,
  cancelPayment,
} from "../services/paymentService.js";

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

const getPaymentId = (req) => {
  const paymentId = String(
    req.params?.paymentId || "",
  ).trim();

  if (!paymentId) {
    const error = new Error("Payment ID is required");
    error.statusCode = 400;
    throw error;
  }

  return paymentId;
};

export const createPaymentRequest = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const ipAddress = getRequestIp(req);

    const {
      amount,
      fee,
      currencyCode,
      merchantName,
      merchantId,
      description,
      externalReference,
      metadata,
      idempotencyKey,
    } = req.body || {};

    if (
      amount === undefined ||
      amount === null ||
      amount === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment amount is required",
      });
    }

    if (!currencyCode) {
      return res.status(400).json({
        success: false,
        message: "Currency code is required",
      });
    }

    if (!merchantName && !merchantId) {
      return res.status(400).json({
        success: false,
        message:
          "Merchant name or merchant ID is required",
      });
    }

    const payment = await createPayment({
      userId,
      amount,
      fee,
      currencyCode,
      merchantName,
      merchantId,
      description,
      externalReference,
      metadata,
      idempotencyKey,
      ipAddress,
    });

    return res.status(201).json({
      success: true,
      message: "Payment created successfully",
      data: payment,
    });
  } catch (error) {
    return next(error);
  }
};

export const listPayments = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const payments = await getUserPayments(
      userId,
      req.query || {},
    );

    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    return next(error);
  }
};

export const getPayment = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const paymentId = getPaymentId(req);

    const payment = await getUserPaymentById(
      userId,
      paymentId,
    );

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    return next(error);
  }
};

export const cancelPaymentRequest = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const paymentId = getPaymentId(req);
    const ipAddress = getRequestIp(req);

    const payment = await cancelPayment({
      userId,
      paymentId,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Payment cancelled successfully",
      data: payment,
    });
  } catch (error) {
    return next(error);
  }
};

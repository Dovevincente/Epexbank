import {
  getShares,
  getShareById,
  createBuyOrder,
  createSellOrder,
  getUserShareOrders,
  getUserShareOrderById,
  getShareDividends,
  createShare,
  updateSharePrice,
  setShareStatus,
} from "../services/shareService.js";

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

const getId = (req, name) => {
  const value = String(
    req.params?.[name] || "",
  ).trim();

  if (!value) {
    const error = new Error(`${name} is required`);
    error.statusCode = 400;
    throw error;
  }

  return value;
};

export const listShares = async (
  req,
  res,
  next,
) => {
  try {
    const shares = await getShares(
      req.query || {},
    );

    return res.status(200).json({
      success: true,
      data: shares,
    });
  } catch (error) {
    return next(error);
  }
};

export const getShare = async (
  req,
  res,
  next,
) => {
  try {
    const shareId = getId(req, "shareId");

    const share = await getShareById(shareId);

    return res.status(200).json({
      success: true,
      data: share,
    });
  } catch (error) {
    return next(error);
  }
};

export const buyShares = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const ipAddress = getRequestIp(req);

    const {
      shareId,
      quantity,
      price,
      idempotencyKey,
    } = req.body || {};

    if (!shareId) {
      return res.status(400).json({
        success: false,
        message: "Share is required",
      });
    }

    if (
      quantity === undefined ||
      quantity === null ||
      quantity === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Share quantity is required",
      });
    }

    if (
      price === undefined ||
      price === null ||
      price === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Share price is required",
      });
    }

    const order = await createBuyOrder({
      userId,
      shareId,
      quantity,
      price,
      idempotencyKey,
      ipAddress,
    });

    return res.status(201).json({
      success: true,
      message: "Share buy order created successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

export const sellShares = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const ipAddress = getRequestIp(req);

    const {
      shareId,
      quantity,
      price,
      idempotencyKey,
    } = req.body || {};

    if (!shareId) {
      return res.status(400).json({
        success: false,
        message: "Share is required",
      });
    }

    if (
      quantity === undefined ||
      quantity === null ||
      quantity === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Share quantity is required",
      });
    }

    if (
      price === undefined ||
      price === null ||
      price === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Share price is required",
      });
    }

    const order = await createSellOrder({
      userId,
      shareId,
      quantity,
      price,
      idempotencyKey,
      ipAddress,
    });

    return res.status(201).json({
      success: true,
      message: "Share sell order created successfully",
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

export const listShareOrders = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const orders = await getUserShareOrders(
      userId,
      req.query || {},
    );

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    return next(error);
  }
};

export const getShareOrder = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);
    const orderId = getId(req, "orderId");

    const order =
      await getUserShareOrderById(
        userId,
        orderId,
      );

    return res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    return next(error);
  }
};

export const listShareDividends = async (
  req,
  res,
  next,
) => {
  try {
    const shareId = getId(req, "shareId");

    const dividends =
      await getShareDividends(
        shareId,
        req.query || {},
      );

    return res.status(200).json({
      success: true,
      data: dividends,
    });
  } catch (error) {
    return next(error);
  }
};

export const createShareProduct = async (
  req,
  res,
  next,
) => {
  try {
    const adminId = getUserId(req);
    const ipAddress = getRequestIp(req);

    const {
      symbol,
      companyName,
      description,
      currentPrice,
      currencyCode,
      totalShares,
      availableShares,
      isActive,
    } = req.body || {};

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Share symbol is required",
      });
    }

    if (!companyName) {
      return res.status(400).json({
        success: false,
        message: "Company name is required",
      });
    }

    if (
      currentPrice === undefined ||
      currentPrice === null ||
      currentPrice === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Current share price is required",
      });
    }

    if (!currencyCode) {
      return res.status(400).json({
        success: false,
        message: "Currency code is required",
      });
    }

    if (
      totalShares === undefined ||
      totalShares === null ||
      totalShares === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Total shares are required",
      });
    }

    if (
      availableShares === undefined ||
      availableShares === null ||
      availableShares === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Available shares are required",
      });
    }

    const share = await createShare({
      adminId,
      symbol,
      companyName,
      description,
      currentPrice,
      currencyCode,
      totalShares,
      availableShares,
      isActive,
      ipAddress,
    });

    return res.status(201).json({
      success: true,
      message: "Share created successfully",
      data: share,
    });
  } catch (error) {
    return next(error);
  }
};

export const updatePrice = async (
  req,
  res,
  next,
) => {
  try {
    const adminId = getUserId(req);
    const shareId = getId(req, "shareId");
    const ipAddress = getRequestIp(req);

    const { currentPrice } = req.body || {};

    if (
      currentPrice === undefined ||
      currentPrice === null ||
      currentPrice === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "Current share price is required",
      });
    }

    const share = await updateSharePrice({
      adminId,
      shareId,
      currentPrice,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: "Share price updated successfully",
      data: share,
    });
  } catch (error) {
    return next(error);
  }
};

export const updateStatus = async (
  req,
  res,
  next,
) => {
  try {
    const adminId = getUserId(req);
    const shareId = getId(req, "shareId");
    const ipAddress = getRequestIp(req);

    const { isActive } = req.body || {};

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean",
      });
    }

    const share = await setShareStatus({
      adminId,
      shareId,
      isActive,
      ipAddress,
    });

    return res.status(200).json({
      success: true,
      message: `Share ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      data: share,
    });
  } catch (error) {
    return next(error);
  }
};

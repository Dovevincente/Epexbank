import fs from "fs";

import {
  getOrCreateInvestmentAccount,
  getInvestmentAccount as getInvestmentAccountService,

  listInvestmentProducts as listInvestmentProductsService,
  getInvestmentProduct as getInvestmentProductService,

  createBuyOrder,
  createSellOrder,

  getUserInvestmentOrders,
  getUserInvestmentOrder,

  refreshInvestmentPortfolio,

  getInvestmentPlans,
  getInvestmentPlan as getInvestmentPlanService,
  getBitcoinPaymentConfig,

  createBtcInvestment,
  getUserInvestment,
  getUserInvestments,
  submitBtcInvestmentPayment,
} from "../services/investmentService.js";

/* =========================================================
   HELPERS
========================================================= */

const getUserId = (req) => {
  const userId =
    req?.user?.id ||
    req?.user?.userId;

  if (!userId || typeof userId !== "string") {
    const error = new Error(
      "Authenticated user ID is required.",
    );

    error.statusCode = 401;

    throw error;
  }

  return userId;
};

const getPagination = (req) => {
  const page = Math.max(
    Number(req.query?.page) || 1,
    1,
  );

  const limit = Math.min(
    Math.max(Number(req.query?.limit) || 20, 1),
    100,
  );

  return {
    page,
    limit,
  };
};

const handleControllerError = (error, next) => {
  return next(error);
};

/* =========================================================
   INVESTMENT ACCOUNT
========================================================= */

/**
 * GET /api/investments/account
 */
export const getInvestmentAccount = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const account =
      await getOrCreateInvestmentAccount(userId);

    return res.status(200).json({
      success: true,
      data: {
        account,
      },
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/**
 * GET /api/investments/account/details
 */
export const getInvestmentAccountDetails = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const account =
      await getInvestmentAccountService(userId);

    return res.status(200).json({
      success: true,
      data: {
        account,
      },
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/* =========================================================
   INVESTMENT PRODUCTS
========================================================= */

/**
 * GET /api/investments/products
 */
export const listInvestmentProducts = async (
  req,
  res,
  next,
) => {
  try {
    const {
      page,
      limit,
    } = getPagination(req);

    const result =
      await listInvestmentProductsService({
        type: req.query?.type,
        page,
        limit,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/**
 * GET /api/investments/products/:productId
 */
export const getInvestmentProduct = async (
  req,
  res,
  next,
) => {
  try {
    const product =
      await getInvestmentProductService(
        req.params.productId,
      );

    return res.status(200).json({
      success: true,
      data: {
        product,
      },
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/* =========================================================
   BUY / SELL ORDERS
========================================================= */

/**
 * POST /api/investments/orders/buy
 */
export const buyInvestment = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const {
      productId,
      quantity,
    } = req.body || {};

    const order = await createBuyOrder({
      userId,
      productId,
      quantity,
    });

    return res.status(201).json({
      success: true,
      message:
        "Investment buy order created successfully.",
      data: {
        order,
      },
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/**
 * POST /api/investments/orders/sell
 */
export const sellInvestment = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const {
      productId,
      quantity,
    } = req.body || {};

    const order = await createSellOrder({
      userId,
      productId,
      quantity,
    });

    return res.status(201).json({
      success: true,
      message:
        "Investment sell order created successfully.",
      data: {
        order,
      },
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/**
 * GET /api/investments/orders
 */
export const listInvestmentOrders = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const {
      page,
      limit,
    } = getPagination(req);

    const result =
      await getUserInvestmentOrders({
        userId,
        status: req.query?.status,
        type: req.query?.type,
        productId: req.query?.productId,
        page,
        limit,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/**
 * GET /api/investments/orders/:orderId
 */
export const getInvestmentOrder = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const order =
      await getUserInvestmentOrder({
        userId,
        orderId: req.params.orderId,
      });

    return res.status(200).json({
      success: true,
      data: {
        order,
      },
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/* =========================================================
   PORTFOLIO
========================================================= */

/**
 * GET /api/investments/portfolio
 */
export const getPortfolio = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const account =
      await getOrCreateInvestmentAccount(userId);

    return res.status(200).json({
      success: true,
      data: {
        portfolio: account,
      },
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/**
 * POST /api/investments/portfolio/refresh
 */
export const refreshPortfolio = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const portfolio =
      await refreshInvestmentPortfolio(userId);

    return res.status(200).json({
      success: true,
      message:
        "Investment portfolio refreshed successfully.",
      data: {
        portfolio,
      },
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/* =========================================================
   FIXED-TERM INVESTMENT PLANS
========================================================= */

/**
 * GET /api/investments/plans
 */
export const listInvestmentPlans = async (
  req,
  res,
  next,
) => {
  try {
    const {
      page,
      limit,
    } = getPagination(req);

    const result =
      await getInvestmentPlans({
        page,
        limit,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/**
 * GET /api/investments/plans/:planId
 */
export const getInvestmentPlan = async (
  req,
  res,
  next,
) => {
  try {
    const plan =
      await getInvestmentPlanService(
        req.params.planId,
      );

    return res.status(200).json({
      success: true,
      data: {
        plan,
      },
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/* =========================================================
   BITCOIN PAYMENT CONFIGURATION
========================================================= */

/**
 * GET /api/investments/btc/payment-config
 */
export const getBitcoinPaymentConfigController =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const config =
        await getBitcoinPaymentConfig();

      return res.status(200).json({
        success: true,
        data: {
          ...config,
        },
      });
    } catch (error) {
      return handleControllerError(error, next);
    }
  };

/* =========================================================
   FIXED-TERM BTC INVESTMENTS
========================================================= */

/**
 * POST /api/investments/fixed
 */
export const createFixedTermInvestment = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const {
      planId,
      amount,
    } = req.body || {};

    const investment =
      await createBtcInvestment({
        userId,
        planId,
        amount,
        ipAddress:
          req.ip ||
          req.headers?.["x-forwarded-for"] ||
          null,
      });

    return res.status(201).json({
      success: true,
      message:
        "Fixed-term investment created. Complete the Bitcoin payment to continue.",
      data: {
        investment,
      },
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/**
 * GET /api/investments/fixed
 */
export const listFixedTermInvestments = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const {
      page,
      limit,
    } = getPagination(req);

    /*
     * IMPORTANT:
     * getUserInvestments() expects an object.
     */
    const result =
      await getUserInvestments({
        userId,
        status: req.query?.status,
        page,
        limit,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/**
 * GET /api/investments/fixed/:investmentId
 */
export const getFixedTermInvestment = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const investment =
      await getUserInvestment({
        userId,
        investmentId:
          req.params.investmentId,
      });

    return res.status(200).json({
      success: true,
      data: {
        investment,
      },
    });
  } catch (error) {
    return handleControllerError(error, next);
  }
};

/**
 * POST /api/investments/fixed/:investmentId/payment
 *
 * IMPORTANT:
 * The route applies:
 *
 * uploadInvestmentPaymentProof
 *
 * Therefore this controller does NOT configure Multer.
 *
 * Expected multipart/form-data:
 *
 * - transactionHash
 * - paymentProof
 */
export const submitFixedTermInvestmentPayment = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getUserId(req);

    const transactionHash = String(
      req.body?.transactionHash || "",
    ).trim();

    /*
     * The upload middleware uses:
     *
     * upload.single("paymentProof")
     *
     * so the uploaded file is available as req.file.
     */
    const paymentProofFile = req.file;

    /*
     * Transaction hash is mandatory.
     */
    if (!transactionHash) {
      if (paymentProofFile?.path) {
        fs.unlink(
          paymentProofFile.path,
          () => {},
        );
      }

      return res.status(400).json({
        success: false,
        message:
          "Bitcoin transaction hash is required.",
      });
    }

    /*
     * Payment proof is mandatory.
     */
    if (!paymentProofFile) {
      return res.status(400).json({
        success: false,
        message:
          "Payment proof file is required.",
      });
    }

    /*
     * Store the public URL using the SAME
     * directory configured by:
     *
     * investmentPaymentUpload.js
     *
     * Actual storage directory:
     *
     * backend/uploads/investment-payments
     */
    const paymentProofUrl =
  `/uploads/investment-payments/${paymentProofFile.filename}`;

    /*
     * Save the payment proof information
     * together with the investment record.
     */
    const investment =
      await submitBtcInvestmentPayment({
        userId,
        investmentId:
          req.params.investmentId,
        transactionHash,

        paymentProofUrl,

        paymentProofName:
          paymentProofFile.originalname,

        paymentProofMimeType:
          paymentProofFile.mimetype,

        paymentProofSize:
          paymentProofFile.size,
      });

    return res.status(200).json({
      success: true,
      message:
        "Bitcoin payment proof submitted successfully. Your payment will be reviewed before the investment becomes active.",
      data: {
        investment,
      },
    });
  } catch (error) {
    /*
     * If validation/service processing fails after
     * Multer has already saved the file, remove it
     * so we don't leave orphaned payment-proof files.
     */
    if (req.file?.path) {
      fs.unlink(
        req.file.path,
        () => {},
      );
    }

    return handleControllerError(error, next);
  }
};

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  getInvestmentAccount,
  getInvestmentAccountDetails,

  listInvestmentProducts,
  getInvestmentProduct,

  buyInvestment,
  sellInvestment,

  listInvestmentOrders,
  getInvestmentOrder,

  getPortfolio,
  refreshPortfolio,

  listInvestmentPlans,
  getInvestmentPlan,

  getBitcoinPaymentConfigController,

  createFixedTermInvestment,
  listFixedTermInvestments,
  getFixedTermInvestment,
  submitFixedTermInvestmentPayment,
};
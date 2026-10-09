import {
  listAdminInvestments,
  getAdminInvestment,
  markInvestmentUnderReview,
  verifyBtcInvestmentPayment,
  rejectBtcInvestmentPayment,
  getAdminBitcoinPaymentConfig,
  upsertAdminBitcoinPaymentConfig,
} from "../services/adminInvestmentService.js";

/* ============================================================
   LIST INVESTMENTS
   GET /api/admin/investments
============================================================ */

export const getAdminInvestments =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const result =
        await listAdminInvestments({
          page:
            req.query.page,

          limit:
            req.query.limit,

          status:
            req.query.status,

          paymentStatus:
            req.query.paymentStatus,

          fundingMethod:
            req.query.fundingMethod,

          search:
            req.query.search,
        });

      return res.status(200).json({
        success:
          true,

        data:
          result.investments,

        pagination:
          result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

/* ============================================================
   GET ONE INVESTMENT
   GET /api/admin/investments/:investmentId
============================================================ */

export const getAdminInvestmentDetails =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const investment =
        await getAdminInvestment(
          req.params
            .investmentId,
        );

      return res.status(200).json({
        success:
          true,

        data:
          investment,
      });
    } catch (error) {
      next(error);
    }
  };

/* ============================================================
   START REVIEW
   PATCH /api/admin/investments/:investmentId/review
============================================================ */

export const reviewAdminInvestment =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const investment =
        await markInvestmentUnderReview(
          {
            investmentId:
              req.params
                .investmentId,

            adminId:
              req.user?.id,

            ipAddress:
              req.ip ||
              null,
          },
        );

      return res.status(200).json({
        success:
          true,

        message:
          "Investment payment moved to review.",

        data:
          investment,
      });
    } catch (error) {
      next(error);
    }
  };

/* ============================================================
   VERIFY PAYMENT
   POST /api/admin/investments/:investmentId/verify
============================================================ */

export const verifyAdminInvestment =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const investment =
        await verifyBtcInvestmentPayment(
          {
            investmentId:
              req.params
                .investmentId,

            adminId:
              req.user?.id,

            ipAddress:
              req.ip ||
              null,
          },
        );

      return res.status(200).json({
        success:
          true,

        message:
          "Bitcoin payment verified and investment activated.",

        data:
          investment,
      });
    } catch (error) {
      next(error);
    }
  };

/* ============================================================
   REJECT PAYMENT
   POST /api/admin/investments/:investmentId/reject
============================================================ */

export const rejectAdminInvestment =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const investment =
        await rejectBtcInvestmentPayment(
          {
            investmentId:
              req.params
                .investmentId,

            adminId:
              req.user?.id,

            reason:
              req.body?.reason,

            ipAddress:
              req.ip ||
              null,
          },
        );

      return res.status(200).json({
        success:
          true,

        message:
          "Investment payment rejected.",

        data:
          investment,
      });
    } catch (error) {
      next(error);
    }
  };

/* ============================================================
   GET BTC CONFIG
   GET /api/admin/investments/btc/payment-config
============================================================ */

export const getAdminBtcPaymentConfig =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const config =
        await getAdminBitcoinPaymentConfig();

      return res.status(200).json({
        success:
          true,

        data:
          config,
      });
    } catch (error) {
      next(error);
    }
  };

/* ============================================================
   UPDATE BTC CONFIG
   PUT /api/admin/investments/btc/payment-config
============================================================ */

export const updateAdminBtcPaymentConfig =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const config =
        await upsertAdminBitcoinPaymentConfig(
          {
            btcAddress:
              req.body?.btcAddress,

            btcRate:
              req.body?.btcRate,

            instructions:
              req.body?.instructions,

            isActive:
              req.body?.isActive !==
              undefined
                ? Boolean(
                    req.body
                      .isActive,
                  )
                : true,

            adminId:
              req.user?.id,

            ipAddress:
              req.ip ||
              null,
          },
        );

      return res.status(200).json({
        success:
          true,

        message:
          "Bitcoin payment configuration updated.",

        data:
          config,
      });
    } catch (error) {
      next(error);
    }
  };
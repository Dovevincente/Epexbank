import {
  activateBeneficiary,
  createBeneficiary,
  deleteBeneficiary,
  getUserBeneficiaries,
  getUserBeneficiary,
  updateBeneficiary,
} from "../services/beneficiaryService.js";

const getAuthenticatedUserId = (req) => {
  if (!req.user?.id) {
    const error = new Error(
      "Authenticated user is required",
    );

    error.statusCode = 401;
    throw error;
  }

  return req.user.id;
};

export const listBeneficiaries = async (
  req,
  res,
  next,
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    const includeInactive =
      String(req.query.includeInactive || "")
        .toLowerCase() === "true";

    const beneficiaries =
      await getUserBeneficiaries({
        userId,
        includeInactive,
      });

    return res.status(200).json({
      success: true,
      data: {
        beneficiaries,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getBeneficiary = async (
  req,
  res,
  next,
) => {
  try {
    const userId =
      getAuthenticatedUserId(req);

    const { beneficiaryId } =
      req.params;

    const beneficiary =
      await getUserBeneficiary({
        userId,
        beneficiaryId,
      });

    return res.status(200).json({
      success: true,
      data: {
        beneficiary,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createNewBeneficiary =
  async (req, res, next) => {
    try {
      const userId =
        getAuthenticatedUserId(req);

      const {
        name,
        accountName,
        accountNumber,
        bankName,
        bankCode,
        country,
        currencyCode,
      } = req.body;

      const beneficiary =
        await createBeneficiary({
          userId,
          name,
          accountName,
          accountNumber,
          bankName,
          bankCode,
          country,
          currencyCode,
        });

      return res.status(201).json({
        success: true,
        message:
          "Beneficiary created successfully",
        data: {
          beneficiary,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const updateExistingBeneficiary =
  async (req, res, next) => {
    try {
      const userId =
        getAuthenticatedUserId(req);

      const { beneficiaryId } =
        req.params;

      const {
        name,
        accountName,
        accountNumber,
        bankName,
        bankCode,
        country,
        currencyCode,
      } = req.body;

      const beneficiary =
        await updateBeneficiary({
          userId,
          beneficiaryId,
          name,
          accountName,
          accountNumber,
          bankName,
          bankCode,
          country,
          currencyCode,
        });

      return res.status(200).json({
        success: true,
        message:
          "Beneficiary updated successfully",
        data: {
          beneficiary,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const removeBeneficiary =
  async (req, res, next) => {
    try {
      const userId =
        getAuthenticatedUserId(req);

      const { beneficiaryId } =
        req.params;

      const beneficiary =
        await deleteBeneficiary({
          userId,
          beneficiaryId,
        });

      return res.status(200).json({
        success: true,
        message:
          "Beneficiary deactivated successfully",
        data: {
          beneficiary,
        },
      });
    } catch (error) {
      next(error);
    }
  };

export const restoreBeneficiary =
  async (req, res, next) => {
    try {
      const userId =
        getAuthenticatedUserId(req);

      const { beneficiaryId } =
        req.params;

      const beneficiary =
        await activateBeneficiary({
          userId,
          beneficiaryId,
        });

      return res.status(200).json({
        success: true,
        message:
          "Beneficiary activated successfully",
        data: {
          beneficiary,
        },
      });
    } catch (error) {
      next(error);
    }
  };

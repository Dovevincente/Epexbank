import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

import {
  getOrCreateKyc,
  submitKyc,
  updateKyc,
  startKycReview,
  approveKyc,
  verifyTaxCode,
  verifyAmlCode,
  verifyCftCode,
  rejectKyc,
  listKycApplications,
  getKycForAdmin,
} from "../services/kycService.js";

/*
|--------------------------------------------------------------------------
| FILE UPLOAD CONFIGURATION
|--------------------------------------------------------------------------
*/

const __filename =
  fileURLToPath(import.meta.url);

const __dirname =
  path.dirname(__filename);

const uploadDirectory =
  path.join(
    __dirname,
    "../../uploads/kyc",
  );

fs.mkdirSync(
  uploadDirectory,
  {
    recursive: true,
  },
);

const storage =
  multer.diskStorage({
    destination: (
      req,
      file,
      callback,
    ) => {
      callback(
        null,
        uploadDirectory,
      );
    },

    filename: (
      req,
      file,
      callback,
    ) => {
      const extension =
        path
          .extname(
            file.originalname,
          )
          .toLowerCase();

      const filename =
        `${randomUUID()}${extension}`;

      callback(
        null,
        filename,
      );
    },
  });

const upload =
  multer({
    storage,

    limits: {
      fileSize:
        10 * 1024 * 1024,
    },

    fileFilter: (
      req,
      file,
      callback,
    ) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "application/pdf",
      ];

      if (
        !allowedTypes.includes(
          file.mimetype,
        )
      ) {
        return callback(
          new Error(
            "Only JPG, PNG, and PDF files are allowed.",
          ),
        );
      }

      callback(
        null,
        true,
      );
    },
  });

/*
|--------------------------------------------------------------------------
| KYC FILE UPLOAD
|--------------------------------------------------------------------------
|
| POST /api/kyc/upload
|
*/

export const uploadKycFile = [
  upload.single("file"),

  async (
    req,
    res,
    next,
  ) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "No file was uploaded.",
          });
      }

      const field =
        String(
          req.body?.field ||
            "",
        ).trim();

      const allowedFields = [
        "documentFront",
        "documentBack",
        "selfie",
      ];

      if (
        !allowedFields.includes(
          field,
        )
      ) {
        fs.unlink(
          req.file.path,
          () => {},
        );

        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid KYC upload field.",
          });
      }

      const fileUrl =
        `/uploads/kyc/${req.file.filename}`;

      return res
        .status(201)
        .json({
          success: true,

          message:
            "File uploaded successfully.",

          data: {
            url:
              fileUrl,

            fileUrl:
              fileUrl,

            field,

            originalName:
              req.file
                .originalname,

            filename:
              req.file.filename,

            mimeType:
              req.file.mimetype,

            size:
              req.file.size,
          },
        });
    } catch (error) {
      return next(error);
    }
  },
];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const getUserId = (
  req,
) => {
  if (!req.user?.id) {
    const error =
      new Error(
        "Authentication required",
      );

    error.statusCode =
      401;

    throw error;
  }

  return req.user.id;
};

const getKycId = (
  req,
) => {
  const kycId =
    String(
      req.params?.kycId ||
        "",
    ).trim();

  if (!kycId) {
    const error =
      new Error(
        "KYC ID is required",
      );

    error.statusCode =
      400;

    throw error;
  }

  return kycId;
};

/*
|--------------------------------------------------------------------------
| CUSTOMER KYC
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| GET /api/kyc/me
|--------------------------------------------------------------------------
*/

export const getMyKyc =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const userId =
        getUserId(req);

      const kyc =
        await getOrCreateKyc(
          userId,
        );

      return res
        .status(200)
        .json({
          success: true,
          data: kyc,
        });
    } catch (error) {
      return next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/kyc
|--------------------------------------------------------------------------
|
| Customer submits:
|
| - Identity document
| - Supporting document URLs
| - Tax Identification Number
| - AML code
| - CFT code
|
| IMPORTANT:
|
| Verification flags are NEVER accepted
| from the customer.
|
*/

export const submitKycRequest =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const userId =
        getUserId(req);

      const {
        documentType,

        documentNumber,

        documentFrontUrl,

        documentBackUrl,

        selfieUrl,

        taxIdentificationNumber,

        amlCode,

        cftCode,
      } = req.body || {};

      if (!documentType) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Document type is required",
          });
      }

      if (!documentNumber) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Document number is required",
          });
      }

      if (!documentFrontUrl) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Front document image is required",
          });
      }

      if (!selfieUrl) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Selfie image is required",
          });
      }

      const kyc =
        await submitKyc({
          userId,

          documentType,

          documentNumber,

          documentFrontUrl,

          documentBackUrl,

          selfieUrl,

          taxIdentificationNumber,

          amlCode,

          cftCode,
        });

      return res
        .status(201)
        .json({
          success: true,

          message:
            "KYC submitted successfully",

          data: kyc,
        });
    } catch (error) {
      return next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/kyc/resubmit
|--------------------------------------------------------------------------
|
| Customer can resubmit rejected KYC information,
| including TIN, AML and CFT codes.
|
*/

export const resubmitKycRequest =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const userId =
        getUserId(req);

      const {
        documentType,

        documentNumber,

        documentFrontUrl,

        documentBackUrl,

        selfieUrl,

        taxIdentificationNumber,

        amlCode,

        cftCode,
      } = req.body || {};

      if (!documentType) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Document type is required",
          });
      }

      if (!documentNumber) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Document number is required",
          });
      }

      if (!documentFrontUrl) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Front document image is required",
          });
      }

      if (!selfieUrl) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Selfie image is required",
          });
      }

      const kyc =
        await updateKyc({
          userId,

          documentType,

          documentNumber,

          documentFrontUrl,

          documentBackUrl,

          selfieUrl,

          taxIdentificationNumber,

          amlCode,

          cftCode,
        });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "KYC resubmitted successfully",

          data: kyc,
        });
    } catch (error) {
      return next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| ADMIN KYC
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| GET /api/admin/kyc
|--------------------------------------------------------------------------
|
| List KYC applications for administrators.
|
| Supported query parameters:
|
| ?status=PENDING
| ?page=1
| ?limit=20
|
*/

export const listAdminKyc =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const {
        status,

        page = 1,

        limit = 20,
      } = req.query || {};

      const result =
        await listKycApplications({
          status: status
            ? String(
                status,
              ).trim()
            : undefined,

          page,

          limit,
        });

      return res
        .status(200)
        .json({
          success: true,

          data:
            result.items,

          pagination:
            result.pagination,
        });
    } catch (error) {
      return next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| GET /api/admin/kyc/:kycId
|--------------------------------------------------------------------------
|
| Get one complete KYC application.
|
*/

export const getAdminKyc =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const kycId =
        getKycId(req);

      const kyc =
        await getKycForAdmin(
          kycId,
        );

      return res
        .status(200)
        .json({
          success: true,
          data: kyc,
        });
    } catch (error) {
      return next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| STAFF / COMPLIANCE
|--------------------------------------------------------------------------
*/

/*
|--------------------------------------------------------------------------
| POST /api/kyc/:kycId/review
|--------------------------------------------------------------------------
*/

export const reviewKycRequest =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const adminUserId =
        getUserId(req);

      const kycId =
        getKycId(req);

      const kyc =
        await startKycReview({
          kycId,

          adminUserId,
        });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "KYC moved to review",

          data: kyc,
        });
    } catch (error) {
      return next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/kyc/:kycId/approve
|--------------------------------------------------------------------------
*/

export const approveKycRequest =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const adminUserId =
        getUserId(req);

      const kycId =
        getKycId(req);

      const kyc =
        await approveKyc({
          kycId,

          adminUserId,
        });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "KYC approved successfully",

          data: kyc,
        });
    } catch (error) {
      return next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/kyc/:kycId/verify-tax-code
|--------------------------------------------------------------------------
|
| Admin/compliance action to verify
| the customer's Tax Identification Number.
|
*/

export const verifyTaxCodeRequest =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const adminUserId =
        getUserId(req);

      const kycId =
        getKycId(req);

      const kyc =
        await verifyTaxCode({
          kycId,

          adminUserId,
        });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Tax Identification Number verified successfully",

          data: kyc,
        });
    } catch (error) {
      return next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/kyc/:kycId/verify-aml-code
|--------------------------------------------------------------------------
|
| Admin/compliance action to verify
| the customer's AML code.
|
*/

export const verifyAmlCodeRequest =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const adminUserId =
        getUserId(req);

      const kycId =
        getKycId(req);

      const kyc =
        await verifyAmlCode({
          kycId,

          adminUserId,
        });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "AML code verified successfully",

          data: kyc,
        });
    } catch (error) {
      return next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/kyc/:kycId/verify-cft-code
|--------------------------------------------------------------------------
|
| Admin/compliance action to verify
| the customer's CFT code.
|
*/

export const verifyCftCodeRequest =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const adminUserId =
        getUserId(req);

      const kycId =
        getKycId(req);

      const kyc =
        await verifyCftCode({
          kycId,

          adminUserId,
        });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "CFT code verified successfully",

          data: kyc,
        });
    } catch (error) {
      return next(error);
    }
  };

/*
|--------------------------------------------------------------------------
| POST /api/kyc/:kycId/reject
|--------------------------------------------------------------------------
*/

export const rejectKycRequest =
  async (
    req,
    res,
    next,
  ) => {
    try {
      const adminUserId =
        getUserId(req);

      const kycId =
        getKycId(req);

      const {
        rejectionReason,

        reason,
      } = req.body || {};

      const finalReason =
        rejectionReason ||
        reason;

      if (!finalReason) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "KYC rejection reason is required",
          });
      }

      const kyc =
        await rejectKyc({
          kycId,

          adminUserId,

          rejectionReason:
            finalReason,
        });

      return res
        .status(200)
        .json({
          success: true,

          message:
            "KYC rejected",

          data: kyc,
        });
    } catch (error) {
      return next(error);
    }
  };
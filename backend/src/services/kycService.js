import prisma from "../config/database.js";
import logger from "../utils/logger.js";

/*
|--------------------------------------------------------------------------
| CONSTANTS
|--------------------------------------------------------------------------
*/

const KYC_STATUS = Object.freeze({
  NOT_STARTED: "NOT_STARTED",
  PENDING: "PENDING",
  UNDER_REVIEW: "UNDER_REVIEW",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
});

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

function assertUserId(userId) {
  if (!userId || typeof userId !== "string") {
    const error = new Error("A valid user ID is required.");
    error.statusCode = 400;
    throw error;
  }
}

function assertKycId(kycId) {
  if (!kycId || typeof kycId !== "string") {
    const error = new Error("A valid KYC ID is required.");
    error.statusCode = 400;
    throw error;
  }
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();

  return normalized.length > 0 ? normalized : null;
}

function requireString(value, fieldName) {
  const normalized = normalizeOptionalString(value);

  if (!normalized) {
    const error = new Error(`${fieldName} is required.`);
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

/*
|--------------------------------------------------------------------------
| KYC SERIALIZER
|--------------------------------------------------------------------------
*/

function serializeKyc(kyc) {
  if (!kyc) {
    return null;
  }

  return {
    id: kyc.id,
    userId: kyc.userId,
    status: kyc.status,

    /*
    |--------------------------------------------------------------------------
    | TAX / AML / CFT COMPLIANCE
    |--------------------------------------------------------------------------
    */

    taxIdentificationNumber:
      kyc.taxIdentificationNumber || null,

    taxCodeVerified:
      Boolean(kyc.taxCodeVerified),

    taxCodeVerifiedAt:
      kyc.taxCodeVerifiedAt || null,

    amlCode:
      kyc.amlCode || null,

    amlCodeVerified:
      Boolean(kyc.amlCodeVerified),

    amlCodeVerifiedAt:
      kyc.amlCodeVerifiedAt || null,

    cftCode:
      kyc.cftCode || null,

    cftCodeVerified:
      Boolean(kyc.cftCodeVerified),

    cftCodeVerifiedAt:
      kyc.cftCodeVerifiedAt || null,

    /*
    |--------------------------------------------------------------------------
    | IDENTITY DOCUMENTS
    |--------------------------------------------------------------------------
    */

    documentType: kyc.documentType,

    documentNumber: kyc.documentNumber,

    documentFrontUrl:
      kyc.documentFrontUrl,

    documentBackUrl:
      kyc.documentBackUrl,

    selfieUrl:
      kyc.selfieUrl,

    /*
    |--------------------------------------------------------------------------
    | REVIEW
    |--------------------------------------------------------------------------
    */

    rejectionReason:
      kyc.rejectionReason,

    reviewedAt:
      kyc.reviewedAt,

    verifiedAt:
      kyc.verifiedAt,

    createdAt:
      kyc.createdAt,

    updatedAt:
      kyc.updatedAt,
  };
}

/*
|--------------------------------------------------------------------------
| GET / CREATE KYC
|--------------------------------------------------------------------------
*/

/**
 * Get the customer's KYC record.
 *
 * If no record exists, create the initial NOT_STARTED
 * KYC record.
 */

export async function getOrCreateKyc(userId) {
  assertUserId(userId);

  const existing =
    await prisma.kyc.findUnique({
      where: {
        userId,
      },
    });

  if (existing) {
    return serializeKyc(existing);
  }

  const user =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

  if (!user) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const kyc =
    await prisma.kyc.create({
      data: {
        userId,

        status:
          KYC_STATUS.NOT_STARTED,

        /*
        |--------------------------------------------------------------------------
        | TIN
        |--------------------------------------------------------------------------
        */

        taxIdentificationNumber:
          null,

        taxCodeVerified:
          false,

        taxCodeVerifiedAt:
          null,

        /*
        |--------------------------------------------------------------------------
        | AML
        |--------------------------------------------------------------------------
        */

        amlCode:
          null,

        amlCodeVerified:
          false,

        amlCodeVerifiedAt:
          null,

        /*
        |--------------------------------------------------------------------------
        | CFT
        |--------------------------------------------------------------------------
        */

        cftCode:
          null,

        cftCodeVerified:
          false,

        cftCodeVerifiedAt:
          null,
      },
    });

  logger.info(
    "KYC record created",
    {
      userId,
      kycId: kyc.id,
    },
  );

  return serializeKyc(kyc);
}

/*
|--------------------------------------------------------------------------
| GET EXISTING KYC
|--------------------------------------------------------------------------
*/

export async function getKycByUserId(userId) {
  assertUserId(userId);

  const kyc =
    await prisma.kyc.findUnique({
      where: {
        userId,
      },
    });

  if (!kyc) {
    const error =
      new Error(
        "KYC record not found.",
      );

    error.statusCode = 404;

    throw error;
  }

  return serializeKyc(kyc);
}

/*
|--------------------------------------------------------------------------
| GET KYC BY ID
|--------------------------------------------------------------------------
*/

export async function getKycById(
  userId,
  kycId,
) {
  assertUserId(userId);
  assertKycId(kycId);

  const kyc =
    await prisma.kyc.findFirst({
      where: {
        id: kycId,
        userId,
      },
    });

  if (!kyc) {
    const error =
      new Error(
        "KYC record not found.",
      );

    error.statusCode = 404;

    throw error;
  }

  return serializeKyc(kyc);
}

/*
|--------------------------------------------------------------------------
| SUBMIT KYC
|--------------------------------------------------------------------------
*/

/**
 * Submit KYC information and supporting documents.
 *
 * Customer can submit:
 *
 * - TIN
 * - AML code
 * - CFT code
 *
 * Verification is always performed by authorized
 * administrative/compliance workflows.
 */

export async function submitKyc({
  userId,

  documentType,

  documentNumber,

  documentFrontUrl,

  documentBackUrl,

  selfieUrl,

  taxIdentificationNumber,

  amlCode,

  cftCode,
}) {
  assertUserId(userId);

  const normalizedDocumentType =
    requireString(
      documentType,
      "Document type",
    );

  const normalizedDocumentNumber =
    requireString(
      documentNumber,
      "Document number",
    );

  const normalizedFrontUrl =
    requireString(
      documentFrontUrl,
      "Front document URL",
    );

  const normalizedSelfieUrl =
    requireString(
      selfieUrl,
      "Selfie URL",
    );

  const normalizedBackUrl =
    normalizeOptionalString(
      documentBackUrl,
    );

  const normalizedTin =
    normalizeOptionalString(
      taxIdentificationNumber,
    );

  const normalizedAmlCode =
    normalizeOptionalString(
      amlCode,
    );

  const normalizedCftCode =
    normalizeOptionalString(
      cftCode,
    );

  /*
  |--------------------------------------------------------------------------
  | TIN VALIDATION
  |--------------------------------------------------------------------------
  */

  if (
    normalizedTin &&
    normalizedTin.length > 100
  ) {
    const error =
      new Error(
        "Tax Identification Number cannot exceed 100 characters.",
      );

    error.statusCode = 400;

    throw error;
  }

  /*
  |--------------------------------------------------------------------------
  | AML VALIDATION
  |--------------------------------------------------------------------------
  */

  if (
    normalizedAmlCode &&
    normalizedAmlCode.length > 100
  ) {
    const error =
      new Error(
        "AML code cannot exceed 100 characters.",
      );

    error.statusCode = 400;

    throw error;
  }

  /*
  |--------------------------------------------------------------------------
  | CFT VALIDATION
  |--------------------------------------------------------------------------
  */

  if (
    normalizedCftCode &&
    normalizedCftCode.length > 100
  ) {
    const error =
      new Error(
        "CFT code cannot exceed 100 characters.",
      );

    error.statusCode = 400;

    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      const user =
        await tx.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
          },
        });

      if (!user) {
        const error =
          new Error(
            "User not found.",
          );

        error.statusCode = 404;

        throw error;
      }

      let kyc =
        await tx.kyc.findUnique({
          where: {
            userId,
          },
        });

      if (!kyc) {
        kyc =
          await tx.kyc.create({
            data: {
              userId,

              status:
                KYC_STATUS.NOT_STARTED,

              taxIdentificationNumber:
                null,

              taxCodeVerified:
                false,

              taxCodeVerifiedAt:
                null,

              amlCode:
                null,

              amlCodeVerified:
                false,

              amlCodeVerifiedAt:
                null,

              cftCode:
                null,

              cftCodeVerified:
                false,

              cftCodeVerifiedAt:
                null,
            },
          });
      }

      if (
        kyc.status ===
        KYC_STATUS.UNDER_REVIEW
      ) {
        const error =
          new Error(
            "Your KYC is already under review.",
          );

        error.statusCode = 409;

        throw error;
      }

      if (
        kyc.status ===
        KYC_STATUS.VERIFIED
      ) {
        const error =
          new Error(
            "Your KYC has already been verified.",
          );

        error.statusCode = 409;

        throw error;
      }

      /*
      |--------------------------------------------------------------------------
      | IMPORTANT
      |--------------------------------------------------------------------------
      |
      | A new KYC submission requires fresh
      | verification of TIN, AML and CFT.
      |
      */

      const updated =
        await tx.kyc.update({
          where: {
            id: kyc.id,
          },

          data: {
            documentType:
              normalizedDocumentType,

            documentNumber:
              normalizedDocumentNumber,

            documentFrontUrl:
              normalizedFrontUrl,

            documentBackUrl:
              normalizedBackUrl,

            selfieUrl:
              normalizedSelfieUrl,

            /*
            |--------------------------------------------------------------------------
            | TIN
            |--------------------------------------------------------------------------
            */

            taxIdentificationNumber:
              normalizedTin,

            taxCodeVerified:
              false,

            taxCodeVerifiedAt:
              null,

            /*
            |--------------------------------------------------------------------------
            | AML
            |--------------------------------------------------------------------------
            */

            amlCode:
              normalizedAmlCode,

            amlCodeVerified:
              false,

            amlCodeVerifiedAt:
              null,

            /*
            |--------------------------------------------------------------------------
            | CFT
            |--------------------------------------------------------------------------
            */

            cftCode:
              normalizedCftCode,

            cftCodeVerified:
              false,

            cftCodeVerifiedAt:
              null,

            /*
            |--------------------------------------------------------------------------
            | KYC STATUS
            |--------------------------------------------------------------------------
            */

            status:
              KYC_STATUS.PENDING,

            rejectionReason:
              null,

            reviewedAt:
              null,

            verifiedAt:
              null,
          },
        });

      logger.info(
        "KYC submitted",
        {
          userId,

          kycId:
            updated.id,

          status:
            updated.status,

          hasTin:
            Boolean(
              updated.taxIdentificationNumber,
            ),

          hasAmlCode:
            Boolean(
              updated.amlCode,
            ),

          hasCftCode:
            Boolean(
              updated.cftCode,
            ),

          taxCodeVerified:
            updated.taxCodeVerified,

          amlCodeVerified:
            updated.amlCodeVerified,

          cftCodeVerified:
            updated.cftCodeVerified,
        },
      );

      return serializeKyc(updated);
    },
    {
      isolationLevel:
        "Serializable",
    },
  );
}

/*
|--------------------------------------------------------------------------
| UPDATE KYC
|--------------------------------------------------------------------------
*/

/**
 * Update KYC information.
 *
 * If TIN, AML or CFT changes, its corresponding
 * verification is automatically reset.
 */

export async function updateKyc({
  userId,

  documentType,

  documentNumber,

  documentFrontUrl,

  documentBackUrl,

  selfieUrl,

  taxIdentificationNumber,

  amlCode,

  cftCode,
}) {
  assertUserId(userId);

  const kyc =
    await prisma.kyc.findUnique({
      where: {
        userId,
      },
    });

  if (!kyc) {
    const error =
      new Error(
        "KYC record not found.",
      );

    error.statusCode = 404;

    throw error;
  }

  if (
    kyc.status ===
    KYC_STATUS.UNDER_REVIEW
  ) {
    const error =
      new Error(
        "KYC cannot be modified while it is under review.",
      );

    error.statusCode = 409;

    throw error;
  }

  if (
    kyc.status ===
    KYC_STATUS.VERIFIED
  ) {
    const error =
      new Error(
        "Verified KYC cannot be modified.",
      );

    error.statusCode = 409;

    throw error;
  }

  const data = {};

  /*
  |--------------------------------------------------------------------------
  | DOCUMENT FIELDS
  |--------------------------------------------------------------------------
  */

  if (
    documentType !== undefined
  ) {
    data.documentType =
      requireString(
        documentType,
        "Document type",
      );
  }

  if (
    documentNumber !== undefined
  ) {
    data.documentNumber =
      requireString(
        documentNumber,
        "Document number",
      );
  }

  if (
    documentFrontUrl !== undefined
  ) {
    data.documentFrontUrl =
      requireString(
        documentFrontUrl,
        "Front document URL",
      );
  }

  if (
    documentBackUrl !== undefined
  ) {
    data.documentBackUrl =
      normalizeOptionalString(
        documentBackUrl,
      );
  }

  if (
    selfieUrl !== undefined
  ) {
    data.selfieUrl =
      requireString(
        selfieUrl,
        "Selfie URL",
      );
  }

  /*
  |--------------------------------------------------------------------------
  | TIN
  |--------------------------------------------------------------------------
  */

  if (
    taxIdentificationNumber !==
    undefined
  ) {
    const normalizedTin =
      normalizeOptionalString(
        taxIdentificationNumber,
      );

    if (
      normalizedTin &&
      normalizedTin.length > 100
    ) {
      const error =
        new Error(
          "Tax Identification Number cannot exceed 100 characters.",
        );

      error.statusCode = 400;

      throw error;
    }

    const previousTin =
      normalizeOptionalString(
        kyc.taxIdentificationNumber,
      );

    data.taxIdentificationNumber =
      normalizedTin;

    if (
      normalizedTin !==
      previousTin
    ) {
      data.taxCodeVerified =
        false;

      data.taxCodeVerifiedAt =
        null;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | AML
  |--------------------------------------------------------------------------
  */

  if (
    amlCode !== undefined
  ) {
    const normalizedAmlCode =
      normalizeOptionalString(
        amlCode,
      );

    if (
      normalizedAmlCode &&
      normalizedAmlCode.length > 100
    ) {
      const error =
        new Error(
          "AML code cannot exceed 100 characters.",
        );

      error.statusCode = 400;

      throw error;
    }

    const previousAmlCode =
      normalizeOptionalString(
        kyc.amlCode,
      );

    data.amlCode =
      normalizedAmlCode;

    if (
      normalizedAmlCode !==
      previousAmlCode
    ) {
      data.amlCodeVerified =
        false;

      data.amlCodeVerifiedAt =
        null;
    }
  }

  /*
  |--------------------------------------------------------------------------
  | CFT
  |--------------------------------------------------------------------------
  */

  if (
    cftCode !== undefined
  ) {
    const normalizedCftCode =
      normalizeOptionalString(
        cftCode,
      );

    if (
      normalizedCftCode &&
      normalizedCftCode.length > 100
    ) {
      const error =
        new Error(
          "CFT code cannot exceed 100 characters.",
        );

      error.statusCode = 400;

      throw error;
    }

    const previousCftCode =
      normalizeOptionalString(
        kyc.cftCode,
      );

    data.cftCode =
      normalizedCftCode;

    if (
      normalizedCftCode !==
      previousCftCode
    ) {
      data.cftCodeVerified =
        false;

      data.cftCodeVerifiedAt =
        null;
    }
  }

  if (
    Object.keys(data).length ===
    0
  ) {
    const error =
      new Error(
        "At least one KYC field must be provided.",
      );

    error.statusCode = 400;

    throw error;
  }

  /*
  |--------------------------------------------------------------------------
  | RESUBMISSION AFTER REJECTION
  |--------------------------------------------------------------------------
  */

  if (
    kyc.status ===
    KYC_STATUS.REJECTED
  ) {
    data.status =
      KYC_STATUS.PENDING;

    data.rejectionReason =
      null;

    data.reviewedAt =
      null;

    data.verifiedAt =
      null;
  }

  const updated =
    await prisma.kyc.update({
      where: {
        id: kyc.id,
      },

      data,
    });

  logger.info(
    "KYC information updated",
    {
      userId,

      kycId:
        updated.id,

      status:
        updated.status,

      hasTin:
        Boolean(
          updated.taxIdentificationNumber,
        ),

      hasAmlCode:
        Boolean(
          updated.amlCode,
        ),

      hasCftCode:
        Boolean(
          updated.cftCode,
        ),

      taxCodeVerified:
        updated.taxCodeVerified,

      amlCodeVerified:
        updated.amlCodeVerified,

      cftCodeVerified:
        updated.cftCodeVerified,
    },
  );

  return serializeKyc(updated);
}

/*
|--------------------------------------------------------------------------
| MOVE KYC TO REVIEW
|--------------------------------------------------------------------------
*/

/**
 * Move submitted KYC from PENDING to UNDER_REVIEW.
 */

export async function startKycReview({
  kycId,
  adminUserId,
}) {
  assertKycId(kycId);
  assertUserId(adminUserId);

  return prisma.$transaction(
    async (tx) => {
      const kyc =
        await tx.kyc.findUnique({
          where: {
            id: kycId,
          },
        });

      if (!kyc) {
        const error =
          new Error(
            "KYC record not found.",
          );

        error.statusCode = 404;

        throw error;
      }

      if (
        kyc.status !==
        KYC_STATUS.PENDING
      ) {
        const error =
          new Error(
            `KYC cannot enter review from ${kyc.status}.`,
          );

        error.statusCode = 409;

        throw error;
      }

      const updated =
        await tx.kyc.update({
          where: {
            id: kyc.id,
          },

          data: {
            status:
              KYC_STATUS.UNDER_REVIEW,
          },
        });

      await tx.auditLog.create({
        data: {
          user: {
            connect: {
              id: kyc.userId,
            },
          },

          admin: {
            connect: {
              id: adminUserId,
            },
          },

          action:
            "UPDATE",

          entity:
            "Kyc",

          entityId:
            kyc.id,

          metadata: {
            action:
              "KYC_REVIEW_STARTED",

            previousStatus:
              kyc.status,

            newStatus:
              updated.status,

            hasTin:
              Boolean(
                kyc.taxIdentificationNumber,
              ),

            taxCodeVerified:
              Boolean(
                kyc.taxCodeVerified,
              ),

            hasAmlCode:
              Boolean(
                kyc.amlCode,
              ),

            amlCodeVerified:
              Boolean(
                kyc.amlCodeVerified,
              ),

            hasCftCode:
              Boolean(
                kyc.cftCode,
              ),

            cftCodeVerified:
              Boolean(
                kyc.cftCodeVerified,
              ),
          },
        },
      });

      logger.info(
        "KYC review started",
        {
          kycId,

          customerUserId:
            kyc.userId,

          adminUserId,
        },
      );

      return serializeKyc(updated);
    },
    {
      isolationLevel:
        "Serializable",
    },
  );
}

/*
|--------------------------------------------------------------------------
| APPROVE KYC
|--------------------------------------------------------------------------
*/

/**
 * Approve a KYC application.
 *
 * KYC approval does NOT automatically verify
 * TIN, AML or CFT.
 *
 * These are separate compliance controls.
 */

export async function approveKyc({
  kycId,
  adminUserId,
}) {
  assertKycId(kycId);
  assertUserId(adminUserId);

  return prisma.$transaction(
    async (tx) => {
      const kyc =
        await tx.kyc.findUnique({
          where: {
            id: kycId,
          },
        });

      if (!kyc) {
        const error =
          new Error(
            "KYC record not found.",
          );

        error.statusCode = 404;

        throw error;
      }

      if (
        ![
          KYC_STATUS.PENDING,
          KYC_STATUS.UNDER_REVIEW,
        ].includes(kyc.status)
      ) {
        const error =
          new Error(
            `KYC cannot be approved from ${kyc.status}.`,
          );

        error.statusCode = 409;

        throw error;
      }

      const now =
        new Date();

      const updated =
        await tx.kyc.update({
          where: {
            id: kyc.id,
          },

          data: {
            status:
              KYC_STATUS.VERIFIED,

            rejectionReason:
              null,

            reviewedAt:
              now,

            verifiedAt:
              now,
          },
        });

      await tx.auditLog.create({
        data: {
          user: {
            connect: {
              id: kyc.userId,
            },
          },

          admin: {
            connect: {
              id: adminUserId,
            },
          },

          action:
            "KYC_APPROVAL",

          entity:
            "Kyc",

          entityId:
            kyc.id,

          metadata: {
            action:
              "KYC_APPROVED",

            previousStatus:
              kyc.status,

            newStatus:
              updated.status,

            hasTin:
              Boolean(
                kyc.taxIdentificationNumber,
              ),

            taxCodeVerified:
              Boolean(
                kyc.taxCodeVerified,
              ),

            hasAmlCode:
              Boolean(
                kyc.amlCode,
              ),

            amlCodeVerified:
              Boolean(
                kyc.amlCodeVerified,
              ),

            hasCftCode:
              Boolean(
                kyc.cftCode,
              ),

            cftCodeVerified:
              Boolean(
                kyc.cftCodeVerified,
              ),
          },
        },
      });

      logger.security(
        "KYC approved",
        {
          kycId,

          customerUserId:
            kyc.userId,

          adminUserId,

          hasTin:
            Boolean(
              kyc.taxIdentificationNumber,
            ),

          taxCodeVerified:
            Boolean(
              kyc.taxCodeVerified,
            ),

          hasAmlCode:
            Boolean(
              kyc.amlCode,
            ),

          amlCodeVerified:
            Boolean(
              kyc.amlCodeVerified,
            ),

          hasCftCode:
            Boolean(
              kyc.cftCode,
            ),

          cftCodeVerified:
            Boolean(
              kyc.cftCodeVerified,
            ),
        },
      );

      return serializeKyc(updated);
    },
    {
      isolationLevel:
        "Serializable",
    },
  );
}

/*
|--------------------------------------------------------------------------
| VERIFY TAX IDENTIFICATION NUMBER
|--------------------------------------------------------------------------
*/

/**
 * Verify a customer's Tax Identification Number.
 *
 * Customers cannot call this function.
 *
 * It must only be exposed through an authorized
 * admin/compliance route.
 */

export async function verifyTaxCode({
  kycId,
  adminUserId,
}) {
  assertKycId(kycId);
  assertUserId(adminUserId);

  return prisma.$transaction(
    async (tx) => {
      const kyc =
        await tx.kyc.findUnique({
          where: {
            id: kycId,
          },
        });

      if (!kyc) {
        const error =
          new Error(
            "KYC record not found.",
          );

        error.statusCode = 404;

        throw error;
      }

      const tin =
        normalizeOptionalString(
          kyc.taxIdentificationNumber,
        );

      if (!tin) {
        const error =
          new Error(
            "A Tax Identification Number must be submitted before it can be verified.",
          );

        error.statusCode = 400;

        throw error;
      }

      if (
        kyc.taxCodeVerified
      ) {
        return serializeKyc(kyc);
      }

      const now =
        new Date();

      const updated =
        await tx.kyc.update({
          where: {
            id: kyc.id,
          },

          data: {
            taxCodeVerified:
              true,

            taxCodeVerifiedAt:
              now,
          },
        });

      await tx.auditLog.create({
        data: {
          user: {
            connect: {
              id: kyc.userId,
            },
          },

          admin: {
            connect: {
              id: adminUserId,
            },
          },

          action:
            "UPDATE",

          entity:
            "Kyc",

          entityId:
            kyc.id,

          metadata: {
            action:
              "TIN_VERIFIED",

            previousTaxCodeVerified:
              Boolean(
                kyc.taxCodeVerified,
              ),

            newTaxCodeVerified:
              true,

            taxCodeVerifiedAt:
              now.toISOString(),

            hasTin:
              true,
          },
        },
      });

      logger.security(
        "KYC TIN verified",
        {
          kycId:
            kyc.id,

          customerUserId:
            kyc.userId,

          adminUserId,

          taxCodeVerified:
            true,
        },
      );

      return serializeKyc(updated);
    },
    {
      isolationLevel:
        "Serializable",
    },
  );
}

/*
|--------------------------------------------------------------------------
| VERIFY AML CODE
|--------------------------------------------------------------------------
*/

/**
 * Verify a customer's AML compliance code.
 *
 * Customers cannot call this function.
 *
 * It must only be exposed through an authorized
 * admin/compliance route.
 */

export async function verifyAmlCode({
  kycId,
  adminUserId,
}) {
  assertKycId(kycId);
  assertUserId(adminUserId);

  return prisma.$transaction(
    async (tx) => {
      const kyc =
        await tx.kyc.findUnique({
          where: {
            id: kycId,
          },
        });

      if (!kyc) {
        const error =
          new Error(
            "KYC record not found.",
          );

        error.statusCode = 404;

        throw error;
      }

      const amlCode =
        normalizeOptionalString(
          kyc.amlCode,
        );

      if (!amlCode) {
        const error =
          new Error(
            "An AML code must be submitted before it can be verified.",
          );

        error.statusCode = 400;

        throw error;
      }

      if (
        kyc.amlCodeVerified
      ) {
        return serializeKyc(kyc);
      }

      const now =
        new Date();

      const updated =
        await tx.kyc.update({
          where: {
            id: kyc.id,
          },

          data: {
            amlCodeVerified:
              true,

            amlCodeVerifiedAt:
              now,
          },
        });

      await tx.auditLog.create({
        data: {
          user: {
            connect: {
              id: kyc.userId,
            },
          },

          admin: {
            connect: {
              id: adminUserId,
            },
          },

          action:
            "UPDATE",

          entity:
            "Kyc",

          entityId:
            kyc.id,

          metadata: {
            action:
              "AML_CODE_VERIFIED",

            previousAmlCodeVerified:
              Boolean(
                kyc.amlCodeVerified,
              ),

            newAmlCodeVerified:
              true,

            amlCodeVerifiedAt:
              now.toISOString(),

            hasAmlCode:
              true,
          },
        },
      });

      logger.security(
        "KYC AML code verified",
        {
          kycId:
            kyc.id,

          customerUserId:
            kyc.userId,

          adminUserId,

          amlCodeVerified:
            true,
        },
      );

      return serializeKyc(updated);
    },
    {
      isolationLevel:
        "Serializable",
    },
  );
}

/*
|--------------------------------------------------------------------------
| VERIFY CFT CODE
|--------------------------------------------------------------------------
*/

/**
 * Verify a customer's CFT compliance code.
 *
 * Customers cannot call this function.
 *
 * It must only be exposed through an authorized
 * admin/compliance route.
 */

export async function verifyCftCode({
  kycId,
  adminUserId,
}) {
  assertKycId(kycId);
  assertUserId(adminUserId);

  return prisma.$transaction(
    async (tx) => {
      const kyc =
        await tx.kyc.findUnique({
          where: {
            id: kycId,
          },
        });

      if (!kyc) {
        const error =
          new Error(
            "KYC record not found.",
          );

        error.statusCode = 404;

        throw error;
      }

      const cftCode =
        normalizeOptionalString(
          kyc.cftCode,
        );

      if (!cftCode) {
        const error =
          new Error(
            "A CFT code must be submitted before it can be verified.",
          );

        error.statusCode = 400;

        throw error;
      }

      if (
        kyc.cftCodeVerified
      ) {
        return serializeKyc(kyc);
      }

      const now =
        new Date();

      const updated =
        await tx.kyc.update({
          where: {
            id: kyc.id,
          },

          data: {
            cftCodeVerified:
              true,

            cftCodeVerifiedAt:
              now,
          },
        });

      await tx.auditLog.create({
        data: {
          user: {
            connect: {
              id: kyc.userId,
            },
          },

          admin: {
            connect: {
              id: adminUserId,
            },
          },

          action:
            "UPDATE",

          entity:
            "Kyc",

          entityId:
            kyc.id,

          metadata: {
            action:
              "CFT_CODE_VERIFIED",

            previousCftCodeVerified:
              Boolean(
                kyc.cftCodeVerified,
              ),

            newCftCodeVerified:
              true,

            cftCodeVerifiedAt:
              now.toISOString(),

            hasCftCode:
              true,
          },
        },
      });

      logger.security(
        "KYC CFT code verified",
        {
          kycId:
            kyc.id,

          customerUserId:
            kyc.userId,

          adminUserId,

          cftCodeVerified:
            true,
        },
      );

      return serializeKyc(updated);
    },
    {
      isolationLevel:
        "Serializable",
    },
  );
}

/*
|--------------------------------------------------------------------------
| REJECT KYC
|--------------------------------------------------------------------------
*/

/**
 * Reject a KYC application with a mandatory reason.
 */

export async function rejectKyc({
  kycId,
  adminUserId,
  rejectionReason,
}) {
  assertKycId(kycId);
  assertUserId(adminUserId);

  const normalizedReason =
    requireString(
      rejectionReason,
      "Rejection reason",
    );

  if (
    normalizedReason.length >
    1000
  ) {
    const error =
      new Error(
        "Rejection reason cannot exceed 1000 characters.",
      );

    error.statusCode = 400;

    throw error;
  }

  return prisma.$transaction(
    async (tx) => {
      const kyc =
        await tx.kyc.findUnique({
          where: {
            id: kycId,
          },
        });

      if (!kyc) {
        const error =
          new Error(
            "KYC record not found.",
          );

        error.statusCode = 404;

        throw error;
      }

      if (
        ![
          KYC_STATUS.PENDING,
          KYC_STATUS.UNDER_REVIEW,
        ].includes(kyc.status)
      ) {
        const error =
          new Error(
            `KYC cannot be rejected from ${kyc.status}.`,
          );

        error.statusCode = 409;

        throw error;
      }

      const updated =
        await tx.kyc.update({
          where: {
            id: kyc.id,
          },

          data: {
            status:
              KYC_STATUS.REJECTED,

            rejectionReason:
              normalizedReason,

            reviewedAt:
              new Date(),

            verifiedAt:
              null,
          },
        });

      await tx.auditLog.create({
        data: {
          user: {
            connect: {
              id: kyc.userId,
            },
          },

          admin: {
            connect: {
              id: adminUserId,
            },
          },

          action:
            "REJECT",

          entity:
            "Kyc",

          entityId:
            kyc.id,

          metadata: {
            action:
              "KYC_REJECTED",

            previousStatus:
              kyc.status,

            newStatus:
              updated.status,

            reason:
              normalizedReason,

            hasTin:
              Boolean(
                kyc.taxIdentificationNumber,
              ),

            taxCodeVerified:
              Boolean(
                kyc.taxCodeVerified,
              ),

            hasAmlCode:
              Boolean(
                kyc.amlCode,
              ),

            amlCodeVerified:
              Boolean(
                kyc.amlCodeVerified,
              ),

            hasCftCode:
              Boolean(
                kyc.cftCode,
              ),

            cftCodeVerified:
              Boolean(
                kyc.cftCodeVerified,
              ),
          },
        },
      });

      logger.security(
        "KYC rejected",
        {
          kycId,

          customerUserId:
            kyc.userId,

          adminUserId,
        },
      );

      return serializeKyc(updated);
    },
    {
      isolationLevel:
        "Serializable",
    },
  );
}

/*
|--------------------------------------------------------------------------
| ADMIN KYC QUERIES
|--------------------------------------------------------------------------
*/

/**
 * List KYC applications for administrative workflows.
 */

export async function listKycApplications({
  status,
  page = 1,
  limit = 20,
}) {
  const parsedPage =
    Math.max(
      Number(page) || 1,
      1,
    );

  const parsedLimit =
    Math.min(
      Math.max(
        Number(limit) || 20,
        1,
      ),
      100,
    );

  const where = {};

  if (status) {
    where.status = status;
  }

  const [
    items,
    total,
  ] =
    await prisma.$transaction([
      prisma.kyc.findMany({
        where,

        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              status: true,
              createdAt: true,
            },
          },
        },

        orderBy: {
          createdAt:
            "desc",
        },

        skip:
          (parsedPage - 1) *
          parsedLimit,

        take:
          parsedLimit,
      }),

      prisma.kyc.count({
        where,
      }),
    ]);

  return {
    items:
      items.map(
        (item) => ({
          ...serializeKyc(item),
          user:
            item.user,
        }),
      ),

    pagination: {
      page:
        parsedPage,

      limit:
        parsedLimit,

      total,

      totalPages:
        Math.ceil(
          total /
          parsedLimit,
        ),
    },
  };
}

/*
|--------------------------------------------------------------------------
| GET KYC FOR ADMIN
|--------------------------------------------------------------------------
*/

/**
 * Get a KYC application for an administrator.
 */

export async function getKycForAdmin(
  kycId,
) {
  assertKycId(kycId);

  const kyc =
    await prisma.kyc.findUnique({
      where: {
        id: kycId,
      },

      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true,
            profile: true,
          },
        },
      },
    });

  if (!kyc) {
    const error =
      new Error(
        "KYC record not found.",
      );

    error.statusCode = 404;

    throw error;
  }

  return {
    ...serializeKyc(kyc),
    user:
      kyc.user,
  };
}

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

const kycService = {
  getOrCreateKyc,

  getKycByUserId,

  getKycById,

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
};

export default kycService;
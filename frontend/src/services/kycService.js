import api from "./api.js";

/**
 * Epex Bank — KYC API service
 *
 * KYC records are authoritative backend records.
 * The frontend never marks a customer as verified locally.
 */

const unwrap = (response) => response?.data ?? response;

const requireId = (value, label) => {
  if (!value) {
    throw new Error(`${label} is required.`);
  }

  return value;
};

/* =========================================================
   KYC RECORD
========================================================= */

export const getKyc = async () => {
  const response = await api.get("/kyc");

  return unwrap(response);
};

export const getKycStatus = async () => {
  const response = await api.get("/kyc/status");

  return unwrap(response);
};

/* =========================================================
   START / SUBMIT KYC
========================================================= */

export const startKyc = async (data = {}) => {
  const response = await api.post(
    "/kyc/start",
    data,
  );

  return unwrap(response);
};

export const submitKyc = async (data) => {
  if (!data || typeof data !== "object") {
    throw new Error("KYC information is required.");
  }

  const response = await api.post(
    "/kyc",
    data,
  );

  return unwrap(response);
};

export const updateKyc = async (data) => {
  if (!data || typeof data !== "object") {
    throw new Error("KYC information is required.");
  }

  const response = await api.patch(
    "/kyc",
    data,
  );

  return unwrap(response);
};

/* =========================================================
   DOCUMENTS
========================================================= */

export const getKycDocuments = async () => {
  const response = await api.get(
    "/kyc/documents",
  );

  return unwrap(response);
};

export const submitKycDocuments = async (
  data,
) => {
  if (!data || typeof data !== "object") {
    throw new Error(
      "KYC document information is required.",
    );
  }

  const response = await api.post(
    "/kyc/documents",
    data,
  );

  return unwrap(response);
};

export const uploadKycDocument = async (
  data,
) => {
  if (!data) {
    throw new Error("A KYC document is required.");
  }

  const isFormData =
    typeof FormData !== "undefined" &&
    data instanceof FormData;

  const response = await api.post(
    "/kyc/documents",
    data,
    isFormData
      ? {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      : undefined,
  );

  return unwrap(response);
};

export const deleteKycDocument = async (
  documentId,
) => {
  requireId(documentId, "Document ID");

  const response = await api.delete(
    `/kyc/documents/${encodeURIComponent(
      documentId,
    )}`,
  );

  return unwrap(response);
};

/* =========================================================
   RESUBMISSION
========================================================= */

export const resubmitKyc = async (data = {}) => {
  const response = await api.post(
    "/kyc/resubmit",
    data,
  );

  return unwrap(response);
};

/* =========================================================
   ADMIN KYC
========================================================= */

export const getAdminKycRecords = async (
  params = {},
) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();

  const response = await api.get(
    `/admin/kyc${query ? `?${query}` : ""}`,
  );

  return unwrap(response);
};

export const getAdminKyc = async (kycId) => {
  requireId(kycId, "KYC ID");

  const response = await api.get(
    `/admin/kyc/${encodeURIComponent(kycId)}`,
  );

  return unwrap(response);
};

export const reviewKyc = async (
  kycId,
  data,
) => {
  requireId(kycId, "KYC ID");

  if (!data || typeof data !== "object") {
    throw new Error("KYC review information is required.");
  }

  const response = await api.patch(
    `/admin/kyc/${encodeURIComponent(kycId)}/review`,
    data,
  );

  return unwrap(response);
};

/* =========================================================
   ERROR HELPER
========================================================= */

export const getKycErrorMessage = (
  error,
  fallback = "Unable to complete the KYC request.",
) => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
};

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  getKyc,
  getKycStatus,
  startKyc,
  submitKyc,
  updateKyc,
  getKycDocuments,
  submitKycDocuments,
  uploadKycDocument,
  deleteKycDocument,
  resubmitKyc,
  getAdminKycRecords,
  getAdminKyc,
  reviewKyc,
  getKycErrorMessage,
};
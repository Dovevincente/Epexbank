import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileText,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import api from "../../services/api.js";

const normalizeKyc = (payload) => {
  if (!payload) return null;

  if (payload.kyc) return payload.kyc;
  if (payload.data?.kyc) return payload.data.kyc;

  if (payload.data && !Array.isArray(payload.data)) {
    return payload.data;
  }

  return payload;
};

const normalizeDocuments = (kyc) => {
  if (Array.isArray(kyc?.documents)) return kyc.documents;
  if (Array.isArray(kyc?.submittedDocuments)) {
    return kyc.submittedDocuments;
  }
  if (Array.isArray(kyc?.files)) return kyc.files;

  return [];
};

const normalizeRequirements = (kyc) => {
  if (Array.isArray(kyc?.requirements)) return kyc.requirements;
  if (Array.isArray(kyc?.requiredDocuments)) {
    return kyc.requiredDocuments;
  }

  return [];
};

const getDocumentId = (document) =>
  document?.id ||
  document?.documentId ||
  document?.fileId ||
  null;

const getDocumentName = (document) =>
  document?.name ||
  document?.documentName ||
  document?.type ||
  document?.documentType ||
  "Verification document";

const getDocumentStatus = (document) =>
  String(
    document?.status ||
      document?.verificationStatus ||
      document?.state ||
      "PENDING",
  ).toUpperCase();

const getRequirementId = (requirement) => {
  if (typeof requirement === "string") return requirement;

  return (
    requirement?.id ||
    requirement?.documentType ||
    requirement?.type ||
    requirement?.code ||
    null
  );
};

const getRequirementName = (requirement) => {
  if (typeof requirement === "string") return requirement;

  return (
    requirement?.name ||
    requirement?.title ||
    requirement?.documentName ||
    requirement?.type ||
    "Required document"
  );
};

const formatStatus = (status) => status.replaceAll("_", " ");

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

const statusClasses = (status) => {
  if (["APPROVED", "VERIFIED", "COMPLETED"].includes(status)) {
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (
    ["PENDING", "IN_REVIEW", "PROCESSING", "SUBMITTED"].includes(status)
  ) {
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (["REJECTED", "EXPIRED", "FAILED"].includes(status)) {
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
  }

  return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
};

const StatusIcon = ({ status }) => {
  if (["APPROVED", "VERIFIED", "COMPLETED"].includes(status)) {
    return <CheckCircle2 size={17} />;
  }

  if (
    ["PENDING", "IN_REVIEW", "PROCESSING", "SUBMITTED"].includes(status)
  ) {
    return <Clock3 size={17} />;
  }

  if (["REJECTED", "EXPIRED", "FAILED"].includes(status)) {
    return <XCircle size={17} />;
  }

  return <FileCheck2 size={17} />;
};

const KycDocuments = () => {
  const fileInputRef = useRef(null);

  const [kyc, setKyc] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [requirements, setRequirements] = useState([]);

  const [selectedRequirement, setSelectedRequirement] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const fetchDocuments = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");
    setMessage("");

    try {
      const response = await api.get("/kyc");

      const nextKyc = normalizeKyc(response?.data);
      const nextDocuments = normalizeDocuments(nextKyc);
      const nextRequirements = normalizeRequirements(nextKyc);

      setKyc(nextKyc);
      setDocuments(nextDocuments);
      setRequirements(nextRequirements);
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 404) {
        setKyc(null);
        setDocuments([]);
        setRequirements([]);
        setError(
          "No KYC profile has been created for your account yet.",
        );
      } else if (status === 501) {
        setError(
          "KYC document management is not available from the banking API yet.",
        );
      } else {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load your verification documents.",
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const documentByRequirement = useMemo(() => {
    const map = new Map();

    documents.forEach((document) => {
      const type =
        document?.documentType ||
        document?.type ||
        document?.requirementId ||
        document?.requirementType ||
        null;

      if (type) {
        map.set(String(type).toUpperCase(), document);
      }
    });

    return map;
  }, [documents]);

  const kycStatus = String(
    kyc?.status ||
      kyc?.kycStatus ||
      kyc?.verificationStatus ||
      "PENDING",
  ).toUpperCase();

  const verified = ["APPROVED", "VERIFIED", "COMPLETED"].includes(
    kycStatus,
  );

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setError("");
    setMessage("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
      setSelectedFile(null);
      setError("The selected file is larger than the 10 MB limit.");
      event.target.value = "";
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      setSelectedFile(null);
      setError("Only PDF, JPG, and PNG documents are supported.");
      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!selectedRequirement) {
      setError("Select the type of verification document you are submitting.");
      return;
    }

    if (!selectedFile) {
      setError("Select a document file to upload.");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

      formData.append("document", selectedFile);
      formData.append("documentType", selectedRequirement);

      /*
       * Do not manually set Content-Type here.
       * Axios/browser will add the correct multipart boundary.
       */
      const response = await api.post("/kyc/documents", formData);

      setMessage(
        response?.data?.message ||
          "Your verification document has been submitted.",
      );

      clearSelectedFile();
      setSelectedRequirement("");

      await fetchDocuments(true);
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 404 || status === 501) {
        setError(
          "KYC document upload is not available from the banking API yet.",
        );
      } else {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to upload the verification document.",
        );
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (document) => {
    const documentId = getDocumentId(document);

    if (!documentId) {
      setError("This document cannot be identified for removal.");
      return;
    }

    const confirmed = window.confirm(
      "Remove this verification document? This action cannot be undone.",
    );

    if (!confirmed) return;

    setDeletingId(String(documentId));
    setError("");
    setMessage("");

    try {
      const response = await api.delete(
        `/kyc/documents/${encodeURIComponent(documentId)}`,
      );

      setMessage(
        response?.data?.message ||
          "The verification document has been removed.",
      );

      await fetchDocuments(true);
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 404 || status === 501) {
        setError(
          "Document removal is not available from the banking API yet.",
        );
      } else {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to remove the verification document.",
        );
      }
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative p-6 sm:p-8">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-blue-100/70 blur-3xl dark:bg-blue-950/30" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <Link
                  to="/kyc"
                  className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Back to identity verification"
                >
                  <ArrowLeft size={18} />
                </Link>

                <div>
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    <FileText size={22} />
                  </div>

                  <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Verification documents
                  </h1>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Submit and manage the documents required for your Epex
                    Bank identity verification.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchDocuments(true)}
                disabled={loading || refreshing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <RefreshCw
                  size={17}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>
        </section>

        {/* Messages */}
        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex items-start gap-3">
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <p className="flex-1">{error}</p>
              <button
                type="button"
                onClick={() => fetchDocuments(true)}
                className="shrink-0 font-bold underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          </section>
        )}

        {message && (
          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
              <p>{message}</p>
            </div>
          </section>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
            <div className="h-96 animate-pulse rounded-3xl bg-white dark:bg-slate-900" />
            <div className="h-96 animate-pulse rounded-3xl bg-white dark:bg-slate-900" />
          </div>
        ) : (
          <>
            {/* Upload */}
            <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.1fr]">
              <form
                onSubmit={handleUpload}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                    <Upload size={19} />
                  </div>

                  <div>
                    <h2 className="font-bold">Submit a document</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload a document requested by the verification service.
                    </p>
                  </div>
                </div>

                {verified && (
                  <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        size={19}
                        className="mt-0.5 shrink-0 text-emerald-600"
                      />
                      <p className="text-sm leading-6 text-emerald-700 dark:text-emerald-300">
                        Your identity is currently verified. Only upload a new
                        document if Epex Bank has requested an updated or
                        replacement document.
                      </p>
                    </div>
                  </div>
                )}

                <div className="mt-7 space-y-5">
                  <div>
                    <label
                      htmlFor="document-type"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Document type
                    </label>

                    <select
                      id="document-type"
                      value={selectedRequirement}
                      onChange={(event) =>
                        setSelectedRequirement(event.target.value)
                      }
                      disabled={uploading}
                      className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
                    >
                      <option value="">Select document type</option>

                      {requirements.map((requirement, index) => {
                        const id = getRequirementId(requirement);

                        if (!id) return null;

                        return (
                          <option
                            key={`${id}-${index}`}
                            value={id}
                          >
                            {getRequirementName(requirement)}
                          </option>
                        );
                      })}

                      {requirements.length === 0 &&
                        documents.map((document, index) => {
                          const type =
                            document?.documentType ||
                            document?.type ||
                            document?.name;

                          if (!type) return null;

                          return (
                            <option
                              key={`${type}-${index}`}
                              value={type}
                            >
                              {getDocumentName(document)}
                            </option>
                          );
                        })}
                    </select>

                    {requirements.length === 0 && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        No explicit document requirements were returned by the
                        KYC service.
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="mb-2 block text-sm font-semibold">
                      Document file
                    </span>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={handleFileChange}
                      disabled={uploading}
                      className="sr-only"
                      id="kyc-document-file"
                    />

                    {!selectedFile ? (
                      <label
                        htmlFor="kyc-document-file"
                        className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center transition hover:border-blue-400 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-blue-700 dark:hover:bg-blue-950/20"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400">
                          <Upload size={22} />
                        </div>

                        <p className="mt-4 text-sm font-bold">
                          Choose a document
                        </p>

                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          PDF, JPG or PNG · maximum 10 MB
                        </p>
                      </label>
                    ) : (
                      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 dark:bg-slate-900 dark:text-blue-400">
                            <FileText size={20} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">
                              {selectedFile.name}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={clearSelectedFile}
                            disabled={uploading}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-white dark:hover:bg-slate-900"
                            aria-label="Remove selected file"
                          >
                            <X size={17} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={
                      uploading ||
                      !selectedRequirement ||
                      !selectedFile
                    }
                    className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <RefreshCw
                          size={18}
                          className="animate-spin"
                        />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={18} />
                        Submit document
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Only upload genuine documents belonging to you. Do not
                  upload passwords, payment-card information, or other
                  unrelated credentials.
                </p>
              </form>

              {/* Requirements */}
              <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="border-b border-slate-100 p-6 dark:border-slate-800 sm:p-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      <FileCheck2 size={19} />
                    </div>

                    <div>
                      <h2 className="font-bold">Required documents</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Requirements returned by your KYC profile.
                      </p>
                    </div>
                  </div>
                </div>

                {requirements.length === 0 ? (
                  <div className="p-6 sm:p-8">
                    <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                      <FileText
                        size={26}
                        className="mx-auto text-slate-400"
                      />

                      <p className="mt-3 text-sm font-semibold">
                        No specific requirements returned
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        The KYC service has not provided a document
                        requirement list.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {requirements.map((requirement, index) => {
                      const id = getRequirementId(requirement);
                      const name = getRequirementName(requirement);

                      const existing =
                        id &&
                        documentByRequirement.get(
                          String(id).toUpperCase(),
                        );

                      const existingStatus = existing
                        ? getDocumentStatus(existing)
                        : "";

                      const completed = [
                        "APPROVED",
                        "VERIFIED",
                        "COMPLETED",
                        "SUBMITTED",
                        "IN_REVIEW",
                      ].includes(existingStatus);

                      return (
                        <div
                          key={`${id || name}-${index}`}
                          className="flex items-center justify-between gap-4 p-5 sm:p-6"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={[
                                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                                completed
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                              ].join(" ")}
                            >
                              {completed ? (
                                <CheckCircle2 size={19} />
                              ) : (
                                <FileText size={19} />
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                {name}
                              </p>

                              {typeof requirement !== "string" &&
                                requirement?.description && (
                                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                    {requirement.description}
                                  </p>
                                )}
                            </div>
                          </div>

                          {existing ? (
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClasses(
                                existingStatus,
                              )}`}
                            >
                              {formatStatus(existingStatus)}
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                              Required
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </section>

            {/* Existing documents */}
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <FileText size={19} />
                  </div>

                  <div>
                    <h2 className="font-bold">Submitted documents</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Review documents already submitted for verification.
                    </p>
                  </div>
                </div>

                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {documents.length} document
                  {documents.length === 1 ? "" : "s"}
                </span>
              </div>

              {documents.length === 0 ? (
                <div className="p-6">
                  <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
                    <FileText
                      size={28}
                      className="mx-auto text-slate-400"
                    />

                    <h3 className="mt-3 text-sm font-bold">
                      No submitted documents
                    </h3>

                    <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
                      Documents you submit through the verification process
                      will appear here.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {documents.map((document, index) => {
                    const documentId = getDocumentId(document);
                    const status = getDocumentStatus(document);
                    const name = getDocumentName(document);

                    return (
                      <div
                        key={documentId || `${name}-${index}`}
                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                            <FileText size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {name}
                            </p>

                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                              {document?.submittedAt && (
                                <span>
                                  Submitted{" "}
                                  {formatDate(document.submittedAt)}
                                </span>
                              )}

                              {document?.updatedAt && (
                                <span>
                                  Updated{" "}
                                  {formatDate(document.updatedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusClasses(
                              status,
                            )}`}
                          >
                            <StatusIcon status={status} />
                            {formatStatus(status)}
                          </span>

                          {documentId && (
                            <button
                              type="button"
                              onClick={() => handleDelete(document)}
                              disabled={
                                deletingId === String(documentId) ||
                                uploading ||
                                ["APPROVED", "VERIFIED"].includes(
                                  status,
                                )
                              }
                              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:hover:border-rose-900/50 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
                              aria-label={`Remove ${name}`}
                              title={
                                ["APPROVED", "VERIFIED"].includes(
                                  status,
                                )
                                  ? "Approved documents cannot be removed here"
                                  : "Remove document"
                              }
                            >
                              {deletingId === String(documentId) ? (
                                <RefreshCw
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Security */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={20}
                  className="mt-0.5 shrink-0 text-emerald-600"
                />

                <div>
                  <h3 className="text-sm font-bold">
                    Document security
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    Upload verification documents only through your
                    authenticated Epex Bank account. Accepted files are
                    limited to PDF, JPG, and PNG formats up to 10 MB. Never
                    upload passwords, one-time passcodes, private keys, or
                    payment-card security information.
                  </p>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default KycDocuments;
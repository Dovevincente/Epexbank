import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";

const STATUS_CONFIG = {
  APPROVED: {
    label: "Approved",
    description:
      "Your identity verification has been successfully approved.",
    icon: CheckCircle2,
    tone: "success",
  },
  VERIFIED: {
    label: "Verified",
    description:
      "Your identity has been verified and your KYC process is complete.",
    icon: CheckCircle2,
    tone: "success",
  },
  COMPLETED: {
    label: "Completed",
    description:
      "Your identity verification process has been completed successfully.",
    icon: CheckCircle2,
    tone: "success",
  },
  PENDING: {
    label: "Pending",
    description:
      "Your verification request has been submitted and is waiting for review.",
    icon: Clock3,
    tone: "warning",
  },
  IN_REVIEW: {
    label: "In review",
    description:
      "Your submitted information is currently being reviewed.",
    icon: Clock3,
    tone: "warning",
  },
  PROCESSING: {
    label: "Processing",
    description:
      "Your verification information is currently being processed.",
    icon: Clock3,
    tone: "warning",
  },
  REQUIRES_ACTION: {
    label: "Action required",
    description:
      "Additional information or documents are required to complete verification.",
    icon: AlertCircle,
    tone: "danger",
  },
  REJECTED: {
    label: "Rejected",
    description:
      "Your verification request was not approved. Review the reason provided and submit the required information again.",
    icon: XCircle,
    tone: "danger",
  },
  EXPIRED: {
    label: "Expired",
    description:
      "Your verification request has expired and may need to be submitted again.",
    icon: AlertCircle,
    tone: "danger",
  },
  FAILED: {
    label: "Failed",
    description:
      "The verification process could not be completed. You may need to start the process again.",
    icon: XCircle,
    tone: "danger",
  },
};

const normalizeKycResponse = (responseData) => {
  const root = responseData?.data ?? responseData ?? {};

  const profile =
    root?.kyc ??
    root?.profile ??
    root?.verification ??
    (root?.status || root?.kycStatus ? root : null);

  const documents = Array.isArray(root?.documents)
    ? root.documents
    : Array.isArray(profile?.documents)
      ? profile.documents
      : [];

  const requirements = Array.isArray(root?.requirements)
    ? root.requirements
    : Array.isArray(profile?.requirements)
      ? profile.requirements
      : [];

  return {
    profile,
    documents,
    requirements,
  };
};

const formatStatus = (status) => {
  if (!status) return "Not started";

  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getDocumentStatus = (document) =>
  String(
    document?.status ??
      document?.state ??
      document?.verificationStatus ??
      "",
  ).toUpperCase();

const isDocumentComplete = (document) =>
  ["APPROVED", "VERIFIED", "COMPLETED", "ACCEPTED"].includes(
    getDocumentStatus(document),
  );

const KycStatus = () => {
  const [kyc, setKyc] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadKyc = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/kyc");

      const normalized = normalizeKycResponse(response?.data);

      setKyc(normalized.profile);
      setDocuments(normalized.documents);
      setRequirements(normalized.requirements);
    } catch (requestError) {
      if (requestError?.response?.status === 404) {
        setKyc(null);
        setDocuments([]);
        setRequirements([]);
      } else {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load your verification status.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKyc();
  }, [loadKyc]);

  const status = String(
    kyc?.status ?? kyc?.kycStatus ?? "",
  ).toUpperCase();

  const config = STATUS_CONFIG[status];

  const StatusIcon = config?.icon ?? ShieldCheck;

  const tone = config?.tone ?? "neutral";

  const isApproved = ["APPROVED", "VERIFIED", "COMPLETED"].includes(status);

  const isPending = ["PENDING", "IN_REVIEW", "PROCESSING"].includes(status);

  const needsAction = [
    "REQUIRES_ACTION",
    "REJECTED",
    "EXPIRED",
    "FAILED",
  ].includes(status);

  const completedDocuments = useMemo(
    () => documents.filter(isDocumentComplete).length,
    [documents],
  );

  const completedRequirements = useMemo(
    () =>
      requirements.filter((requirement) => {
        const requirementStatus = String(
          requirement?.status ?? requirement?.state ?? "",
        ).toUpperCase();

        return (
          requirement?.completed === true ||
          requirement?.satisfied === true ||
          ["APPROVED", "VERIFIED", "COMPLETED", "SATISFIED"].includes(
            requirementStatus,
          )
        );
      }).length,
    [requirements],
  );

  const statusStyles = {
    success: {
      wrapper:
        "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20",
      icon: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
      title: "text-emerald-950 dark:text-emerald-300",
      text: "text-emerald-800 dark:text-emerald-400",
      badge:
        "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
    },
    warning: {
      wrapper:
        "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20",
      icon: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
      title: "text-amber-950 dark:text-amber-300",
      text: "text-amber-800 dark:text-amber-400",
      badge:
        "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    },
    danger: {
      wrapper:
        "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/20",
      icon: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
      title: "text-red-950 dark:text-red-300",
      text: "text-red-800 dark:text-red-400",
      badge:
        "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300",
    },
    neutral: {
      wrapper:
        "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900",
      icon: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      title: "text-slate-950 dark:text-white",
      text: "text-slate-600 dark:text-slate-400",
      badge:
        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    },
  };

  const currentStyles = statusStyles[tone];

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />

            <div className="h-52 rounded-3xl bg-slate-200 dark:bg-slate-800" />

            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-28 rounded-2xl bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="h-72 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />
              Identity verification
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Verification status
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
              Review the current status of your identity verification and any
              information required from you.
            </p>
          </div>

          <button
            type="button"
            onClick={loadKyc}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">Unable to load verification</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>

            <button
              type="button"
              onClick={loadKyc}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-semibold transition hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/30"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        )}

        {/* No KYC profile */}
        {!kyc && !error && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                <ShieldCheck className="h-8 w-8" />
              </div>

              <h2 className="mt-5 text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
                Verification has not started
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                Start your identity verification to provide the information
                required for eligible Epex Bank services.
              </p>

              <Link
                to="/kyc/start"
                className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
              >
                Start verification
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}

        {/* Current status */}
        {kyc && (
          <>
            <section
              className={`rounded-3xl border p-5 sm:p-7 ${currentStyles.wrapper}`}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${currentStyles.icon}`}
                >
                  <StatusIcon className="h-7 w-7" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p
                        className={`text-sm font-semibold ${currentStyles.text}`}
                      >
                        Current verification status
                      </p>

                      <h2
                        className={`mt-1 text-xl font-bold ${currentStyles.title} sm:text-2xl`}
                      >
                        {config?.label || formatStatus(status)}
                      </h2>
                    </div>

                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ${currentStyles.badge}`}
                    >
                      {formatStatus(status)}
                    </span>
                  </div>

                  <p
                    className={`mt-3 max-w-3xl text-sm leading-6 ${currentStyles.text}`}
                  >
                    {config?.description ||
                      "Your current verification information is available below."}
                  </p>

                  {kyc?.reference && (
                    <p
                      className={`mt-4 text-xs font-medium ${currentStyles.text}`}
                    >
                      Reference:{" "}
                      <span className="font-bold">{kyc.reference}</span>
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* Action banner */}
            {needsAction && (
              <section className="rounded-3xl border border-red-200 bg-white p-5 shadow-sm dark:border-red-900/50 dark:bg-slate-900 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                    <AlertCircle className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-slate-950 dark:text-white">
                      Additional action may be required
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      Review your verification information and documents to
                      determine what needs to be updated or submitted.
                    </p>

                    {(kyc?.rejectionReason ||
                      kyc?.reason ||
                      kyc?.reviewNote) && (
                      <div className="mt-4 rounded-2xl bg-red-50 p-4 dark:bg-red-950/20">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-400">
                          Review message
                        </p>

                        <p className="mt-1 text-sm leading-6 text-red-800 dark:text-red-300">
                          {kyc?.rejectionReason ??
                            kyc?.reason ??
                            kyc?.reviewNote}
                        </p>
                      </div>
                    )}

                    <Link
                      to="/kyc/documents"
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-500"
                    >
                      Review documents
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </section>
            )}

            {/* Status summary */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                    <FileCheck2 className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Documents
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                      {completedDocuments}/{documents.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Requirements
                    </p>

                    <p className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                      {completedRequirements}/{requirements.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Submitted
                </p>

                <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">
                  {formatDate(
                    kyc?.submittedAt ??
                      kyc?.createdAt ??
                      kyc?.created_at,
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Last updated
                </p>

                <p className="mt-2 text-sm font-bold text-slate-950 dark:text-white">
                  {formatDate(
                    kyc?.updatedAt ??
                      kyc?.reviewedAt ??
                      kyc?.updated_at,
                  )}
                </p>
              </div>
            </div>

            {/* Verification timeline */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">
                  Verification timeline
                </h2>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Important events associated with your verification.
                </p>
              </div>

              <div className="mt-6 space-y-5">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                      <ShieldCheck className="h-4 w-4" />
                    </div>

                    <div className="mt-2 h-full w-px bg-slate-200 dark:bg-slate-800" />
                  </div>

                  <div className="pb-5">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      Verification profile created
                    </p>

                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      {formatDate(kyc?.createdAt ?? kyc?.created_at)}
                    </p>
                  </div>
                </div>

                {kyc?.submittedAt && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                        <FileCheck2 className="h-4 w-4" />
                      </div>

                      <div className="mt-2 h-full w-px bg-slate-200 dark:bg-slate-800" />
                    </div>

                    <div className="pb-5">
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Verification submitted
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(kyc.submittedAt)}
                      </p>
                    </div>
                  </div>
                )}

                {kyc?.reviewedAt && (
                  <div className="flex gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        Verification reviewed
                      </p>

                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(kyc.reviewedAt)}
                      </p>
                    </div>
                  </div>
                )}

                {!kyc?.submittedAt && !kyc?.reviewedAt && (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-slate-950/50 dark:text-slate-400">
                    Your verification timeline will appear here as the process
                    progresses.
                  </div>
                )}
              </div>
            </section>

            {/* Requirements */}
            {requirements.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-bold text-slate-950 dark:text-white">
                      Verification requirements
                    </h2>

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Requirements associated with your verification profile.
                    </p>
                  </div>

                  <Link
                    to="/kyc/documents"
                    className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline dark:text-blue-400"
                  >
                    Manage documents
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-5 space-y-3">
                  {requirements.map((requirement, index) => {
                    const requirementStatus = String(
                      requirement?.status ?? requirement?.state ?? "",
                    ).toUpperCase();

                    const complete =
                      requirement?.completed === true ||
                      requirement?.satisfied === true ||
                      [
                        "APPROVED",
                        "VERIFIED",
                        "COMPLETED",
                        "SATISFIED",
                      ].includes(requirementStatus);

                    return (
                      <div
                        key={
                          requirement?.id ??
                          requirement?.code ??
                          `${requirement?.name ?? "requirement"}-${index}`
                        }
                        className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50"
                      >
                        {complete ? (
                          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white">
                            {requirement?.name ??
                              requirement?.title ??
                              requirement?.type ??
                              requirement?.code ??
                              "Verification requirement"}
                          </p>

                          {(requirement?.description ||
                            requirement?.details) && (
                            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                              {requirement?.description ??
                                requirement?.details}
                            </p>
                          )}
                        </div>

                        <span className="shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400">
                          {complete ? "Complete" : "Pending"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Submitted documents */}
            {documents.length > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-bold text-slate-950 dark:text-white">
                      Submitted documents
                    </h2>

                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Documents currently associated with your verification.
                    </p>
                  </div>

                  <Link
                    to="/kyc/documents"
                    className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline dark:text-blue-400"
                  >
                    Manage documents
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>

                <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  {documents.map((document, index) => {
                    const documentStatus = getDocumentStatus(document);
                    const complete = isDocumentComplete(document);

                    return (
                      <div
                        key={
                          document?.id ??
                          document?.documentId ??
                          `${document?.type ?? "document"}-${index}`
                        }
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <FileCheck2 className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {document?.name ??
                                document?.title ??
                                document?.documentType ??
                                document?.type ??
                                "Identity document"}
                            </p>

                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(
                                document?.submittedAt ??
                                  document?.createdAt ??
                                  document?.uploadedAt,
                              )}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex w-fit rounded-full px-3 py-1.5 text-xs font-bold ${
                            complete
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {formatStatus(documentStatus) || "Submitted"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Approved action */}
            {isApproved && (
              <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-6">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />

                  <div>
                    <h2 className="font-bold text-emerald-950 dark:text-emerald-300">
                      Your identity has been verified
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-emerald-800 dark:text-emerald-400">
                      Your verification is complete. You can continue using
                      the Epex Bank services available to your account.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Pending action */}
            {isPending && (
              <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20 sm:p-6">
                <div className="flex items-start gap-4">
                  <Clock3 className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />

                  <div>
                    <h2 className="font-bold text-amber-950 dark:text-amber-300">
                      No further submission is required right now
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-400">
                      Your verification is already being processed or reviewed.
                      You can return to this page later to check for an updated
                      status.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Security */}
            <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <LockKeyhole className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-950 dark:text-white">
                    Verification security
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Keep your Epex Bank login credentials and verification
                    information private. Never share passwords, OTPs, card PINs,
                    or security codes with another person.
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

export default KycStatus;
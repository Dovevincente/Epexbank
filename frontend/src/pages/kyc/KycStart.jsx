import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import api from "../../services/api.js";

const STATUS_CONFIG = {
  APPROVED: {
    title: "Verification approved",
    description:
      "Your identity verification has already been approved. You can continue using eligible Epex Bank services.",
    icon: CheckCircle2,
  },
  VERIFIED: {
    title: "Verification approved",
    description:
      "Your identity verification has already been approved. You can continue using eligible Epex Bank services.",
    icon: CheckCircle2,
  },
  COMPLETED: {
    title: "Verification completed",
    description:
      "Your identity verification has been completed successfully.",
    icon: CheckCircle2,
  },
  PENDING: {
    title: "Verification is pending",
    description:
      "Your verification request has been submitted and is waiting for review.",
    icon: Clock3,
  },
  IN_REVIEW: {
    title: "Verification is under review",
    description:
      "Our verification team is currently reviewing the information you submitted.",
    icon: Clock3,
  },
  PROCESSING: {
    title: "Verification is being processed",
    description:
      "Your verification information is currently being processed.",
    icon: Clock3,
  },
  REQUIRES_ACTION: {
    title: "Action required",
    description:
      "Additional information or documents are required before your verification can be completed.",
    icon: AlertCircle,
  },
  REJECTED: {
    title: "Verification needs attention",
    description:
      "Your previous verification request was not approved. Review the requirements and submit the requested information again.",
    icon: AlertCircle,
  },
  EXPIRED: {
    title: "Verification has expired",
    description:
      "Your previous verification request is no longer valid. You can start a new verification request.",
    icon: AlertCircle,
  },
  FAILED: {
    title: "Verification could not be completed",
    description:
      "Your previous verification attempt could not be completed. You can start the process again.",
    icon: AlertCircle,
  },
};

const normalizeKycResponse = (responseData) => {
  const root = responseData?.data ?? responseData ?? {};

  const profile =
    root?.kyc ??
    root?.profile ??
    root?.verification ??
    (root?.status || root?.kycStatus ? root : null);

  const requirements = Array.isArray(root?.requirements)
    ? root.requirements
    : Array.isArray(profile?.requirements)
      ? profile.requirements
      : [];

  const documents = Array.isArray(root?.documents)
    ? root.documents
    : Array.isArray(profile?.documents)
      ? profile.documents
      : [];

  return {
    profile,
    requirements,
    documents,
  };
};

const formatStatus = (status) => {
  if (!status) return "Not started";

  return String(status)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const KycStart = () => {
  const navigate = useNavigate();

  const [kyc, setKyc] = useState(null);
  const [requirements, setRequirements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");
  const [startError, setStartError] = useState("");

  const loadKyc = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/kyc");
      const normalized = normalizeKycResponse(response?.data);

      setKyc(normalized.profile);
      setRequirements(normalized.requirements);
      setDocuments(normalized.documents);
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 404) {
        setKyc(null);
        setRequirements([]);
        setDocuments([]);
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

  const statusConfig = STATUS_CONFIG[status];

  const StatusIcon = statusConfig?.icon ?? ShieldCheck;

  const isApproved = ["APPROVED", "VERIFIED", "COMPLETED"].includes(status);

  const isWaiting = ["PENDING", "IN_REVIEW", "PROCESSING"].includes(status);

  const needsAction = [
    "REQUIRES_ACTION",
    "REJECTED",
    "EXPIRED",
    "FAILED",
  ].includes(status);

  const requirementSummary = useMemo(() => {
    if (!requirements.length) {
      return {
        total: 0,
        completed: 0,
        remaining: 0,
      };
    }

    const completed = requirements.filter((item) => {
      const itemStatus = String(
        item?.status ?? item?.state ?? "",
      ).toUpperCase();

      return (
        ["COMPLETED", "APPROVED", "VERIFIED", "SATISFIED"].includes(
          itemStatus,
        ) ||
        item?.completed === true ||
        item?.satisfied === true
      );
    }).length;

    return {
      total: requirements.length,
      completed,
      remaining: Math.max(requirements.length - completed, 0),
    };
  }, [requirements]);

  const startVerification = async () => {
    setStarting(true);
    setStartError("");

    try {
      const response = await api.post("/kyc");

      const normalized = normalizeKycResponse(response?.data);

      if (normalized.profile) {
        setKyc(normalized.profile);
      }

      if (normalized.requirements.length) {
        setRequirements(normalized.requirements);
      }

      if (normalized.documents.length) {
        setDocuments(normalized.documents);
      }

      const responseData = response?.data?.data ?? response?.data ?? {};

      const kycId =
        responseData?.kyc?.id ??
        responseData?.profile?.id ??
        responseData?.verification?.id ??
        responseData?.id;

      if (kycId) {
        navigate("/kyc/documents");
        return;
      }

      navigate("/kyc");
    } catch (requestError) {
      setStartError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Unable to start verification. Please try again.",
      );
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-8rem)] bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 rounded-lg bg-slate-200 dark:bg-slate-800" />
            <div className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
              <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
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
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
            <ShieldCheck className="h-4 w-4" />
            Identity verification
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
            Start verification
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
            Complete your identity verification to access banking services
            that require verified customer information.
          </p>
        </div>

        {/* General load error */}
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

        {/* Existing verification status */}
        {kyc && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                    <StatusIcon className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Current verification status
                    </p>

                    <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                      {statusConfig?.title || formatStatus(status)}
                    </h2>

                    <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {statusConfig?.description ||
                        "Your verification information is available for review."}
                    </p>
                  </div>
                </div>

                <span className="inline-flex w-fit items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {formatStatus(status)}
                </span>
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Documents
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                  {documents.length}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Requirements
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                  {requirementSummary.total}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/50">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Completed
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                  {requirementSummary.completed}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Approved state */}
        {isApproved && (
          <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600 dark:text-emerald-400" />

              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-emerald-950 dark:text-emerald-300">
                  Your verification is complete
                </h3>

                <p className="mt-1 text-sm leading-6 text-emerald-800 dark:text-emerald-400">
                  No further verification is required at this time.
                </p>

                <Link
                  to="/kyc"
                  className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 hover:underline dark:text-emerald-300"
                >
                  View verification details
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Waiting state */}
        {isWaiting && (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/20 sm:p-6">
            <div className="flex items-start gap-4">
              <Clock3 className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" />

              <div>
                <h3 className="font-bold text-amber-950 dark:text-amber-300">
                  Verification is already in progress
                </h3>

                <p className="mt-1 text-sm leading-6 text-amber-800 dark:text-amber-400">
                  You do not need to submit another verification request.
                  Continue from your KYC page to review the current status and
                  submitted information.
                </p>

                <Link
                  to="/kyc"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700"
                >
                  View verification
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Start / restart verification */}
        {!isApproved && !isWaiting && (
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="p-6 sm:p-8">
              <div className="max-w-3xl">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                  <UserRoundCheck className="h-7 w-7" />
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-950 dark:text-white sm:text-2xl">
                  Verify your identity
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                  We need to verify your identity before you can access
                  certain regulated banking services. The process starts with
                  your personal information and required identity documents.
                </p>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <UserRoundCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />

                  <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
                    Confirm your details
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Provide accurate personal information matching your
                    identity documents.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <FileCheck2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />

                  <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
                    Submit documents
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Upload the identity documents required for your account
                    verification.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800">
                  <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400" />

                  <h3 className="mt-4 font-bold text-slate-950 dark:text-white">
                    Verification review
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Your submitted information will be reviewed before your
                    verification status is finalized.
                  </p>
                </div>
              </div>

              {startError && (
                <div
                  role="alert"
                  className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                >
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

                  <div>
                    <p className="font-semibold">
                      Unable to start verification
                    </p>
                    <p className="mt-1 text-sm">{startError}</p>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={startVerification}
                  disabled={starting}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500"
                >
                  {starting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Starting verification...
                    </>
                  ) : (
                    <>
                      Start verification
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <Link
                  to="/kyc"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  View KYC status
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Requirements */}
        {requirements.length > 0 && !isApproved && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-slate-950 dark:text-white">
                  Verification requirements
                </h2>

                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Requirements returned for your verification profile.
                </p>
              </div>

              <Link
                to="/kyc/documents"
                className="hidden items-center gap-1 text-sm font-bold text-blue-700 hover:underline dark:text-blue-400 sm:inline-flex"
              >
                Manage documents
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {requirements.map((requirement, index) => {
                const requirementStatus = String(
                  requirement?.status ??
                    requirement?.state ??
                    "",
                ).toUpperCase();

                const complete =
                  requirement?.completed === true ||
                  requirement?.satisfied === true ||
                  ["COMPLETED", "APPROVED", "VERIFIED", "SATISFIED"].includes(
                    requirementStatus,
                  );

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
                        <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
                          {requirement?.description ?? requirement?.details}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Link
              to="/kyc/documents"
              className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-700 hover:underline dark:text-blue-400 sm:hidden"
            >
              Manage documents
              <ArrowRight className="h-4 w-4" />
            </Link>
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
                Keep your information secure
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Only submit documents through your authenticated Epex Bank
                account. Do not share passwords, one-time passwords, card PINs,
                or security codes with anyone.
              </p>
            </div>
          </div>
        </section>

        {/* Mobile document action */}
        {needsAction && (
          <div className="pb-2 sm:hidden">
            <Link
              to="/kyc/documents"
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white dark:bg-blue-600"
            >
              Review documents
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default KycStart;

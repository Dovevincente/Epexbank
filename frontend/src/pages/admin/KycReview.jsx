import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  Filter,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import api from "../../services/api.js";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "UNDER_REVIEW", label: "Under review" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
];

const PAGE_SIZE = 20;

/* ============================================================
   HELPERS
============================================================ */

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.kyc)) return payload.kyc;
  if (Array.isArray(payload?.kycs)) return payload.kycs;
  if (Array.isArray(payload?.submissions)) {
    return payload.submissions;
  }
  if (Array.isArray(payload?.applications)) {
    return payload.applications;
  }
  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

const normalizeStatus = (value) => {
  const status = String(value ?? "")
    .trim()
    .toUpperCase();

  if (!status) return "PENDING";

  if (
    status === "PENDING_REVIEW" ||
    status === "AWAITING_REVIEW" ||
    status === "SUBMITTED"
  ) {
    return "PENDING";
  }

  if (
    status === "REVIEWING" ||
    status === "IN_REVIEW" ||
    status === "PROCESSING"
  ) {
    return "UNDER_REVIEW";
  }

  if (
    status === "VERIFIED" ||
    status === "APPROVED" ||
    status === "PASSED"
  ) {
    return "VERIFIED";
  }

  if (
    status === "DECLINED" ||
    status === "DENIED" ||
    status === "FAILED"
  ) {
    return "REJECTED";
  }

  return status;
};

const getCustomer = (item) =>
  item?.user ||
  item?.customer ||
  item?.applicant ||
  item?.profile ||
  {};

const getCustomerName = (item) => {
  const customer = getCustomer(item);

  const fullName =
    customer?.name ||
    customer?.fullName ||
    [customer?.firstName, customer?.lastName]
      .filter(Boolean)
      .join(" ");

  return (
    fullName ||
    [item?.firstName, item?.lastName]
      .filter(Boolean)
      .join(" ") ||
    "Customer"
  );
};

const getCustomerEmail = (item) => {
  const customer = getCustomer(item);

  return customer?.email || item?.email || "—";
};

const getKycId = (item) =>
  item?.id ||
  item?.kycId ||
  item?.applicationId ||
  item?.verificationId ||
  "";

const getDocumentType = (item) =>
  item?.documentType ||
  item?.identityDocumentType ||
  item?.document?.type ||
  item?.documents?.[0]?.type ||
  "—";

const getSubmittedAt = (item) =>
  item?.submittedAt ||
  item?.createdAt ||
  item?.submittedOn ||
  item?.created_on ||
  null;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatRelativeDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  const diff = Date.now() - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDate(value);
};

const getStatusMeta = (status) => {
  switch (normalizeStatus(status)) {
    case "VERIFIED":
      return {
        label: "Verified",
        className:
          "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
        icon: CheckCircle2,
      };

    case "REJECTED":
      return {
        label: "Rejected",
        className:
          "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
        icon: XCircle,
      };

    case "UNDER_REVIEW":
      return {
        label: "Under review",
        className:
          "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
        icon: Eye,
      };

    default:
      return {
        label: "Pending",
        className:
          "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
        icon: Clock3,
      };
  }
};

const getSummaryCounts = (items) => {
  return items.reduce(
    (summary, item) => {
      const status = normalizeStatus(
        item?.status || item?.kycStatus,
      );

      summary.total += 1;

      if (status === "PENDING") {
        summary.pending += 1;
      }

      if (status === "UNDER_REVIEW") {
        summary.inReview += 1;
      }

      if (status === "VERIFIED") {
        summary.verified += 1;
      }

      if (status === "REJECTED") {
        summary.rejected += 1;
      }

      return summary;
    },
    {
      total: 0,
      pending: 0,
      inReview: 0,
      verified: 0,
      rejected: 0,
    },
  );
};

const getFileUrl = (fileUrl) => {
  if (!fileUrl) return null;

  if (
    String(fileUrl).startsWith("http://") ||
    String(fileUrl).startsWith("https://")
  ) {
    return fileUrl;
  }

  const baseURL =
    api?.defaults?.baseURL ||
    "http://localhost:5000/api";

  try {
    const parsed = new URL(
      baseURL,
      window.location.origin,
    );

    const origin = parsed.origin;

    const path = String(fileUrl).startsWith("/")
      ? fileUrl
      : `/${fileUrl}`;

    return `${origin}${path}`;
  } catch {
    return fileUrl;
  }
};

const maskComplianceCode = (value) => {
  const code = String(value ?? "").trim();

  if (!code) return "";

  if (code.length <= 4) {
    return "••••";
  }

  return `${"•".repeat(
    Math.min(Math.max(code.length - 4, 4), 12),
  )}${code.slice(-4)}`;
};

/* ============================================================
   FILE PREVIEW
============================================================ */

const FilePreview = ({ title, url }) => {
  const fullUrl = getFileUrl(url);

  if (!fullUrl) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
        <div className="flex items-center gap-3 text-slate-500">
          <ImageIcon className="h-6 w-6" />

          <div>
            <p className="font-semibold text-slate-700">
              {title}
            </p>

            <p className="text-sm">
              No file uploaded.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isImage =
    /\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(
      fullUrl,
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <ImageIcon className="h-5 w-5 text-blue-700" />

          <div>
            <p className="font-semibold text-slate-900">
              {title}
            </p>

            <p className="text-xs text-slate-500">
              Uploaded verification file
            </p>
          </div>
        </div>

        <a
          href={fullUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          Open
        </a>
      </div>

      {isImage ? (
        <div className="bg-slate-50 p-4">
          <img
            src={fullUrl}
            alt={title}
            className="max-h-[500px] w-full rounded-xl object-contain"
          />
        </div>
      ) : (
        <div className="flex min-h-48 items-center justify-center bg-slate-50 p-8">
          <a
            href={fullUrl}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-3 text-blue-700 hover:text-blue-800"
          >
            <FileCheck2 className="h-12 w-12" />

            <span className="font-semibold">
              Open uploaded document
            </span>
          </a>
        </div>
      )}
    </div>
  );
};

/* ============================================================
   COMPLIANCE CODE CARD
============================================================ */

const ComplianceCodeCard = ({
  title,
  description,
  code,
  verified,
  verifiedAt,
  action,
  actionLoading,
  onVerify,
}) => {
  const hasCode = Boolean(
    String(code ?? "").trim(),
  );

  return (
    <section
      className={`rounded-2xl border p-6 shadow-sm ${
        verified
          ? "border-emerald-200 bg-emerald-50"
          : hasCode
            ? "border-amber-200 bg-amber-50"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-xl p-2.5 ${
              verified
                ? "bg-emerald-100 text-emerald-700"
                : hasCode
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {verified ? (
              <BadgeCheck className="h-5 w-5" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
          </div>

          <div>
            <h2 className="font-bold text-slate-900">
              {title}
            </h2>

            <p className="text-xs text-slate-600">
              {description}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
            verified
              ? "bg-emerald-100 text-emerald-700"
              : hasCode
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-200 text-slate-600"
          }`}
        >
          {verified
            ? "Verified"
            : hasCode
              ? "Pending"
              : "Not provided"}
        </span>
      </div>

      <div className="rounded-xl border border-white/80 bg-white/80 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Submitted Code
        </p>

        <p className="mt-2 break-all font-mono text-sm font-bold tracking-wide text-slate-900">
          {hasCode
            ? maskComplianceCode(code)
            : "No code submitted"}
        </p>

        {verified && verifiedAt && (
          <p className="mt-2 text-xs text-emerald-700">
            Verified on {formatDate(verifiedAt)}
          </p>
        )}
      </div>

      {!verified && (
        <div className="mt-4">
          {!hasCode ? (
            <div className="rounded-xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-700">
              <p className="font-semibold">
                No {title} has been submitted.
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                The customer must submit the code before
                it can be verified.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-xs leading-5 text-amber-800">
                Confirm the submitted {title} against
                the appropriate verification information
                before marking it as verified.
              </p>

              <button
                type="button"
                disabled={Boolean(actionLoading)}
                onClick={onVerify}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === action ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BadgeCheck className="h-4 w-4" />
                )}

                Verify {title}
              </button>
            </>
          )}
        </div>
      )}

      {verified && (
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {title} compliance check has passed.
        </div>
      )}
    </section>
  );
};

/* ============================================================
   INDIVIDUAL KYC REVIEW
============================================================ */

const KycApplicationDetail = ({ kycId }) => {
  const navigate = useNavigate();

  const [kyc, setKyc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] =
    useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [rejectionReason, setRejectionReason] =
    useState("");

  const loadKyc = useCallback(async () => {
    if (!kycId) return;

    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/admin/kyc/${kycId}`,
      );

      const data =
        response?.data?.data ||
        response?.data?.kyc ||
        response?.data ||
        null;

      setKyc(data);
    } catch (requestError) {
      console.error(
        "Failed to load KYC:",
        requestError,
      );

      setError(
        requestError?.response?.data?.message ||
          "Unable to load this KYC application.",
      );

      setKyc(null);
    } finally {
      setLoading(false);
    }
  }, [kycId]);

  useEffect(() => {
    loadKyc();
  }, [loadKyc]);

  const performAction = async (action) => {
    try {
      setActionLoading(action);
      setError("");
      setSuccess("");

      if (action === "review") {
        await api.post(
          `/kyc/${kycId}/review`,
        );
      }

      if (action === "approve") {
        await api.post(
          `/kyc/${kycId}/approve`,
        );
      }

      if (action === "verify-tin") {
        await api.post(
          `/kyc/${kycId}/verify-tax-code`,
        );
      }

      if (action === "verify-aml") {
        await api.post(
          `/kyc/${kycId}/verify-aml-code`,
        );
      }

      if (action === "verify-cft") {
        await api.post(
          `/kyc/${kycId}/verify-cft-code`,
        );
      }

      if (action === "reject") {
        const reason =
          rejectionReason.trim();

        if (!reason) {
          setError(
            "Please enter a rejection reason.",
          );

          setActionLoading("");

          return;
        }

        await api.post(
          `/kyc/${kycId}/reject`,
          {
            rejectionReason: reason,
            reason,
          },
        );
      }

      setSuccess(
        action === "approve"
          ? "KYC application approved successfully."
          : action === "review"
            ? "KYC application moved to under review."
            : action === "verify-tin"
              ? "TIN / Tax Code verified successfully."
              : action === "verify-aml"
                ? "AML code verified successfully."
                : action === "verify-cft"
                  ? "CFT code verified successfully."
                  : "KYC application rejected successfully.",
      );

      await loadKyc();
    } catch (requestError) {
      console.error(
        `KYC ${action} failed:`,
        requestError,
      );

      setError(
        requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          `Unable to ${action} this KYC application.`,
      );
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <Loader2 className="h-8 w-8 animate-spin" />

          <p className="font-medium">
            Loading KYC application...
          </p>
        </div>
      </div>
    );
  }

  if (!kyc) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Link
          to="/admin/kyc"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to KYC submissions
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <XCircle className="h-6 w-6 text-red-600" />

            <div>
              <h2 className="font-bold text-red-800">
                Unable to load KYC application
              </h2>

              <p className="mt-1 text-sm text-red-700">
                {error ||
                  "KYC application was not found."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadKyc}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  const customer = getCustomer(kyc);
  const statusMeta = getStatusMeta(
    kyc.status,
  );
  const StatusIcon = statusMeta.icon;

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-6 lg:p-8">
        <div>
          <button
            type="button"
            onClick={() =>
              navigate("/admin/kyc")
            }
            className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to KYC submissions
          </button>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                  KYC Application Review
                </h1>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusMeta.className}`}
                >
                  <StatusIcon className="h-3.5 w-3.5" />
                  {statusMeta.label}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-500">
                Application ID:{" "}
                <span className="font-mono text-slate-700">
                  {kyc.id}
                </span>
              </p>
            </div>

            <button
              type="button"
              onClick={loadKyc}
              disabled={loading || Boolean(actionLoading)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </section>

        {success && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              {success}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              {error}
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6">
            {/* =====================================================
                APPLICANT INFORMATION
            ====================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">
                  <UserRound className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="font-bold text-slate-900">
                    Applicant Information
                  </h2>

                  <p className="text-xs text-slate-500">
                    Customer account details
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Name
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {getCustomerName(kyc)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Email
                  </p>

                  <p className="mt-1 break-all text-sm text-slate-900">
                    {customer?.email || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Phone
                  </p>

                  <p className="mt-1 text-sm text-slate-900">
                    {customer?.phone || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    User ID
                  </p>

                  <p className="mt-1 break-all font-mono text-xs text-slate-700">
                    {customer?.id ||
                      kyc.userId ||
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Account Status
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {customer?.status
                      ? String(
                          customer.status,
                        )
                          .replace(
                            /_/g,
                            " ",
                          )
                          .toLowerCase()
                          .replace(
                            /\b\w/g,
                            (c) =>
                              c.toUpperCase(),
                          )
                      : "—"}
                  </p>
                </div>
              </div>
            </section>

            {/* =====================================================
                VERIFICATION DETAILS
            ====================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <FileCheck2 className="h-5 w-5 text-blue-700" />

                <div>
                  <h2 className="font-bold text-slate-900">
                    Verification Details
                  </h2>

                  <p className="text-xs text-slate-500">
                    Submitted KYC information
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Document Type
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {getDocumentType(kyc)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Document Number
                  </p>

                  <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                    {kyc.documentNumber ||
                      "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Submitted
                  </p>

                  <p className="mt-1 text-sm text-slate-900">
                    {formatDate(
                      kyc.createdAt,
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Last Updated
                  </p>

                  <p className="mt-1 text-sm text-slate-900">
                    {formatDate(
                      kyc.updatedAt,
                    )}
                  </p>
                </div>

                {kyc.reviewedAt && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Reviewed
                    </p>

                    <p className="mt-1 text-sm text-slate-900">
                      {formatDate(
                        kyc.reviewedAt,
                      )}
                    </p>
                  </div>
                )}

                {kyc.verifiedAt && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      KYC Verified
                    </p>

                    <p className="mt-1 text-sm text-slate-900">
                      {formatDate(
                        kyc.verifiedAt,
                      )}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* =====================================================
                TIN / TAX CODE
            ====================================================== */}

            <ComplianceCodeCard
              title="TIN / Tax Code"
              description="Transfer tax compliance verification"
              code={kyc.taxIdentificationNumber}
              verified={Boolean(
                kyc.taxCodeVerified,
              )}
              verifiedAt={
                kyc.taxCodeVerifiedAt
              }
              action="verify-tin"
              actionLoading={actionLoading}
              onVerify={() =>
                performAction(
                  "verify-tin",
                )
              }
            />

            {/* =====================================================
                AML CODE
            ====================================================== */}

            <ComplianceCodeCard
              title="AML Code"
              description="Anti-Money Laundering compliance verification"
              code={kyc.amlCode}
              verified={Boolean(
                kyc.amlCodeVerified,
              )}
              verifiedAt={
                kyc.amlCodeVerifiedAt
              }
              action="verify-aml"
              actionLoading={actionLoading}
              onVerify={() =>
                performAction(
                  "verify-aml",
                )
              }
            />

            {/* =====================================================
                CFT CODE
            ====================================================== */}

            <ComplianceCodeCard
              title="CFT Code"
              description="Counter-Financing of Terrorism compliance verification"
              code={kyc.cftCode}
              verified={Boolean(
                kyc.cftCodeVerified,
              )}
              verifiedAt={
                kyc.cftCodeVerifiedAt
              }
              action="verify-cft"
              actionLoading={actionLoading}
              onVerify={() =>
                performAction(
                  "verify-cft",
                )
              }
            />

            {kyc.rejectionReason && (
              <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 shrink-0 text-red-600" />

                  <div>
                    <h2 className="font-bold text-red-800">
                      Rejection Reason
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-red-700">
                      {kyc.rejectionReason}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* =======================================================
              DOCUMENTS + REVIEW ACTIONS
          ======================================================== */}

          <div className="space-y-6 lg:col-span-2">
            <section>
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">
                  Submitted Documents
                </h2>

                <p className="text-sm text-slate-500">
                  Review the files submitted by the customer.
                </p>
              </div>

              <div className="space-y-6">
                <FilePreview
                  title="Identity Document — Front"
                  url={kyc.documentFrontUrl}
                />

                <FilePreview
                  title="Identity Document — Back"
                  url={kyc.documentBackUrl}
                />

                <FilePreview
                  title="Selfie"
                  url={kyc.selfieUrl}
                />
              </div>
            </section>

            {/* =====================================================
                COMPLIANCE SUMMARY
            ====================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-slate-700" />

                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Compliance Verification
                    </h2>

                    <p className="text-sm text-slate-500">
                      Current verification state for transfer compliance.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    label: "TIN",
                    verified:
                      Boolean(
                        kyc.taxCodeVerified,
                      ),
                  },
                  {
                    label: "AML",
                    verified:
                      Boolean(
                        kyc.amlCodeVerified,
                      ),
                  },
                  {
                    label: "CFT",
                    verified:
                      Boolean(
                        kyc.cftCodeVerified,
                      ),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-xl border p-4 ${
                      item.verified
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-bold text-slate-900">
                        {item.label}
                      </span>

                      {item.verified ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <Clock3 className="h-5 w-5 text-amber-600" />
                      )}
                    </div>

                    <p
                      className={`mt-2 text-xs font-semibold ${
                        item.verified
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {item.verified
                        ? "Verified"
                        : "Pending verification"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* =====================================================
                REVIEW DECISION
            ====================================================== */}

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  Review Decision
                </h2>

                <p className="text-sm text-slate-500">
                  Update the verification status for this
                  application.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={Boolean(
                    actionLoading,
                  )}
                  onClick={() =>
                    performAction("review")
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                  {actionLoading ===
                  "review" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Clock3 className="h-4 w-4" />
                  )}

                  Under Review
                </button>

                <button
                  type="button"
                  disabled={Boolean(
                    actionLoading,
                  )}
                  onClick={() =>
                    performAction("approve")
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading ===
                  "approve" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}

                  Approve KYC
                </button>

                <button
                  type="button"
                  disabled={Boolean(
                    actionLoading,
                  )}
                  onClick={() =>
                    document
                      .getElementById(
                        "kyc-rejection-reason",
                      )
                      ?.focus()
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  Reject KYC
                </button>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-6">
                <label
                  htmlFor="kyc-rejection-reason"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Rejection reason
                </label>

                <textarea
                  id="kyc-rejection-reason"
                  value={rejectionReason}
                  onChange={(event) =>
                    setRejectionReason(
                      event.target.value,
                    )
                  }
                  rows={4}
                  placeholder="Explain why this KYC application is being rejected..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />

                <button
                  type="button"
                  disabled={
                    Boolean(
                      actionLoading,
                    ) ||
                    !rejectionReason.trim()
                  }
                  onClick={() =>
                    performAction("reject")
                  }
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading ===
                  "reject" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}

                  Confirm Rejection
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   KYC LIST
============================================================ */

const AdminKycList = () => {
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] =
    useState(null);
  const [loading, setLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const loadKycRecords = useCallback(
    async (requestedPage = page) => {
      if (requestedPage === 1) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError("");

      try {
        const params = {
          page: requestedPage,
          limit: PAGE_SIZE,
        };

        if (status !== "ALL") {
          params.status = status;
        }

        const response =
          await api.get("/admin/kyc", {
            params,
          });

        const payload = response?.data;

        const incomingRecords =
          normalizeCollection(
            payload,
          );

        setRecords(
          incomingRecords,
        );

        setPagination(
          payload?.pagination ||
            payload?.data?.pagination ||
            null,
        );

        setPage(requestedPage);
      } catch (requestError) {
        console.error(
          "Failed to load KYC records:",
          requestError,
        );

        setError(
          requestError?.response
            ?.data?.message ||
            requestError?.message ||
            "Unable to load KYC submissions.",
        );

        setRecords([]);
        setPagination(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, status],
  );

  useEffect(() => {
    loadKycRecords(1);
  }, [status]);

  const summary = useMemo(
    () =>
      getSummaryCounts(records),
    [records],
  );

  const filteredRecords =
    useMemo(() => {
      const normalizedSearch =
        search.trim().toLowerCase();

      if (!normalizedSearch) {
        return records;
      }

      return records.filter((item) => {
        const customer =
          getCustomer(item);

        const values = [
          getKycId(item),
          getCustomerName(item),
          getCustomerEmail(item),
          customer?.phone,
          item?.documentNumber,
          item?.reference,
          item?.country,
          item?.nationality,
          item?.taxIdentificationNumber,
          item?.amlCode,
          item?.cftCode,
        ];

        return values.some((value) =>
          String(value ?? "")
            .toLowerCase()
            .includes(
              normalizedSearch,
            ),
        );
      });
    }, [records, search]);

  const summaryCards = [
    {
      label: "Total submissions",
      value:
        pagination?.total ??
        summary.total,
      icon: FileCheck2,
      className:
        "bg-slate-50 text-slate-700",
    },
    {
      label: "Pending review",
      value: summary.pending,
      icon: Clock3,
      className:
        "bg-amber-50 text-amber-700",
    },
    {
      label: "Under review",
      value: summary.inReview,
      icon: Eye,
      className:
        "bg-blue-50 text-blue-700",
    },
    {
      label: "Verified",
      value: summary.verified,
      icon: CheckCircle2,
      className:
        "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Rejected",
      value: summary.rejected,
      icon: XCircle,
      className:
        "bg-red-50 text-red-700",
    },
  ];

  const totalPages = Number(
    pagination?.totalPages || 0,
  );

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <ShieldCheck className="h-6 w-6" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Compliance
                </p>

                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  KYC Review
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Review customer identity-verification
                  submissions, TIN, AML, CFT verification,
                  and compliance status.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                loadKycRecords(page)
              }
              disabled={
                loading || refreshing
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  loading || refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />
              Refresh
            </button>
          </div>

          <div className="border-t border-slate-100 bg-slate-50/70 p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {summaryCards.map(
                (card) => {
                  const Icon = card.icon;

                  return (
                    <div
                      key={card.label}
                      className="rounded-xl border border-slate-200 bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-slate-500">
                            {card.label}
                          </p>

                          <p className="mt-1 text-2xl font-bold text-slate-900">
                            {loading
                              ? "—"
                              : card.value}
                          </p>
                        </div>

                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.className}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Search customer, email, KYC ID, TIN, AML, CFT, document or reference"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>

            <div className="relative lg:w-56">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                value={status}
                onChange={(event) => {
                  setStatus(
                    event.target.value,
                  );
                  setPage(1);
                }}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                {STATUS_OPTIONS.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>
        </section>

        {error && (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="font-semibold">
                  Unable to load KYC submissions
                </p>

                <p className="mt-1 text-sm">
                  {error}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Verification submissions
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {filteredRecords.length}{" "}
                record
                {filteredRecords.length ===
                1
                  ? ""
                  : "s"}{" "}
                currently loaded
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4" />
              Restricted administrative data
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-4 sm:p-5">
              {Array.from({
                length: 6,
              }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : filteredRecords.length ===
            0 ? (
            <div className="flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <FileCheck2 className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No KYC submissions found
              </h3>

              <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
                There are no verification
                records matching the current
                search and status filters.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Customer
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Document
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        TIN
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        AML
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        CFT
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Submitted
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRecords.map(
                      (item) => {
                        const id =
                          getKycId(
                            item,
                          );

                        const statusMeta =
                          getStatusMeta(
                            item?.status ||
                              item?.kycStatus,
                          );

                        const StatusIcon =
                          statusMeta.icon;

                        const hasTin =
                          Boolean(
                            String(
                              item?.taxIdentificationNumber ||
                                "",
                            ).trim(),
                          );

                        const tinVerified =
                          Boolean(
                            item?.taxCodeVerified,
                          );

                        const hasAml =
                          Boolean(
                            String(
                              item?.amlCode ||
                                "",
                            ).trim(),
                          );

                        const amlVerified =
                          Boolean(
                            item?.amlCodeVerified,
                          );

                        const hasCft =
                          Boolean(
                            String(
                              item?.cftCode ||
                                "",
                            ).trim(),
                          );

                        const cftVerified =
                          Boolean(
                            item?.cftCodeVerified,
                          );

                        return (
                          <tr
                            key={
                              id ||
                              `${getCustomerEmail(
                                item,
                              )}-${getSubmittedAt(
                                item,
                              )}`
                            }
                            className="transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <div className="flex min-w-[220px] items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                                  <UserRound className="h-5 w-5" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-slate-900">
                                    {getCustomerName(
                                      item,
                                    )}
                                  </p>

                                  <p className="truncate text-xs text-slate-500">
                                    {getCustomerEmail(
                                      item,
                                    )}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <p className="font-medium text-slate-800">
                                {getDocumentType(
                                  item,
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                ID:{" "}
                                {id ||
                                  "—"}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              {!hasTin ? (
                                <span className="text-xs font-medium text-slate-400">
                                  Not provided
                                </span>
                              ) : (
                                <div>
                                  <p className="font-mono text-xs font-semibold text-slate-700">
                                    {maskComplianceCode(
                                      item.taxIdentificationNumber,
                                    )}
                                  </p>

                                  <span
                                    className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${
                                      tinVerified
                                        ? "text-emerald-700"
                                        : "text-amber-700"
                                    }`}
                                  >
                                    {tinVerified ? (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Verified
                                      </>
                                    ) : (
                                      <>
                                        <Clock3 className="h-3.5 w-3.5" />
                                        Pending
                                      </>
                                    )}
                                  </span>
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {!hasAml ? (
                                <span className="text-xs font-medium text-slate-400">
                                  Not provided
                                </span>
                              ) : (
                                <div>
                                  <p className="font-mono text-xs font-semibold text-slate-700">
                                    {maskComplianceCode(
                                      item.amlCode,
                                    )}
                                  </p>

                                  <span
                                    className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${
                                      amlVerified
                                        ? "text-emerald-700"
                                        : "text-amber-700"
                                    }`}
                                  >
                                    {amlVerified ? (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Verified
                                      </>
                                    ) : (
                                      <>
                                        <Clock3 className="h-3.5 w-3.5" />
                                        Pending
                                      </>
                                    )}
                                  </span>
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              {!hasCft ? (
                                <span className="text-xs font-medium text-slate-400">
                                  Not provided
                                </span>
                              ) : (
                                <div>
                                  <p className="font-mono text-xs font-semibold text-slate-700">
                                    {maskComplianceCode(
                                      item.cftCode,
                                    )}
                                  </p>

                                  <span
                                    className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${
                                      cftVerified
                                        ? "text-emerald-700"
                                        : "text-amber-700"
                                    }`}
                                  >
                                    {cftVerified ? (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Verified
                                      </>
                                    ) : (
                                      <>
                                        <Clock3 className="h-3.5 w-3.5" />
                                        Pending
                                      </>
                                    )}
                                  </span>
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <p className="text-sm font-medium text-slate-800">
                                {formatRelativeDate(
                                  getSubmittedAt(
                                    item,
                                  ),
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(
                                  getSubmittedAt(
                                    item,
                                  ),
                                )}
                              </p>
                            </td>

                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                              >
                                <StatusIcon className="h-3.5 w-3.5" />
                                {statusMeta.label}
                              </span>
                            </td>

                            <td className="px-5 py-4 text-right">
                              {id ? (
                                <Link
                                  to={`/admin/kyc/${encodeURIComponent(
                                    id,
                                  )}`}
                                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  <Eye className="h-4 w-4" />
                                  Review
                                </Link>
                              ) : (
                                <span className="text-xs text-slate-400">
                                  No record ID
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                {filteredRecords.map(
                  (item) => {
                    const id =
                      getKycId(item);

                    const statusMeta =
                      getStatusMeta(
                        item?.status ||
                          item?.kycStatus,
                      );

                    const StatusIcon =
                      statusMeta.icon;

                    const hasTin =
                      Boolean(
                        String(
                          item?.taxIdentificationNumber ||
                            "",
                        ).trim(),
                      );

                    const tinVerified =
                      Boolean(
                        item?.taxCodeVerified,
                      );

                    const hasAml =
                      Boolean(
                        String(
                          item?.amlCode ||
                            "",
                        ).trim(),
                      );

                    const amlVerified =
                      Boolean(
                        item?.amlCodeVerified,
                      );

                    const hasCft =
                      Boolean(
                        String(
                          item?.cftCode ||
                            "",
                        ).trim(),
                      );

                    const cftVerified =
                      Boolean(
                        item?.cftCodeVerified,
                      );

                    return (
                      <article
                        key={
                          id ||
                          `${getCustomerEmail(
                            item,
                          )}-${getSubmittedAt(
                            item,
                          )}`
                        }
                        className="p-4 sm:p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                              <UserRound className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate font-semibold text-slate-900">
                                {getCustomerName(
                                  item,
                                )}
                              </h3>

                              <p className="truncate text-xs text-slate-500">
                                {getCustomerEmail(
                                  item,
                                )}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${statusMeta.className}`}
                          >
                            <StatusIcon className="h-3.5 w-3.5" />
                            {statusMeta.label}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3">
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Document
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {getDocumentType(
                                item,
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              Submitted
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {formatRelativeDate(
                                getSubmittedAt(
                                  item,
                                ),
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              TIN
                            </p>

                            {!hasTin ? (
                              <p className="mt-1 text-sm font-semibold text-slate-400">
                                Not provided
                              </p>
                            ) : (
                              <p
                                className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
                                  tinVerified
                                    ? "text-emerald-700"
                                    : "text-amber-700"
                                }`}
                              >
                                {tinVerified ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Verified
                                  </>
                                ) : (
                                  <>
                                    <Clock3 className="h-3.5 w-3.5" />
                                    Pending
                                  </>
                                )}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              AML
                            </p>

                            {!hasAml ? (
                              <p className="mt-1 text-sm font-semibold text-slate-400">
                                Not provided
                              </p>
                            ) : (
                              <p
                                className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
                                  amlVerified
                                    ? "text-emerald-700"
                                    : "text-amber-700"
                                }`}
                              >
                                {amlVerified ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Verified
                                  </>
                                ) : (
                                  <>
                                    <Clock3 className="h-3.5 w-3.5" />
                                    Pending
                                  </>
                                )}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              CFT
                            </p>

                            {!hasCft ? (
                              <p className="mt-1 text-sm font-semibold text-slate-400">
                                Not provided
                              </p>
                            ) : (
                              <p
                                className={`mt-1 flex items-center gap-1 text-xs font-semibold ${
                                  cftVerified
                                    ? "text-emerald-700"
                                    : "text-amber-700"
                                }`}
                              >
                                {cftVerified ? (
                                  <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Verified
                                  </>
                                ) : (
                                  <>
                                    <Clock3 className="h-3.5 w-3.5" />
                                    Pending
                                  </>
                                )}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                              KYC ID
                            </p>

                            <p className="mt-1 break-all text-xs font-medium text-slate-700">
                              {id || "—"}
                            </p>
                          </div>
                        </div>

                        {id && (
                          <Link
                            to={`/admin/kyc/${encodeURIComponent(
                              id,
                            )}`}
                            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
                          >
                            <Eye className="h-4 w-4" />
                            Review submission
                          </Link>
                        )}
                      </article>
                    );
                  },
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 p-4 sm:flex-row">
                  <p className="text-sm text-slate-500">
                    Page {page} of{" "}
                    {totalPages}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={
                        page <= 1 ||
                        refreshing
                      }
                      onClick={() =>
                        loadKycRecords(
                          page - 1,
                        )
                      }
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>

                    <button
                      type="button"
                      disabled={
                        page >=
                          totalPages ||
                        refreshing
                      }
                      onClick={() =>
                        loadKycRecords(
                          page + 1,
                        )
                      }
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

            <div>
              <h2 className="text-sm font-semibold text-amber-900">
                KYC security reminder
              </h2>

              <p className="mt-1 text-sm leading-6 text-amber-800">
                Review identity documents and verify
                submitted TIN, AML, and CFT information
                only through authorized administrative
                workflows.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

const AdminKycReview = () => {
  const { kycId } = useParams();

  if (kycId) {
    return (
      <KycApplicationDetail
        kycId={kycId}
      />
    );
  }

  return <AdminKycList />;
};

export default AdminKycReview;
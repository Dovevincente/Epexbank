import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  FileText,
  Hash,
  Loader2,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import { getTransfer } from "../../services/transferService.js";

const getStatusClasses = (status) => {
  switch (status) {
    case "COMPLETED":
      return "bg-emerald-50 text-emerald-700 ring-emerald-600/20";

    case "PENDING":
      return "bg-amber-50 text-amber-700 ring-amber-600/20";

    case "PROCESSING":
      return "bg-blue-50 text-blue-700 ring-blue-600/20";

    case "FAILED":
    case "REVERSED":
      return "bg-red-50 text-red-700 ring-red-600/20";

    case "CANCELLED":
      return "bg-slate-100 text-slate-600 ring-slate-500/20";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-500/20";
  }
};

const getStatusIcon = (status) => {
  switch (status) {
    case "COMPLETED":
      return <CheckCircle2 className="h-4 w-4" />;

    case "PENDING":
    case "PROCESSING":
      return <Clock3 className="h-4 w-4" />;

    case "FAILED":
    case "REVERSED":
      return <CircleAlert className="h-4 w-4" />;

    case "CANCELLED":
      return <XCircle className="h-4 w-4" />;

    default:
      return <Clock3 className="h-4 w-4" />;
  }
};

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return `${currency} 0.00`;
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatDate = (value) => {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const getCurrency = (transfer) =>
  transfer?.currencyCode ||
  transfer?.currency?.code ||
  transfer?.currency?.currencyCode ||
  transfer?.sourceCurrency ||
  "USD";

const getAmount = (transfer) => {
  const value =
    transfer?.amount ??
    transfer?.value ??
    transfer?.transferAmount ??
    0;

  const amount = Number(value);

  return Number.isFinite(amount) ? amount : 0;
};

const getFee = (transfer) => {
  const value =
    transfer?.fee ??
    transfer?.fees ??
    transfer?.transactionFee ??
    0;

  const fee = Number(value);

  return Number.isFinite(fee) ? fee : 0;
};

const getTotal = (transfer) => {
  const explicitTotal =
    transfer?.total ??
    transfer?.totalAmount ??
    transfer?.debitAmount;

  if (
    explicitTotal !== undefined &&
    explicitTotal !== null &&
    explicitTotal !== ""
  ) {
    const total = Number(explicitTotal);

    if (Number.isFinite(total)) {
      return total;
    }
  }

  return getAmount(transfer) + getFee(transfer);
};

const getReference = (transfer) =>
  transfer?.reference ||
  transfer?.transferReference ||
  transfer?.transactionReference ||
  "Not available";

const getDescription = (transfer) =>
  transfer?.description ||
  transfer?.metadata?.description ||
  transfer?.purpose ||
  "Epex Bank transfer";

const getStatus = (transfer) =>
  String(transfer?.status || "UNKNOWN").toUpperCase();

const getTransferType = (transfer) =>
  String(
    transfer?.type ||
      transfer?.transferType ||
      "INTERNAL",
  ).toUpperCase();

const getAccountNumber = (account) =>
  account?.accountNumber ||
  account?.number ||
  account?.iban ||
  "";

const getSenderAccountNumber = (transfer) =>
  transfer?.senderAccountNumber ||
  getAccountNumber(transfer?.senderAccount) ||
  getAccountNumber(transfer?.sender?.account) ||
  transfer?.senderAccount?.number ||
  "";

const getReceiverAccountNumber = (transfer) =>
  transfer?.receiverAccountNumber ||
  transfer?.recipientAccountNumber ||
  getAccountNumber(transfer?.receiverAccount) ||
  getAccountNumber(transfer?.receiver?.account) ||
  getAccountNumber(transfer?.recipientAccount) ||
  transfer?.receiverAccount?.number ||
  "";

const getPersonName = (person) => {
  if (!person) {
    return "";
  }

  if (typeof person === "string") {
    return person;
  }

  if (person.name) {
    return person.name;
  }

  const firstName =
    person.firstName ||
    person.profile?.firstName ||
    "";

  const lastName =
    person.lastName ||
    person.profile?.lastName ||
    "";

  return `${firstName} ${lastName}`.trim();
};

const getSenderName = (transfer) =>
  transfer?.senderName ||
  getPersonName(transfer?.sender) ||
  getPersonName(transfer?.sender?.profile) ||
  "Epex Bank customer";

const getReceiverName = (transfer) =>
  transfer?.receiverName ||
  transfer?.recipientName ||
  getPersonName(transfer?.receiver) ||
  getPersonName(transfer?.recipient) ||
  getPersonName(transfer?.receiver?.profile) ||
  getPersonName(transfer?.recipient?.profile) ||
  getPersonName(transfer?.beneficiary) ||
  "Epex Bank customer";

const getTransferDirection = (transfer) => {
  const direction = String(
    transfer?.direction || "",
  ).toLowerCase();

  if (
    direction === "in" ||
    direction === "incoming" ||
    direction === "received"
  ) {
    return "received";
  }

  if (
    direction === "out" ||
    direction === "outgoing" ||
    direction === "sent"
  ) {
    return "sent";
  }

  const type = String(
    transfer?.type || "",
  ).toUpperCase();

  if (
    type === "RECEIVED" ||
    type === "CREDIT"
  ) {
    return "received";
  }

  if (
    type === "SENT" ||
    type === "DEBIT"
  ) {
    return "sent";
  }

  return "sent";
};

const extractTransfer = (response) => {
  if (!response) {
    return null;
  }

  if (response?.data?.transfer) {
    return response.data.transfer;
  }

  if (
    response?.data &&
    typeof response.data === "object" &&
    !Array.isArray(response.data) &&
    response.data.id
  ) {
    return response.data;
  }

  if (response?.transfer) {
    return response.transfer;
  }

  if (response?.id) {
    return response;
  }

  return null;
};

const DetailRow = ({
  label,
  value,
  mono = false,
  valueClassName = "",
}) => (
  <div className="flex flex-col gap-1 border-b border-slate-100 py-3.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
    <span className="text-sm text-slate-500">
      {label}
    </span>

    <span
      className={`break-all text-sm font-semibold text-slate-800 sm:text-right ${
        mono ? "font-mono text-xs sm:text-sm" : ""
      } ${valueClassName}`}
    >
      {value || "—"}
    </span>
  </div>
);

const AccountCard = ({
  title,
  name,
  accountNumber,
  received = false,
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5">
    <div className="flex items-center gap-3">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          received
            ? "bg-emerald-50 text-emerald-600"
            : "bg-blue-50 text-blue-700"
        }`}
      >
        {received ? (
          <ArrowDownLeft className="h-5 w-5" />
        ) : (
          <ArrowUpRight className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {title}
        </p>

        <p className="mt-1 truncate text-sm font-bold text-slate-900">
          {name || "Epex Bank customer"}
        </p>
      </div>
    </div>

    <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Account
      </p>

      <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-700">
        {accountNumber || "Not available"}
      </p>
    </div>
  </div>
);

const getStatusDescription = (status) => {
  switch (status) {
    case "COMPLETED":
      return "This transfer has been completed and recorded by Epex Bank.";

    case "PENDING":
      return "This transfer is awaiting processing.";

    case "PROCESSING":
      return "This transfer is currently being processed.";

    case "FAILED":
      return "This transfer could not be completed.";

    case "REVERSED":
      return "This transfer was reversed.";

    case "CANCELLED":
      return "This transfer was cancelled.";

    default:
      return "The current status of this transfer is shown above.";
  }
};

const TransferDetails = () => {
  const { transferId } = useParams();
  const navigate = useNavigate();

  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadTransfer = useCallback(
    async ({ refresh = false } = {}) => {
      if (!transferId) {
        setError("A transfer ID was not provided.");
        setLoading(false);
        return;
      }

      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response =
          await getTransfer(transferId);

        const result =
          extractTransfer(response);

        if (!result) {
          throw new Error(
            "The transfer could not be found.",
          );
        }

        setTransfer(result);
      } catch (requestError) {
        const message =
          requestError?.response?.data?.message ||
          requestError?.response?.data?.error ||
          requestError?.message ||
          "Unable to load this transfer.";

        setError(message);
        setTransfer(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [transferId],
  );

  useEffect(() => {
    loadTransfer();
  }, [loadTransfer]);

  useEffect(() => {
    setCopied(false);
  }, [transferId]);

  const details = useMemo(() => {
    if (!transfer) {
      return null;
    }

    const status = getStatus(transfer);
    const direction =
      getTransferDirection(transfer);

    const currency = getCurrency(transfer);
    const amount = getAmount(transfer);
    const fee = getFee(transfer);
    const total = getTotal(transfer);

    return {
      id:
        transfer?.id ||
        transfer?.transferId ||
        transfer?._id ||
        transferId,

      status,
      direction,
      currency,
      amount,
      fee,
      total,

      reference: getReference(transfer),
      description: getDescription(transfer),
      transferType: getTransferType(transfer),

      senderName: getSenderName(transfer),
      receiverName:
        getReceiverName(transfer),

      senderAccount:
        getSenderAccountNumber(transfer),

      receiverAccount:
        getReceiverAccountNumber(transfer),

      createdAt:
        transfer?.createdAt ||
        transfer?.date ||
        transfer?.initiatedAt,

      updatedAt:
        transfer?.updatedAt ||
        transfer?.processedAt ||
        transfer?.completedAt,

      metadata: transfer?.metadata || null,
    };
  }, [transfer, transferId]);

  const copyReference = async () => {
    const reference = details?.reference;

    if (!reference || reference === "Not available") {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        reference,
      );

      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <section className="flex min-h-[70vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-blue-600" />

          <p className="mt-4 text-sm font-semibold text-slate-700">
            Loading transfer details...
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Retrieving the secure transfer record.
          </p>
        </div>
      </section>
    );
  }

  if (error || !transfer || !details) {
    return (
      <section className="space-y-6">
        <button
          type="button"
          onClick={() => navigate("/transfers")}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to transfers
        </button>

        <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6">
          <div className="max-w-md text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
              <CircleAlert className="h-7 w-7" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-950">
              Transfer unavailable
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error ||
                "We could not retrieve this transfer."}
            </p>

            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => loadTransfer()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <Link
                to="/transfers"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
              >
                View transfers
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Top navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => navigate("/transfers")}
          className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to transfers
        </button>

        <button
          type="button"
          onClick={() =>
            loadTransfer({ refresh: true })
          }
          disabled={refreshing}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* Hero */}
      <div className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-blue-500/10 blur-2xl" />

          <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-cyan-400/10 blur-2xl" />

          <div className="relative">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
                  {details.direction ===
                  "received" ? (
                    <ArrowDownLeft className="h-6 w-6" />
                  ) : (
                    <ArrowUpRight className="h-6 w-6" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Transfer details
                    </p>

                    <span className="text-slate-600">
                      •
                    </span>

                    <span className="text-xs font-medium text-slate-400">
                      {details.transferType}
                    </span>
                  </div>

                  <h1 className="mt-2 break-words text-xl font-bold sm:text-2xl">
                    {details.description}
                  </h1>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/10">
                      {getStatusIcon(
                        details.status,
                      )}

                      {details.status}
                    </span>

                    <span className="text-xs text-slate-400">
                      {formatDate(
                        details.createdAt,
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="lg:text-right">
                <p className="text-xs font-medium text-slate-400">
                  {details.direction ===
                  "received"
                    ? "Amount received"
                    : "Amount sent"}
                </p>

                <p
                  className={`mt-1 text-3xl font-bold tracking-tight sm:text-4xl ${
                    details.direction ===
                    "received"
                      ? "text-emerald-400"
                      : "text-white"
                  }`}
                >
                  {details.direction ===
                  "received"
                    ? "+"
                    : "-"}
                  {formatMoney(
                    details.amount,
                    details.currency,
                  )}
                </p>
              </div>
            </div>

            {/* Reference */}
            <div className="mt-7 flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Hash className="h-4 w-4 shrink-0 text-slate-500" />

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Transfer reference
                  </p>

                  <p className="mt-1 break-all font-mono text-xs font-semibold text-slate-300 sm:text-sm">
                    {details.reference}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={copyReference}
                disabled={
                  details.reference ===
                  "Not available"
                }
                className="inline-flex w-fit items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied
                  ? "Copied"
                  : "Copy reference"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status */}
      <div
        className={`rounded-2xl px-4 py-3 ring-1 ring-inset ${getStatusClasses(
          details.status,
        )}`}
      >
        <div className="flex items-start gap-3">
          {getStatusIcon(details.status)}

          <div>
            <p className="text-sm font-bold">
              Transfer{" "}
              {details.status.toLowerCase()}
            </p>

            <p className="mt-1 text-xs leading-5 opacity-80">
              {getStatusDescription(
                details.status,
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Sender / recipient */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-blue-700" />

          <h2 className="text-base font-bold text-slate-950">
            Transfer parties
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <AccountCard
            title="From"
            name={details.senderName}
            accountNumber={
              details.senderAccount
            }
          />

          <AccountCard
            title="To"
            name={details.receiverName}
            accountNumber={
              details.receiverAccount
            }
            received
          />
        </div>
      </div>

      {/* Financial details */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <WalletCards className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-950">
                Financial details
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Amounts recorded for this transfer
              </p>
            </div>
          </div>

          <div className="mt-4">
            <DetailRow
              label="Transfer amount"
              value={formatMoney(
                details.amount,
                details.currency,
              )}
              valueClassName="text-slate-950"
            />

            <DetailRow
              label="Transfer fee"
              value={formatMoney(
                details.fee,
                details.currency,
              )}
            />

            <DetailRow
              label="Total"
              value={formatMoney(
                details.total,
                details.currency,
              )}
              valueClassName="text-blue-700"
            />

            <DetailRow
              label="Currency"
              value={details.currency}
            />
          </div>
        </div>

        {/* Transfer information */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-950">
                Transfer information
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Record and processing information
              </p>
            </div>
          </div>

          <div className="mt-4">
            <DetailRow
              label="Transfer type"
              value={details.transferType}
            />

            <DetailRow
              label="Reference"
              value={details.reference}
              mono
            />

            <DetailRow
              label="Transfer ID"
              value={details.id}
              mono
            />

            <DetailRow
              label="Created"
              value={formatDate(
                details.createdAt,
              )}
            />

            <DetailRow
              label="Last updated"
              value={formatDate(
                details.updatedAt,
              )}
            />
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
            <ShieldCheck className="h-4 w-4" />
          </div>

          <div>
            <p className="text-sm font-bold text-blue-950">
              Secure transfer record
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-800/80">
              Transfer information is retrieved from
              your authenticated Epex Bank account.
              Never share your password, one-time
              verification codes, or account security
              credentials with another person.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-3 pb-4 sm:flex-row">
        <Link
          to="/transfers"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to transfers
        </Link>

        <Link
          to="/transfers/internal"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Make another transfer
        </Link>
      </div>
    </section>
  );
};

export default TransferDetails;
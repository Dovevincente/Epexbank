import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Ban,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  UnlockKeyhole,
  WalletCards,
} from "lucide-react";

import api from "../../services/api.js";

const formatMoney = (
  value,
  currency = "USD",
) => {
  const amount = Number(value ?? 0);

  const normalizedCurrency = String(
    currency || "USD",
  ).toUpperCase();

  if (!Number.isFinite(amount)) {
    return `${normalizedCurrency} 0.00`;
  }

  try {
    return new Intl.NumberFormat(
      undefined,
      {
        style: "currency",
        currency: normalizedCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(amount);
  } catch {
    return `${normalizedCurrency} ${amount.toFixed(
      2,
    )}`;
  }
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      dateStyle: "medium",
    },
  ).format(date);
};

const normalizeStatus = (value) =>
  String(value ?? "UNKNOWN")
    .trim()
    .toUpperCase();

const normalizeCard = (payload) => {
  const source =
    payload?.data?.card ??
    payload?.card ??
    payload?.data ??
    payload ??
    {};

  return source;
};

const getLastFour = (card) => {
  if (card?.last4) {
    return String(card.last4);
  }

  if (card?.lastFour) {
    return String(card.lastFour);
  }

  const number =
    card?.cardNumber ??
    card?.pan ??
    "";

  const value = String(number);

  return value.length >= 4
    ? value.slice(-4)
    : "";
};

const getMaskedCardNumber = (card) => {
  const lastFour = getLastFour(card);

  if (!lastFour) {
    return "Card number unavailable";
  }

  return `•••• •••• •••• ${lastFour}`;
};

const getCardholderName = (card) =>
  card?.cardholderName ??
  card?.holderName ??
  card?.nameOnCard ??
  card?.user?.name ??
  "Cardholder";

const getCurrency = (card) =>
  card?.currency?.code ??
  card?.currencyCode ??
  "USD";

const getCardType = (card) =>
  String(
    card?.type ??
      card?.cardType ??
      "CARD",
  )
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );

const getStatusClasses = (status) => {
  switch (normalizeStatus(status)) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/60";

    case "FROZEN":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/60";

    case "BLOCKED":
    case "CANCELLED":
    case "CLOSED":
    case "EXPIRED":
      return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/60";

    case "PENDING":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/60";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  }
};

const isFrozen = (card) =>
  ["FROZEN", "LOCKED"].includes(
    normalizeStatus(card?.status),
  );

const isBlocked = (card) =>
  [
    "BLOCKED",
    "CANCELLED",
    "CLOSED",
    "EXPIRED",
  ].includes(
    normalizeStatus(card?.status),
  );

const StatusBadge = ({ status }) => {
  const normalized =
    normalizeStatus(status);

  const icon =
    normalized === "ACTIVE" ? (
      <CheckCircle2 className="h-3.5 w-3.5" />
    ) : ["FROZEN", "LOCKED"].includes(
        normalized,
      ) ? (
      <Snowflake className="h-3.5 w-3.5" />
    ) : (
      <Ban className="h-3.5 w-3.5" />
    );

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ring-1 ${getStatusClasses(
        normalized,
      )}`}
    >
      {icon}
      {normalized}
    </span>
  );
};

const DetailItem = ({
  label,
  value,
  mono = false,
}) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
      {label}
    </p>

    <p
      className={`mt-1.5 break-words text-sm font-semibold text-slate-900 dark:text-white ${
        mono ? "font-mono" : ""
      }`}
    >
      {value || "—"}
    </p>
  </div>
);

const CardDetails = () => {
  const { cardId } = useParams();
  const navigate = useNavigate();

  const [card, setCard] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [actionError, setActionError] =
    useState("");

  const [actionSuccess, setActionSuccess] =
    useState("");

  const [showNumber, setShowNumber] =
    useState(false);

  const [showCvv, setShowCvv] =
    useState(false);

  const [copied, setCopied] =
    useState(false);

  const fetchCard = useCallback(
    async ({ refresh = false } = {}) => {
      if (!cardId) {
        setError(
          "A card ID is required.",
        );

        setLoading(false);
        return;
      }

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response =
          await api.get(
            `/cards/${encodeURIComponent(
              cardId,
            )}`,
          );

        const normalized =
          normalizeCard(
            response?.data,
          );

        if (
          !normalized?.id &&
          !normalized?.cardId
        ) {
          throw new Error(
            "The bank returned an invalid card record.",
          );
        }

        setCard(normalized);
      } catch (requestError) {
        const status =
          requestError?.response
            ?.status;

        const message =
          requestError?.response
            ?.data?.message ||
          requestError?.message ||
          (status === 404
            ? "Card not found."
            : "Unable to load this card.");

        setError(message);
        setCard(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [cardId],
  );

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  const currency =
    getCurrency(card);

  const lastFour = useMemo(
    () => getLastFour(card),
    [card],
  );

  const cardNumber = useMemo(() => {
    if (!card) return "";

    if (showNumber) {
      const raw =
        card?.cardNumber ??
        card?.pan ??
        "";

      return raw
        ? String(raw)
        : getMaskedCardNumber(card);
    }

    return getMaskedCardNumber(card);
  }, [card, showNumber]);

  const rawCvv =
    card?.cvv ??
    card?.securityCode ??
    card?.cvc ??
    "";

  const cvv = showCvv
    ? String(rawCvv || "")
    : rawCvv
      ? "•••"
      : "Not available";

  const availableLimit = Number(
    card?.availableLimit ??
      card?.remainingLimit ??
      card?.availableCredit ??
      0,
  );

  const spendingLimit = Number(
    card?.spendingLimit ??
      card?.dailyLimit ??
      card?.creditLimit ??
      0,
  );

  const usedAmount = Number(
    card?.usedLimit ??
      card?.currentBalance ??
      card?.outstandingBalance ??
      0,
  );

  const copyCardNumber = async () => {
    const raw =
      card?.cardNumber ??
      card?.pan ??
      "";

    if (
      !raw ||
      !navigator?.clipboard
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        String(raw),
      );

      setCopied(true);

      window.setTimeout(
        () => setCopied(false),
        1800,
      );
    } catch {
      setCopied(false);
    }
  };

  /*
   * =========================================================
   * CARD ACTION
   * =========================================================
   */

  const performCardAction = async ({
    endpoint,
    successMessage,
    confirmMessage,
  }) => {
    if (!cardId || actionLoading) {
      return;
    }

    if (
      confirmMessage &&
      !window.confirm(confirmMessage)
    ) {
      return;
    }

    setActionLoading(true);
    setActionError("");
    setActionSuccess("");

    try {
      const response =
        await api.post(
          `/cards/${encodeURIComponent(
            cardId,
          )}/${endpoint}`,
        );

      const updatedCard =
        normalizeCard(
          response?.data,
        );

      if (
        updatedCard?.id ||
        updatedCard?.cardId
      ) {
        setCard(updatedCard);
      } else {
        await fetchCard({
          refresh: true,
        });
      }

      setActionSuccess(
        response?.data?.message ||
          successMessage,
      );

      window.setTimeout(
        () => {
          setActionSuccess("");
        },
        3500,
      );
    } catch (requestError) {
      const message =
        requestError?.response
          ?.data?.message ||
        requestError?.message ||
        "The card action could not be completed.";

      setActionError(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFreeze = async () => {
    await performCardAction({
      endpoint: "freeze",
      successMessage:
        "Card frozen successfully.",
      confirmMessage:
        "Are you sure you want to freeze this card? Card payments will be blocked until you unfreeze it.",
    });
  };

  const handleUnfreeze = async () => {
    await performCardAction({
      endpoint: "unfreeze",
      successMessage:
        "Card unfrozen successfully.",
      confirmMessage:
        "Are you sure you want to unfreeze this card?",
    });
  };

  const handleReportCard = async () => {
    await performCardAction({
      endpoint: "block",
      successMessage:
        "Card reported and blocked successfully.",
      confirmMessage:
        "Report this card as lost, stolen, or compromised? This will permanently block the card.",
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="h-5 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

          <div className="mt-5 h-10 w-64 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />

          <div className="mt-6 h-72 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({
              length: 3,
            }).map((_, index) => (
              <div
                key={index}
                className="h-32 animate-pulse rounded-2xl bg-white dark:bg-slate-900"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error || !card) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-8 sm:px-6 lg:px-8">
          <section className="w-full rounded-3xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900/60 dark:bg-slate-900 sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h1 className="mt-5 text-xl font-bold text-slate-950 dark:text-white">
              Unable to load card
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {error ||
                "The requested card could not be found."}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  fetchCard()
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate("/cards")
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to cards
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const cardStatus =
    normalizeStatus(card.status);

  const cardIsFrozen =
    isFrozen(card);

  const cardIsBlocked =
    isBlocked(card);

  const hasCardNumber = Boolean(
    card?.cardNumber ??
      card?.pan,
  );

  const hasCvv = Boolean(
    String(rawCvv).trim(),
  );

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <header className="mb-6">
          <button
            type="button"
            onClick={() =>
              navigate("/cards")
            }
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-slate-950/20 dark:text-slate-300 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to cards
          </button>

          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Card management
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Card details
              </h1>

              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Review your card information, status and available controls.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                fetchCard({
                  refresh: true,
                })
              }
              disabled={
                refreshing ||
                actionLoading
              }
              className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>
        </header>

        {/* Action messages */}
        {actionSuccess && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Card action completed
              </p>

              <p className="mt-1 text-sm">
                {actionSuccess}
              </p>
            </div>
          </div>
        )}

        {actionError && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Card action failed
              </p>

              <p className="mt-1 text-sm">
                {actionError}
              </p>
            </div>
          </div>
        )}

        {/* Card Visual */}
        <section className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="relative min-h-[290px] p-6 sm:p-8 lg:p-10">
            <div
              aria-hidden="true"
              className="absolute -right-24 -top-28 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"
            />

            <div
              aria-hidden="true"
              className="absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-white/5 blur-3xl"
            />

            <div className="relative flex min-h-[240px] flex-col justify-between">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <WalletCards className="h-5 w-5 text-slate-300" />

                    <span className="text-sm font-semibold text-slate-300">
                      Epex Bank
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {getCardType(card)}
                  </p>
                </div>

                <StatusBadge
                  status={card.status}
                />
              </div>

              <div>
                <p className="font-mono text-xl font-medium tracking-[0.2em] text-slate-100 sm:text-2xl">
                  {cardNumber}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Cardholder
                    </p>

                    <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-slate-200">
                      {getCardholderName(
                        card,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      Expires
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-200">
                      {card?.expiryMonth &&
                      card?.expiryYear
                        ? `${String(
                            card.expiryMonth,
                          ).padStart(
                            2,
                            "0",
                          )}/${String(
                            card.expiryYear,
                          ).slice(-2)}`
                        : card?.expiresAt
                          ? formatDate(
                              card.expiresAt,
                            )
                          : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                      CVV
                    </p>

                    <p className="mt-1 font-mono text-sm font-semibold tracking-[0.2em] text-slate-200">
                      {cvv}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sensitive Controls */}
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  Card security
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Sensitive card credentials are protected and masked by
                  default.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setShowNumber(
                    (current) =>
                      !current,
                  )
                }
                disabled={!hasCardNumber}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {showNumber ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}

                {showNumber
                  ? "Hide number"
                  : "Show number"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setShowCvv(
                    (current) =>
                      !current,
                  )
                }
                disabled={!hasCvv}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {showCvv ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}

                {showCvv
                  ? "Hide CVV"
                  : "Show CVV"}
              </button>

              <button
                type="button"
                onClick={
                  copyCardNumber
                }
                disabled={!hasCardNumber}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                <Copy className="h-4 w-4" />

                {copied
                  ? "Copied"
                  : "Copy number"}
              </button>
            </div>
          </div>
        </section>

        {/* Card Information */}
        <section className="mt-6">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Card information
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Current information returned for this card.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <DetailItem
                label="Card number"
                value={
                  showNumber
                    ? cardNumber
                    : getMaskedCardNumber(
                        card,
                      )
                }
                mono
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <DetailItem
                label="CVV"
                value={cvv}
                mono
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <DetailItem
                label="Card type"
                value={getCardType(card)}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <DetailItem
                label="Currency"
                value={currency}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <DetailItem
                label="Cardholder"
                value={getCardholderName(
                  card,
                )}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <DetailItem
                label="Issued"
                value={formatDate(
                  card?.issuedAt ??
                    card?.createdAt,
                )}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <DetailItem
                label="Expires"
                value={
                  card?.expiresAt
                    ? formatDate(
                        card.expiresAt,
                      )
                    : card?.expiryMonth &&
                        card?.expiryYear
                      ? `${String(
                          card.expiryMonth,
                        ).padStart(
                          2,
                          "0",
                        )}/${card.expiryYear}`
                      : "—"
                }
              />
            </div>
          </div>
        </section>

        {/* Limits */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Limits and usage
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Current limits and available card capacity.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Spending limit
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                    {spendingLimit > 0
                      ? formatMoney(
                          spendingLimit,
                          currency,
                        )
                      : "Not set"}
                  </p>
                </div>

                <CircleDollarSign className="h-6 w-6 text-slate-400" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Available limit
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                    {availableLimit > 0
                      ? formatMoney(
                          availableLimit,
                          currency,
                        )
                      : "Not available"}
                  </p>
                </div>

                <WalletCards className="h-6 w-6 text-slate-400" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                    Used amount
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                    {usedAmount > 0
                      ? formatMoney(
                          usedAmount,
                          currency,
                        )
                      : formatMoney(
                          0,
                          currency,
                        )}
                  </p>
                </div>

                <CreditCard className="h-6 w-6 text-slate-400" />
              </div>
            </div>
          </div>
        </section>

        {/* Card Controls */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300" />

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-slate-950 dark:text-white">
                Card controls
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Freeze your card temporarily or report it if it has been lost,
                stolen, or compromised.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                {cardIsBlocked ? (
                  <div className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300">
                    <Ban className="h-4 w-4" />
                    Card blocked
                  </div>
                ) : cardIsFrozen ? (
                  <button
                    type="button"
                    onClick={
                      handleUnfreeze
                    }
                    disabled={
                      actionLoading
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                  >
                    {actionLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <UnlockKeyhole className="h-4 w-4" />
                    )}

                    {actionLoading
                      ? "Processing..."
                      : "Unfreeze card"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={
                      handleFreeze
                    }
                    disabled={
                      actionLoading
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-300 dark:hover:bg-blue-950/40"
                  >
                    {actionLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Snowflake className="h-4 w-4" />
                    )}

                    {actionLoading
                      ? "Processing..."
                      : "Freeze card"}
                  </button>
                )}

                {!cardIsBlocked && (
                  <button
                    type="button"
                    onClick={
                      handleReportCard
                    }
                    disabled={
                      actionLoading
                    }
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    {actionLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Ban className="h-4 w-4" />
                    )}

                    {actionLoading
                      ? "Processing..."
                      : "Report card"}
                  </button>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />

                  <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                    <strong className="text-slate-700 dark:text-slate-300">
                      Freeze
                    </strong>{" "}
                    temporarily disables the card while allowing you to
                    unfreeze it later.{" "}
                    <strong className="text-slate-700 dark:text-slate-300">
                      Report card
                    </strong>{" "}
                    permanently blocks the card and should only be used when
                    the card is lost, stolen, or compromised.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Related Navigation */}
        <section className="mt-8 grid gap-3 sm:grid-cols-2">
          <Link
            to="/cards"
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-slate-600 dark:text-slate-300" />

              <div>
                <p className="font-semibold text-slate-950 dark:text-white">
                  All cards
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  View your other cards
                </p>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:text-slate-700 dark:text-slate-600 dark:group-hover:text-slate-300" />
          </Link>

          <Link
            to="/transactions"
            className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <ArrowUpRight className="h-5 w-5 text-slate-600 dark:text-slate-300" />

              <div>
                <p className="font-semibold text-slate-950 dark:text-white">
                  Transactions
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Review recent account activity
                </p>
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:text-slate-700 dark:text-slate-600 dark:group-hover:text-slate-300" />
          </Link>
        </section>

        {/* Security Notice */}
        <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" />

            <div>
              <h2 className="font-semibold text-blue-950 dark:text-blue-200">
                Card security
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
                Card credentials are masked by default. Freeze your card if
                you temporarily don't want it to be usable. If your card is
                lost, stolen, or compromised, use Report card to permanently
                block it.
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-5 dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Card ID:{" "}
            {card?.id ??
              card?.cardId ??
              cardId}
            {lastFour
              ? ` · Ending ${lastFour}`
              : ""}
          </p>
        </footer>
      </div>
    </main>
  );
};

export default CardDetails;
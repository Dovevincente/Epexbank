import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  ShieldCheck,
  Snowflake,
  WalletCards,
  XCircle,
} from "lucide-react";

import api from "../../services/api.js";

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const source =
    payload?.data ??
    payload ??
    {};

  if (Array.isArray(source?.cards)) {
    return source.cards;
  }

  if (Array.isArray(source?.items)) {
    return source.items;
  }

  if (Array.isArray(source?.results)) {
    return source.results;
  }

  if (Array.isArray(source?.records)) {
    return source.records;
  }

  return [];
};

const normalizeStatus = (value) =>
  String(value ?? "UNKNOWN")
    .trim()
    .toUpperCase();

const normalizeCard = (card) => {
  const source = card ?? {};

  return {
    ...source,

    id:
      source?.id ??
      source?.cardId ??
      "",

    status:
      source?.status ??
      "UNKNOWN",

    type:
      source?.type ??
      source?.cardType ??
      "CARD",

    currency:
      source?.currency?.code ??
      source?.currencyCode ??
      "USD",

    last4:
      source?.last4 ??
      source?.lastFour ??
      (
        source?.cardNumber ??
        source?.pan ??
        ""
      )
        .toString()
        .slice(-4),

    cardholderName:
      source?.cardholderName ??
      source?.holderName ??
      source?.nameOnCard ??
      source?.user?.name ??
      "Cardholder",

    spendingLimit:
      source?.spendingLimit ??
      source?.dailyLimit ??
      source?.creditLimit ??
      null,

    availableLimit:
      source?.availableLimit ??
      source?.remainingLimit ??
      source?.availableCredit ??
      null,

    expiresAt:
      source?.expiresAt ??
      source?.expiryDate ??
      null,
  };
};

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value ?? 0);
  const normalizedCurrency = String(
    currency || "USD",
  ).toUpperCase();

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${normalizedCurrency} ${amount.toFixed(2)}`;
  }
};

const formatCardType = (value) =>
  String(value ?? "CARD")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) =>
      character.toUpperCase(),
    );

const formatExpiry = (card) => {
  if (
    card?.expiryMonth &&
    card?.expiryYear
  ) {
    return `${String(
      card.expiryMonth,
    ).padStart(2, "0")}/${String(
      card.expiryYear,
    ).slice(-2)}`;
  }

  if (card?.expiresAt) {
    const date = new Date(card.expiresAt);

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(
        undefined,
        {
          month: "2-digit",
          year: "2-digit",
        },
      ).format(date);
    }
  }

  return "—";
};

const maskCardNumber = (card) => {
  const last4 = String(
    card?.last4 ??
      card?.lastFour ??
      "",
  ).trim();

  if (!last4) {
    return "Card number unavailable";
  }

  return `•••• •••• •••• ${last4}`;
};

const getStatusClasses = (status) => {
  switch (normalizeStatus(status)) {
    case "ACTIVE":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900/60";

    case "FROZEN":
    case "LOCKED":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900/60";

    case "PENDING":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900/60";

    case "BLOCKED":
    case "CANCELLED":
    case "CLOSED":
    case "EXPIRED":
      return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:ring-rose-900/60";

    default:
      return "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";
  }
};

const StatusBadge = ({ status }) => {
  const normalized = normalizeStatus(status);

  const Icon =
    normalized === "ACTIVE"
      ? CheckCircle2
      : ["FROZEN", "LOCKED"].includes(
            normalized,
          )
        ? Snowflake
        : ["BLOCKED", "CANCELLED", "CLOSED", "EXPIRED"].includes(
              normalized,
            )
          ? XCircle
          : ShieldCheck;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${getStatusClasses(
        normalized,
      )}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {normalized}
    </span>
  );
};

const CardSkeleton = () => (
  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="h-52 animate-pulse bg-slate-200 dark:bg-slate-800" />

    <div className="space-y-4 p-5">
      <div className="h-5 w-40 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-28 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
    </div>
  </div>
);

const CardVisual = ({
  card,
  showNumber,
  onToggleNumber,
}) => {
  const rawNumber =
    card?.cardNumber ??
    card?.pan ??
    "";

  const number =
    showNumber && rawNumber
      ? String(rawNumber)
      : maskCardNumber(card);

  return (
    <div className="relative min-h-[220px] overflow-hidden bg-slate-950 p-6 text-white">
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl"
      />

      <div
        aria-hidden="true"
        className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-white/5 blur-3xl"
      />

      <div className="relative flex min-h-[168px] flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-slate-300" />

              <span className="text-sm font-semibold text-slate-200">
                Epex Bank
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              {formatCardType(card.type)}
            </p>
          </div>

          <StatusBadge status={card.status} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <p className="font-mono text-lg font-medium tracking-[0.15em] text-slate-100 sm:text-xl">
              {number}
            </p>

            {rawNumber && (
              <button
                type="button"
                onClick={onToggleNumber}
                aria-label={
                  showNumber
                    ? "Hide card number"
                    : "Show card number"
                }
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                {showNumber ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
                Cardholder
              </p>

              <p className="mt-1 max-w-[180px] truncate text-xs font-semibold uppercase tracking-wide text-slate-200">
                {card.cardholderName}
              </p>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
                Expires
              </p>

              <p className="mt-1 text-xs font-semibold text-slate-200">
                {formatExpiry(card)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Cards = () => {
  const navigate = useNavigate();

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [visibleNumbers, setVisibleNumbers] =
    useState({});

  const fetchCards = useCallback(
    async ({ refresh = false } = {}) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response = await api.get("/cards");

        const normalized = normalizeCollection(
          response?.data,
        ).map(normalizeCard);

        setCards(normalized);
      } catch (requestError) {
        const status =
          requestError?.response?.status;

        const message =
          requestError?.response?.data?.message ||
          requestError?.message ||
          (status === 404
            ? "The cards service is not available."
            : "Unable to load your cards.");

        setError(message);
        setCards([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  const summary = useMemo(() => {
    const active = cards.filter(
      (card) =>
        normalizeStatus(card.status) ===
        "ACTIVE",
    ).length;

    const frozen = cards.filter((card) =>
      ["FROZEN", "LOCKED"].includes(
        normalizeStatus(card.status),
      ),
    ).length;

    const blocked = cards.filter((card) =>
      [
        "BLOCKED",
        "CANCELLED",
        "CLOSED",
        "EXPIRED",
      ].includes(normalizeStatus(card.status)),
    ).length;

    return {
      total: cards.length,
      active,
      frozen,
      blocked,
    };
  }, [cards]);

  const toggleNumber = (cardId) => {
    setVisibleNumbers((current) => ({
      ...current,
      [cardId]: !current[cardId],
    }));
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <header className="mb-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Epex Bank
              </p>

              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
                Cards
              </h1>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400 sm:text-base">
                Manage your Epex Bank cards, review their status and access
                available card services.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  fetchCards({ refresh: true })
                }
                disabled={refreshing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                />
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/cards/create")}
               className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950/20 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
>
              <Plus className="h-4 w-4" />
                Request card
              </button>
            </div>
          </div>
        </header>

        {/* Error */}
        {error && (
          <section
            role="alert"
            className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/60 dark:bg-rose-950/20 sm:p-5"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />

                <div>
                  <h2 className="font-semibold text-rose-900 dark:text-rose-300">
                    Unable to load cards
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-rose-700 dark:text-rose-400">
                    {error}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => fetchCards()}
                className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>
            </div>
          </section>
        )}

        {/* Summary */}
        {!loading && (
          <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Total cards
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
                    {summary.total}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <CreditCard className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Active
                  </p>

                  <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {summary.active}
                  </p>
                </div>

                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Frozen
                  </p>

                  <p className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {summary.frozen}
                  </p>
                </div>

                <Snowflake className="h-6 w-6 text-blue-500" />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Restricted
                  </p>

                  <p className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
                    {summary.blocked}
                  </p>
                </div>

                <XCircle className="h-6 w-6 text-rose-500" />
              </div>
            </div>
          </section>
        )}

        {/* Cards */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Your cards
            </h2>

            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Select a card to review its details and available services.
            </p>
          </div>

          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map(
                (_, index) => (
                  <CardSkeleton key={index} />
                ),
              )}
            </div>
          ) : cards.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900 sm:p-12">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <CreditCard className="h-7 w-7" />
              </div>

              <h3 className="mt-5 text-lg font-bold text-slate-950 dark:text-white">
                No cards available
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                There are currently no cards linked to your customer profile.
                When a card is issued to your account, it will appear here.
              </p>

              <div className="mt-5">
                <Link
                  to="/support"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Contact support
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((card) => {
                const cardId = card.id;

                const hasRawNumber = Boolean(
                  card?.cardNumber ??
                    card?.pan,
                );

                const spendingLimit = Number(
                  card?.spendingLimit,
                );

                const availableLimit = Number(
                  card?.availableLimit,
                );

                return (
                  <article
                    key={cardId}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                  >
                    <CardVisual
                      card={card}
                      showNumber={
                        Boolean(
                          visibleNumbers[
                            cardId
                          ],
                        ) && hasRawNumber
                      }
                      onToggleNumber={() =>
                        toggleNumber(cardId)
                      }
                    />

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Card
                          </p>

                          <h3 className="mt-1 font-bold text-slate-950 dark:text-white">
                            {formatCardType(
                              card.type,
                            )}
                          </h3>
                        </div>

                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                          {String(
                            card.currency ||
                              "USD",
                          ).toUpperCase()}
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Spending limit
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                            {Number.isFinite(
                              spendingLimit,
                            ) &&
                            spendingLimit > 0
                              ? formatMoney(
                                  spendingLimit,
                                  card.currency,
                                )
                              : "Not set"}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Available
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                            {Number.isFinite(
                              availableLimit,
                            ) &&
                            availableLimit >= 0
                              ? formatMoney(
                                  availableLimit,
                                  card.currency,
                                )
                              : "Not available"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
                        <Link
                          to={`/cards/${encodeURIComponent(
                            cardId,
                          )}`}
                          className="group inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-950/20 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                        >
                          View card details
                          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Security */}
        <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900/60 dark:bg-blue-950/20">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-blue-300" />

            <div>
              <h2 className="font-semibold text-blue-950 dark:text-blue-200">
                Card security
              </h2>

              <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-300">
                Card numbers are masked by default. Epex Bank does not expose
                CVV values on this page, and card-management actions must be
                confirmed by the authenticated banking API.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 border-t border-slate-200 pt-5 dark:border-slate-800">
          <div className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
            <p>Epex Bank · Secure card management</p>

            <Link
              to="/support"
              className="inline-flex items-center gap-1 font-semibold transition hover:text-slate-600 dark:hover:text-slate-300"
            >
              Need help?
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
};

export default Cards;
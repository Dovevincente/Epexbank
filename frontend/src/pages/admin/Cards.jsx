import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpRight,
  CreditCard,
  Eye,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.js";

const normalizeCards = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.cards)) {
    return payload.cards;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.data?.cards)) {
    return payload.data.cards;
  }

  if (Array.isArray(payload?.results)) {
    return payload.results;
  }

  return [];
};

const getCustomer = (card) => {
  const customer =
    card?.user ||
    card?.customer ||
    card?.owner ||
    card?.userProfile ||
    null;

  return {
    id:
      customer?.id ||
      card?.userId ||
      card?.customerId ||
      "",
    name:
      customer?.name ||
      customer?.fullName ||
      [customer?.firstName, customer?.lastName]
        .filter(Boolean)
        .join(" ") ||
      customer?.email ||
      "Customer",
    email: customer?.email || "",
  };
};

const getCardStatus = (card) =>
  String(
    card?.status ||
      card?.cardStatus ||
      card?.state ||
      "UNKNOWN",
  ).toUpperCase();

const getCardType = (card) =>
  String(
    card?.type ||
      card?.cardType ||
      card?.networkType ||
      "CARD",
  ).toUpperCase();

const getNetwork = (card) =>
  String(
    card?.network ||
      card?.scheme ||
      card?.brand ||
      "—",
  ).toUpperCase();

const getCurrency = (card) => {
  if (typeof card?.currency === "string") {
    return card.currency.toUpperCase();
  }

  return String(
    card?.currency?.code ||
      card?.currencyCode ||
      "USD",
  ).toUpperCase();
};

const getMaskedNumber = (card) => {
  if (card?.maskedNumber) {
    return card.maskedNumber;
  }

  if (card?.maskedCardNumber) {
    return card.maskedCardNumber;
  }

  if (card?.last4) {
    return `•••• •••• •••• ${card.last4}`;
  }

  if (card?.cardNumberLast4) {
    return `•••• •••• •••• ${card.cardNumberLast4}`;
  }

  /*
   * Never expose a raw card number in the admin UI.
   * Only derive a masked value when the backend explicitly
   * provides a number or last-four representation.
   */
  if (card?.cardNumber) {
    const raw = String(card.cardNumber).replace(/\s+/g, "");

    if (raw.length >= 4) {
      return `•••• •••• •••• ${raw.slice(-4)}`;
    }
  }

  return "Card number unavailable";
};

const getExpiry = (card) => {
  if (card?.expiry) {
    return card.expiry;
  }

  if (card?.expiryDate) {
    return card.expiryDate;
  }

  if (card?.expiresAt) {
    const date = new Date(card.expiresAt);

    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(undefined, {
        month: "2-digit",
        year: "2-digit",
      }).format(date);
    }
  }

  if (card?.expiryMonth && card?.expiryYear) {
    return `${String(card.expiryMonth).padStart(2, "0")}/${String(
      card.expiryYear,
    ).slice(-2)}`;
  }

  return "—";
};

const formatLabel = (value) =>
  String(value || "—")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const statusClass = (status) => {
  switch (String(status).toUpperCase()) {
    case "ACTIVE":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "BLOCKED":
    case "FROZEN":
    case "SUSPENDED":
      return "border-red-200 bg-red-50 text-red-700";

    case "EXPIRED":
    case "CANCELLED":
    case "CANCELED":
      return "border-slate-200 bg-slate-100 text-slate-600";

    case "PENDING":
    case "REQUESTED":
      return "border-amber-200 bg-amber-50 text-amber-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
};

const AdminCards = () => {
  const navigate = useNavigate();

  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  const loadCards = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      /*
       * Keep the UI connected to the real API.
       * If the card-management endpoint is not mounted yet,
       * the page will show the backend error rather than fake cards.
       */
      const response = await api.get("/admin/cards");

      setCards(normalizeCards(response?.data));
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError?.response?.data?.error ||
        requestError?.message ||
        "Unable to load customer cards.";

      setError(message);
      setCards([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const statuses = useMemo(() => {
    const values = new Set();

    cards.forEach((card) => {
      const status = getCardStatus(card);

      if (status) {
        values.add(status);
      }
    });

    return Array.from(values).sort();
  }, [cards]);

  const cardTypes = useMemo(() => {
    const values = new Set();

    cards.forEach((card) => {
      const type = getCardType(card);

      if (type) {
        values.add(type);
      }
    });

    return Array.from(values).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    const query = search.trim().toLowerCase();

    return cards.filter((card) => {
      const customer = getCustomer(card);
      const status = getCardStatus(card);
      const type = getCardType(card);
      const network = getNetwork(card);

      const searchableText = [
        customer.name,
        customer.email,
        card?.id,
        card?.cardId,
        card?.accountId,
        card?.accountNumber,
        card?.last4,
        card?.cardNumberLast4,
        status,
        type,
        network,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query || searchableText.includes(query);

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      const matchesType =
        typeFilter === "ALL" || type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [cards, search, statusFilter, typeFilter]);

  const summary = useMemo(() => {
    let active = 0;
    let restricted = 0;
    let pending = 0;

    cards.forEach((card) => {
      const status = getCardStatus(card);

      if (status === "ACTIVE") {
        active += 1;
      }

      if (
        status === "BLOCKED" ||
        status === "FROZEN" ||
        status === "SUSPENDED"
      ) {
        restricted += 1;
      }

      if (
        status === "PENDING" ||
        status === "REQUESTED"
      ) {
        pending += 1;
      }
    });

    return {
      total: cards.length,
      active,
      restricted,
      pending,
    };
  }, [cards]);

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setTypeFilter("ALL");
  };

  const openCard = (card) => {
    const cardId = card?.id || card?.cardId;

    if (!cardId) {
      return;
    }

    navigate(
      `/admin/cards/${encodeURIComponent(cardId)}`,
    );
  };

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[420px] items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col items-center text-center">
              <Loader2 className="h-8 w-8 animate-spin text-slate-700" />

              <p className="mt-4 font-semibold text-slate-950">
                Loading customer cards
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Retrieving live card records from the Epex Bank API.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !cards.length) {
    return (
      <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl border border-red-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>

            <h1 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
              Cards unavailable
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              {error}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => loadCards()}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                Try again
              </button>

              <button
                type="button"
                onClick={() => navigate("/admin")}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl bg-slate-950 p-5 text-white shadow-sm sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5" />
                Protected card administration
              </div>

              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Cards
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Review customer cards, card status and card management
                activity without exposing sensitive card credentials.
              </p>
            </div>

            <button
              type="button"
              onClick={() => loadCards(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing ? "animate-spin" : ""
                }`}
              />
              Refresh
            </button>
          </div>
        </section>

        {error ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div>
              <p className="font-semibold">
                Card data warning
              </p>

              <p className="mt-1">{error}</p>
            </div>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Total cards
              </p>
              <CreditCard className="h-5 w-5 text-slate-400" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Active cards
              </p>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.active}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Restricted
              </p>
              <ShieldCheck className="h-5 w-5 text-red-500" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.restricted}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Pending
              </p>
              <WalletCards className="h-5 w-5 text-amber-500" />
            </div>

            <p className="mt-3 text-2xl font-bold text-slate-950">
              {summary.pending}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">
                  Card directory
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {filteredCards.length} card
                  {filteredCards.length === 1 ? "" : "s"} match the
                  current filters.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-0 sm:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="search"
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search customer or card..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="ALL">All statuses</option>

                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(event.target.value)
                  }
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                >
                  <option value="ALL">All card types</option>

                  {cardTypes.map((type) => (
                    <option key={type} value={type}>
                      {formatLabel(type)}
                    </option>
                  ))}
                </select>

                {(search ||
                  statusFilter !== "ALL" ||
                  typeFilter !== "ALL") && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredCards.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <CreditCard className="h-7 w-7" />
              </div>

              <h3 className="mt-4 text-base font-bold text-slate-950">
                No cards found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                No customer cards match the current search and filter
                settings.
              </p>

              {(search ||
                statusFilter !== "ALL" ||
                typeFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="mt-5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="min-w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Card</th>
                      <th className="px-5 py-4">Type</th>
                      <th className="px-5 py-4">Network</th>
                      <th className="px-5 py-4">Expiry</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredCards.map((card) => {
                      const customer = getCustomer(card);
                      const status = getCardStatus(card);

                      return (
                        <tr
                          key={card?.id || card?.cardId}
                          className="transition hover:bg-slate-50/80"
                        >
                          <td className="px-5 py-4">
                            <div className="flex min-w-[210px] items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                                <UserRound className="h-5 w-5" />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">
                                  {customer.name}
                                </p>

                                {customer.email ? (
                                  <p className="truncate text-xs text-slate-500">
                                    {customer.email}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-mono text-sm font-semibold text-slate-900">
                              {getMaskedNumber(card)}
                            </p>

                            {card?.id ? (
                              <p className="mt-1 max-w-[160px] truncate font-mono text-xs text-slate-400">
                                {card.id}
                              </p>
                            ) : null}
                          </td>

                          <td className="px-5 py-4 text-sm font-medium text-slate-700">
                            {formatLabel(getCardType(card))}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                            {getNetwork(card)}
                          </td>

                          <td className="px-5 py-4 text-sm font-medium text-slate-700">
                            {getExpiry(card)}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(
                                status,
                              )}`}
                            >
                              {formatLabel(status)}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => openCard(card)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              <Eye className="h-4 w-4" />
                              Review
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 lg:hidden">
                {filteredCards.map((card) => {
                  const customer = getCustomer(card);
                  const status = getCardStatus(card);

                  return (
                    <article
                      key={card?.id || card?.cardId}
                      className="p-4 sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            <CreditCard className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <h3 className="truncate font-bold text-slate-950">
                              {customer.name}
                            </h3>

                            {customer.email ? (
                              <p className="truncate text-xs text-slate-500">
                                {customer.email}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClass(
                            status,
                          )}`}
                        >
                          {formatLabel(status)}
                        </span>
                      </div>

                      <div className="mt-5 rounded-2xl bg-slate-950 p-4 text-white">
                        <div className="flex items-center justify-between gap-4">
                          <CreditCard className="h-7 w-7 text-white/80" />

                          <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                            {getNetwork(card)}
                          </span>
                        </div>

                        <p className="mt-8 font-mono text-lg font-semibold tracking-widest">
                          {getMaskedNumber(card)}
                        </p>

                        <div className="mt-5 flex items-end justify-between gap-4">
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-white/50">
                              Type
                            </p>
                            <p className="mt-1 text-xs font-semibold text-white/80">
                              {formatLabel(getCardType(card))}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] uppercase tracking-wider text-white/50">
                              Expires
                            </p>
                            <p className="mt-1 text-xs font-semibold text-white/80">
                              {getExpiry(card)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openCard(card)}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      >
                        <Eye className="h-4 w-4" />
                        Review card
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </button>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 shadow-sm">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

          <p>
            Card administration must never expose full PAN, CVV, PIN or other
            sensitive card credentials. This interface intentionally displays
            only masked card information. Authorization, card lifecycle
            controls and audit logging remain enforced by the backend.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminCards;
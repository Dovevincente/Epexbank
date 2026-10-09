import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";

import api from "../../services/api.js";

const normalizeProducts = (payload) => {
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload?.products)) return payload.products;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data)) return payload.data;

  if (Array.isArray(payload?.data?.products)) return payload.data.products;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;

  return [];
};

const formatMoney = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(undefined, {
      maximumFractionDigits: 2,
    })}`;
  }
};

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

const formatPercentage = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return "—";

  return `${number.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}%`;
};

const getProductName = (product) =>
  product?.name ||
  product?.productName ||
  product?.title ||
  product?.investmentName ||
  "Investment product";

const getProductDescription = (product) =>
  product?.description ||
  product?.summary ||
  product?.details ||
  "Investment product information is provided by Epex Bank.";

const getProductId = (product) =>
  product?.id ||
  product?.investmentId ||
  product?.productId ||
  null;

const getStatus = (product) =>
  String(product?.status || product?.state || "ACTIVE").toUpperCase();

const getType = (product) =>
  product?.type ||
  product?.investmentType ||
  product?.category ||
  product?.productType ||
  "Investment";

const getCurrency = (product) =>
  product?.currency?.code ||
  product?.currencyCode ||
  (typeof product?.currency === "string" ? product.currency : null) ||
  "USD";

const getMinimumAmount = (product) =>
  product?.minimumAmount ??
  product?.minAmount ??
  product?.minimumInvestment ??
  null;

const getMaximumAmount = (product) =>
  product?.maximumAmount ??
  product?.maxAmount ??
  product?.maximumInvestment ??
  null;

const getReturnRate = (product) =>
  product?.expectedReturn ??
  product?.expectedReturnRate ??
  product?.annualReturn ??
  product?.interestRate ??
  product?.rate ??
  null;

const getTerm = (product) =>
  product?.term ||
  product?.duration ||
  product?.tenor ||
  product?.termMonths ||
  null;

const InvestmentProducts = () => {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchProducts = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await api.get("/investments/products");
      const nextProducts = normalizeProducts(response?.data);

      setProducts(nextProducts);
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 404 || status === 501) {
        setError(
          "Investment products are not available from the banking API yet.",
        );
      } else {
        setError(
          requestError?.response?.data?.message ||
            requestError?.message ||
            "Unable to load investment products.",
        );
      }

      setProducts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const productTypes = useMemo(() => {
    const types = new Set();

    products.forEach((product) => {
      const type = String(getType(product)).trim();

      if (type) {
        types.add(type);
      }
    });

    return ["ALL", ...Array.from(types).sort()];
  }, [products]);

  const statusOptions = useMemo(() => {
    const statuses = new Set();

    products.forEach((product) => {
      statuses.add(getStatus(product));
    });

    return ["ALL", ...Array.from(statuses).sort()];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return products.filter((product) => {
      const name = getProductName(product).toLowerCase();
      const description = getProductDescription(product).toLowerCase();
      const type = String(getType(product)).toLowerCase();
      const status = getStatus(product);

      const matchesSearch =
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        description.includes(normalizedSearch) ||
        type.includes(normalizedSearch);

      const matchesType =
        typeFilter === "ALL" || String(getType(product)) === typeFilter;

      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [products, search, typeFilter, statusFilter]);

  const activeCount = useMemo(
    () =>
      products.filter((product) => getStatus(product) === "ACTIVE").length,
    [products],
  );

  const currencies = useMemo(() => {
    const values = new Set(
      products.map((product) => getCurrency(product)).filter(Boolean),
    );

    return Array.from(values);
  }, [products]);

  return (
    <div className="min-h-full bg-slate-50 px-4 py-5 text-slate-900 dark:bg-slate-950 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative p-6 sm:p-8">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-blue-100/70 blur-3xl dark:bg-blue-950/40" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  <BarChart3 size={24} />
                </div>

                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Investment products
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400 sm:text-base">
                  Explore investment products currently made available by
                  Epex Bank and review their terms before placing an order.
                </p>
              </div>

              <button
                type="button"
                onClick={() => fetchProducts(true)}
                disabled={loading || refreshing}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750"
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

        {/* Summary */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Available products
              </p>
              <BarChart3 size={19} className="text-blue-600" />
            </div>
            <p className="mt-3 text-2xl font-bold">{products.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Currently active
              </p>
              <ShieldCheck size={19} className="text-emerald-600" />
            </div>
            <p className="mt-3 text-2xl font-bold">{activeCount}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Currencies
              </p>
              <CircleDollarSign size={19} className="text-violet-600" />
            </div>
            <p className="mt-3 text-2xl font-bold">
              {currencies.length || 0}
            </p>
          </div>
        </section>

        {/* Filters */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="relative block flex-1">
              <span className="sr-only">Search investment products</span>
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search products..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="relative">
              <span className="sr-only">Filter by product type</span>
              <Filter
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-11 w-full min-w-48 appearance-none rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 sm:w-auto"
              >
                {productTypes.map((type) => (
                  <option key={type} value={type}>
                    {type === "ALL" ? "All types" : type}
                  </option>
                ))}
              </select>
            </label>

            <label className="relative">
              <span className="sr-only">Filter by product status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-11 w-full min-w-48 appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 pr-9 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 sm:w-auto"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === "ALL"
                      ? "All statuses"
                      : status.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* Error */}
        {error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p>{error}</p>

              <button
                type="button"
                onClick={() => fetchProducts(true)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 font-semibold text-rose-700 shadow-sm dark:bg-slate-900 dark:text-rose-300"
              >
                <RefreshCw size={16} />
                Try again
              </button>
            </div>
          </section>
        )}

        {/* Loading */}
        {loading && (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-80 animate-pulse rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
              />
            ))}
          </section>
        )}

        {/* Empty */}
        {!loading && !error && filteredProducts.length === 0 && (
          <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <BarChart3 size={26} />
            </div>

            <h2 className="mt-5 text-lg font-bold">
              {products.length
                ? "No products match your filters"
                : "No investment products available"}
            </h2>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500 dark:text-slate-400">
              {products.length
                ? "Try changing your search or filters."
                : "Investment products will appear here when they are made available through the Epex Bank investment service."}
            </p>
          </section>
        )}

        {/* Products */}
        {!loading && filteredProducts.length > 0 && (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const productId = getProductId(product);
              const name = getProductName(product);
              const description = getProductDescription(product);
              const status = getStatus(product);
              const type = getType(product);
              const currency = getCurrency(product);
              const minimumAmount = getMinimumAmount(product);
              const maximumAmount = getMaximumAmount(product);
              const returnRate = getReturnRate(product);
              const term = getTerm(product);

              const isActive = status === "ACTIVE";

              return (
                <article
                  key={productId || name}
                  className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="border-b border-slate-100 p-5 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                        <TrendingUp size={22} />
                      </div>

                      <span
                        className={[
                          "rounded-full px-3 py-1 text-xs font-bold",
                          isActive
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                        ].join(" ")}
                      >
                        {status.replaceAll("_", " ")}
                      </span>
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {type}
                      </p>

                      <h2 className="mt-1 text-xl font-bold tracking-tight">
                        {name}
                      </h2>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {description}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 p-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <Wallet size={15} />
                          <span className="text-xs font-medium">
                            Minimum
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-bold">
                          {minimumAmount === null
                            ? "—"
                            : formatMoney(minimumAmount, currency)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <CircleDollarSign size={15} />
                          <span className="text-xs font-medium">
                            Maximum
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-bold">
                          {maximumAmount === null
                            ? "—"
                            : formatMoney(maximumAmount, currency)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <TrendingUp size={15} />
                          <span className="text-xs font-medium">
                            Expected return
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-bold">
                          {formatPercentage(returnRate)}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                          <CalendarDays size={15} />
                          <span className="text-xs font-medium">
                            Term
                          </span>
                        </div>
                        <p className="mt-2 truncate text-sm font-bold">
                          {term ?? "—"}
                        </p>
                      </div>
                    </div>

                    {product?.createdAt && (
                      <p className="mt-4 text-xs text-slate-400">
                        Product available since {formatDate(product.createdAt)}
                      </p>
                    )}
                  </div>

                  <div className="border-t border-slate-100 p-5 dark:border-slate-800">
                    {productId && isActive ? (
                      <Link
                        to={`/investments/buy?productId=${encodeURIComponent(
                          productId,
                        )}`}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700"
                      >
                        Review and invest
                        <ArrowRight size={17} />
                      </Link>
                    ) : productId ? (
                      <Link
                        to={`/investments/${encodeURIComponent(productId)}`}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        View details
                        <ArrowRight size={17} />
                      </Link>
                    ) : (
                      <span className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        Product details unavailable
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0 text-emerald-600"
            />

            <div>
              <h3 className="text-sm font-bold">Investment information</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Product terms, minimum amounts, returns, maturity periods,
                fees, and eligibility are displayed from the investment
                service. Review the applicable terms before placing an order.
                Investment values can rise or fall and are not guaranteed
                unless explicitly stated by the applicable product terms.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default InvestmentProducts;
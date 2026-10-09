
import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatMoney = (value, currency) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const formatCompact = (value) =>
  new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(date);
};

const BalanceChart = ({
  data = [],
  currency = "USD",
  height = 320,
  showAvailable = false,
  loading = false,
  error = "",
  className = "",
}) => {
  const id = useId().replace(/:/g, "");
  const currencyCode =
    typeof currency === "object"
      ? currency?.code || "USD"
      : currency || "USD";

  const chartData = useMemo(
    () =>
      (Array.isArray(data) ? data : [])
        .map((item) => ({
          date: item?.date || item?.createdAt || item?.period,
          balance: Number(
            item?.balance ?? item?.ledgerBalance,
          ),
          availableBalance: Number(
            item?.availableBalance ?? item?.available,
          ),
        }))
        .filter(
          (item) =>
            item.date &&
            Number.isFinite(item.balance),
        )
        .sort(
          (a, b) =>
            new Date(a.date).getTime() -
            new Date(b.date).getTime(),
        ),
    [data],
  );

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <h2 className="text-base font-bold text-slate-900 dark:text-white">
        Balance history
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Your account balance over time
      </p>

      {loading ? (
        <div
          style={{ height }}
          className="mt-5 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
        />
      ) : error ? (
        <div
          style={{ minHeight: height }}
          className="mt-5 flex items-center justify-center text-center text-sm text-red-600"
          role="alert"
        >
          {error}
        </div>
      ) : chartData.length === 0 ? (
        <div
          style={{ minHeight: height }}
          className="mt-5 flex items-center justify-center text-center text-sm text-slate-500"
        >
          Balance history is not available yet.
        </div>
      ) : (
        <div className="mt-5 w-full" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 5, left: -15, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`${id}-balance`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#2563eb"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="100%"
                    stopColor="#2563eb"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#94a3b8"
                opacity={0.2}
              />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={20}
              />
              <YAxis
                tickFormatter={formatCompact}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatMoney(value, currencyCode),
                  name === "balance"
                    ? "Ledger balance"
                    : "Available balance",
                ]}
                labelFormatter={formatDate}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                }}
              />
              {showAvailable && <Legend />}

              <Area
                type="monotone"
                dataKey="balance"
                name="Ledger balance"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill={`url(#${id}-balance)`}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />

              {showAvailable && (
                <Area
                  type="monotone"
                  dataKey="availableBalance"
                  name="Available balance"
                  stroke="#0d9488"
                  strokeWidth={2}
                  fill="transparent"
                  strokeDasharray="5 4"
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};

export default BalanceChart;
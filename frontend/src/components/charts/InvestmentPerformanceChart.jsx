
import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const money = (value, currency) => {
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

const compact = (value) =>
  new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

const shortDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value ?? "")
    : new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric",
      }).format(date);
};

const InvestmentPerformanceChart = ({
  data = [],
  currency = "USD",
  height = 320,
  showInvested = true,
  loading = false,
  error = "",
  className = "",
}) => {
  const currencyCode =
    typeof currency === "object"
      ? currency?.code || "USD"
      : currency || "USD";

  const chartData = useMemo(
    () =>
      (Array.isArray(data) ? data : [])
        .map((item) => {
          const invested =
            item?.investedAmount ??
            item?.investedCapital ??
            item?.costBasis;

          return {
            date: item?.date || item?.period || item?.createdAt,
            value: Number(
              item?.value ??
                item?.portfolioValue ??
                item?.marketValue,
            ),
            invested:
              invested == null ? null : Number(invested),
          };
        })
        .filter(
          (item) =>
            item.date && Number.isFinite(item.value),
        )
        .sort(
          (a, b) =>
            new Date(a.date).getTime() -
            new Date(b.date).getTime(),
        ),
    [data],
  );

  const hasInvested =
    showInvested &&
    chartData.some((item) =>
      Number.isFinite(item.invested),
    );

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <h2 className="text-base font-bold text-slate-900 dark:text-white">
        Investment performance
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Portfolio value and invested capital
      </p>

      {loading ? (
        <div
          style={{ height }}
          className="mt-5 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
        />
      ) : error || chartData.length === 0 ? (
        <div
          style={{ minHeight: height }}
          className={`mt-5 flex items-center justify-center text-center text-sm ${
            error ? "text-red-600" : "text-slate-500"
          }`}
          role={error ? "alert" : undefined}
        >
          {error || "Investment performance data is not available yet."}
        </div>
      ) : (
        <div className="mt-5" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 8, left: -15, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#94a3b8"
                opacity={0.2}
              />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                minTickGap={20}
              />
              <YAxis
                tickFormatter={compact}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip
                labelFormatter={shortDate}
                formatter={(value, name) => [
                  money(value, currencyCode),
                  name,
                ]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                }}
              />
              {hasInvested && <Legend />}

              <Line
                type="monotone"
                dataKey="value"
                name="Portfolio value"
                stroke="#2563eb"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />

              {hasInvested && (
                <Line
                  type="monotone"
                  dataKey="invested"
                  name="Invested capital"
                  stroke="#0d9488"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
};

export default InvestmentPerformanceChart;
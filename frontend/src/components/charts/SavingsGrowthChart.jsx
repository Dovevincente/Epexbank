
import { useId, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const money = (value, currency) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
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

const SavingsGrowthChart = ({
  data = [],
  goalAmount = null,
  currency = "USD",
  height = 300,
  loading = false,
  error = "",
  className = "",
}) => {
  const id = useId().replace(/:/g, "");
  const currencyCode =
    typeof currency === "object"
      ? currency?.code || "USD"
      : currency || "USD";

  const goal = Number(goalAmount);
  const hasGoal =
    goalAmount != null &&
    goalAmount !== "" &&
    Number.isFinite(goal) &&
    goal > 0;

  const chartData = useMemo(
    () =>
      (Array.isArray(data) ? data : [])
        .map((item) => ({
          date: item?.date || item?.period || item?.createdAt,
          balance: Number(
            item?.balance ??
              item?.savingsBalance ??
              item?.closingBalance,
          ),
          goal: hasGoal ? goal : null,
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
    [data, goal, hasGoal],
  );

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <h2 className="text-base font-bold text-slate-900 dark:text-white">
        Savings growth
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Savings balance over time
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
          {error || "Savings history is not available yet."}
        </div>
      ) : (
        <div className="mt-5" style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -15, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`${id}-savings`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#0d9488"
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="100%"
                    stopColor="#0d9488"
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
                formatter={(value, name) => [
                  money(value, currencyCode),
                  name === "goal"
                    ? "Savings goal"
                    : "Savings balance",
                ]}
                labelFormatter={shortDate}
              />

              <Area
                type="monotone"
                dataKey="balance"
                name="Savings balance"
                stroke="#0d9488"
                strokeWidth={2.5}
                fill={`url(#${id}-savings)`}
                dot={false}
                activeDot={{ r: 5 }}
                isAnimationActive={false}
              />

              {hasGoal && (
                <Line
                  type="linear"
                  dataKey="goal"
                  name="Savings goal"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
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

export default SavingsGrowthChart;
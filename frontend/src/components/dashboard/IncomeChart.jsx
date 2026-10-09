import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatCurrency = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
};

const normalizeData = (data) => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item, index) => ({
      label:
        item?.label ??
        item?.name ??
        item?.date ??
        item?.period ??
        `Period ${index + 1}`,
      income: Number(item?.income ?? item?.amount ?? item?.value ?? 0),
    }))
    .filter((item) => Number.isFinite(item.income));
};

const CustomTooltip = ({ active, payload, label, currency }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const income = Number(payload[0]?.value ?? 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
        {formatCurrency(income, currency)}
      </p>
    </div>
  );
};

const IncomeChart = ({
  data = [],
  currency = "USD",
  loading = false,
  error = "",
  height = 280,
  title = "Income",
  description = "Income received over the selected period.",
  onRetry,
}) => {
  const chartData = normalizeData(data);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        {chartData.length > 0 ? (
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            Income
          </div>
        ) : null}
      </div>

      <div
        className="mt-5 w-full"
        style={{ height: `${Math.max(Number(height) || 280, 220)}px` }}
      >
        {loading ? (
          <div className="flex h-full animate-pulse flex-col justify-end gap-3 rounded-xl bg-slate-50 p-5 dark:bg-slate-950/40">
            <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 text-center dark:border-red-900/40 dark:bg-red-500/5">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Unable to load income data.
            </p>

            <p className="mt-1 max-w-md text-xs text-red-600/80 dark:text-red-400/70">
              {error}
            </p>

            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 text-center dark:border-slate-700 dark:bg-slate-950/30">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No income data available
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Income activity will appear here when transaction data is
                available.
              </p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{
                top: 8,
                right: 8,
                left: 0,
                bottom: 0,
              }}
            >
              <defs>
                <linearGradient
                  id="incomeGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="#2563eb"
                    stopOpacity={0.28}
                  />
                  <stop
                    offset="100%"
                    stopColor="#2563eb"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>

              <CartesianGrid
                vertical={false}
                strokeDasharray="4 4"
                className="stroke-slate-200 dark:stroke-slate-800"
              />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                minTickGap={24}
                tick={{
                  fontSize: 11,
                  fill: "currentColor",
                }}
                className="text-slate-500"
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                width={55}
                tickFormatter={(value) =>
                  formatCurrency(value, currency).replace(/\.00$/, "")
                }
                tick={{
                  fontSize: 11,
                  fill: "currentColor",
                }}
                className="text-slate-500"
              />

              <Tooltip
                cursor={{
                  stroke: "#94a3b8",
                  strokeDasharray: "4 4",
                }}
                content={
                  <CustomTooltip currency={currency} />
                }
              />

              <Area
                type="monotone"
                dataKey="income"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#incomeGradient)"
                activeDot={{
                  r: 5,
                  strokeWidth: 2,
                  fill: "#ffffff",
                  stroke: "#2563eb",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
};

export default IncomeChart;
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const DEFAULT_COLORS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#f97316",
  "#64748b",
];

const formatCurrency = (value, currency = "USD") => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return "—";
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

const normalizeData = (data) => {
  if (!Array.isArray(data)) {
    return [];
  }

  return data
    .map((item, index) => ({
      name:
        item?.name ??
        item?.category ??
        item?.label ??
        `Category ${index + 1}`,
      value: Number(
        item?.value ??
          item?.amount ??
          item?.total ??
          item?.spending ??
          0,
      ),
      color: item?.color ?? null,
    }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0);
};

const CustomTooltip = ({ active, payload, currency }) => {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0]?.payload;

  if (!item) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {item.name}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
        {formatCurrency(item.value, currency)}
      </p>
    </div>
  );
};

const SpendingChart = ({
  data = [],
  currency = "USD",
  loading = false,
  error = "",
  height = 300,
  title = "Spending",
  description = "Breakdown of spending by category.",
  onRetry,
}) => {
  const chartData = normalizeData(data);

  const total = chartData.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>

      <div
        className="mt-5 w-full"
        style={{
          height: `${Math.max(Number(height) || 300, 240)}px`,
        }}
      >
        {loading ? (
          <div className="flex h-full animate-pulse items-center justify-center">
            <div className="h-48 w-48 rounded-full border-[28px] border-slate-200 dark:border-slate-800" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 text-center dark:border-red-900/40 dark:bg-red-500/5">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              Unable to load spending data.
            </p>

            <p className="mt-1 max-w-md text-xs leading-5 text-red-600/80 dark:text-red-400/70">
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
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 px-5 text-center dark:border-slate-700">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No spending data available
              </p>

              <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500 dark:text-slate-400">
                Spending categories will appear here when transaction
                activity is available.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-5 sm:flex-row">
            <div className="h-full min-h-[220px] w-full sm:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="58%"
                    outerRadius="82%"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {chartData.map((item, index) => (
                      <Cell
                        key={`${item.name}-${index}`}
                        fill={
                          item.color ||
                          DEFAULT_COLORS[
                            index % DEFAULT_COLORS.length
                          ]
                        }
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    content={
                      <CustomTooltip currency={currency} />
                    }
                  />

                  <text
                    x="50%"
                    y="47%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-slate-900 text-lg font-bold dark:fill-white"
                  >
                    {formatCurrency(total, currency)}
                  </text>

                  <text
                    x="50%"
                    y="55%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-slate-500 text-[11px] dark:fill-slate-400"
                  >
                    Total spending
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="w-full space-y-2 sm:w-1/2">
              {chartData.map((item, index) => {
                const percentage =
                  total > 0 ? (item.value / total) * 100 : 0;

                const color =
                  item.color ||
                  DEFAULT_COLORS[
                    index % DEFAULT_COLORS.length
                  ];

                return (
                  <div
                    key={`${item.name}-legend-${index}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: color }}
                      />

                      <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-300">
                        {item.name}
                      </span>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">
                        {formatCurrency(item.value, currency)}
                      </p>

                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default SpendingChart;
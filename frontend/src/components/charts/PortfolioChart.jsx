
import { useMemo } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = [
  "#2563eb",
  "#0d9488",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#64748b",
  "#06b6d4",
];

const money = (value, currency) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
};

const PortfolioChart = ({
  data = [],
  currency = "USD",
  height = 320,
  loading = false,
  error = "",
  className = "",
}) => {
  const currencyCode =
    typeof currency === "object"
      ? currency?.code || "USD"
      : currency || "USD";

  const allocation = useMemo(() => {
    const groups = new Map();

    for (const item of Array.isArray(data) ? data : []) {
      const category = String(
        item?.category ||
          item?.assetClass ||
          item?.type ||
          "Other",
      );

      const value = Number(
        item?.marketValue ?? item?.value,
      );

      if (!Number.isFinite(value) || value <= 0) {
        continue;
      }

      groups.set(
        category,
        (groups.get(category) || 0) + value,
      );
    }

    const entries = Array.from(groups, ([name, value]) => ({
      name,
      value,
    }));

    const total = entries.reduce(
      (sum, item) => sum + item.value,
      0,
    );

    return {
      total,
      entries: entries
        .sort((a, b) => b.value - a.value)
        .map((item) => ({
          ...item,
          percentage: total
            ? (item.value / total) * 100
            : 0,
        })),
    };
  }, [data]);

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <h2 className="text-base font-bold text-slate-900 dark:text-white">
        Portfolio allocation
      </h2>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Distribution by asset category
      </p>

      {loading ? (
        <div
          style={{ height }}
          className="mt-5 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
        />
      ) : error || allocation.entries.length === 0 ? (
        <div
          style={{ minHeight: height }}
          className={`mt-5 flex items-center justify-center text-center text-sm ${
            error ? "text-red-600" : "text-slate-500"
          }`}
          role={error ? "alert" : undefined}
        >
          {error || "Portfolio allocation is not available yet."}
        </div>
      ) : (
        <>
          <p className="mt-5 text-2xl font-bold text-slate-900 dark:text-white">
            {money(allocation.total, currencyCode)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total reported market value
          </p>

          <div className="mt-4" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocation.entries}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="48%"
                  outerRadius="76%"
                  paddingAngle={2}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {allocation.entries.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    money(value, currencyCode)
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-3">
            {allocation.entries.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-4 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        COLORS[index % COLORS.length],
                    }}
                  />
                  <span className="truncate text-slate-600 dark:text-slate-300">
                    {item.name}
                  </span>
                </div>

                <span className="shrink-0 font-semibold text-slate-900 dark:text-white">
                  {item.percentage.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default PortfolioChart;
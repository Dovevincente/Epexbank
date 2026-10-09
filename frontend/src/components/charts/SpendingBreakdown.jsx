
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "#2563eb",
  "#0d9488",
  "#8b5cf6",
  "#f59e0b",
  "#ec4899",
  "#64748b",
];

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

const SpendingBreakdown = ({
  data = [],
  currency = "USD",
  height = 320,
  maxCategories = 8,
  loading = false,
  error = "",
  className = "",
}) => {
  const currencyCode =
    typeof currency === "object"
      ? currency?.code || "USD"
      : currency || "USD";

  const spending = useMemo(() => {
    const groups = new Map();

    for (const item of Array.isArray(data) ? data : []) {
      const direction = String(
        item?.direction || "",
      ).toUpperCase();

      if (
        direction === "CREDIT" ||
        direction === "IN" ||
        direction === "INCOMING"
      ) {
        continue;
      }

      const type = String(
        item?.type || "",
      ).toUpperCase();

      if (
        type.includes("REFUND") ||
        type.includes("REVERSAL")
      ) {
        continue;
      }

      const amount = Number(
        item?.amount ?? item?.total ?? item?.value,
      );

      if (!Number.isFinite(amount) || amount === 0) {
        continue;
      }

      const category = String(
        item?.category?.name ||
          item?.category ||
          item?.merchantCategory ||
          "Uncategorized",
      );

      groups.set(
        category,
        (groups.get(category) || 0) +
          Math.abs(amount),
      );
    }

    const sorted = Array.from(
      groups,
      ([name, amount]) => ({
        name,
        amount,
      }),
    ).sort((a, b) => b.amount - a.amount);

    const count =
      Number.isInteger(maxCategories) &&
      maxCategories > 0
        ? maxCategories
        : 8;

    const visible = sorted.slice(0, count);

    const remaining = sorted
      .slice(count)
      .reduce(
        (sum, item) => sum + item.amount,
        0,
      );

    if (remaining > 0) {
      visible.push({
        name: "Other",
        amount: remaining,
      });
    }

    return {
      categories: visible,
      total: sorted.reduce(
        (sum, item) => sum + item.amount,
        0,
      ),
    };
  }, [data, maxCategories]);

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <h2 className="text-base font-bold text-slate-900 dark:text-white">
        Spending breakdown
      </h2>

      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Spending by transaction category
      </p>

      {loading ? (
        <div
          style={{ height }}
          className="mt-5 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
        />
      ) : error || spending.categories.length === 0 ? (
        <div
          style={{ minHeight: height }}
          className={`mt-5 flex items-center justify-center text-center text-sm ${
            error ? "text-red-600" : "text-slate-500"
          }`}
          role={error ? "alert" : undefined}
        >
          {error || "No categorized spending data is available yet."}
        </div>
      ) : (
        <>
          <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
            Total spending in supplied transactions
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {money(spending.total, currencyCode)}
          </p>

          <div
            className="mt-5"
            style={{
              height: Math.max(
                height,
                spending.categories.length * 46 + 50,
              ),
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={spending.categories}
                layout="vertical"
                margin={{
                  top: 5,
                  right: 15,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke="#94a3b8"
                  opacity={0.2}
                />

                <XAxis
                  type="number"
                  tickFormatter={compact}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />

                <Tooltip
                  formatter={(value) => [
                    money(value, currencyCode),
                    "Spending",
                  ]}
                />

                <Bar
                  dataKey="amount"
                  name="Spending"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={25}
                  isAnimationActive={false}
                >
                  {spending.categories.map(
                    (item, index) => (
                      <cell
                        key={item.name}
                        fill={
                          COLORS[
                            index % COLORS.length
                          ]
                        }
                      />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </section>
  );
};

export default SpendingBreakdown;
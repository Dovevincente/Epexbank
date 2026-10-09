
import { useMemo } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
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

const LoanProgressChart = ({
  loan = null,
  principal,
  principalRepaid,
  currency,
  height = 240,
  loading = false,
  error = "",
  className = "",
}) => {
  const currencyCode =
    currency?.code ||
    currency ||
    loan?.currency?.code ||
    loan?.currencyCode ||
    "USD";

  const progress = useMemo(() => {
    const total = Number(
      principal ??
        loan?.principalAmount ??
        loan?.principal,
    );

    const repaid = Number(
      principalRepaid ??
        loan?.principalRepaid ??
        loan?.repaidPrincipal,
    );

    if (
      !Number.isFinite(total) ||
      total <= 0 ||
      !Number.isFinite(repaid) ||
      repaid < 0
    ) {
      return null;
    }

    const paid = Math.min(repaid, total);

    return {
      total,
      paid,
      remaining: Math.max(0, total - paid),
      percentage: (paid / total) * 100,
    };
  }, [loan, principal, principalRepaid]);

  const chartData = progress
    ? [
        { name: "Principal repaid", value: progress.paid },
        {
          name: "Principal remaining",
          value: progress.remaining,
        },
      ]
    : [];

  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <h2 className="text-base font-bold text-slate-900 dark:text-white">
        Loan repayment progress
      </h2>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        Principal repayment only; excludes interest and fees
      </p>

      {loading ? (
        <div
          style={{ height }}
          className="mt-5 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800"
        />
      ) : error || !progress ? (
        <div
          style={{ minHeight: height }}
          className={`mt-5 flex items-center justify-center text-center text-sm ${
            error ? "text-red-600" : "text-slate-500"
          }`}
          role={error ? "alert" : undefined}
        >
          {error || "Loan repayment data is not available yet."}
        </div>
      ) : (
        <>
          <div className="relative mt-4" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="72%"
                  outerRadius="90%"
                  startAngle={90}
                  endAngle={-270}
                  paddingAngle={0}
                  stroke="none"
                  isAnimationActive={false}
                >
                  <Cell fill="#2563eb" />
                  <Cell fill="#e2e8f0" />
                </Pie>
                <Tooltip
                  formatter={(value) =>
                    money(value, currencyCode)
                  }
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900 dark:text-white">
                {progress.percentage.toFixed(0)}%
              </span>
              <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Principal repaid
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-950/30">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Principal repaid
              </p>
              <p className="mt-1 break-words text-sm font-bold text-blue-900 dark:text-blue-200">
                {money(progress.paid, currencyCode)}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Principal remaining
              </p>
              <p className="mt-1 break-words text-sm font-bold text-slate-900 dark:text-white">
                {money(progress.remaining, currencyCode)}
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default LoanProgressChart;
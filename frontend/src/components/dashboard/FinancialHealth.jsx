import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

const clamp = (value, min = 0, max = 100) =>
  Math.min(Math.max(Number(value) || 0, min), max);

const formatPercent = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0%";
  }

  return `${number.toFixed(number % 1 === 0 ? 0 : 1)}%`;
};

const getMetricState = (value, goodThreshold, warningThreshold) => {
  const number = Number(value) || 0;

  if (number >= goodThreshold) {
    return "good";
  }

  if (number >= warningThreshold) {
    return "warning";
  }

  return "critical";
};

const stateClasses = {
  good: {
    icon: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    badge:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  },
  warning: {
    icon: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  },
  critical: {
    icon: "text-red-600 dark:text-red-400",
    bar: "bg-red-500",
    badge:
      "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400",
  },
};

const Metric = ({
  label,
  value,
  percentage,
  icon: Icon,
  state = "good",
  description,
}) => {
  const classes = stateClasses[state] || stateClasses.good;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 ${classes.icon}`}
          >
            <Icon size={19} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-600 dark:text-slate-400">
              {label}
            </p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
              {value}
            </p>
          </div>
        </div>

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${classes.badge}`}
        >
          {formatPercent(percentage)}
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${classes.bar}`}
          style={{ width: `${clamp(percentage)}%` }}
        />
      </div>

      {description ? (
        <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      ) : null}
    </div>
  );
};

const FinancialHealth = ({
  loading = false,
  healthScore,
  savingsRate = 0,
  spendingRate = 0,
  debtRatio = 0,
  emergencyCoverage = 0,
  onViewDetails,
}) => {
  if (loading) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="animate-pulse">
          <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-2 h-4 w-64 rounded bg-slate-100 dark:bg-slate-800" />

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-32 rounded-2xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const score = clamp(healthScore);

  const scoreState =
    score >= 75 ? "good" : score >= 50 ? "warning" : "critical";

  const scoreText =
    score >= 75
      ? "Your finances are in a healthy range."
      : score >= 50
        ? "Your finances have room for improvement."
        : "Your current financial position needs attention.";

  const savingsState = getMetricState(savingsRate, 60, 30);

  const spendingPercentage = clamp(spendingRate);
  const spendingState =
    spendingPercentage <= 50
      ? "good"
      : spendingPercentage <= 75
        ? "warning"
        : "critical";

  const debtPercentage = clamp(debtRatio);
  const debtState =
    debtPercentage <= 30
      ? "good"
      : debtPercentage <= 50
        ? "warning"
        : "critical";

  const emergencyState =
    emergencyCoverage >= 75
      ? "good"
      : emergencyCoverage >= 40
        ? "warning"
        : "critical";

  const scoreIcon =
    scoreState === "good"
      ? CheckCircle2
      : scoreState === "warning"
        ? Activity
        : TrendingDown;

  const ScoreIcon = scoreIcon;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck
              size={20}
              className="text-blue-600 dark:text-blue-400"
            />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Financial Health
            </h2>
          </div>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            A snapshot of the financial indicators available on your account.
          </p>
        </div>

        {onViewDetails ? (
          <button
            type="button"
            onClick={onViewDetails}
            className="self-start text-sm font-semibold text-blue-600 transition hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View details
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center dark:border-slate-800 dark:bg-slate-950/40">
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-[10px] border-slate-200 dark:border-slate-800">
            <div
              className={`absolute inset-[-10px] rounded-full border-[10px] border-transparent ${
                scoreState === "good"
                  ? "border-t-emerald-500"
                  : scoreState === "warning"
                    ? "border-t-amber-500"
                    : "border-t-red-500"
              }`}
            />

            <div>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white">
                {Math.round(score)}
              </p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                / 100
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <ScoreIcon
              size={17}
              className={stateClasses[scoreState].icon}
            />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Financial score
            </span>
          </div>

          <p className="mt-2 max-w-[180px] text-xs leading-5 text-slate-500 dark:text-slate-400">
            {scoreText}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Metric
            label="Savings strength"
            value="Savings rate"
            percentage={savingsRate}
            icon={ArrowUpRight}
            state={savingsState}
            description="Measures the portion of available income being directed toward savings."
          />

          <Metric
            label="Spending control"
            value="Spending rate"
            percentage={spendingPercentage}
            icon={TrendingDown}
            state={spendingState}
            description="Lower spending relative to income generally leaves more room for savings and obligations."
          />

          <Metric
            label="Debt exposure"
            value="Debt ratio"
            percentage={debtPercentage}
            icon={WalletCards}
            state={debtState}
            description="Shows the current debt burden represented in the financial-health calculation."
          />

          <Metric
            label="Emergency coverage"
            value="Cash reserve"
            percentage={emergencyCoverage}
            icon={ShieldCheck}
            state={emergencyState}
            description="Indicates how much of the configured emergency-reserve target is currently covered."
          />
        </div>
      </div>
    </section>
  );
};

export default FinancialHealth;
import {
  ArrowDownRight,
  ArrowUpRight,
  BriefcaseBusiness,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";

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

const OverviewItem = ({
  label,
  value,
  icon: Icon,
  tone = "blue",
  change,
  changeLabel,
}) => {
  const tones = {
    blue: {
      icon: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    },
    violet: {
      icon: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
    },
    rose: {
      icon: "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400",
    },
  };

  const selectedTone = tones[tone] || tones.blue;
  const numericChange = Number(change);
  const hasChange = Number.isFinite(numericChange);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${selectedTone.icon}`}
        >
          <Icon size={20} />
        </div>

        {hasChange ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${
              numericChange >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {numericChange >= 0 ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}
            {Math.abs(numericChange).toFixed(1)}%
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xl font-bold text-slate-900 dark:text-white">
        {value}
      </p>

      {changeLabel ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {changeLabel}
        </p>
      ) : null}
    </div>
  );
};

const FinancialOverview = ({
  loading = false,
  currency = "USD",
  income = 0,
  expenses = 0,
  savings = 0,
  investments = 0,
  liabilities = 0,
  netWorth,
  incomeChange,
  expenseChange,
  savingsChange,
  investmentChange,
  liabilityChange,
}) => {
  if (loading) {
    return (
      <section>
        <div className="mb-4 animate-pulse">
          <div className="h-5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
          <div className="mt-2 h-4 w-72 rounded bg-slate-100 dark:bg-slate-800" />
        </div>

        <div className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((item) => (
            <div
              key={item}
              className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      </section>
    );
  }

  const calculatedNetWorth =
    netWorth !== undefined && netWorth !== null
      ? Number(netWorth)
      : Number(income || 0) -
        Number(expenses || 0) +
        Number(savings || 0) +
        Number(investments || 0) -
        Number(liabilities || 0);

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          Financial Overview
        </h2>

        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Your current financial position based on available account data.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <OverviewItem
          label="Income"
          value={formatCurrency(income, currency)}
          icon={ArrowUpRight}
          tone="emerald"
          change={incomeChange}
          changeLabel="Compared with previous period"
        />

        <OverviewItem
          label="Expenses"
          value={formatCurrency(expenses, currency)}
          icon={ArrowDownRight}
          tone="rose"
          change={expenseChange}
          changeLabel="Compared with previous period"
        />

        <OverviewItem
          label="Savings"
          value={formatCurrency(savings, currency)}
          icon={PiggyBank}
          tone="blue"
          change={savingsChange}
          changeLabel="Compared with previous period"
        />

        <OverviewItem
          label="Investments"
          value={formatCurrency(investments, currency)}
          icon={TrendingUp}
          tone="violet"
          change={investmentChange}
          changeLabel="Compared with previous period"
        />

        <OverviewItem
          label="Liabilities"
          value={formatCurrency(liabilities, currency)}
          icon={BriefcaseBusiness}
          tone="amber"
          change={liabilityChange}
          changeLabel="Compared with previous period"
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Wallet size={19} />
          </div>

          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Net position
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Calculated from the values supplied to this component.
            </p>
          </div>
        </div>

        <p
          className={`text-xl font-bold ${
            calculatedNetWorth >= 0
              ? "text-slate-900 dark:text-white"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {formatCurrency(calculatedNetWorth, currency)}
        </p>
      </div>
    </section>
  );
};

export default FinancialOverview;
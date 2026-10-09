import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Banknote,
  CreditCard,
  FileText,
  Landmark,
  MoreHorizontal,
  Plus,
  Send,
  WalletCards,
} from "lucide-react";

const defaultActions = [
  {
    id: "transfer",
    label: "Transfer",
    description: "Send money",
    icon: Send,
    href: "/transfers",
    tone: "blue",
  },
  {
    id: "deposit",
    label: "Deposit",
    description: "Add funds",
    icon: ArrowDownToLine,
    href: "/wallet/deposit",
    tone: "emerald",
  },
  {
    id: "withdraw",
    label: "Withdraw",
    description: "Move funds out",
    icon: ArrowUpFromLine,
    href: "/wallet/withdraw",
    tone: "amber",
  },
  {
    id: "accounts",
    label: "Accounts",
    description: "View accounts",
    icon: Landmark,
    href: "/accounts",
    tone: "violet",
  },
  {
    id: "cards",
    label: "Cards",
    description: "Manage cards",
    icon: CreditCard,
    href: "/cards",
    tone: "rose",
  },
  {
    id: "statements",
    label: "Statements",
    description: "View statements",
    icon: FileText,
    href: "/statements",
    tone: "slate",
  },
];

const toneClasses = {
  blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-500/10 dark:text-blue-400",
  emerald:
    "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-500/10 dark:text-emerald-400",
  amber:
    "bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white dark:bg-amber-500/10 dark:text-amber-400",
  violet:
    "bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white dark:bg-violet-500/10 dark:text-violet-400",
  rose:
    "bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white dark:bg-rose-500/10 dark:text-rose-400",
  slate:
    "bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white dark:bg-slate-800 dark:text-slate-300",
};

const QuickActions = ({
  actions = defaultActions,
  loading = false,
  onAction,
  title = "Quick Actions",
  description = "Access your most-used banking services.",
  maxVisible = 6,
}) => {
  const visibleActions = Array.isArray(actions)
    ? actions.slice(0, maxVisible)
    : [];

  const handleAction = (action) => {
    if (onAction) {
      onAction(action);
      return;
    }

    if (action?.href) {
      window.location.assign(action.href);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>

        <div className="hidden h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 sm:flex dark:bg-slate-800 dark:text-slate-400">
          <WalletCards size={17} />
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : visibleActions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 px-5 py-8 text-center dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No quick actions available
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {visibleActions.map((action, index) => {
              const Icon = action?.icon || Banknote;
              const tone =
                toneClasses[action?.tone] || toneClasses.blue;

              return (
                <button
                  key={action?.id ?? `${action?.label}-${index}`}
                  type="button"
                  onClick={() => handleAction(action)}
                  disabled={action?.disabled}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${tone}`}
                    >
                      <Icon size={18} />
                    </div>

                    <ArrowLeftRight
                      size={14}
                      className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500 dark:text-slate-700 dark:group-hover:text-slate-400"
                    />
                  </div>

                  <p className="mt-4 truncate text-sm font-bold text-slate-900 dark:text-white">
                    {action?.label || "Action"}
                  </p>

                  {action?.description ? (
                    <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                      {action.description}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {Array.isArray(actions) && actions.length > maxVisible ? (
        <button
          type="button"
          onClick={() =>
            onAction?.({
              id: "more",
              label: "More services",
            })
          }
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <MoreHorizontal size={17} />
          View more services
        </button>
      ) : null}
    </section>
  );
};

export default QuickActions;
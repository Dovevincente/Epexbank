import {
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  Truck,
} from "lucide-react";

import BankCard from "./BankCard.jsx";

const normalizeStatus = (status) =>
  String(status || "ACTIVE").trim().toUpperCase();

const PhysicalCard = ({
  card = null,
  onClick,
  onActivate,
  onFreeze,
  onUnfreeze,
  loading = false,
  showActions = true,
  className = "",
}) => {
  const status = normalizeStatus(card?.status);

  const isPending = status === "PENDING";
  const isFrozen = status === "FROZEN";
  const isBlocked = status === "BLOCKED";

  return (
    <section
      className={[
        "space-y-4",
        className,
      ].join(" ")}
    >
      <BankCard
        card={card}
        variant="physical"
        onClick={onClick}
        className="w-full"
      />

      {showActions && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {isPending ? (
                <Truck className="h-5 w-5" />
              ) : isFrozen || isBlocked ? (
                <LockKeyhole className="h-5 w-5" />
              ) : (
                <CreditCard className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Physical card
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {isPending
                  ? "Your physical card is awaiting activation or delivery processing."
                  : isFrozen
                    ? "Your physical card is currently frozen."
                    : isBlocked
                      ? "Your physical card is blocked."
                      : "Your physical card is available for eligible card transactions."}
              </p>
            </div>

            <span
              className={[
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1",
                "text-[10px] font-bold uppercase tracking-wide",
                status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : status === "FROZEN"
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
              ].join(" ")}
            >
              {status === "ACTIVE" && (
                <CheckCircle2 className="h-3 w-3" />
              )}
              {status}
            </span>
          </div>

          {isPending &&
            typeof onActivate === "function" && (
              <button
                type="button"
                disabled={loading || !card?.id}
                onClick={onActivate}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {loading
                  ? "Activating..."
                  : "Activate physical card"}
              </button>
            )}

          {isFrozen &&
            typeof onUnfreeze === "function" && (
              <button
                type="button"
                disabled={loading || !card?.id}
                onClick={onUnfreeze}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCircle2 className="h-4 w-4" />
                {loading
                  ? "Unfreezing..."
                  : "Unfreeze physical card"}
              </button>
            )}

          {isBlocked && (
            <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 dark:border-red-950 dark:bg-red-950/30">
              <p className="text-xs leading-5 text-red-700 dark:text-red-300">
                This physical card is blocked and cannot be
                reactivated through the standard card controls.
              </p>
            </div>
          )}

          {isActive &&
            typeof onFreeze === "function" && (
              <button
                type="button"
                disabled={loading || !card?.id}
                onClick={onFreeze}
                className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-bold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <LockKeyhole className="h-4 w-4" />
                {loading
                  ? "Freezing..."
                  : "Temporarily freeze card"}
              </button>
            )}
        </div>
      )}
    </section>
  );
};

export default PhysicalCard;
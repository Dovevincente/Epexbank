import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  Loader2,
  ShieldAlert,
  X,
} from "lucide-react";

const ACTION_CONFIG = {
  FREEZE: {
    title: "Freeze card",
    description:
      "Temporarily prevent new transactions on this card. You can unfreeze it later.",
    confirmLabel: "Freeze card",
    tone: "amber",
    icon: ShieldAlert,
  },
  UNFREEZE: {
    title: "Unfreeze card",
    description:
      "Restore this card so it can be used for eligible transactions again.",
    confirmLabel: "Unfreeze card",
    tone: "emerald",
    icon: CheckCircle2,
  },
  BLOCK: {
    title: "Block card",
    description:
      "Permanently block this card. This action should only be used if the card is lost, stolen, or compromised.",
    confirmLabel: "Block card",
    tone: "red",
    icon: AlertTriangle,
  },
  ACTIVATE: {
    title: "Activate card",
    description:
      "Activate this card so it can be used for eligible transactions.",
    confirmLabel: "Activate card",
    tone: "blue",
    icon: CheckCircle2,
  },
};

const CardActionModal = ({
  open = false,
  action = "FREEZE",
  card = null,
  onClose,
  onConfirm,
  loading = false,
  error = "",
  title,
  description,
  confirmLabel,
}) => {
  if (!open) {
    return null;
  }

  const normalizedAction = String(action).toUpperCase();
  const config =
    ACTION_CONFIG[normalizedAction] || ACTION_CONFIG.FREEZE;

  const Icon = config.icon;

  const resolvedTitle = title || config.title;
  const resolvedDescription =
    description || config.description;
  const resolvedConfirmLabel =
    confirmLabel || config.confirmLabel;

  const toneClasses = {
    blue: {
      icon: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
      button:
        "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/30",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
      button:
        "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/30",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
      button:
        "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/30",
    },
    red: {
      icon: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
      button:
        "bg-red-600 hover:bg-red-700 focus:ring-red-500/30",
    },
  };

  const tone = toneClasses[config.tone] || toneClasses.blue;

  const cardLabel =
    card?.name ??
    card?.cardName ??
    card?.type ??
    card?.cardType ??
    "Bank card";

  const maskedNumber =
    card?.maskedNumber ??
    card?.maskedCardNumber ??
    card?.last4
      ? card?.last4
        ? `•••• ${card.last4}`
        : card?.maskedNumber ?? card?.maskedCardNumber
      : null;

  const handleConfirm = async () => {
    await onConfirm?.(card, normalizedAction);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose?.();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-action-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.icon}`}
            >
              <Icon size={19} />
            </div>

            <h2
              id="card-action-title"
              className="text-lg font-bold text-slate-900 dark:text-white"
            >
              {resolvedTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
              <CreditCard size={18} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {cardLabel}
              </p>

              {maskedNumber ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {maskedNumber}
                </p>
              ) : null}
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-600 dark:text-slate-400">
            {resolvedDescription}
          </p>

          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900/40 dark:bg-red-500/5">
              <AlertTriangle
                size={17}
                className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
              />
              <p className="text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${tone.button}`}
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Processing...
                </>
              ) : (
                resolvedConfirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardActionModal;
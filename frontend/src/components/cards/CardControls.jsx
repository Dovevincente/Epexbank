import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  LockOpen,
  RefreshCw,
  ShieldBan,
} from "lucide-react";

const normalizeStatus = (status) =>
  String(status || "ACTIVE").trim().toUpperCase();

const ActionButton = ({
  icon: Icon,
  label,
  description,
  onClick,
  disabled = false,
  tone = "default",
}) => {
  const toneClasses = {
    default:
      "border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    warning:
      "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
    danger:
      "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "group flex min-h-16 w-full items-center gap-3 rounded-2xl border p-3 text-left",
        "transition duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        toneClasses[tone] || toneClasses.default,
      ].join(" ")}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80">
        <Icon className="h-5 w-5" />
      </span>

      <span className="min-w-0">
        <span className="block text-sm font-bold">
          {label}
        </span>

        <span className="mt-0.5 block text-xs leading-5 opacity-70">
          {description}
        </span>
      </span>
    </button>
  );
};

const CardControls = ({
  card = null,
  loading = false,
  disabled = false,
  onFreeze,
  onUnfreeze,
  onActivate,
  onBlock,
  onReplacement,
  showBlock = true,
  showReplacement = true,
  className = "",
}) => {
  const status = normalizeStatus(card?.status);

  const isFrozen = status === "FROZEN";
  const isBlocked = status === "BLOCKED";
  const isPending = status === "PENDING";
  const isActive = status === "ACTIVE";

  const actionDisabled =
    disabled ||
    loading ||
    !card?.id;

  if (!card) {
    return (
      <section
        className={[
          "rounded-2xl border border-slate-200 bg-white p-5",
          "dark:border-slate-800 dark:bg-slate-900",
          className,
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />

          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Card controls unavailable
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Select a valid card before using card controls.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className={[
        "rounded-2xl border border-slate-200 bg-white p-5",
        "dark:border-slate-800 dark:bg-slate-900",
        className,
      ].join(" ")}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            Card controls
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Manage the security status of this card.
          </p>
        </div>

        {loading && (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Updating...
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {isActive && typeof onFreeze === "function" && (
          <ActionButton
            icon={Lock}
            label="Freeze card"
            description="Temporarily stop card transactions."
            onClick={onFreeze}
            disabled={actionDisabled}
            tone="warning"
          />
        )}

        {isFrozen && typeof onUnfreeze === "function" && (
          <ActionButton
            icon={LockOpen}
            label="Unfreeze card"
            description="Restore card transactions."
            onClick={onUnfreeze}
            disabled={actionDisabled}
            tone="success"
          />
        )}

        {isPending && typeof onActivate === "function" && (
          <ActionButton
            icon={CheckCircle2}
            label="Activate card"
            description="Activate this card when it is ready."
            onClick={onActivate}
            disabled={actionDisabled}
            tone="success"
          />
        )}

        {!isBlocked &&
          showBlock &&
          typeof onBlock === "function" && (
            <ActionButton
              icon={ShieldBan}
              label="Block card"
              description="Permanently block this card."
              onClick={onBlock}
              disabled={actionDisabled}
              tone="danger"
            />
          )}

        {!isBlocked &&
          showReplacement &&
          typeof onReplacement === "function" && (
            <ActionButton
              icon={RefreshCw}
              label="Request replacement"
              description="Request a replacement for this card."
              onClick={onReplacement}
              disabled={actionDisabled}
              tone="default"
            />
          )}
      </div>

      {isBlocked && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-950 dark:bg-red-950/30">
          <ShieldBan className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

          <div>
            <p className="text-sm font-bold text-red-800 dark:text-red-300">
              This card is blocked
            </p>

            <p className="mt-1 text-xs leading-5 text-red-700 dark:text-red-400">
              Blocked cards cannot be restored through the normal
              freeze/unfreeze controls. Contact Epex Bank support if
              further assistance is required.
            </p>
          </div>
        </div>
      )}
    </section>
  );
};

export default CardControls;
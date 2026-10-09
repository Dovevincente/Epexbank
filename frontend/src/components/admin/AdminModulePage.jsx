import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";

const ICONS = {
  activity: Activity,
  analytics: BarChart3,
  users: Users,
  security: ShieldCheck,
  documents: FileText,
  success: CheckCircle2,
  pending: Clock3,
};

const AdminModulePage = ({
  title,
  description,
  icon = "analytics",
  children,
  actions = [],
  notice,
}) => {
  const Icon =
    typeof icon === "string"
      ? ICONS[icon] || BarChart3
      : icon;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                Administration
              </span>
            </div>

            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h1>

            {description && (
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const ActionIcon =
                action.icon || RefreshCw;

              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className={[
                    "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
                    action.primary
                      ? "bg-slate-950 text-white hover:bg-slate-800"
                      : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    action.disabled
                      ? "cursor-not-allowed opacity-50"
                      : "",
                  ].join(" ")}
                >
                  <ActionIcon className="h-4 w-4" />
                  {action.label}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* SECURITY NOTICE */}
      {notice && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />

          <div>
            <p className="text-sm font-semibold text-blue-900">
              Administrative access
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              {notice}
            </p>
          </div>
        </div>
      )}

      {/* CONTENT */}
      {children || <AdminEmptyState />}
    </div>
  );
};

const AdminEmptyState = () => (
  <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <FileText className="h-6 w-6" />
      </div>

      <h2 className="mt-5 text-lg font-bold text-slate-900">
        No records available
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-500">
        There is currently no information available for this administrative
        module.
      </p>
    </div>
  </section>
);

export default AdminModulePage;
import {
  ArrowRight,
  ChevronRight,
  FileText,
  Plus,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { Link } from "react-router-dom";

import Button from "./Button.jsx";
import PageLoader from "./PageLoader.jsx";
import ErrorState from "./ErrorState.jsx";
import EmptyState from "./EmptyState.jsx";

const ModulePage = ({
  title,
  description,
  icon: Icon = FileText,
  actions = [],
  children,
  loading = false,
  error = null,
  onRetry,
  empty = false,
  emptyTitle = "Nothing to display",
  emptyDescription = "There is currently no information available.",
  emptyAction,
  breadcrumbs = [],
  className = "",
}) => {
  if (loading) {
    return <PageLoader message={`Loading ${title.toLowerCase()}...`} />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* =====================================================
          BREADCRUMBS
      ====================================================== */}
      {breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1 overflow-x-auto text-xs text-slate-400"
        >
          {breadcrumbs.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className="flex shrink-0 items-center gap-1"
            >
              {item.path ? (
                <Link
                  to={item.path}
                  className="transition hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-slate-600">
                  {item.label}
                </span>
              )}

              {index < breadcrumbs.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </div>
          ))}
        </nav>
      )}

      {/* =====================================================
          HEADER
      ====================================================== */}
      <section className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {title}
            </h1>

            {description && (
              <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">
                {description}
              </p>
            )}
          </div>
        </div>

        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => {
              const ActionIcon =
                action.icon ||
                (action.primary ? Plus : ArrowRight);

              if (action.href) {
                return (
                  <Link
                    key={action.label}
                    to={action.href}
                    className={[
                      "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
                      action.primary
                        ? "bg-slate-950 text-white hover:bg-slate-800"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <ActionIcon className="h-4 w-4" />
                    {action.label}
                  </Link>
                );
              }

              return (
                <Button
                  key={action.label}
                  variant={
                    action.primary
                      ? "primary"
                      : "secondary"
                  }
                  onClick={action.onClick}
                  loading={action.loading}
                  leftIcon={
                    <ActionIcon className="h-4 w-4" />
                  }
                >
                  {action.label}
                </Button>
              );
            })}
          </div>
        )}
      </section>

      {/* =====================================================
          ERROR
      ====================================================== */}
      {error && (
        <ErrorState
          error={error}
          onRetry={onRetry}
        />
      )}

      {/* =====================================================
          EMPTY STATE
      ====================================================== */}
      {empty ? (
        <EmptyState
          icon={Icon}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        children
      )}
    </div>
  );
};

export default ModulePage;
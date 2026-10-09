import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PageHeader = ({
  title,
  description,
  icon: Icon,
  eyebrow,
  badge,
  actions,
  breadcrumbs,
  showBack = false,
  onBack,
  backLabel = "Back",
  className = "",
  align = "start",
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    navigate(-1);
  };

  return (
    <header className={`w-full ${className}`}>
      {breadcrumbs ? (
        <div className="mb-4">{breadcrumbs}</div>
      ) : null}

      <div
        className={`flex flex-col gap-5 ${
          align === "center"
            ? "items-center text-center"
            : "sm:flex-row sm:items-start sm:justify-between"
        }`}
      >
        <div
          className={`min-w-0 ${
            align === "center" ? "flex flex-col items-center" : ""
          }`}
        >
          {showBack ? (
            <button
              type="button"
              onClick={handleBack}
              className="mb-3 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ArrowLeft size={16} />
              {backLabel}
            </button>
          ) : null}

          {eyebrow ? (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
              {eyebrow}
            </p>
          ) : null}

          <div className="flex items-start gap-3">
            {Icon ? (
              <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                <Icon size={21} />
              </div>
            ) : null}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                  {title}
                </h1>

                {badge ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {badge}
                  </span>
                ) : null}
              </div>

              {description ? (
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {description}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {actions ? (
          <div
            className={`flex shrink-0 flex-wrap items-center gap-2 ${
              align === "center" ? "justify-center" : ""
            }`}
          >
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
};

export default PageHeader;
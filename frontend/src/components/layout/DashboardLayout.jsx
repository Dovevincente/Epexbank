import { Menu } from "lucide-react";
import { useEffect } from "react";

const DashboardLayout = ({
  children,
  sidebar,
  topbar,
  footer,
  header,
  breadcrumbs,
  title,
  description,
  actions,
  onOpenMobileNav,
  className = "",
  contentClassName = "",
  showHeader = true,
}) => {
  useEffect(() => {
    const handleOpenMobileNav = () => {
      onOpenMobileNav?.();
    };

    window.addEventListener(
      "epex:open-mobile-nav",
      handleOpenMobileNav,
    );

    return () => {
      window.removeEventListener(
        "epex:open-mobile-nav",
        handleOpenMobileNav,
      );
    };
  }, [onOpenMobileNav]);

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white ${className}`}
    >
      {sidebar}

      <div className="min-h-screen lg:pl-72">
        {topbar}

        <main className="min-h-[calc(100vh-4rem)]">
          {showHeader &&
          (header ||
            breadcrumbs ||
            title ||
            description ||
            actions) ? (
            <div className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8">
                {breadcrumbs ? (
                  <div className="mb-4">{breadcrumbs}</div>
                ) : null}

                {header ? (
                  header
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      {title ? (
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                          {title}
                        </h1>
                      ) : null}

                      {description ? (
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {description}
                        </p>
                      ) : null}
                    </div>

                    {actions ? (
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {actions}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div
            className={`mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 ${contentClassName}`}
          >
            {children}
          </div>
        </main>

        {footer}
      </div>

      {onOpenMobileNav ? (
        <button
          type="button"
          onClick={onOpenMobileNav}
          aria-label="Open navigation"
          className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700 lg:hidden"
        >
          <Menu size={21} />
        </button>
      ) : null}
    </div>
  );
};

export default DashboardLayout;
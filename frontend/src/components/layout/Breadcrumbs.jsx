import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const prettifySegment = (segment) => {
  if (!segment) return "";

  return decodeURIComponent(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const Breadcrumbs = ({
  items,
  homeLabel = "Dashboard",
  homePath = "/dashboard",
  currentLabel,
  className = "",
  showHome = true,
  separator: Separator = ChevronRight,
}) => {
  const location = useLocation();

  const buildItemsFromPath = () => {
    const pathname = location.pathname.replace(/^\/+|\/+$/g, "");

    if (!pathname) {
      return [];
    }

    const segments = pathname.split("/").filter(Boolean);

    return segments.map((segment, index) => {
      const path = `/${segments.slice(0, index + 1).join("/")}`;

      return {
        label: prettifySegment(segment),
        path,
      };
    });
  };

  const breadcrumbItems = Array.isArray(items)
    ? items.filter((item) => item?.label)
    : buildItemsFromPath();

  const normalizedItems = currentLabel
    ? [
        ...breadcrumbItems.filter(
          (item) =>
            String(item.label).toLowerCase() !==
            String(currentLabel).toLowerCase(),
        ),
        {
          label: currentLabel,
          current: true,
        },
      ]
    : breadcrumbItems;

  const allItems = showHome
    ? [
        {
          label: homeLabel,
          path: homePath,
          home: true,
        },
        ...normalizedItems.filter(
          (item) =>
            item.path !== homePath ||
            String(item.label).toLowerCase() !==
              String(homeLabel).toLowerCase(),
        ),
      ]
    : normalizedItems;

  if (allItems.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`w-full ${className}`}
    >
      <ol className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm scrollbar-none">
        {allItems.map((item, index) => {
          const isLast =
            index === allItems.length - 1 || item.current;
          const label = item.label;

          return (
            <li
              key={`${label}-${index}`}
              className="flex min-w-0 shrink-0 items-center"
            >
              {index > 0 ? (
                <Separator
                  size={15}
                  aria-hidden="true"
                  className="mx-1.5 shrink-0 text-slate-300 dark:text-slate-700"
                />
              ) : null}

              {isLast || !item.path ? (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={`inline-flex max-w-[180px] items-center gap-1.5 truncate ${
                    isLast
                      ? "font-semibold text-slate-900 dark:text-white"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {item.home ? (
                    <Home
                      size={14}
                      aria-hidden="true"
                      className="shrink-0"
                    />
                  ) : null}

                  <span className="truncate">{label}</span>
                </span>
              ) : (
                <Link
                  to={item.path}
                  className="inline-flex max-w-[180px] items-center gap-1.5 truncate text-slate-500 transition hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
                >
                  {item.home ? (
                    <Home
                      size={14}
                      aria-hidden="true"
                      className="shrink-0"
                    />
                  ) : null}

                  <span className="truncate">{label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumbs;
import { Search, X } from "lucide-react";

const SearchInput = ({
  value = "",
  onChange,
  onClear,
  placeholder = "Search...",
  disabled = false,
  autoFocus = false,
  className = "",
  size = "md",
}) => {
  const handleClear = () => {
    if (typeof onClear === "function") {
      onClear();
      return;
    }

    onChange?.({
      target: {
        value: "",
      },
    });
  };

  const sizeClasses =
    size === "sm"
      ? "h-9 text-sm"
      : size === "lg"
        ? "h-12 text-base"
        : "h-10 text-sm";

  return (
    <div className={`relative ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />

      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        className={`w-full rounded-xl border border-slate-200 bg-white pl-9 pr-10 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:disabled:bg-slate-950 ${sizeClasses}`}
      />

      {String(value ?? "").length > 0 ? (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
};

export default SearchInput;
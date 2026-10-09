import { Search, X } from "lucide-react";
import FormField from "./FormField.jsx";

const SearchField = ({
  value = "",
  onChange,
  onClear,
  label = "",
  name = "search",
  id,
  placeholder = "Search...",
  error = "",
  helperText = "",
  disabled = false,
  autoFocus = false,
  className = "",
  ...props
}) => {
  const hasValue = String(value ?? "").length > 0;

  const handleClear = () => {
    if (typeof onClear === "function") {
      onClear();
      return;
    }

    onChange?.({
      target: {
        name,
        value: "",
      },
    });
  };

  return (
    <FormField
      {...props}
      id={id}
      name={name}
      label={label}
      value={value}
      onChange={onChange}
      error={error}
      helperText={helperText}
      disabled={disabled}
      autoFocus={autoFocus}
      placeholder={placeholder}
      type="search"
      inputMode="search"
      autoComplete="off"
      icon={Search}
      className={className}
      trailing={
        hasValue ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear search"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null
      }
    />
  );
};

export default SearchField;
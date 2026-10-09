import { ChevronDown } from "lucide-react";

const normalizeOption = (option) => {
  if (
    typeof option === "string" ||
    typeof option === "number"
  ) {
    return {
      value: String(option),
      label: String(option),
      disabled: false,
    };
  }

  return {
    value: String(option?.value ?? ""),
    label:
      option?.label ??
      option?.name ??
      String(option?.value ?? ""),
    disabled: Boolean(option?.disabled),
  };
};

const Select = ({
  value = "",
  onChange,
  options = [],
  placeholder = "Select an option",
  label,
  name,
  id,
  error = "",
  helperText = "",
  disabled = false,
  required = false,
  className = "",
  selectClassName = "",
}) => {
  const selectId =
    id ||
    name ||
    `select-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

  const normalizedOptions = options.map(normalizeOption);

  return (
    <div className={`w-full ${className}`}>
      {label ? (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
        >
          {label}

          {required ? (
            <span
              className="ml-1 text-red-500"
              aria-hidden="true"
            >
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? `${selectId}-error`
              : helperText
                ? `${selectId}-helper`
                : undefined
          }
          className={`h-10 w-full appearance-none rounded-xl border bg-white px-3 pr-10 text-sm text-slate-900 outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 dark:bg-slate-900 dark:text-white ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500"
              : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-700 dark:focus:border-blue-500"
          } ${selectClassName}`}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}

          {normalizedOptions.map((option, index) => (
            <option
              key={`${option.value}-${index}`}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
      </div>

      {error ? (
        <p
          id={`${selectId}-error`}
          className="mt-1.5 text-xs text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      ) : helperText ? (
        <p
          id={`${selectId}-helper`}
          className="mt-1.5 text-xs text-slate-500 dark:text-slate-400"
        >
          {helperText}
        </p>
      ) : null}
    </div>
  )
};

export default Select;
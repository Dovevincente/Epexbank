import { AlertCircle } from "lucide-react";

const Input = ({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  hint,
  required = false,
  disabled = false,
  autoComplete,
  className = "",
  inputClassName = "",
  leftIcon,
  rightElement,
  ...props
}) => {
  const generatedId =
    id ||
    name ||
    `input-${Math.random()
      .toString(36)
      .slice(2, 9)}`;

  const errorId = `${generatedId}-error`;
  const hintId = `${generatedId}-hint`;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={generatedId}
          className="mb-2 block text-sm font-semibold text-slate-800"
        >
          {label}

          {required && (
            <span
              className="ml-1 text-red-500"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </span>
        )}

        <input
          id={generatedId}
          name={name}
          type={type}
          value={value ?? ""}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? errorId
              : hint
                ? hintId
                : undefined
          }
          className={[
            "min-h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-slate-900 outline-none transition",
            "placeholder:text-slate-400",
            "focus:border-slate-500 focus:ring-4 focus:ring-slate-100",
            "disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
            leftIcon ? "pl-10" : "",
            rightElement ? "pr-12" : "",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-50"
              : "border-slate-200",
            inputClassName,
          ].join(" ")}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <p
          id={errorId}
          className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-600"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {!error && hint && (
        <p
          id={hintId}
          className="mt-2 text-xs text-slate-400"
        >
          {hint}
        </p>
      )}
    </div>
  );
};

export default Input;
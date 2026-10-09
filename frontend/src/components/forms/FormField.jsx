import { forwardRef, useId } from "react";

const FormField = forwardRef(
  (
    {
      label,
      name,
      id,
      type = "text",
      value = "",
      onChange,
      onBlur,
      placeholder,
      error = "",
      helperText = "",
      required = false,
      disabled = false,
      readOnly = false,
      autoComplete,
      autoFocus = false,
      inputMode,
      min,
      max,
      step,
      pattern,
      maxLength,
      minLength,
      icon: Icon,
      trailing,
      className = "",
      inputClassName = "",
      labelClassName = "",
      ...rest
    },
    ref,
  ) => {
    const generatedId = useId();

    const fieldId = id || name || generatedId;
    const errorId = `${fieldId}-error`;
    const helperId = `${fieldId}-helper`;

    const describedBy = [
      error ? errorId : null,
      !error && helperText ? helperId : null,
    ]
      .filter(Boolean)
      .join(" ") || undefined;

    return (
      <div className={`w-full ${className}`}>
        {label ? (
          <label
            htmlFor={fieldId}
            className={`mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200 ${labelClassName}`}
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
          {Icon ? (
            <Icon
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
          ) : null}

          <input
            ref={ref}
            id={fieldId}
            name={name}
            type={type}
            value={value ?? ""}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            readOnly={readOnly}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            inputMode={inputMode}
            min={min}
            max={max}
            step={step}
            pattern={pattern}
            maxLength={maxLength}
            minLength={minLength}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`h-10 w-full rounded-xl border bg-white text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 read-only:bg-slate-50 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:disabled:bg-slate-950 dark:read-only:bg-slate-950 ${
              Icon ? "pl-10" : "px-3"
            } ${
              trailing ? "pr-10" : "pr-3"
            } ${
              error
                ? "border-red-400 focus:border-red-500 focus:ring-red-500/10 dark:border-red-500"
                : "border-slate-200 focus:border-blue-500 focus:ring-blue-500/10 dark:border-slate-700 dark:focus:border-blue-500"
            } ${inputClassName}`}
            {...rest}
          />

          {trailing ? (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {trailing}
            </div>
          ) : null}
        </div>

        {error ? (
          <p
            id={errorId}
            className="mt-1.5 text-xs text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ) : helperText ? (
          <p
            id={helperId}
            className="mt-1.5 text-xs text-slate-500 dark:text-slate-400"
          >
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);

FormField.displayName = "FormField";

export default FormField;
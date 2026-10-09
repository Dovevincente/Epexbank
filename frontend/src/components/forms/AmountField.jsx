import { DollarSign } from "lucide-react";
import FormField from "./FormField.jsx";

const AmountField = ({
  value = "",
  onChange,
  currency = "USD",
  label = "Amount",
  name = "amount",
  id,
  error = "",
  helperText = "",
  placeholder = "0.00",
  required = false,
  disabled = false,
  min = "0.01",
  max,
  step = "0.01",
  allowNegative = false,
  className = "",
  ...props
}) => {
  const currencyCode =
    typeof currency === "object"
      ? currency?.code || "USD"
      : currency || "USD";

  const normalizedValue = String(value ?? "");

  const handleChange = (event) => {
    let nextValue = event.target.value;

    if (nextValue === "") {
      onChange?.(event);
      return;
    }

    const prefix = allowNegative ? "-?" : "";

    const pattern = new RegExp(
      `^${prefix}\\d*(\\.\\d{0,2})?$`,
    );

    if (!pattern.test(nextValue)) {
      return;
    }

    const numericValue = Number(nextValue);

    if (
      Number.isFinite(numericValue) &&
      max !== undefined &&
      numericValue > Number(max)
    ) {
      return;
    }

    onChange?.(event);
  };

  return (
    <FormField
      {...props}
      id={id}
      name={name}
      label={label}
      value={normalizedValue}
      onChange={handleChange}
      error={error}
      helperText={helperText}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      type="text"
      inputMode="decimal"
      min={allowNegative ? undefined : min}
      max={max}
      step={step}
      className={className}
      icon={DollarSign}
      trailing={
        <span className="pr-1 text-xs font-semibold text-slate-400">
          {String(currencyCode).toUpperCase()}
        </span>
      }
    />
  );
};

export default AmountField;
import { CalendarDays } from "lucide-react";
import FormField from "./FormField.jsx";

const DateField = ({
  value = "",
  onChange,
  label = "Date",
  name = "date",
  id,
  error = "",
  helperText = "",
  required = false,
  disabled = false,
  min,
  max,
  className = "",
  ...props
}) => {
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
      required={required}
      disabled={disabled}
      min={min}
      max={max}
      type="date"
      icon={CalendarDays}
      className={className}
    />
  );
};

export default DateField;
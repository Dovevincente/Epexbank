import { Phone } from "lucide-react";
import FormField from "./FormField.jsx";

const PhoneField = ({
  value = "",
  onChange,
  label = "Phone number",
  name = "phone",
  id,
  error = "",
  helperText = "",
  placeholder = "+1 555 000 0000",
  required = false,
  disabled = false,
  className = "",
  ...props
}) => {
  const handleChange = (event) => {
    const nextValue = event.target.value;

    const sanitized = nextValue.replace(
      /[^\d+()\s.-]/g,
      "",
    );

    if (
      sanitized.includes("+") &&
      sanitized.indexOf("+") !== 0
    ) {
      return;
    }

    onChange?.({
      ...event,
      target: {
        ...event.target,
        value: sanitized,
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
      onChange={handleChange}
      error={error}
      helperText={helperText}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      icon={Phone}
      className={className}
    />
  );
};

export default PhoneField;
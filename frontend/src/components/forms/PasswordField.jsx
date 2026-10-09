import { useState } from "react";
import {
  Eye,
  EyeOff,
  LockKeyhole,
} from "lucide-react";
import FormField from "./FormField.jsx";

const PasswordField = ({
  value = "",
  onChange,
  label = "Password",
  name = "password",
  id,
  error = "",
  helperText = "",
  placeholder = "Enter your password",
  required = false,
  disabled = false,
  autoComplete = "current-password",
  showStrength = false,
  className = "",
  ...props
}) => {
  const [visible, setVisible] = useState(false);

  const password = String(value ?? "");

  const strength = (() => {
    let score = 0;

    if (password.length >= 10) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/\d/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score >= 5) return "Strong";
    if (score >= 3) return "Good";
    if (score >= 1) return "Weak";
    return "";
  })();

  const strengthClass =
    strength === "Strong"
      ? "text-emerald-600 dark:text-emerald-400"
      : strength === "Good"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <div className={className}>
      <FormField
        {...props}
        id={id}
        name={name}
        label={label}
        value={password}
        onChange={onChange}
        error={error}
        helperText={helperText}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        icon={LockKeyhole}
        trailing={
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            disabled={disabled}
            aria-label={
              visible
                ? "Hide password"
                : "Show password"
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            {visible ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        }
      />

      {showStrength && password ? (
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Password strength
          </span>

          <span
            className={`text-xs font-semibold ${strengthClass}`}
          >
            {strength}
          </span>
        </div>
      ) : null}
    </div>
  );
};

export default PasswordField;
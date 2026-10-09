import { useCallback, useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

const CopyButton = ({
  value,
  label = "Copy",
  copiedLabel = "Copied",
  size = "sm",
  showLabel = false,
  className = "",
  onCopied,
}) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = String(value ?? "");

    if (!text) {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");

        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";

        document.body.appendChild(textarea);
        textarea.select();

        const successful = document.execCommand("copy");

        document.body.removeChild(textarea);

        if (!successful) {
          throw new Error("Clipboard copy failed.");
        }
      }

      setError(false);
      setCopied(true);
      onCopied?.();

      window.setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setError(true);

      window.setTimeout(() => {
        setError(false);
      }, 1800);
    }
  }, [value, onCopied]);

  useEffect(() => {
    return () => {
      setCopied(false);
    };
  }, []);

  const buttonSize =
    size === "xs"
      ? "h-7 px-2 text-[11px]"
      : size === "md"
        ? "h-9 px-3 text-sm"
        : "h-8 px-2.5 text-xs";

  const title = error
    ? "Unable to copy"
    : copied
      ? copiedLabel
      : label;

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!value}
      title={title}
      aria-label={title}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white ${buttonSize} ${className}`}
    >
      {copied ? (
        <Check
          className="h-3.5 w-3.5"
          aria-hidden="true"
        />
      ) : (
        <Copy
          className="h-3.5 w-3.5"
          aria-hidden="true"
        />
      )}

      {showLabel ? (
        <span>{copied ? copiedLabel : label}</span>
      ) : null}
    </button>
  );
};

export default CopyButton;
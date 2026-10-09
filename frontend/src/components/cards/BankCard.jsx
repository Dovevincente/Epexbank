import {
  CreditCard,
  Eye,
  EyeOff,
  LockKeyhole,
  Wifi,
} from "lucide-react";
import { useMemo, useState } from "react";

const normalizeStatus = (status) =>
  String(status || "ACTIVE").trim().toUpperCase();

const maskCardNumber = (value) => {
  if (!value) return "•••• •••• •••• ••••";

  const digits = String(value).replace(/\D/g, "");

  if (!digits) return "•••• •••• •••• ••••";

  const lastFour = digits.slice(-4);

  return `•••• •••• •••• ${lastFour}`;
};

const formatCardNumber = (value, revealed) => {
  if (!value) return "•••• •••• •••• ••••";

  const digits = String(value).replace(/\D/g, "");

  if (!revealed) {
    return maskCardNumber(value);
  }

  return digits
    .replace(/(.{4})/g, "$1 ")
    .trim()
    .padEnd(19, "•");
};

const formatExpiry = (value) => {
  if (!value) return "••/••";

  const text = String(value).trim();

  if (/^\d{2}\/\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{4}-\d{2}$/.test(text)) {
    const [year, month] = text.split("-");
    return `${month}/${year.slice(-2)}`;
  }

  return text;
};

const getCardholderName = (card) =>
  card?.cardholderName ||
  card?.holderName ||
  card?.name ||
  card?.user?.name ||
  "EPEX BANK CUSTOMER";

const getCardNumber = (card) =>
  card?.cardNumber ||
  card?.number ||
  card?.pan ||
  "";

const getExpiry = (card) =>
  card?.expiryDate ||
  card?.expiresAt ||
  card?.expirationDate ||
  card?.expiry ||
  "";

const getCardType = (card) =>
  String(
    card?.cardType ||
      card?.type ||
      card?.brand ||
      "EPEX",
  ).toUpperCase();

const getStatusLabel = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized === "ACTIVE") return "Active";
  if (normalized === "FROZEN") return "Frozen";
  if (normalized === "BLOCKED") return "Blocked";
  if (normalized === "PENDING") return "Pending";
  if (normalized === "EXPIRED") return "Expired";

  return normalized
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const BankCard = ({
  card = null,
  variant = "physical",
  showNumberToggle = true,
  showDetails = true,
  onClick,
  className = "",
  compact = false,
}) => {
  const [revealed, setRevealed] = useState(false);

  const status = normalizeStatus(card?.status);
  const isVirtual =
    variant === "virtual" ||
    String(card?.type || "").toLowerCase() === "virtual" ||
    String(card?.cardType || "").toLowerCase() === "virtual";

  const cardNumber = getCardNumber(card);
  const cardholderName = useMemo(
    () => getCardholderName(card),
    [card],
  );
  const expiry = useMemo(
    () => formatExpiry(getExpiry(card)),
    [card],
  );

  const displayNumber = formatCardNumber(
    cardNumber,
    revealed,
  );

  const isUnavailable =
    status === "BLOCKED" ||
    status === "EXPIRED";

  const handleCardClick = () => {
    if (typeof onClick === "function") {
      onClick(card);
    }
  };

  const handleKeyDown = (event) => {
    if (!onClick) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCardClick();
    }
  };

  return (
    <article
      className={[
        "relative w-full overflow-hidden rounded-[1.75rem]",
        "bg-slate-950 text-white shadow-xl",
        "transition duration-200",
        onClick
          ? "cursor-pointer hover:-translate-y-1 hover:shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          : "",
        isUnavailable ? "opacity-80" : "",
        compact ? "min-h-[190px]" : "min-h-[220px]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.35),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.18),transparent_40%)]" />

      <div className="relative flex h-full min-h-[inherit] flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-white/60">
              Epex Bank
            </p>

            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-white/50">
              {isVirtual ? "Virtual card" : "Payment card"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Wifi
              className="h-5 w-5 rotate-90 text-white/80"
              aria-label="Contactless"
            />

            <div className="flex h-9 w-11 items-center justify-center rounded-lg border border-white/20 bg-white/10">
              <CreditCard className="h-5 w-5 text-white/80" />
            </div>
          </div>
        </div>

        <div className="mt-7">
          <div className="flex items-center gap-3">
            <p
              className={[
                "font-mono tracking-[0.18em] text-white",
                compact
                  ? "text-sm sm:text-base"
                  : "text-base sm:text-lg",
              ].join(" ")}
            >
              {displayNumber}
            </p>

            {showNumberToggle && cardNumber && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setRevealed((current) => !current);
                }}
                className="rounded-lg p-1.5 text-white/60 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                aria-label={
                  revealed
                    ? "Hide card number"
                    : "Show card number"
                }
              >
                {revealed ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>

        {showDetails && (
          <div className="mt-7 flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">
                Cardholder
              </p>

              <p className="mt-1 truncate text-xs font-bold uppercase tracking-wider text-white/90">
                {cardholderName}
              </p>
            </div>

            <div className="shrink-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">
                Expires
              </p>

              <p className="mt-1 font-mono text-xs font-bold text-white/90">
                {expiry}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">
                Type
              </p>

              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/90">
                {getCardType(card)}
              </p>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-5 flex items-center gap-2 sm:right-6">
          {status !== "ACTIVE" && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white/80">
              {status === "FROZEN" || status === "BLOCKED" ? (
                <LockKeyhole className="h-3 w-3" />
              ) : null}
              {getStatusLabel(status)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export default BankCard;
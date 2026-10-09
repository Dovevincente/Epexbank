import Badge from "../common/Badge.jsx";

const STATUS_LABELS = {
  COMPLETED: "Completed",
  SUCCESS: "Successful",
  SUCCESSFUL: "Successful",
  PENDING: "Pending",
  PROCESSING: "Processing",
  INITIATED: "Initiated",
  FAILED: "Failed",
  REJECTED: "Rejected",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
  CANCELED: "Cancelled",
  REVERSED: "Reversed",
  REFUNDED: "Refunded",
  REFUND_PENDING: "Refund pending",
  SCHEDULED: "Scheduled",
  ON_HOLD: "On hold",
};

const normalizeStatus = (status) =>
  String(status ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const TransactionStatus = ({
  status,
  size = "sm",
  className = "",
  showIcon = true,
}) => {
  const normalized = normalizeStatus(status);

  const label =
    STATUS_LABELS[normalized] ||
    String(status || "Unknown")
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (character) =>
        character.toUpperCase(),
      );

  return (
    <Badge
      status={normalized}
      size={size}
      icon={showIcon}
      className={className}
    >
      {label}
    </Badge>
  );
};

export default TransactionStatus;
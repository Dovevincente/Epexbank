import { RotateCcw, SlidersHorizontal } from "lucide-react";
import SearchInput from "../common/SearchInput.jsx";
import Select from "../common/Select.jsx";
import DateField from "../forms/DateField.jsx";

const TYPE_OPTIONS = [
  { value: "", label: "All transaction types" },
  { value: "TRANSFER", label: "Transfers" },
  { value: "DEPOSIT", label: "Deposits" },
  { value: "WITHDRAWAL", label: "Withdrawals" },
  { value: "PAYMENT", label: "Payments" },
  { value: "CARD", label: "Card transactions" },
  { value: "FEE", label: "Fees" },
  { value: "INTEREST", label: "Interest" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "FAILED", label: "Failed" },
  { value: "REVERSED", label: "Reversed" },
];

const DIRECTION_OPTIONS = [
  { value: "", label: "All directions" },
  { value: "CREDIT", label: "Money in" },
  { value: "DEBIT", label: "Money out" },
];

const TransactionFilters = ({
  filters = {},
  onChange,
  onReset,
  showSearch = true,
  showType = true,
  showStatus = true,
  showDirection = true,
  showDates = true,
  className = "",
}) => {
  const current = {
    search: filters.search ?? "",
    type: filters.type ?? "",
    status: filters.status ?? "",
    direction: filters.direction ?? "",
    fromDate: filters.fromDate ?? "",
    toDate: filters.toDate ?? "",
  };

  const update = (field, value) => {
    onChange?.({
      ...current,
      [field]: value,
    });
  };

  const hasActiveFilters = Object.values(current).some(
    (value) => String(value ?? "").trim() !== "",
  );

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <SlidersHorizontal className="h-4 w-4" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Filter transactions
            </h3>

            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              Narrow down your transaction history
            </p>
          </div>
        </div>

        {hasActiveFilters && onReset ? (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        {showSearch ? (
          <div className="lg:col-span-4">
            <SearchInput
              value={current.search}
              onChange={(event) =>
                update(
                  "search",
                  event.target.value,
                )
              }
              onClear={() => update("search", "")}
              placeholder="Search transactions..."
            />
          </div>
        ) : null}

        {showType ? (
          <div className="lg:col-span-2">
            <Select
              id="transaction-type-filter"
              name="type"
              value={current.type}
              onChange={(event) =>
                update("type", event.target.value)
              }
              options={TYPE_OPTIONS}
              placeholder=""
            />
          </div>
        ) : null}

        {showStatus ? (
          <div className="lg:col-span-2">
            <Select
              id="transaction-status-filter"
              name="status"
              value={current.status}
              onChange={(event) =>
                update(
                  "status",
                  event.target.value,
                )
              }
              options={STATUS_OPTIONS}
              placeholder=""
            />
          </div>
        ) : null}

        {showDirection ? (
          <div className="lg:col-span-2">
            <Select
              id="transaction-direction-filter"
              name="direction"
              value={current.direction}
              onChange={(event) =>
                update(
                  "direction",
                  event.target.value,
                )
              }
              options={DIRECTION_OPTIONS}
              placeholder=""
            />
          </div>
        ) : null}

        {showDates ? (
          <>
            <div className="lg:col-span-2">
              <DateField
                id="transaction-from-date"
                name="fromDate"
                label=""
                value={current.fromDate}
                onChange={(event) =>
                  update(
                    "fromDate",
                    event.target.value,
                  )
                }
              />
            </div>

            <div className="lg:col-span-2">
              <DateField
                id="transaction-to-date"
                name="toDate"
                label=""
                value={current.toDate}
                onChange={(event) =>
                  update(
                    "toDate",
                    event.target.value,
                  )
                }
              />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default TransactionFilters;
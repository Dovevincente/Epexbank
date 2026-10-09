import {
  AlertTriangle,
  LoaderCircle,
} from "lucide-react";

import Modal from "./Modal.jsx";

const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Confirm action",
  message = "Are you sure you want to continue?",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  loading = false,
  destructive = false,
}) => {
  return (
    <Modal
      open={open}
      onClose={
        loading
          ? undefined
          : onClose
      }
      title={title}
      size="sm"
      closeOnOverlay={!loading}
    >
      <div className="text-center">
        <div
          className={[
            "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl",
            destructive
              ? "bg-red-50 text-red-600"
              : "bg-amber-50 text-amber-600",
          ].join(" ")}
        >
          <AlertTriangle className="h-6 w-6" />
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-500">
          {message}
        </p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={[
              "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition disabled:opacity-50",
              destructive
                ? "bg-red-600 hover:bg-red-700"
                : "bg-slate-950 hover:bg-slate-800",
            ].join(" ")}
          >
            {loading && (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            )}

            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
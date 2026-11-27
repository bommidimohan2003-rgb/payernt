import { Modal } from "./Modal";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = true,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="p-6 space-y-5">
        <div className="flex items-start gap-3">
          {destructive && (
            <div className="h-9 w-9 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shrink-0">
              <AlertTriangle className="h-4 w-4" strokeWidth={1.5} />
            </div>
          )}
          <p className="text-sm text-[var(--admin-text-secondary)] leading-relaxed">
            {description}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--admin-border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-9 px-4 rounded-lg bg-[var(--admin-elevated)] hover:bg-[var(--admin-elevated)]/80 border border-[var(--admin-border)] text-[var(--admin-text)] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={
              destructive
                ? "h-9 px-4 rounded-lg bg-destructive hover:bg-destructive/90 text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                : "h-9 px-4 rounded-lg bg-[var(--admin-text)] text-[var(--admin-bg)] hover:opacity-90 text-xs font-medium transition-opacity cursor-pointer disabled:opacity-50"
            }
          >
            {loading ? "Processing" : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

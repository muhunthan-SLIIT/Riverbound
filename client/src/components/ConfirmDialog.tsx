// A confirmation pop-up built on the browser's <dialog> element.
// It traps keyboard focus, closes with Escape, and returns focus to the button that opened it.
import { useEffect, useId, useRef, type ReactNode } from 'react';
import '../styles/components/dialog.css';

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  pending?: boolean;
  error?: string | null;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  pending = false,
  error,
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault(); // Escape key: let React decide, so state stays in sync
        if (!pending) onCancel();
      }}
    >
      <h2 id={titleId} className="dialog__title">
        {title}
      </h2>
      <div className="dialog__body">{children}</div>
      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}
      <div className="dialog__actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={pending} autoFocus>
          {cancelLabel}
        </button>
        <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={pending} aria-busy={pending}>
          {pending ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

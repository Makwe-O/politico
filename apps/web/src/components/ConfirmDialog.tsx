import { useEffect, useId, useRef, type ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children?: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Native modal `<dialog>`: focus trap, Escape-to-cancel and focus restore come from the browser.
 * React state (`open`) is the source of truth; the effect syncs the element to it.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  pendingLabel = 'Working…',
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    // jsdom has no showModal()/close(), so fall back to toggling the attribute.
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    } else if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      // Escape fires `cancel`; don't let it dismiss the dialog mid-request.
      onCancel={(e) => {
        if (pending) e.preventDefault();
      }}
      onClose={() => {
        if (open) onCancel();
      }}
    >
      {open && (
        <>
          <h2 id={titleId} className="dialog-title">
            {title}
          </h2>
          {children}
          <div className="dialog-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onCancel}
              disabled={pending}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button button-danger"
              onClick={onConfirm}
              disabled={pending}
            >
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}

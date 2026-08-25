"use client";

import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import styles from "./admin-shell.module.css";
import { humanizeError } from "./admin-ui";

export type AdminConfirmationRequest = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
};

type AdminConfirmAction = (
  request: AdminConfirmationRequest,
  execute?: () => Promise<void>,
) => Promise<boolean>;

const AdminConfirmationContext = createContext<AdminConfirmAction | null>(null);

export function AdminConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Keep it",
  pending,
  error,
  onCancel,
  onConfirm,
  onAfterClose,
}: AdminConfirmationRequest & {
  open: boolean;
  pending: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
  onAfterClose?: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const previousBodyOverflowRef = useRef<string | null>(null);
  const closeNotificationRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();

  const restorePageState = useCallback(() => {
    if (previousBodyOverflowRef.current !== null) {
      document.body.style.overflow = previousBodyOverflowRef.current;
      previousBodyOverflowRef.current = null;
    }
    const returnTarget = returnFocusRef.current;
    returnFocusRef.current = null;
    if (returnTarget?.isConnected) {
      returnTarget.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      closeNotificationRef.current = false;
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      previousBodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialog.showModal();
      cancelRef.current?.focus({ preventScroll: true });
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(
    () => () => {
      if (previousBodyOverflowRef.current !== null) {
        document.body.style.overflow = previousBodyOverflowRef.current;
      }
    },
    [],
  );

  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const controls = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);

    if (!first || !last) {
      event.preventDefault();
      dialog.focus({ preventScroll: true });
    } else if (
      event.shiftKey &&
      (document.activeElement === first || document.activeElement === dialog)
    ) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (
      !event.shiftKey &&
      (document.activeElement === last || document.activeElement === dialog)
    ) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.confirmDialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-modal="true"
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onClose={() => {
        if (closeNotificationRef.current) return;
        closeNotificationRef.current = true;
        restorePageState();
        if (open && !pending) onCancel();
        onAfterClose?.();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !pending) onCancel();
      }}
      onKeyDown={containFocus}
    >
      <div className={styles.confirmDialogPanel} aria-busy={pending}>
        <header>
          <span className={styles.confirmDialogIcon} aria-hidden>
            <ExclamationTriangleIcon width={22} height={22} />
          </span>
          <div>
            <h2 id={titleId}>{title}</h2>
            <p id={descriptionId}>{description}</p>
            {error ? (
              <p className={styles.confirmDialogError} role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </header>
        <footer>
          <button
            ref={cancelRef}
            className={styles.secondaryButton}
            type="button"
            disabled={pending}
            data-dialog-cancel
            onClick={onCancel}
          >
            <XMarkIcon aria-hidden width={18} height={18} />
            {cancelLabel}
          </button>
          <button
            className={styles.dangerButton}
            type="button"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? (
              <ArrowPathIcon
                className={styles.confirmDialogSpinner}
                aria-hidden
                width={18}
                height={18}
              />
            ) : null}
            {pending ? "Working…" : confirmLabel}
          </button>
        </footer>
      </div>
    </dialog>
  );
}

type PendingConfirmation = {
  request: AdminConfirmationRequest;
  execute?: () => Promise<void>;
  open: boolean;
};

export function AdminConfirmationProvider({ children }: { children: ReactNode }) {
  const [pendingConfirmation, setPendingConfirmation] =
    useState<PendingConfirmation | null>(null);
  const [executing, setExecuting] = useState(false);
  const [actionError, setActionError] = useState("");
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  const outcomeRef = useRef(false);
  const executingRef = useRef(false);

  const confirm = useCallback<AdminConfirmAction>((request, execute) => {
    if (resolverRef.current !== null) return Promise.resolve(false);

    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      outcomeRef.current = false;
      executingRef.current = false;
      setExecuting(false);
      setActionError("");
      setPendingConfirmation({
        request,
        ...(execute ? { execute } : {}),
        open: true,
      });
    });
  }, []);

  const closeWithOutcome = useCallback((confirmed: boolean) => {
    if (resolverRef.current === null) return;
    outcomeRef.current = confirmed;
    setPendingConfirmation((current) =>
      current === null ? null : { ...current, open: false },
    );
  }, []);

  const resolveAfterClose = useCallback(() => {
    const resolve = resolverRef.current;
    if (resolve === null) return;
    resolverRef.current = null;
    executingRef.current = false;
    setExecuting(false);
    setActionError("");
    setPendingConfirmation(null);
    resolve(outcomeRef.current);
  }, []);

  const executeOrConfirm = useCallback(async () => {
    if (executingRef.current || pendingConfirmation === null) return;
    if (pendingConfirmation.execute === undefined) {
      closeWithOutcome(true);
      return;
    }

    executingRef.current = true;
    setExecuting(true);
    setActionError("");
    try {
      await pendingConfirmation.execute();
      closeWithOutcome(true);
    } catch (error) {
      setActionError(humanizeError(error));
      setExecuting(false);
      executingRef.current = false;
    }
  }, [closeWithOutcome, pendingConfirmation]);

  useEffect(
    () => () => {
      resolverRef.current?.(false);
      resolverRef.current = null;
      executingRef.current = false;
    },
    [],
  );

  return (
    <AdminConfirmationContext.Provider value={confirm}>
      {children}
      {pendingConfirmation ? (
        <AdminConfirmDialog
          {...pendingConfirmation.request}
          open={pendingConfirmation.open}
          pending={executing}
          error={actionError || undefined}
          onCancel={() => closeWithOutcome(false)}
          onConfirm={() => void executeOrConfirm()}
          onAfterClose={resolveAfterClose}
        />
      ) : null}
    </AdminConfirmationContext.Provider>
  );
}

export function useAdminConfirm() {
  const confirm = useContext(AdminConfirmationContext);
  if (confirm === null) {
    throw new Error("useAdminConfirm must be used inside AdminConfirmationProvider.");
  }
  return confirm;
}

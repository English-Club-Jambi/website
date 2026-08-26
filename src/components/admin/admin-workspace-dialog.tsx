"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import styles from "./admin-shell.module.css";

export function AdminWorkspaceDialog({
  open,
  eyebrow,
  title,
  description,
  closeLabel = "Close editor",
  onClose,
  children,
}: {
  open: boolean;
  eyebrow?: string;
  title: string;
  description?: string;
  closeLabel?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const previousBodyOverflowRef = useRef<string | null>(null);
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
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      previousBodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      dialog.showModal();
      closeRef.current?.focus({ preventScroll: true });
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
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
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
      className={styles.workspaceDialog}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-modal="true"
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        restorePageState();
        if (open) onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      onKeyDown={containFocus}
    >
      <section className={styles.workspaceDialogPanel}>
        <header>
          <div>
            {eyebrow ? <span>{eyebrow}</span> : null}
            <h2 id={titleId}>{title}</h2>
            {description ? <p id={descriptionId}>{description}</p> : null}
          </div>
          <button
            ref={closeRef}
            className={styles.iconButton}
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
          >
            <XMarkIcon aria-hidden width={20} height={20} />
          </button>
        </header>
        <div className={styles.workspaceDialogBody}>{children}</div>
      </section>
    </dialog>
  );
}

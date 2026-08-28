import {
  ArrowPathIcon,
  ExclamationTriangleIcon,
  InboxIcon,
} from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

import { classNames } from "@/components/ui";

import styles from "./admin-shell.module.css";

export function AdminPageHeading({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={classNames(styles.pageHeading, className)}>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  );
}

export function AdminSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={classNames(styles.adminSection, className)}>
      <header className={styles.sectionHeader}>
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions ? <div className={styles.sectionActions}>{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

export function AdminEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className={styles.emptyState}>
      <InboxIcon aria-hidden width={28} height={28} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function AdminLoadingRows({ label = "Loading records" }: { label?: string }) {
  return (
    <div className={styles.loadingRows} aria-busy="true" aria-label={label}>
      <span />
      <span />
      <span />
    </div>
  );
}

export function AdminError({ children }: { children: ReactNode }) {
  return (
    <p className={styles.inlineError} role="alert">
      <ExclamationTriangleIcon aria-hidden width={20} height={20} />
      {children}
    </p>
  );
}

export function AdminStatus({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return (
    <span className={styles.statusBadge} data-tone={tone}>
      {children}
    </span>
  );
}

export function LoadMoreButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <button className={styles.secondaryButton} type="button" disabled={loading} onClick={onClick}>
      <ArrowPathIcon aria-hidden width={18} height={18} className={loading ? styles.spin : undefined} />
      {loading ? "Loading…" : "Load more"}
    </button>
  );
}

export function humanizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const finalLine = message.split("\n").at(-1)?.trim();
  return finalLine && finalLine.length <= 240
    ? finalLine.replace(/^Uncaught (?:Convex)?Error:\s*/i, "")
    : "The request could not be completed. Try again.";
}

export function formatAdminDate(value: number) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

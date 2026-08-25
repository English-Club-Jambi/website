"use client";

import { ArrowPathIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useEffect } from "react";

import styles from "@/components/admin/admin-shell.module.css";

export default function AdminErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route error", error);
  }, [error]);

  return (
    <section className={styles.routeError}>
      <ExclamationTriangleIcon aria-hidden width={36} height={36} />
      <h1>The workspace could not load.</h1>
      <p>
        Check the Convex connection, then retry. No content was changed by this failed view.
      </p>
      <button className={styles.primaryButton} type="button" onClick={reset}>
        <ArrowPathIcon aria-hidden width={18} height={18} />
        Retry
      </button>
    </section>
  );
}

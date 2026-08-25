"use client";

import { ArrowPathIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { useEffect } from "react";

import styles from "@/components/practice/practice.module.css";
import { usePracticeContext } from "@/components/practice/practice-provider";

export default function PracticeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { copy } = usePracticeContext();
  useEffect(() => {
    console.error("[practice] Route error", error.digest ?? error.message);
  }, [error]);

  return (
    <section className={styles.unavailablePage}>
      <div className={`page-container ${styles.unavailableFrame}`}>
        <h1>{copy.routeErrorTitle}</h1>
        <p>{copy.routeErrorBody}</p>
        <div className={styles.errorActions}>
          <button type="button" className={styles.primaryButton} onClick={reset}>
            <ArrowPathIcon width={20} height={20} strokeWidth={2} aria-hidden />
            {copy.tryAgain}
          </button>
          <Link href="/practice" className={styles.backLink}>
            <ArrowLeftIcon width={19} height={19} strokeWidth={2} aria-hidden />
            {copy.labBack}
          </Link>
        </div>
      </div>
    </section>
  );
}

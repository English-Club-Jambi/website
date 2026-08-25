"use client";

import { PageContainer } from "@/components/ui";
import { usePracticeContext } from "@/components/practice/practice-provider";

import styles from "@/components/practice/practice.module.css";

export default function PracticeLoading() {
  const { copy } = usePracticeContext();
  return (
    <div className={styles.practiceLoading} aria-live="polite" aria-busy="true">
      <PageContainer>
        <p>{copy.contentCheck}</p>
        <div className={styles.loadingRule} />
        <div className={styles.loadingRuleShort} />
      </PageContainer>
    </div>
  );
}

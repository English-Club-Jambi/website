import {
  ArrowLeftIcon,
  BookOpenIcon,
  ClockIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

import type { PublicContentFor } from "@content/public-content";
import type { PublishedAssessment } from "@/lib/assessment";

import { StartAssessment } from "./start-assessment";
import styles from "./practice.module.css";

export function PracticeBriefing({
  assessment,
  copy,
}: {
  assessment: PublishedAssessment;
  copy: PublicContentFor<"practice">;
}) {
  const skillLabel = {
    listening: copy.skillListening,
    structure: copy.skillStructure,
    reading: copy.skillReading,
    writing: copy.skillWriting,
    speaking: copy.skillSpeaking,
  } as const;
  const time =
    assessment.approximateMinutes === null
      ? copy.untimed
      : `${assessment.approximateMinutes} ${copy.standardMinutesSuffix}`;

  return (
    <div className={styles.briefingPage}>
      <header className={`page-container ${styles.briefingHeader}`}>
        <Link href="/practice" className={styles.backLink}>
          <ArrowLeftIcon width={19} height={19} strokeWidth={2} aria-hidden />
          {copy.labBack}
        </Link>
        <h1>{assessment.title}</h1>
        <p className={styles.briefingSummary}>{assessment.summary}</p>
      </header>

      <section className={`page-container ${styles.briefingBody}`}>
        <div className={styles.briefingMain}>
          <h2>{copy.briefingTitle}</h2>
          <p>{assessment.instructions}</p>

          <dl className={styles.briefingFacts}>
            <div>
              <ClockIcon width={23} height={23} strokeWidth={1.8} aria-hidden />
              <dt>{copy.factTime}</dt>
              <dd>{time}</dd>
            </div>
            <div>
              <BookOpenIcon width={23} height={23} strokeWidth={1.8} aria-hidden />
              <dt>{copy.factAreas}</dt>
              <dd>{assessment.skills.map((skill) => skillLabel[skill]).join(", ")}</dd>
            </div>
            <div>
              <DocumentCheckIcon width={23} height={23} strokeWidth={1.8} aria-hidden />
              <dt>{copy.factResult}</dt>
              <dd>{copy.factResultBody}</dd>
            </div>
          </dl>
        </div>

        <aside className={styles.briefingLimit}>
          <ShieldCheckIcon width={29} height={29} strokeWidth={1.8} aria-hidden />
          <h2>{copy.evidenceTitle}</h2>
          <p>{copy.evidenceBody}</p>
          <p>{copy.sessionBody}</p>
        </aside>
      </section>

      <div className={`page-container ${styles.briefingStart}`}>
        <StartAssessment assessment={assessment} copy={copy} />
      </div>
    </div>
  );
}

export function PracticeUnavailable({
  title,
  message,
  connectionUnavailable,
  copy,
}: {
  title: string;
  message: string;
  connectionUnavailable: boolean;
  copy: PublicContentFor<"practice">;
}) {
  return (
    <section className={styles.unavailablePage}>
      <div className={`page-container ${styles.unavailableFrame}`}>
        <Link href="/practice" className={styles.backLink}>
          <ArrowLeftIcon width={19} height={19} strokeWidth={2} aria-hidden />
          {copy.labBack}
        </Link>
        <h1>{title}</h1>
        <p>{connectionUnavailable ? copy.unavailableCheck : message}</p>
        <p>
          {connectionUnavailable
            ? copy.unavailableRetry
            : copy.unavailableReview}
        </p>
        <Link href="/practice" className={styles.primaryLink}>
          {copy.availableAction}
        </Link>
      </div>
    </section>
  );
}

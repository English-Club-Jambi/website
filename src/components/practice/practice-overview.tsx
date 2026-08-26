import {
  ArrowRightIcon,
  BookOpenIcon,
  ClockIcon,
  DocumentCheckIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  PencilSquareIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

import type { PublicContentFor } from "@content/public-content";
import { DocumentaryImage } from "@/components/documentary-image";
import {
  practiceSkills,
  type PracticeSkill,
} from "@/content/assessment";
import { media } from "@/content/media";
import type {
  AssessmentCatalogItem,
  AssessmentRead,
  AssessmentCatalogPage,
} from "@/lib/assessment";

import styles from "./practice.module.css";

const iconBySkill = {
  listening: SpeakerWaveIcon,
  reading: BookOpenIcon,
  writing: PencilSquareIcon,
  speaking: MicrophoneIcon,
} as const;

function formatTime(
  minutes: number | null,
  copy: Pick<PublicContentFor<"practice">, "untimed" | "standardMinutesSuffix">,
) {
  if (minutes === null) {
    return copy.untimed;
  }
  return `${minutes} ${copy.standardMinutesSuffix}`;
}

function CatalogLink({
  entry,
  href,
  label,
  copy,
}: {
  entry: AssessmentCatalogItem;
  href: "/practice/full" | `/practice/quick/${PracticeSkill}`;
  label: string;
  copy: PublicContentFor<"practice">;
}) {
  return (
    <Link href={href} className={styles.catalogLink}>
      <span>{label}</span>
      <span className={styles.catalogLinkMeta}>
        {formatTime(entry.approximateMinutes, copy)}
      </span>
      <ArrowRightIcon width={22} height={22} strokeWidth={2} aria-hidden />
    </Link>
  );
}

export function PracticeOverview({
  catalog,
  copy,
}: {
  catalog: AssessmentRead<AssessmentCatalogPage>;
  copy: PublicContentFor<"practice">;
}) {
  const full = catalog.data.page.find((entry) => entry.kind === "full-practice");
  const quickBySkill = new Map(
    practiceSkills.map((skill) => [
      skill.key,
      catalog.data.page.find(
        (entry) =>
          entry.kind === "skill-quiz" &&
          entry.skills.includes(skill.backendSkill),
      ),
    ]),
  );
  const firstAvailableQuick = practiceSkills.find(
    (skill) => quickBySkill.get(skill.key) !== undefined,
  );
  const skillCopy = {
    listening: {
      title: copy.quickListeningTitle,
      summary: copy.quickListeningSummary,
    },
    reading: {
      title: copy.quickReadingTitle,
      summary: copy.quickReadingSummary,
    },
    writing: {
      title: copy.quickWritingTitle,
      summary: copy.quickWritingSummary,
    },
    speaking: {
      title: copy.quickSpeakingTitle,
      summary: copy.quickSpeakingSummary,
    },
  } as const;

  return (
    <div className={styles.practicePage}>
      <header className={styles.practiceHero}>
        <div className={`page-container ${styles.practiceHeroFrame}`}>
          <div className={styles.practiceHeroCopy}>
            <p className={styles.practiceIdentity}>{copy.identity}</p>
            <h1>{copy.title}</h1>
            <p className={styles.practiceLead}>{copy.lead}</p>
            <div className={styles.heroActions}>
              {full !== undefined ? (
                <Link href="/practice/full" className={styles.primaryLink}>
                  {copy.openFull}
                  <ArrowRightIcon width={20} height={20} strokeWidth={2} aria-hidden />
                </Link>
              ) : firstAvailableQuick !== undefined ? (
                <Link href={firstAvailableQuick.href} className={styles.primaryLink}>
                  {copy.startShort}
                  <ArrowRightIcon width={20} height={20} strokeWidth={2} aria-hidden />
                </Link>
              ) : (
                <Link href="#practice-paths" className={styles.primaryLink}>
                  {copy.reviewPaths}
                  <ArrowRightIcon width={20} height={20} strokeWidth={2} aria-hidden />
                </Link>
              )}
            </div>
          </div>

          <div className={styles.practiceHeroVisual} aria-hidden>
            <DocumentaryImage
              media={media["conversation-relay-hero-v2"]}
              ratio="4 / 3"
              sizes="(max-width: 879px) 100vw, 48vw"
              priority
              decorative
            />
          </div>

          <div className={styles.practiceLimit}>
            <ShieldCheckIcon width={25} height={25} strokeWidth={1.8} aria-hidden />
            <p>{copy.limit}</p>
          </div>
        </div>
      </header>

      <section
        id="practice-paths"
        className={`page-container ${styles.practicePaths}`}
        aria-labelledby="practice-paths-title"
      >
        <div className={styles.pathHeading}>
          <h2 id="practice-paths-title">{copy.pathsTitle}</h2>
          <p>{copy.pathsSupport}</p>
        </div>

        {catalog.state === "unavailable" ? (
          <p className={styles.connectionNotice} role="status">
            {copy.unavailable}
          </p>
        ) : null}

        <div className={styles.fullPracticeRow}>
          <DocumentCheckIcon width={32} height={32} strokeWidth={1.7} aria-hidden />
          <div>
            <h3>{copy.fullTitle}</h3>
            <p>{full?.summary ?? copy.fullSummary}</p>
          </div>
          {full !== undefined ? (
            <CatalogLink
              entry={full}
              href="/practice/full"
              label={copy.viewBriefing}
              copy={copy}
            />
          ) : (
            <p className={styles.reviewState}>{copy.noFull}</p>
          )}
        </div>

        <div className={styles.quickPracticeBlock}>
          <div className={styles.quickPracticeHeading}>
            <ClockIcon width={28} height={28} strokeWidth={1.8} aria-hidden />
            <div>
              <h3>{copy.quickTitle}</h3>
              <p>{copy.quickSummary}</p>
            </div>
          </div>

          <div className={styles.quickPracticeRows}>
            {practiceSkills.map((skill) => {
              const Icon = iconBySkill[skill.key];
              const entry = quickBySkill.get(skill.key);
              return (
                <div className={styles.quickPracticeRow} key={skill.key}>
                  <Icon width={25} height={25} strokeWidth={1.8} aria-hidden />
                  <div>
                    <h4>{skillCopy[skill.key].title}</h4>
                    <p>{entry?.summary ?? skillCopy[skill.key].summary}</p>
                  </div>
                  {entry !== undefined ? (
                    <CatalogLink
                      entry={entry}
                      href={skill.href}
                      label={copy.openBriefing}
                      copy={copy}
                    />
                  ) : (
                    <span className={styles.reviewState}>{copy.underReview}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className={styles.practiceScope} aria-labelledby="practice-scope-title">
        <div className={`page-container ${styles.practiceScopeFrame}`}>
          <h2 id="practice-scope-title">{copy.scopeTitle}</h2>
          <p>{copy.scopeBody}</p>
        </div>
      </section>
    </div>
  );
}

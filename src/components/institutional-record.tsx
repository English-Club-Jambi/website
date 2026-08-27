import {
  ArrowTopRightOnSquareIcon,
  BuildingLibraryIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import type { PublicContentFor } from "@content/public-content";

import { institution } from "@/content/institution";

import { PageContainer } from "./ui";
import styles from "./institutional-record.module.css";

const sourceLinks = [
  {
    href: institution.formationRecordUrl,
    field: "identityFormationLink" as const,
  },
  {
    href: institution.libraryUrl,
    field: "identityLibraryLink" as const,
  },
  {
    href: institution.universityIdentityUrl,
    field: "identityUniversityLink" as const,
  },
];

export function InstitutionalRecord({
  copy,
}: {
  copy: PublicContentFor<"about">;
}) {
  return (
    <section className={styles.section} aria-labelledby="institution-title">
      <PageContainer className={styles.frame}>
        <div className={styles.markColumn}>
          <div className={styles.mark}>
            <Image
              src={institution.logoSrc}
              alt={copy.identityLogoAlt}
              width={512}
              height={512}
              sizes="(max-width: 639px) 116px, 154px"
            />
          </div>
          <div className={styles.university}>
            <BuildingLibraryIcon aria-hidden width={20} height={20} />
            <p>
              <strong>{institution.universityName}</strong>
              <span>{institution.unitName}</span>
            </p>
          </div>
          <div className={styles.date}>
            <CalendarDaysIcon aria-hidden width={20} height={20} />
            <p>
              <span>Formation record</span>
              <time dateTime={institution.formedOn}>16 May 2024</time>
            </p>
          </div>
        </div>

        <div className={styles.copyColumn}>
          <p className={styles.eyebrow}>{copy.identityEyebrow}</p>
          <h2 id="institution-title">{copy.identityTitle}</h2>
          <dl className={styles.officialName}>
            <div>
              <dt>{copy.identityOfficialLabel}</dt>
              <dd>{copy.identityOfficialName}</dd>
            </div>
          </dl>
          <div className={styles.explanation}>
            <p>{copy.identityBody}</p>
            <p>{copy.identityClarifier}</p>
          </div>
          <nav className={styles.sources} aria-label="Institutional sources">
            {sourceLinks.map((source) => (
              <a
                key={source.href}
                href={source.href}
                target="_blank"
                rel="noreferrer"
              >
                <span>{copy[source.field]}</span>
                <ArrowTopRightOnSquareIcon aria-hidden width={18} height={18} />
              </a>
            ))}
          </nav>
        </div>
      </PageContainer>
    </section>
  );
}

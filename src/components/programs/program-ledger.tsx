"use client";

import {
  ArrowTopRightOnSquareIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  ClockIcon,
  LightBulbIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

import {
  programCategoryLabels,
  programDeliveryStateLabels,
  type ProgramDeliveryState,
} from "@content/programs";
import type { PublicContentFor } from "@content/public-content";
import type { PublicProgram } from "@/lib/programs";

import styles from "./programs.module.css";

const stateIcons = {
  completed: CheckBadgeIcon,
  ongoing: ClockIcon,
  planned: LightBulbIcon,
} as const;

function ProgramEntry({
  program,
  copy,
  order,
}: {
  program: PublicProgram;
  copy: PublicContentFor<"programs">;
  order: number;
}) {
  const [open, setOpen] = useState(program.featured);
  const panelId = `program-${program.slug}`;
  const Icon = stateIcons[program.deliveryState];

  return (
    <article className={styles.entry} data-open={open} data-state={program.deliveryState}>
      <button
        type="button"
        className={styles.entryTrigger}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={styles.entryIndex} aria-hidden>
          {String(order).padStart(2, "0")}
        </span>
        <span className={styles.entryIdentity}>
          <span className={styles.entryMeta}>
            <Icon aria-hidden width={18} height={18} />
            {programDeliveryStateLabels[program.deliveryState]}
            <span aria-hidden>·</span>
            {programCategoryLabels[program.category]}
          </span>
          <strong>{program.title}</strong>
          <span>{program.summary}</span>
        </span>
        <ChevronDownIcon className={styles.entryChevron} aria-hidden width={24} height={24} />
      </button>

      {open ? (
        <div id={panelId} className={styles.entryPanel}>
          <div className={styles.entryNarrative}>
            <p>{program.body}</p>
            <dl className={styles.entryFacts}>
              <div>
                <dt>{copy.audiencePrefix}</dt>
                <dd>{program.audience}</dd>
              </div>
              {program.locationLabel ? (
                <div>
                  <dt>{copy.placePrefix}</dt>
                  <dd>{program.locationLabel}</dd>
                </div>
              ) : null}
              <div>
                <dt>{copy.benefitPrefix}</dt>
                <dd>{program.communityBenefit}</dd>
              </div>
            </dl>
          </div>
          <aside className={styles.entryEvidence}>
            {program.dateLabel ? <time>{program.dateLabel}</time> : null}
            {program.sourceUrl && program.sourceLabel ? (
              <a href={program.sourceUrl} target="_blank" rel="noreferrer">
                <span>
                  {copy.sourcePrefix}
                  <small>{program.sourceLabel}</small>
                </span>
                <ArrowTopRightOnSquareIcon aria-hidden width={19} height={19} />
              </a>
            ) : (
              <p>{copy.recordNote}</p>
            )}
          </aside>
        </div>
      ) : null}
    </article>
  );
}

export function ProgramLedger({
  programs,
  copy,
}: {
  programs: ReadonlyArray<PublicProgram>;
  copy: PublicContentFor<"programs">;
}) {
  const grouped = programs.reduce<Record<ProgramDeliveryState, PublicProgram[]>>(
    (groups, program) => {
      groups[program.deliveryState].push(program);
      return groups;
    },
    { completed: [], ongoing: [], planned: [] },
  );
  const sections = [
    {
      state: "completed" as const,
      eyebrow: copy.documentedEyebrow,
      title: copy.documentedTitle,
      support: copy.documentedSupport,
    },
    {
      state: "ongoing" as const,
      eyebrow: copy.linesEyebrow,
      title: copy.linesTitle,
      support: copy.linesSupport,
    },
    {
      state: "planned" as const,
      eyebrow: copy.plannedEyebrow,
      title: copy.plannedTitle,
      support: copy.plannedBody,
    },
  ];
  let runningIndex = 0;

  return (
    <div className={styles.ledger}>
      {sections.map((section) => {
        const entries = grouped[section.state];
        if (entries.length === 0) return null;
        return (
          <section
            key={section.state}
            className={styles.ledgerSection}
            aria-labelledby={`program-section-${section.state}`}
          >
            <header className={styles.sectionHeading}>
              <p>{section.eyebrow}</p>
              <h2 id={`program-section-${section.state}`}>{section.title}</h2>
              <span>{section.support}</span>
            </header>
            <div className={styles.entries}>
              {entries.map((program) => {
                runningIndex += 1;
                return (
                  <ProgramEntry
                    key={program.slug}
                    program={program}
                    copy={copy}
                    order={runningIndex}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

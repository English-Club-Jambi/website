"use client";

import {
  ArrowUpRightIcon,
  GlobeAltIcon,
  MicrophoneIcon,
  PuzzlePieceIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { useId, useRef, useState } from "react";
import type { PublicContentFor } from "@content/public-content";

import { DocumentaryImage } from "@/components/documentary-image";
import { media } from "@/content/media";
import { getActivityThemes } from "@/content/site-copy";

import styles from "./play.module.css";

const activityIcons = {
  speak: MicrophoneIcon,
  exchange: GlobeAltIcon,
  make: PuzzlePieceIcon,
  room: UserGroupIcon,
} as const;

export function ActivityRelay({
  copy,
  context = "home",
}: {
  copy: PublicContentFor<"activities">;
  context?: "home" | "page";
}) {
  const activityThemes = getActivityThemes(copy);
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const instanceId = useId().replaceAll(":", "");
  const active = activityThemes[activeIndex];

  function select(index: number) {
    setActiveIndex(index);
  }

  function moveSelection(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % activityThemes.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + activityThemes.length) % activityThemes.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = activityThemes.length - 1;
    }

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    select(nextIndex);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={styles.activityRelay} data-context={context}>
      <div
        className={styles.activityControls}
        role="group"
        aria-label={copy.relayControlsLabel}
      >
        {activityThemes.map((activity, index) => {
          const Icon = activityIcons[activity.id];

          return (
            <button
              key={activity.id}
              ref={(element) => {
                buttonRefs.current[index] = element;
              }}
              type="button"
              className={styles.activityControl}
              aria-pressed={activeIndex === index}
              aria-controls={`${instanceId}-${activity.id}`}
              onClick={() => select(index)}
              onKeyDown={(event) => moveSelection(event, index)}
            >
              <span className={styles.activityControlLabel}>
                <Icon width={22} height={22} strokeWidth={2} aria-hidden />
                <span>{activity.verb}</span>
              </span>
              <ArrowUpRightIcon width={20} height={20} strokeWidth={2} aria-hidden />
            </button>
          );
        })}
      </div>

      <div className={styles.activityCompanion}>
        <div className={styles.activityPanels} aria-live="polite">
          {activityThemes.map((activity, index) => (
            <article
              key={activity.id}
              id={`${instanceId}-${activity.id}`}
              className={styles.activityPanel}
              data-active={activeIndex === index ? "true" : "false"}
            >
              <p className={styles.activityVerb}>{activity.verb}</p>
              <h3>{activity.title}</h3>
              <p className={styles.activityPrompt}>{activity.prompt}</p>
              <p className={styles.activityDescription}>{activity.description}</p>
              <p className={styles.activityEvidence}>{activity.evidence}</p>
            </article>
          ))}
        </div>

        <div key={active.image} className={styles.activityMedia}>
          <DocumentaryImage
            media={media[active.image]}
            ratio={active.image === "leeds-panel" ? "3 / 2" : "4 / 3"}
            sizes={context === "home" ? "(max-width: 879px) 100vw, 32vw" : "(max-width: 879px) 100vw, 38vw"}
          />
        </div>
      </div>
    </div>
  );
}

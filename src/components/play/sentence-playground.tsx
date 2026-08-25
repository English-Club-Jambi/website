"use client";

import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import Image from "next/image";
import type { PublicContentFor } from "@content/public-content";

import { ButtonLink, TextLink } from "@/components/ui";
import { media } from "@/content/media";

import styles from "./play.module.css";

const sentenceIcons = [
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon,
  QuestionMarkCircleIcon,
  ArrowPathIcon,
] as const;

export function SentencePlayground({
  copy,
}: {
  copy: PublicContentFor<"home">;
}) {
  const sentenceStates = [
    {
      key: "speak",
      label: copy.sentenceSpeakLabel,
      echo: copy.sentenceSpeakEcho,
      response: copy.sentenceSpeakResponse,
    },
    {
      key: "listen",
      label: copy.sentenceListenLabel,
      echo: copy.sentenceListenEcho,
      response: copy.sentenceListenResponse,
    },
    {
      key: "ask",
      label: copy.sentenceAskLabel,
      echo: copy.sentenceAskEcho,
      response: copy.sentenceAskResponse,
    },
    {
      key: "again",
      label: copy.sentenceAgainLabel,
      echo: copy.sentenceAgainEcho,
      response: copy.sentenceAgainResponse,
    },
  ] as const;
  const [activeIndex, setActiveIndex] = useState(0);
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = sentenceStates[activeIndex];

  function select(index: number) {
    setActiveIndex(index);
  }

  function moveSelection(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (index + 1) % sentenceStates.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (index - 1 + sentenceStates.length) % sentenceStates.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = sentenceStates.length - 1;
    }

    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    select(nextIndex);
    buttonRefs.current[nextIndex]?.focus();
  }

  return (
    <section
      className={styles.sentenceStage}
      data-sentence={active.key}
      aria-labelledby="home-title"
      style={{ "--relay-step": activeIndex } as React.CSSProperties}
    >
      <div className={styles.sentenceBackdrop} aria-hidden>
        <Image
          src={media["conversation-hero-placeholder"].src}
          alt=""
          fill
          priority
          sizes="100vw"
        />
      </div>
      <div className={`page-container ${styles.sentenceFrame}`}>
        <p className={styles.sentenceWordmark} aria-hidden>
          {copy.heroEyebrow}
        </p>

        <div className={styles.sentenceComposition}>
          <h1 id="home-title" className={styles.sentenceTitle}>
            <span>{copy.heroTitleLineOne}</span>
            <span>{copy.heroTitleLineTwo}</span>
          </h1>
          <span key={active.echo} className={styles.sentenceEcho} aria-hidden>
            {active.echo}
          </span>
        </div>

        <div className={styles.sentenceLower}>
          <p className={styles.sentenceResponse} aria-live="polite" aria-atomic="true">
            {active.response}
          </p>

          <div className={styles.sentenceActions}>
            <ButtonLink href="/contact?intent=join">{copy.heroJoin}</ButtonLink>
            <TextLink href="/about">{copy.heroAbout}</TextLink>
          </div>
        </div>

        <div
          className={styles.sentenceControls}
          role="group"
          aria-label={copy.sentenceControlsLabel}
        >
          {sentenceStates.map((state, index) => {
            const Icon = sentenceIcons[index];

            return (
              <button
                key={state.key}
                ref={(element) => {
                  buttonRefs.current[index] = element;
                }}
                type="button"
                className={styles.sentenceControl}
                aria-pressed={activeIndex === index}
                onClick={() => select(index)}
                onKeyDown={(event) => moveSelection(event, index)}
              >
                <Icon width={20} height={20} strokeWidth={2} aria-hidden />
                <span>{state.label}</span>
              </button>
            );
          })}
          <span className={styles.relayTrack} aria-hidden>
            <span className={styles.relayDot} />
          </span>
        </div>
      </div>
    </section>
  );
}

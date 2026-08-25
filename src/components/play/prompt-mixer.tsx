"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import type { PublicContentFor } from "@content/public-content";

import { getConversationPrompts } from "@/content/site-copy";

import styles from "./play.module.css";

export function PromptMixer({ copy }: { copy: PublicContentFor<"home"> }) {
  const conversationPrompts = getConversationPrompts(copy);
  const [activeIndex, setActiveIndex] = useState(0);
  const prompt = conversationPrompts[activeIndex];

  function nextPrompt() {
    setActiveIndex((current) => (current + 1) % conversationPrompts.length);
  }

  return (
    <section className={styles.promptSection} aria-labelledby="prompt-title">
      <div className={`page-container ${styles.promptFrame}`}>
        <div className={styles.promptIntro}>
          <p>{copy.promptEyebrow}</p>
          <h2 id="prompt-title">{copy.promptTitle}</h2>
        </div>

        <div className={styles.promptInstrument}>
          <p
            key={activeIndex}
            className={styles.promptOutput}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>{prompt.lead}</span>{" "}
            <strong>{prompt.topic}</strong>{" "}
            <span>{prompt.close}</span>
          </p>

          <div className={styles.promptFooter}>
            <p>{copy.promptPrivacy}</p>
            <button type="button" className={styles.promptButton} onClick={nextPrompt}>
              <span>{copy.promptNext}</span>
              <ArrowPathIcon width={20} height={20} strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

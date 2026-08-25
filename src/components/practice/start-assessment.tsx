"use client";

import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import {
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  SpeakerWaveIcon,
} from "@heroicons/react/24/outline";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { useMutation } from "convex/react";

import { api } from "../../../convex/_generated/api";
import type { PublicContentFor } from "@content/public-content";
import type { PublishedAssessment } from "@/lib/assessment";

import styles from "./practice.module.css";

type StartConfiguration = {
  timingMode: "standard" | "extended" | "untimed";
  timeMultiplier: number;
  listeningMode: "audio-primary" | "transcript-supported";
  startRequestId: string;
};

function requestId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function StartAssessment({
  assessment,
  copy,
}: {
  assessment: PublishedAssessment;
  copy: PublicContentFor<"practice">;
}) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { signIn } = useAuthActions();
  const startAttempt = useMutation(api.assessmentAttempts.start);
  const [timingMode, setTimingMode] = useState<StartConfiguration["timingMode"]>(
    assessment.timePolicy === "untimed"
      ? "untimed"
      : assessment.defaultTimingMode,
  );
  const [timeMultiplier, setTimeMultiplier] = useState(1.5);
  const [listeningMode, setListeningMode] = useState<
    StartConfiguration["listeningMode"]
  >(assessment.defaultListeningMode);
  const [acknowledged, setAcknowledged] = useState(false);
  const [status, setStatus] = useState<"idle" | "signing-in" | "starting">("idle");
  const [error, setError] = useState<string | null>(null);
  const startingRef = useRef(false);
  const retryRef = useRef<{ signature: string; requestId: string } | null>(null);
  const includesListening = assessment.skills.includes("listening");

  const createAttempt = useCallback(
    async (configuration: StartConfiguration) => {
      if (startingRef.current) {
        return;
      }

      startingRef.current = true;
      setStatus("starting");
      setError(null);

      try {
        const started = await startAttempt({
          definitionId: assessment.definitionId,
          versionId: assessment.versionId,
          timingMode: configuration.timingMode,
          timeMultiplier: configuration.timeMultiplier,
          listeningMode: configuration.listeningMode,
          startRequestId: configuration.startRequestId,
        });
        router.push(`/practice/attempt/${started.attemptId}` as Route);
      } catch {
        startingRef.current = false;
        setStatus("idle");
        setError(copy.startError);
      }
    }, [assessment.definitionId, assessment.versionId, copy.startError, router, startAttempt],
  );

  async function handleStart() {
    if (!acknowledged || authLoading || status !== "idle") {
      return;
    }

    const signature = JSON.stringify({
      timingMode,
      timeMultiplier: timingMode === "extended" ? timeMultiplier : 1,
      listeningMode: includesListening ? listeningMode : "audio-primary",
    });
    const startRequestId =
      retryRef.current?.signature === signature
        ? retryRef.current.requestId
        : requestId("practice-start");
    retryRef.current = { signature, requestId: startRequestId };
    const configuration: StartConfiguration = {
      timingMode,
      timeMultiplier: timingMode === "extended" ? timeMultiplier : 1,
      listeningMode: includesListening ? listeningMode : "audio-primary",
      startRequestId,
    };
    setError(null);

    if (isAuthenticated) {
      await createAttempt(configuration);
      return;
    }

    setStatus("signing-in");
    try {
      await signIn("anonymous");
      await createAttempt(configuration);
    } catch {
      setStatus("idle");
      setError(copy.sessionError);
    }
  }

  const busy = authLoading || status !== "idle";

  return (
    <section className={styles.startPanel} aria-labelledby="practice-settings-title">
      <div className={styles.startPanelHeading}>
        <h2 id="practice-settings-title">{copy.startTitle}</h2>
        <p>{copy.startSupport}</p>
      </div>

      <fieldset className={styles.settingGroup}>
        <legend>
          <ClockIcon width={22} height={22} strokeWidth={1.8} aria-hidden />
          {copy.timingLegend}
        </legend>
        <div className={styles.settingOptions}>
          {assessment.timePolicy !== "untimed" ? (
            <>
              <label className={styles.settingOption}>
                <input
                  type="radio"
                  name="timing-mode"
                  value="standard"
                  checked={timingMode === "standard"}
                  onChange={() => setTimingMode("standard")}
                />
                <span>
                  <strong>{copy.standardTitle}</strong>
                  <small>{copy.standardBody}</small>
                </span>
              </label>
              <label className={styles.settingOption}>
                <input
                  type="radio"
                  name="timing-mode"
                  value="extended"
                  checked={timingMode === "extended"}
                  onChange={() => setTimingMode("extended")}
                />
                <span>
                  <strong>{copy.extendedTitle}</strong>
                  <small>{copy.extendedBody}</small>
                </span>
              </label>
            </>
          ) : null}
          <label className={styles.settingOption}>
            <input
              type="radio"
              name="timing-mode"
              value="untimed"
              checked={timingMode === "untimed"}
              onChange={() => setTimingMode("untimed")}
            />
            <span>
              <strong>{copy.untimedTitle}</strong>
              <small>{copy.untimedBody}</small>
            </span>
          </label>
        </div>

        {timingMode === "extended" ? (
          <div
            className={styles.inlineChoice}
            role="group"
            aria-label={copy.extendedAmountLabel}
          >
            <button
              type="button"
              aria-pressed={timeMultiplier === 1.5}
              onClick={() => setTimeMultiplier(1.5)}
            >
              {copy.extendedFifty}
            </button>
            <button
              type="button"
              aria-pressed={timeMultiplier === 2}
              onClick={() => setTimeMultiplier(2)}
            >
              {copy.extendedHundred}
            </button>
          </div>
        ) : null}
      </fieldset>

      {includesListening ? (
        <fieldset className={styles.settingGroup}>
          <legend>
            <SpeakerWaveIcon width={22} height={22} strokeWidth={1.8} aria-hidden />
            {copy.listeningLegend}
          </legend>
          <div className={styles.settingOptions}>
            <label className={styles.settingOption}>
              <input
                type="radio"
                name="listening-mode"
                value="audio-primary"
                checked={listeningMode === "audio-primary"}
                onChange={() => setListeningMode("audio-primary")}
              />
              <span>
                <strong>{copy.audioTitle}</strong>
                <small>{copy.audioBody}</small>
              </span>
            </label>
            <label className={styles.settingOption}>
              <input
                type="radio"
                name="listening-mode"
                value="transcript-supported"
                checked={listeningMode === "transcript-supported"}
                onChange={() => setListeningMode("transcript-supported")}
              />
              <span>
                <strong>{copy.transcriptTitle}</strong>
                <small>{copy.transcriptBody}</small>
              </span>
            </label>
          </div>
        </fieldset>
      ) : null}

      <label className={styles.acknowledgement}>
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
        />
        <span>
          <CheckIcon width={19} height={19} strokeWidth={2.2} aria-hidden />
          {copy.acknowledgement}
        </span>
      </label>

      <div className={styles.startActionLine}>
        <div aria-live="polite">
          {status === "signing-in" ? copy.signingIn : null}
          {status === "starting" ? copy.starting : null}
          {error !== null ? <p className={styles.inlineError}>{error}</p> : null}
        </div>
        <button
          type="button"
          className={styles.primaryButton}
          disabled={!acknowledged || busy}
          onClick={handleStart}
        >
          {busy ? copy.preparing : copy.startButton}
          <ArrowRightIcon width={20} height={20} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </section>
  );
}

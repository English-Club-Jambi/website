"use client";

import { useConvexAuth } from "@convex-dev/auth/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookmarkIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  FlagIcon,
  ListBulletIcon,
  PlayIcon,
  SpeakerWaveIcon,
  StopIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import Image from "next/image";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import {
  AttemptRouteResolver,
  isPlausibleAttemptId,
} from "./attempt-route-resolver";
import {
  emptyResponseForItem,
  QuestionRenderer,
  type AttemptPlayer,
  type PublicAssessmentResponse,
} from "./question-renderer";
import { usePracticeContext } from "./practice-provider";
import styles from "./practice.module.css";

type AttemptState = FunctionReturnType<
  typeof api.assessmentAttempts.getAttemptState
>;

function mutationId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export { isPlausibleAttemptId };

function useModalBodyLock(open: boolean) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
}

function formatDuration(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function PracticeLoading({ label }: { label: string }) {
  return (
    <div className={`page-container ${styles.practiceLoading}`} aria-live="polite" aria-busy="true">
      <p>{label}</p>
      <div className={styles.loadingRule} />
      <div className={`${styles.loadingRule} ${styles.loadingRuleShort}`} />
    </div>
  );
}

function GeneratedPracticeAudio({ text }: { text: string }) {
  const { copy } = usePracticeContext();
  const [playing, setPlaying] = useState(false);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  function stop() {
    window.speechSynthesis.cancel();
    setPlaying(false);
  }

  function play() {
    if (!supported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.92;
    utterance.addEventListener("end", () => setPlaying(false), { once: true });
    utterance.addEventListener("error", () => setPlaying(false), { once: true });
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  }

  if (!supported) return <p>{copy.audioUnavailable}</p>;

  return (
    <div className={styles.generatedAudio}>
      <button type="button" onClick={playing ? stop : play}>
        {playing ? (
          <StopIcon width={19} height={19} aria-hidden />
        ) : (
          <PlayIcon width={19} height={19} aria-hidden />
        )}
        {playing ? copy.stopPracticeAudio : copy.playPracticeAudio}
      </button>
      <small>{copy.generatedAudioNote}</small>
    </div>
  );
}

function SessionUnavailable() {
  const { copy } = usePracticeContext();
  return (
    <section className={styles.unavailablePage}>
      <div className={`page-container ${styles.unavailableFrame}`}>
        <h1>{copy.sessionUnavailableTitle}</h1>
        <p>{copy.sessionUnavailableBody}</p>
        <Link href="/practice" className={styles.primaryLink}>
          {copy.returnLab}
        </Link>
      </div>
    </section>
  );
}

export function RemainingTime({ deadlineAt, untimedLabel, timeLeft }: {
  deadlineAt: number | null;
  untimedLabel: string;
  timeLeft: string;
}) {
  const [remaining, setRemaining] = useState(() =>
    deadlineAt === null ? null : Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)),
  );

  useEffect(() => {
    if (deadlineAt === null) return;
    const interval = window.setInterval(() => {
      setRemaining(Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [deadlineAt]);

  return (
    <span className={styles.runnerTimer} aria-live={remaining === 0 ? "assertive" : "off"}>
      <ClockIcon width={19} height={19} strokeWidth={1.9} aria-hidden />
      <span>{deadlineAt === null ? untimedLabel : `${timeLeft} ${formatDuration(remaining ?? 0)}`}</span>
    </span>
  );
}

function Stimulus({
  player,
  transcriptBusy,
  onEnableTranscript,
}: {
  player: AttemptPlayer;
  transcriptBusy: boolean;
  onEnableTranscript: () => void;
}) {
  const { copy } = usePracticeContext();
  const stimulus = player.stimulus;
  if (stimulus === null) return null;

  const canEnableTranscript =
    player.section.skill === "listening" &&
    player.listeningMode === "audio-primary";

  return (
    <section className={styles.stimulus} aria-labelledby={`stimulus-${stimulus.id}`}>
      {stimulus.title !== null ? (
        <h2 id={`stimulus-${stimulus.id}`}>{stimulus.title}</h2>
      ) : (
        <h2 id={`stimulus-${stimulus.id}`} className="visually-hidden">
          {player.section.title}
        </h2>
      )}

      {stimulus.kind === "audio" ? (
        <div className={styles.audioStimulus}>
          <SpeakerWaveIcon width={25} height={25} strokeWidth={1.8} aria-hidden />
          {stimulus.mediaUrl !== null ? (
            <audio controls preload="metadata" src={stimulus.mediaUrl}>
              {copy.audioUnavailable}
            </audio>
          ) : (
            stimulus.transcript === null ? (
              <p>{copy.audioUnavailable}</p>
            ) : (
              <GeneratedPracticeAudio text={stimulus.transcript} />
            )
          )}
        </div>
      ) : null}

      {stimulus.kind === "image" && stimulus.mediaUrl !== null ? (
        <div className={styles.imageStimulus}>
          <Image
            src={stimulus.mediaUrl}
            alt={stimulus.alt ?? ""}
            fill
            sizes="(max-width: 879px) 100vw, 45vw"
          />
        </div>
      ) : null}

      {stimulus.body !== null ? <div className={styles.stimulusBody}>{stimulus.body}</div> : null}

      {canEnableTranscript ? (
        <div className={styles.transcriptSwitch}>
          <button
            type="button"
            className={styles.quietButton}
            disabled={transcriptBusy}
            onClick={onEnableTranscript}
          >
            <DocumentTextIcon width={20} height={20} strokeWidth={1.9} aria-hidden />
            {copy.switchTranscript}
          </button>
          <p>{copy.transcriptPermanent}</p>
        </div>
      ) : null}

      {stimulus.transcript !== null &&
      (player.section.skill !== "listening" ||
        player.listeningMode === "transcript-supported") ? (
        <details
          className={styles.transcript}
          open={player.listeningMode === "transcript-supported"}
        >
          <summary>{copy.transcript}</summary>
          <p>{stimulus.transcript}</p>
        </details>
      ) : null}
    </section>
  );
}

function stateLabel(
  state: AttemptPlayer["itemStates"][number],
  copy: ReturnType<typeof usePracticeContext>["copy"],
) {
  const labels = [];
  if (state.current) labels.push(copy.current);
  labels.push(state.answered ? copy.answered : copy.unanswered);
  if (state.flagged) labels.push(copy.flagged);
  return labels.join(", ");
}

export function QuestionNavigator({
  player,
  launcherRef,
  onMove,
}: {
  player: AttemptPlayer;
  launcherRef: RefObject<HTMLButtonElement | null>;
  onMove: (itemOrder: number) => Promise<boolean>;
}) {
  const { copy } = usePracticeContext();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [moving, setMoving] = useState(false);
  const [open, setOpen] = useState(false);
  useModalBodyLock(open);

  function close() {
    dialogRef.current?.close();
    setOpen(false);
    launcherRef.current?.focus();
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className={styles.navigatorLauncher}
        onClick={() => {
          setOpen(true);
          dialogRef.current?.showModal();
        }}
      >
        <ListBulletIcon width={21} height={21} strokeWidth={1.9} aria-hidden />
        {copy.openNavigator}
      </button>

      <dialog
        ref={dialogRef}
        className={styles.navigatorDialog}
        aria-labelledby="question-list-title"
        aria-modal="true"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
      >
        <div className={styles.navigatorPanel}>
          <div className={styles.dialogHeading}>
            <div>
              <p>{player.section.title}</p>
              <h2 id="question-list-title">{copy.openNavigator}</h2>
            </div>
            <button type="button" aria-label={copy.closeNavigator} onClick={close}>
              <XMarkIcon width={23} height={23} strokeWidth={2} aria-hidden />
            </button>
          </div>

          <div className={styles.navigatorLegend} aria-hidden>
            <span>{copy.answered}</span>
            <span>{copy.unanswered}</span>
            <span>{copy.flagged}</span>
          </div>

          <ol className={styles.navigatorGrid}>
            {player.itemStates.map((itemState) => (
              <li key={itemState.itemId}>
                <button
                  type="button"
                  disabled={moving || itemState.current}
                  aria-current={itemState.current ? "step" : undefined}
                  aria-label={`${copy.questionPrefix} ${itemState.itemOrder + 1}: ${stateLabel(itemState, copy)}`}
                  data-answered={itemState.answered ? "true" : "false"}
                  data-flagged={itemState.flagged ? "true" : "false"}
                  onClick={async () => {
                    setMoving(true);
                    const moved = await onMove(itemState.itemOrder);
                    setMoving(false);
                    if (moved) close();
                  }}
                >
                  <span>{itemState.itemOrder + 1}</span>
                  <small>{stateLabel(itemState, copy)}</small>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </dialog>
    </>
  );
}

export function FinishDialog({
  player,
  launcherRef,
  lastSection,
  busy,
  onConfirm,
}: {
  player: AttemptPlayer;
  launcherRef: RefObject<HTMLButtonElement | null>;
  lastSection: boolean;
  busy: boolean;
  onConfirm: () => Promise<void>;
}) {
  const { copy } = usePracticeContext();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const answered = player.itemStates.filter((item) => item.answered).length;
  const flagged = player.itemStates.filter((item) => item.flagged).length;
  useModalBodyLock(open);

  function close() {
    dialogRef.current?.close();
    setOpen(false);
    launcherRef.current?.focus();
  }

  return (
    <>
      <button
        ref={launcherRef}
        type="button"
        className={styles.primaryButton}
        onClick={() => {
          setOpen(true);
          dialogRef.current?.showModal();
        }}
      >
        {lastSection ? copy.submitPractice : copy.reviewSection}
        <ArrowRightIcon width={20} height={20} strokeWidth={2} aria-hidden />
      </button>
      <dialog
        ref={dialogRef}
        className={styles.confirmDialog}
        aria-labelledby="finish-practice-title"
        aria-modal="true"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <div className={styles.confirmPanel}>
          <BookmarkIcon width={30} height={30} strokeWidth={1.8} aria-hidden />
          <h2 id="finish-practice-title">
            {lastSection ? copy.submitTitle : copy.finishSectionTitle}
          </h2>
          <p>{lastSection ? copy.submitBody : copy.finishSectionBody}</p>
          <dl className={styles.confirmCounts}>
            <div><dt>{copy.answered}</dt><dd>{answered} / {player.itemStates.length}</dd></div>
            <div><dt>{copy.flagged}</dt><dd>{flagged}</dd></div>
          </dl>
          <div className={styles.confirmActions}>
            <button type="button" className={styles.quietButton} disabled={busy} onClick={close}>
              {lastSection ? copy.keepWorking : copy.returnQuestions}
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={busy}
              onClick={() => {
                close();
                void onConfirm();
              }}
            >
              {lastSection ? copy.confirmSubmit : copy.confirmSection}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function QuestionWorkspace({
  player,
  attemptId,
}: {
  player: AttemptPlayer;
  attemptId: Id<"assessmentAttempts">;
}) {
  const { copy } = usePracticeContext();
  const router = useRouter();
  const saveResponse = useMutation(api.assessmentAttempts.saveResponse);
  const move = useMutation(api.assessmentAttempts.move);
  const enableTranscript = useMutation(api.assessmentAttempts.enableTranscript);
  const finalizeSection = useMutation(api.assessmentAttempts.finalizeCurrentSection);
  const submit = useMutation(api.assessmentAttempts.submit);
  const [response, setResponse] = useState<PublicAssessmentResponse>(() =>
    player.response ?? emptyResponseForItem(player.item),
  );
  const [flagged, setFlagged] = useState(player.flagged);
  const [responseRevision, setResponseRevision] = useState(player.responseRevision);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">(
    player.response === null ? "idle" : "saved",
  );
  const [actionBusy, setActionBusy] = useState(false);
  const [transcriptBusy, setTranscriptBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const navigatorLauncherRef = useRef<HTMLButtonElement>(null);
  const finishLauncherRef = useRef<HTMLButtonElement>(null);
  const submitRequestRef = useRef(mutationId("practice-submit"));
  const attemptRevisionRef = useRef(player.saveStateVersion);
  const lastSection = player.section.order + 1 === player.section.totalSections;
  const lastQuestion = !player.navigation.canGoNext;

  useEffect(() => {
    questionHeadingRef.current?.focus();
  }, []);

  useEffect(() => {
    attemptRevisionRef.current = player.saveStateVersion;
  }, [player.saveStateVersion]);

  async function persist(
    nextResponse: PublicAssessmentResponse,
    nextFlagged: boolean,
  ) {
    setResponse(nextResponse);
    setFlagged(nextFlagged);
    setSaveStatus("saving");
    setError(null);
    try {
      const result = await saveResponse({
        attemptId,
        itemId: player.item.id,
        response: nextResponse,
        expectedClientRevision: responseRevision,
        mutationId: mutationId("practice-answer"),
        flagged: nextFlagged,
      });
      if (!result.ok) {
        setSaveStatus("error");
        setError(copy.saveError);
        return false;
      }
      setResponseRevision(result.revision);
      setSaveStatus("saved");
      return true;
    } catch {
      setSaveStatus("error");
      setError(copy.saveError);
      return false;
    }
  }

  async function moveTo(itemOrder: number) {
    if (saveStatus === "saving" || actionBusy) return false;
    setActionBusy(true);
    setError(null);
    try {
      const result = await move({
        attemptId,
        sectionOrder: player.section.order,
        itemOrder,
        expectedRevision: attemptRevisionRef.current,
      });
      if (!result.ok) {
        setError(copy.saveError);
        return false;
      }
      return true;
    } catch {
      setError(copy.saveError);
      return false;
    } finally {
      setActionBusy(false);
    }
  }

  async function switchTranscript() {
    setTranscriptBusy(true);
    setError(null);
    try {
      const result = await enableTranscript({
        attemptId,
        expectedRevision: attemptRevisionRef.current,
      });
      if (!result.ok) {
        attemptRevisionRef.current = result.currentRevision;
        setError(copy.saveError);
      } else {
        attemptRevisionRef.current = result.revision;
      }
    } catch {
      setError(copy.saveError);
    } finally {
      setTranscriptBusy(false);
    }
  }

  async function confirmFinish() {
    if (saveStatus === "saving") return;
    setActionBusy(true);
    setError(null);
    try {
      if (lastSection) {
        const result = await submit({
          attemptId,
          expectedRevision: attemptRevisionRef.current,
          submitRequestId: submitRequestRef.current,
        });
        if (!result.ok) {
          setError(copy.saveError);
          return;
        }
        router.push(`/practice/result/${attemptId}` as Route);
        return;
      }
      const result = await finalizeSection({
        attemptId,
        expectedRevision: attemptRevisionRef.current,
      });
      if (!result.ok) setError(copy.saveError);
    } catch {
      setError(copy.saveError);
    } finally {
      setActionBusy(false);
    }
  }

  const disabled = saveStatus === "saving" || actionBusy;

  return (
    <div className={styles.questionWorkspace}>
      <div className={styles.runnerRail}>
        <p>{player.section.title}</p>
        <RemainingTime
          deadlineAt={player.sectionDeadlineAt}
          untimedLabel={copy.untimedLabel}
          timeLeft={copy.timeLeft}
        />
        <QuestionNavigator
          player={player}
          launcherRef={navigatorLauncherRef}
          onMove={moveTo}
        />
      </div>

      <div className={styles.questionField}>
        <div className={styles.questionMeta}>
          <p className={styles.questionPosition}>
            {copy.questionPrefix} {player.navigation.itemOrder + 1} {copy.questionOf}{" "}
            {player.navigation.itemCount}
          </p>
          <span className={styles.saveState} data-state={saveStatus} aria-live="polite">
            {saveStatus === "saving" ? copy.saving : null}
            {saveStatus === "saved" ? copy.saved : null}
            {saveStatus === "error" ? copy.saveError : null}
          </span>
        </div>

        <Stimulus
          player={player}
          transcriptBusy={transcriptBusy}
          onEnableTranscript={switchTranscript}
        />

        <section className={styles.questionPrompt} aria-labelledby={`question-${player.item.id}`}>
          <h1 id={`question-${player.item.id}`} ref={questionHeadingRef} tabIndex={-1}>
            {player.item.prompt}
          </h1>
          <QuestionRenderer
            item={player.item}
            response={response}
            disabled={disabled}
            copy={copy}
            onChange={(next) => void persist(next, flagged)}
          />
        </section>

        <div className={styles.questionUtilities}>
          <button
            type="button"
            className={styles.flagButton}
            aria-pressed={flagged}
            disabled={disabled}
            onClick={() => void persist(response, !flagged)}
          >
            <FlagIcon width={20} height={20} strokeWidth={1.9} aria-hidden />
            {flagged ? copy.unflag : copy.flag}
          </button>
          {error !== null ? <p className={styles.inlineError} role="alert">{error}</p> : null}
        </div>

        <nav className={styles.questionActions} aria-label={copy.openNavigator}>
          <button
            type="button"
            className={styles.quietButton}
            disabled={!player.navigation.canGoBack || disabled}
            onClick={() => void moveTo(player.navigation.itemOrder - 1)}
          >
            <ArrowLeftIcon width={20} height={20} strokeWidth={2} aria-hidden />
            {copy.previous}
          </button>
          {lastQuestion ? (
            <FinishDialog
              player={player}
              launcherRef={finishLauncherRef}
              lastSection={lastSection}
              busy={disabled}
              onConfirm={confirmFinish}
            />
          ) : (
            <button
              type="button"
              className={styles.primaryButton}
              disabled={disabled}
              onClick={() => void moveTo(player.navigation.itemOrder + 1)}
            >
              {copy.next}
              <ArrowRightIcon width={20} height={20} strokeWidth={2} aria-hidden />
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}

function SectionReady({
  state,
  attemptId,
}: {
  state: Extract<AttemptState, { phase: "section-ready" }>;
  attemptId: Id<"assessmentAttempts">;
}) {
  const { copy } = usePracticeContext();
  const beginSection = useMutation(api.assessmentAttempts.beginSection);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function begin() {
    setBusy(true);
    setError(null);
    try {
      await beginSection({ attemptId });
    } catch {
      setError(copy.saveError);
      setBusy(false);
    }
  }

  return (
    <section className={styles.sectionReady}>
      <div className={`page-container ${styles.sectionReadyFrame}`}>
        <p className={styles.attemptKicker}>
          {copy.sectionPrefix} {state.section.order + 1} {copy.sectionOf}{" "}
          {state.section.totalSections}
        </p>
        <h1>{state.section.title}</h1>
        <p>{state.section.instructions}</p>
        {error !== null ? <p className={styles.inlineError} role="alert">{error}</p> : null}
        <button type="button" className={styles.primaryButton} disabled={busy} onClick={begin}>
          {copy.beginSection}
          <ArrowRightIcon width={20} height={20} strokeWidth={2} aria-hidden />
        </button>
      </div>
    </section>
  );
}

function ConnectedAttemptRunner({ attemptId }: { attemptId: Id<"assessmentAttempts"> }) {
  const { copy } = usePracticeContext();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const state = useQuery(
    api.assessmentAttempts.getAttemptState,
    isAuthenticated ? { attemptId } : "skip",
  );
  const player = useQuery(
    api.assessmentAttempts.getPlayer,
    isAuthenticated && state?.phase === "question" ? { attemptId } : "skip",
  );

  if (isLoading) {
    return <PracticeLoading label={copy.sessionCheck} />;
  }
  if (!isAuthenticated) {
    return <SessionUnavailable />;
  }
  if (state === undefined) return <PracticeLoading label={copy.sessionCheck} />;
  if (state.phase === "closed") return <SessionUnavailable />;
  if (state.phase === "submitted") {
    return (
      <section className={styles.sectionReady}>
        <div className={`page-container ${styles.sectionReadyFrame}`}>
          <CheckCircleIcon width={38} height={38} strokeWidth={1.8} aria-hidden />
          <h1>{copy.resultTitle}</h1>
          <Link href={`/practice/result/${attemptId}` as Route} className={styles.primaryLink}>
            {copy.confirmSubmit}
            <ArrowRightIcon width={20} height={20} strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </section>
    );
  }
  if (state.phase === "section-ready") {
    return <SectionReady state={state} attemptId={attemptId} />;
  }
  if (player === undefined || player === null) {
    return <PracticeLoading label={copy.sessionCheck} />;
  }
  return (
    <QuestionWorkspace
      key={player.item.id}
      player={player}
      attemptId={attemptId}
    />
  );
}

export function AttemptRunner({ attemptId }: { attemptId: string }) {
  const { copy } = usePracticeContext();
  return (
    <AttemptRouteResolver
      routeAttemptId={attemptId}
      loading={<PracticeLoading label={copy.sessionCheck} />}
      unavailable={<SessionUnavailable />}
    >
      {(resolvedAttemptId) => (
        <ConnectedAttemptRunner attemptId={resolvedAttemptId} />
      )}
    </AttemptRouteResolver>
  );
}

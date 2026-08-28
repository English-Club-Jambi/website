"use client";

import {
  ArrowPathIcon,
  PauseIcon,
  PlayIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
} from "@heroicons/react/24/outline";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
} from "react";

import styles from "./custom-audio-player.module.css";

type PlayerPhase =
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error";

export type CustomAudioPlayerCopy = {
  play: string;
  pause: string;
  replay: string;
  mute: string;
  unmute: string;
  seek: string;
  loading: string;
  buffering: string;
  finished: string;
  unavailable: string;
  retry: string;
  durationUnavailable: string;
  /** Optional because Live Practice can use the compact transport without it. */
  volume?: string;
};

export type CustomAudioPlayerProps = {
  /** The public audio URL. Changing it starts a fresh, paused transport. */
  src: string;
  /** A concise recording description used to label the section and controls. */
  label: string;
  /** CMS-owned transport labels and state copy. */
  copy: CustomAudioPlayerCopy;
  /** Shows the volume range when both this flag and copy.volume are present. */
  showVolume?: boolean;
  /** Initial volume from 0 to 1. Defaults to full volume. */
  initialVolume?: number;
  className?: string;
};

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}

function formatTime(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const seconds = Math.floor(value);
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function setProgress(
  element: HTMLElement | null,
  customProperty: "--audio-progress" | "--audio-buffered",
  value: number,
  maximum: number,
) {
  const percentage = maximum > 0 ? (value / maximum) * 100 : 0;
  element?.style.setProperty(
    customProperty,
    `${Math.min(100, Math.max(0, percentage))}%`,
  );
}

function AudioTransport({
  src,
  label,
  copy,
  showVolume = false,
  initialVolume = 1,
  className,
}: CustomAudioPlayerProps) {
  const normalizedInitialVolume = clampVolume(initialVolume);
  const audioRef = useRef<HTMLAudioElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const bufferedProgressRef = useRef<HTMLSpanElement>(null);
  const seekProgressRef = useRef<HTMLSpanElement>(null);
  const elapsedRef = useRef<HTMLSpanElement>(null);
  const volumeRef = useRef<HTMLInputElement>(null);
  const volumeProgressRef = useRef<HTMLSpanElement>(null);
  const durationRef = useRef(0);
  const mountedRef = useRef(false);
  const [phase, setPhase] = useState<PlayerPhase>("loading");
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(normalizedInitialVolume === 0);

  function syncCurrentTime(audio: HTMLAudioElement) {
    const currentTime = Number.isFinite(audio.currentTime)
      ? Math.max(0, audio.currentTime)
      : 0;
    if (seekRef.current !== null) {
      seekRef.current.value = String(currentTime);
      seekRef.current.setAttribute(
        "aria-valuetext",
        `${formatTime(currentTime)} / ${formatTime(durationRef.current)}`,
      );
    }
    if (elapsedRef.current !== null) {
      elapsedRef.current.textContent = formatTime(currentTime);
    }
    setProgress(
      seekProgressRef.current,
      "--audio-progress",
      currentTime,
      durationRef.current,
    );
  }

  function syncBuffered(audio: HTMLAudioElement) {
    let bufferedEnd = 0;
    if (audio.buffered.length > 0) {
      bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
    }
    setProgress(
      bufferedProgressRef.current,
      "--audio-buffered",
      bufferedEnd,
      durationRef.current,
    );
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (audio === null) return;

    mountedRef.current = true;
    audio.volume = normalizedInitialVolume;
    audio.muted = false;
    setProgress(
      volumeProgressRef.current,
      "--audio-progress",
      normalizedInitialVolume,
      1,
    );

    const readDuration = () => {
      const nextDuration = Number.isFinite(audio.duration)
        ? Math.max(0, audio.duration)
        : 0;
      durationRef.current = nextDuration;
      setDuration(nextDuration);
      syncCurrentTime(audio);
      syncBuffered(audio);
    };
    const handleLoadStart = () => setPhase("loading");
    const handleLoadedMetadata = () => {
      readDuration();
      setPhase("ready");
    };
    const handleDurationChange = () => readDuration();
    const handleCanPlay = () => {
      setPhase((current) =>
        current === "playing" || current === "ended" ? current : "ready",
      );
    };
    const handlePlay = () => setPhase("playing");
    const handlePlaying = () => setPhase("playing");
    const handlePause = () => {
      if (audio.ended) return;
      setPhase((current) =>
        current === "error" || current === "loading" ? current : "paused",
      );
    };
    const handleWaiting = () => setPhase("buffering");
    const handleEnded = () => {
      syncCurrentTime(audio);
      setPhase("ended");
    };
    const handleError = () => setPhase("error");
    const handleTimeUpdate = () => syncCurrentTime(audio);
    const handleProgress = () => syncBuffered(audio);
    const handleVolumeChange = () => {
      setMuted(audio.muted || audio.volume === 0);
      if (volumeRef.current !== null) {
        volumeRef.current.value = String(audio.volume);
        volumeRef.current.setAttribute(
          "aria-valuetext",
          `${Math.round(audio.volume * 100)}%`,
        );
      }
      setProgress(
        volumeProgressRef.current,
        "--audio-progress",
        audio.volume,
        1,
      );
    };

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("durationchange", handleDurationChange);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("stalled", handleWaiting);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("progress", handleProgress);
    audio.addEventListener("volumechange", handleVolumeChange);
    audio.load();

    return () => {
      mountedRef.current = false;
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("durationchange", handleDurationChange);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("stalled", handleWaiting);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("progress", handleProgress);
      audio.removeEventListener("volumechange", handleVolumeChange);
      audio.pause();
    };
  }, [normalizedInitialVolume]);

  function resetTimeline(audio: HTMLAudioElement) {
    durationRef.current = 0;
    setDuration(0);
    try {
      audio.currentTime = 0;
    } catch {
      // A failed resource can have no seekable timeline yet.
    }
    syncCurrentTime(audio);
    setProgress(
      bufferedProgressRef.current,
      "--audio-buffered",
      0,
      1,
    );
  }

  function retry() {
    const audio = audioRef.current;
    if (audio === null) return;
    audio.pause();
    resetTimeline(audio);
    setPhase("loading");
    audio.load();
  }

  function togglePlayback() {
    const audio = audioRef.current;
    if (audio === null || phase === "loading") return;

    if (phase === "error") {
      retry();
      return;
    }

    if (phase === "playing" || phase === "buffering") {
      audio.pause();
      return;
    }

    if (phase === "ended") {
      audio.currentTime = 0;
      syncCurrentTime(audio);
    }

    const playback = audio.play();
    playback?.catch(() => {
      if (mountedRef.current && audioRef.current === audio) setPhase("error");
    });
  }

  function seek(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (audio === null) return;
    const nextTime = Number(event.currentTarget.value);
    if (!Number.isFinite(nextTime)) return;
    audio.currentTime = Math.min(durationRef.current, Math.max(0, nextTime));
    syncCurrentTime(audio);
  }

  function toggleMuted() {
    const audio = audioRef.current;
    if (audio === null) return;
    const isSilent = audio.muted || audio.volume === 0;
    if (isSilent) {
      if (audio.volume === 0) {
        audio.volume =
          normalizedInitialVolume === 0 ? 1 : normalizedInitialVolume;
      }
      audio.muted = false;
      return;
    }
    audio.muted = true;
  }

  function changeVolume(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (audio === null) return;
    audio.volume = clampVolume(Number(event.currentTarget.value));
    audio.muted = false;
  }

  const active = phase === "playing" || phase === "buffering";
  const mainControlCopy =
    phase === "error"
      ? copy.retry
      : active
        ? copy.pause
        : phase === "ended"
          ? copy.replay
          : copy.play;
  const MainControlIcon =
    phase === "error" || phase === "ended"
      ? ArrowPathIcon
      : active
        ? PauseIcon
        : PlayIcon;
  const announcement =
    phase === "loading"
      ? copy.loading
      : phase === "buffering"
        ? copy.buffering
        : phase === "ended"
          ? copy.finished
          : phase === "error"
            ? copy.unavailable
            : null;
  const playerClassName = className
    ? `${styles.player} ${className}`
    : styles.player;
  const seekStyle = {
    "--audio-progress": "0%",
    "--audio-buffered": "0%",
  } as CSSProperties;
  const volumeStyle = {
    "--audio-progress": `${normalizedInitialVolume * 100}%`,
  } as CSSProperties;
  const showVolumeControl = showVolume && copy.volume !== undefined;

  return (
    <section
      className={playerClassName}
      aria-label={label}
      aria-busy={phase === "loading" || phase === "buffering"}
      data-practice-audio-player=""
      data-state={phase}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        data-practice-audio-engine=""
      >
        {copy.unavailable}
      </audio>

      <button
        className={`${styles.iconButton} ${styles.playButton}`}
        type="button"
        aria-label={`${mainControlCopy}: ${label}`}
        disabled={phase === "loading"}
        onClick={togglePlayback}
      >
        <MainControlIcon aria-hidden width={22} height={22} strokeWidth={1.9} />
      </button>

      <div className={`${styles.rangeField} ${styles.seekField}`}>
        <span className={styles.track} aria-hidden>
          <span
            ref={bufferedProgressRef}
            className={styles.buffered}
            style={seekStyle}
          />
          <span
            ref={seekProgressRef}
            className={styles.progress}
            style={seekStyle}
          />
        </span>
        <input
          ref={seekRef}
          className={styles.range}
          type="range"
          min="0"
          max={duration}
          step="0.1"
          defaultValue="0"
          aria-label={`${copy.seek}: ${label}`}
          aria-valuetext={`0:00 / ${formatTime(duration)}`}
          disabled={duration <= 0 || phase === "error"}
          onChange={seek}
        />
      </div>

      <span className={styles.time} aria-hidden="true">
        {duration > 0 ? (
          <>
            <span ref={elapsedRef}>0:00</span>
            <span className={styles.timeDivider}>/</span>
            <span>{formatTime(duration)}</span>
          </>
        ) : (
          copy.durationUnavailable
        )}
      </span>

      <button
        className={`${styles.iconButton} ${styles.muteButton}`}
        type="button"
        aria-label={`${muted ? copy.unmute : copy.mute}: ${label}`}
        disabled={phase === "error"}
        onClick={toggleMuted}
      >
        {muted ? (
          <SpeakerXMarkIcon aria-hidden width={21} height={21} strokeWidth={1.9} />
        ) : (
          <SpeakerWaveIcon aria-hidden width={21} height={21} strokeWidth={1.9} />
        )}
      </button>

      {showVolumeControl ? (
        <div className={`${styles.rangeField} ${styles.volumeField}`}>
          <span className={styles.track} aria-hidden>
            <span
              ref={volumeProgressRef}
              className={styles.progress}
              style={volumeStyle}
            />
          </span>
          <input
            ref={volumeRef}
            className={styles.range}
            type="range"
            min="0"
            max="1"
            step="0.05"
            defaultValue={normalizedInitialVolume}
            aria-label={`${copy.volume}: ${label}`}
            aria-valuetext={`${Math.round(normalizedInitialVolume * 100)}%`}
            disabled={phase === "error"}
            onChange={changeVolume}
          />
        </div>
      ) : null}

      {announcement !== null ? (
        <span
          className={styles.state}
          role={phase === "error" ? "alert" : "status"}
          aria-atomic="true"
        >
          {announcement}
        </span>
      ) : null}
    </section>
  );
}

/**
 * A keyed transport keeps a new recording from inheriting time, error state,
 * or pending playback from the previous Listening question.
 */
export function CustomAudioPlayer(props: CustomAudioPlayerProps) {
  return <AudioTransport key={props.src} {...props} />;
}

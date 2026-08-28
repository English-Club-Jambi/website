import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CustomAudioPlayer,
  type CustomAudioPlayerCopy,
} from "@/components/practice/custom-audio-player";

const copy: CustomAudioPlayerCopy = {
  play: "Play recording",
  pause: "Pause recording",
  replay: "Play recording again",
  mute: "Mute recording",
  unmute: "Unmute recording",
  seek: "Recording position",
  loading: "Loading recording",
  buffering: "Buffering recording",
  finished: "Recording finished",
  unavailable: "Recording unavailable",
  retry: "Try recording again",
  durationUnavailable: "Duration unavailable",
  volume: "Recording volume",
};

const play = vi.fn<() => Promise<void>>();
const pause = vi.fn<() => void>();
const load = vi.fn<() => void>();

function setMediaNumber(
  media: HTMLMediaElement,
  property: "currentTime" | "duration" | "volume",
  value: number,
) {
  Object.defineProperty(media, property, {
    configurable: true,
    writable: true,
    value,
  });
}

function makeReady(audio: HTMLAudioElement, duration = 125) {
  setMediaNumber(audio, "duration", duration);
  setMediaNumber(audio, "currentTime", 0);
  fireEvent.loadedMetadata(audio);
  fireEvent.canPlay(audio);
}

describe("CustomAudioPlayer", () => {
  beforeEach(() => {
    play.mockReset().mockResolvedValue(undefined);
    pause.mockReset();
    load.mockReset();
    vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(load);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps the audio engine semantic and gives loading copy a bounded live state", () => {
    const { container } = render(
      <CustomAudioPlayer
        src="https://r2.example.test/listening.mp3"
        label="Campus conversation"
        copy={copy}
      />,
    );

    const player = screen.getByRole("region", {
      name: "Campus conversation",
    });
    const audio = container.querySelector("audio");
    expect(player).toHaveAttribute("data-practice-audio-player");
    expect(player).toHaveAttribute("data-state", "loading");
    expect(player).toHaveAttribute("aria-busy", "true");
    expect(audio).toHaveAttribute("data-practice-audio-engine");
    expect(audio).not.toHaveAttribute("controls");
    expect(audio).not.toHaveAttribute("autoplay");
    expect(audio).toHaveAttribute("preload", "metadata");
    expect(audio).toHaveTextContent(copy.unavailable);
    expect(screen.getByRole("status")).toHaveTextContent(copy.loading);
    expect(screen.getByText(copy.durationUnavailable)).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: `${copy.play}: Campus conversation`,
      }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("slider", { name: /volume/i }),
    ).not.toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps routine playback quiet while reporting buffering and recovery", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CustomAudioPlayer
        src="https://r2.example.test/lecture.mp3"
        label="Wetland lecture"
        copy={copy}
        initialVolume={0.8}
        showVolume
      />,
    );
    const player = screen.getByRole("region", { name: "Wetland lecture" });
    const audio = container.querySelector("audio")!;
    setMediaNumber(audio, "volume", 0.8);
    makeReady(audio);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(player).toHaveAttribute("aria-busy", "false");
    const seek = screen.getByRole("slider", {
      name: `${copy.seek}: Wetland lecture`,
    });
    expect(seek).toHaveAttribute("max", "125");
    expect(screen.getByText("2:05")).toBeInTheDocument();

    fireEvent.change(seek, { target: { value: "42" } });
    expect(audio.currentTime).toBe(42);
    expect(screen.getByText("0:42")).toBeInTheDocument();
    expect(seek).toHaveAttribute("aria-valuetext", "0:42 / 2:05");

    await user.click(
      screen.getByRole("button", {
        name: `${copy.play}: Wetland lecture`,
      }),
    );
    fireEvent.playing(audio);
    expect(play).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    fireEvent.waiting(audio);
    expect(player).toHaveAttribute("data-state", "buffering");
    expect(player).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent(copy.buffering);
    expect(
      screen.getByRole("button", {
        name: `${copy.pause}: Wetland lecture`,
      }),
    ).toBeEnabled();

    fireEvent.playing(audio);
    expect(player).toHaveAttribute("data-state", "playing");
    expect(player).toHaveAttribute("aria-busy", "false");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    const volume = screen.getByRole("slider", {
      name: `${copy.volume}: Wetland lecture`,
    });
    fireEvent.change(volume, { target: { value: "0.35" } });
    expect(audio.volume).toBe(0.35);
    await user.click(
      screen.getByRole("button", {
        name: `${copy.mute}: Wetland lecture`,
      }),
    );
    expect(audio.muted).toBe(true);

    setMediaNumber(audio, "currentTime", 125);
    Object.defineProperty(audio, "ended", {
      configurable: true,
      value: true,
    });
    fireEvent.ended(audio);
    expect(screen.getByRole("status")).toHaveTextContent(copy.finished);
    expect(
      screen.getByRole("button", {
        name: `${copy.replay}: Wetland lecture`,
      }),
    ).toBeEnabled();
  });

  it("turns rejected playback into a retry that resets stale media state", async () => {
    const user = userEvent.setup();
    play.mockRejectedValueOnce(new Error("playback failed"));
    const { container } = render(
      <CustomAudioPlayer
        src="https://r2.example.test/unreliable.mp3"
        label="Unreliable recording"
        copy={copy}
      />,
    );
    const player = screen.getByRole("region", {
      name: "Unreliable recording",
    });
    const audio = container.querySelector("audio")!;
    makeReady(audio, 90);
    setMediaNumber(audio, "currentTime", 31);
    fireEvent.timeUpdate(audio);

    await user.click(
      screen.getByRole("button", {
        name: `${copy.play}: Unreliable recording`,
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      copy.unavailable,
    );
    const retry = screen.getByRole("button", {
      name: `${copy.retry}: Unreliable recording`,
    });
    expect(retry).toBeEnabled();

    await user.click(retry);
    expect(load).toHaveBeenCalledTimes(2);
    expect(audio.currentTime).toBe(0);
    expect(player).toHaveAttribute("data-state", "loading");
    expect(player).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status")).toHaveTextContent(copy.loading);
    expect(screen.getByText(copy.durationUnavailable)).toBeInTheDocument();
    expect(
      screen.getByRole("slider", {
        name: `${copy.seek}: Unreliable recording`,
      }),
    ).toBeDisabled();
  });

  it("resets on a source change and removes every media listener", async () => {
    const { container, rerender, unmount } = render(
      <CustomAudioPlayer
        src="https://r2.example.test/first.mp3"
        label="First recording"
        copy={copy}
      />,
    );
    const firstAudio = container.querySelector("audio")!;
    const removeListener = vi.spyOn(firstAudio, "removeEventListener");
    makeReady(firstAudio, 60);
    setMediaNumber(firstAudio, "currentTime", 27);
    fireEvent.timeUpdate(firstAudio);

    rerender(
      <CustomAudioPlayer
        src="https://r2.example.test/second.mp3"
        label="Second recording"
        copy={copy}
      />,
    );

    const secondAudio = container.querySelector("audio")!;
    expect(secondAudio).not.toBe(firstAudio);
    expect(pause).toHaveBeenCalled();
    expect(removeListener).toHaveBeenCalledWith(
      "waiting",
      expect.any(Function),
    );
    expect(removeListener).toHaveBeenCalledWith(
      "progress",
      expect.any(Function),
    );
    expect(
      screen.getByRole("region", { name: "Second recording" }),
    ).toHaveAttribute("data-state", "loading");

    const secondRemoveListener = vi.spyOn(secondAudio, "removeEventListener");
    unmount();
    await waitFor(() => {
      expect(secondRemoveListener).toHaveBeenCalledWith(
        "volumechange",
        expect.any(Function),
      );
    });
  });
});

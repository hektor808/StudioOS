import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ButtonHTMLAttributes } from "react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resetAudioStore, useAudioStore, type PlaybackSource } from "@/lib/store/useAudioStore";

import { GlobalPlayer } from "./GlobalPlayer";

const motionMocks = vi.hoisted(() => ({
  reduceMotion: vi.fn(() => false),
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: motionMocks.reduceMotion,
  motion: {
    button: ({
      whileTap,
      transition,
      ...props
    }: ButtonHTMLAttributes<HTMLButtonElement> & {
      whileTap?: unknown;
      transition?: unknown;
    }) => (
      <button
        data-while-tap={whileTap ? JSON.stringify(whileTap) : undefined}
        data-transition={transition ? JSON.stringify(transition) : undefined}
        {...props}
      />
    ),
  },
}));

const media = {
  play: vi.spyOn(HTMLMediaElement.prototype, "play"),
  pause: vi.spyOn(HTMLMediaElement.prototype, "pause"),
  load: vi.spyOn(HTMLMediaElement.prototype, "load"),
};

const source: PlaybackSource = {
  sourceId: "version-a",
  trackId: "track-a",
  title: "Signal One",
  subtitle: "Version 1",
  playbackUrl: "/audio/signal-one.mp3",
};

const replacementSource: PlaybackSource = {
  sourceId: "version-b",
  trackId: "track-b",
  title: "Signal Two",
  playbackUrl: "/audio/signal-two.mp3",
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function setMediaValue(
  audio: HTMLAudioElement,
  property: "currentSrc" | "duration" | "currentTime" | "paused",
  value: string | number | boolean,
) {
  Object.defineProperty(audio, property, {
    configurable: true,
    value,
    writable: property === "currentTime",
  });
}

function setCurrentSource(audio: HTMLAudioElement, playbackUrl = source.playbackUrl) {
  setMediaValue(audio, "currentSrc", new URL(playbackUrl, window.location.href).href);
}

function selectSource(nextSource: PlaybackSource = source) {
  act(() => {
    useAudioStore.getState().selectSource(nextSource);
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  resetAudioStore();
  motionMocks.reduceMotion.mockReturnValue(false);
  media.play.mockResolvedValue(undefined);
  media.pause.mockImplementation(() => undefined);
  media.load.mockImplementation(() => undefined);
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("GlobalPlayer", () => {
  it("renders an honest accessible idle state and synchronizes initial volume", () => {
    const { container } = render(<GlobalPlayer />);
    const audio = screen.getByTestId("global-audio-element") as HTMLAudioElement;

    expect(screen.getByText("No track selected")).toBeInTheDocument();
    expect(
      screen.getByText("Choose a track from Studio when the catalog is connected."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Seek" })).toBeDisabled();
    expect(screen.getByRole("slider", { name: "Volume" })).toBeEnabled();
    expect(screen.getAllByText("0:00", { selector: "time" })).toHaveLength(2);
    expect(audio).toHaveAttribute("preload", "metadata");
    expect(audio.volume).toBe(0.8);
    expect(container.querySelectorAll("audio")).toHaveLength(1);

    const elapsed = screen.getAllByText("0:00", { selector: "time" })[0];
    expect(elapsed.closest("[aria-live]")).toBeNull();
  });

  it("loads a selected source paused and clears an existing media alert", () => {
    render(<GlobalPlayer />);
    const audio = screen.getByTestId("global-audio-element") as HTMLAudioElement;

    selectSource(source);
    setCurrentSource(audio);
    fireEvent.error(audio);
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to play this track.");

    selectSource(replacementSource);

    expect(audio).toHaveAttribute("src", replacementSource.playbackUrl);
    expect(media.pause).toHaveBeenCalled();
    expect(media.load).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Signal Two")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled();
    expect(useAudioStore.getState().isPlaying).toBe(false);
  });

  it("clears the resource, telemetry, and alert while retaining volume", () => {
    render(<GlobalPlayer />);
    const audio = screen.getByTestId("global-audio-element") as HTMLAudioElement;

    selectSource(source);
    setCurrentSource(audio);
    act(() => {
      useAudioStore.getState().setVolume(0.35);
      useAudioStore.getState().reportDuration(120);
      useAudioStore.getState().reportCurrentTime(18);
      useAudioStore.getState().reportPlaying(true);
    });
    fireEvent.error(audio);

    act(() => {
      useAudioStore.getState().clearSource();
    });

    expect(media.pause).toHaveBeenCalled();
    expect(media.load).toHaveBeenCalled();
    expect(audio).not.toHaveAttribute("src");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(useAudioStore.getState()).toMatchObject({
      source: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.35,
    });
  });

  it("calls play from user activation and waits for observed media state", async () => {
    const user = userEvent.setup();
    render(<GlobalPlayer />);
    const audio = screen.getByTestId("global-audio-element") as HTMLAudioElement;
    selectSource(source);
    setCurrentSource(audio);
    setMediaValue(audio, "paused", true);

    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(media.play).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument();
    expect(useAudioStore.getState().isPlaying).toBe(false);

    fireEvent.play(audio);

    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(useAudioStore.getState().isPlaying).toBe(true);
  });

  it("pauses immediately and ignores a late rejected play request", async () => {
    const pendingPlay = deferred<void>();
    media.play.mockReturnValueOnce(pendingPlay.promise);
    const user = userEvent.setup();
    render(<GlobalPlayer />);
    const audio = screen.getByTestId("global-audio-element") as HTMLAudioElement;
    selectSource(source);
    setCurrentSource(audio);
    setMediaValue(audio, "paused", true);

    await user.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.play(audio);
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(media.pause).toHaveBeenCalled();
    expect(useAudioStore.getState().isPlaying).toBe(false);

    await act(async () => {
      pendingPlay.reject(new Error("late-provider-detail"));
      await pendingPlay.promise.catch(() => undefined);
    });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(useAudioStore.getState().isPlaying).toBe(false);
  });

  it("invalidates pending play promises when replacing and clearing sources", async () => {
    const firstPlay = deferred<void>();
    const secondPlay = deferred<void>();
    media.play
      .mockReturnValueOnce(firstPlay.promise)
      .mockReturnValueOnce(secondPlay.promise);
    const user = userEvent.setup();
    render(<GlobalPlayer />);
    const audio = screen.getByTestId("global-audio-element") as HTMLAudioElement;

    selectSource(source);
    setCurrentSource(audio);
    setMediaValue(audio, "paused", true);
    await user.click(screen.getByRole("button", { name: "Play" }));
    selectSource(replacementSource);

    await act(async () => {
      firstPlay.reject(new Error("stale-source-detail"));
      await firstPlay.promise.catch(() => undefined);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    setCurrentSource(audio, replacementSource.playbackUrl);
    setMediaValue(audio, "paused", true);
    await user.click(screen.getByRole("button", { name: "Play" }));
    act(() => {
      useAudioStore.getState().clearSource();
    });

    await act(async () => {
      secondPlay.reject(new Error("stale-clear-detail"));
      await secondPlay.promise.catch(() => undefined);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(useAudioStore.getState().source).toBeNull();
  });

  it("ignores old-source media events after source replacement", async () => {
    const user = userEvent.setup();
    render(<GlobalPlayer />);
    const audio = screen.getByTestId("global-audio-element") as HTMLAudioElement;

    selectSource(source);
    setCurrentSource(audio);
    setMediaValue(audio, "paused", true);
    await user.click(screen.getByRole("button", { name: "Play" }));

    selectSource(replacementSource);
    setCurrentSource(audio, source.playbackUrl);
    setMediaValue(audio, "duration", 999);
    setMediaValue(audio, "currentTime", 99);

    fireEvent.play(audio);
    fireEvent.pause(audio);
    fireEvent.loadedMetadata(audio);
    fireEvent.durationChange(audio);
    fireEvent.timeUpdate(audio);
    fireEvent.error(audio);

    expect(useAudioStore.getState()).toMatchObject({
      source: replacementSource,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("reports current-source duration, time, playback, ending, and errors", async () => {
    const user = userEvent.setup();
    render(<GlobalPlayer />);
    const audio = screen.getByTestId("global-audio-element") as HTMLAudioElement;
    selectSource(source);
    setCurrentSource(audio);

    setMediaValue(audio, "duration", Number.NaN);
    fireEvent.loadedMetadata(audio);
    expect(useAudioStore.getState().duration).toBe(0);

    setMediaValue(audio, "duration", 120);
    fireEvent.durationChange(audio);
    expect(useAudioStore.getState().duration).toBe(120);

    setMediaValue(audio, "currentTime", 140);
    fireEvent.timeUpdate(audio);
    expect(useAudioStore.getState().currentTime).toBe(120);

    setMediaValue(audio, "paused", true);
    await user.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.play(audio);
    expect(useAudioStore.getState().isPlaying).toBe(true);

    fireEvent.pause(audio);
    expect(useAudioStore.getState().isPlaying).toBe(false);

    act(() => {
      useAudioStore.getState().reportPlaying(true);
      useAudioStore.getState().reportCurrentTime(60);
    });
    fireEvent.ended(audio);
    expect(useAudioStore.getState()).toMatchObject({
      isPlaying: false,
      currentTime: 120,
    });

    fireEvent.error(audio);
    expect(useAudioStore.getState().isPlaying).toBe(false);
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to play this track.");
  });

  it("shows a generic current-generation play rejection and clears it on success", async () => {
    media.play.mockRejectedValueOnce(new Error("provider-secret-detail"));
    const user = userEvent.setup();
    render(<GlobalPlayer />);
    const audio = screen.getByTestId("global-audio-element") as HTMLAudioElement;
    selectSource(source);
    setCurrentSource(audio);
    setMediaValue(audio, "paused", true);

    await user.click(screen.getByRole("button", { name: "Play" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to play this track.");
    expect(screen.getByRole("alert")).not.toHaveTextContent("provider-secret-detail");
    expect(useAudioStore.getState().isPlaying).toBe(false);

    media.play.mockResolvedValueOnce(undefined);
    await user.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.play(audio);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(useAudioStore.getState().isPlaying).toBe(true);
  });

  it("seeks imperatively and reports the sanitized position", () => {
    render(<GlobalPlayer />);
    const audio = screen.getByTestId("global-audio-element") as HTMLAudioElement;
    selectSource(source);
    setCurrentSource(audio);
    setMediaValue(audio, "duration", 120);
    fireEvent.loadedMetadata(audio);

    const seek = screen.getByRole("slider", { name: "Seek" });
    expect(seek).toHaveAttribute("min", "0");
    expect(seek).toHaveAttribute("max", "120");
    expect(seek).toHaveAttribute("step", "0.1");

    fireEvent.change(seek, { target: { value: "42.5" } });

    expect(audio.currentTime).toBe(42.5);
    expect(useAudioStore.getState().currentTime).toBe(42.5);
  });

  it("changes idle volume without triggering playback", () => {
    render(<GlobalPlayer />);
    const audio = screen.getByTestId("global-audio-element") as HTMLAudioElement;

    fireEvent.change(screen.getByRole("slider", { name: "Volume" }), {
      target: { value: "0.25" },
    });

    expect(audio.volume).toBe(0.25);
    expect(useAudioStore.getState().volume).toBe(0.25);
    expect(media.play).not.toHaveBeenCalled();
  });

  it("uses exact tactile motion and removes scaling for reduced motion", () => {
    const { unmount } = render(<GlobalPlayer />);
    let transport = screen.getByRole("button", { name: "Play" });

    expect(transport).toHaveAttribute("data-while-tap", JSON.stringify({ scale: 0.95 }));
    expect(transport).toHaveAttribute(
      "data-transition",
      JSON.stringify({ type: "spring", stiffness: 400, damping: 30 }),
    );

    unmount();
    motionMocks.reduceMotion.mockReturnValue(true);
    render(<GlobalPlayer />);
    transport = screen.getByRole("button", { name: "Play" });

    expect(transport).not.toHaveAttribute("data-while-tap");
    expect(transport).toHaveAttribute(
      "data-transition",
      JSON.stringify({ duration: 0 }),
    );
  });

  it("keeps seek and volume labels visible while transport names change", async () => {
    const user = userEvent.setup();
    render(<GlobalPlayer />);
    const audio = screen.getByTestId("global-audio-element") as HTMLAudioElement;
    selectSource(source);
    setCurrentSource(audio);
    setMediaValue(audio, "paused", true);

    expect(screen.getByText("Seek")).toBeVisible();
    expect(screen.getByText("Volume")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Play" }));
    fireEvent.play(audio);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    });
    expect(screen.getByText("Seek")).toBeVisible();
    expect(screen.getByText("Volume")).toBeVisible();
  });
});

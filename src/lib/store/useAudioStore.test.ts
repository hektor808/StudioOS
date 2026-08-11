import { beforeEach, describe, expect, it } from "vitest";

import {
  resetAudioStore,
  useAudioStore,
  type PlaybackSource,
} from "./useAudioStore";

const sourceA: PlaybackSource = {
  sourceId: "version-a",
  trackId: "track-a",
  title: "Signal One",
  subtitle: "Version 1",
  playbackUrl: "/audio/signal-one.mp3",
};

const sourceB: PlaybackSource = {
  sourceId: "version-b",
  trackId: "track-b",
  title: "Signal Two",
  playbackUrl: "/audio/signal-two.mp3",
};

describe("useAudioStore", () => {
  beforeEach(() => {
    resetAudioStore();
  });

  it("starts with the idle playback state", () => {
    expect(useAudioStore.getState()).toMatchObject({
      source: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.8,
    });
  });

  it("selects a source in a paused reset state", () => {
    useAudioStore.getState().selectSource(sourceA);

    expect(useAudioStore.getState()).toMatchObject({
      source: sourceA,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });
  });

  it("preserves telemetry for a same-source metadata update", () => {
    useAudioStore.getState().selectSource(sourceA);
    useAudioStore.setState({ isPlaying: true, currentTime: 18, duration: 120 });

    useAudioStore
      .getState()
      .selectSource({ ...sourceA, title: "Signal One (Master)" });

    expect(useAudioStore.getState()).toMatchObject({
      isPlaying: true,
      currentTime: 18,
      duration: 120,
    });
  });

  it("resets telemetry when the same source receives a new playback URL", () => {
    useAudioStore.getState().selectSource(sourceA);
    useAudioStore.setState({ isPlaying: true, currentTime: 18, duration: 120 });

    useAudioStore.getState().selectSource({
      ...sourceA,
      playbackUrl: "/audio/signal-one-refreshed.mp3",
    });

    expect(useAudioStore.getState()).toMatchObject({
      isPlaying: false,
      currentTime: 0,
      duration: 0,
    });
  });

  it("resets telemetry but preserves volume for a different source", () => {
    useAudioStore.setState({
      source: sourceA,
      isPlaying: true,
      currentTime: 20,
      duration: 120,
      volume: 0.35,
    });

    useAudioStore.getState().selectSource(sourceB);

    expect(useAudioStore.getState()).toMatchObject({
      source: sourceB,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.35,
    });
  });

  it("clears playback telemetry while retaining volume", () => {
    useAudioStore.setState({
      source: sourceA,
      isPlaying: true,
      currentTime: 20,
      duration: 120,
      volume: 0.35,
    });

    useAudioStore.getState().clearSource();

    expect(useAudioStore.getState()).toMatchObject({
      source: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: 0.35,
    });
  });

  it("sanitizes and clamps reported current time", () => {
    useAudioStore.getState().reportCurrentTime(-1);
    expect(useAudioStore.getState().currentTime).toBe(0);

    useAudioStore.getState().reportCurrentTime(Number.NaN);
    expect(useAudioStore.getState().currentTime).toBe(0);

    useAudioStore.getState().reportDuration(100);
    useAudioStore.getState().reportCurrentTime(120);
    expect(useAudioStore.getState().currentTime).toBe(100);

    useAudioStore.getState().reportDuration(0);
    useAudioStore.getState().reportCurrentTime(12.5);
    expect(useAudioStore.getState().currentTime).toBe(12.5);
  });

  it("sanitizes duration and clamps current time when duration shrinks", () => {
    useAudioStore.setState({ currentTime: 80, duration: 100 });

    useAudioStore.getState().reportDuration(-1);
    expect(useAudioStore.getState().duration).toBe(0);

    useAudioStore.getState().reportDuration(Number.POSITIVE_INFINITY);
    expect(useAudioStore.getState().duration).toBe(0);

    useAudioStore.getState().reportDuration(40);
    expect(useAudioStore.getState()).toMatchObject({
      currentTime: 40,
      duration: 40,
    });
  });

  it("sanitizes volume and reports observed playback state", () => {
    useAudioStore.getState().setVolume(-1);
    expect(useAudioStore.getState().volume).toBe(0);

    useAudioStore.getState().setVolume(2);
    expect(useAudioStore.getState().volume).toBe(1);

    useAudioStore.getState().setVolume(Number.NaN);
    expect(useAudioStore.getState().volume).toBe(0);

    useAudioStore.getState().reportPlaying(true);
    expect(useAudioStore.getState().isPlaying).toBe(true);

    useAudioStore.getState().reportPlaying(false);
    expect(useAudioStore.getState().isPlaying).toBe(false);
  });

  it("does not expose misleading imperative transport actions", () => {
    expect(useAudioStore.getState()).not.toHaveProperty("play");
    expect(useAudioStore.getState()).not.toHaveProperty("pause");
    expect(useAudioStore.getState()).not.toHaveProperty("toggle");
    expect(useAudioStore.getState()).not.toHaveProperty("seek");
  });
});

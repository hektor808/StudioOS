"use client";

import { Pause, Play, SpeakerHigh, Waveform } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type SyntheticEvent,
} from "react";

import { Button } from "@/components/ui/button";
import { formatPlaybackTime } from "@/lib/audio/format-time";
import { useAudioStore } from "@/lib/store/useAudioStore";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export function GlobalPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceGenerationRef = useRef(0);
  const transportGenerationRef = useRef(0);
  const allowedPlayGenerationRef = useRef<number | null>(null);
  const activePlaybackUrlRef = useRef<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const source = useAudioStore((state) => state.source);
  const hasSource = source !== null;
  const sourceId = source?.sourceId;
  const playbackUrl = source?.playbackUrl;
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const currentTime = useAudioStore((state) => state.currentTime);
  const duration = useAudioStore((state) => state.duration);
  const volume = useAudioStore((state) => state.volume);
  const setVolume = useAudioStore((state) => state.setVolume);
  const reportPlaying = useAudioStore((state) => state.reportPlaying);
  const reportCurrentTime = useAudioStore((state) => state.reportCurrentTime);
  const reportDuration = useAudioStore((state) => state.reportDuration);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    sourceGenerationRef.current += 1;
    transportGenerationRef.current += 1;
    allowedPlayGenerationRef.current = null;
    activePlaybackUrlRef.current = playbackUrl ?? null;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setPlaybackError(null);
    reportPlaying(false);

    if (!hasSource || !playbackUrl) {
      reportCurrentTime(0);
      reportDuration(0);
      return;
    }

    audio.src = playbackUrl;
    audio.load();
  }, [
    hasSource,
    playbackUrl,
    reportCurrentTime,
    reportDuration,
    reportPlaying,
    sourceId,
  ]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  function eventBelongsToCurrentSource(
    event: SyntheticEvent<HTMLAudioElement>,
  ) {
    const activeUrl = activePlaybackUrlRef.current;
    if (!activeUrl) return false;
    const eventUrl = event.currentTarget.currentSrc || event.currentTarget.src;
    return eventUrl.endsWith(activeUrl) || eventUrl === activeUrl;
  }

  async function handleTransport() {
    const audio = audioRef.current;
    if (!audio || !source) return;

    if (!audio.paused || isPlaying) {
      transportGenerationRef.current += 1;
      allowedPlayGenerationRef.current = null;
      audio.pause();
      reportPlaying(false);
      return;
    }

    const sourceGeneration = sourceGenerationRef.current;
    const transportGeneration = transportGenerationRef.current + 1;
    transportGenerationRef.current = transportGeneration;
    allowedPlayGenerationRef.current = transportGeneration;
    setPlaybackError(null);

    try {
      await audio.play();
    } catch {
      const isCurrentRequest =
        sourceGenerationRef.current === sourceGeneration &&
        transportGenerationRef.current === transportGeneration &&
        allowedPlayGenerationRef.current === transportGeneration;

      if (isCurrentRequest) {
        allowedPlayGenerationRef.current = null;
        reportPlaying(false);
        setPlaybackError("Unable to play this track.");
      }
    }
  }

  function handlePlay(event: SyntheticEvent<HTMLAudioElement>) {
    const requestIsCurrent =
      allowedPlayGenerationRef.current !== null &&
      allowedPlayGenerationRef.current === transportGenerationRef.current;

    if (!requestIsCurrent || !eventBelongsToCurrentSource(event)) {
      event.currentTarget.pause();
      reportPlaying(false);
      return;
    }

    setPlaybackError(null);
    reportPlaying(true);
  }

  function handlePause(event: SyntheticEvent<HTMLAudioElement>) {
    if (
      activePlaybackUrlRef.current &&
      !eventBelongsToCurrentSource(event)
    ) {
      return;
    }
    reportPlaying(false);
  }

  function handleDuration(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    reportDuration(event.currentTarget.duration);
  }

  function handleTimeUpdate(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    reportCurrentTime(event.currentTarget.currentTime);
  }

  function handleEnded(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    allowedPlayGenerationRef.current = null;
    reportCurrentTime(event.currentTarget.duration);
    reportPlaying(false);
  }

  function handleMediaError(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    allowedPlayGenerationRef.current = null;
    reportPlaying(false);
    setPlaybackError("Unable to play this track.");
  }

  function handleSeek(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio || !source || duration <= 0) return;
    const requestedTime = Number(event.currentTarget.value);
    const nextTime = Number.isFinite(requestedTime)
      ? Math.min(duration, Math.max(0, requestedTime))
      : 0;
    audio.currentTime = nextTime;
    reportCurrentTime(nextTime);
  }

  function handleVolume(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    const requestedVolume = Number(event.currentTarget.value);
    const nextVolume = Number.isFinite(requestedVolume)
      ? Math.min(1, Math.max(0, requestedVolume))
      : 0;
    if (audio) audio.volume = nextVolume;
    setVolume(nextVolume);
  }

  const transportLabel = isPlaying ? "Pause" : "Play";
  const TransportIcon = isPlaying ? Pause : Play;

  return (
    <section
      aria-label="Global audio player"
      className="dashboard-player-dock glass-panel"
    >
      <audio
        ref={audioRef}
        data-testid="global-audio-element"
        preload="metadata"
        onLoadedMetadata={handleDuration}
        onDurationChange={handleDuration}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleMediaError}
      />

      <div className="grid min-h-[var(--player-dock-height)] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 lg:grid-cols-[minmax(13rem,1fr)_auto_minmax(18rem,2fr)_minmax(10rem,1fr)] lg:gap-5 lg:px-5 lg:py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-primary-container/20 text-primary">
            <Waveform aria-hidden="true" size={20} weight="duotone" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold">
              {source?.title ?? "No track selected"}
            </p>
            {playbackError ? (
              <p role="alert" className="truncate text-xs text-destructive">
                {playbackError}
              </p>
            ) : (
              <p className="truncate text-xs text-muted-foreground">
                {source?.subtitle ??
                  "Choose a track from Studio when the catalog is connected."}
              </p>
            )}
          </div>
        </div>

        <Button asChild variant="glass" size="icon" className="rounded-full">
          <motion.button
            type="button"
            aria-label={transportLabel}
            disabled={!source}
            onClick={handleTransport}
            transition={
              shouldReduceMotion ? { duration: 0 } : springTransition
            }
            whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
          >
            <TransportIcon aria-hidden="true" size={18} weight="fill" />
          </motion.button>
        </Button>

        <div className="col-span-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 lg:col-span-1">
          <time className="min-w-9 font-heading text-xs text-muted-foreground">
            {formatPlaybackTime(currentTime)}
          </time>
          <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <span>Seek</span>
            <input
              className="audio-range"
              type="range"
              aria-label="Seek"
              min={0}
              max={duration}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              disabled={!source || duration <= 0}
              onChange={handleSeek}
            />
          </label>
          <time className="min-w-9 text-right font-heading text-xs text-muted-foreground">
            {formatPlaybackTime(duration)}
          </time>
        </div>

        <label className="col-span-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:col-span-1">
          <span className="inline-flex items-center gap-1">
            <SpeakerHigh aria-hidden="true" size={16} /> Volume
          </span>
          <input
            className="audio-range"
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolume}
          />
        </label>
      </div>

      <p className="sr-only" aria-live="polite">
        {source ? `${source.title} selected.` : "No track selected."}
      </p>
    </section>
  );
}

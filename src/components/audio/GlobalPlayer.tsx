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
import { subscribeToAudioCommands } from "@/lib/audio/command-bus";
import { formatPlaybackTime } from "@/lib/audio/format-time";
import { useAudioStore } from "@/lib/store/useAudioStore";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const PLAYBACK_REFRESH_LEAD_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 1_000;
const refreshPlaybackError =
  "Unable to refresh playback. Select this version again to retry.";

type SourceIdentity = {
  sourceId: string;
  playbackUrl: string;
};

type RefreshRestore = {
  sourceId: string;
  sourceGeneration: number;
  currentTime: number;
  shouldPlay: boolean;
};

export function GlobalPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceGenerationRef = useRef(0);
  const transportGenerationRef = useRef(0);
  const allowedPlayGenerationRef = useRef<number | null>(null);
  const activePlaybackUrlRef = useRef<string | null>(null);
  const previousSourceRef = useRef<SourceIdentity | null>(null);
  const refreshRestoreRef = useRef<RefreshRestore | null>(null);
  const refreshRequestGenerationRef = useRef(0);
  const mountedRef = useRef(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const source = useAudioStore((state) => state.source);
  const hasSource = source !== null;
  const sourceId = source?.sourceId;
  const playbackUrl = source?.playbackUrl;
  const expiresAt = source?.expiresAt;
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const currentTime = useAudioStore((state) => state.currentTime);
  const duration = useAudioStore((state) => state.duration);
  const volume = useAudioStore((state) => state.volume);
  const setVolume = useAudioStore((state) => state.setVolume);
  const reportPlaying = useAudioStore((state) => state.reportPlaying);
  const reportCurrentTime = useAudioStore((state) => state.reportCurrentTime);
  const reportDuration = useAudioStore((state) => state.reportDuration);
  const refreshSource = useAudioStore((state) => state.refreshSource);

  const currentSourceIdRef = useRef<string | null>(sourceId ?? null);
  const currentPlaybackUrlRef = useRef<string | null>(playbackUrl ?? null);
  const currentTimeRef = useRef(currentTime);
  const currentDurationRef = useRef(duration);
  const isPlayingRef = useRef(isPlaying);
  const reportPlayingRef = useRef(reportPlaying);
  const reportCurrentTimeRef = useRef(reportCurrentTime);

  currentSourceIdRef.current = sourceId ?? null;
  currentPlaybackUrlRef.current = playbackUrl ?? null;
  currentTimeRef.current = currentTime;
  currentDurationRef.current = duration;
  isPlayingRef.current = isPlaying;
  reportPlayingRef.current = reportPlaying;
  reportCurrentTimeRef.current = reportCurrentTime;

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      refreshRequestGenerationRef.current += 1;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAudioCommands((command) => {
      if (
        command.type !== "seek" ||
        command.sourceId !== currentSourceIdRef.current
      ) {
        return;
      }

      const audio = audioRef.current;
      if (!audio) return;

      const upperBound =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : Math.max(0, currentDurationRef.current);
      const nextTime =
        upperBound > 0
          ? Math.min(upperBound, Math.max(0, command.seconds))
          : Math.max(0, command.seconds);
      audio.currentTime = nextTime;
      currentTimeRef.current = nextTime;
      reportCurrentTimeRef.current(nextTime);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const previousSource = previousSourceRef.current;
    const isSameSourceRefresh = Boolean(
      sourceId &&
        playbackUrl &&
        previousSource &&
        previousSource.sourceId === sourceId &&
        previousSource.playbackUrl !== playbackUrl,
    );

    previousSourceRef.current =
      sourceId && playbackUrl ? { sourceId, playbackUrl } : null;

    if (isSameSourceRefresh && sourceId && playbackUrl) {
      const refreshRestore = {
        sourceId,
        sourceGeneration: sourceGenerationRef.current + 1,
        currentTime: Math.max(0, currentTimeRef.current),
        shouldPlay: isPlayingRef.current,
      };

      sourceGenerationRef.current = refreshRestore.sourceGeneration;
      transportGenerationRef.current += 1;
      allowedPlayGenerationRef.current = null;
      activePlaybackUrlRef.current = playbackUrl;
      refreshRestoreRef.current = refreshRestore;
      audio.pause();
      audio.src = playbackUrl;
      audio.load();
      setPlaybackError(null);
      return;
    }

    sourceGenerationRef.current += 1;
    transportGenerationRef.current += 1;
    allowedPlayGenerationRef.current = null;
    refreshRestoreRef.current = null;
    activePlaybackUrlRef.current = playbackUrl ?? null;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setPlaybackError(null);
    reportPlaying(false);

    if (!hasSource || !playbackUrl) {
      currentTimeRef.current = 0;
      currentDurationRef.current = 0;
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

  useEffect(() => {
    const expiry = expiresAt ? Date.parse(expiresAt) : Number.NaN;
    if (!sourceId || !playbackUrl || !Number.isFinite(expiry)) return;

    const capturedSourceId = sourceId;
    const capturedPlaybackUrl = playbackUrl;
    const requestGeneration = refreshRequestGenerationRef.current + 1;
    refreshRequestGenerationRef.current = requestGeneration;
    const delay = Math.max(
      MIN_REFRESH_DELAY_MS,
      expiry - Date.now() - PLAYBACK_REFRESH_LEAD_MS,
    );

    const timeout = window.setTimeout(() => {
      void (async () => {
        const isCurrentRefreshRequest = () =>
          mountedRef.current &&
          refreshRequestGenerationRef.current === requestGeneration &&
          currentSourceIdRef.current === capturedSourceId &&
          currentPlaybackUrlRef.current === capturedPlaybackUrl;

        const failRefresh = () => {
          if (!isCurrentRefreshRequest()) return;

          transportGenerationRef.current += 1;
          allowedPlayGenerationRef.current = null;
          audioRef.current?.pause();
          reportPlayingRef.current(false);
          setPlaybackError(refreshPlaybackError);
        };

        try {
          const response = await fetch("/api/studio/playback/refresh", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ versionId: capturedSourceId }),
          });

          if (!response.ok) {
            failRefresh();
            return;
          }

          const responsePayload: unknown = await response.json();
          const payload: Record<string, unknown> | null =
            responsePayload &&
            typeof responsePayload === "object" &&
            !Array.isArray(responsePayload)
              ? responsePayload
              : null;
          const responseExpiresAt =
            payload && typeof payload.expiresAt === "string"
              ? Date.parse(payload.expiresAt)
              : Number.NaN;
          if (
            !payload ||
            typeof payload.playbackUrl !== "string" ||
            !payload.playbackUrl ||
            typeof payload.expiresAt !== "string" ||
            !Number.isFinite(responseExpiresAt) ||
            responseExpiresAt <= Date.now()
          ) {
            failRefresh();
            return;
          }

          if (!isCurrentRefreshRequest()) return;

          refreshSource({
            sourceId: capturedSourceId,
            playbackUrl: payload.playbackUrl,
            expiresAt: payload.expiresAt,
          });
        } catch {
          failRefresh();
        }
      })();
    }, delay);

    return () => {
      window.clearTimeout(timeout);
      if (refreshRequestGenerationRef.current === requestGeneration) {
        refreshRequestGenerationRef.current += 1;
      }
    };
  }, [expiresAt, playbackUrl, refreshSource, sourceId]);

  function eventBelongsToCurrentSource(
    event: SyntheticEvent<HTMLAudioElement>,
  ) {
    const activeUrl = activePlaybackUrlRef.current;
    if (!activeUrl) return false;
    const eventUrl = event.currentTarget.currentSrc || event.currentTarget.src;
    return eventUrl.endsWith(activeUrl) || eventUrl === activeUrl;
  }

  async function requestPlayback(
    audio: HTMLAudioElement,
    sourceGeneration: number,
  ) {
    if (sourceGenerationRef.current !== sourceGeneration) return;

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
        reportPlayingRef.current(false);
        setPlaybackError("Unable to play this track.");
      }
    }
  }

  function handleLoadedMetadata(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;

    const audio = event.currentTarget;
    const refreshRestore = refreshRestoreRef.current;
    if (
      refreshRestore &&
      refreshRestore.sourceId === currentSourceIdRef.current &&
      refreshRestore.sourceGeneration === sourceGenerationRef.current
    ) {
      const upperBound =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : Math.max(0, currentDurationRef.current);
      const nextTime =
        upperBound > 0
          ? Math.min(upperBound, refreshRestore.currentTime)
          : refreshRestore.currentTime;

      audio.currentTime = nextTime;
      currentTimeRef.current = nextTime;
      refreshRestoreRef.current = null;
      reportCurrentTime(nextTime);

      if (refreshRestore.shouldPlay) {
        void requestPlayback(audio, refreshRestore.sourceGeneration);
      }
    }

    currentDurationRef.current = audio.duration;
    reportDuration(audio.duration);
  }

  function handleTransport() {
    const audio = audioRef.current;
    if (!audio || !source) return;

    if (!audio.paused || isPlaying) {
      transportGenerationRef.current += 1;
      allowedPlayGenerationRef.current = null;
      audio.pause();
      reportPlaying(false);
      return;
    }

    void requestPlayback(audio, sourceGenerationRef.current);
  }

  function handlePlay(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;

    const requestIsCurrent =
      allowedPlayGenerationRef.current !== null &&
      allowedPlayGenerationRef.current === transportGenerationRef.current;

    if (!requestIsCurrent) {
      event.currentTarget.pause();
      reportPlaying(false);
      return;
    }

    setPlaybackError(null);
    reportPlaying(true);
  }

  function handlePause(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    if (
      refreshRestoreRef.current?.sourceGeneration === sourceGenerationRef.current
    ) {
      return;
    }
    reportPlaying(false);
  }

  function handleDuration(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    currentDurationRef.current = event.currentTarget.duration;
    reportDuration(event.currentTarget.duration);
  }

  function handleTimeUpdate(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    currentTimeRef.current = event.currentTarget.currentTime;
    reportCurrentTime(event.currentTarget.currentTime);
  }

  function handleEnded(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    allowedPlayGenerationRef.current = null;
    currentTimeRef.current = event.currentTarget.duration;
    reportCurrentTime(event.currentTarget.duration);
    reportPlaying(false);
  }

  function handleMediaError(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    const wasRefreshing =
      refreshRestoreRef.current?.sourceGeneration === sourceGenerationRef.current;
    refreshRestoreRef.current = null;
    allowedPlayGenerationRef.current = null;
    reportPlaying(false);
    setPlaybackError(
      wasRefreshing ? refreshPlaybackError : "Unable to play this track.",
    );
  }

  function handleSeek(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio || !source || duration <= 0) return;
    const requestedTime = Number(event.currentTarget.value);
    const nextTime = Number.isFinite(requestedTime)
      ? Math.min(duration, Math.max(0, requestedTime))
      : 0;
    audio.currentTime = nextTime;
    currentTimeRef.current = nextTime;
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
        onLoadedMetadata={handleLoadedMetadata}
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

"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Pause, Play, SpeakerHigh, Waveform } from "@phosphor-icons/react";
import {
  useMemo,
  useRef,
  useState,
  useEffect,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type SyntheticEvent,
} from "react";

import { formatPlaybackTime } from "@/lib/audio/format-time";
import type {
  PublicListeningAvailability,
  PublicListeningSession,
  RefreshListeningResult,
} from "@/lib/listening/types";

import styles from "./public-listening-room.module.css";

const SESSION_ENDPOINT = "/api/listen/session";
const REFRESH_ENDPOINT = "/api/listen/refresh";
const REFRESH_LEAD_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 5_000;
const GUEST_NAME_MIN = 2;
const GUEST_NAME_MAX = 60;

type RoomState = "gate" | "listening" | "unavailable";

type WatermarkSpec = {
  left: string;
  top: string;
  rotationDeg: number;
  opacity: number;
  fontSizeRem: number;
  delaySeconds: number;
  durationSeconds: number;
};

function hashWatermarkSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function deriveWatermarks(guestName: string, nonce: string): WatermarkSpec[] {
  const random = createSeededRandom(hashWatermarkSeed(`${guestName}:${nonce}`));
  const count = 6 + Math.floor(random() * 5);

  return Array.from({ length: count }, () => ({
    left: `${(4 + random() * 82).toFixed(2)}%`,
    top: `${(4 + random() * 82).toFixed(2)}%`,
    rotationDeg: -28 + random() * 56,
    opacity: 0.1 + random() * 0.08,
    fontSizeRem: 0.75 + random() * 0.25,
    delaySeconds: -(random() * 12),
    durationSeconds: 11 + random() * 8,
  }));
}

function createSessionNonce(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function PublicListeningRoom({
  token,
  availability,
}: {
  token: string;
  availability: PublicListeningAvailability;
}) {
  const reduceMotion = useReducedMotion();

  const [roomState, setRoomState] = useState<RoomState>("gate");
  const [guestName, setGuestName] = useState("");
  const [submittedGuestName, setSubmittedGuestName] = useState<string | null>(
    null,
  );
  const [session, setSession] = useState<PublicListeningSession | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const refreshTimerRef = useRef<number | null>(null);
  const requestGenerationRef = useRef(0);
  const refreshRetriedRef = useRef(false);
  const nonceRef = useRef<string | null>(null);

  if (nonceRef.current === null) {
    nonceRef.current = createSessionNonce();
  }

  const trimmedGuestName = guestName.trim();
  const isGuestNameValid =
    trimmedGuestName.length >= GUEST_NAME_MIN &&
    trimmedGuestName.length <= GUEST_NAME_MAX;

  const watermarks = useMemo(() => {
    if (!submittedGuestName || !nonceRef.current) {
      return [];
    }
    return deriveWatermarks(submittedGuestName, nonceRef.current);
  }, [submittedGuestName]);

  function clearRefreshTimer() {
    if (refreshTimerRef.current !== null) {
      window.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }

  function scheduleRefresh(expiresAt: string) {
    clearRefreshTimer();
    const expiryMs = Date.parse(expiresAt);
    if (!Number.isFinite(expiryMs)) {
      return;
    }
    const delay = Math.max(
      expiryMs - Date.now() - REFRESH_LEAD_MS,
      MIN_REFRESH_DELAY_MS,
    );
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      void refreshPlaybackUrl();
    }, delay);
  }

  function enterUnavailable() {
    requestGenerationRef.current += 1;
    clearRefreshTimer();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    setIsPlaying(false);
    setRoomState("unavailable");
  }

  function handleTransientRefreshFailure() {
    const audio = audioRef.current;
    if (audio && !audio.paused) {
      audio.pause();
    }
    if (refreshRetriedRef.current) {
      enterUnavailable();
      return;
    }
    refreshRetriedRef.current = true;
    setRefreshError("Playback refresh failed. Retry once.");
  }

  async function handleGuestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isGuestNameValid || isSubmitting) {
      return;
    }

    const generation = ++requestGenerationRef.current;
    setIsSubmitting(true);
    setSessionError(null);

    try {
      const response = await fetch(SESSION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });
      if (generation !== requestGenerationRef.current) {
        return;
      }

      if (response.ok) {
        const nextSession = (await response.json()) as PublicListeningSession;
        if (generation !== requestGenerationRef.current) {
          return;
        }
        setSession(nextSession);
        setSubmittedGuestName(trimmedGuestName);
        setRoomState("listening");
        const audio = audioRef.current;
        if (audio) {
          audio.src = nextSession.playbackUrl;
          audio.load();
        }
        scheduleRefresh(nextSession.expiresAt);
        return;
      }

      if (response.status === 400 || response.status === 410) {
        enterUnavailable();
        return;
      }

      setSessionError("Playback is temporarily unavailable.");
    } catch {
      if (generation !== requestGenerationRef.current) {
        return;
      }
      setSessionError("Playback is temporarily unavailable.");
    } finally {
      if (generation === requestGenerationRef.current) {
        setIsSubmitting(false);
      }
    }
  }

  async function refreshPlaybackUrl() {
    const generation = ++requestGenerationRef.current;

    try {
      const response = await fetch(REFRESH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      });
      if (generation !== requestGenerationRef.current) {
        return;
      }

      if (response.status === 400 || response.status === 410) {
        enterUnavailable();
        return;
      }

      if (!response.ok) {
        handleTransientRefreshFailure();
        return;
      }

      const refresh = (await response.json()) as RefreshListeningResult;
      if (generation !== requestGenerationRef.current) {
        return;
      }

      refreshRetriedRef.current = false;
      setRefreshError(null);
      scheduleRefresh(refresh.expiresAt);

      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      const savedTime = Number.isFinite(audio.currentTime)
        ? audio.currentTime
        : 0;
      const wasPlaying = !audio.paused;
      const savedVolume = audio.volume;

      const restorePlayback = () => {
        audio.removeEventListener("loadedmetadata", restorePlayback);
        if (generation !== requestGenerationRef.current) {
          return;
        }
        const mediaDuration = audio.duration;
        const target = Number.isFinite(mediaDuration)
          ? Math.min(savedTime, mediaDuration)
          : savedTime;
        audio.currentTime = Math.max(0, target);
        audio.volume = savedVolume;
        if (wasPlaying) {
          void audio.play().catch(() => {
            setIsPlaying(false);
          });
        }
      };

      audio.addEventListener("loadedmetadata", restorePlayback);
      audio.src = refresh.playbackUrl;
      audio.load();
    } catch {
      if (generation !== requestGenerationRef.current) {
        return;
      }
      handleTransientRefreshFailure();
    }
  }

  function handleRefreshRetry() {
    setRefreshError(null);
    void refreshPlaybackUrl();
  }

  useEffect(() => {
    return () => {
      requestGenerationRef.current += 1;
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    };
  }, []);

  function handleLoadedMetadata(event: SyntheticEvent<HTMLAudioElement>) {
    const mediaDuration = event.currentTarget.duration;
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
      setDuration(mediaDuration);
    }
  }

  function handleTimeUpdate(event: SyntheticEvent<HTMLAudioElement>) {
    const nextTime = event.currentTarget.currentTime;
    if (Number.isFinite(nextTime)) {
      setCurrentTime(nextTime);
    }
  }

  function handleEnded(event: SyntheticEvent<HTMLAudioElement>) {
    setIsPlaying(false);
    const mediaDuration = event.currentTarget.duration;
    if (Number.isFinite(mediaDuration)) {
      setCurrentTime(mediaDuration);
    }
  }

  function handleMediaError() {
    handleTransientRefreshFailure();
  }

  function handleTogglePlay() {
    const audio = audioRef.current;
    if (!audio || !session) {
      return;
    }
    if (audio.paused) {
      void audio.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }

  function handleSeek(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(duration) || duration <= 0) {
      return;
    }
    const requested = Number(event.currentTarget.value);
    const nextTime = Number.isFinite(requested)
      ? Math.min(duration, Math.max(0, requested))
      : 0;
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  function handleVolume(event: ChangeEvent<HTMLInputElement>) {
    const requested = Number(event.currentTarget.value);
    const nextVolume = Number.isFinite(requested)
      ? Math.min(1, Math.max(0, requested))
      : 0;
    const audio = audioRef.current;
    if (audio) {
      audio.volume = nextVolume;
    }
    setVolume(nextVolume);
  }

  if (roomState === "unavailable") {
    return (
      <main className="flex min-h-dvh items-center justify-center p-4 md:p-8">
        <section className="glass-panel w-full max-w-md p-6 text-center md:p-10">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            VEO // PRIVATE LISTENING
          </p>
          <h1 className="mt-4 font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
            This listening link is unavailable
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Ask the sender for a new link.
          </p>
        </section>
      </main>
    );
  }

  const entranceAnimation = reduceMotion
    ? { initial: false as const }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <main className="relative flex min-h-dvh items-center justify-center p-4 md:p-8">
      {submittedGuestName ? (
        <div aria-hidden="true" className={styles.watermarkLayer}>
          {watermarks.map((mark, index) => (
            <span
              className={styles.watermark}
              key={`watermark-${index}`}
              style={
                {
                  left: mark.left,
                  top: mark.top,
                  opacity: mark.opacity,
                  fontSize: `${mark.fontSizeRem}rem`,
                  animationDelay: `${mark.delaySeconds}s`,
                  animationDuration: `${mark.durationSeconds}s`,
                  "--watermark-rotation": `${mark.rotationDeg}deg`,
                } as CSSProperties
              }
            >
              {submittedGuestName}
            </span>
          ))}
        </div>
      ) : null}

      <motion.section
        animate={entranceAnimation.animate}
        className="glass-panel w-full max-w-lg p-6 md:p-10"
        initial={entranceAnimation.initial}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      >
        <p className="text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          VEO // PRIVATE LISTENING
        </p>

        <div className="mt-5 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-primary-container/20 text-primary">
            <Waveform aria-hidden="true" size={24} weight="duotone" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-2xl font-semibold tracking-[-0.02em] text-foreground md:text-3xl">
              {availability.trackTitle}
            </h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
              {availability.versionLabel}
            </p>
          </div>
        </div>

        <audio
          onDurationChange={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={handleMediaError}
          onLoadedMetadata={handleLoadedMetadata}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onTimeUpdate={handleTimeUpdate}
          preload="metadata"
          ref={audioRef}
        />

        {roomState === "gate" ? (
          <form className="mt-8" onSubmit={handleGuestSubmit}>
            <label
              className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground"
              htmlFor="listening-guest-name"
            >
              Your name
            </label>
            <input
              aria-describedby="listening-guest-name-hint"
              autoComplete="name"
              className="mt-2 w-full rounded-[10px] border border-input bg-background/40 px-3 py-2.5 text-sm text-foreground shadow-inner outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/40"
              id="listening-guest-name"
              maxLength={GUEST_NAME_MAX + 20}
              onChange={(event) => setGuestName(event.currentTarget.value)}
              placeholder="Name the sender will recognize"
              type="text"
              value={guestName}
            />
            <p
              className="mt-2 text-xs leading-5 text-muted-foreground"
              id="listening-guest-name-hint"
            >
              Use 2–60 characters. Your name stays on this device and marks your
              listening session.
            </p>

            {sessionError ? (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {sessionError}
              </p>
            ) : null}

            <motion.button
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-[10px] bg-primary-container px-4 py-2.5 text-sm font-semibold text-primary-container-foreground shadow-[0_8px_30px_rgba(46,0,139,0.35)] outline-none transition-colors hover:bg-primary-container/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50"
              disabled={!isGuestNameValid || isSubmitting}
              type="submit"
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            >
              {isSubmitting ? "Preparing session…" : "Enter listening room"}
            </motion.button>
          </form>
        ) : (
          <div className="mt-8">
            <p className="text-xs text-muted-foreground">
              Listening as {submittedGuestName}
            </p>

            <div className="mt-5 flex items-center gap-4">
              <motion.button
                className="flex h-12 shrink-0 items-center gap-2 rounded-full bg-primary-container px-5 text-sm font-semibold text-primary-container-foreground shadow-[0_8px_30px_rgba(46,0,139,0.35)] outline-none transition-colors hover:bg-primary-container/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={handleTogglePlay}
                type="button"
                whileTap={reduceMotion ? undefined : { scale: 0.95 }}
              >
                {isPlaying ? (
                  <Pause aria-hidden="true" size={18} weight="fill" />
                ) : (
                  <Play aria-hidden="true" size={18} weight="fill" />
                )}
                {isPlaying ? "Pause" : "Play"}
              </motion.button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between text-xs font-medium tabular-nums text-muted-foreground">
                  <span>{formatPlaybackTime(currentTime)}</span>
                  <span>{formatPlaybackTime(duration)}</span>
                </div>
                <label
                  className="mt-2 block text-xs font-semibold uppercase tracking-[0.12em] text-foreground"
                  htmlFor="listening-seek"
                >
                  Seek
                </label>
                <input
                  aria-valuetext={formatPlaybackTime(currentTime)}
                  className="audio-range mt-1"
                  disabled={!Number.isFinite(duration) || duration <= 0}
                  id="listening-seek"
                  max={Number.isFinite(duration) && duration > 0 ? duration : 0}
                  min={0}
                  onChange={handleSeek}
                  step={0.1}
                  type="range"
                  value={
                    Number.isFinite(currentTime)
                      ? Math.min(
                          currentTime,
                          Number.isFinite(duration) && duration > 0
                            ? duration
                            : currentTime,
                        )
                      : 0
                  }
                />
              </div>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <SpeakerHigh
                aria-hidden="true"
                className="shrink-0 text-muted-foreground"
                size={18}
                weight="duotone"
              />
              <label
                className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground"
                htmlFor="listening-volume"
              >
                Volume
              </label>
              <input
                aria-valuetext={`${Math.round(volume * 100)}%`}
                className="audio-range max-w-[10rem]"
                id="listening-volume"
                max={1}
                min={0}
                onChange={handleVolume}
                step={0.01}
                type="range"
                value={volume}
              />
            </div>

            {refreshError ? (
              <div
                className="mt-5 flex items-center justify-between gap-3 rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2.5"
                role="alert"
              >
                <p className="text-sm text-destructive">{refreshError}</p>
                <button
                  className="shrink-0 rounded-[10px] border border-border px-3 py-1.5 text-xs font-semibold text-foreground outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={handleRefreshRetry}
                  type="button"
                >
                  Retry
                </button>
              </div>
            ) : null}
          </div>
        )}
      </motion.section>
    </main>
  );
}

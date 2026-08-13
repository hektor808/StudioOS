"use client";

import type WaveSurfer from "wavesurfer.js";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { formatPlaybackTime } from "@/lib/audio/format-time";

export type WaveformDisplayProps = {
  sourceId: string;
  playbackUrl: string;
  durationSeconds: number | null;
  currentTime: number;
  selectedMarker: number | null;
  onSeekRequest: (seconds: number) => void;
  onMarkerChange: (seconds: number) => void;
};

type WaveformState = {
  phase: "loading" | "ready" | "error";
  message: string | null;
};

const waveformLoadError = "Waveform could not be loaded. Try again.";

export function WaveformDisplay(props: WaveformDisplayProps) {
  const {
    sourceId,
    playbackUrl,
    durationSeconds,
    currentTime,
    selectedMarker,
  } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const loadGenerationRef = useRef(0);
  const latestPropsRef = useRef(props);
  const [retryNonce, setRetryNonce] = useState(0);
  const [waveformState, setWaveformState] = useState<WaveformState>({
    phase: "loading",
    message: null,
  });

  latestPropsRef.current = props;

  useEffect(() => {
    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;

    const visualizationMedia = new Audio();
    visualizationMedia.muted = true;
    visualizationMedia.preload = "metadata";

    let instance: WaveSurfer | null = null;
    let destroyed = false;

    const destroyInstance = () => {
      if (destroyed) return;
      destroyed = true;

      if (instance) {
        instance.destroy();
        if (wavesurferRef.current === instance) {
          wavesurferRef.current = null;
        }
      }

      visualizationMedia.pause();
      visualizationMedia.removeAttribute("src");
      visualizationMedia.load();
    };

    const isCurrent = () =>
      !destroyed && loadGenerationRef.current === generation;

    setWaveformState({ phase: "loading", message: null });

    void (async () => {
      try {
        const { default: WaveSurfer } = await import("wavesurfer.js");
        const container = containerRef.current;

        if (!isCurrent() || !container) {
          destroyInstance();
          return;
        }

        instance = WaveSurfer.create({
          container,
          url: playbackUrl,
          media: visualizationMedia,
          height: 104,
          waveColor: "#624ABF",
          progressColor: "#CBBEFF",
          cursorColor: "#CBBEFF",
          cursorWidth: 2,
          barWidth: 2,
          barGap: 1,
          barRadius: 2,
          normalize: true,
          interact: true,
        });

        if (!isCurrent()) {
          destroyInstance();
          return;
        }

        wavesurferRef.current = instance;

        instance.on("interaction", (seconds) => {
          if (!isCurrent()) {
            destroyInstance();
            return;
          }

          if (!Number.isFinite(seconds)) return;

          const { durationSeconds, onMarkerChange, onSeekRequest } =
            latestPropsRef.current;
          const upperBound =
            typeof durationSeconds === "number" &&
            Number.isFinite(durationSeconds) &&
            durationSeconds > 0
              ? durationSeconds
              : null;
          const nextSeconds =
            upperBound === null
              ? Math.max(0, seconds)
              : Math.min(upperBound, Math.max(0, seconds));

          onMarkerChange(nextSeconds);
          onSeekRequest(nextSeconds);
        });

        instance.on("ready", () => {
          if (!isCurrent()) {
            destroyInstance();
            return;
          }

          setWaveformState({ phase: "ready", message: null });
        });

        instance.on("error", () => {
          if (!isCurrent()) {
            destroyInstance();
            return;
          }

          setWaveformState({ phase: "error", message: waveformLoadError });
        });
      } catch {
        if (!isCurrent()) return;

        setWaveformState({ phase: "error", message: waveformLoadError });
      }
    })();

    return () => {
      loadGenerationRef.current += 1;
      destroyInstance();
    };
  }, [playbackUrl, retryNonce]);

  useEffect(() => {
    const instance = wavesurferRef.current;
    if (!instance || !Number.isFinite(currentTime) || currentTime < 0) return;

    instance.setTime(currentTime);
  }, [currentTime, sourceId]);

  const duration = durationSeconds;
  const hasMarker =
    selectedMarker !== null &&
    Number.isFinite(selectedMarker) &&
    typeof duration === "number" &&
    Number.isFinite(duration) &&
    duration > 0;
  const markerPercent =
    hasMarker && duration !== null && selectedMarker !== null
      ? Math.min(100, Math.max(0, (selectedMarker / duration) * 100))
      : null;

  return (
    <section aria-label="Audio waveform" className="waveform-field">
      <div ref={containerRef} className="waveform-canvas" />
      {markerPercent !== null ? (
        <span
          aria-hidden="true"
          className="waveform-marker"
          style={{ left: `${markerPercent}%` }}
        />
      ) : null}

      <div className="flex items-center justify-between gap-3 px-3 pb-3 text-xs text-muted-foreground">
        <output aria-label="Selected timestamp">
          {formatPlaybackTime(selectedMarker ?? 0)}
        </output>
        {waveformState.phase === "loading" ? (
          <p aria-live="polite">Loading waveform…</p>
        ) : null}
        {waveformState.phase === "error" ? (
          <div className="flex items-center gap-3">
            <p aria-live="polite">{waveformState.message}</p>
            <Button
              type="button"
              variant="glass"
              size="sm"
              onClick={() => setRetryNonce((nonce) => nonce + 1)}
            >
              Retry waveform
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

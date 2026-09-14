"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatPlaybackTime } from "@/lib/audio/format-time";
import { requestPlaybackSourceAction } from "@/lib/studio/mutations";
import type {
  SignedPlaybackSource,
  StudioTrackVersion,
} from "@/lib/studio/types";

import { DownloadButton } from "./download-button";

export type VersionSelectorProps = {
  versions: StudioTrackVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string) => void;
  onPlaybackSource: (source: SignedPlaybackSource) => void;
};

function formatFileSize(value: number | null): string | null {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return null;
  }

  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length);
  const size = value / 1024 ** exponent;

  return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[exponent - 1]}`;
}

export function VersionSelector({
  versions,
  selectedVersionId,
  onSelectVersion,
  onPlaybackSource,
}: VersionSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [isRequestPending, setIsRequestPending] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  if (versions.length === 0) {
    return (
      <p className="text-sm leading-6 text-muted-foreground">
        No versions are registered. Playback becomes available after a version is
        registered.
      </p>
    );
  }

  return (
    <section aria-labelledby="version-selector-heading">
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Versions
        </p>
        <h2
          id="version-selector-heading"
          className="mt-2 font-heading text-xl font-semibold"
        >
          Review a version
        </h2>
      </div>

      <div className="grid gap-3">
        {versions.map((version) => {
          const isSelected = version.id === selectedVersionId;
          const isPlaybackReady =
            version.storageAvailability === "playback" &&
            version.status === "ready";
          const fileSize = formatFileSize(version.sizeBytes);

          return (
            <article
              key={version.id}
              className="rounded-xl border border-border bg-background/35 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setPlaybackError(null);
                    onSelectVersion(version.id);
                  }}
                  className="min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="block font-medium">
                    Version {version.versionNumber}
                  </span>
                  <span className="mt-1 block break-words text-sm text-muted-foreground">
                    {version.originalFilename}
                  </span>
                </button>
                <span className="shrink-0 rounded-full bg-primary-container/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                  {version.status}
                </span>
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                Duration {formatPlaybackTime(version.durationSeconds ?? 0)}
              </p>
              {version.mimeType || fileSize ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {[fileSize, version.mimeType].filter(Boolean).join(" · ")}
                </p>
              ) : null}
              <span className="mt-3 inline-flex rounded-full bg-primary-container/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                {version.storageAvailability === "playback"
                  ? "Playback-ready version"
                  : "Production source"}
              </span>

              {version.storageAvailability === "production" ? (
                <div className="mt-4">
                  <DownloadButton
                    recordType="version"
                    recordId={version.id}
                    filename={version.originalFilename}
                  />
                </div>
              ) : null}

              {isSelected && isPlaybackReady ? (
                <div className="mt-4">
                  <Button
                    type="button"
                    onClick={() => {
                      setPlaybackError(null);
                      setIsRequestPending(true);
                      startTransition(() => {
                        void requestPlaybackSourceAction(version.id)
                          .then((result) => {
                            if (result.status === "success") {
                              onPlaybackSource(result.source);
                              return;
                            }

                            setPlaybackError("Playback is unavailable. Try again.");
                          })
                          .finally(() => setIsRequestPending(false));
                      });
                    }}
                    disabled={isPending || isRequestPending}
                  >
                    Play in global player
                  </Button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {playbackError ? (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {playbackError}
        </p>
      ) : null}
    </section>
  );
}

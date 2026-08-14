"use client";

import Link from "next/link";
import { useState } from "react";

import { WaveformDisplay } from "@/components/audio/WaveformDisplay";
import { requestAudioSeek } from "@/lib/audio/command-bus";
import { useAudioStore } from "@/lib/store/useAudioStore";
import type {
  SignedPlaybackSource,
  StudioComment,
  StudioTrackDetail,
  StudioTrackVersion,
} from "@/lib/studio/types";

import { CommentComposer } from "./comment-composer";
import { CommentList } from "./comment-list";
import { VersionSelector } from "./version-selector";

export type StudioDetailClientProps = {
  track: StudioTrackDetail;
  versions: StudioTrackVersion[];
  comments: StudioComment[];
};

export function StudioDetailClient({
  track,
  versions,
  comments,
}: StudioDetailClientProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    versions[0]?.id ?? null,
  );
  const [selectedMarker, setSelectedMarker] = useState<number | null>(null);
  const playerSource = useAudioStore((state) => state.source);
  const currentTime = useAudioStore((state) => state.currentTime);
  const selectSource = useAudioStore((state) => state.selectSource);
  const activeSource = playerSource?.trackId === track.id ? playerSource : null;
  const selectedVersion =
    versions.find((version) => version.id === selectedVersionId) ?? null;

  const handlePlaybackSource = (source: SignedPlaybackSource) => {
    selectSource(source);
  };

  const handleSelectVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    setSelectedMarker(null);
  };

  return (
    <div className="grid gap-5">
      <nav aria-label="Breadcrumb">
        <Link
          href="/studio"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Studio
        </Link>
      </nav>

      <header className="glass-panel grid gap-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-start gap-4">
          {!track.hasArtwork ? (
            <div
              aria-label={`${track.title} artwork placeholder`}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary-container/20 font-heading text-2xl font-semibold text-primary"
            >
              {track.title.charAt(0).toUpperCase()}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="break-words font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                {track.title}
              </h1>
              <span className="shrink-0 rounded-full bg-primary-container/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary">
                {track.status}
              </span>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {track.description || "No description has been added."}
            </p>
          </div>
        </div>
      </header>

      <div className="studio-detail-grid">
        <section className="studio-detail-console glass-panel grid gap-5 p-5 sm:p-6">
          <VersionSelector
            versions={versions}
            selectedVersionId={selectedVersionId}
            onSelectVersion={handleSelectVersion}
            onPlaybackSource={handlePlaybackSource}
          />
          <CommentComposer
            versionId={selectedVersionId}
            marker={selectedMarker}
          />
          <CommentList
            comments={comments}
            activeSourceId={activeSource?.sourceId ?? null}
            onSeekComment={(versionId, seconds) => {
              if (activeSource?.sourceId === versionId) {
                requestAudioSeek(versionId, seconds);
              }
            }}
          />
        </section>

        <section
          className="studio-detail-review glass-panel grid gap-5 p-5 sm:p-6"
          aria-labelledby="review-heading"
        >
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
              Timestamp review
            </p>
            <h2
              id="review-heading"
              className="mt-2 font-heading text-xl font-semibold"
            >
              Waveform
            </h2>
          </div>

          {activeSource?.sourceId === selectedVersionId && selectedVersion ? (
            <WaveformDisplay
              sourceId={activeSource.sourceId}
              playbackUrl={activeSource.playbackUrl}
              durationSeconds={selectedVersion.durationSeconds}
              currentTime={currentTime}
              selectedMarker={selectedMarker}
              onMarkerChange={setSelectedMarker}
              onSeekRequest={(seconds) =>
                requestAudioSeek(activeSource.sourceId, seconds)
              }
            />
          ) : selectedVersion ? (
            <p className="rounded-xl border border-border bg-background/35 p-4 text-sm text-muted-foreground">
              Start the selected version in the global player to load its
              waveform.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}

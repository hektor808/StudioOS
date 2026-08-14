import type { PlaybackSource } from "@/lib/store/useAudioStore";
import type { Database } from "@/types/database.types";

export type TrackStatus = Database["public"]["Enums"]["track_status"];
export type TrackVersionStatus = Database["public"]["Enums"]["track_version_status"];

export type StudioCreator = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
};

export type StudioTrackSummary = {
  id: string;
  title: string;
  status: TrackStatus;
  latestVersion: Pick<
    StudioTrackVersion,
    "id" | "versionNumber" | "status" | "durationSeconds"
  > | null;
  createdBy: StudioCreator;
  lastActivityAt: string;
};

export type StudioTrackDetail = {
  id: string;
  title: string;
  status: TrackStatus;
  description: string;
  hasArtwork: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: StudioCreator;
};

export type StudioTrackVersion = {
  id: string;
  trackId: string;
  versionNumber: number;
  status: TrackVersionStatus;
  originalFilename: string;
  durationSeconds: number | null;
  createdAt: string;
  createdBy: StudioCreator;
};

export type StudioComment = {
  id: string;
  versionId: string;
  user: StudioCreator;
  timestampMarker: number;
  content: string;
  isResolved: boolean;
  createdAt: string;
  canResolve: boolean;
};

export type SignedPlaybackSource = PlaybackSource & {
  expiresAt: string;
};

export type StudioCatalogFilters = {
  query: string;
  status: TrackStatus | null;
};

export type StudioCatalogResult = {
  tracks: StudioTrackSummary[];
  statusCounts: Record<TrackStatus, number>;
};

export type StudioActionResult = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<
    Record<
      "title" | "description" | "versionId" | "timestampMarker" | "content",
      string
    >
  >;
};

export const initialStudioActionResult: StudioActionResult = {
  status: "idle",
  message: "",
};

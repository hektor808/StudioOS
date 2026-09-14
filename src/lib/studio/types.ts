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

export type StorageAvailability = "playback" | "production";

export type StudioTrackVersion = {
  id: string;
  trackId: string;
  versionNumber: number;
  status: TrackVersionStatus;
  originalFilename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  durationSeconds: number | null;
  createdAt: string;
  createdBy: StudioCreator;
  storageAvailability: StorageAvailability;
};

export type StudioFile = {
  id: string;
  trackId: string;
  fileType: Database["public"]["Enums"]["file_type"];
  originalFilename: string;
  mimeType: string | null;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: StudioCreator;
  storageAvailability: "production";
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

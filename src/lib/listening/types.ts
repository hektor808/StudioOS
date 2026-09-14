// Safe listening DTOs shared between server boundaries and client components.
// None of these shapes may contain token hashes, raw tokens, storage locators,
// buckets, providers, or unrelated database identifiers.

export type ListeningLinkStatus = "active" | "revoked" | "expired";

export type ListeningLinkSummary = {
  id: string;
  versionId: string;
  versionLabel: string;
  label: string | null;
  status: ListeningLinkStatus;
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
  lastAccessedAt: string | null;
  accessCount: number;
};

export type ReadyListeningVersion = {
  id: string;
  versionNumber: number;
  versionLabel: string;
};

export type CreateListeningLinkInput = {
  trackId: string;
  versionId: string;
  label: string | null;
  expiresAt: string;
};

export type CreateListeningLinkResult = {
  link: ListeningLinkSummary;
  rawToken: string;
};

export type PublicListeningAvailability = {
  trackTitle: string;
  versionLabel: string;
  artworkUrl: null;
};

export type PublicListeningSession = PublicListeningAvailability & {
  playbackUrl: string;
  expiresAt: string;
};

export type RefreshListeningResult = {
  playbackUrl: string;
  expiresAt: string;
};

export type PublicListeningSessionResult =
  | { state: "ready"; session: PublicListeningSession }
  | { state: "unavailable" }
  | { state: "temporarily_unavailable" };

export type PublicListeningRefreshResult =
  | { state: "ready"; refresh: RefreshListeningResult }
  | { state: "unavailable" }
  | { state: "temporarily_unavailable" };

// Manual row contracts for the Phase 5 migration. The linked database is
// unavailable, so src/types/database.types.ts cannot be regenerated for the
// new tables/RPCs; service.ts casts rpc()/from() results onto these shapes
// instead of editing the generated declaration by hand.
export type ListeningLinkSummaryRow = {
  id: string;
  version_id: string;
  version_label: string;
  label: string | null;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  last_accessed_at: string | null;
  access_count: number;
};

export type ListeningLinkLookupRow = {
  id: string;
  track_id: string;
  version_id: string;
  expires_at: string;
  revoked_at: string | null;
};

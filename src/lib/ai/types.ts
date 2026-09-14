// Shared VEO AI DTOs. This module intentionally has no "server-only" boundary:
// the chat client component imports ChatClientMessage/PublicVeoSource. Keep
// secrets, provider payloads, and document internals out of every type here.

export type VeoSourceKind = "action" | "comment";

export type ChatClientMessage = {
  role: "user" | "assistant";
  content: string;
};

// Public-safe source chip: deliberately omits UUIDs, storage paths, author
// emails, and raw document content.
export type PublicVeoSource = {
  kind: VeoSourceKind;
  label: string;
  context: string;
};

export type RetrievedVeoDocument = {
  id: string;
  sourceKind: VeoSourceKind;
  sourceId: string;
  trackId: string | null;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
};

export type ActionDocumentMetadata = {
  title: string;
  eventDate: string;
  status: string;
};

export type CommentDocumentMetadata = {
  trackTitle: string;
  versionNum: number;
  timestampMarker: number;
  isResolved: boolean;
};

export type IndexRefreshResult =
  | { state: "current"; indexed: number }
  | { state: "pending"; indexed: number }
  | { state: "unavailable"; indexed: number };

export type VeoAiChatSuccessResponse = {
  answer: string;
  sources: PublicVeoSource[];
};

export type VeoAiChatErrorResponse = {
  error: string;
};

export type VeoAiAnswerResult =
  | { ok: true; answer: string; sources: PublicVeoSource[] }
  | { ok: false; status: 401 | 429 | 503 | 504; error: string };

import "server-only";

import { createHash } from "crypto";

import type { PostgrestError } from "@supabase/supabase-js";

import { formatPlaybackTime } from "@/lib/audio/format-time";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { OPENAI_EMBEDDING_DIMENSIONS, OPENAI_EMBEDDING_MODEL } from "./env";
import { getOpenAIClient } from "./openai";
import type {
  ActionDocumentMetadata,
  CommentDocumentMetadata,
  IndexRefreshResult,
  VeoSourceKind,
} from "./types";

// veo_documents exists only through the Phase 5 migration; it is intentionally
// absent from database.types.ts while the linked database is unreachable. The
// admin client accesses it through the untyped from(relation) boundary and all
// rows are narrowed through the local interfaces below.
const VEO_DOCUMENTS_TABLE = "veo_documents";
const MAX_EMBED_BATCH = 50;

const INDEX_UNAVAILABLE: IndexRefreshResult = { state: "unavailable", indexed: 0 };

export type ActionDocumentInput = {
  title: string;
  status: string;
  eventDate: string;
  description: string;
};

export type CommentDocumentInput = {
  trackTitle: string;
  versionNum: number;
  timestampMarker: number;
  isResolved: boolean;
  content: string;
};

type VeoSourceDocument = {
  sourceKind: VeoSourceKind;
  sourceId: string;
  trackId: string | null;
  content: string;
  contentHash: string;
  metadata: ActionDocumentMetadata | CommentDocumentMetadata;
};

type ExistingVeoDocument = {
  id: string;
  source_kind: string;
  source_id: string;
  content_hash: string;
};

type ActionSourceRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  event_date: string;
};

type CommentJoinRow = {
  id: string;
  content: string;
  timestamp_marker: number;
  is_resolved: boolean;
  track_versions:
    | {
        version_num: number;
        track_id: string;
        tracks: { title: string } | { title: string }[] | null;
      }
    | {
        version_num: number;
        track_id: string;
        tracks: { title: string } | { title: string }[] | null;
      }[]
    | null;
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function toPgVector(embedding: number[]): string {
  if (
    !Array.isArray(embedding) ||
    embedding.length !== OPENAI_EMBEDDING_DIMENSIONS ||
    !embedding.every((component) => Number.isFinite(component))
  ) {
    throw new Error("Invalid VEO embedding vector.");
  }
  return JSON.stringify(embedding);
}

export function buildActionDocument(action: ActionDocumentInput): string {
  const title = normalizeWhitespace(action.title);
  const status = normalizeWhitespace(action.status);
  const eventDate = normalizeWhitespace(action.eventDate);
  const description = normalizeWhitespace(action.description) || "None";
  return `Action: ${title}\nStatus: ${status}\nEvent date: ${eventDate}\nDescription: ${description}`;
}

export function buildCommentDocument(comment: CommentDocumentInput): string {
  const trackTitle = normalizeWhitespace(comment.trackTitle);
  const marker = formatPlaybackTime(comment.timestampMarker);
  const resolved = comment.isResolved ? "yes" : "no";
  const content = normalizeWhitespace(comment.content);
  return `Comment on ${trackTitle}, version ${comment.versionNum} at ${marker}\nResolved: ${resolved}\n${content}`;
}

function compareSourceDocuments(
  a: Pick<VeoSourceDocument, "sourceKind" | "sourceId">,
  b: Pick<VeoSourceDocument, "sourceKind" | "sourceId">,
): number {
  if (a.sourceKind !== b.sourceKind) {
    return a.sourceKind < b.sourceKind ? -1 : 1;
  }
  if (a.sourceId === b.sourceId) return 0;
  return a.sourceId < b.sourceId ? -1 : 1;
}

function sourceKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}

function isExistingVeoDocument(row: unknown): row is ExistingVeoDocument {
  if (typeof row !== "object" || row === null) return false;
  const candidate = row as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.source_kind === "string" &&
    typeof candidate.source_id === "string" &&
    typeof candidate.content_hash === "string"
  );
}

export async function refreshVeoIndex(): Promise<IndexRefreshResult> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return INDEX_UNAVAILABLE;
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return INDEX_UNAVAILABLE;
    }

    const [actionsResult, commentsResult] = await Promise.all([
      supabase
        .from("actions")
        .select("id,title,description,status,event_date"),
      supabase
        .from("comments")
        .select(
          "id,content,timestamp_marker,is_resolved,track_versions!comments_version_id_fkey(version_num,track_id,tracks!track_versions_track_id_fkey(title))",
        ),
    ]);

    if (actionsResult.error || commentsResult.error) {
      return INDEX_UNAVAILABLE;
    }

    const sources: VeoSourceDocument[] = [];

    for (const row of (actionsResult.data ?? []) as ActionSourceRow[]) {
      const input: ActionDocumentInput = {
        title: row.title,
        status: row.status,
        eventDate: row.event_date,
        description: row.description,
      };
      const content = buildActionDocument(input);
      const metadata: ActionDocumentMetadata = {
        title: normalizeWhitespace(row.title),
        eventDate: row.event_date,
        status: row.status,
      };
      sources.push({
        sourceKind: "action",
        sourceId: row.id,
        trackId: null,
        content,
        contentHash: sha256Text(content),
        metadata,
      });
    }

    for (const row of (commentsResult.data ?? []) as unknown as CommentJoinRow[]) {
      const version = one(row.track_versions);
      const track = one(version?.tracks);
      // A comment whose version/track is not RLS-visible is not an authorized
      // source; excluding it lets stale cleanup remove any older document.
      if (!version || !track) continue;
      const input: CommentDocumentInput = {
        trackTitle: track.title,
        versionNum: version.version_num,
        timestampMarker: row.timestamp_marker,
        isResolved: row.is_resolved,
        content: row.content,
      };
      const content = buildCommentDocument(input);
      const metadata: CommentDocumentMetadata = {
        trackTitle: normalizeWhitespace(track.title),
        versionNum: version.version_num,
        timestampMarker: row.timestamp_marker,
        isResolved: row.is_resolved,
      };
      sources.push({
        sourceKind: "comment",
        sourceId: row.id,
        trackId: version.track_id,
        content,
        contentHash: sha256Text(content),
        metadata,
      });
    }

    const admin = createAdminClient();
    const existingResult = (await admin
      .from(VEO_DOCUMENTS_TABLE as never)
      .select("id,source_kind,source_id,content_hash")) as {
      data: unknown;
      error: PostgrestError | null;
    };

    if (existingResult.error) {
      return INDEX_UNAVAILABLE;
    }

    const existing = new Map<string, ExistingVeoDocument>();
    const existingRows = Array.isArray(existingResult.data)
      ? existingResult.data
      : [];
    for (const row of existingRows) {
      if (isExistingVeoDocument(row)) {
        existing.set(sourceKey(row.source_kind, row.source_id), row);
      }
    }

    const sourceKeys = new Set(
      sources.map((source) => sourceKey(source.sourceKind, source.sourceId)),
    );
    const staleIds = Array.from(existing.values())
      .filter(
        (document) =>
          !sourceKeys.has(sourceKey(document.source_kind, document.source_id)),
      )
      .map((document) => document.id);

    if (staleIds.length > 0) {
      const { error: deleteError } = await admin
        .from(VEO_DOCUMENTS_TABLE as never)
        .delete()
        .in("id", staleIds);
      if (deleteError) {
        return INDEX_UNAVAILABLE;
      }
    }

    const changed = sources
      .filter(
        (source) =>
          existing.get(sourceKey(source.sourceKind, source.sourceId))
            ?.content_hash !== source.contentHash,
      )
      .sort(compareSourceDocuments);
    const selected = changed.slice(0, MAX_EMBED_BATCH);

    let indexed = 0;
    if (selected.length > 0) {
      const embeddingResponse = await getOpenAIClient().embeddings.create(
        {
          model: OPENAI_EMBEDDING_MODEL,
          dimensions: OPENAI_EMBEDDING_DIMENSIONS,
          input: selected.map((document) => document.content),
        },
        { timeout: 20_000, maxRetries: 0 },
      );

      if (embeddingResponse.data.length !== selected.length) {
        return INDEX_UNAVAILABLE;
      }

      const vectors = embeddingResponse.data.map((entry) =>
        toPgVector(entry.embedding),
      );
      const updatedAt = new Date().toISOString();
      const rows = selected.map((document, index) => ({
        source_kind: document.sourceKind,
        source_id: document.sourceId,
        track_id: document.trackId,
        content: document.content,
        content_hash: document.contentHash,
        embedding: vectors[index],
        metadata: document.metadata,
        updated_at: updatedAt,
      }));

      const { error: upsertError } = await admin
        .from(VEO_DOCUMENTS_TABLE as never)
        .upsert(rows as never, { onConflict: "source_kind,source_id" });
      if (upsertError) {
        return INDEX_UNAVAILABLE;
      }
      indexed = selected.length;
    }

    // Fail-closed: chat may only answer when no changed source remains.
    const remaining = changed.length - selected.length;
    return remaining > 0
      ? { state: "pending", indexed }
      : { state: "current", indexed };
  } catch {
    return INDEX_UNAVAILABLE;
  }
}

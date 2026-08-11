# VEO OS Phase 5: External Listening & VEO AI Design

**Status:** Approved for implementation after Phases 3 and 4 are integrated.

## Purpose and Scope

Phase 5 completes VEO OS with revocable external listening links and a private, source-grounded VEO AI assistant. External listeners receive only short-lived access to approved Supabase playback objects; authenticated dashboard users manage links through existing Phase 3 track authorization. VEO AI retrieves only authorized actions and comments through pgvector and calls OpenAI only on the server.

Included:

- Expiring, revocable links for ready Supabase `playback` versions.
- A public, no-dashboard listening room with a guest-name watermark and independent player.
- Incremental embeddings of authorized actions and comments, exact cosine retrieval, durable rate limiting, and a source-grounded VEO AI chat route.
- Completed VEO AI navigation and honest dashboard summaries.

Excluded:

- Public comments, uploads, search, or unauthenticated dashboard access.
- Permanent public storage objects or URLs.
- Guest authentication, DRM, analytics, external resources, client-side OpenAI, or autonomous AI actions.

## Supabase Administrative Boundary

Create `src/lib/supabase/admin.ts` with `import "server-only"`. It is the narrowly scoped service-role boundary for public token resolution, five-minute signed URL issuance, and server-only index writes. `src/lib/listening/tokens.ts` and `src/lib/listening/service.ts` must also begin with `import "server-only"`.

Required server-only environment variable:

- `SUPABASE_SERVICE_ROLE_KEY`

Rules:

- Never use a `NEXT_PUBLIC_*` name for the service-role key.
- No Client Component, dashboard page, browser helper, or public DTO imports the admin client.
- Authenticated dashboard reads/mutations use request-scoped `createClient()` and Phase 3 RLS/RPC boundaries.
- The admin path manually validates every public-link condition and returns generic unavailable results for every invalid state.
- Do not log environment values, raw tokens, token hashes, signed URLs, provider payloads, prompts, completions, retrieved content, or application errors containing them.

## Listening-Link Data and Internal Authorization

Create enum `public.listening_link_status`: `active`, `revoked`, `expired`.

Create `public.listening_links` with:

- `id uuid primary key default gen_random_uuid()`
- `track_id uuid not null references public.tracks(id) on delete cascade`
- `version_id uuid not null references public.track_versions(id) on delete cascade`
- `token_hash text not null unique` (lowercase 64-character SHA-256 hexadecimal digest)
- `label text`
- `expires_at timestamptz not null`
- `revoked_at timestamptz`
- `created_by uuid not null references public.users(id)`
- `created_at timestamptz not null default now()`
- `last_accessed_at timestamptz`
- `access_count bigint not null default 0`

Expiry must be after creation. A relationship trigger and the authoritative create RPC make mismatched track/version IDs impossible.

`token_hash` is never available to authenticated dashboard reads. Enable RLS but create **no direct authenticated `SELECT` policy** on `listening_links`, and grant anonymous users no direct table access. Instead, `list_listening_link_summaries(p_track_id uuid)` is a `SECURITY DEFINER` function with `SET search_path = public, pg_temp`; it rejects a null `auth.uid()`, requires `public.can_manage_track(p_track_id)`, returns only safe summary fields, and never selects or returns `token_hash`.

`create_listening_link(...)` and `revoke_listening_link(...)` are `SECURITY DEFINER`, use the same fixed search path, reject null authentication, use `public.can_manage_track(...)` consistently, revoke `PUBLIC` execution, and grant execution only to `authenticated`.

The authoritative create RPC must verify that the selected `track_versions` record:

- belongs to `p_track_id`,
- has `status = 'ready'`,
- has `storage_provider = 'supabase'`,
- has `storage_bucket = 'playback'`, and
- has a safe private object key (nonempty; no leading slash, `..`, backslash, `://`, or control characters).

The revoke RPC returns the updated safe `ListeningLinkSummary`, including revoked state, rather than `void`.

Create a separate privileged `record_listening_link_access(p_link_id uuid)` function. It is `SECURITY DEFINER` with the fixed search path, does not accept a caller-controlled telemetry count, atomically executes `access_count = access_count + 1` and `last_accessed_at = now()`, returns no sensitive data, and is awaited after every successful session or refresh issuance. Revoke its execution from `PUBLIC`, `anon`, and `authenticated`; grant execution only to `service_role` for the admin-client invocation.

## Token Lifecycle

Creation:

1. An authenticated user authorized by `can_manage_track` selects a ready Supabase playback version and expiry.
2. Server-only code creates exactly 32 random bytes encoded as unpadded base64url: `randomBytes(32).toString("base64url")`.
3. Server-only code persists only `createHash("sha256").update(rawToken).digest("hex")`.
4. The successful create mutation returns the raw token once; the browser may construct and copy the requested share URL.
5. Later summaries, reloads, revocations, and management pages cannot retrieve it.

The raw token format is exactly `/^[A-Za-z0-9_-]{43}$/`.

The sole creation-time exception is the immediate one-time create-action handoff to the user, which is cleared after share-URL copy. After that handoff, the raw token is allowed only as input in these places:

- the `/listen/[token]` route parameter,
- the `POST /api/listen/session` request body, and
- the `POST /api/listen/refresh` request body.

It is forbidden from every session/refresh or later management response, persistence layer, client storage, application/server log, analytics payload, error message, unrelated request, internal link list, or DTO. Deployments must redact `/listen/*` request targets from reverse-proxy/CDN/application access logs because the path contains the token.

Revocation prevents new session or refresh URL issuance immediately. Already-issued URLs naturally expire after five minutes.

## Internal Listening-Link Management

Add a listening section to `/studio/[trackId]`:

- Create form with ready playback version, label, and explicit expiry.
- One-time copied share URL immediately after creation.
- Safe active/revoked/expired summary list.
- Explicit revoke confirmation.
- Access count and last-accessed time.
- No raw token, digest, storage locator, bucket, provider, or UUID in UI output.

Only ready `supabase`/`playback` versions with safe private keys are selectable. R2 source objects must first have a registered ready Supabase playback derivative.

## Public Listening Route and Session Flow

Create `src/app/listen/[token]/page.tsx` outside `(dashboard)` with dynamic uncached rendering:

```ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};
```

`next.config.mjs` must apply these document headers to `/listen/:path*`:

- `Cache-Control: private, no-store, max-age=0`
- `Referrer-Policy: no-referrer`
- `X-Robots-Tag: noindex, nofollow, noarchive`

The public page validates token availability and renders only public-safe display metadata. It **does not** embed, render, preload, sign, or receive a signed URL. Invalid, expired, revoked, missing, and incompatible-storage states render one indistinguishable unavailable state.

The route contains no dashboard shell/navigation, persistent `GlobalPlayer`, team/profile/comment data, database IDs, analytics, remote images/fonts/scripts, or third-party resources. Only same-origin application assets and, after session creation, the authorized Supabase media request are permitted.

### Guest session endpoint

Create `POST /api/listen/session`. The client calls it only after a valid guest name is submitted. It receives the raw route token as request input, fully revalidates token hash, expiry, revocation, track/version relation, ready status, Supabase provider, `playback` bucket, and safe private key, then returns only:

```ts
type PublicListeningSession = {
  trackTitle: string;
  versionLabel: string;
  artworkUrl: null;
  playbackUrl: string;
  expiresAt: string;
};
```

`playbackUrl` is a fresh five-minute signed URL. The endpoint awaits atomic access telemetry after successful signing. The delayed guest-name submission cannot attach a page-time stale media URL because no URL exists on the page.

The server-only session operation has this exact result contract:

```ts
type PublicListeningSessionResult =
  | { state: "ready"; session: PublicListeningSession }
  | { state: "unavailable" }
  | { state: "temporarily_unavailable" };
```

### Refresh endpoint

Create `POST /api/listen/refresh`. It takes the raw token only as request input and repeats the complete validation/signing sequence. Its server-only operation result is:

```ts
type PublicListeningRefreshResult =
  | { state: "ready"; refresh: { playbackUrl: string; expiresAt: string } }
  | { state: "unavailable" }
  | { state: "temporarily_unavailable" };
```

A ready refresh returns only `{ playbackUrl: string; expiresAt: string }` with a fresh five-minute URL and awaits the atomic telemetry RPC after issuance.

Both JSON endpoints set:

- `Cache-Control: no-store`
- `Referrer-Policy: no-referrer`
- `X-Robots-Tag: noindex, nofollow, noarchive`

Route handlers map `{ state: "unavailable" }` to the generic HTTP 410 unavailable response and `{ state: "temporarily_unavailable" }` to stable HTTP 503 playback-temporary response; neither exposes provider/configuration/telemetry details. Only the `ready` state produces session or refresh media metadata.

## Guest Watermark and Independent Player

Guest display names are trimmed 2–60-character client-memory values. They are not authentication and are rendered only as React text, never with `dangerouslySetInnerHTML`.

After session success, render repeated low-contrast guest-name watermarks with bounded locally derived layout, `pointer-events: none`, `aria-hidden="true"`, and reduced-motion-disabled ambient drift. This is an attribution deterrent, not DRM.

The public player:

- owns one local `HTMLAudioElement` and imports neither `useAudioStore` nor the internal audio command bus;
- makes no media/session/refresh request before a valid guest-name submission;
- provides keyboard-accessible play/pause, seek, elapsed/duration, and volume controls;
- uses a request-generation counter so stale session/refresh responses cannot overwrite newer state;
- preserves position, volume, and intended playing state during refresh;
- pauses and enters the generic unavailable state on revoked/expired refresh failure;
- offers one transient refresh retry; and
- clears timers, increments the generation, pauses, removes `src`, and calls `load()` on unmount.

## Vector Data Model and Retrieval

Enable the `vector` extension. Create enum `veo_document_kind`: `action`, `comment`.

Create `public.veo_documents` with `source_kind`, `source_id`, optional `track_id`, normalized `content`, SHA-256 `content_hash`, `embedding vector(1536)`, metadata JSONB, timestamps, and unique `(source_kind, source_id)`.

Create exactly:

```sql
create index veo_documents_embedding_cosine_hnsw_idx
  on public.veo_documents using hnsw (embedding vector_cosine_ops);
```

Deny direct client table access. Server-only indexing writes through the admin client after request-scoped authentication.

`match_veo_documents(query_embedding vector(1536), match_count int)` is `SECURITY DEFINER` with `SET search_path = public, pg_temp`, null-auth rejection, `PUBLIC` execution revoked, and `authenticated` execution granted. It clamps count to `1..8`, filters authorized extant action/comment sources, orders by `d.embedding <=> query_embedding`, returns at most eight rows, and reports similarity as `1 - (d.embedding <=> query_embedding)`.

Index only actions (title, description, event date, status) and comments (track title, version, timestamp marker, resolution, content). Never index raw files/audio, tokens, guest names, emails, cookies, provider payloads, environment values, or signed URLs.

## Incremental OpenAI Embeddings

Use the server-only official OpenAI client with fixed `text-embedding-3-small`, `dimensions: 1536`, finite 20-second timeout, and no retries. Build deterministic normalized source text, SHA-256 each document, choose at most 50 missing/changed sources in deterministic order, embed, upsert with the admin client, and remove stale/inaccessible rows where applicable.

Index lazily before retrieval and after relevant mutations when practical. Return an explicit `current | pending | unavailable` result. If refresh is pending or unavailable, VEO AI fails closed rather than representing partial/stale context as current.

`OPENAI_API_KEY` is server-only. `OPENAI_CHAT_MODEL` may only be `gpt-4.1-mini`, `gpt-4.1`, or `gpt-4o-mini`; otherwise use `gpt-4.1-mini`. Browser code never imports OpenAI or uses `dangerouslyAllowBrowser`.

## VEO AI Chat and Durable Rate Limit

`POST /api/veo-ai/chat` accepts at most 20 strict client messages, each `{ role: "user" | "assistant"; content: string }`; content is 1–4,000 characters, aggregate content is at most 24,000 characters, and the final role must be `user`. Reject client `system`, `developer`, tool, and unknown roles. The server owns all system instructions and source context.

Flow: authenticate with request-scoped Supabase client; consume rate limit; refresh index; embed latest user question; retrieve up to eight authorized sources; build server system instructions; request a non-streaming completion; return text answer and public-safe source labels. The model may reason over supplied sources but cannot claim to execute actions, status changes, uploads, revocations, or unprovided-data inspection.

Create `public.veo_ai_requests` and `consume_veo_ai_request()`. The security-definer function has fixed search path, rejects null `auth.uid()`, accepts no user ID, acquires `pg_advisory_xact_lock(hashtext(auth.uid()::text))`, deletes that user’s rows older than one minute, allows at most 10 accepted rolling-minute requests, and inserts only the derived authenticated user. Revoke `PUBLIC` execution and grant `authenticated` only. Rate-limit failures return stable HTTP 429.

## Dashboard and Chat UI

Create protected `/veo-ai` and a local-only `VEO_AI_Chat` component with suggested prompts, local conversation, draft-preserving errors, retry, source chips without UUIDs, plain-text rendering, and no persisted conversations.

When submitting, construct exactly:

```ts
const requestMessages = [...messages, userMessage];
```

Reuse that exact `requestMessages` value for optimistic state, POST body, and retry state. Do not create divergent state/request/retry arrays.

Activate all completed master-plan routes in desktop/mobile navigation. Preserve the internal persistent player across dashboard routes.

Dashboard counts must use:

```ts
type DashboardSummaryResult =
  | { state: "ready"; summary: DashboardSummary }
  | { state: "unavailable" };
```

Never convert data/provider failures into fabricated zero counts. Render a genuine unavailable-data state; zero labels are reserved for successful empty results.

## Validation and Completion

The no-test override prohibits creating, changing, or executing automated-test files/commands. Validate through migration/RLS/security-definer inspection, token lifecycle and access-log redaction inspection, type checking, lint, production build, browser and network review, server/secret import inspection, source-grounding review, scope review, and Git integrity review.

Phase 5 is complete when secure external listening, guest watermarking, independent session/refresh player flow, pgvector retrieval, server-only source-grounded VEO AI, durable rate limiting, active dashboard modules, privacy/security checks, and non-force integration into `main` are complete.
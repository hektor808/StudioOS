# VEO OS Phase 5 External Listening & VEO AI Design

**Status:** Approved under VEO OS full-autopilot authorization on 2026-08-11.

**Authority:** This specification refines `VEO_OS_MASTER_PLAN.md`, `VEO_OS_DESIGN_MANIFESTO.md`, and the approved provider-aware storage architecture. The user's no-test override remains active.

## Objective

Complete VEO OS with revocable external listening links and a private, team-scoped VEO AI assistant. External listeners receive only expiring access to approved Supabase-hosted playback assets. VEO AI retrieves authorized actions and comments through pgvector and answers through a server-only OpenAI boundary.

## Scope

Phase 5 includes:

- Listening-link schema, lifecycle, token hashing, revocation, and expiration.
- A public `/listen/[token]` route outside the dashboard route group.
- Guest-name entry, CSS watermarking, and an independent secure player.
- Supabase Storage signed playback/listening URLs.
- `pgvector`, embedding records, retrieval SQL, and incremental indexing.
- An authenticated `/veo-ai` module and `VEO_AI_Chat` client interface.
- Server-only OpenAI orchestration, team-scoped retrieval, source references, and durable rate limiting.
- Final dashboard navigation and honest module completion states.

Phase 5 does not include:

- Public search indexing of listening pages.
- Anonymous upload or comment access.
- A general-purpose autonomous agent or tool execution.
- Cross-tenant retrieval.
- Browser access to OpenAI, Supabase service-role, or provider credentials.

## Supabase Administrative Boundary

External token resolution and signed URL issuance require a narrowly isolated server-only administrative client.

Create `src/lib/supabase/admin.ts` with `import "server-only"`.

Required server-only environment variable:

- `SUPABASE_SERVICE_ROLE_KEY`

Rules:

- The module is imported only from server route handlers and server-only library modules.
- The service-role key never uses a `NEXT_PUBLIC_*` prefix.
- No admin client is imported by Client Components.
- Admin queries are narrowly scoped and manually enforce the listening-link contract.
- Authenticated internal operations continue to use request-scoped clients and RLS.
- Environment values, tokens, signed URLs, provider payloads, and OpenAI content are not logged.

## Listening-Link Data Model

Create enum `listening_link_status`: `active`, `revoked`, `expired`.

### `public.listening_links`

- `id uuid primary key default gen_random_uuid()`
- `track_id uuid not null references public.tracks(id) on delete cascade`
- `version_id uuid not null references public.track_versions(id) on delete cascade`
- `token_hash text not null unique`
- `label text`
- `expires_at timestamptz not null`
- `revoked_at timestamptz`
- `created_by uuid not null references public.users(id)`
- `created_at timestamptz not null default now()`
- `last_accessed_at timestamptz`
- `access_count bigint not null default 0`

Constraints:

- Expiry must be after creation.
- The selected version must belong to the selected track; enforce through an authorized creation function or validation plus a database trigger.
- Raw tokens are never stored.

RLS:

- Authenticated users may read links for accessible tracks.
- Track creators and admins may create/revoke links.
- Anonymous users receive no direct table access.

## Listening Token Lifecycle

Creation:

1. An authenticated track owner/admin selects a playback-ready Supabase version and expiry duration.
2. Server code generates 32 cryptographically random bytes and encodes them base64url without padding.
3. Store only `SHA-256(rawToken)` as lowercase hexadecimal.
4. Return the raw token once in the generated share URL.
5. The UI states that the token cannot be shown again and can be replaced by creating a new link.

Resolution:

1. Normalize and length-check the route token.
2. Hash it with SHA-256 on the server.
3. Look up one non-revoked, unexpired record by hash through the admin boundary.
4. Verify the version is ready, belongs to the track, uses the approved Supabase listening/playback bucket, and has a private object path.
5. Issue a five-minute Supabase signed URL.
6. Increment access telemetry without blocking the response.

Revocation immediately prevents new signed URL issuance. Already issued URLs expire naturally within five minutes.

## Internal Listening-Link Management

Add a listening section to `/studio/[trackId]`:

- Create link form with version, label, and explicit expiry.
- Copy share URL after creation.
- Active/revoked/expired link list.
- Revoke control with explicit confirmation.
- Access count and last-accessed metadata.
- No raw token is retrievable after the creation response.

Only playback-ready Supabase assets may be published. R2 source assets must first have a playback-ready Supabase derivative registered as a version.

## Public Route

Create `src/app/listen/[token]/page.tsx` outside `(dashboard)`.

Route behavior:

- `robots: { index: false, follow: false, nocache: true }` metadata.
- Configure route headers for `/listen/:path*` in `next.config.mjs`: `Cache-Control: private, no-store, max-age=0`, `Referrer-Policy: no-referrer`, and `X-Robots-Tag: noindex, nofollow, noarchive`.
- No dashboard shell, internal navigation, persistent `GlobalPlayer`, team profile data, comments, or database identifiers are rendered.
- Initial server resolution returns only public-safe track/version display data and a short-lived URL.
- Invalid, revoked, or expired links render one indistinguishable unavailable state.
- Use dynamic rendering and no shared caching of token resolution.
- Load no third-party scripts, images, fonts, analytics, or other subresources on the listening route; only same-origin application assets and the authorized Supabase media URL are allowed.

## Guest Session and Watermark

Before playback, require a guest display name:

- Trimmed length: 2–60 characters.
- Stored only in the page's in-memory client state for this listening session.
- Never treated as authentication.
- Never inserted into HTML through `dangerouslySetInnerHTML`.

After entry, render repeated low-contrast CSS watermark text containing the guest name. The watermark:

- Is visible over artwork and player surfaces.
- Uses randomized-but-bounded layout derived locally per session.
- Has `pointer-events: none` and is hidden from assistive technology.
- Does not claim DRM or prevent capture; it is a deterrent and attribution cue.

## External Player

Create a separate public listening player component. It must not import or mutate `useAudioStore` and must not communicate with the internal audio command bus.

Responsibilities:

- Own one local `HTMLAudioElement`.
- Play/pause, seek, elapsed/duration display, volume, and keyboard-accessible controls.
- Refresh the signed URL before expiry while preserving position and intended playback state.
- Reject stale refresh responses through a request generation counter.
- Pause and show a generic link-unavailable state if refresh proves the link was revoked or expired.
- Avoid media requests before the guest submits a valid display name.
- Clean up timers and media state on unmount.

## Refresh API

Create `POST /api/listen/refresh`.

Input:

- Raw route token.

Output:

- `playbackUrl: string`
- `expiresAt: string`

The endpoint repeats full token, expiry, revocation, relationship, provider, and version-status validation. It does not trust data from the initial page render.

Apply response headers appropriate for sensitive token-derived responses:

- `Cache-Control: no-store`
- `Referrer-Policy: no-referrer`
- `X-Robots-Tag: noindex, nofollow, noarchive`

## Vector Data Model

Enable the `vector` extension.

Create enum `veo_document_kind`: `action`, `comment`.

### `public.veo_documents`

- `id uuid primary key default gen_random_uuid()`
- `source_kind veo_document_kind not null`
- `source_id uuid not null`
- `track_id uuid references public.tracks(id) on delete cascade`
- `content text not null`
- `content_hash text not null`
- `embedding vector(1536) not null`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- Unique constraint: `(source_kind, source_id)`.

Create the cosine index explicitly with `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)`. Retrieval orders by `embedding <=> query_embedding` so the index operator class and distance operator match.

RLS:

- Authenticated users may read documents only through the authorized retrieval function.
- Direct client insert/update/delete is denied.
- Server-side indexing uses the admin client after authenticating the calling user through the request-scoped client.

## Source Material

Index only authorized operational knowledge:

- Actions: title, description, event date, and status.
- Comments: track title, version number, timestamp marker, resolution state, and comment content.

Do not index:

- Raw file contents or audio.
- Listening tokens or guest names.
- User email addresses, cookies, provider payloads, environment values, or signed URLs.

## Incremental Embedding Lifecycle

Use OpenAI `text-embedding-3-small` with 1,536 dimensions.

Create `src/lib/ai/indexing.ts`:

1. Authenticate the requesting dashboard user with the request-scoped Supabase client.
2. Fetch accessible actions/comments changed since their stored `content_hash`.
3. Build deterministic normalized source text.
4. Compute SHA-256 content hashes.
5. Batch only missing or changed records, capped at 50 documents per request.
6. Request embeddings through the server-only OpenAI client.
7. Upsert through the admin client.
8. Remove stale documents whose source was deleted or became inaccessible where applicable.

Index lazily before retrieval and after relevant successful mutations when practical. If indexing fails, chat reports that current knowledge could not be refreshed; it must not answer from silently incomplete context as if it were current.

## Retrieval Function

Create `public.match_veo_documents(query_embedding vector(1536), match_count int)` as a security-definer function with a fixed search path.

The function:

- Requires `auth.uid()` to be non-null.
- Clamps `match_count` to the inclusive range `1..8` and returns at most eight authorized documents.
- Filters source rows through the same access model as the underlying actions/comments.
- Returns `id`, `source_kind`, `source_id`, `track_id`, `content`, `metadata`, and cosine similarity.
- Does not accept arbitrary SQL filters from the client.

Because the current product has one shared authenticated team, source authorization maps to the existing RLS-visible records. The function boundary remains compatible with future team identifiers without exposing cross-team data.

## OpenAI Boundary

Create `src/lib/ai/env.ts` and `src/lib/ai/openai.ts`, both server-only.

Required environment variable:

- `OPENAI_API_KEY`

Rules:

- Use the installed official `openai` package.
- Read `OPENAI_CHAT_MODEL`, validate it against the supported allowlist `gpt-4.1-mini`, `gpt-4.1`, and `gpt-4o-mini`, and default to `gpt-4.1-mini`.
- Embedding model is fixed to `text-embedding-3-small` for schema compatibility.
- Browser code never imports the OpenAI client.
- Do not log prompts, completions, retrieved context, keys, or provider payloads.
- Apply finite timeouts and stable user-facing errors.

LangChain may be used only if it reduces code and preserves the server/security boundary. Direct OpenAI SDK orchestration is preferred for this bounded RAG flow.

## Chat API

Create `POST /api/veo-ai/chat`.

Input:

- `messages`: up to 20 messages whose role is only `user` or `assistant`.
- Each message content: 1–4,000 characters.
- Aggregate message content: at most 24,000 characters.
- The final message must have role `user`.
- Client-provided `system`, `developer`, tool, or unknown roles are rejected. All privileged instructions are constructed exclusively on the server.

Flow:

1. Authenticate with the request-scoped Supabase client.
2. Enforce the durable rate limit.
3. Refresh changed embeddings within the bounded indexing budget.
4. Embed the latest user question.
5. Retrieve up to eight authorized documents.
6. Build a concise system instruction that requires source-grounded answers and explicit uncertainty.
7. Request a non-streaming answer for the initial release.
8. Return the answer and public-safe source references.

The model may summarize and reason over retrieved actions/comments. It must not claim to execute actions, change statuses, upload files, revoke links, or inspect unprovided data.

## Durable Rate Limiting

Create `public.veo_ai_requests`:

- `id bigint generated always as identity primary key`
- `user_id uuid not null references public.users(id) on delete cascade`
- `created_at timestamptz not null default now()`

Enable RLS on `veo_ai_requests` with no direct client policies and revoke direct table writes from client roles. Add an index on `(user_id, created_at)`.

A security-definer function atomically permits at most ten chat requests per authenticated user in a rolling minute and inserts the accepted request. It rejects a null `auth.uid()`, derives `user_id` only from `auth.uid()`, accepts no caller-supplied user ID, and uses a fixed search path. Revoke public execution and grant execution only to `authenticated`. Old rows may be pruned opportunistically.

Return HTTP 429 with a stable retry message when limited.

## Database Type Refresh

Regenerate or update `src/types/database.types.ts` after the Phase 5 migration. It must include `listening_links`, `veo_documents`, `veo_ai_requests`, `listening_link_status`, `veo_document_kind`, and the exact typed signatures for listening-link, retrieval, and rate-limit RPCs before application code consumes them.

## VEO AI Interface

Create `src/app/(dashboard)/veo-ai/page.tsx` and `src/components/chat/VEO_AI_Chat.tsx`.

The page includes:

- A clear explanation that answers use VEO actions and track comments.
- Suggested prompts grounded in supported capabilities.
- Conversation thread, composer, sending state, error recovery, and source chips.
- Source labels such as action title or track/version/timestamp, never raw UUIDs.
- An empty state that explains missing source data rather than inventing sample answers.

Client state remains local to the chat component for this release. Conversations are not persisted to the database.

## Final Navigation and Dashboard

- Activate `/veo-ai` in desktop and mobile navigation.
- All master-plan modules become real links.
- Update the dashboard home cards to route to their completed modules and derive honest summaries from authorized data when economical.
- Remove `Coming soon` labels only for implemented modules.
- Preserve the persistent internal player for authenticated dashboard routes.

## Responsive and Visual Direction

- External listening is a focused, distraction-free listening room, not a miniature dashboard.
- Use the established black/light grounds and VEO purple accent.
- Watermarking is visible but does not destroy track metadata readability.
- AI chat uses a narrow readable conversation column with distinct source references and stable composer placement above the player dock.
- All controls are keyboard accessible and expose visible focus.
- Reduced motion disables ambient watermark drift, animated message entrance, and nonessential waveform/player transitions.
- Light and dark themes preserve semantic contrast.

## Error and Empty States

- Invalid/revoked/expired token: one indistinguishable listening-unavailable screen.
- Missing guest name: field guidance without starting media requests.
- URL refresh failure: pause playback and offer one retry; repeat failure returns to unavailable state.
- Missing service-role/OpenAI configuration: only the dependent feature shows a stable configuration state.
- No indexed sources: VEO AI explains which supported VEO records must exist.
- Provider timeout: retain the user's draft and provide retry.
- Retrieval failure: do not ask the model to answer without the intended knowledge context.

## Security Requirements

- Raw listening tokens are returned once, never stored or logged.
- Token comparison uses server-side hash lookup.
- Public listeners have no direct database or storage permissions.
- Signed listening URLs expire after five minutes.
- Service-role and OpenAI keys remain server-only and uncommitted.
- AI retrieval is authenticated and source-authorized.
- Model output is rendered as text/controlled Markdown without unsafe HTML.
- Public token-derived responses use no-store/no-referrer/no-index controls.
- `.env.local` remains ignored and untracked.

## No-Test Validation Gates

The explicit no-test override prohibits creating, modifying, or running test files. Validate with:

- Migration, RLS, security-definer, token lifecycle, and vector policy inspection.
- Secret-boundary and client-bundle inspection.
- `npx tsc --noEmit`.
- `npm run lint`.
- `npm run build`.
- Browser inspection of link creation, guest entry, playback, watermarking, revocation/expiry states, and VEO AI at desktop/mobile widths when non-secret configured services are available.
- Network inspection for no media-before-name, short-lived refresh behavior, no-store headers, and absence of raw storage/provider credentials.
- OpenAI scope and source-grounding review with non-sensitive development records only.
- Final master-plan scope, route, repository, and Git integrity review.

## Completion Criteria

Phase 5 is complete when:

- Secure, expiring, revocable external listening works through a separate public route and player.
- Guest watermarking and signed URL refresh preserve the intended security boundary.
- pgvector indexing and authorized retrieval support VEO AI answers over actions/comments.
- VEO AI is active and source-grounded, with server-only OpenAI access and durable rate limiting.
- All master-plan dashboard modules are implemented and linked.
- TypeScript, lint, build, browser, security, scope, and Git gates pass.
- The phase is committed, integrated into `main`, and pushed without force.

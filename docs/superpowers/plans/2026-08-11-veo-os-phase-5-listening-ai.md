# VEO OS Phase 5 External Listening & VEO AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish VEO OS with revocable, expiring external listening links and a private, source-grounded VEO AI assistant over authorized actions and track comments.

**Architecture:** Phase 5 adds one versioned Supabase migration that keeps public listeners outside direct database and Storage access while narrowly isolating service-role token resolution and five-minute signing in server-only code. Dashboard requests keep using request-scoped Supabase and safe security-definer RPCs: link summaries never expose token hashes, create/revoke use `can_manage_track`, and access telemetry increments atomically. The public page validates availability only; a post-guest session endpoint and refresh endpoint each fully revalidate before issuing a URL. VEO AI calls OpenAI only through a server-only non-streaming route after a bounded, fail-closed embedding refresh.

**Tech Stack:** Next.js 14.2.35 App Router and Route Handlers, React 18, TypeScript 5, Tailwind CSS 3.4, Zod 4, Supabase SSR 0.12, `@supabase/supabase-js` 2.112, PostgreSQL/Supabase Storage/pgvector, OpenAI Node SDK 7.4, Zustand 5, Framer Motion 13, Phosphor Icons.

## Global Constraints

- Execute only after the completed Phase 3 Studio/Waveform and Phase 4 Uploads/Operations/Content changes are integrated; this plan consumes their `Database`, Studio DTO, storage-locator, RLS, and dashboard-shell contracts.
- Do not create, modify, or run automated test files or test commands. Do not invoke `npm test`, Vitest, or a TDD workflow; leave existing automated-test files untouched.
- Keep `.env.local` ignored and untracked. `SUPABASE_SERVICE_ROLE_KEY` and `OPENAI_API_KEY` are server-only variables without a `NEXT_PUBLIC_` prefix; never log them, raw listening tokens, token hashes, signed URLs, provider payloads, prompts, completions, or retrieved content. The sole creation-time exception is the immediate one-time Server Action handoff `CreateListeningLinkResult.rawToken`, which the client uses to display/copy the requested share URL then clears. After that handoff, raw tokens are permitted only as the `/listen/[token]` route input and as `session`/`refresh` request input, and are forbidden from all session/refresh and later management responses, persistence, client storage, application/server logs, and unrelated requests; deployment configuration must redact `/listen/*` request targets from access logs.
- Create `src/lib/supabase/admin.ts`, `src/lib/listening/tokens.ts`, and `src/lib/listening/service.ts` with `import "server-only"`; import the admin boundary only in server-only libraries and Route Handlers. Dashboard mutations and queries continue to use `createClient()` from `src/lib/supabase/server.ts` and Phase 3 RLS/safe RPCs.
- Generate a raw listening token with exactly 32 random bytes encoded as unpadded base64url. Persist only its lowercase SHA-256 hexadecimal digest. Return the raw value only from the successful create mutation and never fetch, render, or log it again.
- Public `/listen/[token]` availability validation is dynamic and uncached and returns no signed URL. Only a valid post-guest `POST /api/listen/session` or refresh request can receive a fresh five-minute Supabase Storage URL for a ready `supabase`/`playback` version with a validated private object key; listeners have neither direct table nor Storage privileges.
- Keep `/listen/[token]` outside `(dashboard)`, without dashboard shell/navigation, `GlobalPlayer`, team/profile data, comments, database IDs, analytics, remote images, remote fonts, or third-party scripts. Only same-origin application assets and the signed Supabase media request are permitted.
- The public player must not import, subscribe to, mutate, or communicate with `useAudioStore` or the internal audio command bus. It owns one local `HTMLAudioElement`, does not request media before a valid guest name, and cleans up media and timers on unmount.
- Guest names are trimmed strings of 2–60 characters stored only in client memory. Render them as React text in an `aria-hidden`/`pointer-events-none` CSS watermark; never use `dangerouslySetInnerHTML` and do not call the watermark DRM.
- Enable `vector`, store 1,536-dimensional `text-embedding-3-small` embeddings, create the explicit HNSW cosine index with `vector_cosine_ops`, and order retrieval with `<=>`. Do not index audio, raw files, listening tokens, guest names, emails, cookies, provider responses, keys, or signed URLs.
- `match_veo_documents` and the chat rate-limit function must be `SECURITY DEFINER`, set `search_path = public, pg_temp`, reject null `auth.uid()`, accept no caller-supplied user ID, revoke `PUBLIC` execution, and grant only `authenticated` execution.
- VEO AI accepts at most 20 client messages with only `user`/`assistant` roles, each 1–4,000 characters and at most 24,000 aggregate characters; the final role must be `user`. Server code alone constructs privileged instructions. The initial release is non-streaming, has no tools, and renders answer text without unsafe HTML.
- Use `OPENAI_CHAT_MODEL` only when it is one of `gpt-4.1-mini`, `gpt-4.1`, or `gpt-4o-mini`; otherwise default to `gpt-4.1-mini`. Configure finite OpenAI timeouts and stable errors. Direct SDK orchestration is required; do not add LangChain.
- Preserve the persistent dashboard player and the established semantic/glass system: black/default-dark and `#FAFAFA` light grounds, selective `#2E008B` accent, Space Grotesk headings/data, Inter UI text, Phosphor icons, visible keyboard focus, responsive 32px desktop/16px mobile safe areas, and reduced-motion fallbacks.
- Every implementation task ends with one commit whose message includes `Co-Authored-By: Claude <noreply@anthropic.com>`. The final task merges into `main` and uses a non-force push.

---

## File Map

### Schema, types, and privileged boundaries

- Create: `supabase/migrations/202608110500_phase_5_listening_ai.sql` — listening-link/vector/rate-limit schema, indexes, RLS, trigger, and hardened RPCs.
- Modify: `src/types/database.types.ts` — Phase 5 table, enum, and exact RPC typings consumed by application code.
- Modify: `package.json` — add the explicit `server-only` runtime boundary package.
- Modify: `package-lock.json` — lock `server-only@0.0.1`.
- Create: `src/lib/supabase/admin.ts` — lazily configured, non-browser service-role client.
- Create: `src/lib/listening/types.ts` — safe dashboard/public listening DTOs.
- Create: `src/lib/listening/tokens.ts` — token generation, strict normalization, SHA-256 digest, and private-key validation.
- Create: `src/lib/listening/validation.ts` — create/revoke/refresh Zod schemas and stable messages.
- Create: `src/lib/listening/service.ts` — RLS-backed dashboard operations plus administrative public resolution/signing.

### Internal and public listening

- Modify: `src/app/(dashboard)/studio/[trackId]/page.tsx` — pass authorized ready Supabase versions and links to the Studio sharing island.
- Create: `src/app/(dashboard)/studio/[trackId]/listening-actions.ts` — typed create/revoke Server Actions that return safe discriminated results.
- Create: `src/components/studio/ListeningLinkManager.tsx` — create/copy/list/revoke UI with local one-time raw-token state.
- Create: `src/app/listen/[token]/page.tsx` — dynamic privacy-safe public listening page.
- Create: `src/app/listen/[token]/PublicListeningRoom.tsx` — guest gate, watermark, isolated player, refresh race handling, and error states.
- Create: `src/app/listen/[token]/public-listening-room.module.css` — watermark geometry/drift/reduced-motion styles scoped to the public room.
- Create: `src/app/api/listen/session/route.ts` — post-guest, full-revalidation session/signing endpoint.
- Create: `src/app/api/listen/refresh/route.ts` — uncached full-revalidation/signing endpoint.
- Modify: `next.config.mjs` — privacy response headers for all `/listen/:path*` pages.

### VEO AI indexing and chat

- Create: `src/lib/ai/env.ts` — server-only OpenAI configuration validation and model allowlist.
- Create: `src/lib/ai/openai.ts` — one server-only OpenAI client with bounded timeout/retry behavior.
- Create: `src/lib/ai/types.ts` — chat, indexing, retrieval, and public-safe source DTOs.
- Create: `src/lib/ai/indexing.ts` — deterministic source normalization, SHA-256 change detection, bounded embedding creation, admin upsert, and stale-document cleanup.
- Create: `src/lib/ai/chat.ts` — authenticated rate limit, fail-closed refresh/retrieval, source-grounded completion, and response mapping.
- Create: `src/app/api/veo-ai/chat/route.ts` — strict request parsing and stable JSON responses.
- Create: `src/app/(dashboard)/veo-ai/page.tsx` — protected server route for the AI module.
- Create: `src/components/chat/VEO_AI_Chat.tsx` — local-only conversation, composer, source chips, recovery, and accessibility.

### Completion navigation/dashboard and validation

- Create: `src/lib/dashboard/queries.ts` — inexpensive RLS-respecting dashboard summary DTO/query.
- Modify: `src/app/(dashboard)/page.tsx` — fetch the authorized dashboard summary.
- Modify: `src/components/dashboard/dashboard-home.tsx` — honest linked module cards and live, authorized summaries.
- Modify: `src/components/dashboard/dashboard-sidebar.tsx` — active links for all completed modules.
- Modify: `src/components/dashboard/mobile-dashboard-header.tsx` — pathname-aware module title including VEO AI.
- Modify: `src/app/globals.css` — only shared chat/dashboard spacing utilities if the component cannot express them with existing utilities.

---

### Task 1: Add the Phase 5 database contract and refresh database types

**Files:**
- Create: `supabase/migrations/202608110500_phase_5_listening_ai.sql`
- Modify: `src/types/database.types.ts`

**Interfaces:**
- Consumes: Phase 3 tables `users`, `tracks`, `track_versions`, `comments`, and `actions`; Phase 3 `public.is_admin()` and `public.can_manage_track(uuid)` access helpers.
- Produces: enums `listening_link_status` and `veo_document_kind`; tables `listening_links`, `veo_documents`, and `veo_ai_requests`.
- Produces RPCs: `list_listening_link_summaries(p_track_id uuid)`, `create_listening_link(p_track_id uuid, p_version_id uuid, p_token_hash text, p_label text, p_expires_at timestamptz)`, `revoke_listening_link(p_link_id uuid)`, `record_listening_link_access(p_link_id uuid)`, `match_veo_documents(query_embedding vector(1536), match_count integer)`, and `consume_veo_ai_request()`.
- Produces TypeScript-safe RPC parameter shapes: `{ p_track_id: string }`, `{ p_track_id: string; p_version_id: string; p_token_hash: string; p_label: string | null; p_expires_at: string }`, `{ p_link_id: string }`, `{ query_embedding: string; match_count: number }`, and `Record<string, never>`.

- [ ] **Step 1: Create the listening-link schema, relationship trigger, indexes, and RLS**

Create `supabase/migrations/202608110500_phase_5_listening_ai.sql`. Enable `vector` alongside the existing `pgcrypto`, then define the listening enum/table and a trigger that makes a mismatched track/version impossible:

```sql
create type public.listening_link_status as enum ('active', 'revoked', 'expired');

create table public.listening_links (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  version_id uuid not null references public.track_versions(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  label text check (label is null or char_length(btrim(label)) between 1 and 120),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid not null references public.users(id),
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz,
  access_count bigint not null default 0 check (access_count >= 0),
  constraint listening_links_expiry_after_creation check (expires_at > created_at)
);

create function public.enforce_listening_link_version_track()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1 from public.track_versions
    where id = new.version_id and track_id = new.track_id
  ) then
    raise exception 'Listening version does not belong to track.';
  end if;
  return new;
end;
$$;

create trigger listening_links_validate_version_track
before insert or update of track_id, version_id on public.listening_links
for each row execute function public.enforce_listening_link_version_track();

create index listening_links_track_id_created_at_idx
  on public.listening_links (track_id, created_at desc);
create index listening_links_active_expiry_idx
  on public.listening_links (expires_at)
  where revoked_at is null;

alter table public.listening_links enable row level security;
```

Create **no direct `SELECT`, `INSERT`, `UPDATE`, or `DELETE` policy** for authenticated users: the physical table includes `token_hash`. Revoke direct privileges from `anon` and `authenticated`; internal list/create/revoke work only through hardened safe RPCs:

```sql
revoke all on public.listening_links from anon, authenticated;
```

- [ ] **Step 2: Add no-hash summaries, authoritative management, and atomic telemetry functions**

In the same migration, create safe management functions. Every `SECURITY DEFINER` function fixes `search_path = public, pg_temp`, rejects a null caller where relevant, and returns no `token_hash`.

```sql
create function public.list_listening_link_summaries(p_track_id uuid)
returns table (
  id uuid, version_id uuid, version_label text, label text,
  expires_at timestamptz, revoked_at timestamptz, created_at timestamptz,
  last_accessed_at timestamptz, access_count bigint
)
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.can_manage_track(p_track_id) then
    raise exception 'Listening link unavailable.';
  end if;
  return query
  select l.id, l.version_id, concat('Version ', v.version_num), l.label,
    l.expires_at, l.revoked_at, l.created_at, l.last_accessed_at, l.access_count
  from public.listening_links l
  join public.track_versions v on v.id = l.version_id
  where l.track_id = p_track_id
  order by l.created_at desc;
end;
$$;

create function public.create_listening_link(
  p_track_id uuid, p_version_id uuid, p_token_hash text,
  p_label text, p_expires_at timestamptz
)
returns table (
  id uuid, version_id uuid, version_label text, label text,
  expires_at timestamptz, revoked_at timestamptz, created_at timestamptz,
  last_accessed_at timestamptz, access_count bigint
)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare inserted public.listening_links; version_row public.track_versions;
begin
  if auth.uid() is null or not public.can_manage_track(p_track_id) then raise exception 'Listening link unavailable.'; end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_expires_at <= now() then raise exception 'Listening link unavailable.'; end if;
  select * into version_row from public.track_versions
  where id = p_version_id and track_id = p_track_id and status = 'ready'
    and storage_provider = 'supabase' and storage_bucket = 'playback'
    and storage_url <> '' and storage_url !~ '(^/|\\\\|\.\.|://|[[:cntrl:]])';
  if not found then raise exception 'Listening link unavailable.'; end if;
  insert into public.listening_links (track_id, version_id, token_hash, label, expires_at, created_by)
  values (p_track_id, p_version_id, p_token_hash, nullif(btrim(p_label), ''), p_expires_at, auth.uid())
  returning * into inserted;
  return query select inserted.id, inserted.version_id,
    concat('Version ', version_row.version_num), inserted.label, inserted.expires_at,
    inserted.revoked_at, inserted.created_at, inserted.last_accessed_at, inserted.access_count;
end;
$$;

create function public.revoke_listening_link(p_link_id uuid)
returns table (
  id uuid, version_id uuid, version_label text, label text,
  expires_at timestamptz, revoked_at timestamptz, created_at timestamptz,
  last_accessed_at timestamptz, access_count bigint
)
language plpgsql security definer set search_path = public, pg_temp
as $$
declare updated public.listening_links;
begin
  if auth.uid() is null then raise exception 'Listening link unavailable.'; end if;
  update public.listening_links l set revoked_at = now()
  where l.id = p_link_id and l.revoked_at is null and public.can_manage_track(l.track_id)
  returning * into updated;
  if not found then raise exception 'Listening link unavailable.'; end if;
  return query select updated.id, updated.version_id, concat('Version ', v.version_num),
    updated.label, updated.expires_at, updated.revoked_at, updated.created_at,
    updated.last_accessed_at, updated.access_count
  from public.track_versions v where v.id = updated.version_id;
end;
$$;

create function public.record_listening_link_access(p_link_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  update public.listening_links
  set access_count = access_count + 1, last_accessed_at = now()
  where id = p_link_id;
  if not found then raise exception 'Listening link unavailable.'; end if;
end;
$$;

revoke all on function public.list_listening_link_summaries(uuid) from public;
revoke all on function public.create_listening_link(uuid, uuid, text, text, timestamptz) from public;
revoke all on function public.revoke_listening_link(uuid) from public;
revoke all on function public.record_listening_link_access(uuid) from public, anon, authenticated;
grant execute on function public.record_listening_link_access(uuid) to service_role;
grant execute on function public.list_listening_link_summaries(uuid) to authenticated;
grant execute on function public.create_listening_link(uuid, uuid, text, text, timestamptz) to authenticated;
grant execute on function public.revoke_listening_link(uuid) to authenticated;
```

The trigger rejects mismatched IDs in addition to the authoritative create checks. Do not grant any function to `anon`, do not grant direct `listening_links` table reads, and let only the service role call atomic access telemetry.

- [ ] **Step 3: Add vector documents, cosine index, and authorized retrieval RPC**

Add the vector enum/table and exact index:

```sql
create extension if not exists vector;
create type public.veo_document_kind as enum ('action', 'comment');

create table public.veo_documents (
  id uuid primary key default gen_random_uuid(),
  source_kind public.veo_document_kind not null,
  source_id uuid not null,
  track_id uuid references public.tracks(id) on delete cascade,
  content text not null check (char_length(content) > 0),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_kind, source_id)
);
create index veo_documents_embedding_cosine_hnsw_idx
  on public.veo_documents using hnsw (embedding vector_cosine_ops);
create index veo_documents_source_idx on public.veo_documents (source_kind, source_id);
alter table public.veo_documents enable row level security;
```

Create no table policies for `veo_documents`, revoke direct table privileges from `anon` and `authenticated`, and use the server-only admin client for writes. Implement `public.match_veo_documents(query_embedding vector(1536), match_count integer)` as `SECURITY DEFINER SET search_path = public, pg_temp`. It must raise on `auth.uid() is null`, clamp `match_count` with `least(8, greatest(1, match_count))`, join/check that an `action` source still exists or a `comment` source still joins through `track_versions` to `tracks`, order by `d.embedding <=> query_embedding`, and return at most eight rows with this exact shape:

```sql
returns table (
  id uuid, source_kind public.veo_document_kind, source_id uuid,
  track_id uuid, content text, metadata jsonb, similarity double precision
)
```

Compute `similarity` as `1 - (d.embedding <=> query_embedding)`. This product currently has one shared authenticated team, so require the non-null authenticated caller and mirror Phase 3's RLS-visible source existence model; retain the `track_id` field for a future team predicate. Revoke `PUBLIC` execution and grant `authenticated` only.

- [ ] **Step 4: Add durable rolling rate limiting**

Create `public.veo_ai_requests` and its index:

```sql
create table public.veo_ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index veo_ai_requests_user_created_at_idx
  on public.veo_ai_requests (user_id, created_at desc);
alter table public.veo_ai_requests enable row level security;
revoke all on public.veo_ai_requests from anon, authenticated;
```

Implement `public.consume_veo_ai_request() returns boolean` as a `SECURITY DEFINER` PL/pgSQL function. It must reject null `auth.uid()`, acquire `pg_advisory_xact_lock(hashtext(auth.uid()::text))`, delete that caller's rows older than `now() - interval '1 minute'`, return `false` when ten remaining rows exist, otherwise insert the `auth.uid()` value and return `true`. It accepts no parameters, uses `SET search_path = public, pg_temp`, revokes `PUBLIC` execution, and grants `authenticated` execution.

- [ ] **Step 5: Apply/inspect the migration and update generated-style types before code consumes them**

From the linked Supabase project directory, apply this migration with the Supabase CLI before editing application code:

```powershell
npx supabase db push
```

Inspect the deployed SQL and verify all of the following:

```sql
select extname from pg_extension where extname = 'vector';
select indexname, indexdef from pg_indexes
where tablename = 'veo_documents' or tablename = 'listening_links';
select routine_name, security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name in ('list_listening_link_summaries', 'create_listening_link', 'revoke_listening_link', 'record_listening_link_access', 'match_veo_documents', 'consume_veo_ai_request');
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('listening_links', 'veo_documents', 'veo_ai_requests');
```

Regenerate the committed declaration from the linked database, then make no manual edits unless the CLI emits an unsupported vector field:

```powershell
npx supabase gen types typescript --linked | Out-File -Encoding utf8 src/types/database.types.ts
```

Ensure the generated-style `Database` declaration includes all three tables' `Row`/`Insert`/`Update` entries, both enums, and `Functions` entries for all six listed RPCs. Represent `vector(1536)` arguments/columns as `string` when the generated client declaration cannot express the extension type; application code serializes each numeric embedding with `JSON.stringify(embedding)`. The link-summary/create/revoke returns must have the same safe `ListeningLinkSummary` shape and omit `token_hash`; `record_listening_link_access` returns `void`; retrieval includes `similarity: number`.

- [ ] **Step 6: Run schema and static validation**

Run:

```powershell
npx tsc --noEmit
npm run lint
```

Expected: the refreshed `Database` type makes all current Phase 3/4 imports type-check, lint reports no errors, no direct `listening_links` select policy/privilege exists for authenticated or anonymous roles, the safe summary output excludes `token_hash`, and every deployed privileged function shows its fixed search path.

- [ ] **Step 7: Commit the schema contract**

```powershell
git add supabase/migrations/202608110500_phase_5_listening_ai.sql src/types/database.types.ts
git commit -m "feat: add listening and AI database contract`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Build the server-only administration and listening lifecycle boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/listening/types.ts`
- Create: `src/lib/listening/tokens.ts`
- Create: `src/lib/listening/validation.ts`
- Create: `src/lib/listening/service.ts`

**Interfaces:**
- Consumes: `getSupabaseEnv(): SupabasePublicEnv`, request-scoped `createClient()`, Phase 3 `track_versions` storage fields, and Task 1 RPC types.
- Produces: `createAdminClient(): SupabaseClient<Database>`; `createListeningLink(input)`, safe-RPC-backed `listListeningLinks(trackId)`, `revokeListeningLink(linkId)`, `validatePublicListeningToken(rawToken)`, `createPublicListeningSession(rawToken)`, and `refreshPublicListeningToken(rawToken)`.
- Produces: `PublicListeningAvailability = { trackTitle: string; versionLabel: string; artworkUrl: null }`, `PublicListeningSession = PublicListeningAvailability & { playbackUrl: string; expiresAt: string }`, `RefreshListeningResult = { playbackUrl: string; expiresAt: string }`, `PublicListeningSessionResult`, and `PublicListeningRefreshResult`; no public DTO includes database IDs, object keys, token digests, raw tokens, or user data.

- [ ] **Step 1: Add the explicit server-only package**

The current lockfile does not contain the required import boundary. Run:

```powershell
npm install server-only@0.0.1
```

Expected: `package.json` lists `"server-only": "^0.0.1"` in `dependencies` and `package-lock.json` locks the package. Do not add a browser alias or webpack fallback for this import.

- [ ] **Step 2: Create the lazy server-only admin client**

Create `src/lib/supabase/admin.ts`:

```ts
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";
import { getSupabaseEnv } from "./env";

export function createAdminClient(): SupabaseClient<Database> {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!serviceRoleKey) {
    throw new Error("Supabase administrative access is not configured.");
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
```

Do not cache a request user or copy request cookies into this client. Never import this module from a Client Component, dashboard page, or browser Supabase helper.

- [ ] **Step 3: Define exact safe DTOs, validation, and token utilities**

In `src/lib/listening/types.ts`, define `ListeningLinkSummary`, `ReadyListeningVersion`, `CreateListeningLinkInput`, `CreateListeningLinkResult`, `PublicListeningAvailability`, `PublicListeningSession`, `RefreshListeningResult`, `PublicListeningSessionResult`, and `PublicListeningRefreshResult`. `ListeningLinkSummary` contains only `id`, `versionId`, `versionLabel`, `label`, `status`, `expiresAt`, `revokedAt`, `createdAt`, `lastAccessedAt`, and `accessCount`; it never contains `tokenHash`/`token_hash`. `CreateListeningLinkResult` is `{ link: ListeningLinkSummary; rawToken: string }` and the raw value is used only by the immediate successful action. Define `PublicListeningAvailability` as `{ trackTitle: string; versionLabel: string; artworkUrl: null }`, `PublicListeningSession` as its extension with `{ playbackUrl: string; expiresAt: string }`, and `RefreshListeningResult` as `{ playbackUrl: string; expiresAt: string }`. Define exact server-only operation results: `type PublicListeningSessionResult = { state: "ready"; session: PublicListeningSession } | { state: "unavailable" } | { state: "temporarily_unavailable" };` and `type PublicListeningRefreshResult = { state: "ready"; refresh: RefreshListeningResult } | { state: "unavailable" } | { state: "temporarily_unavailable" };`.

In `validation.ts`, export these schemas and stable errors:

```ts
export const createListeningLinkSchema = z.object({
  trackId: z.string().uuid(),
  versionId: z.string().uuid(),
  label: z.string().trim().min(1).max(120).nullable(),
  expiresAt: z.string().datetime({ offset: true }),
}).strict();
export const revokeListeningLinkSchema = z.object({ linkId: z.string().uuid() }).strict();
export const refreshListeningSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict();
```

In `tokens.ts`, first add `import "server-only"`; use `randomBytes(32).toString("base64url")`, `createHash("sha256").update(rawToken).digest("hex")`, and `timingSafeEqual` only when comparing equal-length locally generated digests. Export `normalizeListeningToken(value: string): string | null`, `createListeningToken(): { rawToken: string; tokenHash: string }`, and `isPrivateObjectKey(value: string): boolean`. `normalizeListeningToken` accepts only the exact 43-character base64url token; `isPrivateObjectKey` rejects empty strings, leading `/`, `..`, backslashes, `://`, and control characters.

- [ ] **Step 4: Implement RLS-backed internal mutations and list mapping**

In `service.ts`, call `await createClient()` and `await supabase.auth.getUser()` before every internal operation. If no user is present, throw only the stable application error `You must sign in to manage listening links.`.

Implement these signatures:

```ts
export async function listListeningLinks(trackId: string): Promise<ListeningLinkSummary[]>;
export async function listReadyListeningVersions(trackId: string): Promise<ReadyListeningVersion[]>;
export async function createListeningLink(input: CreateListeningLinkInput): Promise<CreateListeningLinkResult>;
export async function revokeListeningLink(linkId: string): Promise<ListeningLinkSummary>;
```

`listListeningLinks` calls only `rpc("list_listening_link_summaries", { p_track_id: trackId })`; never select `listening_links` directly. `listReadyListeningVersions` filters to the submitted track's `status = 'ready'`, `storage_provider = 'supabase'`, `storage_bucket = 'playback'`, and a valid private `storage_url`; the create RPC repeats every requirement authoritatively. `createListeningLink` validates input, rejects past expiry, authenticates before token generation, calls `create_listening_link` through the request-scoped client with the digest, revalidates `/studio` and `/studio/${trackId}`, maps the returned safe row, and returns the raw token once. `revokeListeningLink` maps and returns the RPC's updated safe summary, then revalidates the owning Studio route. Convert all provider failures to stable messages without provider details.

- [ ] **Step 5: Implement availability validation, fresh sessions, refresh, and atomic telemetry**

At the top of `service.ts`, add `import "server-only"`. Export these exact server-only functions:

```ts
export async function validatePublicListeningToken(
  rawToken: string,
): Promise<PublicListeningAvailability | null>;
export async function createPublicListeningSession(
  rawToken: string,
): Promise<PublicListeningSessionResult>;
export async function refreshPublicListeningToken(
  rawToken: string,
): Promise<PublicListeningRefreshResult>;
```

Factor a private `resolveValidatedPublicLink(rawToken)` helper that normalizes/hashes the token, uses `createAdminClient()`, finds exactly one non-revoked/unexpired hash match, loads the track/version relation, and requires `version.track_id === link.track_id`, `version.status === "ready"`, `version.storage_provider === "supabase"`, `version.storage_bucket === "playback"`, and `isPrivateObjectKey(version.storage_url)`. It returns an internal-only resolved object containing link ID, display metadata, and private key; it returns `null` only for invalid/revoked/expired/missing/incompatible link state.

`validatePublicListeningToken` calls that helper but returns only public display metadata and never signs. `createPublicListeningSession` and `refreshPublicListeningToken` each call the helper afresh inside a private `try/catch`. If the helper returns `null`, they return `{ state: "unavailable" }`; any thrown administrative/configuration/query/signing/telemetry failure returns `{ state: "temporarily_unavailable" }` without cause/provider data. After successful validation they sign and await atomic telemetry. The ready path is exactly:

```ts
const { data, error } = await admin.storage
  .from("playback")
  .createSignedUrl(resolved.version.storageUrl, 300);
if (error || !data?.signedUrl) return { state: "temporarily_unavailable" };
const telemetry = await admin.rpc("record_listening_link_access", {
  p_link_id: resolved.link.id,
});
if (telemetry.error) return { state: "temporarily_unavailable" };
```

Use `expiresAt = new Date(Date.now() + 300_000).toISOString()`. Session returns `{ state: "ready", session: { ...publicMetadata, playbackUrl: data.signedUrl, expiresAt } }`; refresh returns `{ state: "ready", refresh: { playbackUrl: data.signedUrl, expiresAt } }`. Awaited telemetry is an atomic database increment, not a read-modify-write update. Do not persist or log URLs, tokens, hashes, or failure causes.

- [ ] **Step 6: Inspect administrative and token boundaries, then type/lint**

Inspect source imports and the production client bundle. Confirm `SUPABASE_SERVICE_ROLE_KEY` occurs only in `src/lib/supabase/admin.ts`; `admin.ts`, `tokens.ts`, and `service.ts` start with `import "server-only"`; no file under `src/components/` imports an admin/listening server boundary; public DTOs exclude token hash, raw token, storage locator, bucket, provider, and database IDs; and raw tokens occur only in the requested create result, route parameter, session request, and refresh request.

Run:

```powershell
npx tsc --noEmit
npm run lint
```

Expected: static checks pass; a missing service-role variable produces only `Supabase administrative access is not configured.` at the dependent listening feature, without breaking unrelated dashboard pages.

- [ ] **Step 7: Commit the listening boundary**

```powershell
git add package.json package-lock.json src/lib/supabase/admin.ts src/lib/listening
git commit -m "feat: add secure listening lifecycle boundary`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Add internal Studio listening-link management

**Files:**
- Modify: `src/app/(dashboard)/studio/[trackId]/page.tsx`
- Create: `src/app/(dashboard)/studio/[trackId]/listening-actions.ts`
- Create: `src/components/studio/ListeningLinkManager.tsx`

**Interfaces:**
- Consumes: `listReadyListeningVersions(trackId)`, `listListeningLinks(trackId)`, `createListeningLink(input)`, `revokeListeningLink(linkId)`, and Phase 3's authorized track-detail page.
- Produces: `ListeningLinkManager({ trackId, versions, initialLinks })` with local `createdShareUrl: string | null` that is cleared on unmount/next successful creation.
- Preserves: only ready Supabase `playback` versions are offered; R2 source assets are never publishable without a registered playback-ready Supabase derivative.

- [ ] **Step 1: Load link data within the existing authorized Studio detail page**

Modify `src/app/(dashboard)/studio/[trackId]/page.tsx` after its Phase 3 authorized detail lookup. In the same server render, call `listReadyListeningVersions(trackId)` and `listListeningLinks(trackId)`, then render the client island below version/playback controls:

```tsx
<ListeningLinkManager
  trackId={track.id}
  versions={readyListeningVersions}
  initialLinks={listeningLinks}
/>
```

Do not request the admin client in the page. If there are no eligible versions, render the component's explicit message: `External listening becomes available after a playback-ready Supabase version is registered.`

- [ ] **Step 2: Add typed Server Actions and the controlled create form**

Create `src/app/(dashboard)/studio/[trackId]/listening-actions.ts` with `"use server"` and these exact result contracts:

```ts
export type ListeningCreateActionResult =
  | { success: true; link: ListeningLinkSummary; rawToken: string }
  | { success: false; message: string };
export type ListeningRevokeActionResult =
  | { success: true; link: ListeningLinkSummary }
  | { success: false; message: string };
export async function createListeningLinkAction(input: CreateListeningLinkInput): Promise<ListeningCreateActionResult>;
export async function revokeListeningLinkAction(input: { linkId: string }): Promise<ListeningRevokeActionResult>;
```

Each action calls the Task 2 service, catches all provider/domain exceptions, and returns only the stable action message. Pass these Server Actions as props from the Studio page to `ListeningLinkManager`.

Create `ListeningLinkManager.tsx` as a Client Component. Its controlled fields are `versionId`, `label`, and `expiresAt`; initialize expiry to 72 hours in the future in the user's local date/time input, require a value later than the client current time, and submit the ISO timestamp to `createListeningLinkAction`.

After success, construct the share URL only in the browser:

```ts
const shareUrl = new URL(`/listen/${result.rawToken}`, window.location.origin).toString();
setCreatedShareUrl(shareUrl);
```

Render the URL in a readonly input and provide an accessible Copy button using `navigator.clipboard.writeText(shareUrl)`. The surrounding notice must state exactly: `Copy this link now. Its token cannot be shown again; create a new link to replace it.` Clear the raw URL state before a second creation attempt, after component unmount, and after a successful revoke; never add it to router state, storage, query parameters, or the link list.

- [ ] **Step 3: Implement link states and explicit revocation confirmation**

Derive state without mutating rows: `revoked` when `revokedAt` exists, `expired` when `expiresAt <= new Date().toISOString()`, otherwise `active`. Show label or `Untitled link`, version label, local-formatted expiry, access count, and local-formatted `lastAccessedAt` or `No accesses yet`. Do not show a raw token, digest, storage locator, provider, bucket, or UUID.

For every active link, render a `Revoke link` button. On activation, show an in-component confirmation panel with `Cancel` and `Revoke permanently`; only the latter invokes the Server Action. On success replace the exact row from `result.link`, whose `revokedAt` is now present; do not optimistically invent revoked state or retain stale list data. State: `Revoked links cannot issue new playback URLs. Previously issued URLs expire within five minutes.` Keep the confirmation keyboard reachable, focus the cancel control when it opens, and return focus to the originating revoke button when it closes.

- [ ] **Step 4: Verify the management flow in a configured browser session**

With non-secret development data containing one ready Supabase playback version, inspect `/studio/[trackId]` at `1440x1000` and `390x844`:

- Only eligible ready `supabase`/`playback` versions appear in the selector; a ready R2 version cannot be selected.
- Creation returns a 43-character-token URL once, copying works, and a reload/list refresh never reveals that URL/token again.
- Active/revoked/expired labels, expiry metadata, access count, and no-access message are honest.
- Revoke requires the explicit confirmation and immediately removes future refresh eligibility.
- Keyboard focus, both themes, and reduced motion are usable; no provider payload, token, hash, signed URL, or service-role value appears in console/network logs beyond the one-time browser URL the user requested.

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

Expected: browser behavior matches the contract and all static/build checks exit zero.

- [ ] **Step 5: Commit Studio sharing management**

```powershell
git add "src/app/(dashboard)/studio/[trackId]/page.tsx" "src/app/(dashboard)/studio/[trackId]/listening-actions.ts" src/components/studio/ListeningLinkManager.tsx
git commit -m "feat: manage Studio listening links`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Build the private public listening route, independent player, and refresh endpoint

**Files:**
- Create: `src/app/listen/[token]/page.tsx`
- Create: `src/app/listen/[token]/PublicListeningRoom.tsx`
- Create: `src/app/listen/[token]/public-listening-room.module.css`
- Create: `src/app/api/listen/session/route.ts`
- Create: `src/app/api/listen/refresh/route.ts`
- Modify: `next.config.mjs`

**Interfaces:**
- Consumes: `validatePublicListeningToken(rawToken)`, `createPublicListeningSession(rawToken)`, `refreshPublicListeningToken(rawToken)`, `PublicListeningAvailability`, `PublicListeningSessionResult`, `PublicListeningRefreshResult`, `refreshListeningSchema`, and `formatPlaybackTime(seconds)`.
- Produces: a no-dashboard `/listen/[token]` route, a ready `POST /api/listen/session` response `PublicListeningSession`, and a ready `POST /api/listen/refresh` response `{ playbackUrl: string; expiresAt: string }`; the server-only discriminated results map unavailable to 410 and temporary signing/configuration/telemetry failures to 503 without provider details, all with required privacy headers.
- Guarantees: page availability carries no signed URL; no media/session/refresh request occurs until valid in-memory guest-name submission; stale session/refresh responses cannot overwrite newer state.

- [ ] **Step 1: Configure route and endpoint privacy headers**

Replace the empty `nextConfig` in `next.config.mjs` with an async `headers()` configuration returning this exact `/listen/:path*` rule:

```ts
const nextConfig = {
  async headers() {
    return [
      {
        source: "/listen/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
        ],
      },
    ];
  },
};
```

In both Route Handlers, export `runtime = "nodejs"`, `dynamic = "force-dynamic"`, and `revalidate = 0`. Parse only JSON matching `refreshListeningSchema`; malformed input is `400 { error: "Listening link unavailable." }`. Call the corresponding server-only operation and switch exhaustively on its discriminant: `{ state: "unavailable" }` is `410 { error: "Listening link unavailable." }`; `{ state: "temporarily_unavailable" }` is `503 { error: "Playback is temporarily unavailable." }`; only `{ state: "ready" }` may return media metadata. `session/route.ts` returns `NextResponse.json(result.session, { headers: sensitiveHeaders })`; `refresh/route.ts` returns `NextResponse.json(result.refresh, { headers: sensitiveHeaders })`. Neither output contains the raw token or provider details. `sensitiveHeaders` contains exactly `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, and `X-Robots-Tag: noindex, nofollow, noarchive`.

- [ ] **Step 2: Implement dynamic, indistinguishable server resolution**

Create `src/app/listen/[token]/page.tsx` outside `(dashboard)`. Export:

```ts
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};
```

Normalize `params.token` only through `validatePublicListeningToken`; it validates availability but must not sign or return a URL. When it returns null, render a local `ListeningUnavailable` component whose heading is `This listening link is unavailable` and body is `Ask the sender for a new link.` Use exactly the same component for invalid, revoked, expired, missing, invalid-storage, and signing-failed results. On success, render only `<PublicListeningRoom token={params.token} availability={availability} />`. Do not call the dashboard layout, query comments/profile data, render identifiers, create a signed URL, or add a `GlobalPlayer`.

- [ ] **Step 3: Implement guest gate, watermark, and isolated media lifecycle**

Create `PublicListeningRoom.tsx` with `"use client"`. It imports no dashboard, Studio, Zustand, or audio-command-bus module. Keep local `guestName`, `submittedGuestName`, `session`, `isPlaying`, `currentTime`, `duration`, `volume`, `refreshError`, and unavailable state; use refs for `audioRef`, `refreshTimerRef`, and a shared `requestGenerationRef` for session and refresh results.

Validate guest entry with `value.trim().length >= 2 && value.trim().length <= 60`. Before submission, render only availability track/version information and a labelled name field; do not render an audio element with `src`, call `load`, or schedule refresh. On valid submission, increment `requestGenerationRef`, call `POST /api/listen/session` with `{ token }`, and discard the response if its generation is stale. Only a successful fresh session sets `submittedGuestName`, stores public session data, assigns `audio.src = session.playbackUrl`, calls `audio.load()`, and schedules refresh 60 seconds before `session.expiresAt` (minimum delay five seconds). A delayed submission never obtains a page-time URL because none was rendered.

Implement `refreshPlaybackUrl` using the token prop and a generation counter:

```ts
const generation = ++requestGenerationRef.current;
const response = await fetch("/api/listen/refresh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token }),
  cache: "no-store",
});
if (generation !== requestGenerationRef.current) return;
```

When the response succeeds, preserve `audio.currentTime`, `audio.paused`, and `audio.volume`; assign the new URL, wait for `loadedmetadata`, clamp/restore the saved position, then call `audio.play()` only when it had been playing. On `410`, pause, remove `src`, call `load()`, and replace the room with the indistinguishable unavailable state. On a transient response/network failure, pause and show `Playback refresh failed. Retry once.`; the retry increments the same generation. A second failed refresh replaces the room with the unavailable state. Increment the generation, clear timers, pause, remove `src`, and call `load()` in the unmount cleanup.

Render accessible Play/Pause, Seek, elapsed/duration, and Volume controls using native buttons/ranges and persistent visible labels. Use `formatPlaybackTime`, ignore non-finite media values, and use `preload="metadata"`. Do not autoplay.

- [ ] **Step 4: Add bounded local watermark styling**

Create the CSS module with `.watermarkLayer { pointer-events: none; }` and multiple absolutely positioned `.watermark` elements rendered with `{submittedGuestName}` as child text. Derive the count, positions, rotations, and opacity from a small deterministic hash of `submittedGuestName + sessionStorageNonce` created once with `crypto.getRandomValues`; bound every position to `4%..86%`, rotation to `-28deg..28deg`, opacity to `0.10..0.18`, and font size to `0.75rem..1rem`. Add `mix-blend-mode: soft-light`, `user-select: none`, and `aria-hidden="true"` to the watermark layer. Add only a low-amplitude drift animation for non-reduced-motion users, and disable it under `@media (prefers-reduced-motion: reduce)`.

Keep content contrast above the watermarks; use VEO glass panels, black/light semantic grounds, and the purple accent. The page must remain a focused listening room rather than a miniature dashboard.

- [ ] **Step 5: Perform browser, network, and public-resource inspection**

With a non-secret configured development link, check valid, revoked, expired, and malformed tokens at `1440x1000` and `390x844`:

- The three invalid cases produce the identical unavailable copy/status and do not reveal why.
- The page source/DOM contains no dashboard sidebar, player dock, comment/profile data, raw UUID, bucket/object key, token hash, or permanent URL.
- Before a valid guest name, DevTools Network shows no media, session, or refresh request and the document/HTML contains no signed URL. After entry, one fully revalidated session response returns a fresh five-minute URL and exactly the authorized media request appears; refresh occurs before expiry and preserves seek position/playing intent.
- Route, session, and refresh responses include all no-store/no-referrer/noindex headers. The document has noindex metadata.
- The route loads no third-party script, image, font, analytics, or remote subresource; only same-origin application assets and the signed Supabase media URL appear.
- Watermarks are visible, noninteractive, absent from the accessibility tree, readable in dark/light themes, and motion-free with reduced motion. All player controls work by keyboard.

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

Expected: checks/build pass and the production route manifest contains `/listen/[token]`, `/api/listen/session`, and `/api/listen/refresh` without accidental dashboard nesting.

- [ ] **Step 6: Commit public listening**

```powershell
git add next.config.mjs src/app/listen src/app/api/listen/session src/app/api/listen/refresh
git commit -m "feat: add private external listening room`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Add server-only OpenAI configuration and fail-closed incremental indexing

**Files:**
- Create: `src/lib/ai/env.ts`
- Create: `src/lib/ai/openai.ts`
- Create: `src/lib/ai/types.ts`
- Create: `src/lib/ai/indexing.ts`

**Interfaces:**
- Consumes: request-scoped `createClient()`, `createAdminClient()`, Task 1 `veo_documents`, and the Phase 3/4 action/comment/track/version schema.
- Produces: `getOpenAIConfig()`, `getOpenAIClient()`, `refreshVeoIndex()`, `toPgVector()`, `RetrievedVeoDocument`, `IndexRefreshResult`, and deterministic action/comment source text.
- Guarantees: missing/changed documents are embedded in batches of at most 50; index failure or remaining work prevents chat from answering as if knowledge were current.

- [ ] **Step 1: Implement validated server-only OpenAI configuration**

Create `src/lib/ai/env.ts` with `import "server-only"`. Export:

```ts
export type OpenAIChatModel = "gpt-4.1-mini" | "gpt-4.1" | "gpt-4o-mini";
export type OpenAIConfig = { apiKey: string; chatModel: OpenAIChatModel };
export function getOpenAIConfig(): OpenAIConfig;
```

`getOpenAIConfig` trims `OPENAI_API_KEY` and throws exactly `VEO AI is not configured.` when absent. Read `OPENAI_CHAT_MODEL`; use it only if it is one of the three allowed values, otherwise use `gpt-4.1-mini`. Do not expose a configurable embedding model: Task 5 always uses `text-embedding-3-small` with `dimensions: 1536`.

Create `src/lib/ai/openai.ts` with `import "server-only"` and:

```ts
export function getOpenAIClient() {
  const { apiKey } = getOpenAIConfig();
  return new OpenAI({ apiKey, timeout: 20_000, maxRetries: 0 });
}
```

Do not set `dangerouslyAllowBrowser`, use no provider logger, and do not import this module from UI code.

- [ ] **Step 2: Define source, retrieval, and chat-safe types**

In `src/lib/ai/types.ts`, define:

```ts
export type ChatClientMessage = { role: "user" | "assistant"; content: string };
export type PublicVeoSource = {
  kind: "action" | "comment";
  label: string;
  context: string;
};
export type RetrievedVeoDocument = {
  id: string; sourceKind: "action" | "comment"; sourceId: string;
  trackId: string | null; content: string; metadata: Record<string, unknown>;
  similarity: number;
};
export type IndexRefreshResult =
  | { state: "current"; indexed: number }
  | { state: "pending"; indexed: number }
  | { state: "unavailable"; indexed: number };
```

Use metadata shapes `{ title: string; eventDate: string; status: string }` for actions and `{ trackTitle: string; versionNum: number; timestampMarker: number; isResolved: boolean }` for comments. `PublicVeoSource` deliberately omits UUIDs, storage paths, author emails, and document content.

- [ ] **Step 3: Implement deterministic source construction and bounded change detection**

In `indexing.ts`, export `buildActionDocument(action)` and `buildCommentDocument(comment)` that normalize whitespace with `value.replace(/\s+/g, " ").trim()` and return exact content formats:

```ts
Action: {title}\nStatus: {status}\nEvent date: {eventDate}\nDescription: {description || "None"}
Comment on {trackTitle}, version {versionNum} at {formattedMarker}\nResolved: {isResolved ? "yes" : "no"}\n{content}
```

Export `sha256Text(value: string): string` using Node `createHash("sha256")`, and `toPgVector(embedding: number[]): string`, which rejects a non-finite array not exactly 1,536 elements and returns `JSON.stringify(embedding)`.

Implement:

```ts
export async function refreshVeoIndex(): Promise<IndexRefreshResult>;
```

It authenticates with `createClient()` before any query, returns `{ state: "unavailable", indexed: 0 }` when no user/configuration/provider operation fails, and never logs the cause. It fetches only RLS-visible actions and comments joined to their track/version display fields, then fetches existing document hashes/source identifiers with the admin client. Construct source texts and hashes locally; select at most 50 missing/changed records in deterministic `(sourceKind, sourceId)` order. Delete admin-visible document rows whose source no longer exists in the RLS-visible source set. If more than 50 changes remain after the selected batch, return `{ state: "pending", indexed }` after persisting that batch.

- [ ] **Step 4: Embed and upsert without leaking provider data**

For a nonempty selected batch, call the SDK exactly once:

```ts
const embeddingResponse = await getOpenAIClient().embeddings.create(
  { model: "text-embedding-3-small", dimensions: 1536, input: documents.map((document) => document.content) },
  { timeout: 20_000, maxRetries: 0 },
);
```

Require `embeddingResponse.data.length === documents.length`, run every returned vector through `toPgVector`, and upsert via the admin client on `source_kind,source_id` with `content`, `content_hash`, `embedding`, `metadata`, and `updated_at`. Do not write raw API output. Return `current` only after a second local changed-record count is zero; return `pending` otherwise. This forces chat to decline until its bounded refresh has caught up rather than silently querying partial knowledge.

- [ ] **Step 5: Inspect OpenAI/server-only and indexing scope**

Review imports and tracked source:

```powershell
git grep -n "OPENAI_API_KEY\|SUPABASE_SERVICE_ROLE_KEY" -- src
git grep -n "from \"@/lib/ai/openai\"\|from \"@/lib/supabase/admin\"" -- src
npx tsc --noEmit
npm run lint
```

Expected: key names occur only in server-only environment modules; no Client Component imports the OpenAI/admin boundary; OpenAI requests can only be embeddings for actions/comments or the Task 6 chat completion; type/lint checks pass.

- [ ] **Step 6: Commit VEO AI indexing**

```powershell
git add src/lib/ai
git commit -m "feat: add incremental VEO AI indexing`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Implement authenticated source-grounded VEO AI chat API

**Files:**
- Create: `src/lib/ai/chat.ts`
- Create: `src/app/api/veo-ai/chat/route.ts`

**Interfaces:**
- Consumes: `ChatClientMessage`, `PublicVeoSource`, `refreshVeoIndex()`, `getOpenAIClient()`, `getOpenAIConfig()`, Task 1 `consume_veo_ai_request()` and `match_veo_documents()` RPCs.
- Produces: `POST /api/veo-ai/chat` JSON success `{ answer: string; sources: PublicVeoSource[] }` and stable `400`, `401`, `429`, `503`, and `504` failures.
- Guarantees: no response is generated without a `current` index refresh and authorized retrieval; client roles can never provide a system/developer/tool instruction.

- [ ] **Step 1: Define the strict request schema and stable API response statuses**

In `route.ts`, export `runtime = "nodejs"`, `dynamic = "force-dynamic"`, and `revalidate = 0`. Define the strict schema in `chat.ts`:

```ts
const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
}).strict();
export const veoAiChatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(20),
}).strict().superRefine(({ messages }, ctx) => {
  if (messages.at(-1)?.role !== "user") ctx.addIssue({ code: z.ZodIssueCode.custom, message: "The final message must be from the user." });
  if (messages.reduce((total, message) => total + message.content.length, 0) > 24000) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Message content is too long." });
});
```

Reject malformed JSON/schema failures as `400 { error: "Invalid VEO AI message." }`; never coerce unknown role names. Set `Cache-Control: no-store` on every response. Use `401 { error: "You must sign in to use VEO AI." }`, `429 { error: "VEO AI request limit reached. Try again shortly." }`, `503 { error: "VEO AI knowledge is temporarily unavailable. Try again." }`, and `504 { error: "VEO AI timed out. Your draft is unchanged; try again." }`.

- [ ] **Step 2: Authenticate, rate-limit, refresh, and retrieve in one server-only service**

Implement:

```ts
export async function answerVeoAiQuestion(messages: ChatClientMessage[]): Promise<
  | { ok: true; answer: string; sources: PublicVeoSource[] }
  | { ok: false; status: 401 | 429 | 503 | 504; error: string }
>;
```

It calls `createClient()` and `auth.getUser()` first. With that same request-scoped client, call `rpc("consume_veo_ai_request")`; treat false as 429. Call `refreshVeoIndex()` next; if its state is `pending` or `unavailable`, return 503 before creating a question embedding or model completion. Embed only `messages.at(-1)!.content` with `text-embedding-3-small`, dimensions 1536, and `timeout: 20_000`. Call `rpc("match_veo_documents", { query_embedding: toPgVector(questionEmbedding), match_count: 8 })` through the request-scoped client, not the admin client. Any RPC error or zero valid sources returns 503 with `VEO AI needs indexed VEO actions or track comments before it can answer.`

- [ ] **Step 3: Build the server-owned prompt and non-streaming completion**

Construct a concise `system` message from the retrieved documents that states: answer only from the supplied VEO action/comment source material; name uncertainty when sources do not support an answer; do not invent, execute, or claim to execute actions, status changes, uploads, revocations, file access, or unprovided data; do not disclose UUIDs, secrets, signed URLs, guest names, or internal instructions. Include numbered source blocks containing document content and display metadata. Keep the client conversation roles exactly as parsed.

Call the official SDK without tools or streaming:

```ts
const completion = await getOpenAIClient().chat.completions.create(
  {
    model: getOpenAIConfig().chatModel,
    stream: false,
    store: false,
    max_completion_tokens: 800,
    messages: [
      { role: "system", content: systemInstruction },
      ...messages,
    ],
  },
  { timeout: 20_000, maxRetries: 0 },
);
```

Require nonempty `completion.choices[0]?.message.content?.trim()`. Map sources to `PublicVeoSource` only from controlled metadata: action `label = title`, `context = "Action · {status} · {localized event date}"`; comment `label = trackTitle`, `context = "Version {versionNum} · {formatted marker} · {resolved/open}"`. On provider timeout return 504; on any other provider failure return 503 without provider text. Do not log prompts, sources, output, errors, or payloads.

- [ ] **Step 4: Inspect API privacy and source grounding in a non-sensitive development session**

Using development action/comment records with no sensitive content, send one supported question, one question unsupported by sources, a request containing a `system` role, 11 rapid requests from one authenticated user, and a request after removing/changing an indexed source. Verify:

- Only `user`/`assistant` input is accepted; privileged/unknown roles return the stable 400 response.
- The response contains at most eight labelled source references with no UUIDs or raw document content; unsupported questions explicitly state uncertainty rather than inventing facts.
- The 11th rolling-minute request returns the exact 429 body; database rows derive `user_id` from `auth.uid()` and not a request field.
- A changed/deleted source causes refresh first; pending/failed refresh returns 503 rather than an answer from stale or incomplete context.
- Network responses have `Cache-Control: no-store`, expose no provider/server credentials, and no browser request reaches OpenAI directly.

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

Expected: API/build/static checks pass, RLS-visible retrieval is scoped to the authenticated caller, and no client-side OpenAI boundary exists.

- [ ] **Step 5: Commit the VEO AI API**

```powershell
git add src/lib/ai/chat.ts src/app/api/veo-ai/chat/route.ts
git commit -m "feat: add source-grounded VEO AI chat API`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Build the VEO AI dashboard module and complete navigation/dashboard links

**Files:**
- Create: `src/app/(dashboard)/veo-ai/page.tsx`
- Create: `src/components/chat/VEO_AI_Chat.tsx`
- Create: `src/lib/dashboard/queries.ts`
- Modify: `src/app/(dashboard)/page.tsx`
- Modify: `src/components/dashboard/dashboard-home.tsx`
- Modify: `src/components/dashboard/dashboard-sidebar.tsx`
- Modify: `src/components/dashboard/mobile-dashboard-header.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `POST /api/veo-ai/chat`, `ChatClientMessage`, `PublicVeoSource`, existing `DashboardShell`, and Phase 3/4 RLS-readable module data.
- Produces: active `/veo-ai` navigation, a local-only `VEO_AI_Chat()` conversation, pathname-aware navigation/header, and linked honest dashboard summaries.
- Preserves: `GlobalPlayer` remains mounted in dashboard layout; conversations are never persisted.

- [ ] **Step 1: Create the protected VEO AI route**

Create `src/app/(dashboard)/veo-ai/page.tsx` as a Server Component under the existing protected dashboard layout. Render a page heading `VEO AI`, the exact explanatory copy `Ask about VEO actions and timestamped track comments. Answers cite the records used.`, and `<VEO_AI_Chat />`. Include three static suggested-prompt buttons passed as initial composer values:

- `What actions are due next?`
- `Summarize unresolved feedback on the current tracks.`
- `Which planned actions mention release preparation?`

Do not fetch OpenAI, documents, or conversation history in the page render.

- [ ] **Step 2: Implement local conversation and safe source chips**

Create `VEO_AI_Chat.tsx` as a Client Component. Its only persisted-in-memory state is `messages: ChatClientMessage[]`, `draft`, `isSending`, `error`, `retryMessages`, and current response source chips. On submit create `const userMessage: ChatClientMessage = { role: "user", content: draft.trim() }; const requestMessages = [...messages, userMessage];`. Use that exact `requestMessages` value for optimistic state (`setMessages(requestMessages)`), POST body (`JSON.stringify({ messages: requestMessages })`), and `retryMessages`. Append the returned assistant answer only on success and retain draft on failure. Disable composer/send while pending, set `aria-busy`, and make Retry POST the unchanged `retryMessages`; do not rebuild a subtly different sequence.

Render user/assistant content as plain React text in paragraphs; do not use `dangerouslySetInnerHTML`, HTML parsing, or a Markdown renderer. Render returned sources as text-only chips with `label` and `context`; never add raw IDs to chip labels, tooltips, `data-*` attributes, or visible URLs. Before a conversation, use this empty state: `No VEO AI sources are loaded yet. Create VEO actions or add track comments, then ask a focused question.`

Keep the conversation column at `max-w-3xl`, place the composer above the dashboard player-safe area, use visible focus rings and labelled textarea/send controls, and respect reduced motion by removing message-entry animation. Use glass hierarchy and restrained purple accents without changing shared theme tokens.

- [ ] **Step 3: Replace future navigation with pathname-aware completed links**

Modify `dashboard-sidebar.tsx` into a Client Component only if needed for `usePathname()`. Define this exact destination set: Dashboard `/`, Studio `/studio`, Operations `/operations`, Content `/content`, VEO AI `/veo-ai`. Render each as a `next/link` with `aria-current="page"` when the pathname equals its route or begins with `route + "/"` for non-root routes. Remove all `Coming soon` labels and noninteractive future rows. Retain the 260px fixed sidebar, theme control, existing icon treatment, and `GlobalPlayer` layout contract.

Modify `mobile-dashboard-header.tsx` to derive `Dashboard`, `Studio`, `Operations`, `Content`, or `VEO AI` from the same pathname map while retaining exactly one theme control and no dead menu. Do not render raw route segments.

- [ ] **Step 4: Make dashboard cards truthful routes with RLS-authorized summaries**

Create `src/lib/dashboard/queries.ts` with:

```ts
export type DashboardSummary = {
  trackCount: number;
  upcomingActionCount: number;
  contentIdeaCount: number;
  unresolvedCommentCount: number;
};
export type DashboardSummaryResult =
  | { state: "ready"; summary: DashboardSummary }
  | { state: "unavailable" };
export async function getDashboardSummary(): Promise<DashboardSummaryResult>;
```

Authenticate through the request-scoped server client, then use RLS-respecting count queries for tracks, non-completed/non-cancelled future actions, content ideas, and unresolved comments. On a provider/configuration failure, return `{ state: "unavailable" }`, never fabricated zero counts; successful counts return `{ state: "ready", summary }`. Modify `src/app/(dashboard)/page.tsx` to await this result and pass it to `DashboardHome`.

Modify `DashboardHome` so every module card is a real `Link` to `/studio`, `/operations`, `/content`, or `/veo-ai`; remove all `Coming soon` copy. When `summaryResult.state === "unavailable"`, render an explicit `Dashboard data is temporarily unavailable.` state and no numeric counts. Only when `state === "ready"`, show `{trackCount} tracks`, `{upcomingActionCount} upcoming actions`, `{contentIdeaCount} content ideas`, and `{unresolvedCommentCount} unresolved comments`; use `No tracks yet`, `No upcoming actions`, `No content ideas`, or `No unresolved comments` only for successful zeroes. Do not add charts, percentages, avatars, health claims, fake records, or statistics from unavailable data.

- [ ] **Step 5: Verify responsive UI, navigation, and player persistence**

In an authenticated development browser at `1440x1000` and `390x844`, confirm:

- All five desktop/mobile navigation destinations are real, active state follows the pathname, and there are no `Coming soon` labels.
- `/veo-ai` shows the explanation, suggested prompts, empty state, sending state, retryable errors, text-only messages, and source chips without raw IDs.
- The global dashboard player remains mounted while navigating among Dashboard, Studio, Operations, Content, and VEO AI; the public listening player never appears in the dashboard.
- Dashboard counts/cards use only authorized data and zero states remain honest.
- Light/dark themes, keyboard order/focus, no horizontal overflow, and reduced-motion behavior are correct; the composer clears the fixed player dock.

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

Expected: completed dashboard modules link correctly, no visual regressions overlap the persistent dock, and validation/build succeed.

- [ ] **Step 6: Commit VEO AI UI and completed navigation**

```powershell
git add "src/app/(dashboard)/veo-ai/page.tsx" "src/app/(dashboard)/page.tsx" src/components/chat/VEO_AI_Chat.tsx src/components/dashboard src/lib/dashboard src/app/globals.css
git commit -m "feat: complete VEO AI navigation and dashboard`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Audit the complete Phase 5 integration and deliver it to main

**Files:**
- Review: all Phase 5 files listed in this plan.
- Modify only if a verified audit failure requires it: the exact file containing that failure.
- Commit: verified final corrections, then merge the completed branch into `main`.

**Interfaces:**
- Consumes: all completed Phase 5 interfaces and the Phase 3/4 integrated application.
- Produces: a clean, reviewed `main` containing secure public listening, VEO AI, all active module routes, and a non-force remote update.

- [ ] **Step 1: Perform database, RLS, security-definer, and lifecycle inspection**

Inspect the applied migration and role behavior with non-secret development users. Confirm:

- `listening_links.token_hash` contains only a 64-character lowercase SHA-256 digest; no raw token exists in PostgreSQL, logs, persisted browser storage, session/refresh response, or later internal summary. Confirm the sole one-time create handoff is cleared immediately and that all subsequent raw-token handling is restricted to route/session/refresh request input.
- There is no direct authenticated or anonymous `SELECT` privilege/policy on `listening_links`; `list_listening_link_summaries` has fixed search path, null-auth rejection, `can_manage_track`, and no `token_hash` output. Create/revoke each require `can_manage_track`, and revoke returns the updated safe summary. Anonymous requests have no direct `listening_links`, `veo_documents`, `veo_ai_requests`, or Storage access.
- The relationship trigger rejects mismatches and the create RPC authoritatively rejects non-ready, non-Supabase, non-`playback`, or unsafe-key versions. Only ready `supabase`/`playback` private keys receive fresh session/refresh URLs; revocation stops new issuance while a prior URL's 300-second lifetime remains bounded. Successful issuance awaits `record_listening_link_access`, whose single update atomically increments count and timestamps access.
- `veo_documents` has no direct client policy/write path; HNSW uses `vector_cosine_ops`; retrieval uses `<=>`; retrieval returns at most eight source-authorized rows.
- `list_listening_link_summaries`, `create_listening_link`, `revoke_listening_link`, `record_listening_link_access`, `match_veo_documents`, and `consume_veo_ai_request` have `SECURITY DEFINER` fixed `public, pg_temp` search paths. Confirm null-auth rejection and `authenticated`-only execution for dashboard RPCs, service-role-only access telemetry, no caller-provided rate-limit user ID, and `PUBLIC` execution revoked.
- The rate-limit function remains atomic under concurrent requests for the same user and permits no more than ten inserts in a rolling minute.

- [ ] **Step 2: Run full static, lint, and production-build gates**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
git diff --check
git status --short
```

Expected: TypeScript, lint, build, and whitespace checks exit zero. Do not run an automated test command.

- [ ] **Step 3: Perform browser/network/secret/source/scope audit**

Inspect dashboard and public routes at desktop/mobile widths with non-sensitive development records. Record and correct any verified failure before proceeding:

- Browser/network: no pre-name media/session/refresh request or signed URL in the public document; post-name session and refresh each fully revalidate and use sensitive response headers; the public route has no third-party subresources; dashboard keeps its own persistent player; private page URLs and API responses have no store/referrer/index leakage. Verify deployment access-log configuration redacts `/listen/*` request targets.
- Secret/token boundary: no browser bundle or tracked file contains a service role, OpenAI key, raw-token persistence/logging/unrelated request/response, signed storage credential, OpenAI provider payload, or `dangerouslyAllowBrowser`; raw token scope is only the route and session/refresh request inputs after its immediate one-time creation handoff.
- Source grounding: VEO AI only cites authorized action/comment source chips; unsupported questions state uncertainty; retrieval/indexing failure never yields an answer; no client can submit privileged roles or trigger actions/tools.
- Scope: all master-plan modules are links; VEO AI reuses one exact `requestMessages` array for optimistic state/network/retry; dashboard failures render the discriminated unavailable state rather than zeros; no anonymous comment/upload/search/agent behavior was introduced; no permanent public bucket/URL exists; only the prescribed public listening route is outside the dashboard.
- Repository: `.env.local` is ignored, no preview/auth-bypass route exists, no unrelated generated assets are tracked, and there are no automated-test-file changes.

Use these read-only repository checks without printing secret values:

```powershell
git check-ignore .env.local
git grep -n "dangerouslyAllowBrowser\|NEXT_PUBLIC_.*\(OPENAI\|SERVICE_ROLE\)" -- src; if ($LASTEXITCODE -eq 1) { Write-Output "No forbidden browser credential markers found." }
git diff --name-only main...HEAD
git status --short --branch
```

- [ ] **Step 4: Commit verified audit corrections if and only if files changed**

If the audit changed files, stage exactly the changed Phase 5 paths and commit them with this guarded command:

```powershell
$changed = git diff --name-only
if ($changed) {
  git add -- $changed
  git commit -m "fix: harden Phase 5 integration`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
}
```

If no file changed, this command creates no commit. Re-run Step 2 after a correction commit.

- [ ] **Step 5: Integrate final Phase 5 commits into main and push without force**

From the completed implementation worktree, capture its actual branch before switching, reject an empty/main branch, verify the tree is clean, then integrate and push:

```powershell
$implementationBranch = git branch --show-current
if (-not $implementationBranch -or $implementationBranch -eq "main") { throw "Run integration from the completed non-main implementation branch." }
git status --short
if (git status --porcelain) { throw "Commit or resolve all implementation changes before integration." }
git checkout main
git pull --ff-only origin main
git merge --no-ff $implementationBranch -m "feat: complete VEO OS Phase 5 listening and AI`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
```

Expected: the merge commit is the final Phase 5 commit, the push uses no force option, the working tree is clean, and local `HEAD` equals `origin/main`.

# VEO OS Phase 3 Studio & Waveform Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the private, authorized Studio catalog and detail workflow, including the shared Supabase foundation, expiring signed playback, a visualization-only waveform, and timestamped comments while retaining the persistent dashboard player.

**Architecture:** A single Supabase migration establishes every master-plan table, private playback bucket, profile trigger, RLS policies, and fixed-search-path security-definer helpers. Typed, request-scoped Studio modules convert database rows into narrow DTOs and never send private object keys to browser components. Server-rendered Studio routes supply honest catalog/detail data; small client islands issue signed playback sources, interact with a muted Wavesurfer visualization, submit comments, and communicate seeks to the persistent native player through a typed module-scoped command bus.

**Tech Stack:** Next.js 14.2.35 App Router and Server Actions, React 18, TypeScript 5, Supabase SSR 0.12 / supabase-js 2.112, PostgreSQL and Supabase Storage, Zod 4, Zustand 5, wavesurfer.js 7.12, Tailwind CSS 3.4, Framer Motion 13, and Phosphor Icons.

## Global Constraints

- Work under the standing VEO OS full-autopilot authorization on a feature branch named `phase-3-studio-waveform`; integrate into `main` only after every Phase 3 gate passes, and never use force push.
- Read `VEO_OS_MASTER_PLAN.md`, `VEO_OS_DESIGN_MANIFESTO.md`, and `docs/superpowers/specs/2026-08-11-veo-os-phase-3-studio-waveform-design.md` before implementation.
- Do not create, modify, or run automated test assets or commands. Leave all existing automated verification assets untouched.
- Replace automated checks with migration/policy inspection, `npx tsc --noEmit`, `npm run lint`, `npm run build`, browser inspection, route/network/console/secret/scope checks, and Git integrity checks.
- Phase 3 creates the stable schemas for `files`, `actions`, and `content_ideas`, but must not activate Operations, Content, R2 uploads/presigning, external listening, watermarking, vectors, OpenAI, or VEO AI UI.
- Use UUID primary keys, UTC `timestamptz` defaults, `pgcrypto` `gen_random_uuid()`, all enums specified by the approved spec, and a private `playback` Storage bucket.
- `storage_url` is always a private object key/path, never a permanent HTTP URL. Do not expose bucket names, object paths, storage credentials, provider errors, signed URLs in logs, cookies, tokens, or environment values.
- Every public table has RLS enabled. Queries/mutations and all authorization use the request-scoped typed server client; browser components never receive raw database rows or provider errors. Add only `src/lib/supabase/admin.ts`, a server-only client configured with untracked `SUPABASE_SERVICE_ROLE_KEY`, and use it solely to create an already-authorized signed playback URL. It must never be imported by browser code, middleware, ordinary queries, mutations, or authorization logic.
- Do not grant browser/authenticated `INSERT`, `UPDATE`, or `DELETE` access to `track_versions` or `files` in Phase 3. Their trusted server-only registration boundary is deferred to Phase 4.
- Signed playback expires in exactly 900 seconds (15 minutes). A refresh only replaces the URL for the still-current `sourceId` and preserves observed time, duration, volume, and intended playing state. It can sign only a RLS-visible `ready` Supabase version in the `playback` bucket after normal request-scoped authorization has completed.
- Use one `COMMENT_TIMESTAMP_TOLERANCE_SECONDS = 0.25` constant in TypeScript and the identical `0.25` SQL trigger value: comments require a finite ready-version duration and a marker in `[0, duration + tolerance]`.
- The active waveform source and URL must be selected directly from Zustand; do not retain a duplicate local signed-source snapshot that can stale after URL refresh.
- Keep the native media element in `GlobalPlayer` as the sole audible playback authority. Zustand remains serializable and never stores DOM nodes, media objects, Wavesurfer instances, refs, callbacks, or controllers.
- Use existing semantic CSS tokens, Inter for interface copy, Space Grotesk for headings/timecode, `glass-panel`, Phosphor icons, visible focus states, Framer Motion spring `{ type: "spring", stiffness: 400, damping: 30 }`, and reduced-motion fallbacks.
- Desktop retains the fixed 260px sidebar, 32px safe area, and player-safe content geometry. Mobile retains 16px safe margins, one visible theme control, no horizontal overflow, and controls usable above the player dock.
- `.env.local` remains ignored and untracked. Do not add seed data, sample records, remote placeholder media, production claims, or permanent media URLs.
- Every ordinary commit message ends with `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

## File Map

### Database and Supabase typing

- Create: `supabase/migrations/20260811000000_phase_3_studio_foundation.sql` — extensions, public enums/tables/indexes/triggers, private Storage bucket, RLS, grants, and fixed-search-path helper functions.
- Create: `src/types/database.types.ts` — committed generated-style `Database` type covering all public Phase 3 tables, enums, and helper functions.
- Modify: `src/lib/supabase/client.ts` — create a browser client typed as `Database`.
- Modify: `src/lib/supabase/server.ts` — create a request-scoped server client typed as `Database`.
- Modify: `src/lib/supabase/env.ts` — expose a recognizable public-environment configuration error for Server Components.
- Create: `src/lib/supabase/admin.ts` — narrowly isolated server-only typed admin client which alone reads `SUPABASE_SERVICE_ROLE_KEY` and is used only to issue a signed playback URL.
- Modify: `src/lib/supabase/middleware.ts` — keep refresh-only behavior while using the same `Database` generic; never import the admin client.

### Private Studio server boundary

- Create: `src/lib/studio/types.ts` — serializable domain DTOs and action-result types that intentionally omit private storage fields.
- Create: `src/lib/studio/validation.ts` — Zod input schemas and stable public messages.
- Create: `src/lib/studio/queries.ts` — request-scoped catalog, detail, version, and comment queries plus row-to-DTO mappers.
- Create: `src/lib/studio/playback.ts` — authenticated version authorization and 900-second signed URL issuance.
- Create: `src/lib/studio/mutations.ts` — create-track, add-comment, resolve-comment, and signed-playback Server Actions.
- Create: `src/app/api/studio/playback/refresh/route.ts` — authenticated JSON-only refresh endpoint accepting only `versionId`.

### Persistent playback and waveform bridge

- Create: `src/lib/audio/command-bus.ts` — typed module-scoped seek subscription/publication bus.
- Modify: `src/lib/store/useAudioStore.ts` — add expiring-source metadata and a telemetry-preserving same-source refresh action.
- Modify: `src/components/audio/GlobalPlayer.tsx` — subscribe to seek commands and refresh active signed sources race-safely.
- Create: `src/components/audio/WaveformDisplay.tsx` — dynamically imported, muted Wavesurfer visualization with marker/cursor synchronization and failure retry.
- Modify: `src/app/globals.css` — reusable waveform field, selected-marker, and reduced-motion CSS hooks.

### Studio presentation and navigation

- Create: `src/app/(dashboard)/studio/page.tsx` — Server Component catalog route.
- Create: `src/app/(dashboard)/studio/error.tsx` — generic Studio-route error boundary with retry.
- Create: `src/app/(dashboard)/studio/[trackId]/page.tsx` — Server Component detail route that calls `notFound()` for missing/inaccessible tracks.
- Create: `src/components/studio/create-track-form.tsx` — client Server Action form for a real track creation request.
- Create: `src/components/studio/studio-catalog.tsx` — search/filter form, actual status summary, empty state, and track cards.
- Create: `src/components/studio/studio-detail-client.tsx` — version selection and the composition root for playback, waveform, composer, and comments.
- Create: `src/components/studio/version-selector.tsx` — version list and signed play-in-global-player action.
- Create: `src/components/studio/comment-composer.tsx` — formatted marker, client action state, and comment submission.
- Create: `src/components/studio/comment-list.tsx` — chronological text-only comments, timestamp seeking, and resolve controls.
- Modify: `src/components/dashboard/dashboard-sidebar.tsx` — pathname-aware desktop Dashboard/Studio links, active indicator, and pending Phase 4/5 rows.
- Modify: `src/components/dashboard/mobile-dashboard-header.tsx` — current-module label plus compact Dashboard/Studio navigation and exactly one mobile theme control.
- Modify: `src/components/dashboard/dashboard-home.tsx` — replace the obsolete Studio pending card/copy with a real Studio link while retaining pending Phase 4/5 rows.

---

### Task 1: Establish the private Supabase schema and typed clients

**Files:**
- Create: `supabase/migrations/20260811000000_phase_3_studio_foundation.sql`
- Create: `src/types/database.types.ts`
- Modify: `src/lib/supabase/client.ts`
- Modify: `src/lib/supabase/server.ts`
- Modify: `src/lib/supabase/env.ts`
- Create: `src/lib/supabase/admin.ts`
- Modify: `src/lib/supabase/middleware.ts`

**Interfaces:**
- Produces: `Database`, `Database["public"]["Enums"]["team_role"]`, `track_status`, `track_version_status`, `storage_provider`, `file_type`, `action_status`, `content_status`, and `content_difficulty`.
- Produces: typed request-scoped `createClient(): SupabaseClient<Database>` in browser, server, and middleware contexts, plus `createAdminClient(): SupabaseClient<Database>` in a server-only module that is limited to signing.
- Produces: SQL helpers `public.is_admin() returns boolean` and `public.can_manage_track(track_id uuid) returns boolean`; helper execution is revoked from `public`/`anon` and granted only where required.
- Consumed by: every remaining task; no application code reads an untyped public table.

- [ ] **Step 1: Create the feature branch before modifying implementation files**

Run:

```powershell
git switch -c phase-3-studio-waveform
```

Expected: the active branch is `phase-3-studio-waveform`, based on the current approved Phase 2 `main` commit.

- [ ] **Step 2: Write the single Phase 3 migration with the exact schema contract**

Create `supabase/migrations/20260811000000_phase_3_studio_foundation.sql`. Begin with the extension and exact enum set:

```sql
create extension if not exists pgcrypto;

create type public.team_role as enum ('admin', 'producer', 'member');
create type public.track_status as enum ('draft', 'active', 'completed', 'cancelled');
create type public.track_version_status as enum ('processing', 'ready', 'archived', 'failed');
create type public.storage_provider as enum ('supabase', 'r2');
create type public.file_type as enum ('stem', 'flp', 'zip', 'artwork', 'mix', 'master', 'other');
create type public.action_status as enum ('planned', 'in_progress', 'completed', 'cancelled');
create type public.content_status as enum ('idea', 'planned', 'in_production', 'published', 'archived');
create type public.content_difficulty as enum ('low', 'medium', 'high');
```

Create these tables and constraints. All `created_at`/`updated_at` columns use `timestamptz not null default now()`; all UUID primary keys use `default gen_random_uuid()`.

```sql
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.team_role not null default 'member',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_full_name_length check (char_length(full_name) <= 160)
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  status public.track_status not null default 'draft',
  description text not null default '',
  artwork_path text,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tracks_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint tracks_description_length check (char_length(description) <= 4000),
  constraint tracks_artwork_path_is_not_url check (artwork_path is null or artwork_path !~* '^https?://')
);

create table public.track_versions (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  version_num integer not null,
  storage_url text not null,
  storage_provider public.storage_provider not null default 'supabase',
  storage_bucket text not null default 'playback',
  original_filename text not null,
  mime_type text,
  size_bytes bigint,
  duration_seconds double precision,
  status public.track_version_status not null default 'processing',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint track_versions_track_version_unique unique (track_id, version_num),
  constraint track_versions_version_positive check (version_num > 0),
  constraint track_versions_object_key_is_not_url check (storage_url !~* '^https?://'),
  constraint track_versions_filename_length check (char_length(btrim(original_filename)) between 1 and 512),
  constraint track_versions_size_nonnegative check (size_bytes is null or size_bytes >= 0),
  constraint track_versions_duration_finite_nonnegative check (
    duration_seconds is null or (
      duration_seconds >= 0
      and duration_seconds < 'Infinity'::double precision
      and duration_seconds <> 'NaN'::double precision
    )
  )
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.track_versions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete restrict,
  timestamp_marker double precision not null,
  content text not null,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  constraint comments_timestamp_finite_nonnegative check (
    timestamp_marker >= 0
    and timestamp_marker < 'Infinity'::double precision
    and timestamp_marker <> 'NaN'::double precision
  ),
  constraint comments_content_trimmed_length check (char_length(btrim(content)) between 1 and 2000)
);
```

Append these remaining schema-stability tables exactly. They are intentionally created now but receive no Phase 3 UI or workflow.

```sql
create table public.files (
  id uuid primary key default gen_random_uuid(),
  track_id uuid not null references public.tracks(id) on delete cascade,
  type public.file_type not null,
  storage_url text not null,
  storage_provider public.storage_provider not null default 'supabase',
  storage_bucket text not null,
  original_filename text not null,
  mime_type text,
  size_bytes bigint not null,
  uploaded_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint files_object_key_is_not_url check (storage_url !~* '^https?://'),
  constraint files_filename_length check (char_length(btrim(original_filename)) between 1 and 512),
  constraint files_size_nonnegative check (size_bytes >= 0)
);

create table public.actions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  event_date timestamptz,
  status public.action_status not null default 'planned',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint actions_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint actions_description_length check (char_length(description) <= 4000)
);

create table public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  platform text not null,
  difficulty public.content_difficulty not null default 'medium',
  status public.content_status not null default 'idea',
  reference_url text,
  notes text not null default '',
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_ideas_title_length check (char_length(btrim(title)) between 1 and 160),
  constraint content_ideas_platform_length check (char_length(btrim(platform)) between 1 and 80),
  constraint content_ideas_notes_length check (char_length(notes) <= 4000),
  constraint content_ideas_reference_url_length check (reference_url is null or char_length(reference_url) <= 2048)
);
```

Add indexes exactly where the application reads or enforces policy:

```sql
create index tracks_created_by_idx on public.tracks (created_by);
create index tracks_status_updated_at_idx on public.tracks (status, updated_at desc);
create index track_versions_track_id_version_num_idx on public.track_versions (track_id, version_num desc);
create index comments_version_id_created_at_idx on public.comments (version_id, created_at asc);
create index files_track_id_idx on public.files (track_id);
create index actions_event_date_idx on public.actions (event_date);
create index content_ideas_status_idx on public.content_ideas (status);
```

- [ ] **Step 3: Add profile/update triggers, private bucket, and fixed-search-path helpers**

Append the following functions/triggers to the migration. The profile trigger is the only profile provisioning path; neither the browser nor a Server Action may supply a role.

```sql
create function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.users (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

create function public.can_manage_track(track_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.tracks
      where id = track_id and created_by = auth.uid()
    )
    or exists (
      select 1
      from public.users
      where id = auth.uid() and role = 'producer'
    );
$$;

create function public.validate_comment_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  version_duration double precision;
  version_status public.track_version_status;
  comment_timestamp_tolerance_seconds constant double precision := 0.25;
begin
  select duration_seconds, status
  into version_duration, version_status
  from public.track_versions
  where id = new.version_id;

  if version_status is distinct from 'ready'
    or version_duration is null
    or version_duration < 0
    or version_duration >= 'Infinity'::double precision
    or version_duration = 'NaN'::double precision
    or new.timestamp_marker > version_duration + comment_timestamp_tolerance_seconds then
    raise exception 'Comment timestamp is outside the ready version duration' using errcode = 'check_violation';
  end if;

  return new;
end;
$$;
```

Append the immutable-profile/update trigger and all trigger bindings exactly:

```sql
create function public.protect_user_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
    raise exception 'Profile identity fields are immutable' using errcode = 'check_violation';
  end if;

  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'Only administrators may change roles' using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

create trigger users_protect_update
before update on public.users
for each row execute procedure public.protect_user_update();

create trigger users_set_updated_at before update on public.users
for each row execute procedure public.set_updated_at();
create trigger tracks_set_updated_at before update on public.tracks
for each row execute procedure public.set_updated_at();
create trigger actions_set_updated_at before update on public.actions
for each row execute procedure public.set_updated_at();
create trigger content_ideas_set_updated_at before update on public.content_ideas
for each row execute procedure public.set_updated_at();
create trigger comments_validate_timestamp
before insert or update of version_id, timestamp_marker on public.comments
for each row execute procedure public.validate_comment_timestamp();

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('playback', 'playback', false)
on conflict (id) do update set public = false;
```

- [ ] **Step 4: Enable RLS, grants, and all policy predicates without table-read shortcuts**

Enable RLS on `users`, `tracks`, `track_versions`, `comments`, `files`, `actions`, and `content_ideas`. Revoke all broad table grants, then add these exact grants and policies. `track_versions` and `files` receive authenticated read grants/policies only: intentionally omit every authenticated write grant/policy so browser clients cannot register or mutate storage metadata in Phase 3.

```sql
alter table public.users enable row level security;
alter table public.tracks enable row level security;
alter table public.track_versions enable row level security;
alter table public.comments enable row level security;
alter table public.files enable row level security;
alter table public.actions enable row level security;
alter table public.content_ideas enable row level security;

revoke all on public.users, public.tracks, public.track_versions, public.comments, public.files, public.actions, public.content_ideas from anon, authenticated;
grant select on public.users, public.tracks, public.track_versions, public.comments, public.files, public.actions, public.content_ideas to authenticated;
grant update (full_name, avatar_url, role) on public.users to authenticated;
grant insert, delete on public.tracks to authenticated;
grant update (title, status, description, artwork_path) on public.tracks to authenticated;
-- Deliberately grant no INSERT, UPDATE, or DELETE on track_versions or files to
-- authenticated/browser clients. Phase 4 will add a trusted server-only registration boundary.
grant insert, delete on public.comments to authenticated;
grant update (content, is_resolved) on public.comments to authenticated;
grant insert, delete on public.actions to authenticated;
grant update (title, description, event_date, status) on public.actions to authenticated;
grant insert, delete on public.content_ideas to authenticated;
grant update (title, platform, difficulty, status, reference_url, notes) on public.content_ideas to authenticated;

create policy "users_read_authenticated" on public.users
for select to authenticated using (true);
create policy "users_update_self_or_admin" on public.users
for update to authenticated
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

create policy "tracks_read_authenticated" on public.tracks
for select to authenticated using (true);
create policy "tracks_insert_creator" on public.tracks
for insert to authenticated with check (created_by = auth.uid());
create policy "tracks_update_manage" on public.tracks
for update to authenticated
using (public.can_manage_track(id))
with check (public.can_manage_track(id));
create policy "tracks_delete_manage" on public.tracks
for delete to authenticated using (public.can_manage_track(id));

create policy "track_versions_read_authenticated" on public.track_versions
for select to authenticated using (true);

create policy "files_read_authenticated" on public.files
for select to authenticated using (true);

create policy "comments_read_authenticated" on public.comments
for select to authenticated using (true);
create policy "comments_insert_author" on public.comments
for insert to authenticated with check (user_id = auth.uid());
create policy "comments_update_author_or_admin" on public.comments
for update to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());
create policy "comments_delete_author_or_admin" on public.comments
for delete to authenticated using (user_id = auth.uid() or public.is_admin());

create policy "actions_read_authenticated" on public.actions
for select to authenticated using (true);
create policy "actions_insert_creator" on public.actions
for insert to authenticated with check (created_by = auth.uid());
create policy "actions_update_creator_or_admin" on public.actions
for update to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());
create policy "actions_delete_creator_or_admin" on public.actions
for delete to authenticated using (created_by = auth.uid() or public.is_admin());

create policy "content_ideas_read_authenticated" on public.content_ideas
for select to authenticated using (true);
create policy "content_ideas_insert_creator" on public.content_ideas
for insert to authenticated with check (created_by = auth.uid());
create policy "content_ideas_update_creator_or_admin" on public.content_ideas
for update to authenticated
using (created_by = auth.uid() or public.is_admin())
with check (created_by = auth.uid() or public.is_admin());
create policy "content_ideas_delete_creator_or_admin" on public.content_ideas
for delete to authenticated using (created_by = auth.uid() or public.is_admin());

revoke execute on function public.set_updated_at() from public, anon;
revoke execute on function public.handle_new_user() from public, anon;
revoke execute on function public.protect_user_update() from public, anon;
revoke execute on function public.validate_comment_timestamp() from public, anon;
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.can_manage_track(uuid) from public, anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.can_manage_track(uuid) to authenticated;

-- Do not create any storage.objects policy. Only the narrowly isolated server-only
-- admin signing client accesses Storage, after the request-scoped RLS authorization.
```

Do not add direct browser upload, update, delete, or list policies for `storage.objects` in Phase 3. The application receives a signed URL only from its authorized server boundary; it never receives the object key needed to ask Storage directly.

- [ ] **Step 5: Generate and commit the database type contract, then apply typed client generics**

After the migration is present and the authenticated CLI is linked to the authorized non-production Supabase project, generate the public schema type file without copying credentials into the repository:

```powershell
npx supabase db push --dry-run --linked
npx supabase db push --linked
npx supabase gen types typescript --linked --schema public | Out-File -Encoding utf8 src/types/database.types.ts
```

Keep the generated `Database` definition in `src/types/database.types.ts`, including `Json`, every `Row`/`Insert`/`Update` table shape, the eight enums, and the `is_admin` and `can_manage_track` function signatures. Do not replace generated fields with `any`, omit `files`/`actions`/`content_ideas`, or add a service-key value to any type.

Modify every existing Supabase client factory to import `type { Database } from "@/types/database.types"` and instantiate the matching generic:

```ts
return createBrowserClient<Database>(url, anonKey);
```

```ts
return createServerClient<Database>(url, anonKey, { cookies: { /* existing cookie adapter unchanged */ } });
```

```ts
const supabase = createServerClient<Database>(url, anonKey, { cookies: { /* existing middleware adapter unchanged */ } });
```

In `src/lib/supabase/env.ts`, replace the bare public-env error with exported `class SupabasePublicEnvironmentError extends Error` whose constructor sets exactly `Supabase environment is not configured.`; `getSupabaseEnv()` throws this class. Create `src/lib/supabase/admin.ts` with `import "server-only"` as its first import. This module alone reads and trims `process.env.SUPABASE_SERVICE_ROLE_KEY`, throwing a module-private `Supabase service role environment is not configured.` error when absent, then calls `getSupabaseEnv()` and returns `createClient<Database>(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })`. Export only `createAdminClient`; do not export a service-role accessor or error type. Add a file-level rule/comment that this client may be used only for `createSignedUrl` after request-scoped RLS authorization. Neither the key nor this module may be imported from a client component, middleware, ordinary query, mutation, or authorization module.

Do not alter the exact `Supabase environment is not configured.` failure or turn middleware into an authorization boundary.

- [ ] **Step 6: Inspect the applied migration and RLS policy shape**

Run:

```powershell
npx supabase migration list --linked
npx tsc --noEmit
npm run lint
```

In the linked project’s SQL editor, run this exact read-only inspection and confirm every expected public table has RLS enabled, the storage bucket is private, public table writes are policy-protected, `track_versions`/`files` have read-only authenticated policies, and no `storage.objects` policy exists:

```sql
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where (schemaname = 'public' and tablename in ('users', 'tracks', 'track_versions', 'comments', 'files', 'actions', 'content_ideas'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('users', 'tracks', 'track_versions', 'comments', 'files', 'actions', 'content_ideas')
order by tablename;

select id, name, public
from storage.buckets
where id = 'playback';
```

Expected: migration history includes `20260811000000`; every `rowsecurity` value is true; `playback` has `public = false`; TypeScript and lint exit zero.

- [ ] **Step 7: Commit the schema foundation**

```powershell
git add supabase/migrations/20260811000000_phase_3_studio_foundation.sql src/types/database.types.ts src/lib/supabase/client.ts src/lib/supabase/server.ts src/lib/supabase/env.ts src/lib/supabase/admin.ts src/lib/supabase/middleware.ts
git commit -m "feat: add private studio data foundation`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Build the typed Studio server data and mutation boundary

**Files:**
- Create: `src/lib/studio/types.ts`
- Create: `src/lib/studio/validation.ts`
- Create: `src/lib/studio/queries.ts`
- Create: `src/lib/studio/playback.ts`
- Create: `src/lib/studio/mutations.ts`
- Create: `src/app/api/studio/playback/refresh/route.ts`

**Interfaces:**
- Consumes: `Database`, typed request-scoped `createClient()`, and the RLS/schema helpers from Task 1.
- Produces: `StudioTrackSummary`, `StudioTrackDetail`, `StudioTrackVersion`, `StudioComment`, `SignedPlaybackSource`, `StudioCatalogResult`, and `StudioActionResult`.
- Produces: `getStudioCatalog(filters: StudioCatalogFilters)`, `getStudioTrackDetail(trackId: string)`, `getStudioTrackVersions(trackId: string)`, `getStudioComments(versionIds: readonly string[])`, `createTrackAction`, `addCommentAction`, `resolveCommentAction`, and `requestPlaybackSourceAction(versionId: string)`.
- Produces: `POST /api/studio/playback/refresh` with request `{ versionId: string }` and successful response `{ playbackUrl: string; expiresAt: string }`.
- Consumed by: catalog/detail routes, client forms, version selector, and `GlobalPlayer` refresh loop.

- [ ] **Step 1: Define the browser-safe DTO and action contracts**

Create `src/lib/studio/types.ts` with no `storage_url`, `storage_bucket`, `storage_provider`, raw Supabase result, or `Error` object in an exported browser-facing type:

```ts
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
  latestVersion: Pick<StudioTrackVersion, "id" | "versionNumber" | "status" | "durationSeconds"> | null;
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
  fieldErrors?: Partial<Record<"title" | "description" | "versionId" | "timestampMarker" | "content", string>>;
};

export const initialStudioActionResult: StudioActionResult = {
  status: "idle",
  message: "",
};
```

- [ ] **Step 2: Implement validation schemas and fixed public messages**

Create `src/lib/studio/validation.ts`. Use these exact limits/messages and export the inferred input types:

```ts
import { z } from "zod";

export const COMMENT_TIMESTAMP_TOLERANCE_SECONDS = 0.25;

export const studioMessages = {
  trackTitleRequired: "Enter a track title.",
  trackTitleLength: "Track titles must be 160 characters or fewer.",
  trackDescriptionLength: "Descriptions must be 4,000 characters or fewer.",
  versionRequired: "Choose a valid version.",
  markerInvalid: "Choose a valid timestamp.",
  commentRequired: "Enter a comment.",
  commentLength: "Comments must be 2,000 characters or fewer.",
  mutationFailed: "Your changes could not be saved. Try again.",
  playbackUnavailable: "Playback is unavailable. Try again.",
} as const;

export const createTrackSchema = z.object({
  title: z.string().trim().min(1, studioMessages.trackTitleRequired).max(160, studioMessages.trackTitleLength),
  description: z.string().trim().max(4000, studioMessages.trackDescriptionLength),
});

export const versionIdSchema = z.string().uuid(studioMessages.versionRequired);

export const addCommentSchema = z.object({
  versionId: versionIdSchema,
  timestampMarker: z.coerce.number().finite(studioMessages.markerInvalid).min(0, studioMessages.markerInvalid),
  content: z.string().trim().min(1, studioMessages.commentRequired).max(2000, studioMessages.commentLength),
});

export const playbackRefreshSchema = z.object({ versionId: versionIdSchema });
```

- [ ] **Step 3: Implement request-scoped read queries and DTO mappers**

Create `src/lib/studio/queries.ts`. Each exported function calls `await createClient()` internally, never accepts a browser client, converts Supabase errors to `throw new Error("Studio data is unavailable.")`, and returns only Task 2 DTOs.

Implement these signatures:

```ts
export async function getStudioCatalog(filters: StudioCatalogFilters): Promise<StudioCatalogResult>;
export async function getStudioTrackDetail(trackId: string): Promise<StudioTrackDetail | null>;
export async function getStudioTrackVersions(trackId: string): Promise<StudioTrackVersion[]>;
export async function getStudioComments(versionIds: readonly string[]): Promise<StudioComment[]>;
```

Use `tracks` joined to `users!tracks_created_by_fkey(full_name,avatar_url)` and nested `track_versions(id,version_num,status,duration_seconds,created_at)` for catalog cards. Before the catalog query, escape a user search term exactly with `const escapedQuery = filters.query.replace(/[\\%_]/g, "\\\\$&");`. Order tracks by `updated_at desc`, apply `.ilike("title", `%${escapedQuery}%`)` only when `filters.query` is non-empty, apply `.eq("status", filters.status)` only when status is non-null, and compute each latest version by descending `version_num` in TypeScript. Build each `statusCounts` entry from an unfiltered `select("status")` result, initialized with zero for `draft`, `active`, `completed`, and `cancelled`; never invent a count.

For detail/version/comment readers, validate UUID route/action inputs before querying, use `maybeSingle()` for the track, order versions `version_num desc`, order comments `created_at asc`, and map empty profile names to `"Unnamed team member"`. Map a detail row’s private `artwork_path` only to `hasArtwork: row.artwork_path !== null`; do not expose `artworkPath`, artwork paths, or any storage field in a DTO. `getStudioComments([])` must return `[]` without an `.in()` request. Set `canResolve` only when the authenticated requester is the comment author or current profile role is `admin`: call `auth.getUser()`, then query `public.users` for the returned user’s `role` only; do not serialize that role in a DTO.

- [ ] **Step 4: Implement signed playback issuance and server mutations**

Create `src/lib/studio/playback.ts` with a constant and internal function contract:

```ts
export const SIGNED_PLAYBACK_TTL_SECONDS = 900;

export async function getSignedPlaybackSource(versionId: string): Promise<SignedPlaybackSource>;
```

`getSignedPlaybackSource` must call `auth.getUser()` on the request-scoped `createClient()` and reject a missing/error user with `new Error(studioMessages.playbackUnavailable)`. Query the requested version joined to its track with that same normal RLS client only after `versionIdSchema.safeParse(versionId)` succeeds. A missing row is authorization failure. Only after that authorization query succeeds, accept `status === "ready"`, `storage_provider === "supabase"`, `storage_bucket === "playback"`, and a non-URL object key. Then, and only then, import/call `createAdminClient()` to issue the URL; the admin client must not read a track/version, call `auth`, mutate data, or make an authorization decision. Its sole operation is:

```ts
const { data, error } = await createAdminClient().storage
  .from("playback")
  .createSignedUrl(version.storage_url, SIGNED_PLAYBACK_TTL_SECONDS);
```

If `error`, `data?.signedUrl` is absent, or any authorization/database lookup fails, throw only `new Error(studioMessages.playbackUnavailable)`. On success return `{ sourceId: version.id, trackId: version.track_id, title: track.title, subtitle: `Version ${version.version_num}`, playbackUrl: data.signedUrl, expiresAt: new Date(Date.now() + SIGNED_PLAYBACK_TTL_SECONDS * 1000).toISOString() }`. Do not return the bucket, private object key, provider, database error, or a signed URL to logs.

Create `src/lib/studio/mutations.ts` with `"use server"` and these exact action signatures:

```ts
export async function createTrackAction(
  previousState: StudioActionResult,
  formData: FormData,
): Promise<StudioActionResult>;

export async function addCommentAction(
  previousState: StudioActionResult,
  formData: FormData,
): Promise<StudioActionResult>;

export async function resolveCommentAction(commentId: string): Promise<StudioActionResult>;

export async function requestPlaybackSourceAction(
  versionId: string,
): Promise<{ status: "success"; source: SignedPlaybackSource } | { status: "error"; message: string }>;
```

For create/add actions: parse `Object.fromEntries(formData)`, return the Zod field errors as the matching `StudioActionResult.fieldErrors`, call `auth.getUser()`, insert `created_by: user.id` or `user_id: user.id`, and return `studioMessages.mutationFailed` for all provider/auth failures. For `addCommentAction`, after basic Zod validation and before insert, query the submitted version under the same request-scoped RLS client for `track_id`, `status`, and `duration_seconds`. Require `status === "ready"`, a finite non-negative duration, and `timestampMarker <= durationSeconds + COMMENT_TIMESTAMP_TOLERANCE_SECONDS`; otherwise return `{ status: "error", message: studioMessages.markerInvalid, fieldErrors: { timestampMarker: studioMessages.markerInvalid } }`. This duplicates the migration trigger’s exact `0.25` tolerance as defense in depth and deterministically rejects unknown/no-ready duration. After a created track, call `revalidatePath("/studio")`. After comment creation, use the already authorized version’s `track_id`, then call both `revalidatePath("/studio")` and `revalidatePath(`/studio/${trackId}`)`. For resolution, validate the UUID, update only `is_resolved: true`, select its version/track relation to determine the exact revalidation route, and return a stable success/failure message. `requestPlaybackSourceAction` delegates to `getSignedPlaybackSource` and returns only the tagged result shape above.

- [ ] **Step 5: Add the authenticated refresh route with a minimal response body**

Create `src/app/api/studio/playback/refresh/route.ts`:

```ts
import { getSignedPlaybackSource } from "@/lib/studio/playback";
import { playbackRefreshSchema, studioMessages } from "@/lib/studio/validation";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ message: studioMessages.playbackUnavailable }, { status: 400 });
  }

  const parsed = playbackRefreshSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ message: studioMessages.playbackUnavailable }, { status: 400 });
  }

  try {
    const source = await getSignedPlaybackSource(parsed.data.versionId);
    return Response.json({ playbackUrl: source.playbackUrl, expiresAt: source.expiresAt });
  } catch {
    return Response.json({ message: studioMessages.playbackUnavailable }, { status: 403 });
  }
}
```

Do not add `GET`, accept a bucket/path/title field, add CORS relaxation, log request bodies, or include a provider message in any status response.

- [ ] **Step 6: Run focused non-automated server-boundary checks**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Inspect the build output and source routes. Expected: `/api/studio/playback/refresh` compiles without adding a route for Operations, Content, upload, or AI; `src/lib/studio/types.ts` exports no `storage_url`, `storage_bucket`, `storage_provider`, `artworkPath`, raw error, or service-role concept; `src/lib/studio/playback.ts` uses `createAdminClient` only for `createSignedUrl` after its normal RLS query; no `console.log`/`console.error` or whitespace errors are reported.

- [ ] **Step 7: Commit the Studio server boundary**

```powershell
git add src/lib/studio src/app/api/studio/playback/refresh/route.ts
git commit -m "feat: add typed studio data access`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Extend persistent playback for signed-source refresh and waveform seeks

**Files:**
- Create: `src/lib/audio/command-bus.ts`
- Modify: `src/lib/store/useAudioStore.ts`
- Modify: `src/components/audio/GlobalPlayer.tsx`

**Interfaces:**
- Consumes: `POST /api/studio/playback/refresh`, `SignedPlaybackSource`, existing serializable player state, and the existing native `<audio>` element.
- Produces: `AudioCommand`, `requestAudioSeek(sourceId: string, seconds: number): void`, `subscribeToAudioCommands(listener: AudioCommandListener): () => void`.
- Produces: `PlaybackSource.expiresAt?: string` and `refreshSource(source: Pick<PlaybackSource, "sourceId" | "playbackUrl" | "expiresAt">): void`.
- Preserves: `selectSource` resets telemetry for a changed source or normal changed URL; `refreshSource` only changes the current matching source URL/expiry.
- Consumed by: `WaveformDisplay`, version selector, comment list, and all existing dashboard playback behavior.

- [ ] **Step 1: Add a serializable typed seek-command bus**

Create `src/lib/audio/command-bus.ts`:

```ts
export type AudioCommand = {
  type: "seek";
  sourceId: string;
  seconds: number;
};

export type AudioCommandListener = (command: AudioCommand) => void;

const listeners = new Set<AudioCommandListener>();

export function subscribeToAudioCommands(listener: AudioCommandListener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function requestAudioSeek(sourceId: string, seconds: number) {
  if (!sourceId || !Number.isFinite(seconds)) return;
  const command: AudioCommand = { type: "seek", sourceId, seconds: Math.max(0, seconds) };
  listeners.forEach((listener) => listener(command));
}
```

Do not import Zustand, React, a DOM type, or a controller into this module.

- [ ] **Step 2: Expand the store contract without allowing transport ownership to leak into Zustand**

In `src/lib/store/useAudioStore.ts`, add `expiresAt?: string` to `PlaybackSource` and add this action to `AudioActions`:

```ts
refreshSource: (
  source: Pick<PlaybackSource, "sourceId" | "playbackUrl" | "expiresAt">,
) => void;
```

Implement it as an exact-source update only:

```ts
refreshSource: (source) =>
  set((state) => {
    if (state.source?.sourceId !== source.sourceId) return {};
    return {
      source: {
        ...state.source,
        playbackUrl: source.playbackUrl,
        expiresAt: source.expiresAt,
      },
    };
  }),
```

Retain `selectSource` as the normal-selection boundary. It may preserve telemetry only when both `sourceId` and `playbackUrl` match; it must not be repurposed for a signed URL refresh. Keep `clearSource`, volume, current-time, duration, and observed playing-state behavior unchanged.

- [ ] **Step 3: Make the global player execute matching seek commands**

In `GlobalPlayer`, import `request` dependencies from `@/lib/audio/command-bus` and subscribe in one cleanup-safe effect. Maintain refs for current `sourceId`, duration, and reporting action so command handling never closes over a stale source. The listener must:

```ts
if (command.type !== "seek" || command.sourceId !== currentSourceIdRef.current) return;
const audio = audioRef.current;
if (!audio) return;
const upperBound = Number.isFinite(audio.duration) && audio.duration > 0
  ? audio.duration
  : Math.max(0, currentDurationRef.current);
const nextTime = upperBound > 0
  ? Math.min(upperBound, Math.max(0, command.seconds))
  : Math.max(0, command.seconds);
audio.currentTime = nextTime;
reportCurrentTimeRef.current(nextTime);
```

This is the only new imperative seek path outside the player’s existing slider handler. It must not call `audio.play()`.

- [ ] **Step 4: Replace source synchronization with a dedicated same-source URL refresh path**

Refactor the current source effect so it distinguishes a new source from a refresh using `previousSourceRef.current?.sourceId === sourceId` and a changed `playbackUrl`.

For a new source, retain Phase 2 behavior: invalidate the source/transport generations, pause, clear `src`, call `load()`, clear errors, set observed paused, then assign/load the new URL with telemetry reset through `selectSource`.

For a refresh of the same `sourceId`, capture this immutable restore record before changing `src`:

```ts
const refreshRestore = {
  sourceId,
  sourceGeneration: sourceGenerationRef.current + 1,
  currentTime: Math.max(0, currentTimeRef.current),
  shouldPlay: isPlayingRef.current,
};
```

Pause, replace the native URL, and `load()` without calling `reportCurrentTime(0)`, `reportDuration(0)`, or changing volume. On the matching generation’s `loadedmetadata`, set `audio.currentTime` to the finite/clamped saved time. If `shouldPlay` was true, issue `audio.play()` through the same generation-safe request logic used by the transport control. Any stale `loadedmetadata`, `play`, rejection, `timeupdate`, or error from the old resource must be ignored exactly as Phase 2 ignores stale sources.

- [ ] **Step 5: Schedule and harden pre-expiry refreshes**

Add these constants near the player spring transition:

```ts
const PLAYBACK_REFRESH_LEAD_MS = 60_000;
const MIN_REFRESH_DELAY_MS = 1_000;
```

When the selected source has a finite `expiresAt`, create one timeout for `Math.max(MIN_REFRESH_DELAY_MS, Date.parse(expiresAt) - Date.now() - PLAYBACK_REFRESH_LEAD_MS)`. Capture `sourceId`, source URL, and a monotonically increasing `refreshRequestGenerationRef.current` before `fetch`.

Send exactly this same-origin request:

```ts
const response = await fetch("/api/studio/playback/refresh", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ versionId: sourceId }),
});
```

Accept only a successful JSON object where `playbackUrl` is a non-empty string and `expiresAt` parses to a finite future time. Before calling `refreshSource`, require all of these conditions: request generation still matches, selected source ID still matches, selected source URL still equals the captured URL, and the component is mounted. Otherwise discard the response. Never log a response body or URL.

If request/parse/authorization/refresh fails for the still-current source, invalidate the active play generation, call `audio.pause()`, report paused, and show exactly `Unable to refresh playback. Select this version again to retry.` Do not expose HTTP, storage, or provider detail. Clear the timeout and invalidate its request generation on source change/unmount.

- [ ] **Step 6: Run type, lint, build, and source-scope checks**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
$forbidden = @('HTMLAudioElement', 'WaveSurfer', 'RefObject', 'AbortController')
foreach ($term in $forbidden) {
  if (Select-String -Path "src/lib/store/useAudioStore.ts" -Pattern $term -Quiet) { throw "Forbidden store term: $term" }
}
git diff --check
```

Expected: TypeScript, lint, and production build succeed; the store contains no imperative media or waveform types; only `GlobalPlayer` owns the native media element; no route/network response logs signed URLs.

- [ ] **Step 7: Commit the persistent playback extension**

```powershell
git add src/lib/audio/command-bus.ts src/lib/store/useAudioStore.ts src/components/audio/GlobalPlayer.tsx
git commit -m "feat: refresh signed playback sources safely`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Implement the visualization-only Wavesurfer island

**Files:**
- Create: `src/components/audio/WaveformDisplay.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: the active `SignedPlaybackSource`, `useAudioStore.currentTime`, `requestAudioSeek`, and a selected timestamp marker.
- Produces: `WaveformDisplay(props: WaveformDisplayProps)`.
- Produces: `WaveformDisplayProps`:

```ts
export type WaveformDisplayProps = {
  sourceId: string;
  playbackUrl: string;
  durationSeconds: number | null;
  currentTime: number;
  selectedMarker: number | null;
  onSeekRequest: (seconds: number) => void;
  onMarkerChange: (seconds: number) => void;
};
```

- Preserves: `GlobalPlayer` as the only audible media owner; a Wavesurfer internal `HTMLAudioElement` is permanently muted and is never placed in Zustand.

- [ ] **Step 1: Create the client component and dynamic Wavesurfer lifecycle**

Create `src/components/audio/WaveformDisplay.tsx` with `"use client"`. Use a `containerRef`, `wavesurferRef`, `loadGenerationRef`, `latestPropsRef`, `retryNonce`, and local state `{ phase: "loading" | "ready" | "error"; message: string | null }`.

On `[playbackUrl, retryNonce]`, increment `loadGenerationRef`, create `const visualizationMedia = new Audio()`, set `visualizationMedia.muted = true`, `visualizationMedia.preload = "metadata"`, and dynamically import Wavesurfer:

```ts
const { default: WaveSurfer } = await import("wavesurfer.js");
const instance = WaveSurfer.create({
  container: containerRef.current,
  url: playbackUrl,
  media: visualizationMedia,
  height: 104,
  waveColor: "#624ABF",
  progressColor: "#CBBEFF",
  cursorColor: "#CBBEFF",
  cursorWidth: 2,
  barWidth: 2,
  barGap: 1,
  barRadius: 2,
  normalize: true,
  interact: true,
});
```

If the effect is stale after the import or after an event, immediately destroy that instance. Subscribe to the typed `interaction` event; it supplies seconds. Require `Number.isFinite(seconds)`, clamp to the known `durationSeconds` when positive, call `latestPropsRef.current.onMarkerChange(nextSeconds)`, and call `latestPropsRef.current.onSeekRequest(nextSeconds)`. Subscribe to `ready` to set phase `ready`, and `error` to set phase `error` with exactly `Waveform could not be loaded. Try again.` Never call `instance.play()`, `visualizationMedia.play()`, or `instance.seekTo()` from the interaction handler.

Cleanup must increment the generation, unsubscribe via `instance.destroy()`, pause the muted visualizer media, remove its `src`, call `visualizationMedia.load()`, and set `wavesurferRef.current = null` only when it points to the destroyed instance.

- [ ] **Step 2: Synchronize the display cursor and marker without creating audible playback**

Keep a separate effect keyed by `[currentTime, sourceId]`. When the live instance exists and `currentTime` is finite/non-negative, call `instance.setTime(currentTime)`; do not call play/pause or update the selected marker from that effect. Render the marker as an absolutely positioned, `aria-hidden` vertical element only when `selectedMarker` and a positive duration are finite:

```tsx
const markerPercent = Math.min(100, Math.max(0, (selectedMarker / duration) * 100));
<span className="waveform-marker" style={{ left: `${markerPercent}%` }} />
```

Render an adjacent readable `output` named `Selected timestamp` using the existing `formatPlaybackTime(selectedMarker ?? 0)`. Render loading text with `aria-live="polite"`; on error, preserve the output and render a `Button` whose accessible name is `Retry waveform` and whose click increments `retryNonce`.

- [ ] **Step 3: Add waveform field styling with reduced-motion behavior**

Append these semantic hooks to `src/app/globals.css`:

```css
@layer components {
  .waveform-field {
    position: relative;
    min-height: 8rem;
    overflow: hidden;
    border: 1px solid hsl(var(--border));
    border-radius: 1rem;
    background: hsl(var(--background) / 0.38);
    box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.05);
  }

  .waveform-canvas {
    min-height: 6.5rem;
    padding: 0.75rem;
  }

  .waveform-marker {
    position: absolute;
    top: 0.5rem;
    bottom: 0.5rem;
    width: 2px;
    pointer-events: none;
    border-radius: 9999px;
    background: hsl(var(--primary));
    box-shadow: 0 0 14px hsl(var(--primary) / 0.7);
    transform: translateX(-50%);
    transition: left 120ms ease-out;
  }

  @media (prefers-reduced-motion: reduce) {
    .waveform-marker { transition: none; }
  }
}
```

Use `waveform-field` for the outer semantic region and `waveform-canvas` as the dynamic-import container. Do not add a random/demo waveform, direct file upload, custom global audio element, or remote fallback URL.

- [ ] **Step 4: Run browser-independent gates and inspect the client boundary**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
$violations = Select-String -Path "src/components/audio/WaveformDisplay.tsx" -Pattern "\.play\(|seekTo\(|console\."
if ($violations) { throw "Waveform contains an audible/unsafe command." }
git diff --check
```

Expected: the build succeeds; the dynamic import is inside the client component; the only waveform time setter is `setTime(currentTime)`; no direct playback call, log, or permanent media URL is introduced.

- [ ] **Step 5: Commit the waveform visualization**

```powershell
git add src/components/audio/WaveformDisplay.tsx src/app/globals.css
git commit -m "feat: add studio waveform visualization`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Build the honest server-rendered Studio catalog

**Files:**
- Create: `src/app/(dashboard)/studio/page.tsx`
- Create: `src/app/(dashboard)/studio/error.tsx`
- Create: `src/components/studio/create-track-form.tsx`
- Create: `src/components/studio/studio-catalog.tsx`

**Interfaces:**
- Consumes: `getStudioCatalog`, `createTrackAction`, `StudioCatalogResult`, `TrackStatus`, and `initialStudioActionResult`.
- Produces: `/studio` as a Server Component catalog route and a client `CreateTrackForm()` action island.
- Produces: URL filter shape `/studio?q=<trimmed-query>&status=<track-status>`; only `draft`, `active`, `completed`, and `cancelled` are accepted status values.
- Consumed by: the desktop/mobile active navigation task and final browser inspection.

- [ ] **Step 1: Create the Studio route and search-parameter parser**

Create `src/app/(dashboard)/studio/page.tsx` as a Server Component. Define:

```ts
const allowedStatuses = new Set<TrackStatus>(["draft", "active", "completed", "cancelled"]);

type StudioPageProps = {
  searchParams?: { q?: string | string[]; status?: string | string[] };
};

function oneSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}
```

Build `{ query, status }` by trimming `q`, truncating it to 160 characters, and setting `status` only when `allowedStatuses.has(oneSearchParam(searchParams?.status) as TrackStatus)`. In this Server Component, wrap only `await getStudioCatalog(filters)` in `try`/`catch`; when the caught value is `instanceof SupabasePublicEnvironmentError`, render a stable non-client configuration state with heading `Studio configuration is required` and text `Supabase environment is not configured.`. Re-throw every other failure to the generic route boundary. On success render one page heading, `<CreateTrackForm />`, and `<StudioCatalog result={result} filters={filters} />`. The route must not create records or select playback URLs during rendering.

- [ ] **Step 2: Create the generic Studio route error boundary**

Create `src/app/(dashboard)/studio/error.tsx` with `"use client"` and this exact user-safe interface:

```tsx
import { Button } from "@/components/ui/button";

export default function StudioError({ reset }: { error: Error; reset: () => void }) {
  return (
    <section className="glass-panel grid gap-4 p-6 sm:p-8" aria-labelledby="studio-error-heading">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Studio</p>
      <h1 id="studio-error-heading" className="font-heading text-2xl font-semibold">Studio is unavailable</h1>
      <p className="max-w-xl text-sm text-muted-foreground">The Studio workspace could not be loaded. Try again.</p>
      <div><Button type="button" onClick={reset}>Retry Studio</Button></div>
    </section>
  );
}
```

The Server Component, not this client boundary, recognizes `SupabasePublicEnvironmentError`. Do not inspect or render `error.message`, a stack, database/provider data, or environment values.

- [ ] **Step 3: Implement the real create-track Server Action form**

Create `src/components/studio/create-track-form.tsx` with `"use client"`, `useFormState` from `react-dom`, `createTrackAction`, and `initialStudioActionResult`. Render a labelled `title` input (`maxLength={160}`), optional labelled `description` textarea (`maxLength={4000}`), and a submit `Button` named `Create track`. For each input, render its stable field error with `aria-describedby` only when `state.fieldErrors` provides one. Render form-level `state.message` in a `role="status"` for success or `role="alert"` for error.

The form must submit only `title` and `description`; it must not serialize `created_by`, role, status, storage metadata, a signed URL, or any client-provided ownership ID.

- [ ] **Step 4: Render search/filter controls, actual summary, cards, and empty state**

Create `src/components/studio/studio-catalog.tsx`. Render a GET form to `/studio` containing a labelled `q` search input and status `<select name="status">` whose four values are exactly the `TrackStatus` union. Include a submit `Button` named `Apply filters` and a `Link href="/studio"` named `Clear filters` only when either filter is non-empty.

Render actual status summary values from `result.statusCounts`, not hard-coded statistics:

```tsx
const statuses: TrackStatus[] = ["draft", "active", "completed", "cancelled"];
{statuses.map((status) => (
  <li key={status}>
    <span>{status}</span>
    <strong className="font-heading">{result.statusCounts[status]}</strong>
  </li>
))}
```

For each card link to `/studio/${track.id}` and display title, status, `latestVersion ? `V${latestVersion.versionNumber} · ${latestVersion.status}` : "No versions registered"`, `createdBy.fullName`, and `new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(lastActivityAt))`. When `result.tracks.length === 0`, render exactly:

- heading: `Studio is connected but empty`
- text: `Create a track to begin the private Studio catalog. Playback becomes available after a version is registered.`

Do not display fake tracks, counts, waveform peaks, upload controls, queue controls, cards for Operations/Content, or a raw artwork/object path.

- [ ] **Step 5: Run build gates and inspect the catalog route shape**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
```

Expected: the build reports `/studio` as a dashboard route; the route imports the server query rather than the browser client; no new Phase 4/5 route compiles.

- [ ] **Step 6: Commit the Studio catalog**

```powershell
git add "src/app/(dashboard)/studio/page.tsx" "src/app/(dashboard)/studio/error.tsx" src/components/studio/create-track-form.tsx src/components/studio/studio-catalog.tsx
git commit -m "feat: add private studio catalog`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Build the authorized track detail, playback selection, and timestamp comments

**Files:**
- Create: `src/app/(dashboard)/studio/[trackId]/page.tsx`
- Create: `src/components/studio/studio-detail-client.tsx`
- Create: `src/components/studio/version-selector.tsx`
- Create: `src/components/studio/comment-composer.tsx`
- Create: `src/components/studio/comment-list.tsx`

**Interfaces:**
- Consumes: Task 2 queries/actions and Task 4 `WaveformDisplay`.
- Produces: `/studio/[trackId]` server detail route, `StudioDetailClient`, `VersionSelector`, `CommentComposer`, and `CommentList`.
- Produces: comments persist `{ versionId, timestampMarker, content }`; all timestamp selections call `requestAudioSeek(versionId, seconds)` through the parent callback.
- Preserves: inaccessible/missing tracks terminate in `notFound()`; signed source selection occurs only by authorized Server Action and exposes no storage metadata.

- [ ] **Step 1: Create the server detail route with non-disclosing absence behavior**

Create `src/app/(dashboard)/studio/[trackId]/page.tsx` as a Server Component:

```tsx
import { notFound } from "next/navigation";

import { StudioDetailClient } from "@/components/studio/studio-detail-client";
import { getStudioComments, getStudioTrackDetail, getStudioTrackVersions } from "@/lib/studio/queries";

export default async function StudioTrackPage({ params }: { params: { trackId: string } }) {
  const track = await getStudioTrackDetail(params.trackId);
  if (!track) notFound();

  const versions = await getStudioTrackVersions(track.id);
  const comments = await getStudioComments(versions.map((version) => version.id));

  return <StudioDetailClient track={track} versions={versions} comments={comments} />;
}
```

Before querying, have `getStudioTrackDetail` return `null` for malformed UUIDs as well as missing/inaccessible rows. In this Server Component, wrap the query sequence in `try`/`catch`; when the caught value is `instanceof SupabasePublicEnvironmentError`, render the same stable server-rendered configuration state specified for `/studio` (`Studio configuration is required` / `Supabase environment is not configured.`), and re-throw every other error to the generic client boundary. Do not return different UI/copy for unauthorized versus absent tracks.

- [ ] **Step 2: Implement version selection and authorized global-player handoff**

Create `src/components/studio/version-selector.tsx` with `"use client"` and props:

```ts
export type VersionSelectorProps = {
  versions: StudioTrackVersion[];
  selectedVersionId: string | null;
  onSelectVersion: (versionId: string) => void;
  onPlaybackSource: (source: SignedPlaybackSource) => void;
};
```

Render newest-first version buttons with accessible selected state (`aria-pressed`), original filename text, status, and duration formatted through `formatPlaybackTime(version.durationSeconds ?? 0)`. The selected version receives a `Play in global player` button. On click, use `startTransition` to call `requestPlaybackSourceAction(selectedVersion.id)`; only on `{ status: "success" }` call `onPlaybackSource(result.source)`. On an error, show exactly `Playback is unavailable. Try again.` in a `role="alert"`. Disable the button while its request is pending.

When `versions.length === 0`, render exactly `No versions are registered. Playback becomes available after a version is registered.` and no play button. Do not issue a signing request merely by rendering or choosing a version.

- [ ] **Step 3: Compose track metadata, waveform state, and player selection**

Create `src/components/studio/studio-detail-client.tsx` with `"use client"` and props `{ track: StudioTrackDetail; versions: StudioTrackVersion[]; comments: StudioComment[] }`. Initialize only `selectedVersionId` to `versions[0]?.id ?? null` and `selectedMarker` to `null`. Subscribe directly to Zustand with `const playerSource = useAudioStore((state) => state.source)`, `const currentTime = useAudioStore((state) => state.currentTime)`, and `const selectSource = useAudioStore((state) => state.selectSource)`. Derive `activeSource` rather than storing it: `const activeSource = playerSource?.trackId === track.id ? playerSource : null;`. This is the sole signed URL/source authority and changes when `refreshSource()` updates Zustand.

When `VersionSelector` returns a source, call `selectSource(source)` and retain the current selected version. Render:

- breadcrumb link `Studio` to `/studio`;
- track title, status, description or `No description has been added.`, and an artwork fallback containing the track title initial when `hasArtwork` is false; never render a private artwork path or image URL in Phase 3;
- `WaveformDisplay` only when `activeSource?.sourceId === selectedVersionId`, passing `sourceId={activeSource.sourceId}`, `playbackUrl={activeSource.playbackUrl}`, the selected version’s `durationSeconds`, `currentTime`, `selectedMarker`, `onMarkerChange={setSelectedMarker}`, and `onSeekRequest={(seconds) => requestAudioSeek(activeSource.sourceId, seconds)}`;
- `<CommentComposer versionId={selectedVersionId} marker={selectedMarker} />` and `<CommentList comments={comments} activeSourceId={activeSource?.sourceId ?? null} onSeekComment={(versionId, seconds) => { if (activeSource?.sourceId === versionId) requestAudioSeek(versionId, seconds); }} />`;
- a glass explanation `Start the selected version in the global player to load its waveform.` when a version exists but no active signed source exists for it.

If the selected version changes, clear `selectedMarker`. Do not clear a currently playing global source solely because the visitor examines a different version; playback changes only when the explicit play button returns a newly signed source.

- [ ] **Step 4: Implement timestamp composer with stable action state**

Create `src/components/studio/comment-composer.tsx` with `"use client"` and props:

```ts
export type CommentComposerProps = {
  versionId: string | null;
  marker: number | null;
};
```

Use `useFormState(addCommentAction, initialStudioActionResult)`. Render the current marker using `formatPlaybackTime(marker ?? 0)`. Include hidden `versionId` and `timestampMarker` inputs only when both props are non-null; otherwise disable the submit button named `Add timestamp comment` and render exactly `Select a point on the waveform before adding a comment.` in a `role="status"` region.

For an enabled submit, render labelled `content` textarea with `maxLength={2000}`, submit only version/marker/content, clear the textarea after `state.status === "success"`, and render the stable `fieldErrors.content`/form `message`. Comment content is plain text React children; never use `dangerouslySetInnerHTML`.

- [ ] **Step 5: Implement chronological comments, seeking, and resolution**

Create `src/components/studio/comment-list.tsx` with `"use client"` and props:

```ts
export type CommentListProps = {
  comments: StudioComment[];
  activeSourceId: string | null;
  onSeekComment: (versionId: string, seconds: number) => void;
};
```

Render comments in the received `createdAt asc` order. Each timestamp is a `button` named `Seek to ${formatPlaybackTime(comment.timestampMarker)}`. On click, call `onSeekComment(comment.versionId, comment.timestampMarker)`; the parent calls `requestAudioSeek` only when `comment.versionId === activeSourceId`, otherwise show `Start this comment’s version in the global player before seeking.` as a local `role="status"` message. Render `comment.content` as text, author name, formatted date, and a resolved badge when `isResolved` is true.

For unresolved comments with `canResolve`, render a `Resolve comment` button. Use `startTransition` to call `resolveCommentAction(comment.id)` and show only its stable message if the action fails. Do not render a resolve control for other users and do not add comment editing in Phase 3.

- [ ] **Step 6: Run detail-route gates and inspect private-data boundaries**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
$privateTerms = @('storage_url', 'storage_bucket', 'storage_provider', 'SUPABASE_SERVICE_ROLE_KEY')
foreach ($term in $privateTerms) {
  $matches = Select-String -Path "src/components/studio/*.tsx" -Pattern $term
  if ($matches) { throw "Private storage data leaked to Studio component: $term" }
}
git diff --check
```

Expected: detail route compiles, raw private-storage terms do not exist in Studio component source, page absence uses `notFound()`, and no direct browser Storage/SQL call exists.

- [ ] **Step 7: Commit the Studio detail workflow**

```powershell
git add "src/app/(dashboard)/studio/[trackId]/page.tsx" src/components/studio/studio-detail-client.tsx src/components/studio/version-selector.tsx src/components/studio/comment-composer.tsx src/components/studio/comment-list.tsx
git commit -m "feat: add studio track review workflow`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Activate Studio navigation and preserve responsive dashboard geometry

**Files:**
- Modify: `src/components/dashboard/dashboard-sidebar.tsx`
- Modify: `src/components/dashboard/mobile-dashboard-header.tsx`
- Modify: `src/components/dashboard/dashboard-home.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `/studio`, `/studio/[trackId]`, existing theme toggle, existing dashboard shell/player-safe CSS, and current pathname.
- Produces: pathname-aware active Dashboard/Studio navigation at desktop and mobile sizes; a mobile context label of `Dashboard` or `Studio`.
- Preserves: Operations, Content, and VEO AI remain visibly pending/noninteractive; exactly one responsive theme control is visible at a time.

- [ ] **Step 1: Make desktop navigation pathname-aware and activate only Studio**

Convert `dashboard-sidebar.tsx` to a client component and import `usePathname` from `next/navigation`, `Link` from `next/link`, `motion`/`useReducedMotion` from `framer-motion`, and `SquaresFour`/`Waveform` from `@phosphor-icons/react`. Define:

```ts
const activeDestinations = [
  { href: "/", label: "Dashboard", Icon: SquaresFour, matches: (pathname: string) => pathname === "/" },
  { href: "/studio", label: "Studio", Icon: Waveform, matches: (pathname: string) => pathname === "/studio" || pathname.startsWith("/studio/") },
] as const;
```

For each active destination, render a real `Link`, `aria-current="page"` only when `matches(pathname)`, and a `motion.span layoutId="dashboard-active-indicator"` left marker only for the active item. Give the marker `transition={shouldReduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}`. Retain Operations, Content, and VEO AI as plain noninteractive rows labelled `Coming soon`; do not add their hrefs or a VEO AI panel.

- [ ] **Step 2: Add compact mobile Dashboard/Studio navigation and current context**

Convert `mobile-dashboard-header.tsx` to a client component. Use `usePathname()` and set:

```ts
const isStudio = pathname === "/studio" || pathname.startsWith("/studio/");
const currentModule = isStudio ? "Studio" : "Dashboard";
```

Keep one `ThemeToggle` in the mobile header. Under its identity/context row, add `<nav aria-label="Primary navigation">` with only two `Link` pills: Dashboard `/` and Studio `/studio`. Each has `aria-current="page"` only when active, a 40px minimum target, focus ring, glass hierarchy, and the same reduced-motion spring selection treatment. Keep the header `lg:hidden`; do not add a menu, dialog, future-module control, or duplicate theme toggle.

- [ ] **Step 3: Update the dashboard home without activating future phases**

In `dashboard-home.tsx`, replace the Studio pending module card with a real `Link href="/studio"` titled `Studio`, labelled `Open Studio`, and using the existing Waveform icon. Update the introduction copy to exactly:

```text
The private VEO workspace is ready. The Studio catalog is now connected; Operations, Content, and VEO AI modules will come online in their dedicated phases.
```

Leave only Operations, Content, and VEO AI as noninteractive `Coming soon` module rows. Do not add their routes or claim their availability.

- [ ] **Step 4: Tune responsive Studio layout hooks above the persistent player**

Append only these layout rules to `src/app/globals.css`; retain the existing player position and safe-area rules unchanged:

```css
@layer components {
  .studio-page-grid {
    display: grid;
    gap: 1.25rem;
  }

  .studio-detail-grid {
    display: grid;
    gap: 1.25rem;
  }

  @media (min-width: 1024px) {
    .studio-detail-grid {
      grid-template-columns: minmax(0, 1.45fr) minmax(18rem, 0.85fr);
      align-items: start;
    }
  }
}
```

Use `studio-page-grid` in `StudioCatalog`, and use `studio-detail-grid` in `StudioDetailClient` so cards stack at mobile width, retain 16px shell margins, and remain clear of `dashboard-shell-main`’s player-safe bottom padding. Do not use fixed widths that produce horizontal scrolling.

- [ ] **Step 5: Run build and route/scope inspection gates**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
$forbiddenRoutes = @(
  "src/app/(dashboard)/operations",
  "src/app/(dashboard)/content",
  "src/components/upload/R2Uploader.tsx",
  "src/components/chat/VEO_AI_Chat.tsx"
)
foreach ($path in $forbiddenRoutes) {
  if (Test-Path $path) { throw "Out-of-scope Phase 4/5 path exists: $path" }
}
git diff --check
```

Expected: build succeeds; `/studio` is the sole newly active module; Phase 4/5 UI paths remain absent; no whitespace issue exists.

- [ ] **Step 6: Commit the navigation activation**

```powershell
git add src/components/dashboard/dashboard-sidebar.tsx src/components/dashboard/mobile-dashboard-header.tsx src/components/dashboard/dashboard-home.tsx src/app/globals.css src/components/studio/studio-catalog.tsx src/components/studio/studio-detail-client.tsx
git commit -m "feat: activate studio navigation`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Run the Phase 3 acceptance gate, integrate `main`, and push safely

**Files:**
- Review: all Phase 3 files listed in this plan.
- Commit: the explicit non-fast-forward merge commit that integrates `phase-3-studio-waveform` into `main`.

**Interfaces:**
- Consumes: completed schema, Studio data boundary, persistent-player refresh, waveform, routes, and responsive navigation.
- Produces: a validated Phase 3 delivery on `origin/main` with no force push and no activated Phase 4/5 module.

- [ ] **Step 1: Run final migration, type, lint, build, and Git integrity gates**

Run:

```powershell
npx supabase db push --dry-run --linked
npx supabase migration list --linked
npx tsc --noEmit
npm run lint
npm run build
git diff --check
git status --short
git log --oneline --decorate -12
```

Expected: the only migration to apply is the committed Phase 3 migration (or none after Task 1 applied it); TypeScript/lint/build exit zero; no whitespace errors; all implementation commits are present; no uncommitted application changes remain.

- [ ] **Step 2: Inspect the production build for intended routes and excluded scope**

Run:

```powershell
$routes = Get-ChildItem -Recurse ".next/server/app" -File | Select-Object -ExpandProperty FullName
$required = @("studio", "refresh")
foreach ($term in $required) {
  if (-not ($routes -match [regex]::Escape($term))) { throw "Expected build route fragment is absent: $term" }
}
$unexpected = @("operations", "content", "R2Uploader", "VEO_AI_Chat")
foreach ($term in $unexpected) {
  if ($routes -match [regex]::Escape($term)) { throw "Out-of-scope build artifact detected: $term" }
}
```

Expected: build artifacts include Studio and refresh functionality but no Operations, Content, upload, or VEO AI route/component.

- [ ] **Step 3: Inspect SQL policy results and secret hygiene without printing values**

In the linked project’s SQL editor, rerun the Task 1 read-only `pg_policies`, `pg_tables`, and `storage.buckets` queries. Confirm all table reads are `authenticated`, track writes invoke the approved capability predicate, `track_versions` and `files` have no authenticated write grant or write policy, comments use author/admin predicates plus the duration trigger, helper execution is absent for `public`/`anon`, and the private `playback` bucket has no `storage.objects` policy.

Run:

```powershell
git check-ignore .env.local
$tracked = git ls-files
$secretPatterns = @('SUPABASE_SERVICE_ROLE_KEY\s*=', 'OPENAI_API_KEY\s*=', 'NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=')
foreach ($pattern in $secretPatterns) {
  $hits = @()
  foreach ($file in $tracked) {
    $matches = Select-String -Path $file -Pattern $pattern -ErrorAction SilentlyContinue
    if ($matches) { $hits += $file }
  }
  if ($hits.Count -gt 0) { throw "Secret assignment pattern found in tracked files." }
}
```

Expected: `.env.local` is ignored; no tracked secret assignment is found; no secret value is printed.

- [ ] **Step 4: Perform required browser inspection with authorized non-production data**

Authorized local or non-production data and an already-authenticated non-production session are blocking release prerequisites. Before release acceptance, start the app with the existing project run workflow and obtain this approved non-secret development access without entering, recording, fabricating, or using production credentials. Without recording credentials, inspect unauthenticated `/studio`: it must redirect to `/login` before dashboard content renders and the console/network panels must contain no cookie/token/provider detail.

With that authenticated non-production session and real non-production data, inspect at `1440x1000` and `390x844`:

- `/studio` shows the actual status summary and actual track cards, or the honest connected-but-empty message; create form labels, focus states, empty state, search/status query parameters, and real Studio navigation are usable.
- `/studio/[trackId]` shows only authorized metadata, newest-first versions, no-version copy where applicable, a play-in-global-player action, and chronological text-only comments.
- Selecting a signed version mounts the waveform, clicking it moves the timestamp marker and seeks the one global player, and comment timestamp buttons seek only the active matching version.
- Start playback, wait until the scheduled refresh window or temporarily use an already-issued short-lived development source, then confirm a refresh request body contains only `versionId`, response handling does not log/expose the URL, the native player restores position/volume/intended playing state, and a failed refresh pauses with the generic actionable message.
- Force a waveform decode/network failure using DevTools request blocking; metadata and comments remain usable and `Retry waveform` is available.
- At mobile width there is no horizontal overflow, exactly one mobile theme control is reachable, Studio context/navigation is visible, cards stack within 16px margins, and waveform/comments stay usable above the dock. At desktop width the 260px sidebar, 32px outer space, and player-safe content geometry remain intact.
- In dark/light themes and reduced-motion emulation, focus rings remain visible, visual hierarchy stays legible, marker travel/transitions stop under reduced motion, and no continuous decorative animation appears.

If the required authenticated non-production session or real non-production data is unavailable, stop the release acceptance gate as blocked. Do not create seed data, bypass authorization, add a preview route, or use production credentials to fabricate the check; do not merge or push Phase 3 as accepted until the required observations are completed.

- [ ] **Step 5: Inspect route/network/console and client-source privacy**

During the browser inspection, verify:

- Network requests for signing/refresh use the same-origin Studio Server Action/route boundary; the browser never calls Storage directly with a private object key.
- Refresh accepts only `POST`, sends `{ "versionId": "<uuid>" }`, and returns only `playbackUrl`/`expiresAt` on success.
- No console warning/error is introduced by Phase 3 other than the deliberately induced waveform failure; reload after removing the block to confirm a clean console.
- Rendered catalog/detail markup has no `storage_url`, `storage_bucket`, `storage_provider`, service-role phrase, environment variable, cookie, or permanent storage URL. The required explicit-play/refresh response may transiently deliver the expiring URL only to update the active source; it must be loaded only by the authoritative global-player `<audio>` element and the muted `WaveformDisplay` visualization media for that same active source. No other DOM element, rendered payload, persisted storage, or log may expose it.

Run the static final check:

```powershell
$prohibited = @('service_role', 'SUPABASE_SERVICE_ROLE_KEY', 'OPENAI_API_KEY', 'R2Uploader', 'VEO_AI_Chat')
foreach ($term in $prohibited) {
  $matches = Select-String -Path "src\app\(dashboard)\studio\*.tsx", "src\components\studio\*.tsx", "src\components\audio\*.tsx", "src\lib\studio\*.ts" -Pattern $term -ErrorAction SilentlyContinue
  if ($matches) { throw "Prohibited Phase 3 source term found: $term" }
}
```

Expected: signing information is constrained to the intended endpoint/Server Action and no permanent storage metadata or secret concept reaches client-facing implementation files.

- [ ] **Step 6: Integrate the reviewed feature branch into current `main`**

Run:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git merge --no-ff phase-3-studio-waveform -m "feat: complete VEO OS phase 3 studio waveform" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

Expected: the merge command creates this task’s final integration commit with no conflict. If the merge reports a conflict, stop before modifying merge state; reconcile the current upstream changes against the completed Phase 3 constraints, rerun Steps 1–5, then create the same merge commit message. Do not discard upstream work or use a force option.

- [ ] **Step 7: Push non-force and verify local/remote integrity**

Run:

```powershell
git push origin main
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
```

Expected: the push succeeds without `--force`; working tree is clean; local and `origin/main` SHAs match; Phase 3 completion criteria are met; no Phase 4/5 module has been activated.

# VEO OS Phase 3 Studio & Waveform Engine Design

**Status:** Approved under VEO OS full-autopilot authorization on 2026-08-11.

**Authority:** This specification refines `VEO_OS_MASTER_PLAN.md` and `VEO_OS_DESIGN_MANIFESTO.md`. The explicit no-test override supersedes automated-test requirements from earlier phase documents.

## Objective

Build the private Studio data foundation: Supabase schema and RLS, typed server data access, the Studio catalog, track/version detail pages, signed playback selection, a Wavesurfer visualization, and timestamped comments. The existing dashboard layout and `GlobalPlayer` remain the persistent playback boundary.

## Scope

Phase 3 includes:

- Supabase migrations for all master-plan tables so later phases share one stable schema.
- Private storage metadata that records provider, bucket, and object key instead of permanent public URLs.
- Generated-style TypeScript database types committed at `src/types/database.types.ts`.
- `/studio` catalog and `/studio/[trackId]` detail routes.
- Track status, versions, signed playback selection, waveform visualization, and timestamp comments.
- Expiring playback URL issuance and same-source refresh without losing player telemetry.
- Studio navigation activation on desktop and mobile.

Phase 3 does not include production file uploads, R2 presigning, a browser registration path for versions/files, Operations, Content, public listening, watermarking, vector search, OpenAI calls, fabricated production records, or committed seed data presented as real.

## Data Model

Use UUID primary keys, UTC timestamps, and `pgcrypto` `gen_random_uuid()`.

### Enumerations

- `team_role`: `admin`, `producer`, `member`
- `track_status`: `draft`, `active`, `completed`, `cancelled`
- `track_version_status`: `processing`, `ready`, `archived`, `failed`
- `storage_provider`: `supabase`, `r2`
- `file_type`: `stem`, `flp`, `zip`, `artwork`, `mix`, `master`, `other`
- `action_status`: `planned`, `in_progress`, `completed`, `cancelled`
- `content_status`: `idea`, `planned`, `in_production`, `published`, `archived`
- `content_difficulty`: `low`, `medium`, `high`

### Tables

- `public.users`: `id`, `full_name`, `role`, `avatar_url`, `created_at`, `updated_at`. A fixed-search-path security-definer trigger provisions profiles from `auth.users`; browser input can never set a role.
- `public.tracks`: master-plan columns plus `description`, `artwork_path`, and `updated_at`. `artwork_path`, like other storage fields, is a private object path and never an HTTP URL.
- `public.track_versions`: master-plan columns plus provider/bucket/object-key metadata, filename, MIME type, size, finite non-negative `duration_seconds`, creator, and creation time. `storage_url` is a private path, not an HTTP URL; `(track_id, version_num)` is unique.
- `public.comments`: master-plan columns. `timestamp_marker` is finite and non-negative. A trigger must reject a comment unless its version is `ready`, has a finite non-negative duration, and the marker is at most `duration_seconds + 0.25`; the Server Action enforces the same `0.25` second tolerance before insertion. Trimmed content is 1–2,000 characters.
- `public.files`, `public.actions`, and `public.content_ideas`: create the master-plan columns and stated supporting metadata now for schema stability; do not activate their Phase 4 workflows or UI.

## Row-Level Security and Registration Boundary

Enable RLS on every public table.

- Authenticated users may read team profiles, tracks, versions, comments, files, actions, and content ideas.
- A user may update their own `full_name` and `avatar_url`; only admins may change roles.
- Authenticated users may create tracks, comments, actions, and content ideas with their own user ID.
- `public.can_manage_track(track_id)` is the single capability predicate: admins and producers manage every track; members manage only their created tracks.
- Track writes use `can_manage_track()`. Direct authenticated/browser `INSERT`, `UPDATE`, or `DELETE` grants and policies for `track_versions` and `files` are deliberately absent in Phase 3. Phase 4 must introduce a trusted server-only registration boundary before it enables those writes.
- Comment authors and admins may edit or resolve comments. Destructive operations use the same owner/admin or capability rules.
- `public.is_admin()` and `public.can_manage_track()` use `security definer`, fixed `search_path`, no dynamic SQL, and are executable by `authenticated` only. Revoke execution from `public` and `anon`, including non-RLS helper/trigger functions.
- Do not grant `storage.objects` `SELECT`, list, upload, update, or delete policies in Phase 3. Table reads do not authorize Storage object access.

## Storage and Signing Contract

- Create a private Supabase Storage bucket named `playback` through migration SQL where supported.
- Supabase playback metadata uses provider `supabase`, bucket `playback`, and a private object path in `storage_url`. R2 metadata is schema-compatible but R2 signing/uploads begin in Phase 4.
- The only Phase 3 service-role use is the server-only, narrowly isolated `src/lib/supabase/admin.ts` client, configured from untracked `SUPABASE_SERVICE_ROLE_KEY`. It creates signed URLs only; it is never imported by browser code, middleware, ordinary queries, mutations, or authorization logic.
- To sign, `src/lib/studio/playback.ts` first uses the request-scoped anon server client to call `auth.getUser()` and query the requested version and track under RLS. It accepts only a visible, `ready`, `supabase`/`playback` version with a non-URL private key, then calls the admin client solely for `storage.from("playback").createSignedUrl(...)`.
- Signed playback URLs expire after exactly 15 minutes. No client component receives permanent provider credentials, object keys, buckets, raw provider errors, or raw database rows.

## TypeScript and Server Data Boundary

`src/types/database.types.ts` contains public schema types, enums, row/insert/update shapes, and helper function signatures. Focused DTOs under `src/lib/studio/types.ts` are browser-safe:

- `StudioTrackSummary`
- `StudioTrackDetail`, which exposes `hasArtwork: boolean`, never `artworkPath`
- `StudioTrackVersion`
- `StudioComment`
- `SignedPlaybackSource`

`SignedPlaybackSource` adapts the serializable existing `PlaybackSource` and adds ISO `expiresAt`.

Request-scoped `src/lib/studio/queries.ts`, `mutations.ts`, `playback.ts`, and `validation.ts` use the normal typed server client. Queries/mutations call `auth.getUser()` and RLS remains final authorization. Provider errors become terse public messages; missing/inaccessible tracks use `notFound()`; successful mutations revalidate affected Studio routes.

The authenticated `POST /api/studio/playback/refresh` accepts only `versionId`, reauthorizes through that same normal path, and returns only `{ playbackUrl, expiresAt }` on success. It does not expose a storage path or provider message.

## Studio Catalog and Detail

`/studio` is a Server Component with URL search/filter controls, actual status counts, honest empty state, and a Server Action track-create form. It renders a stable configuration-specific UI from the Server Component when the known Supabase environment failure occurs; the client `error.tsx` boundary is generic and never branches on redacted `error.message`.

`/studio/[trackId]` is a Server Component that obtains authorized track, versions, and comments. It has title/status/description/artwork fallback, newest-first versions, explicit play-in-global-player action, waveform, timestamp composer, and chronological comments. No route render or version selection signs a URL; explicit play does.

## Waveform and Persistent Player

`GlobalPlayer` owns the only audible `HTMLAudioElement`. Zustand remains serializable and never stores DOM elements, media objects, controllers, callbacks, refs, or Wavesurfer instances.

- Extend `PlaybackSource` with `expiresAt?: string` and add a same-source refresh action that preserves telemetry, volume, intended play state, duration, and current position.
- `GlobalPlayer` refreshes before expiry with generation guards, restoring position after metadata and failing generically without provider detail.
- A typed module-scoped command bus sends seek commands to `GlobalPlayer`.
- `WaveformDisplay` dynamically imports Wavesurfer and owns a permanently muted visualization-only media element. It never calls play.
- The Studio detail island derives the active signed source and URL directly from the Zustand `source` selector. It does not retain a duplicate local signed-source snapshot, so a refreshed URL reaches the muted visualizer.
- Waveform interaction uses finite timestamps, updates the marker, and requests a matching-source seek. Its cursor follows matching-source Zustand `currentTime`. Cleanup destroys Wavesurfer and stale callbacks; decode failure preserves metadata/comments and offers retry. Reduced motion removes marker transitions.

## Navigation, Design, and Errors

Replace Studio’s pending row with a pathname-aware `/studio` desktop/mobile link. Operations, Content, and VEO AI remain visibly pending and noninteractive. Keep the existing 260px desktop/sidebar and player-safe geometry, 16px mobile margins, single visible mobile theme control, no horizontal overflow, semantic CSS tokens, Inter/Space Grotesk, glass hierarchy, Phosphor icons, focus rings, spring motion, and reduced-motion policy.

Use stable messages for configuration, empty catalog, no versions, signing/refresh failure, waveform failure, and mutations. Render comment content as text only. Do not log cookies, tokens, environment values, signed URLs, object paths, or provider messages.

## No-Test Validation and Completion

The explicit override prohibits creating, modifying, mentioning as work items, or running automated test assets or commands. Validation consists only of migration/policy inspection, `npx tsc --noEmit`, `npm run lint`, `npm run build`, browser inspection, and route/network/console/secret/scope/Git checks.

Authorized local or non-production browser data and an authenticated non-production session are blocking prerequisites for release acceptance. Do not create seed data, bypass authorization, add a preview route, use production credentials, or claim Phase 3 acceptance if those protected-session checks cannot be completed.

Phase 3 completes only when schema/RLS/types, Studio routes, signed playback, waveform, comments, active navigation, security and browser gates pass; no Phase 4/5 module is activated; and the phase is committed, integrated into `main`, and pushed without force.

# VEO OS Phase 3 Studio & Waveform Engine Design

**Status:** Approved under VEO OS full-autopilot authorization on 2026-08-11.

**Authority:** This specification refines `VEO_OS_MASTER_PLAN.md` and `VEO_OS_DESIGN_MANIFESTO.md`. The user's explicit no-test override supersedes TDD and automated-test requirements from earlier phase documents.

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

Phase 3 does not include:

- Production file uploads or R2 presigning.
- Operations, Content, public listening, watermarking, vector search, or OpenAI calls.
- Fabricated production records or committed seed data presented as real.

## Data Model

Use UUID primary keys and UTC timestamps. Enable `pgcrypto` for `gen_random_uuid()`.

### Enumerations

- `team_role`: `admin`, `producer`, `member`
- `track_status`: `draft`, `active`, `completed`, `cancelled`
- `track_version_status`: `processing`, `ready`, `archived`, `failed`
- `storage_provider`: `supabase`, `r2`
- `file_type`: `stem`, `flp`, `zip`, `artwork`, `mix`, `master`, `other`
- `action_status`: `planned`, `in_progress`, `completed`, `cancelled`
- `content_status`: `idea`, `planned`, `in_production`, `published`, `archived`
- `content_difficulty`: `low`, `medium`, `high`

### `public.users`

- `id uuid primary key references auth.users(id) on delete cascade`
- `full_name text not null default ''`
- `role team_role not null default 'member'`
- `avatar_url text`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

A security-definer trigger creates the profile row after an `auth.users` insert. Role escalation is never accepted from client input.

### `public.tracks`

- Master-plan columns: `id`, `title`, `status`, `created_by`, `created_at`
- Additional columns: `description`, `artwork_path`, `updated_at`
- `created_by` references `public.users(id)`.

### `public.track_versions`

- Master-plan columns: `id`, `track_id`, `version_num`, `storage_url`, `status`
- Additional columns: `storage_provider`, `storage_bucket`, `original_filename`, `mime_type`, `size_bytes`, `duration_seconds`, `created_by`, `created_at`
- `storage_url` is a private object path, not an HTTP URL. The database column is retained to satisfy the master schema while preventing raw URL persistence.
- Unique constraint: `(track_id, version_num)`.

### `public.comments`

- Master-plan columns: `id`, `version_id`, `user_id`, `timestamp_marker`, `content`, `is_resolved`, `created_at`
- `timestamp_marker` is finite, non-negative, and stored as `double precision`.
- Content is trimmed and limited to 2,000 characters.

### `public.files`

Created in Phase 3 for schema stability and consumed in Phase 4.

- Master-plan columns: `id`, `track_id`, `type`, `storage_url`, `size_bytes`
- Additional columns: `storage_provider`, `storage_bucket`, `original_filename`, `mime_type`, `uploaded_by`, `created_at`
- `storage_url` stores the private object key/path.

### `public.actions`

Created in Phase 3 and consumed in Phase 4.

- Master-plan columns: `id`, `title`, `description`, `event_date`, `status`
- Additional columns: `created_by`, `created_at`, `updated_at`

### `public.content_ideas`

Created in Phase 3 and consumed in Phase 4.

- Master-plan columns: `id`, `title`, `platform`, `difficulty`, `status`, `reference_url`
- Additional columns: `notes`, `created_by`, `created_at`, `updated_at`

## Row-Level Security

Enable RLS on every public table.

- Authenticated users may read team profiles, tracks, versions, comments, files, actions, and content ideas.
- A user may update their own `full_name` and `avatar_url`; only admins may change roles.
- Authenticated users may create tracks, comments, actions, and content ideas with their own user ID.
- Define `public.can_manage_track(track_id)` as the single write-capability rule: admins and producers may manage every track; members may manage only tracks they created.
- Apply `can_manage_track()` to track/version/file insert, update, and delete policies. Read access alone never grants upload or modification access.
- New versions/files must also set `created_by` or `uploaded_by` to `auth.uid()`.
- Comment authors and admins may edit or resolve comments.
- Destructive operations are restricted through the same owner/admin or `can_manage_track()` rules.
- Storage object access is not granted through table reads. Object paths are resolved by authorized server code.

Helper SQL functions such as `public.is_admin()` and `public.can_manage_track()` use `security definer`, a fixed `search_path`, and no dynamic SQL.

## Storage Contract

- Create a private Supabase Storage bucket named `playback` through migration SQL where supported.
- Playback assets use `storage_provider = 'supabase'`, bucket `playback`, and a private object path in `storage_url`.
- R2 metadata is schema-compatible but R2 signing and uploads begin in Phase 4.
- Client components never receive permanent provider credentials, bucket secrets, or raw database error objects.
- Signed playback URLs expire after 15 minutes.

## TypeScript Data Boundary

`src/types/database.types.ts` contains the public schema types, enums, row/insert/update shapes, and function signatures used by Supabase clients.

Create focused domain DTOs under `src/lib/studio/types.ts` rather than passing raw database rows into client components:

- `StudioTrackSummary`
- `StudioTrackDetail`
- `StudioTrackVersion`
- `StudioComment`
- `SignedPlaybackSource`

`SignedPlaybackSource` adapts to the existing `PlaybackSource` and adds an ISO `expiresAt` value. Browser state remains serializable.

## Server Data Layer

Create request-scoped modules under `src/lib/studio/`:

- `queries.ts`: catalog, detail, versions, and comments.
- `mutations.ts`: create track, add comment, resolve comment.
- `playback.ts`: authorize a version and issue a signed playback URL.
- `validation.ts`: Zod schemas and stable user-facing validation messages.
- `types.ts`: domain DTOs.

Rules:

- Every query uses the request-scoped Supabase server client.
- Mutations call `auth.getUser()` and rely on RLS as the final enforcement layer.
- Provider errors are converted to terse application errors and are never rendered verbatim.
- `notFound()` is used for inaccessible/missing tracks to avoid disclosing existence.
- Successful mutations call `revalidatePath()` for the affected Studio routes.

## Studio Catalog

`src/app/(dashboard)/studio/page.tsx` is a Server Component.

It renders:

- Page title and compact status summary.
- Search/filter controls implemented as URL search parameters.
- Track cards or rows with title, status, latest version, creator label, and last activity.
- An honest empty state when no tracks exist.
- A create-track form using a Server Action.

No fake counts, charts, or track records are displayed.

## Track Detail

`src/app/(dashboard)/studio/[trackId]/page.tsx` is a Server Component that fetches the authorized track, versions, and comments. Client islands handle playback selection, waveform interaction, and comment submission.

The page includes:

- Track title, status, description, and artwork fallback.
- Version selector ordered newest first.
- Play-in-global-player action.
- `WaveformDisplay` for the selected version.
- Timestamp marker and comment composer.
- Chronological comment list with resolve state.

## Waveform Engine

`src/components/audio/WaveformDisplay.tsx` is a Client Component using `wavesurfer.js` through a dynamic import.

Contract:

- Input: signed playback URL, duration, selected marker, and callbacks.
- It renders a waveform only; `GlobalPlayer` remains the authoritative audible media element.
- Wavesurfer interaction calculates a finite timestamp and invokes `onSeekRequest(seconds)` plus `onMarkerChange(seconds)`.
- A typed module-scoped audio command bus sends seek commands to `GlobalPlayer` without storing DOM elements, media objects, or controllers in Zustand.
- The waveform cursor follows `useAudioStore.currentTime` for the matching source.
- Reduced motion disables animated cursor travel and nonessential transitions.
- Cleanup destroys the Wavesurfer instance and invalidates stale loading callbacks.

## Persistent Player Integration

Extend the playback contract without replacing the Phase 2 architecture:

- Add `expiresAt?: string` to `PlaybackSource`.
- Add a same-source URL refresh action that preserves current time, duration, volume, and intended playing state.
- `GlobalPlayer` subscribes to typed seek commands and assigns `audio.currentTime` imperatively.
- Create authenticated `POST /api/studio/playback/refresh`; it accepts only `versionId` and returns `{ playbackUrl, expiresAt }` after re-authorizing the version through the request-scoped client.
- Signed URL refresh is requested before expiry when the selected source remains active.
- A dedicated store/player refresh path, separate from normal source selection, updates the URL for the matching `sourceId` while preserving current time, duration, volume, and intended playing state.
- A refreshed URL restores the previous position after metadata loads.
- A request-generation token prevents stale refreshes from replacing a newer selected source.
- Failed refresh pauses playback and shows a generic actionable error without provider details.

## Timestamp Comments

- Clicking the waveform selects a timestamp and seeks the global player.
- The composer displays the formatted marker.
- Submitting non-empty content persists `timestamp_marker` with the selected version.
- Clicking a comment timestamp seeks the global player to that marker.
- Comment content is rendered as text, never HTML.

## Navigation and Responsive UI

- Replace Studio's `Coming soon` row with a real `/studio` link.
- Navigation active state is pathname-aware rather than hard-coded to Dashboard.
- Mobile header reflects the current module and keeps one visible theme control.
- Desktop follows the existing 260px sidebar and player-safe content geometry.
- Mobile cards stack with 16px safe margins; waveform and comment controls remain usable above the player dock.
- Use existing semantic tokens, Inter, Space Grotesk, glass hierarchy, Phosphor icons, focus rings, and reduced-motion policy.

## Error and Empty States

- Missing configuration: stable developer-facing configuration message.
- No tracks: explain that Studio is connected but empty and offer track creation.
- No versions: explain that playback becomes available after a version is registered.
- Signed URL failure: generic playback-unavailable message with retry.
- Waveform decode failure: keep track metadata and comments usable; provide a retry control.
- Mutation failure: return a stable field/form error without logging secrets or provider payloads.

## Security Requirements

- No service-role key is required in Phase 3 application code.
- No permanent storage URL enters client state or rendered markup.
- No cookies, tokens, environment values, signed URLs, or provider messages are logged.
- Server authorization and RLS both apply.
- `.env.local` remains ignored and untracked.
- SQL functions set a fixed search path.

## No-Test Validation Gates

The explicit user override prohibits creating, modifying, or running test files. Validation consists of:

- Supabase migration and policy inspection.
- `npx tsc --noEmit`.
- `npm run lint`.
- `npm run build`.
- Browser inspection for `/studio` and track detail at desktop/mobile sizes using non-secret development data only when available.
- Route, console, storage-URL, secret, and scope checks.

## Completion Criteria

Phase 3 is complete when:

- Schema, RLS, database types, Studio routes, signed playback, waveform, and timestamp comments are implemented.
- Studio is active in navigation and remains inside the persistent dashboard/player layout.
- No Phase 4 or Phase 5 UI is activated prematurely.
- TypeScript, lint, build, browser, security, and Git gates pass.
- The phase is committed, integrated into `main`, and pushed without force.

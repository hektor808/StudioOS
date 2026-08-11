# VEO OS Phase 4 Uploads, Operations & Content Design

**Status:** Approved under VEO OS full-autopilot authorization on 2026-08-11.

**Authority:** This specification refines `VEO_OS_MASTER_PLAN.md`, `VEO_OS_DESIGN_MANIFESTO.md`, and the approved provider-aware storage decision. The user's no-test override remains active.

## Objective

Add direct Cloudflare R2 production uploads, persist file/version metadata, and turn Operations and Content into functional dashboard modules. Heavy assets travel directly from the browser to R2; Next.js authorizes and signs requests but never proxies upload bodies.

## Scope

Phase 4 includes:

- Server-only R2 configuration and S3-compatible presigning.
- Uppy-based direct browser-to-R2 uploads.
- Upload completion persistence for `track_versions` and `files`.
- Studio file/version refresh after successful persistence.
- Operations actions list, calendar view, and mutations.
- Content idea moodboard/list, filters, and mutations.
- Active dashboard navigation for Studio, Operations, and Content.

Phase 4 does not include:

- Public listening links or guest access.
- Supabase service-role access.
- OpenAI, embeddings, vector retrieval, or VEO AI chat.
- Public R2 buckets or permanent R2 URLs.

## Storage Responsibilities

Use the approved provider split:

- **Cloudflare R2:** heavyweight source and production assets such as stems, project archives, FLP files, ZIP packages, high-resolution artwork, and lossless source mixes.
- **Supabase Storage:** playback-ready assets and externally published listening assets.
- **PostgreSQL:** provider, bucket, object key, content metadata, ownership, and relationships.

A database row never grants object access by itself. Authorized server code issues short-lived instructions or URLs.

## Dependencies

Add the official AWS SDK modules used for S3-compatible signing:

- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`

Keep the installed Uppy 5 packages:

- `@uppy/core`
- `@uppy/aws-s3`
- `@uppy/react`

Use the package versions selected by the existing lockfile. Do not add a second uploader framework.

## Server-Only R2 Configuration

Create `src/lib/r2/env.ts` and `src/lib/r2/client.ts`. Mark the boundary with `import "server-only"`.

Required environment variables:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `UPLOAD_GRANT_SECRET` (at least 32 random bytes, used only for HMAC-signed completion grants)

Derived endpoint:

- `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com`

Rules:

- Never expose R2 variables through `NEXT_PUBLIC_*`.
- Never log configuration values, signatures, or provider error payloads.
- Use region `auto` and path-style behavior compatible with R2.
- Validate configuration lazily at the server boundary so unrelated pages can still build.
- Return one stable configuration error when R2 is unavailable.

## R2 CORS Contract

The deployment bucket must allow the production application origin and development origin to:

- `PUT` objects.
- Send `Content-Type` and approved upload metadata headers.
- Read `ETag`.

The application includes a checked-in example policy at `docs/integrations/cloudflare-r2-cors.example.json` containing placeholder origins only. Real origins and credentials remain deployment configuration.

## Object-Key Design

Server code creates every object key. The browser cannot choose arbitrary paths.

Format:

`teams/default/<userId>/<trackId>/<category>/<uuid>-<sanitizedFilename>`

Where:

- `category` is `versions`, `stems`, `projects`, `archives`, `artwork`, or `other`.
- Filenames keep a safe extension, replace unsafe characters, and are length-limited.
- A cryptographically random UUID prevents collisions.
- `trackId` must be authorized and exist before signing.

## Presign API

Create `POST /api/uploads/r2/presign`.

Request JSON:

- `trackId: string`
- `filename: string`
- `contentType: string`
- `size: number`
- `uploadKind: "version" | "file"`
- `fileType?: Database["public"]["Enums"]["file_type"]`

Response JSON:

- `method: "PUT"`
- `url: string`
- `headers: { "Content-Type": string }`
- `object: { provider: "r2"; bucket: string; key: string }`
- `expiresAt: string`
- `completionGrant: string`

`completionGrant` is an opaque HMAC-SHA256-signed payload bound to user ID, track ID, key, upload kind, file type, MIME type, expected size, and a 30-minute registration expiry. The browser may return it but cannot alter its claims.

Security and validation:

- Require an authenticated Supabase user.
- Require `public.can_manage_track(trackId)` through the request-scoped RLS client; read access alone is insufficient.
- Enforce configured size limits before signing.
- Allow only approved MIME types and extensions for the selected upload kind.
- Sign for ten minutes.
- Do not accept ACL or public-read headers.
- Return generic 400, 401, 403, 404, and 503 responses without provider internals.

## Upload Limits

- Single object hard limit: 5 GiB for this release.
- Uppy UI guidance identifies large uploads and preserves progress.
- The initial implementation uses single-request presigned PUT uploads.
- Multipart upload is intentionally deferred until real upload telemetry demonstrates a need.
- Next.js request bodies remain metadata-sized; asset bytes never traverse the application server.

## Uppy Uploader

Create `src/components/upload/R2Uploader.tsx` as a Client Component.

Responsibilities:

- Create one Uppy instance per mounted uploader.
- Use the AWS S3 plugin with an asynchronous upload-parameters callback that calls the presign API.
- Support drag-and-drop plus file-picker input.
- Show per-file progress, cancellation, retry, accepted types, and size guidance.
- Keep upload state local to the component rather than Zustand.
- On provider completion, call an authorized persistence endpoint with the signed object descriptor and original file metadata.
- Display success only after database persistence succeeds.
- On persistence failure, clearly report that the object uploaded but registration failed and offer registration retry; do not silently repeat the object upload.
- Close and clean up the Uppy instance on unmount.

## Completion Persistence

Create `POST /api/uploads/r2/complete`.

The request contains `completionGrant` and the provider-returned `etag`. The server:

1. Authenticates the user.
2. Verifies the completion-grant signature, expiry, and user binding.
3. Re-authorizes the track with `public.can_manage_track(trackId)`.
4. Verifies that the claimed key belongs to the expected user, track, and allowed category.
5. Calls R2 `HeadObject` and verifies that the object exists and its size/content type match the signed claims; for single-part uploads, compare the normalized ETag when R2 returns one.
6. Rejects keys not rooted in the server-generated prefix or objects that do not match the grant.
7. Persists a `track_versions` or `files` row using the request-scoped Supabase client.
8. Returns a focused DTO for the new row.

Add a unique constraint across storage provider, bucket, and object key. Completion is idempotent: replaying a valid grant returns the existing row, while the uniqueness constraint prevents duplicate registration. Expired grants require a new presign flow; a still-valid grant can be retried without re-uploading.

For a track version:

- Compute `version_num` on the server under a database transaction/advisory lock or an atomic SQL function.
- Use `storage_provider = 'r2'`, configured bucket, private key in `storage_url`, and status `processing` unless the upload is already playback-ready.
- A production source in R2 is not automatically assumed playable by the browser.

For a file:

- Persist the approved `file_type`, object metadata, and uploader.

After success, revalidate `/studio` and `/studio/<trackId>`.

## Studio Integration

Enhance the Phase 3 track detail page with:

- `R2Uploader` configured for the current track.
- A version/file upload-kind selector.
- File inventory grouped by type.
- Provider-neutral labels such as “Production file” rather than exposing bucket internals.
- Status treatment for processing, ready, archived, and failed versions.
- Download actions that request short-lived URLs from an authorized server endpoint.

Create a provider-aware storage signer:

- Supabase objects use Supabase signed URLs.
- R2 objects use S3-compatible presigned GET URLs.
- The signer accepts a database storage locator and returns a short-lived URL DTO.
- Signed URLs are never persisted.

## Operations Module

Create `src/app/(dashboard)/operations/page.tsx` as a Server Component and focused components under `src/components/operations/`.

The page includes:

- Upcoming action summary.
- Month navigation controlled by `?month=YYYY-MM`.
- Responsive calendar grid on desktop.
- Chronological agenda list that remains the primary mobile representation.
- Status filters.
- Create and edit controls using Server Actions.

Action fields:

- Title: required, trimmed, max 160 characters.
- Description: optional, max 4,000 characters.
- Event date: required UTC timestamp constructed from explicit date/time input.
- Status: approved `action_status` enum.

Time-zone contract:

- Read `VEO_TIME_ZONE` as a server configuration value containing a valid IANA time-zone identifier; default to `UTC`.
- Display the active time zone beside date/time controls.
- Interpret entered local date/time in that zone, convert to UTC for persistence, and render calendar/agenda values back in the same zone.
- Reject invalid configured zone values with a stable Operations configuration state.

Behavior:

- Calendar days link to a filtered agenda position.
- Overdue planned/in-progress actions receive a semantic warning treatment.
- Completed and cancelled actions remain visible when filters permit.
- Empty months explain how to schedule the first action.

Create modules under `src/lib/operations/` for queries, mutations, validation, and DTOs. Use request-scoped Supabase and RLS.

## Content Module

Create `src/app/(dashboard)/content/page.tsx` as a Server Component and focused components under `src/components/content/`.

The page includes:

- Platform and status filters in URL search parameters.
- Moodboard cards with title, platform, difficulty, status, reference host, and notes excerpt.
- A compact list layout at narrow widths.
- Create and edit forms using Server Actions.
- Safe external reference links with `target="_blank"` and `rel="noreferrer"`.

Content fields:

- Title: required, trimmed, max 200 characters.
- Platform: required, normalized text, max 80 characters.
- Difficulty: approved enum.
- Status: approved enum.
- Reference URL: optional `http` or `https` URL only.
- Notes: optional, max 5,000 characters.

No remote reference image is fetched or proxied in this phase. Cards use metadata and designed artwork fallbacks, preventing tracker leakage and broken-image UI.

Create modules under `src/lib/content/` for queries, mutations, validation, and DTOs.

## Navigation

- Activate `/operations` and `/content` sidebar links.
- Preserve active-state support for `/`, `/studio`, `/operations`, and `/content`.
- Leave VEO AI visibly unavailable until Phase 5.
- Mobile header titles follow the active route.

## Responsive and Visual Direction

Follow the established VEO system:

- Black/near-black dark ground, `#FAFAFA` light ground, and `#2E008B` accent.
- Space Grotesk for module headings and data; Inter for UI text.
- Glass hierarchy, subtle borders, and restrained semantic colors.
- Operations prioritizes dates and status scanning, not decorative analytics.
- Content uses a denser visual-board rhythm without introducing unrelated gradients.
- All upload, calendar, and moodboard controls have visible keyboard focus.
- Reduced motion disables nonessential progress and card transitions.
- Keep content above the persistent player dock on mobile and desktop.

## Error and Recovery States

- R2 unavailable: disable upload initiation, retain all existing Studio data, and show a stable configuration message.
- Presign rejected: explain whether the user must select a different file, reduce size, or sign in again.
- Transfer interrupted: Uppy exposes retry/cancel without duplicating completed rows.
- Registration failed: keep object metadata in component state for a registration-only retry.
- Operations/Content mutation failed: return stable field/form errors, never raw Supabase messages.
- Invalid month/filter search parameters: normalize to safe defaults.

## Security Requirements

- R2 credentials are server-only.
- The presign endpoint signs only server-generated keys after `can_manage_track()` authorization.
- Completion grants are HMAC signed, short-lived, user-bound, and verified against R2 `HeadObject` before idempotent persistence.
- Upload and download URLs, completion grants, signatures, and ETags are never logged or persisted as secrets.
- Database RLS remains enabled and authoritative.
- No object body passes through Next.js.
- No permanent public bucket or URL is introduced.
- `.env.local` remains ignored and untracked.

## No-Test Validation Gates

The explicit no-test override prohibits creating, modifying, or running test files. Validate with:

- R2 environment, CORS example, key construction, route authorization, and scope inspection.
- Supabase migration/policy review for atomic version allocation and storage metadata.
- `npx tsc --noEmit`.
- `npm run lint`.
- `npm run build`.
- Browser inspection of Studio upload states, Operations, and Content at desktop/mobile widths.
- Network inspection confirming asset bytes target R2 directly and no secret values appear in client bundles or responses.
- Git diff and secret-safety review.

## Completion Criteria

Phase 4 is complete when:

- Authorized Uppy-to-R2 direct uploads and metadata persistence are implemented.
- Studio exposes provider-neutral versions/files and short-lived download access.
- Operations and Content are functional, responsive, and active in navigation.
- VEO AI and public listening remain inactive.
- TypeScript, lint, build, browser, storage, security, and Git gates pass.
- The phase is committed, integrated into `main`, and pushed without force.

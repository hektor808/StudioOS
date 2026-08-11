# VEO OS Phase 4 Uploads, Operations & Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add authorized direct browser-to-Cloudflare-R2 uploads with idempotent metadata registration, extend Studio with production files and short-lived downloads, and activate functional Operations and Content modules without activating Phase 5.

**Architecture:** Next.js authenticates and authorizes metadata-sized presign, completion, and download requests while Uppy 5 sends asset bytes directly to R2 through ten-minute presigned PUT URLs. Completion uses the request-scoped Supabase client for authentication and `can_manage_track`, verifies the 30-minute HMAC grant and R2 `HeadObject`, then uses the existing Phase 3 server-only Supabase admin client to call service-role-only atomic registration RPCs with unique storage locators. Downloads first authorize the requested version/file row through request-scoped RLS; a safe Supabase `playback` locator is then signed by the server-only admin client, while a safe R2 locator is signed only with server-side R2 credentials. Browser roles cannot execute registration RPCs, insert directly into `track_versions`/`files`, or directly read/list Storage objects. Request-scoped Supabase modules continue to serve Studio reads, Operations, and Content through RLS; server-rendered pages use focused client forms and canonically normalized URL filters inside the persistent dashboard/player shell.

**Tech Stack:** Next.js 14.2.35 App Router and Server Actions, React 18, TypeScript 5, Supabase SSR 0.12 / supabase-js 2.112, PostgreSQL and RLS, Cloudflare R2 S3 API, AWS SDK v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`), Uppy 5 (`@uppy/core`, `@uppy/aws-s3`, `@uppy/react`), Zod 4, `Intl.DateTimeFormat`, Tailwind CSS 3.4, Framer Motion 13, and Phosphor Icons.

## Global Constraints

- Begin from `main` after Phase 3 is fully integrated, create `phase-4-uploads-operations-content`, integrate it into current `main` only after every gate passes, and never use a force push.
- Read `VEO_OS_MASTER_PLAN.md`, `VEO_OS_DESIGN_MANIFESTO.md`, `docs/superpowers/specs/2026-08-11-veo-os-phase-3-studio-waveform-design.md`, and `docs/superpowers/specs/2026-08-11-veo-os-phase-4-uploads-operations-content-design.md` before implementation.
- Do not create, modify, rename, delete, or run automated test files or test-suite commands. Do not run Vitest, `npm test`, `npm run test`, or any command that discovers test files.
- Validation is limited to migration/policy inspection, `npx tsc --noEmit`, `npm run lint`, `npm run build`, browser checks, network checks, security review, secret/scope inspection, and Git integrity checks.
- Add only `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`; retain the installed Uppy 5 packages and do not add another uploader or a multipart implementation.
- Heavy object bytes must travel from the browser directly to private R2. Next.js handles only metadata-sized JSON and never accepts an upload body, multipart form body, public ACL, or permanent public object URL.
- R2 configuration and `UPLOAD_GRANT_SECRET` are server-only, lazily validated, never named `NEXT_PUBLIC_*`, never logged, and never serialized into a Client Component.
- A presign requires an authenticated user, an existing track, and `public.can_manage_track(trackId) = true`; authenticated read access alone does not grant upload permission.
- Presigned PUT URLs expire after 600 seconds. Completion grants expire after 1,800 seconds and are HMAC-SHA256 signed, versioned, user-bound, track-bound, key-bound, kind-bound, MIME-bound, expected-size-bound, and file-type-bound.
- The release uses single-request PUT only, with a hard maximum of `5 * 1024 * 1024 * 1024` bytes. Multipart upload remains deferred.
- Completion must call R2 `HeadObject`, compare content length and canonical content type, compare normalized ETag when R2 returns one, and persist only through idempotent database functions protected by unique `(storage_provider, storage_bucket, storage_url)` locators.
- `storage_url` remains a private object key, never an HTTP URL. Required object locators, signed URLs, grants, and ETags may exist only in their declared ephemeral transport paths; privacy gates inspect logging, telemetry, error serialization, database writes, browser storage, Zustand persistence, and rendered markup rather than rejecting required transport identifiers from source.
- Use the request-scoped Supabase client for user authentication, track reads, `can_manage_track`, Studio reads/download-row authorization, Operations, and Content. Only after authentication, capability, HMAC grant, key-scope, and `HeadObject` checks pass may completion use the existing Phase 3 `createAdminClient()` from `src/lib/supabase/admin.ts` to call service-role-only registration RPCs.
- The same existing admin client has one separate, narrow download use: after request-scoped authentication, an RLS-authorized lookup of the requested version/file row, and safe `supabase`/`playback` locator validation, the server-only storage signer may call `storage.from("playback").createSignedUrl(...)`. Do not create another admin client or expose `SUPABASE_SERVICE_ROLE_KEY`; the admin client is never used by presign, R2 signing, Operations, Content, authorization logic, or any Client Component.
- Revoke registration RPC execution and direct `track_versions`/`files` inserts from browser roles. Add no browser `storage.objects` read/list policy and never return a private bucket or object key as a standalone browser field; the only browser object access is through the authorized short-lived signed URL.
- `VEO_TIME_ZONE` is server-only, accepts a valid IANA time-zone identifier, defaults exactly to `UTC`, and produces one stable Operations configuration state when invalid.
- Use existing semantic tokens, dark `#000000`, light `#FAFAFA`, accent `#2E008B`, Inter UI copy, Space Grotesk headings/data, glass hierarchy, Phosphor icons, visible focus states, player-safe layout, and reduced-motion behavior.
- Operations and Content become active. VEO AI, public listening, guest access, watermarking, vectors, embeddings, OpenAI calls, public buckets, and permanent external URLs remain inactive.
- Do not fabricate tracks, files, actions, content ideas, counts, dates, hosts, upload results, or production claims. Empty states must reflect actual data.
- `.env.local` remains ignored and untracked. The checked-in R2 CORS document contains placeholder origins only.
- Every ordinary implementation commit ends with `Co-Authored-By: Claude <noreply@anthropic.com>`.

---

## File Map

### R2, upload authorization, and storage access

- Modify: `package.json` — add the two official AWS SDK modules.
- Modify: `package-lock.json` — lock the resolved AWS SDK dependency graph.
- Create: `src/lib/r2/env.ts` — lazy server-only environment validation and stable configuration error.
- Create: `src/lib/r2/client.ts` — lazy R2 `S3Client` configured with `region: "auto"` and `forcePathStyle: true`.
- Create: `src/lib/r2/object-key.ts` — category mapping, filename sanitization, random object-key creation, and prefix verification.
- Create: `src/lib/r2/completion-grant.ts` — typed HMAC-SHA256 grant issuance and verification.
- Create: `src/lib/uploads/types.ts` — upload request/response, storage locator, completion DTO, and browser-safe upload contracts.
- Create: `src/lib/uploads/validation.ts` — 5 GiB limit, extension/MIME/file-type matrix, and request schemas.
- Create: `src/lib/uploads/presign.ts` — authenticated capability check, server key generation, PUT signing, and completion-grant issuance.
- Create: `src/lib/uploads/complete.ts` — request-scoped auth/capability checks, grant and `HeadObject` verification, then service-role-only idempotent RPC persistence and DTO mapping.
- Use unchanged: `src/lib/supabase/admin.ts` — existing Phase 3 server-only `createAdminClient()` boundary used only for verified registration RPCs and authorized Supabase Storage signed URLs; do not duplicate it.
- Create: `src/app/api/uploads/r2/presign/route.ts` — JSON-only presign endpoint.
- Create: `src/app/api/uploads/r2/complete/route.ts` — JSON-only completion endpoint.
- Create: `src/lib/storage/signer.ts` — provider-aware short-lived GET signer.
- Create: `src/app/api/studio/download/route.ts` — authorized version/file download instruction endpoint.
- Create: `docs/integrations/cloudflare-r2-cors.example.json` — private-bucket CORS example with placeholder origins.

### Database completion primitives and types

- Create: `supabase/migrations/20260811010000_phase_4_upload_registration.sql` — storage locator uniqueness, required action dates, widened Content limits, URL checks, and atomic idempotent R2 registration RPCs.
- Regenerate: `src/types/database.types.ts` — generate from the migrated authorized local/non-production schema with Supabase CLI; never patch generated types manually.

### Studio upload and inventory integration

- Create: `src/components/upload/R2Uploader.tsx` — one Uppy 5 instance, direct PUT, transfer controls, completion persistence, and registration-only retry.
- Modify: `src/app/layout.tsx` — import Uppy core/dashboard CSS once at the root boundary.
- Modify: `src/lib/studio/types.ts` — browser-safe file DTO and provider-neutral storage availability labels.
- Modify: `src/lib/studio/queries.ts` — track file inventory and expanded version metadata.
- Modify: `src/app/(dashboard)/studio/[trackId]/page.tsx` — fetch files with versions/comments.
- Modify: `src/components/studio/studio-detail-client.tsx` — upload-kind selector, uploader, files panel, and refreshed props.
- Modify: `src/components/studio/version-selector.tsx` — status/storage/download treatment.
- Create: `src/components/studio/studio-files-panel.tsx` — grouped provider-neutral file inventory.
- Create: `src/components/studio/download-button.tsx` — fetch a short-lived URL only on user activation.

### Operations

- Create: `src/lib/operations/types.ts` — DTOs, filters, calendar cells, and action result types.
- Create: `src/lib/operations/time-zone.ts` — `VEO_TIME_ZONE`, local-to-UTC conversion, and zoned rendering helpers.
- Create: `src/lib/operations/validation.ts` — month/filter and action form schemas.
- Create: `src/lib/operations/queries.ts` — month calendar, agenda, filters, and upcoming summary.
- Create: `src/lib/operations/mutations.ts` — create/update Server Action using request-scoped Supabase and RLS.
- Create: `src/app/(dashboard)/operations/page.tsx` — server-rendered Operations route.
- Create: `src/components/operations/operations-board.tsx` — summary, calendar, agenda, and stable configuration/empty states.
- Create: `src/components/operations/action-form.tsx` — create/edit action form with explicit zoned date/time fields.

### Content

- Create: `src/lib/content/types.ts` — content DTOs, filters, and action result types.
- Create: `src/lib/content/validation.ts` — exact title/platform/URL/notes constraints and safe filter normalization.
- Create: `src/lib/content/queries.ts` — platform/status-filtered content reads.
- Create: `src/lib/content/mutations.ts` — create/update Server Action using request-scoped Supabase and RLS.
- Create: `src/app/(dashboard)/content/page.tsx` — server-rendered Content route.
- Create: `src/components/content/content-board.tsx` — moodboard/compact list, filters, safe links, and honest empty state.
- Create: `src/components/content/content-idea-form.tsx` — create/edit form.

### Navigation and shared presentation

- Modify: `src/components/dashboard/dashboard-sidebar.tsx` — activate Studio, Operations, and Content while leaving VEO AI unavailable.
- Modify: `src/components/dashboard/mobile-dashboard-header.tsx` — route-aware title and four active module links.
- Modify: `src/components/dashboard/dashboard-home.tsx` — link to Operations/Content and retain VEO AI as pending.
- Modify: `src/app/globals.css` — Uppy skin overrides and responsive Operations/Content layout hooks without changing the player dock contract.

---

### Task 1: Install AWS SDK and establish the server-only R2 boundary

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/r2/env.ts`
- Create: `src/lib/r2/client.ts`
- Create: `src/lib/r2/object-key.ts`
- Create: `src/lib/r2/completion-grant.ts`
- Create: `src/lib/uploads/types.ts`
- Create: `docs/integrations/cloudflare-r2-cors.example.json`
- Modify: `docs/superpowers/plans/2026-08-11-veo-os-phase-4-uploads-operations-content.md` only if execution feedback requires correcting this plan; do not otherwise rewrite it during implementation.

**Interfaces:**
- Produces: `R2_CONFIGURATION_ERROR`, `R2Config`, `getR2Config()`, and `getR2Client()`.
- Produces: `UploadKind`, `UploadCategory`, `StorageLocator`, `CompletionGrantClaims`, `PresignResponse`, `CompletedUploadDTO`, and `SignedDownloadDTO`.
- Produces: `buildR2ObjectKey(input)`, `expectedR2Prefix(input)`, and `isExpectedR2Key(input)`.
- Produces: `createCompletionGrant(claims)` and `verifyCompletionGrant(token)`.
- Consumed by: Tasks 2–5; no Client Component imports any file under `src/lib/r2/`.

- [ ] **Step 1: Start from integrated Phase 3 and create the feature branch**

Run:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git log --oneline --decorate -8
git switch -c phase-4-uploads-operations-content
```

Expected: `main` contains the completed Phase 3 merge, including server-only `src/lib/supabase/admin.ts` exporting `createAdminClient()` and its stable environment boundary; the new branch is based on that commit. If that boundary is absent, stop instead of implementing against Phase 2 or recreating an admin client in Phase 4.

- [ ] **Step 2: Install only the approved AWS SDK modules**

Run:

```powershell
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Expected: `package.json` gains both modules under `dependencies`; `package-lock.json` resolves one AWS SDK v3 graph; existing `@uppy/core`, `@uppy/aws-s3`, and `@uppy/react` entries remain unchanged; no uploader or time-zone dependency is added.

- [ ] **Step 3: Define the shared upload and storage contracts**

Create `src/lib/uploads/types.ts`:

```ts
import type { Database } from "@/types/database.types";

export type UploadKind = "version" | "file";
export type UploadCategory =
  | "versions"
  | "stems"
  | "projects"
  | "archives"
  | "artwork"
  | "other";
export type FileType = Database["public"]["Enums"]["file_type"];

export type StorageLocator = {
  provider: Database["public"]["Enums"]["storage_provider"];
  bucket: string;
  key: string;
};

export type CompletionGrantClaims = {
  version: 1;
  userId: string;
  trackId: string;
  object: StorageLocator & { provider: "r2" };
  uploadKind: UploadKind;
  fileType: FileType | null;
  originalFilename: string;
  contentType: string;
  expectedSize: number;
  expiresAt: number;
};

export type PresignResponse = {
  method: "PUT";
  url: string;
  headers: { "Content-Type": string };
  object: StorageLocator & { provider: "r2" };
  expiresAt: string;
  completionGrant: string;
};

export type CompletedUploadDTO =
  | {
      kind: "version";
      row: {
        id: string;
        trackId: string;
        versionNumber: number;
        status: Database["public"]["Enums"]["track_version_status"];
        originalFilename: string;
        mimeType: string | null;
        sizeBytes: number | null;
        createdAt: string;
        storageAvailability: "production";
      };
    }
  | {
      kind: "file";
      row: {
        id: string;
        trackId: string;
        fileType: FileType;
        originalFilename: string;
        mimeType: string | null;
        sizeBytes: number;
        createdAt: string;
        storageAvailability: "production";
      };
    };

export type SignedDownloadDTO = {
  url: string;
  expiresAt: string;
};
```

No exported browser-facing DTO may include `storage_url`, `storage_bucket`, a completion grant, an ETag, or an AWS/Supabase error.

- [ ] **Step 4: Implement lazy server-only R2 environment and client modules**

Create `src/lib/r2/env.ts` with `import "server-only"` and this contract:

```ts
import "server-only";

export const R2_CONFIGURATION_ERROR = "R2 storage is not configured.";

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  uploadGrantSecret: string;
  endpoint: string;
};

export function getR2Config(
  values: NodeJS.ProcessEnv = process.env,
): R2Config {
  const accountId = values.R2_ACCOUNT_ID?.trim();
  const accessKeyId = values.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = values.R2_SECRET_ACCESS_KEY?.trim();
  const bucketName = values.R2_BUCKET_NAME?.trim();
  const uploadGrantSecret = values.UPLOAD_GRANT_SECRET?.trim();

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !uploadGrantSecret ||
    Buffer.byteLength(uploadGrantSecret, "utf8") < 32
  ) {
    throw new Error(R2_CONFIGURATION_ERROR);
  }

  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucketName,
    uploadGrantSecret,
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  };
}
```

Create `src/lib/r2/client.ts`:

```ts
import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

import { getR2Config } from "@/lib/r2/env";

let cachedClient: S3Client | null = null;

export function getR2Client(): { client: S3Client; bucket: string } {
  const config = getR2Config();
  cachedClient ??= new S3Client({
    region: "auto",
    endpoint: config.endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  return { client: cachedClient, bucket: config.bucketName };
}
```

Do not validate at module load, export a client singleton directly, log caught errors, or add public environment aliases.

- [ ] **Step 5: Implement server-generated object keys and strict prefix checks**

Create `src/lib/r2/object-key.ts` with `import "server-only"`, `randomUUID` from `node:crypto`, and these exports:

```ts
export type BuildR2ObjectKeyInput = {
  userId: string;
  trackId: string;
  uploadKind: UploadKind;
  fileType: FileType | null;
  filename: string;
  uuid?: string;
};

export function categoryForUpload(
  uploadKind: UploadKind,
  fileType: FileType | null,
): UploadCategory;

export function sanitizeUploadFilename(filename: string): string;

export function expectedR2Prefix(input: {
  userId: string;
  trackId: string;
  category: UploadCategory;
}): string;

export function buildR2ObjectKey(input: BuildR2ObjectKeyInput): string;

export function isExpectedR2Key(input: {
  key: string;
  userId: string;
  trackId: string;
  category: UploadCategory;
}): boolean;
```

Use this exact category mapping:

```ts
if (uploadKind === "version") return "versions";
if (fileType === "stem") return "stems";
if (fileType === "flp") return "projects";
if (fileType === "zip") return "archives";
if (fileType === "artwork") return "artwork";
return "other";
```

`sanitizeUploadFilename` must use only the final path segment, normalize with `NFKC`, preserve one lower-cased safe extension of at most 16 characters, replace other non-ASCII-alphanumeric `._-` runs with `-`, trim separators, use fallback base `upload`, and limit the final filename to 160 characters. `buildR2ObjectKey` returns exactly:

```ts
`${expectedR2Prefix({ userId, trackId, category })}${uuid ?? randomUUID()}-${sanitizeUploadFilename(filename)}`
```

where `expectedR2Prefix` returns `teams/default/${userId}/${trackId}/${category}/`. Reject IDs containing `/`, `\\`, or `..`; `isExpectedR2Key` must require `key.startsWith(prefix)`, forbid `..`, and require exactly one object-name segment after the prefix.

- [ ] **Step 6: Implement opaque HMAC-SHA256 completion grants**

Create `src/lib/r2/completion-grant.ts` with `import "server-only"`, `createHmac`/`timingSafeEqual` from `node:crypto`, and a Zod schema matching `CompletionGrantClaims` exactly.

```ts
export function createCompletionGrant(
  claims: CompletionGrantClaims,
): string;

export function verifyCompletionGrant(
  token: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): CompletionGrantClaims;
```

Serialize claims with `JSON.stringify`, encode payload as `base64url`, sign the encoded payload with `createHmac("sha256", getR2Config().uploadGrantSecret).update(payload).digest("base64url")`, and return `${payload}.${signature}`. Verification must split into exactly two non-empty segments, recompute the signature, compare equal-length buffers with `timingSafeEqual`, parse/validate the payload, require `claims.version === 1`, and reject `claims.expiresAt <= nowSeconds`. Every failure throws only `new Error("Upload completion grant is invalid.")`; no token or claim is logged.

- [ ] **Step 7: Check in the private-bucket CORS example**

Create `docs/integrations/cloudflare-r2-cors.example.json` exactly as deployment guidance, with placeholders rather than real origins:

```json
[
  {
    "AllowedOrigins": [
      "https://app.example.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

The application never applies this file automatically; deployment must replace placeholder origins in the R2 dashboard/API without committing credentials or production secrets.

- [ ] **Step 8: Run non-test dependency and server-boundary validation**

Run:

```powershell
npm ls @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @uppy/core @uppy/aws-s3 @uppy/react
npx tsc --noEmit
npm run lint
npm run build
git diff --check
$sourceFiles = Get-ChildItem "src" -Recurse -File -Include *.ts,*.tsx
$publicR2 = $sourceFiles | Select-String -Pattern "NEXT_PUBLIC_R2|NEXT_PUBLIC_UPLOAD_GRANT" -ErrorAction SilentlyContinue
if ($publicR2) { throw "Public R2 environment name found." }
```

Expected: dependencies resolve once; type/lint/build succeed; R2 modules are server-only and lazily configured; no public R2 environment name or whitespace error exists.

- [ ] **Step 9: Commit the dependency and R2 foundation**

```powershell
git add package.json package-lock.json src/lib/r2 src/lib/uploads/types.ts docs/integrations/cloudflare-r2-cors.example.json docs/superpowers/plans/2026-08-11-veo-os-phase-4-uploads-operations-content.md
git commit -m "feat: establish private R2 upload foundation`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Add service-role-only atomic registration and regenerate database types

**Files:**
- Create: `supabase/migrations/20260811010000_phase_4_upload_registration.sql`
- Modify: `src/types/database.types.ts`

**Interfaces:**
- Produces: unique storage locators on `track_versions` and `files`.
- Produces: service-role-only `public.register_r2_track_version(p_user_id, ...) returns public.track_versions`.
- Produces: service-role-only `public.register_r2_file(p_user_id, ...) returns public.files`.
- Produces: revoked authenticated direct inserts/policies for `track_versions` and `files`.
- Produces: non-null `actions.event_date`, Content title limit 200, Content notes limit 5,000, and database-level `http`/`https` reference URL constraint.
- Produces: `src/types/database.types.ts` generated from the actually migrated authorized local/non-production database.
- Consumed by: admin-client completion persistence in Task 4 and Operations/Content in Tasks 6–7.

- [ ] **Step 1: Add locator uniqueness and align Phase 3 schema with approved Phase 4 field constraints**

Create `supabase/migrations/20260811010000_phase_4_upload_registration.sql`. Begin with a data-safety guard and exact constraint changes:

```sql
do $$
begin
  if exists (select 1 from public.actions where event_date is null) then
    raise exception 'Phase 4 requires every action to have event_date before migration.';
  end if;
end;
$$;

alter table public.actions
  alter column event_date set not null;

alter table public.content_ideas
  drop constraint if exists content_ideas_title_length,
  drop constraint if exists content_ideas_notes_length,
  drop constraint if exists content_ideas_reference_url_length;

alter table public.content_ideas
  add constraint content_ideas_title_length
    check (char_length(btrim(title)) between 1 and 200),
  add constraint content_ideas_notes_length
    check (char_length(notes) <= 5000),
  add constraint content_ideas_reference_url_length
    check (reference_url is null or char_length(reference_url) <= 2048),
  add constraint content_ideas_reference_url_http
    check (reference_url is null or reference_url ~* '^https?://');

alter table public.track_versions
  add constraint track_versions_storage_locator_unique
  unique (storage_provider, storage_bucket, storage_url);

alter table public.files
  add constraint files_storage_locator_unique
  unique (storage_provider, storage_bucket, storage_url);

revoke insert on table public.track_versions from authenticated;
revoke insert on table public.files from authenticated;

drop policy if exists "track_versions_insert_manage" on public.track_versions;
drop policy if exists "files_insert_manage" on public.files;
```

Do not remove the existing `(track_id, version_num)` uniqueness or disable RLS. Authenticated users retain the Phase 3 select and authorized update/delete policies, but no browser token can register a new version/file row directly.

- [ ] **Step 2: Create the atomic track-version registration RPC**

Append a `security invoker` function with fixed search path. It receives the already verified user ID explicitly because the service-role client is not the request user's JWT session:

```sql
create or replace function public.register_r2_track_version(
  p_user_id uuid,
  p_track_id uuid,
  p_bucket text,
  p_object_key text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint
)
returns public.track_versions
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  existing_row public.track_versions;
  inserted_row public.track_versions;
  next_version integer;
begin
  if p_user_id is null
     or not exists (select 1 from public.users where id = p_user_id)
     or not exists (select 1 from public.tracks where id = p_track_id)
     or p_bucket is null
     or btrim(p_bucket) = ''
     or p_object_key not like format(
       'teams/default/%s/%s/%%', p_user_id::text, p_track_id::text
     )
     or p_object_key ~ '(^|/)\.\.(/|$)'
     or p_original_filename is null
     or char_length(btrim(p_original_filename)) not between 1 and 512
     or p_mime_type is null
     or btrim(p_mime_type) = ''
     or p_size_bytes is null
     or p_size_bytes <= 0 then
    raise check_violation using message = 'Upload metadata is invalid.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('track-version:' || p_track_id::text, 0));

  select * into existing_row
  from public.track_versions
  where storage_provider = 'r2'
    and storage_bucket = p_bucket
    and storage_url = p_object_key;

  if found then
    if existing_row.track_id <> p_track_id
       or existing_row.created_by <> p_user_id
       or existing_row.original_filename <> btrim(p_original_filename)
       or existing_row.mime_type is distinct from btrim(p_mime_type)
       or existing_row.size_bytes is distinct from p_size_bytes then
      raise check_violation using message = 'Existing upload metadata does not match.';
    end if;
    return existing_row;
  end if;

  select coalesce(max(version_num), 0) + 1
  into next_version
  from public.track_versions
  where track_id = p_track_id;

  insert into public.track_versions (
    track_id,
    version_num,
    storage_url,
    storage_provider,
    storage_bucket,
    original_filename,
    mime_type,
    size_bytes,
    status,
    created_by
  ) values (
    p_track_id,
    next_version,
    p_object_key,
    'r2',
    p_bucket,
    btrim(p_original_filename),
    btrim(p_mime_type),
    p_size_bytes,
    'processing',
    p_user_id
  )
  returning * into inserted_row;

  return inserted_row;
end;
$$;
```

The advisory lock is per track so concurrent uploads cannot allocate the same `version_num`. The function does not call `auth.uid()` or `can_manage_track`; the request-scoped completion boundary already performed those checks before constructing the admin client. Execute privilege is restricted to `service_role`, and the function refuses a replay whose locator exists with different verified metadata.

- [ ] **Step 3: Create the idempotent file registration RPC**

Append:

```sql
create or replace function public.register_r2_file(
  p_user_id uuid,
  p_track_id uuid,
  p_file_type public.file_type,
  p_bucket text,
  p_object_key text,
  p_original_filename text,
  p_mime_type text,
  p_size_bytes bigint
)
returns public.files
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  existing_row public.files;
  inserted_row public.files;
begin
  if p_user_id is null
     or not exists (select 1 from public.users where id = p_user_id)
     or not exists (select 1 from public.tracks where id = p_track_id)
     or p_file_type is null
     or p_bucket is null
     or btrim(p_bucket) = ''
     or p_object_key not like format(
       'teams/default/%s/%s/%%', p_user_id::text, p_track_id::text
     )
     or p_object_key ~ '(^|/)\.\.(/|$)'
     or p_original_filename is null
     or char_length(btrim(p_original_filename)) not between 1 and 512
     or p_mime_type is null
     or btrim(p_mime_type) = ''
     or p_size_bytes is null
     or p_size_bytes <= 0 then
    raise check_violation using message = 'Upload metadata is invalid.';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended('file:' || p_bucket || ':' || p_object_key, 0)
  );

  select * into existing_row
  from public.files
  where storage_provider = 'r2'
    and storage_bucket = p_bucket
    and storage_url = p_object_key;

  if found then
    if existing_row.track_id <> p_track_id
       or existing_row.uploaded_by <> p_user_id
       or existing_row.type <> p_file_type
       or existing_row.original_filename <> btrim(p_original_filename)
       or existing_row.mime_type is distinct from btrim(p_mime_type)
       or existing_row.size_bytes is distinct from p_size_bytes then
      raise check_violation using message = 'Existing upload metadata does not match.';
    end if;
    return existing_row;
  end if;

  insert into public.files (
    track_id,
    type,
    storage_url,
    storage_provider,
    storage_bucket,
    original_filename,
    mime_type,
    size_bytes,
    uploaded_by
  ) values (
    p_track_id,
    p_file_type,
    p_object_key,
    'r2',
    p_bucket,
    btrim(p_original_filename),
    btrim(p_mime_type),
    p_size_bytes,
    p_user_id
  )
  returning * into inserted_row;

  return inserted_row;
end;
$$;
```

Finish with exact least-privilege grants:

```sql
revoke all on function public.register_r2_track_version(uuid, uuid, text, text, text, text, bigint) from public, anon, authenticated;
revoke all on function public.register_r2_file(uuid, uuid, public.file_type, text, text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.register_r2_track_version(uuid, uuid, text, text, text, text, bigint) to service_role;
grant execute on function public.register_r2_file(uuid, uuid, public.file_type, text, text, text, text, bigint) to service_role;
```

- [ ] **Step 4: Inspect the migration dry run, then apply it only to an authorized local/non-production database**

Start the local Supabase stack if it is not already running, inspect the exact pending migration, and apply only after the dry-run output is correct:

```powershell
npx supabase start
npx supabase db push --dry-run --local
npx supabase migration list --local
npx supabase migration up --local
npx supabase migration list --local
npx supabase db lint --local --schema public --level warning --fail-on error
```

Expected: the dry run names `20260811010000_phase_4_upload_registration.sql`; `migration up --local` succeeds against the developer's authorized local target; the final list marks it applied locally.

If local Supabase cannot be used, first obtain explicit authorization for a non-production database, provide its connection string through the pre-existing untracked `SUPABASE_DB_URL` environment variable, and use this exact alternative without printing the value:

```powershell
if (-not $env:SUPABASE_DB_URL) { throw "Authorized non-production SUPABASE_DB_URL is required." }
npx supabase db push --dry-run --db-url "$env:SUPABASE_DB_URL"
npx supabase migration list --db-url "$env:SUPABASE_DB_URL"
npx supabase db push --db-url "$env:SUPABASE_DB_URL"
npx supabase migration list --db-url "$env:SUPABASE_DB_URL"
npx supabase db lint --db-url "$env:SUPABASE_DB_URL" --schema public --level warning --fail-on error
```

Expected: the dry run names only the intended pending Phase 4 migration, the authorized non-production apply succeeds, and the second migration list marks it applied. Never use an implicitly linked target for the apply step, never place the database URL in a tracked file or command output, and never apply this migration first to production.

- [ ] **Step 5: Verify the migrated catalog before generating types**

Open the local/non-production SQL editor reported by `npx supabase status` and run these read-only catalog checks:

```sql
select conrelid::regclass as table_name,
       conname,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where conname in (
  'track_versions_track_version_unique',
  'track_versions_storage_locator_unique',
  'files_storage_locator_unique',
  'content_ideas_title_length',
  'content_ideas_notes_length',
  'content_ideas_reference_url_length',
  'content_ideas_reference_url_http'
)
order by conname;

select attrelid::regclass as table_name,
       attname,
       attnotnull
from pg_attribute
where attrelid = 'public.actions'::regclass
  and attname = 'event_date'
  and not attisdropped;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'users',
    'tracks',
    'track_versions',
    'comments',
    'files',
    'actions',
    'content_ideas'
  )
order by tablename;

select p.proname,
       pg_get_userbyid(p.proowner) as owner_name,
       p.prosecdef,
       p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('register_r2_track_version', 'register_r2_file')
order by p.proname;

select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'users',
    'tracks',
    'track_versions',
    'comments',
    'files',
    'actions',
    'content_ideas'
  )
order by tablename, policyname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('track_versions', 'files')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;
```

Expected: both locator constraints and the existing `(track_id, version_num)` constraint exist; `actions.event_date` has `attnotnull = true`; Content constraint definitions enforce the approved 200/5,000/2,048 limits and `http`/`https`; every listed table has `rowsecurity = true`; both functions have the expected migration owner, `prosecdef = false`, fixed `search_path`, `anon_execute = false`, `authenticated_execute = false`, and `service_role_execute = true`; no INSERT policy remains on `track_versions` or `files`; all remaining policies are scoped to `authenticated` rather than `anon`/`public`; and neither browser role has table INSERT privilege on the registration tables.

- [ ] **Step 6: Regenerate database types from the migrated schema; do not hand-edit them**

Run:

```powershell
$generatedTypes = npx supabase gen types typescript --local
if ($LASTEXITCODE -ne 0) { throw "Supabase type generation failed." }
$typesPath = (Resolve-Path "src/types/database.types.ts").Path
[System.IO.File]::WriteAllText(
  $typesPath,
  (($generatedTypes -join [Environment]::NewLine) + [Environment]::NewLine),
  [System.Text.UTF8Encoding]::new($false)
)
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

If the authorized non-production target was used instead of local, replace the first command with `$generatedTypes = npx supabase gen types typescript --db-url "$env:SUPABASE_DB_URL"` so types come from that exact migrated schema. Inspect the generated file to confirm both RPC argument lists include `p_user_id`, `actions.event_date` reflects the migrated non-null schema, and existing `can_manage_track` remains present. Do not manually add, remove, or patch generated `Database` members.

- [ ] **Step 7: Commit the database completion primitives**

```powershell
git add supabase/migrations/20260811010000_phase_4_upload_registration.sql src/types/database.types.ts
git commit -m "feat: add idempotent upload registration`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Implement authorized presigning and HMAC completion grants

**Files:**
- Create: `src/lib/uploads/validation.ts`
- Create: `src/lib/uploads/presign.ts`
- Create: `src/app/api/uploads/r2/presign/route.ts`

**Interfaces:**
- Produces: `MAX_UPLOAD_SIZE_BYTES`, `PRESIGN_TTL_SECONDS`, `COMPLETION_GRANT_TTL_SECONDS`, `presignRequestSchema`, `normalizeUploadSelection(input)`, and `getAllowedUploadTypes(uploadKind, fileType)`.
- Produces: `createR2Presign(input): Promise<PresignResponse>`.
- Produces: `POST /api/uploads/r2/presign` with only the approved request and response fields.
- Consumed by: `R2Uploader` in Task 5.

- [ ] **Step 1: Define exact upload schemas, limits, and extension/MIME allowlists**

Create `src/lib/uploads/validation.ts`:

```ts
import { z } from "zod";

import type { FileType, UploadKind } from "@/lib/uploads/types";

export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024 * 1024;
export const PRESIGN_TTL_SECONDS = 600;
export const COMPLETION_GRANT_TTL_SECONDS = 1800;

const fileTypeSchema = z.enum([
  "stem",
  "flp",
  "zip",
  "artwork",
  "mix",
  "master",
  "other",
]);

export const presignRequestSchema = z
  .object({
    trackId: z.string().uuid(),
    filename: z.string().trim().min(1).max(512),
    contentType: z.string().max(255),
    size: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES),
    uploadKind: z.enum(["version", "file"]),
    fileType: fileTypeSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.uploadKind === "file" && !value.fileType) {
      context.addIssue({
        code: "custom",
        path: ["fileType"],
        message: "Choose a production file type.",
      });
    }
    if (value.uploadKind === "version" && value.fileType) {
      context.addIssue({
        code: "custom",
        path: ["fileType"],
        message: "Versions do not accept a production file type.",
      });
    }
  });
```

Define one `UPLOAD_RULES` matrix and export:

```ts
export function normalizeUploadSelection(input: {
  filename: string;
  browserContentType: string;
  uploadKind: UploadKind;
  fileType: FileType | null;
}):
  | { ok: true; extension: string; canonicalContentType: string }
  | { ok: false; message: string };

export function getAllowedUploadTypes(
  uploadKind: UploadKind,
  fileType: FileType | null,
): string[];
```

Build `UPLOAD_RULES` by extension with one canonical MIME and approved aliases:

- `.wav` → `audio/wav`; aliases `audio/x-wav`, `audio/wave`, `audio/vnd.wave`.
- `.aif`, `.aiff` → `audio/aiff`; aliases `audio/x-aiff`, `audio/aif`.
- `.flac` → `audio/flac`; alias `audio/x-flac`.
- `.mp3` → `audio/mpeg`; alias `audio/mp3`.
- `.m4a` → `audio/mp4`; alias `audio/x-m4a`.
- `.flp` → `application/octet-stream`; alias `application/x-fl-studio`.
- `.zip` → `application/zip`; alias `application/x-zip-compressed`.
- `.png` → `image/png`; no specific alias.
- `.jpg`, `.jpeg` → `image/jpeg`; alias `image/jpg`.
- `.webp` → `image/webp`; no specific alias.
- `.tif`, `.tiff` → `image/tiff`; alias `image/x-tiff`.
- `.pdf` → `application/pdf`; no specific alias.
- `.txt` → `text/plain`; no specific alias.
- `.md` → `text/markdown`; alias `text/plain`.
- `.json` → `application/json`; alias `text/json`.
- `.mid`, `.midi` → `audio/midi`; aliases `audio/x-midi`, `application/x-midi`.

Kind/type extension sets remain exact: version/stem/mix/master use the six audio extensions; `flp`, `zip`, and `artwork` use their named sets; `other` uses `.pdf`, `.txt`, `.md`, `.json`, `.mid`, and `.midi`. Lower-case and strip MIME parameters. If the extension is not allowed, reject. If browser MIME is empty or `application/octet-stream`, accept the allowed extension and return its canonical MIME. If it is non-generic, require it to equal the canonical MIME or one alias for that extension; otherwise reject. Return only `This file type is not allowed for the selected upload kind.` on rejection. `getAllowedUploadTypes` returns the selected extensions plus canonical/alias MIME values for Uppy; a `file` upload without a file type returns an empty array.

- [ ] **Step 2: Implement authenticated presign issuance**

Create `src/lib/uploads/presign.ts` with `import "server-only"`, `PutObjectCommand`, and `getSignedUrl`:

```ts
export type CreateR2PresignInput = z.infer<typeof presignRequestSchema>;

export class UploadHttpError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 503,
    message: string,
  ) {
    super(message);
  }
}

export async function createR2Presign(
  input: CreateR2PresignInput,
): Promise<PresignResponse>;
```

Implement this order exactly:

1. Derive `fileType = input.uploadKind === "file" ? input.fileType! : null`, then call `normalizeUploadSelection({ filename: input.filename, browserContentType: input.contentType, uploadKind: input.uploadKind, fileType })`; throw `400` with its stable message on rejection and retain `canonicalContentType` on success.
2. Create the request-scoped Supabase server client and call `auth.getUser()`; missing/error user throws `401` with `Sign in to upload files.`.
3. Query `tracks.select("id").eq("id", input.trackId).maybeSingle()`; query error maps to `503` `Uploads are temporarily unavailable.`; missing row maps to `404` `Track not found.`.
4. Call `.rpc("can_manage_track", { track_id: input.trackId })`; false maps to `403` `You cannot upload to this track.`; RPC error maps to `503`.
5. Obtain `{ client, bucket } = getR2Client()` inside `try/catch`; any configuration/client construction failure maps to `503` `R2 storage is not configured.` without provider details.
6. Derive category and a random server key through `buildR2ObjectKey`.
7. Sign `new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: canonicalContentType })` with `{ expiresIn: PRESIGN_TTL_SECONDS }`. Do not set `ACL`, `ContentLength`, metadata, public-read grants, or response logging.
8. Create claims with `expiresAt = nowSeconds + COMPLETION_GRANT_TTL_SECONDS`, exact authenticated user ID, track ID, R2 locator, upload kind, file type, the trimmed validated original filename, `canonicalContentType`, and expected size. Filename sanitization applies only to the object-key segment; preserve the validated original filename in metadata.
9. Return the exact `PresignResponse` with `headers: { "Content-Type": canonicalContentType }`; set `expiresAt` from the ten-minute PUT expiry, not the grant expiry.

- [ ] **Step 3: Add the JSON-only presign route**

Create `src/app/api/uploads/r2/presign/route.ts`:

```ts
import { createR2Presign, UploadHttpError } from "@/lib/uploads/presign";
import { presignRequestSchema } from "@/lib/uploads/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Upload request is invalid." }, { status: 400 });
  }

  const parsed = presignRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ message: "Upload request is invalid." }, { status: 400 });
  }

  try {
    return Response.json(await createR2Presign(parsed.data));
  } catch (error) {
    if (error instanceof UploadHttpError) {
      return Response.json({ message: error.message }, { status: error.status });
    }
    return Response.json(
      { message: "Uploads are temporarily unavailable." },
      { status: 503 },
    );
  }
}
```

Do not export `GET`, accept query-string signing, echo request metadata on errors, or return an AWS/Supabase error.

- [ ] **Step 4: Run focused route, authorization, and secret-boundary checks**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
$forbidden = @('ACL:', 'public-read', 'NEXT_PUBLIC_R2', 'console.log', 'console.error')
foreach ($term in $forbidden) {
  $matches = Select-String -Path "src/lib/uploads/*.ts","src/app/api/uploads/r2/presign/route.ts" -SimpleMatch $term -ErrorAction SilentlyContinue
  if ($matches) { throw "Forbidden presign source term found: $term" }
}
git diff --check
```

Inspect the route source and production route output. Expected: only `POST` is exported; the browser request cannot supply a key, bucket, provider, ACL, expiry, or completion claims; all key creation follows capability authorization.

- [ ] **Step 5: Commit the presign flow**

```powershell
git add src/lib/uploads/validation.ts src/lib/uploads/presign.ts src/app/api/uploads/r2/presign/route.ts
git commit -m "feat: authorize direct R2 uploads`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Verify uploaded objects, persist idempotently, and sign downloads

**Files:**
- Create: `src/lib/uploads/complete.ts`
- Use unchanged: `src/lib/supabase/admin.ts` — construct only at the verified registration boundary or the RLS-authorized Supabase download-signing boundary.
- Create: `src/app/api/uploads/r2/complete/route.ts`
- Create: `src/lib/storage/signer.ts`
- Create: `src/app/api/studio/download/route.ts`

**Interfaces:**
- Produces: `completeR2Upload({ completionGrant, etag }): Promise<CompletedUploadDTO>`.
- Produces: `POST /api/uploads/r2/complete` request `{ completionGrant: string; etag: string }`.
- Produces: `signStorageDownload(locator, filename): Promise<SignedDownloadDTO>`.
- Produces: `POST /api/studio/download` request `{ recordType: "version" | "file"; recordId: string }`.
- Preserves: object locator/grant/ETag fields exist only in their required transport and verification paths; private locators persist only in approved storage columns, while grants, signatures, ETags, and signed URLs never enter logs, telemetry, rendered markup, browser persistence, or database persistence.

- [ ] **Step 1: Implement completion validation and normalized ETag handling**

Create `src/lib/uploads/complete.ts` with `import "server-only"`, `HeadObjectCommand`, Zod, and:

```ts
export const completeUploadSchema = z.object({
  completionGrant: z.string().min(32).max(8192),
  etag: z.string().trim().min(1).max(256),
});

export function normalizeEtag(value: string): string {
  return value.trim().replace(/^W\//, "").replace(/^"|"$/g, "").toLowerCase();
}

export async function completeR2Upload(input: {
  completionGrant: string;
  etag: string;
}): Promise<CompletedUploadDTO>;
```

Use a local `UploadCompletionError` with statuses `400 | 401 | 403 | 404 | 409 | 503` and stable public messages only.

- [ ] **Step 2: Verify grant, authorization, key scope, and R2 `HeadObject` before persistence**

Inside `completeR2Upload`, perform this exact sequence:

1. Create only the request-scoped Supabase client and call `auth.getUser()`; missing/error user maps to `401` `Sign in to finish this upload.`.
2. Verify the HMAC token and 30-minute expiry with `verifyCompletionGrant`; invalid/expired maps to `400` `Upload completion grant is invalid.`.
3. Require `claims.userId === user.id`; otherwise `403` `Upload completion is not authorized.`.
4. Query the track by `claims.trackId`; missing maps to `404`, provider query error maps to `503`.
5. Re-run `.rpc("can_manage_track", { track_id: claims.trackId })` on that request-scoped client; false maps to `403` and an RPC error maps to `503`.
6. Require claims provider `r2`, claims bucket equals current configured `R2_BUCKET_NAME`, and `isExpectedR2Key` succeeds for the signed user, track, and derived category. Any mismatch maps to `403`. Do not import or construct the admin client yet.
7. Call:

```ts
const head = await client.send(
  new HeadObjectCommand({ Bucket: claims.object.bucket, Key: claims.object.key }),
);
```

8. Map not-found/provider failures to generic `404` `Uploaded object was not found.` or `503` `Upload verification is temporarily unavailable.` without serializing `$metadata`, request IDs, response bodies, stack text, or provider messages.
9. Require `head.ContentLength === claims.expectedSize` and lower-cased `head.ContentType?.split(";")[0].trim() === claims.contentType.toLowerCase()`; otherwise `409` `Uploaded object does not match the authorized file.`.
10. If `head.ETag` is present, require `normalizeEtag(head.ETag) === normalizeEtag(input.etag)`; otherwise return the same `409`. Do not persist either ETag.

- [ ] **Step 3: Cross the admin boundary only after verification and persist through the atomic RPC**

After Steps 1–2 have completed all request authentication, `can_manage_track`, HMAC, prefix, bucket, `HeadObject`, size, canonical MIME, and ETag checks, import/use the existing Phase 3 boundary:

```ts
import { createAdminClient } from "@/lib/supabase/admin";
```

Construct it at the final persistence boundary:

```ts
const admin = createAdminClient();

const { data, error } = await admin.rpc("register_r2_track_version", {
  p_user_id: user.id,
  p_track_id: claims.trackId,
  p_bucket: claims.object.bucket,
  p_object_key: claims.object.key,
  p_original_filename: claims.originalFilename,
  p_mime_type: claims.contentType,
  p_size_bytes: claims.expectedSize,
});
```

For `file`, first require `claims.fileType !== null`, then call the admin client's `register_r2_file` RPC with `p_user_id: user.id` and `p_file_type`. In the completion path, do not use the admin client for authentication, track lookup, capability evaluation, object verification, download signing, or any query other than the matching registration RPC; the separately authorized Supabase download signer is the only other Phase 4 boundary allowed to construct it. Map the returned row to `CompletedUploadDTO`, converting numeric values with `Number` only after checking `Number.isSafeInteger`. A replay of a still-valid grant returns the existing locator row and same DTO; an expired grant still requires a new presign flow, preserving the approved HMAC expiry/idempotency contract.

After success call:

```ts
revalidatePath("/studio");
revalidatePath(`/studio/${claims.trackId}`);
```

Any RPC error maps to `503` `Upload registration is temporarily unavailable.`; do not expose constraint/function messages.

- [ ] **Step 4: Add the completion route**

Create `src/app/api/uploads/r2/complete/route.ts` with `export const runtime = "nodejs"`. Parse JSON, validate with `completeUploadSchema`, call `completeR2Upload`, and return its DTO. Return only `{ message }` on errors and only the declared status from `UploadCompletionError`; unexpected errors return `503`. Do not accept an object locator, filename, MIME, size, track, upload kind, or file type from this request—the grant is the sole source of those claims.

- [ ] **Step 5: Implement provider-aware signed downloads**

Create `src/lib/storage/signer.ts` with `import "server-only"`, the existing `createAdminClient`, `GetObjectCommand`, `getSignedUrl`, and:

```ts
export const SIGNED_DOWNLOAD_TTL_SECONDS = 600;

export function isSafePrivateObjectKey(value: string): boolean;

export async function signStorageDownload(
  locator: StorageLocator,
  filename: string,
): Promise<SignedDownloadDTO>;
```

`isSafePrivateObjectKey` trims the value and returns false for empty text, an `http:`/`https:` URL, a leading `/`, any backslash, or any path segment equal to `.` or `..`. `signStorageDownload` is a server-only capability invoked only with a locator read from an already RLS-authorized database row; it never accepts browser-supplied locator fields.

Provider rules:

- Reject an unsafe key, empty bucket, or unsupported provider with `new Error("Download is unavailable.")`.
- For `supabase`, require `locator.bucket === "playback"`, then construct `createAdminClient()` inside this validated branch and call only `admin.storage.from("playback").createSignedUrl(locator.key, SIGNED_DOWNLOAD_TTL_SECONDS, { download: filename })`. The admin client does not perform authentication or authorization and is not used before the route's request-scoped RLS lookup.
- For `r2`, do not construct the Supabase admin client. Require `locator.bucket === getR2Config().bucketName`, obtain the server-only R2 client, and sign `new GetObjectCommand({ Bucket, Key, ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}` })` for `SIGNED_DOWNLOAD_TTL_SECONDS`.
- Return only `{ url, expiresAt }`; never persist or log the URL, locator, provider error, or admin/R2 configuration detail.

Create `src/app/api/studio/download/route.ts` with schema:

```ts
const downloadRequestSchema = z.object({
  recordType: z.enum(["version", "file"]),
  recordId: z.string().uuid(),
});
```

Implement this exact order: parse only `recordType`/`recordId`; create the request-scoped client and require `auth.getUser()`; query only the requested `track_versions` or `files` row under RLS with `.select("storage_provider,storage_bucket,storage_url,original_filename").eq("id", recordId).maybeSingle()`; reject an error or null row before calling the signer; map the row to an internal locator; require `isSafePrivateObjectKey(storage_url)` plus either exact `supabase`/`playback` or exact `r2`/configured-bucket scope; then call `signStorageDownload` and return the DTO. Missing/inaccessible rows return generic `404`; unauthenticated requests `401`; invalid JSON/input `400`; unsafe/inconsistent locators `404`; signing/config/provider failures `503`. Do not require `can_manage_track` for a read-only download when RLS grants authenticated team access under Phase 3. Add no `storage.objects` browser policy, do not use a browser Supabase client for Storage, and never return the provider, bucket, or object key.

- [ ] **Step 6: Run completion, idempotency, download, and privacy inspection gates**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
$uploadSource = Get-ChildItem "src/lib/uploads","src/lib/r2","src/app/api/uploads" -Recurse -File -Include *.ts,*.tsx
$loggingSinks = $uploadSource | Select-String -Pattern "console\.(log|info|warn|error)|logger\.|telemetry\.|captureException\(" -ErrorAction SilentlyContinue
if ($loggingSinks) { throw "Upload transport data reaches a logging or telemetry sink; inspect every match." }
$browserPersistence = Get-ChildItem "src/components/upload" -Recurse -File -Include *.ts,*.tsx | Select-String -Pattern "localStorage|sessionStorage|persist\(" -ErrorAction SilentlyContinue
if ($browserPersistence) { throw "Upload transport data reaches browser persistence." }
$forbiddenColumns = Select-String -Path "supabase/migrations/*.sql" -Pattern "completion_grant|completionGrant|etag|signed_url|signedUrl" -CaseSensitive:$false -ErrorAction SilentlyContinue
if ($forbiddenColumns) { throw "Ephemeral grant, ETag, or signed URL appears in a database persistence definition." }
git diff --check
```

Do not reject `completionGrant`, `etag`, `bucket`, `key`, or signed `url` merely because their route/component transport contracts require them. Inspect actual sinks and prove: upload completion constructs the admin client only after `HeadObject`; Supabase download signing constructs it only after request-scoped authentication, RLS-authorized row lookup, and safe `supabase`/`playback` locator validation; R2 downloads never construct it; replay returns the existing row; client-provided metadata cannot replace signed claims or database locators; only locator columns persist bucket/key; grants/ETags/signed URLs are absent from database writes, logs, telemetry, browser storage, Zustand persistence, and rendered markup; and no browser `storage.objects` access policy was added.

- [ ] **Step 7: Commit completion and download access**

```powershell
git add src/lib/uploads/complete.ts src/app/api/uploads/r2/complete/route.ts src/lib/storage/signer.ts src/app/api/studio/download/route.ts
git commit -m "feat: verify and register R2 uploads`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Add Uppy 5 direct PUT uploads and Studio files/download integration

**Files:**
- Create: `src/components/upload/R2Uploader.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/lib/studio/types.ts`
- Modify: `src/lib/studio/queries.ts`
- Modify: `src/app/(dashboard)/studio/[trackId]/page.tsx`
- Modify: `src/components/studio/studio-detail-client.tsx`
- Modify: `src/components/studio/version-selector.tsx`
- Create: `src/components/studio/studio-files-panel.tsx`
- Create: `src/components/studio/download-button.tsx`

**Interfaces:**
- Produces: `R2UploaderProps { trackId; uploadKind; fileType; onRegistered? }`.
- Produces: `StudioFile`, `StorageAvailability`, and `getStudioTrackFiles(trackId)`.
- Produces: `DownloadButton({ recordType, recordId, filename })`.
- Preserves: Uppy state is local, transfer bytes target R2, registration retry never repeats the PUT, and Studio browser DTOs contain no bucket/key.

- [ ] **Step 1: Import Uppy CSS once at the root layout**

In `src/app/layout.tsx`, add after the existing global CSS import:

```ts
import "@uppy/core/css/style.min.css";
import "@uppy/dashboard/css/style.min.css";
```

Do not import package CSS from multiple Client Components.

- [ ] **Step 2: Extend Studio DTOs and queries with provider-neutral inventory**

In `src/lib/studio/types.ts`, add:

```ts
export type StorageAvailability = "playback" | "production";

export type StudioFile = {
  id: string;
  trackId: string;
  fileType: Database["public"]["Enums"]["file_type"];
  originalFilename: string;
  mimeType: string | null;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: StudioCreator;
  storageAvailability: "production";
};
```

Extend `StudioTrackVersion` with:

```ts
mimeType: string | null;
sizeBytes: number | null;
storageAvailability: StorageAvailability;
```

Do not add raw provider, bucket, or object key to these DTOs. In `src/lib/studio/queries.ts`, update version selection/mapping so `storage_provider === "supabase"` maps to `playback` and `r2` maps to `production`. Add:

```ts
export async function getStudioTrackFiles(
  trackId: string,
): Promise<StudioFile[]>;
```

Validate UUID, select files joined to `users!files_uploaded_by_fkey(id,full_name,avatar_url)`, order `created_at desc`, map only browser-safe fields, and throw only `new Error("Studio files are unavailable.")` on provider errors.

- [ ] **Step 3: Implement one local Uppy 5 instance with presigned PUT parameters**

Create `src/components/upload/R2Uploader.tsx` with `"use client"` and imports:

```ts
import Uppy, { type Meta } from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import Dashboard from "@uppy/react/dashboard";
```

Define:

```ts
type R2UploadMeta = Meta & {
  completionGrant?: string;
};

type R2UploadBody = {
  ETag: string;
  etag?: string;
};

export type R2UploaderProps = {
  trackId: string;
  uploadKind: UploadKind;
  fileType: FileType | null;
  onRegistered?: (upload: CompletedUploadDTO) => void;
};

type RegistrationRetry = {
  fileId: string;
  completionGrant: string;
  etag: string;
};
```

Create the instance exactly once with a `useState(() => new Uppy<R2UploadMeta, R2UploadBody>(...))` initializer. Configure:

```ts
{
  autoProceed: false,
  allowMultipleUploadBatches: true,
  restrictions: {
    maxFileSize: MAX_UPLOAD_SIZE_BYTES,
    maxNumberOfFiles: 10,
    minNumberOfFiles: 1,
    allowedFileTypes: getAllowedUploadTypes(uploadKind, fileType),
  },
}
```

Install `AwsS3` with `shouldUseMultipart: false`, `retryDelays: [0, 1000, 3000, 5000]`, and asynchronous `getUploadParameters(file, { signal })`. That callback posts exactly:

```ts
{
  trackId,
  filename: file.name,
  contentType: file.type ?? "",
  size: file.size,
  uploadKind,
  ...(uploadKind === "file" ? { fileType } : {}),
}
```

Pass `signal` to `fetch`. For a non-OK response, read only `{ message?: string }` and map it in the component: `400` → `Choose an approved file below 5 GiB.`, `401` → `Sign in again before uploading.`, `403` → `You cannot upload to this track.`, `404` → `This track is no longer available.`, and every other failure → `Uploads are temporarily unavailable.`. If status is `503` and the response message is exactly `R2 storage is not configured.`, set local `r2Unavailable = true`, call `uppy.cancelAll()`, and replace the Dashboard with a non-dismissible alert `R2 storage is not configured. Existing Studio data remains available.` for the rest of that mount. For an OK response, parse only the declared `PresignResponse`, call `uppy.setFileMeta(file.id, { completionGrant: response.completionGrant })`, and return:

```ts
{
  method: "PUT",
  url: response.url,
  fields: {},
  headers: response.headers,
  expires: PRESIGN_TTL_SECONDS,
}
```

The browser never constructs a bucket/key and never receives credentials.

- [ ] **Step 4: Register after provider success and support registration-only retry**

Subscribe to `upload-success`. Read `file.meta.completionGrant` and `response.body.ETag ?? response.body.etag`; set a local `Registering production file…` state; call `/api/uploads/r2/complete` with only `{ completionGrant, etag }`.

- On success, remove any retry entry, render success only from the returned `CompletedUploadDTO`, call `onRegistered?.(dto)`, and call `router.refresh()`.
- On failure after PUT success, keep `{ fileId, completionGrant, etag }` in component state and render exact alert `The object uploaded, but registration failed. Retry registration without uploading again.` plus a `Retry registration` button.
- The retry button repeats only `/api/uploads/r2/complete`; it must not call `uppy.retryUpload`, `uppy.upload`, or the presign endpoint.
- Transfer failures remain Uppy failures with its retry/cancel controls and do not create registration retry state.
- Update restrictions/accepted file types when `uploadKind`/`fileType` changes; if files are already selected, require the parent to key the uploader by `${uploadKind}:${fileType ?? "none"}` so the old instance is destroyed before changing contract.

Render:

```tsx
<Dashboard
  uppy={uppy}
  width="100%"
  height={360}
  proudlyDisplayPoweredByUppy={false}
  showProgressDetails
  note="Direct private R2 upload. Maximum 5 GiB per file."
/>
```

In cleanup call `uppy.destroy()`. Do not put Uppy, files, progress, grants, retry metadata, or callbacks in Zustand.

- [ ] **Step 5: Add explicit short-lived download controls**

Create `src/components/studio/download-button.tsx` with `"use client"` and:

```ts
export type DownloadButtonProps = {
  recordType: "version" | "file";
  recordId: string;
  filename: string;
};
```

On activation, disable while pending, POST exactly `{ recordType, recordId }` to `/api/studio/download`, validate `{ url, expiresAt }`, and trigger the browser download with a temporary `<a href={url} download={filename}>` appended/clicked/removed in the same handler. Do not store the URL in localStorage, Zustand, rendered hidden inputs, or component state after the click. Show only `Download is unavailable. Try again.` on failure.

- [ ] **Step 6: Render grouped files and version status/download treatment**

Create `src/components/studio/studio-files-panel.tsx`:

```ts
export type StudioFilesPanelProps = {
  files: StudioFile[];
};
```

Group in the fixed order `stem`, `mix`, `master`, `flp`, `zip`, `artwork`, `other`; show original filename, formatted byte size, uploader, created date, and label `Production file`; include `DownloadButton`. Empty state is exactly `No production files are registered for this track.`. Do not render `R2`, bucket names, object keys, or permanent URLs.

Update `version-selector.tsx` so every version displays processing/ready/archived/failed status, file size/MIME when present, and provider-neutral availability:

- `playback`: label `Playback-ready version`, retain Play in global player when `status === "ready"`;
- `production`: label `Production source`, show download, and do not imply browser playback merely because the row exists.

- [ ] **Step 7: Integrate uploader and inventory into the Phase 3 detail route**

Update `src/app/(dashboard)/studio/[trackId]/page.tsx` to fetch:

```ts
const [versions, files] = await Promise.all([
  getStudioTrackVersions(track.id),
  getStudioTrackFiles(track.id),
]);
const comments = await getStudioComments(versions.map((version) => version.id));
return (
  <StudioDetailClient
    track={track}
    versions={versions}
    comments={comments}
    files={files}
  />
);
```

Extend `StudioDetailClient` props with `files: StudioFile[]`. Add local selector state:

```ts
const [uploadKind, setUploadKind] = useState<UploadKind>("version");
const [fileType, setFileType] = useState<FileType>("stem");
```

Render labelled controls for `Version`/`Production file`; render file type only for `file`; render:

```tsx
<R2Uploader
  key={`${track.id}:${uploadKind}:${uploadKind === "file" ? fileType : "none"}`}
  trackId={track.id}
  uploadKind={uploadKind}
  fileType={uploadKind === "file" ? fileType : null}
/>
```

Place `StudioFilesPanel` beside/below the existing detail grid without moving `GlobalPlayer`, waveform authority, comments, or signed playback logic.

- [ ] **Step 8: Run Studio type/build/privacy gates**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
$privateTerms = @('storage_url', 'storage_bucket', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'UPLOAD_GRANT_SECRET')
foreach ($term in $privateTerms) {
  $matches = Select-String -Path "src/components/upload/*.tsx","src/components/studio/*.tsx" -SimpleMatch $term -ErrorAction SilentlyContinue
  if ($matches) { throw "Private storage term leaked to Client Component source: $term" }
}
git diff --check
```

Expected: Studio compiles with Uppy 5 subpath imports; no Client Component imports `src/lib/r2`; version/file DTOs omit bucket/key; the global player and Phase 3 waveform/comment contracts still build.

- [ ] **Step 9: Commit direct upload and Studio integration**

```powershell
git add src/app/layout.tsx "src/app/(dashboard)/studio/[trackId]/page.tsx" src/lib/studio src/components/upload src/components/studio
git commit -m "feat: integrate direct uploads into Studio`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Build Operations with UTC persistence and configurable IANA time zone

**Files:**
- Create: `src/lib/operations/types.ts`
- Create: `src/lib/operations/time-zone.ts`
- Create: `src/lib/operations/validation.ts`
- Create: `src/lib/operations/queries.ts`
- Create: `src/lib/operations/mutations.ts`
- Create: `src/app/(dashboard)/operations/page.tsx`
- Create: `src/components/operations/operations-board.tsx`
- Create: `src/components/operations/action-form.tsx`

**Interfaces:**
- Produces: `getOperationsTimeZone()`, `localDateTimeToUtc()`, `formatInOperationsTimeZone()`, and `getZonedDateParts()`.
- Produces: `getOperationsPageData(filters, timeZone, now?): Promise<OperationsPageData>`.
- Produces: `saveOperationAction(previousState, formData): Promise<OperationsActionResult>`.
- Produces: `/operations?month=YYYY-MM&status=<action_status>` with month calendar and mobile-first agenda.

- [ ] **Step 1: Define Operations DTOs and stable result contracts**

Create `src/lib/operations/types.ts`:

```ts
import type { Database } from "@/types/database.types";

export type ActionStatus = Database["public"]["Enums"]["action_status"];
export type SearchParamValue = string | string[] | undefined;

export type OperationsAction = {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  status: ActionStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isOverdue: boolean;
};

export type OperationsCalendarDay = {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  actionIds: string[];
  statusCounts: Record<ActionStatus, number>;
};

export type OperationsFilters = {
  month: string;
  status: ActionStatus | null;
};

export type OperationsPageData = {
  filters: OperationsFilters;
  timeZone: string;
  monthLabel: string;
  previousMonth: string;
  nextMonth: string;
  upcoming: OperationsAction[];
  agenda: OperationsAction[];
  calendar: OperationsCalendarDay[];
};

export type OperationsActionResult = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<
    Record<"title" | "description" | "eventDate" | "eventTime" | "actionStatus", string>
  >;
};

export const initialOperationsActionResult: OperationsActionResult = {
  status: "idle",
  message: "",
};
```

- [ ] **Step 2: Implement `VEO_TIME_ZONE` with exact UTC default and stable invalid state**

Create `src/lib/operations/time-zone.ts` with `import "server-only"` and:

```ts
export const OPERATIONS_TIME_ZONE_ERROR =
  "Operations time zone is not configured correctly.";

export type OperationsTimeZoneState =
  | { status: "ready"; timeZone: string }
  | { status: "error"; message: typeof OPERATIONS_TIME_ZONE_ERROR };

export function getOperationsTimeZone(
  value: string | undefined = process.env.VEO_TIME_ZONE,
): OperationsTimeZoneState;

export function getZonedDateParts(
  instant: Date,
  timeZone: string,
): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function localDateTimeToUtc(
  date: string,
  time: string,
  timeZone: string,
): Date | null;

export function formatInOperationsTimeZone(
  iso: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
): string;
```

`getOperationsTimeZone` trims the configured value or uses `UTC`, validates by constructing `new Intl.DateTimeFormat("en-US", { timeZone })`, and returns the stable error state on `RangeError`.

`getZonedDateParts` uses `formatToParts` with locale `en-CA`, `hourCycle: "h23"`, and numeric year/month/day/hour/minute/second. `localDateTimeToUtc` must:

1. parse exact `YYYY-MM-DD` and `HH:mm`;
2. reject impossible calendar fields;
3. start with `Date.UTC(year, month - 1, day, hour, minute, 0)`;
4. run three correction passes comparing target UTC-like milliseconds to the formatter’s zoned parts and adding the delta;
5. verify the final zoned parts exactly equal the requested local fields;
6. return `null` for nonexistent DST wall times rather than silently shifting them.

Every persisted value comes from the resulting `.toISOString()`; rendering always goes back through the same configured zone.

- [ ] **Step 3: Define month/filter/form validation**

Create `src/lib/operations/validation.ts` with:

```ts
export const actionStatusSchema = z.enum([
  "planned",
  "in_progress",
  "completed",
  "cancelled",
]);

export const operationsActionSchema = z.object({
  actionId: z.union([z.literal(""), z.string().uuid()]),
  title: z.string().trim().min(1, "Enter an action title.").max(160, "Action titles must be 160 characters or fewer."),
  description: z.string().trim().max(4000, "Descriptions must be 4,000 characters or fewer."),
  eventDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date."),
  eventTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a valid time."),
  actionStatus: actionStatusSchema,
});

export function firstSearchParam(value: SearchParamValue): string | undefined;

export function normalizeOperationsFilters(
  input: { month?: SearchParamValue; status?: SearchParamValue },
  timeZone: string,
  now: Date = new Date(),
): OperationsFilters;
```

`firstSearchParam` returns the first array item or scalar value after trimming; empty values become `undefined`. Accept that canonical `month` only when it is `YYYY-MM` and represents a real month; otherwise derive the current month by passing `now` and `timeZone` through `getZonedDateParts`. Accept canonical status only from the enum; otherwise use `null`. All generated links serialize one `month` and zero or one `status`, so a repeated input becomes a single canonical URL on the next navigation. The route passes `UTC` only to normalize a URL for the configuration-error view; it must not query or mutate Operations data while `VEO_TIME_ZONE` is invalid.

- [ ] **Step 4: Implement request-scoped month, agenda, and upcoming queries**

Create `src/lib/operations/queries.ts`:

```ts
export async function getOperationsPageData(
  filters: OperationsFilters,
  timeZone: string,
  now: Date = new Date(),
): Promise<OperationsPageData>;
```

Compute the UTC instant for local month start `YYYY-MM-01 00:00` and next month start through `localDateTimeToUtc`. Query `actions` for `[start, nextStart)`, apply `.eq("status", filters.status)` only when non-null, order `event_date asc`, and join `users!actions_created_by_fkey(full_name)`. Separately query the next five non-completed/non-cancelled actions from `now.toISOString()` ordered ascending. Map errors to `throw new Error("Operations data is unavailable.")`.

Build a 42-cell Monday-first calendar in TypeScript. Each cell has local `YYYY-MM-DD`, current-month flag, IDs, and zero-initialized status counts. Agenda stays chronological. `isOverdue` is true only when the UTC event instant is before `now` and status is `planned` or `in_progress`. Previous/next month strings are calculated without depending on the host machine time zone.

- [ ] **Step 5: Implement create/edit Server Action with local-zone conversion**

Create `src/lib/operations/mutations.ts` with `"use server"`:

```ts
export async function saveOperationAction(
  previousState: OperationsActionResult,
  formData: FormData,
): Promise<OperationsActionResult>;
```

Parse `Object.fromEntries(formData)`, return schema field errors, resolve `getOperationsTimeZone`, and return `OPERATIONS_TIME_ZONE_ERROR` without a database call when invalid. Convert date/time with `localDateTimeToUtc`; if null, return field error `This local date and time does not exist in the configured time zone.`. Authenticate and use `user.id` for inserts. If `actionId === ""`, insert `{ title, description, event_date: utc.toISOString(), status, created_by: user.id }`. For an update, execute `.update({ title, description, event_date: utc.toISOString(), status }).eq("id", actionId).select("id").maybeSingle()` and require a non-null returned row. An error or null row maps to `Action could not be saved. Try again.`; never report success merely because the update request returned no provider error. RLS remains final authority. After a confirmed insert/update, call `revalidatePath("/operations")` and return the stable success message.

- [ ] **Step 6: Build the server route and responsive Operations UI**

Create `src/app/(dashboard)/operations/page.tsx` as a Server Component accepting:

```ts
{
  searchParams?: {
    month?: string | string[] | undefined;
    status?: string | string[] | undefined;
  };
}
```

Resolve the time-zone state first. When invalid, normalize filters with `normalizeOperationsFilters(searchParams ?? {}, "UTC")` only for safe links and render `OperationsBoard` in configuration-error mode without querying data. When ready, normalize with the configured zone, call `getOperationsPageData(filters, timeZoneState.timeZone)`, and render it.

Create `src/components/operations/operations-board.tsx` to render:

- heading `Operations` and active time zone text `Time zone: ${timeZone}`;
- actual next-up count/list, never a fabricated metric;
- previous/next month `Link`s preserving status;
- status filter links for All/planned/in progress/completed/cancelled;
- desktop `md:grid` 7-column calendar with day links `href="#agenda-${date}"`;
- chronological agenda as the primary DOM representation, with each date group `id="agenda-YYYY-MM-DD"`;
- warning border/text for overdue planned/in-progress items;
- completed/cancelled items when filters permit;
- exact empty state `No actions are scheduled for this month. Use the form to schedule the first action.`.

Create `src/components/operations/action-form.tsx` with `"use client"`, `useFormState(saveOperationAction, initialOperationsActionResult)`, labelled fields, `maxLength` attributes, hidden `actionId`, date/time inputs, enum select, visible active time-zone text, stable field/form errors, and a submit button disabled through `useFormStatus`. Provide one create form and an edit form/details disclosure for each actual agenda item; do not create delete behavior.

- [ ] **Step 7: Run Operations validation**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
$timeZoneLeaks = Select-String -Path "src/components/operations/*.tsx" -Pattern "process\.env|VEO_TIME_ZONE" -ErrorAction SilentlyContinue
if ($timeZoneLeaks) { throw "Server time-zone environment access leaked into Operations Client Components." }
git diff --check
```

Browser-check invalid `month`/status normalization, UTC default, invalid configured zone state, local-to-UTC persistence request, zoned rendering, overdue semantics, keyboard focus, desktop calendar, mobile agenda, and player-safe bottom spacing.

- [ ] **Step 8: Commit Operations**

```powershell
git add src/lib/operations "src/app/(dashboard)/operations/page.tsx" src/components/operations
git commit -m "feat: add zoned operations workspace`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Build Content moodboard, filters, and mutations

**Files:**
- Create: `src/lib/content/types.ts`
- Create: `src/lib/content/validation.ts`
- Create: `src/lib/content/queries.ts`
- Create: `src/lib/content/mutations.ts`
- Create: `src/app/(dashboard)/content/page.tsx`
- Create: `src/components/content/content-board.tsx`
- Create: `src/components/content/content-idea-form.tsx`

**Interfaces:**
- Produces: `ContentIdea`, `ContentFilters`, `ContentPageData`, and `ContentActionResult`.
- Produces: `getContentPageData(filters): Promise<ContentPageData>`.
- Produces: `saveContentIdea(previousState, formData): Promise<ContentActionResult>`.
- Produces: `/content?platform=<normalized>&status=<content_status>`.

- [ ] **Step 1: Define Content DTO and action contracts**

Create `src/lib/content/types.ts`:

```ts
import type { Database } from "@/types/database.types";

export type ContentStatus = Database["public"]["Enums"]["content_status"];
export type ContentDifficulty = Database["public"]["Enums"]["content_difficulty"];
export type ContentSearchParamValue = string | string[] | undefined;

export type ContentIdea = {
  id: string;
  title: string;
  platform: string;
  difficulty: ContentDifficulty;
  status: ContentStatus;
  referenceUrl: string | null;
  referenceHost: string | null;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ContentFilters = {
  platform: string | null;
  status: ContentStatus | null;
};

export type ContentPageData = {
  ideas: ContentIdea[];
  platforms: string[];
  filters: ContentFilters;
};

export type ContentActionResult = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<
    Record<"title" | "platform" | "difficulty" | "contentStatus" | "referenceUrl" | "notes", string>
  >;
};

export const initialContentActionResult: ContentActionResult = {
  status: "idle",
  message: "",
};
```

- [ ] **Step 2: Implement exact validation and safe URL normalization**

Create `src/lib/content/validation.ts`:

```ts
export const contentStatusSchema = z.enum([
  "idea",
  "planned",
  "in_production",
  "published",
  "archived",
]);
export const contentDifficultySchema = z.enum(["low", "medium", "high"]);

const optionalHttpUrl = z
  .string()
  .trim()
  .max(2048, "Reference URLs must be 2,048 characters or fewer.")
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "Use a valid http or https reference URL.");

export const contentIdeaSchema = z.object({
  contentIdeaId: z.union([z.literal(""), z.string().uuid()]),
  title: z.string().trim().min(1, "Enter an idea title.").max(200, "Idea titles must be 200 characters or fewer."),
  platform: z.string().trim().min(1, "Enter a platform.").max(80, "Platforms must be 80 characters or fewer."),
  difficulty: contentDifficultySchema,
  contentStatus: contentStatusSchema,
  referenceUrl: optionalHttpUrl,
  notes: z.string().trim().max(5000, "Notes must be 5,000 characters or fewer."),
});

export function firstContentSearchParam(
  value: ContentSearchParamValue,
): string | undefined;

export function normalizeContentFilters(input: {
  platform?: ContentSearchParamValue;
  status?: ContentSearchParamValue;
}): ContentFilters;
```

`firstContentSearchParam` takes the first repeated value or scalar, trims it, and turns empty text into `undefined`. Normalize that canonical platform by collapsing internal whitespace and limiting it to 80 characters; empty/oversized values become `null`. Invalid canonical status becomes `null`. Filter links serialize no more than one platform and one status, so repeated input is replaced by a single canonical query on navigation.

- [ ] **Step 3: Implement filtered request-scoped Content queries**

Create `src/lib/content/queries.ts`:

```ts
export async function getContentPageData(
  filters: ContentFilters,
): Promise<ContentPageData>;
```

Use the request-scoped client. Query all distinct actual platforms for filter options, then query `content_ideas` joined to `users!content_ideas_created_by_fkey(full_name)`, apply exact platform/status filters only when present, and order `updated_at desc`. Parse `referenceHost` only with `new URL` after the database read; invalid legacy values yield `null` without being rendered as links. Provider errors throw only `new Error("Content ideas are unavailable.")`.

- [ ] **Step 4: Implement create/edit Server Action**

Create `src/lib/content/mutations.ts` with `"use server"`:

```ts
export async function saveContentIdea(
  previousState: ContentActionResult,
  formData: FormData,
): Promise<ContentActionResult>;
```

Parse and validate. Normalize platform by trimming/collapsing whitespace; store empty reference URL as `null`. Authenticate. Insert with `created_by: user.id` when ID is empty. For an update, execute `.update({ title, platform, difficulty, status, reference_url, notes }).eq("id", contentIdeaId).select("id").maybeSingle()` and require a non-null returned row. An error or null row maps to `Content idea could not be saved. Try again.`; never report success for an inaccessible, missing, or zero-row update. RLS remains authoritative. After a confirmed insert/update, call `revalidatePath("/content")` and return the stable create/update success message.

- [ ] **Step 5: Build the server route and responsive metadata-only moodboard**

Create `src/app/(dashboard)/content/page.tsx` as a Server Component accepting `{ searchParams?: { platform?: string | string[] | undefined; status?: string | string[] | undefined } }`, normalizing the first repeated/scalar values into canonical filters, fetching data, and rendering `ContentBoard`.

Create `src/components/content/content-board.tsx` to render:

- heading `Content` and actual idea count;
- URL-based platform and status filters with an All option;
- cards in a dense responsive board at `md` and above;
- a compact single-column list at narrow widths;
- title, platform, difficulty, status, reference host, and a plain-text notes excerpt capped visually with CSS line clamp;
- generated local fallback artwork using title initial and semantic/accent classes only—no remote image request;
- reference links only when valid, with `target="_blank"` and `rel="noreferrer"`;
- exact empty state `No content ideas match these filters. Create an idea or clear the filters.`.

Create `src/components/content/content-idea-form.tsx` with `"use client"`, `useFormState(saveContentIdea, initialContentActionResult)`, labelled constrained inputs, hidden `contentIdeaId`, enum selects, stable errors, and submit pending state. Render one create form and edit disclosures for actual cards; do not add delete, image proxying, remote previews, fetch-to-scrape, or fabricated artwork URLs.

- [ ] **Step 6: Run Content validation and remote-request scope checks**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
$remoteImagePatterns = @('next/image', '<img', 'fetch(reference', 'referenceUrl)')
foreach ($term in $remoteImagePatterns) {
  $matches = Select-String -Path "src/components/content/*.tsx","src/lib/content/*.ts" -SimpleMatch $term -ErrorAction SilentlyContinue
  if ($matches) { throw "Remote reference image/proxy behavior found: $term" }
}
git diff --check
```

Browser-check URL filter persistence, safe links, compact mobile list, desktop board rhythm, keyboard focus, empty state, no reference-image request, no tracker request, and content remaining above the player dock.

- [ ] **Step 7: Commit Content**

```powershell
git add src/lib/content "src/app/(dashboard)/content/page.tsx" src/components/content
git commit -m "feat: add content planning workspace`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Activate Operations and Content navigation and complete shared presentation

**Files:**
- Modify: `src/components/dashboard/dashboard-sidebar.tsx`
- Modify: `src/components/dashboard/mobile-dashboard-header.tsx`
- Modify: `src/components/dashboard/dashboard-home.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: active-state support for `/`, `/studio`, `/operations`, and `/content` on desktop/mobile.
- Produces: route-aware mobile titles `Dashboard`, `Studio`, `Operations`, and `Content`.
- Preserves: VEO AI is a noninteractive `Coming soon` row and Phase 5 routes/components remain absent.

- [ ] **Step 1: Activate all Phase 4 destinations in desktop navigation**

In `dashboard-sidebar.tsx`, replace the Phase 3 active destination list with:

```ts
const activeDestinations = [
  { href: "/", label: "Dashboard", Icon: SquaresFour, matches: (pathname: string) => pathname === "/" },
  { href: "/studio", label: "Studio", Icon: Waveform, matches: (pathname: string) => pathname === "/studio" || pathname.startsWith("/studio/") },
  { href: "/operations", label: "Operations", Icon: CalendarBlank, matches: (pathname: string) => pathname === "/operations" || pathname.startsWith("/operations/") },
  { href: "/content", label: "Content", Icon: ImagesSquare, matches: (pathname: string) => pathname === "/content" || pathname.startsWith("/content/") },
] as const;
```

Retain the existing pathname-aware `aria-current`, spring active indicator, reduced-motion fallback, and focus treatment. Leave VEO AI as one plain noninteractive row with `Coming soon`; do not add `/ai`, `/chat`, a drawer, or a click handler.

- [ ] **Step 2: Add four mobile module links and route-aware title**

In `mobile-dashboard-header.tsx`, use the same four destination definitions and determine the current module from the first matching destination. Render four compact links in the existing mobile primary navigation, each with at least 40px target height, horizontal overflow contained inside the nav (`overflow-x-auto`) rather than the page, `aria-current` only when active, and one theme toggle total. Do not render VEO AI as a mobile link.

- [ ] **Step 3: Update dashboard home availability honestly**

In `dashboard-home.tsx`, make Studio, Operations, and Content real links with labels `Open Studio`, `Open Operations`, and `Open Content`. Update introduction copy exactly:

```text
The private VEO workspace is ready. Studio, Operations, and Content are connected; VEO AI will come online in its dedicated phase.
```

Keep VEO AI as the only noninteractive `Coming soon` card. Do not show counts unless queried from actual data; this task adds no dashboard data query.

- [ ] **Step 4: Add focused Uppy, Operations, and Content layout hooks**

Append to `src/app/globals.css` without changing existing theme variables, waveform rules, or player-dock geometry:

```css
@layer components {
  .uppy-Dashboard-inner {
    border-color: hsl(var(--border));
    border-radius: 1rem;
    background: hsl(var(--card) / 0.6);
  }

  .uppy-Dashboard-AddFiles {
    border-color: hsl(var(--border));
    color: hsl(var(--foreground));
  }

  .operations-calendar-grid {
    display: none;
  }

  .content-board-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: minmax(0, 1fr);
  }

  @media (min-width: 768px) {
    .operations-calendar-grid {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
    }

    .content-board-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1280px) {
    .content-board-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}

@media (prefers-reduced-motion: reduce) {
  .uppy-Dashboard-progressindicators,
  .content-board-grid > *,
  .operations-calendar-grid > * {
    scroll-behavior: auto;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

Any additional selectors needed for contrast must consume semantic tokens and remain scoped under the Uppy/Operations/Content roots.

- [ ] **Step 5: Run navigation and Phase 5 scope gates**

Run:

```powershell
npx tsc --noEmit
npm run lint
npm run build
$phase5Paths = @(
  "src/components/chat/VEO_AI_Chat.tsx",
  "src/app/(dashboard)/ai",
  "src/app/(public)",
  "src/app/listen"
)
foreach ($path in $phase5Paths) {
  if (Test-Path $path) { throw "Phase 5 path activated during Phase 4: $path" }
}
git diff --check
```

Expected: `/studio`, `/operations`, and `/content` are active; VEO AI remains unavailable; no Phase 5 route/component exists; desktop/mobile navigation and one-theme-toggle behavior compile.

- [ ] **Step 6: Commit navigation and shared presentation**

```powershell
git add src/components/dashboard src/app/globals.css
git commit -m "feat: activate phase 4 workspaces`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Run final type, lint, build, browser, network, security, and Git gates; integrate `main`

**Files:**
- Review: every Phase 4 file listed in this plan.
- Commit: the explicit non-fast-forward merge commit integrating `phase-4-uploads-operations-content` into `main`.

**Interfaces:**
- Consumes: completed direct upload, idempotent completion, Studio inventory/downloads, Operations, Content, and navigation.
- Produces: validated Phase 4 on `origin/main` with Phase 5 inactive and no force push.

- [ ] **Step 1: Run final migration, dependency, type, lint, build, and whitespace gates**

Run:

```powershell
npx supabase db push --dry-run --local
npx supabase migration list --local
npx supabase db lint --local --schema public --level warning --fail-on error
$generatedTypes = npx supabase gen types typescript --local
if ($LASTEXITCODE -ne 0) { throw "Supabase type generation failed." }
$generatedText = ($generatedTypes -join [Environment]::NewLine) + [Environment]::NewLine
$currentText = [System.IO.File]::ReadAllText((Resolve-Path "src/types/database.types.ts").Path)
if ($currentText -ne $generatedText) { throw "database.types.ts is not generated from the migrated local schema." }
npm ls @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @uppy/core @uppy/aws-s3 @uppy/react
npx tsc --noEmit
npm run lint
npm run build
git diff --check
git status --short
git log --oneline --decorate -16
```

If Task 2 used the authorized non-production target instead of local, replace the first four Supabase commands with the following exact target-matched checks and keep the remaining comparison/dependency/type/lint/build/Git commands unchanged:

```powershell
if (-not $env:SUPABASE_DB_URL) { throw "Authorized non-production SUPABASE_DB_URL is required." }
npx supabase db push --dry-run --db-url "$env:SUPABASE_DB_URL"
npx supabase migration list --db-url "$env:SUPABASE_DB_URL"
npx supabase db lint --db-url "$env:SUPABASE_DB_URL" --schema public --level warning --fail-on error
$generatedTypes = npx supabase gen types typescript --db-url "$env:SUPABASE_DB_URL"
if ($LASTEXITCODE -ne 0) { throw "Supabase type generation failed." }
```

Expected: Phase 4 is already applied to the authorized validation database, the dry run has no unintended pending migration, generated types exactly match that migrated schema, approved packages resolve, type/lint/build succeed, and no whitespace or uncommitted implementation file remains.

- [ ] **Step 2: Inspect database constraints, RPC security, RLS, and migration results**

In the same authorized local/non-production SQL editor used in Task 2, rerun the exact read-only catalog queries from Task 2 Step 5 and confirm:

- unique locator constraints exist on both `track_versions` and `files`;
- `(track_id, version_num)` remains unique;
- `register_r2_track_version` and `register_r2_file` are security invoker, have fixed `search_path`, take explicit `p_user_id`, do not depend on `auth.uid()`, deny execute to `public`/`anon`/`authenticated`, and grant execute only to `service_role`;
- `authenticated` has no table INSERT privilege and no INSERT policy on `track_versions` or `files`;
- `actions.event_date` is non-null;
- Content title/notes limits are 200/5,000 and reference URLs require `http`/`https`;
- RLS remains enabled on all Phase 3 tables and no policy grants anonymous access.

Do not query or print table data, private keys, URLs, grants, or provider responses.

- [ ] **Step 3: Start the real app and verify protected routing**

Invoke the project `run` skill and start the app. Without a valid session, navigate to `/studio`, `/operations`, and `/content`.

Expected: each redirects to `/login` before protected content appears; no cookie, token, Supabase provider detail, R2 environment name/value, completion grant, or signed URL appears in rendered markup, console, or response bodies.

If an already-authenticated non-secret development session is unavailable, record authenticated-only browser/network steps as blocked; do not create a bypass route, seed fake records, use production credentials, or modify auth.

- [ ] **Step 4: Verify direct Uppy-to-R2 upload and recovery behavior in browser/network tools**

With an authorized development user, real development track, private development R2 bucket, and CORS configured from the example:

1. Open `/studio/<trackId>` at `1440x1000`.
2. Select Version, add an approved small audio file, start upload, pause/cancel/retry as available, and inspect each request.
3. Confirm presign is same-origin `POST /api/uploads/r2/presign` with metadata only and response includes a ten-minute URL plus opaque grant but no credential.
4. Confirm the file body request is `PUT https://<account>.r2.cloudflarestorage.com/<bucket>/<server-key>` and its request body size equals the file; no asset body request targets Next.js/Supabase.
5. Confirm `ETag` is readable, then completion is same-origin `POST /api/uploads/r2/complete` with only grant/ETag.
6. Confirm Studio success appears only after completion returns a persisted DTO and a refresh shows the new processing Production source.
7. Replay the same completion request while its grant remains valid and confirm the same row ID/version number returns with no duplicate row.
8. Temporarily block `/api/uploads/r2/complete` after a successful PUT; confirm exact registration-failed alert and that Retry registration sends only completion—no second PUT or presign.
9. For approved extensions, verify empty MIME, `application/octet-stream`, and listed browser aliases are normalized to the extension's canonical `Content-Type` in the presign response/PUT/`HeadObject`; verify a conflicting specific MIME and a disallowed extension return stable `400`.
10. Try over-limit metadata, unauthorized track, expired/altered grant, mismatched ETag, and mismatched object size/canonical content type in a controlled development bucket; confirm stable 400/403/409 responses with no provider internals and no database row.
11. With an authenticated browser client, confirm direct inserts into `track_versions`/`files` and direct registration-RPC calls are denied; then complete the verified server route and confirm its admin-client RPC succeeds.
12. Verify file-kind uploads group correctly and both version/file downloads request a fresh 600-second URL only when clicked. For a Supabase-backed row, confirm the browser sends only record type/ID to the authorized Next.js route, receives no bucket/key, and succeeds through the server-only admin `createSignedUrl` path despite the absence of a browser `storage.objects` read policy. For an R2-backed row, confirm signing uses the server-only R2 path and no Supabase admin Storage call.

Do not retain signed request/response exports containing URLs or grants after inspection.

- [ ] **Step 5: Verify Studio, Operations, and Content at desktop/mobile widths**

At `1440x1000` and `390x844`, in dark/light themes and reduced-motion emulation:

- Studio uploader supports drag/drop, picker, progress, cancel/retry, file-type guidance, registration-only retry, grouped inventory, processing/ready/archived/failed treatment, and short-lived downloads without exposing provider internals.
- Operations shows the configured zone, actual upcoming actions, month navigation through `?month=YYYY-MM`, status filtering, desktop calendar, primary mobile agenda, day-to-agenda anchors, overdue warning treatment, create/edit forms, completed/cancelled visibility, and honest empty state. Repeated `month`/`status` inputs use their first value and generated links produce one canonical value; editing a missing or RLS-inaccessible ID returns failure rather than success.
- With `VEO_TIME_ZONE` absent, Operations displays `UTC`; with a valid non-UTC IANA zone, saved local input persists as UTC and renders back to the same local time; with an invalid zone, the stable configuration state appears and mutation controls do not write.
- Content shows actual platform/status filters, metadata-only artwork fallbacks, safe external links, title/platform/difficulty/status/reference host/notes excerpt, desktop board, compact mobile list, create/edit forms, and no remote reference image request. Repeated platform/status inputs become one canonical value and zero-row updates return failure.
- Desktop uses the fixed 260px sidebar and player-safe geometry; mobile has no page-level horizontal overflow, one theme control, active current-module title/navigation, 16px safe margins, and usable content above the persistent player.
- Focus is visible on uploader, calendar, filters, forms, links, and downloads. Reduced motion removes nonessential transitions without hiding state.
- VEO AI remains visibly unavailable and no public listening route/UI appears.

- [ ] **Step 6: Inspect network, client bundles, console, and secret safety**

During browser checks, confirm no introduced console warning/error remains after deliberate blocked-request checks are removed. Then run:

```powershell
git check-ignore .env.local
$tracked = git ls-files
$assignmentPatterns = @(
  'R2_ACCOUNT_ID\s*=',
  'R2_ACCESS_KEY_ID\s*=',
  'R2_SECRET_ACCESS_KEY\s*=',
  'R2_BUCKET_NAME\s*=',
  'UPLOAD_GRANT_SECRET\s*=',
  'SUPABASE_SERVICE_ROLE_KEY\s*='
)
foreach ($pattern in $assignmentPatterns) {
  foreach ($file in $tracked) {
    $hit = Select-String -Path $file -Pattern $pattern -ErrorAction SilentlyContinue
    if ($hit) { throw "Tracked secret assignment pattern found." }
  }
}

$clientFiles = Get-ChildItem ".next/static" -Recurse -File
$secretValues = @(
  $env:R2_ACCOUNT_ID,
  $env:R2_ACCESS_KEY_ID,
  $env:R2_SECRET_ACCESS_KEY,
  $env:R2_BUCKET_NAME,
  $env:UPLOAD_GRANT_SECRET,
  $env:SUPABASE_SERVICE_ROLE_KEY
) | Where-Object { $_ }
foreach ($secret in $secretValues) {
  if ($clientFiles | Select-String -SimpleMatch $secret -Quiet) {
    throw "Server-only secret value found in client bundle."
  }
}
$clientSource = Get-ChildItem "src/components","src/app" -Recurse -File -Include *.ts,*.tsx | Where-Object { (Get-Content $_.FullName -Raw) -match '"use client"' }
$adminImports = $clientSource | Select-String -SimpleMatch '@/lib/supabase/admin' -ErrorAction SilentlyContinue
if ($adminImports) { throw "Supabase admin client imported by client source." }
$phase4SinkFiles = Get-ChildItem "src/lib/uploads","src/lib/r2","src/lib/storage","src/components/upload","src/app/api/uploads" -Recurse -File -Include *.ts,*.tsx
$transportLogging = $phase4SinkFiles | Select-String -Pattern "console\.(log|info|warn|error)|logger\.|telemetry\.|captureException\(" -ErrorAction SilentlyContinue
if ($transportLogging) { throw "Inspect logging/telemetry matches and remove any transport data sink before release." }
```

Expected: `.env.local` is ignored, tracked files contain no secret assignments, client bundles contain no configured R2/admin secret value, Client Components do not import the admin client, and transport identifiers are absent from logging/telemetry sinks. The inspection permits required identifiers in typed request/response handling and approved locator database writes; no secret value is printed by the commands.

- [ ] **Step 7: Run a focused security review over the complete Phase 4 diff**

Invoke the `security-review` skill against `main...phase-4-uploads-operations-content`. Require review of request-scoped authentication/`can_manage_track`, HMAC construction/timing-safe verification/30-minute expiry, key traversal/prefix checks, PUT scope/expiry, extension-to-canonical-MIME normalization, `HeadObject` ETag/size/canonical-MIME comparison, operation-specific admin-client construction order, explicit verified `p_user_id`, service-role-only RPC grants, denied authenticated inserts, idempotency/uniqueness, RLS behavior, affected-row checks for Operations/Content updates, repeated search-parameter normalization, and signed downloads. For downloads, specifically verify request-scoped auth plus RLS row lookup occurs before signing, browser input cannot supply the locator, Supabase signing accepts only safe `supabase`/`playback` locators and uses admin `createSignedUrl` only after authorization, no browser `storage.objects` policy exists, and R2 signing uses only server-side R2 credentials. Also review SSR/client boundaries, URL safety, XSS, CSRF assumptions, provider-error handling, logging/telemetry/persistence sinks, and secret exposure.

Expected: no unresolved critical/high finding. Fix confirmed findings on the feature branch, rerun Steps 1–6, and create a new ordinary commit; do not amend, skip hooks, or suppress the finding.

- [ ] **Step 8: Verify final route/scope and Git integrity**

Run:

```powershell
$routes = Get-ChildItem -Recurse ".next/server/app" -File | Select-Object -ExpandProperty FullName
$required = @("studio", "operations", "content", "uploads", "download")
foreach ($term in $required) {
  if (-not ($routes -match [regex]::Escape($term))) { throw "Expected Phase 4 build route fragment is absent: $term" }
}
$phase5Paths = @(
  "src/components/chat/VEO_AI_Chat.tsx",
  "src/app/(dashboard)/ai",
  "src/app/(public)",
  "src/app/listen"
)
foreach ($path in $phase5Paths) {
  if (Test-Path $path) { throw "Phase 5 path exists before authorization: $path" }
}
git diff --check
git status --short --branch
git log --oneline --decorate -16
```

Expected: all Phase 4 route fragments exist, no Phase 5 path exists, working tree is clean, and each implementation task has its own commit.

- [ ] **Step 9: Integrate the reviewed feature branch into current `main`**

Run:

```powershell
git fetch origin
git switch main
git pull --ff-only origin main
git merge --no-ff phase-4-uploads-operations-content -m "feat: complete VEO OS phase 4 uploads operations content" -m "Co-Authored-By: Claude <noreply@anthropic.com>"
```

Expected: the non-fast-forward merge succeeds. If it conflicts, stop before discarding either side; reconcile current upstream work against this plan, rerun Steps 1–8 on the resolved merge, and then create the same merge commit. Never use reset-hard against upstream work or a force option.

- [ ] **Step 10: Push without force and verify local/remote completion**

Run:

```powershell
git push origin main
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
```

Expected: push succeeds without `--force`; working tree is clean; local and remote SHAs match; authorized direct R2 uploads, idempotent persistence, Studio files/downloads, Operations, Content, and navigation satisfy Phase 4; Phase 5 remains inactive.

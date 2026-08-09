# VEO OS - MASTER TECHNICAL ARCHITECTURE

## 1. FOLDER STRUCTURE
You must strictly follow this Next.js App Router structure:
```text
/src
  /app
    /(auth)
      /login/page.tsx
    /(dashboard)
      layout.tsx (CRITICAL: Global Audio Player lives here)
      page.tsx (Dashboard)
      /studio
        /page.tsx (Track list)
        /[trackId]/page.tsx (Track details, Waveform, Comments)
      /operations
        page.tsx (Calendar, Actions)
      /content
        page.tsx (Moodboard, Ideas)
  /components
    /ui (Shadcn components)
    /audio
      GlobalPlayer.tsx
      WaveformDisplay.tsx
    /upload
      R2Uploader.tsx
    /chat
      VEO_AI_Chat.tsx
  /lib
    /supabase
      client.ts
      server.ts
    /store
      useAudioStore.ts (Zustand state for global player)
  /types
    database.types.ts

```

## 2. DATABASE SCHEMA (Supabase PostgreSQL)

Create these exact tables when setting up the database. Use UUIDs for IDs.

* `users`: id, full_name, role, avatar_url, created_at.
* `tracks`: id, title, status (draft/active/completed/cancelled), created_by (fk users), created_at.
* `track_versions`: id, track_id (fk), version_num (int), storage_url, status.
* `comments`: id, version_id (fk), user_id (fk), timestamp_marker (float), content, is_resolved (boolean), created_at.
* `files`: id, track_id (fk), type (stem/flp/zip/artwork), storage_url, size_bytes.
* `actions`: id, title, description, event_date (timestamp), status.
* `content_ideas`: id, title, platform, difficulty, status, reference_url.

## 3. FEATURE SPECIFICATIONS & TECHNICAL RULES

### FEATURE A: Audio Engine & Global State

* **Rule:** Music must NOT stop when navigating between pages.
* **Implementation:** `<GlobalPlayer />` component is placed in `app/(dashboard)/layout.tsx`. State is managed by Zustand (`useAudioStore`).
* **Waveform:** In `[trackId]/page.tsx`, `wavesurfer.js` is used. Must be a `'use client'` component. Clicking the waveform saves the `currentTime` as `timestamp_marker` to the `comments` table.

### FEATURE B: Heavyweight Uploads (Direct to R2)

* **Rule:** Never upload 1GB+ files through Next.js API Routes.
* **Implementation:** Use Uppy.js `@uppy/aws-s3` plugin. Next.js only generates the Presigned URL. The client browser uploads directly to Cloudflare R2 bucket.

### FEATURE C: External Secure Listening

* **Rule:** No raw URLs exposed.
* **Implementation:** Generate short-lived Signed URLs via Supabase Storage. Wrap the audio in a custom player. Add a CSS watermark (`mix-blend-mode`) with the guest's name over the screen.

### FEATURE D: VEO AI (RAG)

* **Implementation:** Supabase `pgvector` stores embeddings of actions and comments. OpenAI API generates responses based on this context.

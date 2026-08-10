# VEO OS Phase 2 — Protected Dashboard Shell and Persistent Audio Design

**Date:** 2026-08-10

**Status:** Approved for implementation under the standing VEO OS autopilot authorization
**Authority:** `VEO_OS_MASTER_PLAN.md`, `VEO_OS_DESIGN_MANIFESTO.md`, and the completed Phase 1 authentication design

## 1. Purpose

Phase 2 turns the successful Phase 1 sign-in destination into the first real VEO OS workspace. It replaces the create-next-app root page with an authenticated dashboard shell and establishes the persistent global audio architecture required by later Studio work.

Phase 2 must deliver:

1. A protected dashboard boundary at `/`.
2. A responsive VEO OS shell with persistent desktop navigation and a compact mobile header.
3. A layout-mounted global audio player that survives dashboard route transitions.
4. A Zustand playback store with a stable, testable contract.
5. An honest dashboard home state that introduces future modules without fabricating production data.

The phase establishes composition and state boundaries only. It does not begin the track database, waveform workspace, upload pipeline, external listening, or AI system.

## 2. Current State and Handoff

Phase 1 provides:

- Request-scoped Supabase browser/server clients.
- Registered Next.js middleware that refreshes Supabase claims and propagates cookies.
- Invite-only password sign-in.
- Server-side login-page redirect for authenticated users.
- Successful client navigation to `/`.
- Class-based dark/light themes, semantic tokens, glass surfaces, reusable Button/Input primitives, and required typography.

The root route is still the create-next-app starter page. Phase 2 owns replacing it.

## 3. Scope

### 3.1 In scope

- `src/app/(dashboard)/layout.tsx`
- `src/app/(dashboard)/page.tsx`
- Removal of the conflicting `src/app/page.tsx`
- Server-side dashboard authorization with `supabase.auth.getUser()`
- Server-first responsive dashboard shell
- Desktop sidebar and mobile dashboard header
- Theme toggle within the authenticated shell
- Dashboard home/empty state
- Zustand global audio telemetry and source-selection store
- Native `<audio>`-backed floating player dock at `src/components/audio/GlobalPlayer.tsx`
- Accessible playback, seek, time, and volume controls
- Reduced-motion behavior
- Unit/component/route tests
- Production build and real-browser visual checks at required viewports

### 3.2 Explicitly out of scope

- SQL migrations, RLS policies, or generated Supabase database types
- `users`, `tracks`, `track_versions`, comments, files, actions, or content-idea queries
- Real track lists or fabricated operational metrics
- Wavesurfer rendering
- Timestamped comments
- Queue management, playlists, shuffle, repeat, previous-track, or next-track behavior
- Uppy or Cloudflare R2 uploads
- Secure external listening links or watermarking
- Operations calendar/actions implementation
- Content moodboard implementation
- VEO AI, OpenAI, pgvector, embeddings, or RAG
- Public registration, OAuth, magic links, reset-password, or MFA flows
- Middleware authorization redirects; the dashboard layout is the protected boundary
- A framework-major dependency migration

## 4. Chosen Architecture

### 4.1 Recommended approach

Use a Server Component dashboard layout as the presentation-entry authorization boundary, a server-rendered dashboard shell for static responsive structure, a layout-mounted client `GlobalPlayer`, Zustand for serializable source selection and observed playback telemetry, and one native browser `HTMLAudioElement` owned by the player.

This is preferred because it:

- Protects every current and future dashboard child route by construction.
- Avoids client-only auth flashes.
- Keeps Phase 1 middleware focused on token refresh.
- Satisfies the master plan’s explicit Zustand and persistent-player requirements.
- Keeps browser-only media behavior out of server code and out of the store.
- Requires no new runtime dependency.

### 4.2 Rejected alternatives

#### Middleware authorization plus layout authorization

This would duplicate authorization decisions before the dashboard route family exists. It also makes matcher maintenance more fragile as Studio, Operations, Content, and AI routes are added. Middleware remains session-refresh infrastructure in Phase 2.

#### Client-only authorization

A client guard can render protected shell content before redirect and depends on hydration. It is not acceptable for the private VEO workspace.

#### React Context instead of Zustand

The master plan explicitly requires Zustand for global audio state. Context would also make future non-React consumers and fine-grained subscriptions less direct.

#### Wavesurfer in the global dock

Wavesurfer is reserved for the Phase 3 track-detail workspace. The global dock needs reliable transport controls, not waveform editing.

## 5. Route and Authorization Design

### 5.1 Route structure

```text
src/app/
├── (auth)/
│   └── login/
└── (dashboard)/
    ├── layout.tsx
    └── page.tsx
```

Route groups do not affect URLs, so `(dashboard)/page.tsx` owns `/`.

The existing `src/app/page.tsx` must be removed because it conflicts with `(dashboard)/page.tsx` at the same URL.

### 5.2 Dashboard authorization boundary

`src/app/(dashboard)/layout.tsx` remains an async Server Component with this exact control flow:

1. Create the request-scoped Supabase server client outside any provider-lookup `try/catch`. Missing public environment configuration must retain Phase 1’s concise developer-facing configuration failure; it must not be disguised as an unauthenticated session.
2. Call `supabase.auth.getUser()` and inspect both `data.user` and `error`.
3. Treat a returned provider/auth error or missing user as unauthenticated.
4. Catch only exceptions thrown by the lookup itself and treat those as unauthenticated without logging provider details, cookies, or tokens.
5. Call `redirect("/login")` after the lookup/catch block. `redirect()` must never be inside a broad `try/catch`, because Next implements it by throwing a redirect exception.
6. Render the dashboard shell only when a user exists.

The layout must not query application tables. Phase 2 needs only the authenticated/not-authenticated entry decision.

Authorization tests must mock `redirect()` as a throwing function and prove that redirecting paths cannot continue rendering children.

### 5.3 Layout persistence and security boundary

The player is mounted inside `(dashboard)/layout.tsx`, outside the changing route child. Next App Router preserves this shared layout while navigating among dashboard descendants, so the same player and audio element can remain mounted.

This layout is a presentation-entry gate, not the future data-authorization boundary. Phase 3 and later must still enforce Supabase RLS, per-request ownership checks, mutation authorization, and signed-URL authorization independently.

The store is module-scoped Zustand state and is not persisted to local storage. Future audio sources may be short-lived signed URLs; persisting those URLs would be unsafe and stale.

## 6. Component Boundaries

### 6.1 `DashboardShell`

Recommended file:

`src/components/dashboard/dashboard-shell.tsx`

`DashboardShell` is a Server Component. CSS handles responsive presentation; Phase 2 has no shell-level menu or interactive state that justifies hydrating the navigation frame.

Responsibilities:

- Render the semantic dashboard frame.
- Compose desktop navigation, mobile header, one `<main>`, and player-safe bottom spacing.
- Mount the existing client `ThemeToggle` as a small island.
- Mount exactly one client `GlobalPlayer` after `<main>` in DOM order and outside the route-child slot.
- Ensure only one theme control is visible and keyboard reachable at a given viewport.

Interface:

```ts
type DashboardShellProps = {
  children: React.ReactNode;
};
```

Exact composition:

```tsx
<DashboardShell>
  <DashboardSidebar />
  <MobileDashboardHeader />
  <main>{children}</main>
  <GlobalPlayer />
</DashboardShell>
```

Route pages return `<section>`/`<article>` content and must not add a second `<main>`.

### 6.2 `DashboardSidebar`

Recommended file:

`src/components/dashboard/dashboard-sidebar.tsx`

Desktop behavior at Tailwind `lg` and above:

- Fixed/translucent 260px sidebar.
- VEO OS identity and exact `VEO // PRIVATE NETWORK` label.
- Dashboard is the only active destination and uses `aria-current="page"`.
- Exact future rows are `Studio`, `Operations`, `Content`, and `VEO AI`; each displays `Coming soon` and is not a link or button.
- Theme toggle is placed in the utility area.
- No fabricated notification counts, avatars, activity, or health status.

Semantic structure:

- `<aside>`
- `<nav aria-label="Primary navigation">`
- Current destination as a real link to `/`
- Future destinations as noninteractive labelled rows with `Coming soon`

### 6.3 `MobileDashboardHeader`

Recommended file:

`src/components/dashboard/mobile-dashboard-header.tsx`

Mobile behavior below Tailwind `lg`:

- Compact VEO identity, exact current-context label `Dashboard`, and theme toggle.
- Does not create a menu or sheet for unavailable destinations.
- Remains in normal document flow or uses a non-obscuring sticky treatment.
- Uses the same 16px horizontal safe area as the main content.

This avoids adding a dialog dependency and avoids placing navigation underneath the player dock.

### 6.4 Dashboard home

`src/app/(dashboard)/page.tsx` is a Server Component with no database reads.

Exact content:

- Heading: `Studio command center`.
- Introductory copy: `The private VEO workspace is ready. Studio catalog, operations, content, and VEO AI modules will come online in their dedicated phases.`
- Module rows/cards: `Studio`, `Operations`, `Content`, and `VEO AI`, each with status `Coming soon`.
- Player-readiness heading: `Listening layer ready`.
- Player-readiness copy: `Tracks will appear here when the Studio catalog is connected.`

It must not display fake tracks, deadlines, comments, collaborators, percentages, storage usage, analytics, or service-health claims.

## 7. Audio State Design

### 7.1 Store location

`src/lib/store/useAudioStore.ts`

### 7.2 Serializable playback-source contract

```ts
export type PlaybackSource = {
  sourceId: string; // maps to track_versions.id when Phase 3 adds data
  trackId: string;
  title: string;
  subtitle?: string;
  artworkUrl?: string;
  playbackUrl: string;
};
```

`PlaybackSource` is a UI/playback DTO. It is not a Supabase database row, storage record, or persisted signed-link cache.

No `HTMLAudioElement`, React ref, callback, Supabase client, signed-link lifecycle object, or Wavesurfer instance may enter Zustand state.

### 7.3 Store state

```ts
type AudioState = {
  source: PlaybackSource | null;
  isPlaying: boolean; // observed media state
  currentTime: number; // observed media position
  duration: number; // observed media duration
  volume: number; // user preference
};
```

Export a reusable `initialAudioState` so tests can reset module-scoped state deterministically with `useAudioStore.setState(initialAudioState, true)` or an equivalent documented helper.

Defaults:

- `source: null`
- `isPlaying: false`
- `currentTime: 0`
- `duration: 0`
- `volume: 0.8`

### 7.4 Store actions

```ts
type AudioActions = {
  selectSource: (source: PlaybackSource) => void;
  clearSource: () => void;
  setVolume: (volume: number) => void;
  reportPlaying: (isPlaying: boolean) => void;
  reportCurrentTime: (seconds: number) => void;
  reportDuration: (seconds: number) => void;
};
```

The store separates source-selection commands and user preference from player-owned media telemetry. It does not expose generic `play`, `pause`, `toggle`, or `seek` scalar setters that imply an audio element will move when only Zustand changed.

Rules:

- A different `sourceId` always resets `currentTime`, `duration`, and `isPlaying`.
- A same-source metadata update preserves progress only when `playbackUrl` is unchanged.
- A changed `playbackUrl`, even for the same `sourceId`, is treated as a replacement and resets playback. Refreshing an expiring signed URL while preserving progress is a separate Phase 3 controller operation.
- Clearing a source restores the idle playback telemetry but retains the user’s volume.
- Reported time values are finite and clamped to `0..duration` when duration is known.
- Reported duration is finite and never negative.
- Volume is finite and clamped to `0..1`.
- Only `GlobalPlayer` reports playback/time/duration observations in Phase 2.
- Imperative `play`, `pause`, and `seek` operations remain local to `GlobalPlayer`; Phase 3 owns any shared controller interface required by the waveform workspace.

## 8. Global Player Design

### 8.1 Location and ownership

`src/components/audio/GlobalPlayer.tsx`

The casing follows the strict master-plan path and must remain consistent on Windows and Linux.

`GlobalPlayer` is a client component mounted exactly once by the dashboard shell/layout composition.

The component owns:

- One native `<audio>` element.
- The element ref.
- Media event listeners.
- The asynchronous `play()` call.
- A local generic playback error message.

Zustand owns desired and observed serializable playback state.

### 8.2 Gesture-safe, race-safe synchronization

The audio element uses `preload="metadata"` and begins with its native volume explicitly synchronized to the store default of `0.8` on mount.

When a source becomes selected:

1. Increment a source/request generation ref so stale promises and old-source events can be ignored.
2. Pause the prior resource.
3. Remove the prior `src`, call `load()`, and clear local playback errors.
4. Assign the new `playbackUrl`, call `load()`, and keep playback paused.
5. Do not autoplay.

When a source is cleared:

1. Increment the generation ref.
2. Pause the element.
3. Remove `src` and call `load()` to release the resource.
4. Clear time, duration, playing telemetry, and local playback errors.
5. Retain the user’s volume preference.

The play/pause button performs imperative transport directly inside its click/keyboard activation handler:

- If paused, capture the current generation and call `audio.play()` directly from the user gesture. Do not first flip a Zustand boolean and defer `play()` to an effect.
- If `play()` rejects and the captured generation is still current, report paused state and announce `Unable to play this track.` without browser/provider details.
- If playing, increment the transport request generation and call `audio.pause()` immediately.
- A late play-promise resolution, rejection, or old-source event must not reverse a newer pause, clear, or source-replacement request.

Media events report observed state only when they belong to the current element source/generation:

- `loadedmetadata` and `durationchange` call `reportDuration`.
- `timeupdate` calls `reportCurrentTime`.
- `play` calls `reportPlaying(true)` only when it is not stale.
- `pause` calls `reportPlaying(false)`.
- `ended` reports paused state and final time.
- `error` reports paused state and announces the generic playback error.
- Successful playback and source replacement clear any previous playback alert.

Seeking:

- The `Seek` range control performs the imperative `audio.currentTime` assignment and then reports the sanitized position.
- It uses `min=0`, `max=duration`, and `step=0.1`.
- It is disabled in the idle state or while duration is zero/unknown.

Volume:

- The `Volume` range control updates `audio.volume` and the store.
- It remains operable in the idle state so a preference can be chosen before a track is selected.
- Volume changes never trigger playback.

### 8.3 Idle state

Before Phase 3 supplies a playback source:

- Display exact title `No track selected`.
- Display exact supporting copy `Choose a track from Studio when the catalog is connected.`
- Disable play and seek controls.
- Do not render a fake title, fake artist, or remote placeholder art.
- Keep the dock visually present so the persistent architecture is explicit.

### 8.4 Player controls

Required controls:

- Play/pause button with dynamic accessible name.
- Seek range with persistent label `Seek`, `min=0`, `max=duration`, and `step=0.1`.
- Elapsed and total time as readable text; unknown duration displays `0:00`.
- Volume range with persistent label `Volume`.
- A polite status region may announce source/playback state changes, but continuously changing elapsed time must never be live-announced.
- Playback errors use `role="alert"` and clear after successful playback or source replacement.

Previous/next, queue, repeat, shuffle, waveform, and download controls are not included until their data contracts exist.

### 8.5 Time formatting

Use a pure helper that:

- Treats non-finite or negative values as zero.
- Formats under one hour as `m:ss`.
- Formats one hour or more as `h:mm:ss`.

The helper receives focused unit coverage.

## 9. Visual Design

### 9.1 Foundation

Reuse the existing semantic theme and glass system. Do not create a second token layer.

- Dark default: pure-black ambient field.
- Light background: `#FAFAFA`.
- Primary readable foreground and deep-violet container roles remain distinct.
- Structural surfaces use `glass-panel` and `rounded-3xl`.
- Internal modules use `rounded-2xl`.
- Custom icons are Phosphor only.
- Inter is used for interface copy.
- Space Grotesk is used for headings, labels, and production data.

### 9.2 Desktop layout

At Tailwind `lg` and above:

- 32px safe area.
- Fixed 260px sidebar.
- Main content begins after the sidebar with a 32px gutter.
- Content uses a bounded readable width rather than filling ultrawide screens.
- Define `--player-dock-height: 6rem` for layout reservation.
- The player floats above `max(2rem, env(safe-area-inset-bottom))` and respects horizontal safe-area insets.
- Main content bottom padding is at least `calc(var(--player-dock-height) + max(4rem, env(safe-area-inset-bottom)))` so the dock cannot overlap content.

### 9.3 Mobile layout

At `390x844` and below Tailwind `lg`:

- 16px safe margins plus `env(safe-area-inset-left/right)` where present.
- No horizontal overflow.
- Desktop sidebar is absent from layout.
- Compact mobile header appears first.
- Main cards stack in one column.
- Define `--player-dock-height: 10rem` for the three-row compact dock.
- The dock uses a multi-row grid: source identity plus play/pause; seek plus readable times; volume.
- Interactive icon targets remain at least 40px and slider handles retain the manifesto’s tactile treatment.
- The dock sits above `max(1rem, env(safe-area-inset-bottom))` and respects horizontal safe-area insets.
- Main content bottom padding is at least `calc(var(--player-dock-height) + max(3rem, env(safe-area-inset-bottom)))`.
- Volume remains operable in the idle state.
- Native range focus indicators remain visible in dark and light themes.

### 9.4 Dashboard visual signature

The shell should feel like a private studio control surface, not a generic admin dashboard:

- Restrained fixed signal/waveform motifs may be used decoratively.
- Active/current state uses deep violet fill or a controlled glow.
- No giant marketing headline.
- No opaque full-screen card.
- No copied Stitch markup.
- No random equalizer animation suggesting audio is playing when it is not.

## 10. Motion

Use motion only for state transitions:

- Exact default spring: `{ type: "spring", stiffness: 400, damping: 30 }`.
- Exact tactile press: `whileTap={{ scale: 0.95 }}`.
- Player expansion or active transport state may use restrained spring motion.
- No continuous motion in the idle player.
- If player animation is implemented, `useReducedMotion()` removes travel, scaling, and rotating motion while preserving immediate state changes; player-specific reduced-motion tests are required only when such motion exists.

## 11. Accessibility

Required semantics and behavior:

- One `<main>` landmark.
- Desktop `<aside>` and labelled `<nav>`.
- `aria-current="page"` on Dashboard.
- Future modules are not keyboard-focusable dead links.
- All player buttons use native `<button>` elements and explicit accessible names.
- Seek and volume controls have persistent labels.
- Time is available as text and not encoded only by a slider position.
- Disabled controls expose native disabled state.
- Playback errors use `role="alert"`.
- Player status changes use a restrained live region where useful.
- Visible violet focus treatment on every interactive control.
- Logical keyboard order follows header/navigation, main content, then persistent player.
- No autoplay.
- Both themes meet WCAG AA for normal text and functional controls.

## 12. Error Handling

### 12.1 Authentication

- Missing user, returned provider/auth error, or thrown lookup/network error: redirect to `/login` using the precise control flow in Section 5.2.
- Missing Supabase public configuration remains a developer-facing configuration failure and is not caught as an unauthenticated session.
- Do not display Supabase errors in the dashboard shell.
- Do not log cookies, tokens, provider messages, or environment values.

### 12.2 Media

- Current-generation `audio.play()` rejection: return to paused state and announce a generic error.
- Stale promise/event from a replaced, cleared, or paused source: ignore it.
- Native current-source media error: return to paused state and announce the same generic error.
- Source replacement or successful playback clears the prior error.
- Invalid store numbers: sanitize and clamp rather than propagating `NaN`, infinity, or negatives.
- Missing source: keep play and seek safely disabled while leaving volume operable.

## 13. Testing Strategy

All implementation tasks follow RED → GREEN → focused verification → full verification.

### 13.1 Store tests

Reset Zustand to `initialAudioState` before every test. Cover:

- Initial idle state.
- New `sourceId` selection reset behavior.
- Same-source metadata update with unchanged URL preserves telemetry.
- Changed URL is treated as a replacement and resets telemetry.
- Clear-source behavior and volume retention.
- Current-time clamping.
- Duration normalization.
- Volume clamping.
- The public store contract exposes no misleading generic play/pause/seek setters.

### 13.2 Player tests

Cover:

- Honest idle state, operable idle volume, and disabled play/seek.
- Accessible labels, range semantics, and readable unknown time.
- Initial element volume synchronization to `0.8`.
- User activation calls `audio.play()` directly from the handler.
- Pause synchronization.
- Rapid play → pause ignores late play resolution/events.
- Source replacement/clear invalidates stale promises and old-source events.
- Source clear pauses, removes `src`, calls `load()`, clears telemetry/error, and retains volume.
- New source uses `preload="metadata"`, loads paused, and clears previous error.
- `loadedmetadata`, `durationchange`, `timeupdate`, `play`, `pause`, `ended`, and `error` events.
- Seek interaction updates element and observed store state.
- Volume interaction updates element and preference state.
- Rejected current-generation play promise produces generic alert and paused state.
- Elapsed time is not placed in a live region.
- Reduced-motion behavior only if player motion is implemented.
- Time formatting edge cases.

JSDOM media methods must be mocked at the browser boundary only. Tests must assert UI/store outcomes rather than merely asserting mock call counts.

### 13.3 Dashboard authorization tests

Cover with a throwing `redirect()` mock:

- Missing user redirects to `/login` and cannot continue rendering children.
- Returned provider/auth error redirects without leaking provider details.
- Thrown lookup/network error redirects without swallowing the redirect exception.
- Missing environment configuration remains a configuration error rather than becoming a redirect.
- Authenticated user renders the shell and children.

### 13.4 Shell and navigation tests

Cover:

- Semantic landmarks.
- Dashboard active state.
- Future modules are clearly unavailable and noninteractive.
- Theme control remains accessible.
- Global player is composed once outside route children.
- Main content reserves player-safe bottom space.

### 13.5 Shared-layout composition test

Use a test harness around the shared shell/player boundary:

1. Select a synthetic local test source in the store.
2. Report non-zero progress and playback state.
3. Capture the rendered `<audio>` element identity.
4. Rerender with different route-child content without unmounting the shell.
5. Verify store state and the same audio element remain present.
6. Verify `GlobalPlayer` is outside the route-child slot and appears exactly once.

This proves shared-layout composition, not real Next route navigation. True cross-route persistence browser verification begins in Phase 3 when a second real dashboard route such as `/studio` exists.

No remote audio URL is needed; use a synthetic test URL in unit tests only.

### 13.6 Browser verification

Drive the real Next.js application at:

- Desktop `1440x1000`
- Mobile `390x844`

Verify:

- Unauthenticated `/` redirects to `/login`.
- For visual inspection only, temporarily create `src/app/__phase-2-preview/page.tsx` that composes the real presentational `DashboardShell` and `GlobalPlayer` without importing, modifying, or bypassing auth helpers or middleware.
- Inspect `/__phase-2-preview` in dark/light themes.
- Verify desktop/sidebar and mobile/header behavior, the three-row 390px dock, idle player state, idle volume, keyboard order, focus visibility, safe-area spacing, no horizontal overflow, and no player overlap.
- Verify no console warnings/errors introduced by Phase 2.
- Remove `src/app/__phase-2-preview/page.tsx` immediately after visual inspection.
- Before final tests/build/commit, assert that `src/app/__phase-2-preview` is absent and that no preview/bypass route is present in source or build output.

The preview proves responsive presentational behavior only; it does not prove authenticated routing. No production auth bypass flag may be committed.

### 13.7 Final gates

- Focused tests pass.
- Full `npm test` passes.
- `npx tsc --noEmit` passes.
- `npm run lint` passes with no warnings/errors.
- `npm run build` passes.
- `/` is a dynamic protected dashboard route.
- `/login` remains dynamic and functional.
- `.next/server/middleware-manifest.json` contains middleware key `/`, name `src/middleware`, and the committed matcher after the final build.
- `git diff --check` and `git diff --cached --check` pass.
- `git check-ignore .env.local` confirms local-env protection; staged tracked files contain zero assignments for `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, with counts reported but values never printed.
- `src/app/__phase-2-preview` is absent before build/commit.
- No Phase 3–5 files or behavior are introduced.

## 14. Dependency Decision

No new runtime dependency is required.

Already available:

- Zustand
- Framer Motion
- Phosphor Icons
- next-themes
- Supabase SSR
- Vitest/JSDOM/Testing Library/user-event

`wavesurfer.js` remains installed but unused until the track-detail phase.

The currently reported Next 14/PostCSS advisories require a separately planned framework-major migration. Phase 2 must not force-upgrade Next as an incidental change.

## 15. Security and Privacy

- Dashboard access is determined on the server.
- No client-only auth gate.
- No valid team credentials in automated tests or browser smoke.
- No committed auth bypass.
- No environment values, cookies, tokens, or secret values printed.
- `.env.local` remains ignored and untracked.
- No service-role key is introduced.
- No remote placeholder media is loaded.
- No signed URL is persisted.
- No user/profile data is fetched until schema and RLS exist.

## 16. Phase 2 Acceptance Criteria

Phase 2 is complete when:

1. `/` is owned by `(dashboard)/page.tsx`, not the starter page.
2. Unauthenticated access to `/` redirects to `/login` on the server.
3. Authenticated layout composition is covered by tests.
4. The responsive shell follows manifesto safe areas and glass hierarchy.
5. Desktop navigation is semantic and honest about unavailable modules.
6. Mobile uses a compact header with no dead menu.
7. `GlobalPlayer` is mounted once outside the route-child slot in the dashboard shell/layout.
8. Zustand exposes the specified serializable source-selection and observed-telemetry contract without misleading transport setters.
9. The player’s gesture-safe, race-safe native audio synchronization and error handling are tested.
10. Idle state contains no fabricated track or remote placeholder.
11. Player and shell respect keyboard, contrast, and reduced-motion requirements.
12. All automated/build/security gates pass.
13. The implementation is committed and pushed to `origin/main` without force.
14. Phase 3 schema, track workspace, and upload behavior remain absent.

## 17. Recommended Later Phase Allocation

This design does not authorize the later work, but it establishes clean boundaries for it:

- **Phase 3:** Supabase schema/RLS/types, profiles, Studio track list/detail, versions, Wavesurfer, timestamp comments, and real track selection. Phase 3 owns the database/version-to-`PlaybackSource` adapter, ephemeral playback URL issuance/refresh, and any waveform-to-global-player imperative controller contract.
- **Phase 4:** R2/Uppy uploads, files/stems, Operations calendar/actions, and Content moodboard. Upload completion persists storage/version metadata and refreshes the catalog; Uppy/R2 code must never insert raw upload URLs directly into Zustand.
- **Phase 5:** secure external listening/watermarking and VEO AI with pgvector/OpenAI RAG. External listening lives outside `(dashboard)`, uses an independent secure player/session model, and must not reuse the authenticated dashboard’s module-scoped audio store. Signed-link expiry and watermarking remain independent from the internal persistent dock.

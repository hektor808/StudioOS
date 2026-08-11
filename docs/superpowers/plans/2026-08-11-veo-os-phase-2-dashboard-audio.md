# VEO OS Phase 2 Dashboard and Persistent Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the starter root page with a server-protected VEO OS dashboard shell and establish a persistent, accessible, race-safe native audio dock backed by a serializable Zustand store.

**Architecture:** An async `(dashboard)` Server Component layout is the presentation-entry authorization boundary and renders a server-first responsive shell. The shell mounts one client `GlobalPlayer` outside the changing route child; Zustand stores only source selection, volume preference, and observed playback telemetry, while the player owns the single `HTMLAudioElement` and all imperative media operations.

**Tech Stack:** Next.js 14.2.35 App Router, React 18, TypeScript, Tailwind CSS 3.4, Zustand 5, Supabase SSR 0.12, next-themes, Framer Motion 13, Phosphor Icons, Vitest 4, JSDOM, Testing Library, user-event

## Global Constraints

- Work only in `C:\Users\pc\Documents\Code Projects\StudioOS` under the standing VEO OS autopilot authorization; push `main` to `origin` only after every Phase 2 gate passes and never force-push.
- Read `VEO_OS_MASTER_PLAN.md`, `VEO_OS_DESIGN_MANIFESTO.md`, and `docs/superpowers/specs/2026-08-10-veo-os-phase-2-dashboard-audio-design.md` before implementation.
- `/` must be owned by `src/app/(dashboard)/page.tsx`; remove the conflicting `src/app/page.tsx`.
- The dashboard layout is the server-side presentation-entry authorization boundary. Middleware remains session-refresh infrastructure and must not gain authorization redirects.
- Create the request-scoped Supabase server client outside the provider-lookup `try/catch`; missing public environment configuration must remain the exact developer-facing error `Supabase environment is not configured.`.
- Treat a missing user, returned provider/auth error, or exception thrown by `getUser()` as unauthenticated; call `redirect("/login")` after the lookup/catch block and never catch the redirect exception.
- Do not add SQL migrations, RLS policies, generated database types, application-table queries, user/profile data reads, or service-role usage.
- Mount exactly one `GlobalPlayer` after `<main>` in dashboard-shell DOM order and outside the route-child slot.
- Zustand must remain module-scoped and non-persisted. Never place an `HTMLAudioElement`, React ref, callback, Supabase client, signed-link lifecycle object, Wavesurfer instance, or imperative transport command in the store.
- Do not add generic store actions named `play`, `pause`, `toggle`, or `seek`; imperative transport remains local to `GlobalPlayer`.
- Do not autoplay. The native player must use `preload="metadata"`, synchronize initial volume to `0.8`, and ignore stale promises/events after pause, clear, or source replacement.
- Do not add queue, playlist, previous/next, shuffle, repeat, waveform, download, upload, database, Operations, Content, external-listening, or AI behavior.
- Do not use remote placeholder media or fabricate tracks, deadlines, comments, collaborators, percentages, analytics, storage usage, notifications, avatars, or service-health claims.
- Reuse the existing semantic theme variables and `.glass-panel`; do not create a second token layer or embed theme-specific color systems throughout JSX.
- Dark mode defaults to `#000000`; light mode uses `#FAFAFA`; the brand accent remains PANTONE 2735 C `#2E008B`.
- Structural surfaces use `glass-panel` and `rounded-3xl`; internal modules use `rounded-2xl`; custom icons are Phosphor only.
- Inter is used for interface copy; Space Grotesk is used for headings, labels, timecodes, and production data.
- Desktop uses a fixed `260px` sidebar, `32px` safe area, `32px` gutter, and `--player-dock-height: 6rem`.
- Mobile uses `16px` safe margins, a compact header, a three-row dock, and `--player-dock-height: 10rem`; no horizontal overflow is allowed at `390x844`.
- Interactive icon targets are at least `40px`; focus treatment remains visible in both themes; seek and volume have persistent labels; elapsed/total time remains readable text and is never live-announced.
- Motion is state-only. Any custom tactile motion uses `{ type: "spring", stiffness: 400, damping: 30 }` and `whileTap={{ scale: 0.95 }}` and is removed when `useReducedMotion()` is true.
- Follow RED → GREEN → focused verification → full verification for every behavior.
- Every commit message ends with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Before the final build/commit, `src/app/__phase-2-preview` must be absent and no auth-bypass or preview route may remain.

---

## File Map

### Audio contract and player

- Create: `src/lib/store/useAudioStore.ts` — serializable playback source, user volume preference, observed telemetry, sanitization, and reset contract.
- Create: `src/lib/store/useAudioStore.test.ts` — store state/action behavior and public-contract coverage.
- Create: `src/lib/audio/format-time.ts` — pure playback time formatter.
- Create: `src/lib/audio/format-time.test.ts` — negative, non-finite, sub-hour, and hour-plus formatting.
- Create: `src/components/audio/GlobalPlayer.tsx` — one native audio element, imperative transport, event synchronization, stale-request invalidation, accessible dock UI, and local generic media errors.
- Create: `src/components/audio/GlobalPlayer.test.tsx` — idle, lifecycle, event, transport-race, seek, volume, and error behavior.
- Modify: `src/app/globals.css` — player height variables, safe-area dock positioning, player-safe main padding, and tactile native range styling.

### Dashboard presentation

- Create: `src/components/dashboard/dashboard-sidebar.tsx` — desktop semantic navigation and utility area.
- Create: `src/components/dashboard/dashboard-sidebar.test.tsx` — current destination and noninteractive future rows.
- Create: `src/components/dashboard/mobile-dashboard-header.tsx` — compact mobile identity/current-context header.
- Create: `src/components/dashboard/mobile-dashboard-header.test.tsx` — current context, theme control, and no unavailable menu.
- Create: `src/components/dashboard/dashboard-home.tsx` — honest dashboard landing content with no data reads.
- Create: `src/components/dashboard/dashboard-home.test.tsx` — exact copy and no fabricated operational content.
- Create: `src/components/dashboard/dashboard-shell.tsx` — server-first frame, one main landmark, responsive navigation, and one persistent player after main.
- Create: `src/components/dashboard/dashboard-shell.test.tsx` — landmarks, DOM order, one player, safe spacing, and child-rerender persistence.

### Protected route family

- Delete: `src/app/page.tsx` — conflicting create-next-app root route and remote starter assets.
- Create: `src/app/(dashboard)/layout.tsx` — async server authorization boundary.
- Create: `src/app/(dashboard)/layout.test.tsx` — missing-user, provider-error, thrown-lookup, configuration-error, and authenticated-render behavior.
- Create: `src/app/(dashboard)/page.tsx` — `/` server page that renders `DashboardHome` without database reads.
- Create: `src/app/(dashboard)/page.test.tsx` — root-page composition contract.

### Verification-only temporary file

- Create temporarily, then delete before final verification: `src/app/__phase-2-preview/page.tsx` — presentational shell preview with no auth imports or bypass logic.

---

### Task 1: Define the serializable audio store and time formatter

**Files:**
- Create: `src/lib/store/useAudioStore.test.ts`
- Create: `src/lib/store/useAudioStore.ts`
- Create: `src/lib/audio/format-time.test.ts`
- Create: `src/lib/audio/format-time.ts`

**Interfaces:**
- Produces: `PlaybackSource` with `sourceId`, `trackId`, `title`, optional `subtitle`, optional `artworkUrl`, and `playbackUrl`.
- Produces: `AudioState`, `AudioActions`, `AudioStore`, `initialAudioState`, `useAudioStore`, and `resetAudioStore()` for deterministic test resets without replacing action functions.
- Produces: `formatPlaybackTime(seconds: number): string`.
- Consumed by: `GlobalPlayer` and the shared-layout persistence test.

- [ ] **Step 1: Write the formatter unit tests**

Create `src/lib/audio/format-time.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { formatPlaybackTime } from "./format-time";

describe("formatPlaybackTime", () => {
  it.each([
    [Number.NaN, "0:00"],
    [Number.POSITIVE_INFINITY, "0:00"],
    [-1, "0:00"],
    [0, "0:00"],
    [5.9, "0:05"],
    [65, "1:05"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3661, "1:01:01"],
  ])("formats %s as %s", (seconds, expected) => {
    expect(formatPlaybackTime(seconds)).toBe(expected);
  });
});
```

- [ ] **Step 2: Run the formatter test and observe RED**

Run:

```powershell
npm test -- src/lib/audio/format-time.test.ts
```

Expected: FAIL because `./format-time` does not exist.

- [ ] **Step 3: Implement the pure formatter**

Create `src/lib/audio/format-time.ts`:

```ts
export function formatPlaybackTime(seconds: number): string {
  const wholeSeconds = Number.isFinite(seconds)
    ? Math.max(0, Math.floor(seconds))
    : 0;
  const hours = Math.floor(wholeSeconds / 3600);
  const minutes = Math.floor((wholeSeconds % 3600) / 60);
  const remainingSeconds = wholeSeconds % 60;
  const paddedSeconds = remainingSeconds.toString().padStart(2, "0");

  if (hours === 0) {
    return `${minutes}:${paddedSeconds}`;
  }

  return `${hours}:${minutes.toString().padStart(2, "0")}:${paddedSeconds}`;
}
```

- [ ] **Step 4: Run the formatter test and observe GREEN**

Run:

```powershell
npm test -- src/lib/audio/format-time.test.ts
```

Expected: all formatter cases pass.

- [ ] **Step 5: Write the Zustand store contract tests**

Create `src/lib/store/useAudioStore.test.ts`. Reset before every test with:

```ts
beforeEach(() => {
  resetAudioStore();
});
```

Use these exact sources:

```ts
const sourceA: PlaybackSource = {
  sourceId: "version-a",
  trackId: "track-a",
  title: "Signal One",
  subtitle: "Version 1",
  playbackUrl: "/audio/signal-one.mp3",
};

const sourceB: PlaybackSource = {
  sourceId: "version-b",
  trackId: "track-b",
  title: "Signal Two",
  playbackUrl: "/audio/signal-two.mp3",
};
```

Cover these exact assertions:

```ts
expect(useAudioStore.getState()).toMatchObject({
  source: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
});

useAudioStore.getState().selectSource(sourceA);
expect(useAudioStore.getState()).toMatchObject({
  source: sourceA,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
});

useAudioStore.setState({ isPlaying: true, currentTime: 18, duration: 120 });
useAudioStore.getState().selectSource({ ...sourceA, title: "Signal One (Master)" });
expect(useAudioStore.getState()).toMatchObject({
  isPlaying: true,
  currentTime: 18,
  duration: 120,
});

useAudioStore.getState().selectSource({
  ...sourceA,
  playbackUrl: "/audio/signal-one-refreshed.mp3",
});
expect(useAudioStore.getState()).toMatchObject({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
});

useAudioStore.setState({
  source: sourceA,
  isPlaying: true,
  currentTime: 20,
  duration: 120,
  volume: 0.35,
});
useAudioStore.getState().selectSource(sourceB);
expect(useAudioStore.getState()).toMatchObject({
  source: sourceB,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.35,
});

useAudioStore.getState().clearSource();
expect(useAudioStore.getState()).toMatchObject({
  source: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.35,
});
```

Also assert:

- `reportCurrentTime(-1)` and `reportCurrentTime(Number.NaN)` produce `0`.
- With duration `100`, `reportCurrentTime(120)` produces `100`.
- With duration `0`, `reportCurrentTime(12.5)` preserves `12.5`.
- `reportDuration(-1)` and `reportDuration(Number.POSITIVE_INFINITY)` produce `0`.
- Reducing duration below current time clamps current time to the new duration.
- `setVolume(-1)`, `setVolume(2)`, and `setVolume(Number.NaN)` produce `0`, `1`, and `0` respectively.
- `reportPlaying(true)` and `reportPlaying(false)` report observed state.
- The state object has none of the properties `play`, `pause`, `toggle`, or `seek`.

- [ ] **Step 6: Run the store test and observe RED**

Run:

```powershell
npm test -- src/lib/store/useAudioStore.test.ts
```

Expected: FAIL because `./useAudioStore` does not exist.

- [ ] **Step 7: Implement the store**

Create `src/lib/store/useAudioStore.ts`:

```ts
import { create } from "zustand";

export type PlaybackSource = {
  sourceId: string;
  trackId: string;
  title: string;
  subtitle?: string;
  artworkUrl?: string;
  playbackUrl: string;
};

export type AudioState = {
  source: PlaybackSource | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
};

export type AudioActions = {
  selectSource: (source: PlaybackSource) => void;
  clearSource: () => void;
  setVolume: (volume: number) => void;
  reportPlaying: (isPlaying: boolean) => void;
  reportCurrentTime: (seconds: number) => void;
  reportDuration: (seconds: number) => void;
};

export type AudioStore = AudioState & AudioActions;

export const initialAudioState: AudioState = {
  source: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
};

function finiteNonNegative(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export const useAudioStore = create<AudioStore>((set) => ({
  ...initialAudioState,
  selectSource: (source) =>
    set((state) => {
      const preservesTelemetry =
        state.source?.sourceId === source.sourceId &&
        state.source.playbackUrl === source.playbackUrl;

      return preservesTelemetry
        ? { source }
        : {
            source,
            isPlaying: false,
            currentTime: 0,
            duration: 0,
          };
    }),
  clearSource: () =>
    set((state) => ({
      ...initialAudioState,
      volume: state.volume,
    })),
  setVolume: (volume) =>
    set({ volume: clamp(finiteNonNegative(volume), 0, 1) }),
  reportPlaying: (isPlaying) => set({ isPlaying }),
  reportCurrentTime: (seconds) =>
    set((state) => {
      const nextTime = finiteNonNegative(seconds);
      return {
        currentTime:
          state.duration > 0 ? clamp(nextTime, 0, state.duration) : nextTime,
      };
    }),
  reportDuration: (seconds) =>
    set((state) => {
      const duration = finiteNonNegative(seconds);
      return {
        duration,
        currentTime:
          duration > 0 ? clamp(state.currentTime, 0, duration) : state.currentTime,
      };
    }),
}));

export function resetAudioStore() {
  useAudioStore.setState(initialAudioState);
}
```

- [ ] **Step 8: Run the focused unit tests and type-check**

Run:

```powershell
npm test -- src/lib/audio/format-time.test.ts src/lib/store/useAudioStore.test.ts
npx tsc --noEmit
```

Expected: all tests pass and TypeScript exits zero.

- [ ] **Step 9: Commit the audio contract**

```powershell
git add src/lib/audio src/lib/store
git commit -m "feat: define persistent audio state contract`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Build the native persistent global player

**Files:**
- Create: `src/components/audio/GlobalPlayer.test.tsx`
- Create: `src/components/audio/GlobalPlayer.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `formatPlaybackTime`, `PlaybackSource`, and `useAudioStore`.
- Produces: client `GlobalPlayer()` owning exactly one native `<audio>` element.
- Produces: CSS hooks `.dashboard-player-dock`, `.dashboard-shell-main`, and `.audio-range`.
- Contract for later tasks: the player root is `section[aria-label="Global audio player"]`; the audio element has `data-testid="global-audio-element"`.

- [ ] **Step 1: Create the media-test boundary and idle-state tests**

Create `src/components/audio/GlobalPlayer.test.tsx`. Reset the store and clear media calls before each test; restore the prototype spies once after the suite. Use:

```tsx
const motionMocks = vi.hoisted(() => ({
  reduceMotion: vi.fn(() => false),
}));

vi.mock("framer-motion", () => ({
  useReducedMotion: motionMocks.reduceMotion,
  motion: {
    button: ({
      whileTap,
      transition,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      whileTap?: unknown;
      transition?: unknown;
    }) => (
      <button
        data-while-tap={whileTap ? JSON.stringify(whileTap) : undefined}
        data-transition={transition ? JSON.stringify(transition) : undefined}
        {...props}
      />
    ),
  },
}));

const media = {
  play: vi.spyOn(HTMLMediaElement.prototype, "play"),
  pause: vi.spyOn(HTMLMediaElement.prototype, "pause"),
  load: vi.spyOn(HTMLMediaElement.prototype, "load"),
};

beforeEach(() => {
  vi.clearAllMocks();
  resetAudioStore();
  motionMocks.reduceMotion.mockReturnValue(false);
  media.play.mockResolvedValue();
  media.pause.mockImplementation(() => undefined);
  media.load.mockImplementation(() => undefined);
});

afterAll(() => {
  vi.restoreAllMocks();
});
```

If JSDOM defines any media method as non-configurable, install an equivalent `Object.defineProperty` mock on `HTMLMediaElement.prototype` at the browser boundary only.

Render `<GlobalPlayer />` and assert:

```ts
expect(screen.getByText("No track selected")).toBeInTheDocument();
expect(
  screen.getByText("Choose a track from Studio when the catalog is connected."),
).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Play" })).toBeDisabled();
expect(screen.getByRole("slider", { name: "Seek" })).toBeDisabled();
expect(screen.getByRole("slider", { name: "Volume" })).toBeEnabled();
expect(screen.getAllByText("0:00", { selector: "time" })).toHaveLength(2);
expect(screen.getByTestId("global-audio-element")).toHaveAttribute(
  "preload",
  "metadata",
);
```

Assert the initial audio element volume is `0.8`, the elapsed time is not inside an `aria-live` region, and only one `<audio>` exists.

- [ ] **Step 2: Add source-lifecycle, control, event, and race tests**

Use this exact source:

```ts
const source: PlaybackSource = {
  sourceId: "version-a",
  trackId: "track-a",
  title: "Signal One",
  subtitle: "Version 1",
  playbackUrl: "/audio/signal-one.mp3",
};
```

Cover these behaviors with Testing Library, `userEvent`, `act`, and native event dispatch:

1. Selecting `source` assigns the URL, calls `load()`, stays paused, enables play, clears an existing alert, and renders `Signal One` / `Version 1`.
2. Clearing the source pauses, removes the `src` attribute, calls `load()`, clears current time/duration/playing state and alert, and retains the selected volume.
3. Clicking Play calls `audio.play()` from the activation handler; the button does not claim Pause until a current-source `play` event reports observed playback.
4. Clicking Pause invalidates the pending play request, calls `audio.pause()` immediately, and reports paused state.
5. A deferred play promise followed by Pause cannot set playing state or an error when it later resolves/rejects.
6. Replacing or clearing a source invalidates the old play promise and ignores old-source `play`, `pause`, `timeupdate`, `durationchange`, and `error` events.
7. `loadedmetadata` and `durationchange` report sanitized duration.
8. `timeupdate` reports sanitized/clamped current time.
9. Current-source `play` and `pause` events update `isPlaying`; `ended` reports paused state and final time.
10. Current-source native `error` reports paused state and exact alert `Unable to play this track.`.
11. Current-generation `play()` rejection reports paused state and the same generic alert without exposing the rejection message.
12. A successful current-source `play` event clears the previous alert.
13. Changing Seek assigns `audio.currentTime` and reports the sanitized position; the slider uses `min="0"`, `max={duration}`, and `step="0.1"`.
14. Changing Volume assigns `audio.volume`, updates the store, remains usable with no source, and never calls `play()`.
15. The button accessible name changes between `Play` and `Pause`; Seek and Volume retain visible/persistent labels.
16. Mock `useReducedMotion()` as `true` and assert the transport button receives no `whileTap` scale and a zero-duration transition; with reduced motion false, assert `{ scale: 0.95 }` and the exact spring `{ type: "spring", stiffness: 400, damping: 30 }`.

Mock Framer Motion at the test boundary so `motion.button` renders a native button plus serialized `data-while-tap` and `data-transition` attributes; keep `useReducedMotion` as a hoisted controllable mock. This verifies the real props passed by `GlobalPlayer` without testing animation timing.

Use a controllable promise for race tests:

```ts
function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}
```

For source-event identity, set `audio.src`/`audio.currentSrc` consistently in the test boundary and dispatch events on the rendered element; assertions must check UI/store outcomes, not only mock-call counts.

- [ ] **Step 3: Run the player tests and observe RED**

Run:

```powershell
npm test -- src/components/audio/GlobalPlayer.test.tsx
```

Expected: FAIL because `GlobalPlayer.tsx` does not exist.

- [ ] **Step 4: Implement `GlobalPlayer`**

Create `src/components/audio/GlobalPlayer.tsx` with this structure and state contract:

```tsx
"use client";

import { Pause, Play, SpeakerHigh, Waveform } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ChangeEvent, type SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import { formatPlaybackTime } from "@/lib/audio/format-time";
import { useAudioStore } from "@/lib/store/useAudioStore";

const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

export function GlobalPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const sourceGenerationRef = useRef(0);
  const transportGenerationRef = useRef(0);
  const allowedPlayGenerationRef = useRef<number | null>(null);
  const activePlaybackUrlRef = useRef<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const shouldReduceMotion = useReducedMotion();

  const source = useAudioStore((state) => state.source);
  const hasSource = source !== null;
  const sourceId = source?.sourceId;
  const playbackUrl = source?.playbackUrl;
  const isPlaying = useAudioStore((state) => state.isPlaying);
  const currentTime = useAudioStore((state) => state.currentTime);
  const duration = useAudioStore((state) => state.duration);
  const volume = useAudioStore((state) => state.volume);
  const setVolume = useAudioStore((state) => state.setVolume);
  const reportPlaying = useAudioStore((state) => state.reportPlaying);
  const reportCurrentTime = useAudioStore((state) => state.reportCurrentTime);
  const reportDuration = useAudioStore((state) => state.reportDuration);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    sourceGenerationRef.current += 1;
    transportGenerationRef.current += 1;
    allowedPlayGenerationRef.current = null;
    activePlaybackUrlRef.current = playbackUrl ?? null;

    audio.pause();
    audio.removeAttribute("src");
    audio.load();
    setPlaybackError(null);
    reportPlaying(false);

    if (!hasSource || !playbackUrl) {
      reportCurrentTime(0);
      reportDuration(0);
      return;
    }

    audio.src = playbackUrl;
    audio.load();
  }, [hasSource, playbackUrl, reportCurrentTime, reportDuration, reportPlaying, sourceId]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  function eventBelongsToCurrentSource(event: SyntheticEvent<HTMLAudioElement>) {
    const activeUrl = activePlaybackUrlRef.current;
    if (!activeUrl) return false;
    const eventUrl = event.currentTarget.currentSrc || event.currentTarget.src;
    return eventUrl.endsWith(activeUrl) || eventUrl === activeUrl;
  }

  async function handleTransport() {
    const audio = audioRef.current;
    if (!audio || !source) return;

    if (!audio.paused || isPlaying) {
      transportGenerationRef.current += 1;
      allowedPlayGenerationRef.current = null;
      audio.pause();
      reportPlaying(false);
      return;
    }

    const sourceGeneration = sourceGenerationRef.current;
    const transportGeneration = transportGenerationRef.current + 1;
    transportGenerationRef.current = transportGeneration;
    allowedPlayGenerationRef.current = transportGeneration;
    setPlaybackError(null);

    try {
      await audio.play();
    } catch {
      const isCurrentRequest =
        sourceGenerationRef.current === sourceGeneration &&
        transportGenerationRef.current === transportGeneration &&
        allowedPlayGenerationRef.current === transportGeneration;

      if (isCurrentRequest) {
        allowedPlayGenerationRef.current = null;
        reportPlaying(false);
        setPlaybackError("Unable to play this track.");
      }
    }
  }

  function handlePlay(event: SyntheticEvent<HTMLAudioElement>) {
    const requestIsCurrent =
      allowedPlayGenerationRef.current !== null &&
      allowedPlayGenerationRef.current === transportGenerationRef.current;

    if (!requestIsCurrent || !eventBelongsToCurrentSource(event)) {
      event.currentTarget.pause();
      reportPlaying(false);
      return;
    }

    setPlaybackError(null);
    reportPlaying(true);
  }

  function handlePause(event: SyntheticEvent<HTMLAudioElement>) {
    if (activePlaybackUrlRef.current && !eventBelongsToCurrentSource(event)) return;
    reportPlaying(false);
  }

  function handleDuration(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    reportDuration(event.currentTarget.duration);
  }

  function handleTimeUpdate(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    reportCurrentTime(event.currentTarget.currentTime);
  }

  function handleEnded(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    allowedPlayGenerationRef.current = null;
    reportCurrentTime(event.currentTarget.duration);
    reportPlaying(false);
  }

  function handleMediaError(event: SyntheticEvent<HTMLAudioElement>) {
    if (!eventBelongsToCurrentSource(event)) return;
    allowedPlayGenerationRef.current = null;
    reportPlaying(false);
    setPlaybackError("Unable to play this track.");
  }

  function handleSeek(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio || !source || duration <= 0) return;
    const requestedTime = Number(event.currentTarget.value);
    const nextTime = Number.isFinite(requestedTime)
      ? Math.min(duration, Math.max(0, requestedTime))
      : 0;
    audio.currentTime = nextTime;
    reportCurrentTime(nextTime);
  }

  function handleVolume(event: ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    const requestedVolume = Number(event.currentTarget.value);
    const nextVolume = Number.isFinite(requestedVolume)
      ? Math.min(1, Math.max(0, requestedVolume))
      : 0;
    if (audio) audio.volume = nextVolume;
    setVolume(nextVolume);
  }

  const transportLabel = isPlaying ? "Pause" : "Play";
  const TransportIcon = isPlaying ? Pause : Play;

  return (
    <section aria-label="Global audio player" className="dashboard-player-dock glass-panel">
      <audio
        ref={audioRef}
        data-testid="global-audio-element"
        preload="metadata"
        onLoadedMetadata={handleDuration}
        onDurationChange={handleDuration}
        onTimeUpdate={handleTimeUpdate}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
        onError={handleMediaError}
      />

      <div className="grid min-h-[var(--player-dock-height)] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 lg:grid-cols-[minmax(13rem,1fr)_auto_minmax(18rem,2fr)_minmax(10rem,1fr)] lg:gap-5 lg:px-5 lg:py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-border bg-primary-container/20 text-primary">
            <Waveform aria-hidden="true" size={20} weight="duotone" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold">
              {source?.title ?? "No track selected"}
            </p>
            {playbackError ? (
              <p role="alert" className="truncate text-xs text-destructive">
                {playbackError}
              </p>
            ) : (
              <p className="truncate text-xs text-muted-foreground">
                {source?.subtitle ?? "Choose a track from Studio when the catalog is connected."}
              </p>
            )}
          </div>
        </div>

        <Button asChild variant="glass" size="icon" className="rounded-full">
          <motion.button
            type="button"
            aria-label={transportLabel}
            disabled={!source}
            onClick={handleTransport}
            transition={shouldReduceMotion ? { duration: 0 } : springTransition}
            whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
          >
            <TransportIcon aria-hidden="true" size={18} weight="fill" />
          </motion.button>
        </Button>

        <div className="col-span-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 lg:col-span-1">
          <time className="min-w-9 font-heading text-xs text-muted-foreground">
            {formatPlaybackTime(currentTime)}
          </time>
          <label className="grid gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <span>Seek</span>
            <input
              className="audio-range"
              type="range"
              aria-label="Seek"
              min={0}
              max={duration}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              disabled={!source || duration <= 0}
              onChange={handleSeek}
            />
          </label>
          <time className="min-w-9 text-right font-heading text-xs text-muted-foreground">
            {formatPlaybackTime(duration)}
          </time>
        </div>

        <label className="col-span-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground lg:col-span-1">
          <span className="inline-flex items-center gap-1">
            <SpeakerHigh aria-hidden="true" size={16} /> Volume
          </span>
          <input
            className="audio-range"
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={handleVolume}
          />
        </label>
      </div>

      <p className="sr-only" aria-live="polite">
        {source ? `${source.title} selected.` : "No track selected."}
      </p>
    </section>
  );
}
```

Keep source synchronization keyed only by `sourceId` and `playbackUrl`, so a same-source metadata-only update does not reload the resource. If the focused race tests reveal JSDOM URL normalization differences, centralize URL comparison in one small helper and compare normalized `new URL(value, window.location.href).href` values; do not weaken stale-event assertions.

- [ ] **Step 5: Add player layout and tactile range CSS**

Append to `src/app/globals.css` without changing existing theme tokens:

```css
@layer base {
  :root {
    --player-dock-height: 10rem;
  }

  @media (min-width: 1024px) {
    :root {
      --player-dock-height: 6rem;
    }
  }
}

@layer components {
  .dashboard-player-dock {
    position: fixed;
    z-index: 40;
    right: max(1rem, env(safe-area-inset-right));
    bottom: max(1rem, env(safe-area-inset-bottom));
    left: max(1rem, env(safe-area-inset-left));
    overflow: hidden;
  }

  .dashboard-shell-main {
    padding-right: max(1rem, env(safe-area-inset-right));
    padding-bottom: calc(
      var(--player-dock-height) + max(3rem, env(safe-area-inset-bottom))
    );
    padding-left: max(1rem, env(safe-area-inset-left));
  }

  .audio-range {
    width: 100%;
    min-width: 0;
    height: 0.25rem;
    cursor: pointer;
    appearance: none;
    border-radius: 9999px;
    background: hsl(var(--border));
  }

  .audio-range:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  .audio-range:focus-visible {
    outline: 2px solid hsl(var(--ring));
    outline-offset: 4px;
  }

  .audio-range::-webkit-slider-thumb {
    width: 1rem;
    height: 1rem;
    appearance: none;
    border: 3px solid hsl(var(--card));
    border-radius: 9999px;
    background: #2e008b;
    box-shadow: 0 0 0 1px hsl(var(--border)), 0 0 12px rgba(46, 0, 139, 0.35);
  }

  .audio-range::-moz-range-thumb {
    width: 0.625rem;
    height: 0.625rem;
    border: 3px solid hsl(var(--card));
    border-radius: 9999px;
    background: #2e008b;
    box-shadow: 0 0 0 1px hsl(var(--border)), 0 0 12px rgba(46, 0, 139, 0.35);
  }

  @media (min-width: 1024px) {
    .dashboard-player-dock {
      right: max(2rem, env(safe-area-inset-right));
      bottom: max(2rem, env(safe-area-inset-bottom));
      left: calc(260px + 4rem);
    }

    .dashboard-shell-main {
      padding-right: 2rem;
      padding-bottom: calc(
        var(--player-dock-height) + max(4rem, env(safe-area-inset-bottom))
      );
      padding-left: 2rem;
    }
  }
}
```

- [ ] **Step 6: Run the player suite and focused verification**

Run:

```powershell
npm test -- src/lib/audio/format-time.test.ts src/lib/store/useAudioStore.test.ts src/components/audio/GlobalPlayer.test.tsx
npx tsc --noEmit
npm run lint
```

Expected: all tests pass, TypeScript exits zero, and lint reports no warnings/errors.

- [ ] **Step 7: Commit the global player**

```powershell
git add src/components/audio src/app/globals.css
git commit -m "feat: build persistent global audio player`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Build the responsive dashboard shell and honest home state

**Files:**
- Create: `src/components/dashboard/dashboard-sidebar.test.tsx`
- Create: `src/components/dashboard/dashboard-sidebar.tsx`
- Create: `src/components/dashboard/mobile-dashboard-header.test.tsx`
- Create: `src/components/dashboard/mobile-dashboard-header.tsx`
- Create: `src/components/dashboard/dashboard-home.test.tsx`
- Create: `src/components/dashboard/dashboard-home.tsx`
- Create: `src/components/dashboard/dashboard-shell.test.tsx`
- Create: `src/components/dashboard/dashboard-shell.tsx`

**Interfaces:**
- Consumes: `ThemeToggle`, `GlobalPlayer`, `useAudioStore`, and the existing semantic/glass system.
- Produces: `DashboardSidebar()`, `MobileDashboardHeader()`, `DashboardHome()`, and `DashboardShell({ children })`.
- Contract for route task: `DashboardShell` renders exactly one `<main data-testid="dashboard-route-content">` and places `GlobalPlayer` after it.

- [ ] **Step 1: Write sidebar and mobile-header behavior tests**

In `dashboard-sidebar.test.tsx`, render `DashboardSidebar` and assert:

```ts
expect(screen.getByRole("complementary")).toBeInTheDocument();
expect(screen.getByRole("navigation", { name: "Primary navigation" })).toBeInTheDocument();
expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
expect(screen.getByText("VEO // PRIVATE NETWORK")).toBeInTheDocument();
```

For `Studio`, `Operations`, `Content`, and `VEO AI`, assert the visible row and `Coming soon` status exist, and assert there is no link or button with that module name. Assert the sidebar has `hidden` and `lg:flex` classes and includes one theme button.

In `mobile-dashboard-header.test.tsx`, assert `VEO OS`, exact context `Dashboard`, one theme button, `lg:hidden`, and no menu/dialog trigger or future-module links.

- [ ] **Step 2: Run navigation tests and observe RED**

Run:

```powershell
npm test -- src/components/dashboard/dashboard-sidebar.test.tsx src/components/dashboard/mobile-dashboard-header.test.tsx
```

Expected: FAIL because both components do not exist.

- [ ] **Step 3: Implement the desktop sidebar**

Create `src/components/dashboard/dashboard-sidebar.tsx` as a Server Component. Import custom layout icons from `@phosphor-icons/react/dist/ssr` and render:

```tsx
import {
  CalendarBlank,
  ImagesSquare,
  Sparkle,
  SquaresFour,
  Waveform,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";

const futureDestinations = [
  { label: "Studio", Icon: Waveform },
  { label: "Operations", Icon: CalendarBlank },
  { label: "Content", Icon: ImagesSquare },
  { label: "VEO AI", Icon: Sparkle },
];

export function DashboardSidebar() {
  return (
    <aside className="glass-panel fixed inset-y-8 left-8 z-30 hidden w-[260px] flex-col p-5 lg:flex">
      <div>
        <p className="font-heading text-xl font-semibold">VEO OS</p>
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          VEO // PRIVATE NETWORK
        </p>
      </div>

      <nav aria-label="Primary navigation" className="mt-10 grid gap-2">
        <Link
          href="/"
          aria-current="page"
          className="relative flex min-h-11 items-center gap-3 rounded-2xl border border-primary-container/40 bg-primary-container px-4 text-sm font-medium text-primary-container-foreground shadow-[0_0_24px_hsl(var(--primary-container)/0.2)] outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span aria-hidden="true" className="absolute left-0 h-4 w-1 rounded-full bg-primary" />
          <SquaresFour aria-hidden="true" size={19} weight="duotone" />
          Dashboard
        </Link>

        {futureDestinations.map(({ label, Icon }) => (
          <div
            key={label}
            className="flex min-h-11 items-center gap-3 rounded-2xl px-4 text-sm text-muted-foreground"
          >
            <Icon aria-hidden="true" size={19} weight="duotone" />
            <span>{label}</span>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.08em]">
              Coming soon
            </span>
          </div>
        ))}
      </nav>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-5">
        <span className="text-xs text-muted-foreground">Interface theme</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Implement the compact mobile header**

Create `src/components/dashboard/mobile-dashboard-header.tsx`:

```tsx
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function MobileDashboardHeader() {
  return (
    <header className="ml-[max(1rem,env(safe-area-inset-left))] mr-[max(1rem,env(safe-area-inset-right))] mt-4 flex min-h-14 items-center justify-between rounded-2xl border border-border bg-card/60 px-4 backdrop-blur-xl lg:hidden">
      <div>
        <p className="font-heading text-sm font-semibold">VEO OS</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Dashboard
        </p>
      </div>
      <ThemeToggle />
    </header>
  );
}
```

- [ ] **Step 5: Run navigation tests and observe GREEN**

Run:

```powershell
npm test -- src/components/dashboard/dashboard-sidebar.test.tsx src/components/dashboard/mobile-dashboard-header.test.tsx
```

Expected: all navigation/header behaviors pass.

- [ ] **Step 6: Write the dashboard-home copy tests**

Create `src/components/dashboard/dashboard-home.test.tsx`. Render `DashboardHome` and assert the exact approved copy:

```ts
expect(screen.getByRole("heading", { name: "Studio command center" })).toBeInTheDocument();
expect(
  screen.getByText(
    "The private VEO workspace is ready. Studio catalog, operations, content, and VEO AI modules will come online in their dedicated phases.",
  ),
).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "Listening layer ready" })).toBeInTheDocument();
expect(
  screen.getByText("Tracks will appear here when the Studio catalog is connected."),
).toBeInTheDocument();
```

Assert `Studio`, `Operations`, `Content`, and `VEO AI` each have `Coming soon`. Assert the rendered text does not match `/deadline|comment|collaborator|storage|analytics|health|%/i` and contains no track-list rows, avatars, notification counts, links, or action buttons for unavailable modules.

- [ ] **Step 7: Run the dashboard-home test and observe RED**

Run:

```powershell
npm test -- src/components/dashboard/dashboard-home.test.tsx
```

Expected: FAIL because `dashboard-home.tsx` does not exist.

- [ ] **Step 8: Implement the dashboard home**

Create `src/components/dashboard/dashboard-home.tsx` using Phosphor SSR icons and this content structure:

```tsx
import {
  CalendarBlank,
  ImagesSquare,
  Sparkle,
  Waveform,
} from "@phosphor-icons/react/dist/ssr";

const modules = [
  { label: "Studio", Icon: Waveform },
  { label: "Operations", Icon: CalendarBlank },
  { label: "Content", Icon: ImagesSquare },
  { label: "VEO AI", Icon: Sparkle },
];

export function DashboardHome() {
  return (
    <section aria-labelledby="dashboard-heading" className="grid gap-6">
      <div className="glass-panel overflow-hidden p-6 sm:p-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
          Private workspace
        </p>
        <h1 id="dashboard-heading" className="mt-3 max-w-3xl font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Studio command center
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
          The private VEO workspace is ready. Studio catalog, operations, content, and VEO AI modules will come online in their dedicated phases.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {modules.map(({ label, Icon }) => (
          <article key={label} className="rounded-2xl border border-border bg-card/55 p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-container/20 text-primary">
                <Icon aria-hidden="true" size={20} weight="duotone" />
              </span>
              <h2 className="font-heading text-lg font-medium">{label}</h2>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Coming soon
              </span>
            </div>
          </article>
        ))}
      </div>

      <article className="glass-panel p-6 sm:p-8">
        <h2 className="font-heading text-xl font-medium">Listening layer ready</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tracks will appear here when the Studio catalog is connected.
        </p>
      </article>
    </section>
  );
}
```

- [ ] **Step 9: Run the home test and observe GREEN**

Run:

```powershell
npm test -- src/components/dashboard/dashboard-home.test.tsx
```

Expected: exact copy and honesty assertions pass.

- [ ] **Step 10: Write shell composition and persistence tests**

Create `src/components/dashboard/dashboard-shell.test.tsx`. Mock only `ThemeToggle` with an accessible test button so responsive shell tests do not depend on `next-themes`; use the real `GlobalPlayer`.

First test:

```ts
const { container } = render(
  <DashboardShell>
    <section>Route child</section>
  </DashboardShell>,
);

expect(container.querySelectorAll("main")).toHaveLength(1);
expect(screen.getByRole("complementary")).toBeInTheDocument();
expect(screen.getByRole("banner")).toBeInTheDocument();
expect(screen.getAllByRole("button", { name: "Toggle theme" })).toHaveLength(2);
expect(screen.getByTestId("dashboard-route-content")).toHaveClass("dashboard-shell-main");
expect(screen.getAllByRole("region", { name: "Global audio player" })).toHaveLength(1);
```

Assert the desktop theme button is inside an ancestor with `hidden lg:flex`; the mobile theme button is inside an ancestor with `lg:hidden`, so exactly one is visible/reachable at each CSS viewport. Assert the player section follows `<main>` in DOM order and is not contained by `main`.

Persistence test:

```ts
const view = render(
  <DashboardShell>
    <section>First route</section>
  </DashboardShell>,
);

act(() => {
  useAudioStore.getState().selectSource({
    sourceId: "version-a",
    trackId: "track-a",
    title: "Signal One",
    playbackUrl: "/audio/signal-one.mp3",
  });
});

act(() => {
  useAudioStore.getState().reportDuration(120);
  useAudioStore.getState().reportCurrentTime(18);
  useAudioStore.getState().reportPlaying(true);
});

const audio = screen.getByTestId("global-audio-element");
view.rerender(
  <DashboardShell>
    <section>Second route</section>
  </DashboardShell>,
);

expect(screen.getByText("Second route")).toBeInTheDocument();
expect(screen.getByTestId("global-audio-element")).toBe(audio);
expect(useAudioStore.getState()).toMatchObject({
  source: expect.objectContaining({ sourceId: "version-a" }),
  currentTime: 18,
  duration: 120,
  isPlaying: true,
});
```

Install the same minimal media mocks used by `GlobalPlayer.test.tsx`, import `resetAudioStore`, and call it before every shell test.

- [ ] **Step 11: Run the shell test and observe RED**

Run:

```powershell
npm test -- src/components/dashboard/dashboard-shell.test.tsx
```

Expected: FAIL because `dashboard-shell.tsx` does not exist.

- [ ] **Step 12: Implement the dashboard shell**

Create `src/components/dashboard/dashboard-shell.tsx`:

```tsx
import { GlobalPlayer } from "@/components/audio/GlobalPlayer";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { MobileDashboardHeader } from "@/components/dashboard/mobile-dashboard-header";

export type DashboardShellProps = {
  children: React.ReactNode;
};

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="min-h-screen lg:pl-[292px]">
      <DashboardSidebar />
      <MobileDashboardHeader />
      <main
        data-testid="dashboard-route-content"
        className="dashboard-shell-main mx-auto w-full max-w-6xl pt-6 sm:pt-8 lg:pt-8"
      >
        {children}
      </main>
      <GlobalPlayer />
    </div>
  );
}
```

- [ ] **Step 13: Run all dashboard component tests and focused checks**

Run:

```powershell
npm test -- src/components/dashboard src/components/audio/GlobalPlayer.test.tsx
npx tsc --noEmit
npm run lint
```

Expected: all tests pass with zero type/lint failures.

- [ ] **Step 14: Commit the dashboard presentation**

```powershell
git add src/components/dashboard
git commit -m "feat: build VEO OS dashboard shell`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Protect the dashboard route and replace the starter root

**Files:**
- Delete: `src/app/page.tsx`
- Create: `src/app/(dashboard)/layout.test.tsx`
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/page.test.tsx`
- Create: `src/app/(dashboard)/page.tsx`

**Interfaces:**
- Consumes: async server `createClient()`, Next `redirect()`, `DashboardShell`, and `DashboardHome`.
- Produces: protected `/` route family and shared layout persistence boundary.
- Preserves: refresh-only `src/middleware.ts` and `src/lib/supabase/middleware.ts` unchanged.

- [ ] **Step 1: Write authorization-boundary tests with a throwing redirect mock**

Create `src/app/(dashboard)/layout.test.tsx` using hoisted mocks:

```ts
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/components/dashboard/dashboard-shell", () => ({
  DashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-shell">
      <main>{children}</main>
      <section aria-label="Global audio player" />
    </div>
  ),
}));
```

The shell itself is covered with the real player in Task 3; this route test isolates authorization and avoids duplicating media/browser concerns. Default `createClient` to resolve a client whose `auth.getUser` is `mocks.getUser`. Cover:

1. Missing user: `getUser` resolves `{ data: { user: null }, error: null }`; `DashboardLayout({ children })` rejects with `NEXT_REDIRECT:/login`, and child rendering is never reached.
2. Returned provider error: resolve `{ data: { user: null }, error: new Error("provider-secret-detail") }`; redirect occurs, returned/provider text is not logged or rendered, and the error does not escape.
3. Thrown lookup/network error: reject `getUser` with `new Error("network-provider-detail")`; redirect still escapes as `NEXT_REDIRECT:/login`, proving the redirect was outside the catch.
4. Missing configuration: reject `createClient` with `new Error("Supabase environment is not configured.")`; the same error escapes and `redirect` is not called.
5. Authenticated user: resolve `{ data: { user: { id: "veo-producer" } }, error: null }`; render the returned JSX and assert the child plus global-player region are present.

Use a child probe component whose render spy proves redirecting branches do not continue into shell/children.

- [ ] **Step 2: Run the layout test and observe RED**

Run:

```powershell
npm test -- "src/app/(dashboard)/layout.test.tsx"
```

Expected: FAIL because `layout.tsx` does not exist.

- [ ] **Step 3: Implement the precise authorization control flow**

Create `src/app/(dashboard)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  let isAuthenticated = false;

  try {
    const result = await supabase.auth.getUser();
    isAuthenticated = !result.error && Boolean(result.data.user);
  } catch {
    isAuthenticated = false;
  }

  if (!isAuthenticated) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
```

Do not add logging, middleware authorization, table queries, or a catch around `redirect()`.

- [ ] **Step 4: Run the authorization tests and observe GREEN**

Run:

```powershell
npm test -- "src/app/(dashboard)/layout.test.tsx"
```

Expected: all five authorization paths pass.

- [ ] **Step 5: Write the root-page composition test**

Create `src/app/(dashboard)/page.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders the honest dashboard home without creating another main landmark", () => {
    const { container } = render(<DashboardPage />);

    expect(
      screen.getByRole("heading", { name: "Studio command center" }),
    ).toBeInTheDocument();
    expect(container.querySelector("main")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the page test and observe RED**

Run:

```powershell
npm test -- "src/app/(dashboard)/page.test.tsx"
```

Expected: FAIL because `page.tsx` does not exist.

- [ ] **Step 7: Create the dashboard page and remove the conflicting root page**

Create `src/app/(dashboard)/page.tsx`:

```tsx
import { DashboardHome } from "@/components/dashboard/dashboard-home";

export default function DashboardPage() {
  return <DashboardHome />;
}
```

Delete `src/app/page.tsx` completely. Do not leave a forwarding route; `(dashboard)/page.tsx` must be the sole owner of `/`.

- [ ] **Step 8: Run route, auth-regression, and full automated tests**

Run:

```powershell
npm test -- "src/app/(dashboard)" "src/app/(auth)/login/page.test.tsx" src/middleware-entrypoint.test.ts src/lib/supabase/middleware.test.ts
npm test
npx tsc --noEmit
npm run lint
```

Expected: all tests pass; `/login` behavior and refresh-only middleware tests remain green.

- [ ] **Step 9: Build and confirm route ownership**

Run:

```powershell
npm run build
```

Expected: build succeeds; `/` and `/login` appear as dynamic server routes; no route conflict references `src/app/page.tsx`.

- [ ] **Step 10: Commit the protected dashboard route**

```powershell
git add "src/app/(dashboard)" src/app/page.tsx
git commit -m "feat: protect VEO OS dashboard route`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Run real-browser verification and final Phase 2 gates

**Files:**
- Create temporarily, then delete: `src/app/__phase-2-preview/page.tsx`
- Review: all Phase 2 files.
- Commit: `docs/superpowers/plans/2026-08-11-veo-os-phase-2-dashboard-audio.md` if not already committed.

**Interfaces:**
- Consumes: completed protected dashboard, shell, store, and player.
- Produces: verified Phase 2 delivery on `origin/main` with no auth bypass and no Phase 3–5 scope.

- [ ] **Step 1: Verify unauthenticated server routing in the real app**

Invoke the project `run` skill and start the development server. Navigate to `/` without a valid team session.

Expected:

- The server redirects to `/login` before protected dashboard content is visible.
- `/login` remains usable and dynamic.
- No Supabase provider details, cookies, tokens, or environment values appear in the page or console.

Do not use or record a valid team password for automated verification.

- [ ] **Step 2: Create the temporary presentational preview route**

Create `src/app/__phase-2-preview/page.tsx` with no auth imports, flags, middleware changes, or helper bypasses:

```tsx
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function Phase2PreviewPage() {
  return (
    <DashboardShell>
      <DashboardHome />
    </DashboardShell>
  );
}
```

This route is for visual inspection only and must never be committed.

- [ ] **Step 3: Verify desktop presentation at `1440x1000`**

Open `/__phase-2-preview` at `1440x1000` and verify:

- Dark theme starts on a pure-black ambient field with restrained purple illumination.
- The fixed translucent sidebar is `260px` wide with approximately `32px` outer safe area and `32px` workspace gutter.
- `Dashboard` is the only active link; `Studio`, `Operations`, `Content`, and `VEO AI` are noninteractive and marked `Coming soon`.
- Only the desktop theme toggle is visible and keyboard reachable.
- Main content remains bounded/readable on the wide viewport.
- The dock floats above `max(2rem, env(safe-area-inset-bottom))`, starts after the sidebar/gutter, and does not overlap main content.
- The idle player shows exact honest copy, Play/Seek are disabled, Volume is operable, and no remote media request occurs.
- Keyboard order reaches sidebar navigation/theme, main content, then player controls.
- Focus rings are visible; there is no console warning/error introduced by Phase 2.

- [ ] **Step 4: Verify mobile presentation at `390x844`**

Resize to `390x844` and verify:

- No horizontal overflow exists.
- The desktop sidebar is absent and the compact mobile header appears first.
- Only the mobile theme toggle is visible and keyboard reachable; no dead menu or sheet exists.
- Main cards stack in one column with `16px` safe margins.
- The dock uses three readable rows: identity/transport, seek/times, and volume.
- Icon targets remain at least `40px`; slider handles and focus indicators remain visible.
- The dock sits above `max(1rem, env(safe-area-inset-bottom))` and does not cover content.
- Volume remains operable while idle.

- [ ] **Step 5: Verify both themes and reduced motion**

At desktop and mobile sizes:

- Toggle to light theme and confirm the `#FAFAFA` ambient field, readable glass hierarchy, and WCAG-AA functional contrast.
- Reload and confirm the selected theme persists through the existing provider.
- Emulate `prefers-reduced-motion: reduce`; transport press interaction must not scale or travel, while state changes remain immediate.
- Confirm there is no continuous idle animation or false equalizer/waveform motion.

- [ ] **Step 6: Remove the preview route and prove it is absent**

Delete `src/app/__phase-2-preview/page.tsx` and remove the now-empty directory.

Run:

```powershell
if (Test-Path "src/app/__phase-2-preview") { throw "Phase 2 preview route still exists." }
$trackedPreview = git ls-files | Select-String -SimpleMatch "__phase-2-preview"
if ($trackedPreview) { throw "Preview route is tracked." }
```

Expected: the directory is absent and no tracked preview path is reported.

- [ ] **Step 7: Run the final automated, type, lint, and build gates**

Run:

```powershell
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Expected: all tests pass; TypeScript and lint exit zero; production build succeeds; `/` and `/login` remain dynamic.

- [ ] **Step 8: Verify middleware registration after the final build**

Run:

```powershell
node -e "const m=require('./.next/server/middleware-manifest.json');const e=m.middleware['/'];if(!e||e.name!=='src/middleware')process.exit(1);console.log(JSON.stringify({key:'/',name:e.name,matchers:e.matchers.map(x=>x.originalSource)}))"
```

Expected: output reports middleware key `/`, name `src/middleware`, and the committed matcher; no middleware authorization redirect was added.

- [ ] **Step 9: Verify scope, preview absence, and secret safety**

Confirm these Phase 3–5 paths remain absent:

```text
src/types/database.types.ts
src/components/audio/WaveformDisplay.tsx
src/components/upload/R2Uploader.tsx
src/components/chat/VEO_AI_Chat.tsx
src/app/(dashboard)/studio
src/app/(dashboard)/operations
src/app/(dashboard)/content
```

Run:

```powershell
git check-ignore .env.local
$staged = git diff --cached --name-only
$patterns = @('OPENAI_API_KEY\s*=','SUPABASE_SERVICE_ROLE_KEY\s*=','NEXT_PUBLIC_SUPABASE_ANON_KEY\s*=')
foreach ($pattern in $patterns) {
  $count = 0
  foreach ($file in $staged) {
    if (Test-Path $file) {
      $count += ([regex]::Matches([IO.File]::ReadAllText((Resolve-Path $file)), $pattern)).Count
    }
  }
  Write-Output "$($pattern) count: $count"
  if ($count -ne 0) { throw "Secret assignment found in staged files." }
}
```

Expected: `.env.local` is ignored and every staged assignment count is `0`; no values are printed.

- [ ] **Step 10: Run final Git integrity checks**

Run:

```powershell
git diff --check
git diff --cached --check
git status --short
git log --oneline --decorate -12
```

Expected: no whitespace errors; only the implementation plan may remain uncommitted; all Phase 2 implementation commits are present.

- [ ] **Step 11: Commit the implementation plan if needed**

```powershell
git add docs/superpowers/plans/2026-08-11-veo-os-phase-2-dashboard-audio.md
git commit -m "docs: add VEO OS phase 2 implementation plan`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

If the plan was committed earlier, skip this command instead of creating an empty commit.

- [ ] **Step 12: Push Phase 2 without force**

```powershell
git push origin main
```

Expected: push succeeds without force.

- [ ] **Step 13: Verify clean local/remote completion and stop**

Run:

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
```

Expected: clean `main`, local and remote SHAs match, no preview route or Phase 3–5 files exist, and Phase 2 acceptance criteria are satisfied. Stop and wait for explicit authorization before beginning Phase 3.

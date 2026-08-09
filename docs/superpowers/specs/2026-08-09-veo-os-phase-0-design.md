# VEO OS Phase 0 Design

**Date:** 2026-08-09  
**Status:** Approved design; pending written specification review  
**Scope:** Repository bootstrap, dependency foundation, durable architecture and design documentation, verification, commit, and push only

## 1. Objective

Bootstrap the empty `hektor808/StudioOS` repository as a pinned Next.js 14 TypeScript application using the App Router, Tailwind CSS, and a `src/` directory. Establish the technical and visual authority documents that every later phase must read before implementation.

Phase 0 must not implement Supabase authentication, dashboard features, audio playback, waveform comments, uploads, operations, moodboards, or VEO AI behavior.

## 2. Authority Documents

Phase 0 creates two root-level authority files:

1. `VEO_OS_MASTER_PLAN.md`
   - Contains the user-supplied master technical architecture exactly as provided.
   - Defines the required App Router folder structure, Supabase schema, feature architecture, and phase boundaries.

2. `VEO_OS_DESIGN_MANIFESTO.md`
   - Contains the approved VEO OS visual system and product design constraints.
   - Defines theme tokens, glassmorphism, typography, iconography, motion, spatial layout, depth, shapes, and component styling.
   - Records that the supplied Stitch HTML is visual reference material only and must never be copied directly into production components.

Every later phase must begin by reading both files. Where a generated visual reference conflicts with the explicit manifesto, the manifesto takes precedence. Where either design document conflicts with an explicit later user instruction, the later user instruction takes precedence.

## 3. Repository Bootstrap

The remote repository is empty, so the application can be scaffolded directly in the cloned repository root without copying or overwriting existing project files.

Use `create-next-app` pinned to the latest available Next.js 14.x toolchain with:

- TypeScript
- ESLint
- Tailwind CSS
- App Router
- `src/` directory
- npm
- Standard import alias `@/*`

The generated starter page is temporary scaffold content, not an approved VEO OS product design. No effort should be spent designing feature screens during Phase 0.

## 4. Dependency Foundation

Install the requested platform dependencies:

- `@supabase/supabase-js`
- `@supabase/ssr`
- `zustand`
- `wavesurfer.js`
- `@uppy/core`
- `@uppy/aws-s3`
- `@uppy/react`
- `@dnd-kit/core`
- `lucide-react`
- `date-fns`
- `react-hook-form`
- `zod`
- `@hookform/resolvers`
- `openai`
- `langchain`

Install the approved design-system dependencies:

- `@phosphor-icons/react` for custom VEO OS interface iconography
- `framer-motion` for spring-based interaction and layout motion

`lucide-react` remains available only where Shadcn-generated internals require it. Custom product layouts should use Phosphor icons.

`next/font/google` is provided by Next.js and needs no separate package. Future UI work will use Space Grotesk for display typography and Inter for body/interface typography. Inter is the approved Next.js 14-compatible fallback when Geist Sans is unavailable.

## 5. Shadcn Initialization

Attempt the requested legacy command first:

```text
npx shadcn-ui@latest init
```

If the legacy package refuses to run or redirects to its maintained replacement, use:

```text
npx shadcn@latest init
```

Initialize Shadcn for the App Router, TypeScript, Tailwind, CSS variables, and the `@/*` alias. Choose neutral base defaults because the VEO OS semantic tokens will be applied deliberately in later UI phases.

The command must run non-interactively or with deterministic selections. It must not add feature components during Phase 0.

## 6. VEO OS Design Authority

The design manifesto establishes these mandatory future constraints:

### Theme and color

- Accent/brand anchor: PANTONE 2735 C, `#2E008B`.
- Dark mode is the default.
- Dark background: pure black `#000000` with restrained corner or ambient radial glows derived from `#2E008B`.
- Light background: off-white `#FAFAFA`.
- Both modes use standard Tailwind/Shadcn semantic CSS variables rather than hard-coded component colors.
- Functional state colors should appear primarily as thin borders, indicators, and controlled glows instead of large opaque blocks.

### Glass structure

- Main cards, sidebars, docks, and panels use frosted glass rather than solid container backgrounds.
- Canonical dark treatment starts from `bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl` and may be tuned by component level.
- Parent panels use 24px radii (`rounded-3xl`); interactive controls and smaller modules use 16px radii (`rounded-2xl`); compact buttons may use `rounded-[10px]`, while icon controls, toggles, and status badges may use `rounded-full`.
- Depth comes from blur, optical density, edge highlights, and restrained purple radiance rather than conventional heavy shadows.

### Typography

- Display and headings: Space Grotesk.
- Body and UI: Inter under the pinned Next.js 14 foundation, with Geist Sans allowed later if confirmed available and compatible.
- Prominent timecodes, BPM, meters, and production data may use Space Grotesk.
- Small labels use stronger weight and increased tracking for readability on glass.

### Icons

- Custom VEO OS layouts use Phosphor Icons in Regular, Light, Thin, or Duotone weights according to hierarchy.
- Font Awesome and Material Symbols are not part of the production design system.
- Lucide is tolerated only inside Shadcn internals where replacement would create unnecessary maintenance.

### Motion

- Framer Motion spring physics are required for interactive states, overlays, menus, page transitions, and active-state changes.
- The baseline interaction spring is `{ type: "spring", stiffness: 400, damping: 30 }`.
- Buttons use a tactile press state equivalent to `whileTap={{ scale: 0.95 }}`.
- Generic linear/ease transitions are not used as the primary interaction model.
- Future implementation must honor `prefers-reduced-motion` and avoid decorative movement that interferes with long studio sessions.

### Spatial layout

- Desktop uses a 260px translucent sidebar and a fluid central workspace.
- Desktop safe margins are 32px; mobile margins are 16px.
- Internal spacing follows a 4px baseline, with 16px common internal padding and 20px card gaps.
- The interface should feel windowed, layered, and spatial, combining premium macOS restraint with visionOS-like depth without imitating either product literally.

### Reference translation

The supplied Stitch HTML demonstrates visual hierarchy, glass density, waveforms, a floating player dock, Kanban layouts, operations planning, dashboard composition, moodboard masonry, and an AI side panel. It must not be pasted into the application. Specifically, production code must not inherit:

- CDN Tailwind scripts
- Inline style blocks
- Material Symbols
- Generated random waveform scripts
- Remote placeholder images without explicit approval
- Monolithic page markup
- Generic CSS transitions that conflict with the spring-motion rule

Future phases must translate the intent into typed, reusable React components, Tailwind utilities, Shadcn primitives, semantic tokens, accessible controls, and Framer Motion interactions.

## 7. Error Handling and Safety

- Inspect the target before writing or overwriting. The cloned repository is currently empty except for Git metadata.
- Do not create, request, or commit secrets.
- If package compatibility issues arise, preserve the architectural intent and report substitutions explicitly.
- If Shadcn's legacy CLI fails, use the approved maintained CLI fallback.
- If a dependency install or generated configuration fails, resolve only bootstrap/configuration issues within Phase 0 scope.
- If push authentication or branch protection blocks delivery, keep the verified local commit and report the exact blocker.

## 8. Verification

Before committing:

1. Confirm the application reports Next.js 14.x.
2. Confirm TypeScript, Tailwind, App Router, `src/`, ESLint, and alias configuration exist.
3. Confirm all approved runtime dependencies are recorded in `package.json`.
4. Confirm Shadcn initialization created valid configuration.
5. Confirm both root authority documents exist and contain no placeholders.
6. Run the scaffold's lint command if available.
7. Run a production build.
8. Review `git diff` and `git status` for unexpected files, secrets, or Phase 1 work.

## 9. Delivery

Commit all approved Phase 0 files with:

```text
chore: init VEO OS and Master Plan
```

Push the commit to `origin main`. Do not begin Phase 1.

After a successful push, stop and ask:

> Please configure your .env.local file with Supabase/OpenAI keys, and type 'PROCEED TO PHASE 1' when ready.

## 10. Success Criteria

Phase 0 is complete only when:

- The repository contains a working, verified Next.js 14 scaffold.
- All approved technical and visual dependencies are installed.
- Shadcn is initialized.
- `VEO_OS_MASTER_PLAN.md` contains the exact supplied master architecture.
- `VEO_OS_DESIGN_MANIFESTO.md` durably records the approved design authority.
- No Phase 1 or later feature code exists.
- The Phase 0 commit is pushed to `origin main`, or an exact external blocker is reported with the local commit preserved.

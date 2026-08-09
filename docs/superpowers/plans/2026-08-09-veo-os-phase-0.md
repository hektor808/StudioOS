# VEO OS Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and push a verified Next.js 14 VEO OS foundation with all approved dependencies, Shadcn configuration, and durable technical/design authority documents while implementing no Phase 1 features.

**Architecture:** Scaffold directly into the already-cloned empty Git repository while preserving `docs/` and `.git/`. Use the generated Next.js 14 App Router structure as the runtime foundation, then add only dependencies, Shadcn configuration, and root authority documents. Validate the scaffold with package inspection, lint, build, scope checks, and Git review before committing and pushing.

**Tech Stack:** Next.js 14, React 18, TypeScript, App Router, Tailwind CSS, Shadcn UI, Supabase SDK/SSR, Zustand, wavesurfer.js, Uppy, dnd-kit, React Hook Form, Zod, OpenAI, LangChain, Phosphor Icons, Framer Motion, npm

## Global Constraints

- Work only in `C:\Users\pc\Documents\Code Projects\StudioOS`.
- Pin the application to Next.js 14.x; do not accept a newer major version.
- Use TypeScript, ESLint, Tailwind CSS, App Router, `src/`, npm, and alias `@/*`.
- Install `@dnd-kit/core`, not the ambiguous `dnd-kit` package.
- Try `shadcn-ui@latest` first and use `shadcn@latest` only as the approved fallback.
- Keep `VEO_OS_MASTER_PLAN.md` identical to the supplied master-plan content.
- Store the approved visual authority in `VEO_OS_DESIGN_MANIFESTO.md`.
- Future custom UI uses Phosphor Icons; Lucide remains for Shadcn internals only.
- Future interactions use Framer Motion springs with baseline `{ type: "spring", stiffness: 400, damping: 30 }` and tactile `whileTap={{ scale: 0.95 }}` button behavior.
- Dark mode defaults to `#000000` with restrained `#2E008B` radial glows; light mode uses `#FAFAFA`.
- Do not implement Supabase clients, login, dashboard layouts, audio state, waveform UI, upload flows, moodboards, operations, or AI features.
- Do not create or commit `.env.local`, credentials, API keys, or generated secrets.
- Commit the completed Phase 0 scaffold with `chore: init VEO OS and Master Plan` and push `origin main`.

---

## File Map

- Create/modify generated Next.js scaffold files: `package.json`, `package-lock.json`, `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, and generated public assets.
- Create through Shadcn: `components.json`, `src/lib/utils.ts`, and any configuration updates made by the initializer.
- Create: `VEO_OS_MASTER_PLAN.md` — exact technical architecture supplied by the user.
- Create: `VEO_OS_DESIGN_MANIFESTO.md` — approved cross-phase design authority.
- Preserve: `docs/superpowers/specs/2026-08-09-veo-os-phase-0-design.md`.
- Preserve/create: `docs/superpowers/plans/2026-08-09-veo-os-phase-0.md`.

### Task 1: Scaffold the pinned Next.js 14 application

**Files:**
- Create/modify: generated Next.js root configuration and `src/app/*` scaffold files
- Preserve: `.git/**`, `docs/**`

**Interfaces:**
- Consumes: empty cloned repository with approved documentation
- Produces: npm-installable Next.js 14 App Router scaffold using alias `@/*`

- [ ] **Step 1: Confirm the target has no conflicting application scaffold**

Run:

```powershell
git status --short --branch
Get-ChildItem -Force
```

Expected: only committed `docs/` and Git metadata; no existing `package.json`, `src/`, `app/`, or `pages/`.

- [ ] **Step 2: Scaffold in the repository root**

Run from the repository root:

```powershell
npx create-next-app@14.2.35 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Expected: generated project completes successfully without replacing `docs/`.

- [ ] **Step 3: Verify framework version and generated structure**

Run:

```powershell
node -p "require('./package.json').dependencies.next"
npm ls next --depth=0
```

Expected: resolved Next.js major version is `14` and `src/app/layout.tsx`, `src/app/page.tsx`, and `src/app/globals.css` exist.

### Task 2: Install the approved dependency foundation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: working Next.js 14 npm scaffold
- Produces: complete Phase 0 dependency graph for later phases

- [ ] **Step 1: Install platform dependencies**

Run:

```powershell
npm install @supabase/supabase-js @supabase/ssr zustand wavesurfer.js @uppy/core @uppy/aws-s3 @uppy/react @dnd-kit/core lucide-react date-fns react-hook-form zod @hookform/resolvers openai langchain
```

Expected: npm exits successfully and updates both package files.

- [ ] **Step 2: Install VEO OS design dependencies**

Run:

```powershell
npm install @phosphor-icons/react framer-motion
```

Expected: both packages appear under `dependencies`.

- [ ] **Step 3: Verify every approved dependency is declared**

Run a Node assertion script that loads `package.json` and fails if any of these names are missing:

```text
@supabase/supabase-js
@supabase/ssr
zustand
wavesurfer.js
@uppy/core
@uppy/aws-s3
@uppy/react
@dnd-kit/core
lucide-react
date-fns
react-hook-form
zod
@hookform/resolvers
openai
langchain
@phosphor-icons/react
framer-motion
```

Expected: script prints a success message and exits zero.

### Task 3: Initialize Shadcn UI

**Files:**
- Create: `components.json`
- Create: `src/lib/utils.ts`
- Modify: Tailwind/global CSS configuration as performed by Shadcn

**Interfaces:**
- Consumes: Next.js 14 Tailwind App Router scaffold
- Produces: Shadcn-ready project using CSS variables and alias `@/*`

- [ ] **Step 1: Attempt the requested legacy initializer**

Run:

```powershell
npx shadcn-ui@latest init -d
```

Expected: initialization succeeds, or the CLI explicitly reports that the maintained `shadcn` command must be used.

- [ ] **Step 2: Use the approved fallback only if required**

Run only if Step 1 did not initialize the project:

```powershell
npx shadcn@latest init -d
```

Expected: `components.json` and `src/lib/utils.ts` exist and CSS variables are enabled.

- [ ] **Step 3: Validate Shadcn configuration**

Confirm `components.json` is valid JSON and contains aliases compatible with `@/components`, `@/lib`, and `@/components/ui`.

Expected: JSON parses successfully and no feature components have been added.

### Task 4: Create the technical authority document

**Files:**
- Create: `VEO_OS_MASTER_PLAN.md`

**Interfaces:**
- Consumes: exact master-plan content from the approved user request
- Produces: immutable technical/phase authority for every later phase

- [ ] **Step 1: Write `VEO_OS_MASTER_PLAN.md` exactly**

The file must start with:

```markdown
# VEO OS - MASTER TECHNICAL ARCHITECTURE
```

It must contain the exact approved folder structure, Supabase schema, Audio Engine, Direct-to-R2 Upload, External Secure Listening, and VEO AI RAG sections, and end with:

```markdown
### FEATURE D: VEO AI (RAG)

* **Implementation:** Supabase `pgvector` stores embeddings of actions and comments. OpenAI API generates responses based on this context.
```

Do not include the conversational `BEGIN/END MASTER PLAN CONTENT` markers.

- [ ] **Step 2: Validate required master-plan anchors**

Search for all exact anchors:

```text
/src
GlobalPlayer.tsx
useAudioStore.ts
track_versions
@uppy/aws-s3
Signed URLs
pgvector
```

Expected: every anchor occurs and the file contains no `TODO`, `TBD`, or placeholder text.

### Task 5: Create the VEO OS design authority document

**Files:**
- Create: `VEO_OS_DESIGN_MANIFESTO.md`

**Interfaces:**
- Consumes: approved Design Manifesto and `Design.md` tokens from the user
- Produces: mandatory reusable visual/motion constraints for every later phase

- [ ] **Step 1: Write the design manifesto**

The document must include these exact authority statements and values:

- Accent: PANTONE 2735 C (`#2E008B`).
- Dark default base: `#000000`; light base: `#FAFAFA`.
- Dark canonical glass utility: `bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl`.
- Parent radius: `rounded-3xl`; smaller module radius: `rounded-2xl`; buttons: `rounded-[10px]` or `rounded-full`.
- Display font: Space Grotesk through `next/font/google`.
- Body font: Inter through `next/font/google`, with Geist Sans allowed only if verified compatible.
- Custom icons: `@phosphor-icons/react`; Lucide only for Shadcn internals.
- Motion: Framer Motion springs; baseline `{ type: "spring", stiffness: 400, damping: 30 }`; button press `whileTap={{ scale: 0.95 }}`.
- Desktop sidebar: 260px; desktop margin: 32px; mobile margin: 16px; card gap: 20px; baseline spacing unit: 4px.
- Main surfaces must not use opaque SaaS-style container backgrounds.
- The Stitch HTML is non-executable visual reference only and must not be copied, pasted, imported, or translated line-for-line.
- Production implementation must use typed reusable React components, semantic Tailwind/Shadcn variables, accessible controls, responsive layouts, reduced-motion support, Phosphor icons, and Framer Motion.
- Every phase must read both root authority files before work begins.

Include the approved dark token palette and typography scale from the user-provided `Design.md`, plus light-mode semantic counterparts that preserve contrast on `#FAFAFA`.

- [ ] **Step 2: Validate mandatory manifesto anchors**

Search for:

```text
#2E008B
#000000
#FAFAFA
Space Grotesk
Inter
@phosphor-icons/react
framer-motion
stiffness: 400
260px
Stitch
prefers-reduced-motion
```

Expected: every anchor occurs and the document contains no raw Stitch HTML, CDN scripts, Material Symbols, `TODO`, `TBD`, or placeholders.

### Task 6: Verify, commit, and push Phase 0

**Files:**
- Review: all tracked and untracked project files
- Commit: scaffold, dependencies, Shadcn config, authority documents, approved docs

**Interfaces:**
- Consumes: completed Phase 0 working tree
- Produces: verified `origin/main` Phase 0 foundation

- [ ] **Step 1: Run lint**

Run:

```powershell
npm run lint
```

Expected: exit code 0.

- [ ] **Step 2: Run production build**

Run:

```powershell
npm run build
```

Expected: exit code 0 with successful static compilation of the scaffold.

- [ ] **Step 3: Verify scope and secrets**

Confirm none of these Phase 1 paths exist:

```text
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/app/(auth)/login/page.tsx
```

Confirm `.env.local` is absent and no staged file contains common secret assignments such as `OPENAI_API_KEY=` or `SUPABASE_SERVICE_ROLE_KEY=`.

Expected: no Phase 1 implementation and no secrets.

- [ ] **Step 4: Review Git changes**

Run:

```powershell
git status --short
git diff --stat
git diff --check
```

Expected: only approved Phase 0 files; no whitespace errors.

- [ ] **Step 5: Commit the Phase 0 scaffold**

Stage all approved files and commit with:

```text
chore: init VEO OS and Master Plan

Co-Authored-By: Claude <noreply@anthropic.com>
```

Expected: commit succeeds. Existing documentation commits remain in history.

- [ ] **Step 6: Push to GitHub**

Run:

```powershell
git push -u origin main
```

Expected: `origin/main` points to the completed Phase 0 commit.

- [ ] **Step 7: Stop at the phase boundary**

Do not create `.env.local` or begin authentication work. Return exactly:

```text
Please configure your .env.local file with Supabase/OpenAI keys, and type 'PROCEED TO PHASE 1' when ready.
```

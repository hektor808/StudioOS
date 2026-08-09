# VEO OS Phase 1 Authentication Design

## Purpose

Phase 1 establishes secure Supabase SSR authentication and delivers the first production VEO OS screen: an invite-only login portal for the five-person internal music-production team.

This phase follows both root authorities:

1. `VEO_OS_MASTER_PLAN.md`
2. `VEO_OS_DESIGN_MANIFESTO.md`

It implements only the Supabase client foundation, SSR session refresh, and login experience. Dashboard, audio, studio, upload, content, operations, database-schema, and AI work remain outside Phase 1.

## Approved Decisions

- Authentication method: invite-only email and password.
- Accounts are provisioned in Supabase; the application exposes no public registration flow.
- Implementation shape: hybrid server-first authentication.
- Supabase sign-in runs in a Server Action.
- React Hook Form and Zod provide immediate client validation; the Server Action validates the same input again.
- Supabase sessions are stored in cookies through `@supabase/ssr`.
- Middleware refreshes sessions before Server Components execute.
- Dark mode is the default, with a class-based light theme available.
- The login portal must use the VEO OS glass, typography, iconography, and spring-motion language.

## Scope

### In scope

- Browser Supabase client.
- Server Supabase client using Next.js cookies.
- Middleware session refresh helper and root middleware entry point.
- Invite-only `/login` route.
- Shared email/password validation schema.
- Server Action for email/password sign-in.
- Accessible React Hook Form login component.
- Class-based theme provider and theme control.
- VEO OS global ambient background and authentication-specific styling.
- Focused automated tests for validation and login-form behavior.
- Lint, test, production-build, and browser smoke verification.

### Out of scope

- Public sign-up.
- Password reset.
- OAuth providers.
- Magic links.
- Multi-factor authentication.
- Dashboard layout or dashboard content.
- Sidebar or global audio player.
- Zustand audio state.
- Supabase database tables, migrations, RLS policies, or generated database types.
- Track, waveform, comment, upload, operations, moodboard, external-listening, or VEO AI features.
- Phase 2 route composition.

## Architecture

### Environment contract

Phase 1 consumes only these public Supabase values from `.env.local`:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

`OPENAI_API_KEY` remains unused in Phase 1. No service-role key is read by browser or server authentication code.

Client factories must throw a concise configuration error when a required Supabase value is missing. Secret values must never appear in logs, rendered errors, tests, commits, or build output.

### Browser client

`src/lib/supabase/client.ts` exports `createClient()`, which uses `createBrowserClient` from `@supabase/ssr` with the configured public URL and anonymous key.

The browser client exists for future authenticated client interactions and for compliance with the master folder structure. Password submission in Phase 1 does not call it directly; sign-in remains server-first.

### Server client

`src/lib/supabase/server.ts` exports `createClient()`, which creates a request-scoped `createServerClient` using the Next.js App Router cookie store.

The cookie adapter:

- Reads all request cookies with `getAll()`.
- Applies all cookies supplied by Supabase with `setAll()` when the current execution context permits mutation.
- Tolerates cookie writes attempted from a read-only Server Component because middleware owns routine token refresh.

The server client is used by the login page and sign-in Server Action.

### Session middleware

`src/lib/supabase/middleware.ts` exports an `updateSession(request)` helper. Root `middleware.ts` delegates to it.

The helper:

1. Creates an initial `NextResponse` that preserves the incoming request headers.
2. Creates a Supabase server client backed by request and response cookies.
3. Validates or refreshes the current authentication state through Supabase.
4. Writes refreshed cookies to both the request context and outgoing response.
5. Returns the exact response containing the refreshed cookies.

The matcher excludes Next.js static files, image optimization, favicon requests, and common static image formats.

Phase 1 middleware refreshes sessions but does not yet impose dashboard-route authorization rules. Route protection will be attached to the dashboard composition in Phase 2, where the protected route boundary exists.

## Login Feature

### Route structure

```text
src/app/(auth)/login/
  actions.ts
  login-form.tsx
  page.tsx
```

The route group does not affect the public URL; the screen is served at `/login`.

### Validation

A shared module defines the login schema:

- `email`: trimmed, required, valid email address.
- `password`: required and non-empty.

The client uses `zodResolver` with React Hook Form. The Server Action parses the submitted values through the same schema before calling Supabase.

Validation messages are specific and accessible. Authentication failures use the generic message:

```text
Unable to sign in with those credentials.
```

This avoids exposing whether an email address belongs to a team member.

### Server Action

The sign-in Server Action accepts the validated email and password and returns a discriminated result:

```ts
type LoginActionResult =
  | { success: true }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> };
```

Behavior:

1. Parse input with Zod.
2. Return field errors without contacting Supabase when input is invalid.
3. Create the server Supabase client.
4. Call `supabase.auth.signInWithPassword`.
5. Convert Supabase authentication errors to the generic user-facing message.
6. Revalidate the root layout after successful sign-in.
7. Return success to the client form.

The client performs `router.replace("/")` and `router.refresh()` only after a successful action result.

### Page behavior

`page.tsx` is a Server Component.

- It creates the server Supabase client.
- It validates the current user through Supabase.
- An already-authenticated user is redirected to `/`.
- Otherwise it renders the login portal.

The existing root scaffold is not redesigned into a dashboard during this phase. Phase 2 owns the dashboard route and persistent layout.

## Visual and Interaction Design

### Composition

The login portal uses a full-height spatial composition:

- Ambient pure-black default field.
- Restrained fixed radial illumination derived from `#2E008B` and lavender surface tint.
- A centered or split-layout glass authentication module depending on viewport width.
- A concise VEO OS identity area and a focused credential form.
- No stock dashboard imagery, remote placeholder assets, generic SaaS illustrations, or copied Stitch markup.

### Glass hierarchy

The primary authentication surface begins from:

```text
bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl
```

It uses `rounded-3xl`. Inputs use recessed translucent surfaces, and compact controls use `rounded-[10px]` or `rounded-full` according to function.

Light mode uses translucent white surfaces, low-alpha dark borders, and restrained lavender illumination over `#FAFAFA`.

### Typography and iconography

- Space Grotesk: VEO OS mark, heading, and high-emphasis labels.
- Inter: form labels, fields, supporting copy, errors, and controls.
- Phosphor icons: credential, security, visibility, theme, and status icons.
- Lucide is not used in custom login UI.

### Motion

Framer Motion uses the baseline spring:

```tsx
transition={{ type: "spring", stiffness: 400, damping: 30 }}
```

Custom buttons use:

```tsx
whileTap={{ scale: 0.95 }}
```

Motion communicates initial hierarchy, submission state, error appearance, password visibility, and theme-control feedback. `prefers-reduced-motion` removes nonessential travel while preserving state changes.

### Accessibility

- Every input has a persistent visible label.
- Validation messages are associated with their fields.
- Submission status uses an appropriate live region.
- Password visibility control has an accessible name that reflects its state.
- Theme control has a descriptive accessible name.
- Focus rings remain visible in dark and light themes.
- All controls are keyboard reachable.
- Disabled and pending states remain distinguishable without relying on animation.
- Color contrast is maintained over translucent surfaces.

## Theme Foundation

Phase 1 adds `next-themes` for class-based theme management.

- Root default theme: dark.
- Theme attribute: `class`.
- System theme does not override the VEO OS dark default on first load.
- Root HTML uses hydration-warning suppression required by class mutation.
- A client `ThemeProvider` wraps application content.
- A compact Phosphor-based theme control switches between dark and light modes.

Existing semantic Shadcn variables remain the source of component colors. Authentication components do not scatter hard-coded theme-specific foreground and surface colors through JSX.

## UI Boundaries

Phase 1 may add focused reusable primitives under `src/components/ui` for the login experience, following the existing Shadcn New York and Tailwind 3 conventions. The implementation must not import Tailwind 4-only utilities or restore the incompatible Base UI artifacts removed during Phase 0.

Expected shared components include:

- Button primitive.
- Input primitive.
- Theme provider.
- Theme toggle.

Components remain small, typed, accessible, and independently testable.

## Error Handling

### Configuration errors

Missing Supabase environment variables produce a concise developer-facing error during client creation. Values are never echoed.

### Validation errors

Client validation provides immediate field-level feedback. The Server Action repeats validation so bypassing the client cannot submit malformed credentials.

### Authentication errors

All expected credential failures return one generic message. Raw Supabase messages, status payloads, and identifiers are not shown to users.

### Unexpected errors

Unexpected server failures return a neutral temporary-failure message and remain distinguishable from validation errors in internal control flow. The login form returns to an enabled state so the user can retry.

## Testing Strategy

Phase 1 adds a focused Vitest and Testing Library foundation because the scaffold currently has no automated test runner.

### Validation tests

Tests cover:

- Valid email and non-empty password pass.
- Invalid email fails with the expected field error.
- Empty password fails with the expected field error.
- Email whitespace is normalized.

### Login form tests

Tests cover:

- Email and password controls have accessible labels.
- Invalid input prevents submission and displays field errors.
- Pending submission disables the submit control.
- A failed action displays the generic authentication message.
- Password visibility can be toggled with an accessible control.

### Server behavior tests

The action boundary is structured so validation can be tested without a live Supabase project. Supabase network behavior is verified through the real SDK contract in implementation and browser smoke testing; unit tests do not depend on external credentials or mutate the live project.

### Verification commands

Phase 1 must pass:

```text
npm test
npm run lint
npm run build
```

A browser smoke test verifies:

- `/login` renders without console errors.
- Dark mode is the initial theme.
- Theme switching works.
- Validation feedback is keyboard accessible.
- Invalid credentials produce the generic message without leaking provider details.
- The layout remains usable at desktop and mobile widths.

## File Plan

Expected additions and changes:

```text
middleware.ts
src/app/(auth)/login/actions.ts
src/app/(auth)/login/login-form.tsx
src/app/(auth)/login/page.tsx
src/components/providers/theme-provider.tsx
src/components/theme/theme-toggle.tsx
src/components/ui/button.tsx
src/components/ui/input.tsx
src/lib/auth/login-schema.ts
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/middleware.ts
src/test/setup.ts
vitest.config.ts
```

Expected modifications:

```text
package.json
package-lock.json
src/app/globals.css
src/app/layout.tsx
```

Test files are colocated with the focused modules or placed under a matching test directory according to the simplest configuration established during implementation.

## Delivery Boundary

Phase 1 is complete only when:

- Supabase browser and server clients follow the SSR cookie pattern.
- Middleware refreshes authentication sessions.
- Invite-only login works against configured Supabase credentials.
- No public registration path exists.
- The login portal satisfies the VEO OS visual and accessibility requirements.
- Automated tests, lint, and production build pass.
- No credentials are committed.
- The Phase 1 specification and implementation are committed and pushed to `origin/main`.

After push, work stops before Phase 2. The required handoff is to wait for the explicit command:

```text
PROCEED TO PHASE 2
```

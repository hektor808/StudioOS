# VEO OS Phase 1 Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and push an invite-only Supabase SSR login portal that establishes the authenticated cookie foundation and embodies the VEO OS visual system without beginning Phase 2.

**Architecture:** Use `@supabase/ssr` browser and request-scoped server clients, with root middleware responsible for token refresh. A hybrid login flow combines React Hook Form and shared Zod validation with a server-side password action. Theme, UI, and form modules stay small and testable; middleware refreshes sessions but dashboard authorization remains Phase 2 work.

**Tech Stack:** Next.js 14.2.35 App Router, React 18, TypeScript, Tailwind CSS 3.4, Shadcn New York conventions, Supabase SSR 0.12, React Hook Form, Zod 4, Framer Motion, Phosphor Icons, next-themes, Vitest, Testing Library

## Global Constraints

- Work only in `C:\Users\pc\Documents\Code Projects\StudioOS` on the explicitly authorized `main` branch.
- Read `VEO_OS_MASTER_PLAN.md` and `VEO_OS_DESIGN_MANIFESTO.md` before implementation.
- Implement invite-only email/password login; do not create sign-up, reset-password, OAuth, magic-link, or MFA flows.
- Consume only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; do not expose, log, test with, or commit secret values.
- `OPENAI_API_KEY` remains unused during Phase 1.
- Keep password submission server-first through a Server Action.
- Use `@supabase/ssr`; do not add deprecated Supabase auth helpers.
- Middleware refreshes sessions only. Dashboard authorization and route composition belong to Phase 2.
- Do not add dashboard, sidebar, audio player, Zustand audio store, database schema, waveform, upload, moodboard, operations, or AI implementation.
- Dark mode defaults to `#000000`; light mode uses `#FAFAFA`; the brand accent remains PANTONE 2735 C `#2E008B`.
- Main authentication surfaces use frosted glass, `rounded-3xl`, semantic theme variables, Space Grotesk, Inter, Phosphor icons, and Framer Motion springs.
- Custom tactile controls use `transition={{ type: "spring", stiffness: 400, damping: 30 }}` and `whileTap={{ scale: 0.95 }}` while respecting reduced motion.
- Preserve Tailwind 3 and Shadcn New York compatibility. Do not restore Tailwind 4 imports, Base UI, Material Symbols, or generated Stitch markup.
- Follow test-driven development: create each behavioral test, run it and observe the expected failure, then add only enough implementation to pass.
- Every commit message ends with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Push `main` to `origin` only after tests, lint, build, browser smoke checks, scope checks, and secret checks pass.
- Stop after Phase 1 and wait for `PROCEED TO PHASE 2`.

---

## File Map

### Test foundation

- Modify: `package.json` — add test scripts and Phase 1 dependencies.
- Modify: `package-lock.json` — resolved dependency graph.
- Create: `vitest.config.ts` — jsdom, React, alias, and setup configuration.
- Create: `src/test/setup.ts` — Testing Library matchers and cleanup.

### Shared authentication foundation

- Create: `src/lib/supabase/env.ts` — validated public Supabase environment contract.
- Create: `src/lib/supabase/env.test.ts` — environment-contract behavior.
- Create: `src/lib/supabase/client.ts` — browser client factory.
- Create: `src/lib/supabase/client.test.ts` — browser factory contract.
- Create: `src/lib/supabase/server.ts` — server cookie client factory.
- Create: `src/lib/supabase/server.test.ts` — cookie adapter contract.
- Create: `src/lib/supabase/middleware.ts` — session refresh helper.
- Create: `src/lib/supabase/middleware.test.ts` — response/cookie/header propagation contract.
- Create: `middleware.ts` — root middleware entry point and matcher.

### Login behavior

- Create: `src/lib/auth/login-schema.ts` — shared login validation and types.
- Create: `src/lib/auth/login-schema.test.ts` — schema behavior.
- Create: `src/app/(auth)/login/actions.ts` — password sign-in Server Action.
- Create: `src/app/(auth)/login/actions.test.ts` — validation, provider-error, and success behavior.
- Create: `src/app/(auth)/login/login-form.tsx` — accessible animated client form.
- Create: `src/app/(auth)/login/login-form.test.tsx` — form validation, pending, error, and password-toggle behavior.
- Create: `src/app/(auth)/login/page.tsx` — server login page and VEO OS composition.
- Create: `src/app/(auth)/login/page.test.tsx` — unauthenticated render and authenticated redirect behavior.

### Theme and UI

- Create: `src/components/providers/theme-provider.tsx` — next-themes wrapper.
- Create: `src/components/theme/theme-toggle.tsx` — accessible Phosphor theme switch.
- Create: `src/components/theme/theme-toggle.test.tsx` — theme switch behavior.
- Create: `src/components/ui/button.tsx` — Tailwind 3 Shadcn-style button primitive.
- Create: `src/components/ui/input.tsx` — Tailwind 3 Shadcn-style input primitive.
- Create: `src/components/ui/ui-primitives.test.tsx` — real rendered button/input behavior.
- Modify: `src/app/layout.tsx` — VEO metadata, hydration-safe theme provider, approved fonts.
- Modify: `src/app/globals.css` — ambient theme fields, selection, focus, and glass-support utilities.

---

### Task 1: Add the Phase 1 test and theme dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

**Interfaces:**
- Consumes: existing Next.js 14 TypeScript scaffold and `@/*` path alias.
- Produces: `npm test`, jsdom component testing, automatic cleanup, and class-based theme support.

- [ ] **Step 1: Install runtime dependencies**

Run:

```powershell
npm install next-themes @radix-ui/react-slot
```

Expected: both packages appear under `dependencies`.

- [ ] **Step 2: Install test dependencies**

Run:

```powershell
npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event vite-tsconfig-paths
```

Expected: npm exits zero and updates both package files.

- [ ] **Step 3: Add test scripts to `package.json`**

Set the scripts block to include:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
  },
});
```

- [ ] **Step 5: Create `src/test/setup.ts`**

```ts
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 6: Verify the test runner starts cleanly**

Run:

```powershell
npm test -- --passWithNoTests
```

Expected: Vitest exits zero with no test files yet.

- [ ] **Step 7: Commit the test foundation**

```powershell
git add package.json package-lock.json vitest.config.ts src/test/setup.ts
git commit -m "chore: add Phase 1 test foundation`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Build the validated environment and login schema

**Files:**
- Create: `src/lib/supabase/env.test.ts`
- Create: `src/lib/supabase/env.ts`
- Create: `src/lib/auth/login-schema.test.ts`
- Create: `src/lib/auth/login-schema.ts`

**Interfaces:**
- Produces: `getSupabaseEnv(overrides?) -> { url: string; anonKey: string }`.
- Produces: `loginSchema` and `LoginCredentials`.
- Consumed by: all Supabase factories, Server Action, and login form.

- [ ] **Step 1: Write `src/lib/supabase/env.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { getSupabaseEnv } from "./env";

describe("getSupabaseEnv", () => {
  it("returns configured public Supabase values", () => {
    expect(
      getSupabaseEnv({
        url: "https://example.supabase.co",
        anonKey: "public-anon-key",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: "public-anon-key",
    });
  });

  it.each([
    { url: "", anonKey: "public-anon-key" },
    { url: "https://example.supabase.co", anonKey: "" },
  ])("rejects incomplete configuration", (values) => {
    expect(() => getSupabaseEnv(values)).toThrow(
      "Supabase environment is not configured.",
    );
  });
});
```

- [ ] **Step 2: Run the environment test and observe RED**

Run:

```powershell
npm test -- src/lib/supabase/env.test.ts
```

Expected: FAIL because `./env` does not exist.

- [ ] **Step 3: Create `src/lib/supabase/env.ts`**

```ts
export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export function getSupabaseEnv(
  values: Partial<SupabasePublicEnv> = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
): SupabasePublicEnv {
  const url = values.url?.trim();
  const anonKey = values.anonKey?.trim();

  if (!url || !anonKey) {
    throw new Error("Supabase environment is not configured.");
  }

  return { url, anonKey };
}
```

- [ ] **Step 4: Run the environment test and observe GREEN**

Run:

```powershell
npm test -- src/lib/supabase/env.test.ts
```

Expected: both tests pass.

- [ ] **Step 5: Write `src/lib/auth/login-schema.test.ts`**

```ts
import { describe, expect, it } from "vitest";
import { loginSchema } from "./login-schema";

describe("loginSchema", () => {
  it("accepts valid credentials and trims email whitespace", () => {
    expect(
      loginSchema.parse({
        email: "  producer@veo.internal  ",
        password: "studio-passphrase",
      }),
    ).toEqual({
      email: "producer@veo.internal",
      password: "studio-passphrase",
    });
  });

  it("rejects an invalid email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "studio-passphrase",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.email).toContain(
      "Enter a valid email address.",
    );
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "producer@veo.internal",
      password: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.password).toContain(
      "Password is required.",
    );
  });
});
```

- [ ] **Step 6: Run the schema test and observe RED**

Run:

```powershell
npm test -- src/lib/auth/login-schema.test.ts
```

Expected: FAIL because `./login-schema` does not exist.

- [ ] **Step 7: Create `src/lib/auth/login-schema.ts`**

```ts
import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type LoginCredentials = z.infer<typeof loginSchema>;
```

- [ ] **Step 8: Run both focused tests and observe GREEN**

Run:

```powershell
npm test -- src/lib/supabase/env.test.ts src/lib/auth/login-schema.test.ts
```

Expected: all five tests pass.

- [ ] **Step 9: Commit the shared contracts**

```powershell
git add src/lib/supabase/env.ts src/lib/supabase/env.test.ts src/lib/auth/login-schema.ts src/lib/auth/login-schema.test.ts
git commit -m "feat: define authentication contracts`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Implement Supabase browser, server, and middleware clients

**Files:**
- Create: `src/lib/supabase/client.test.ts`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.test.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.test.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `middleware.ts`

**Interfaces:**
- Consumes: `getSupabaseEnv()`.
- Produces: browser `createClient()`.
- Produces: async server `createClient()`.
- Produces: `updateSession(request: NextRequest): Promise<NextResponse>`.

- [ ] **Step 1: Write the browser-client factory test**

Create `src/lib/supabase/client.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClient = vi.fn(() => ({ kind: "browser-client" }));

vi.mock("@supabase/ssr", () => ({ createBrowserClient }));

describe("browser Supabase client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    createBrowserClient.mockClear();
  });

  it("creates a browser client from the public environment", async () => {
    const { createClient } = await import("./client");

    expect(createClient()).toEqual({ kind: "browser-client" });
    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "public-anon-key",
    );
  });
});
```

- [ ] **Step 2: Run the browser test and observe RED**

Run:

```powershell
npm test -- src/lib/supabase/client.test.ts
```

Expected: FAIL because `./client` does not exist.

- [ ] **Step 3: Create `src/lib/supabase/client.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

export function createClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
```

- [ ] **Step 4: Run the browser test and observe GREEN**

Run:

```powershell
npm test -- src/lib/supabase/client.test.ts
```

Expected: one test passes.

- [ ] **Step 5: Write the server-client cookie test**

Create `src/lib/supabase/server.test.ts` with module mocks for `next/headers` and `@supabase/ssr`. Assert that the factory passes the configured URL/key, that `cookies.getAll()` returns the Next cookie store values, and that `cookies.setAll()` writes every supplied cookie. Add a second test where `cookieStore.set()` throws and assert `setAll()` does not propagate the read-only Server Component error.

Use this exact cookie fixture:

```ts
const cookieStore = {
  getAll: vi.fn(() => [{ name: "sb-session", value: "session" }]),
  set: vi.fn(),
};
```

Capture the third `createServerClient` argument and call:

```ts
options.cookies.setAll(
  [{ name: "sb-session", value: "updated", options: { path: "/" } }],
  { "Cache-Control": "private, no-store" },
);
```

- [ ] **Step 6: Run the server test and observe RED**

Run:

```powershell
npm test -- src/lib/supabase/server.test.ts
```

Expected: FAIL because `./server` does not exist.

- [ ] **Step 7: Create `src/lib/supabase/server.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

export async function createClient() {
  const cookieStore = cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always mutate cookies; middleware refreshes them.
        }
      },
    },
  });
}
```

- [ ] **Step 8: Run the server test and observe GREEN**

Run:

```powershell
npm test -- src/lib/supabase/server.test.ts
```

Expected: cookie read/write tests pass.

- [ ] **Step 9: Write middleware behavior tests**

Create `src/lib/supabase/middleware.test.ts`. Mock `NextResponse.next` with a response object containing `cookies.set` and `headers.set`, mock `createServerClient`, and assert:

1. `updateSession()` invokes `supabase.auth.getClaims()` exactly once.
2. Its cookie `setAll()` updates both `request.cookies` and the returned response cookies.
3. Header values passed by Supabase, including `Cache-Control`, are copied to the response.
4. `updateSession()` returns the response instance that received the refreshed cookies.

Use a fake request with:

```ts
const request = {
  cookies: {
    getAll: vi.fn(() => []),
    set: vi.fn(),
  },
  headers: new Headers(),
};
```

- [ ] **Step 10: Run middleware tests and observe RED**

Run:

```powershell
npm test -- src/lib/supabase/middleware.test.ts
```

Expected: FAIL because `./middleware` does not exist.

- [ ] **Step 11: Create `src/lib/supabase/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({ request });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });

        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  await supabase.auth.getClaims();
  return response;
}
```

- [ ] **Step 12: Create root `middleware.ts`**

```ts
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 13: Run the complete Supabase-client test set**

Run:

```powershell
npm test -- src/lib/supabase
```

Expected: environment, browser, server, and middleware tests pass.

- [ ] **Step 14: Commit the Supabase SSR foundation**

```powershell
git add middleware.ts src/lib/supabase
git commit -m "feat: add Supabase SSR clients`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Establish VEO OS theme and UI primitives

**Files:**
- Create: `src/components/providers/theme-provider.tsx`
- Create: `src/components/theme/theme-toggle.test.tsx`
- Create: `src/components/theme/theme-toggle.tsx`
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/ui-primitives.test.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: `ThemeProvider`, `ThemeToggle`, `Button`, and `Input`.
- Consumed by: login page and login form.

- [ ] **Step 1: Write UI primitive tests**

Create `src/components/ui/ui-primitives.test.tsx` and assert:

- `Button` renders its accessible name and forwards the disabled state.
- A glass button includes the semantic glass variant classes.
- `Input` forwards `aria-invalid`, its type, and its accessible label relationship.

Use real rendered components rather than testing `cn` or CVA directly.

- [ ] **Step 2: Run the primitive tests and observe RED**

Run:

```powershell
npm test -- src/components/ui/ui-primitives.test.tsx
```

Expected: FAIL because `button.tsx` and `input.tsx` do not exist.

- [ ] **Step 3: Create Shadcn-compatible Button and Input primitives**

Use Tailwind 3-compatible implementations. `Button` uses `@radix-ui/react-slot`, `class-variance-authority`, `cn`, semantic colors, focus-visible rings, disabled states, and `forwardRef`. `Input` uses a native input, `cn`, semantic border/background, `aria-invalid` styling, and `forwardRef`.

The button variants must include:

```ts
variant: {
  default: "bg-primary text-primary-foreground shadow-[0_0_24px_rgba(46,0,139,0.24)] hover:bg-primary/90",
  glass: "border border-border bg-white/5 text-foreground backdrop-blur-xl hover:bg-white/10",
  ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
}
```

The default radius is `rounded-[10px]`.

- [ ] **Step 4: Run the primitive tests and observe GREEN**

Run:

```powershell
npm test -- src/components/ui/ui-primitives.test.tsx
```

Expected: all primitive behavior tests pass.

- [ ] **Step 5: Create `src/components/providers/theme-provider.tsx`**

```tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
```

- [ ] **Step 6: Write `theme-toggle.test.tsx`**

Mock `next-themes` so the first render returns `{ resolvedTheme: "dark", setTheme }`. Assert that:

- The control is named `Switch to light theme`.
- Clicking it calls `setTheme("light")`.
- A light-theme render is named `Switch to dark theme` and calls `setTheme("dark")`.

- [ ] **Step 7: Run the theme-toggle test and observe RED**

Run:

```powershell
npm test -- src/components/theme/theme-toggle.test.tsx
```

Expected: FAIL because `theme-toggle.tsx` does not exist.

- [ ] **Step 8: Create `src/components/theme/theme-toggle.tsx`**

Implement a mounted-state-safe client component using `useTheme`, `MoonStars` and `Sun` from `@phosphor-icons/react`, the glass `Button`, and Framer Motion. The button must:

- Compute the next theme from `resolvedTheme`.
- Expose the exact accessible names tested above.
- Use an icon-only `rounded-full` glass control.
- Use the baseline spring and `whileTap={{ scale: 0.95 }}`.
- Render a stable disabled placeholder until mounted to avoid hydration mismatch.

- [ ] **Step 9: Run the theme-toggle test and observe GREEN**

Run:

```powershell
npm test -- src/components/theme/theme-toggle.test.tsx
```

Expected: both theme-direction tests pass.

- [ ] **Step 10: Modify `src/app/layout.tsx`**

Preserve Inter and Space Grotesk. Set metadata to:

```ts
export const metadata: Metadata = {
  title: "VEO OS",
  description: "Private production operating system for the VEO team.",
};
```

Render:

```tsx
<html lang="en" suppressHydrationWarning>
  <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans antialiased`}>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  </body>
</html>
```

- [ ] **Step 11: Extend `src/app/globals.css`**

Keep the semantic variables. Add:

```css
html {
  color-scheme: light;
}

html.dark {
  color-scheme: dark;
}

body {
  min-height: 100vh;
  background-color: hsl(var(--background));
  background-image:
    radial-gradient(circle at 15% 50%, rgba(46, 0, 139, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 85% 30%, rgba(98, 74, 191, 0.1) 0%, transparent 50%);
  background-attachment: fixed;
}

::selection {
  background: rgba(46, 0, 139, 0.72);
  color: white;
}
```

Inside a light selector, reduce the glow opacity over `#FAFAFA`. Add a `.glass-panel` utility using translucent semantic-safe backgrounds, `backdrop-filter: blur(24px)`, low-alpha borders, and graceful fallback inside `@supports not (backdrop-filter: blur(1px))`.

- [ ] **Step 12: Run UI tests, lint, and build**

Run:

```powershell
npm test -- src/components/ui/ui-primitives.test.tsx src/components/theme/theme-toggle.test.tsx
npm run lint
npm run build
```

Expected: all commands exit zero.

- [ ] **Step 13: Commit the VEO visual foundation**

```powershell
git add src/components src/app/layout.tsx src/app/globals.css
git commit -m "feat: establish VEO OS theme foundation`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Implement the password sign-in Server Action

**Files:**
- Create: `src/app/(auth)/login/actions.test.ts`
- Create: `src/app/(auth)/login/actions.ts`

**Interfaces:**
- Consumes: `loginSchema`, `LoginCredentials`, and server `createClient()`.
- Produces: `LoginActionResult` and `login(credentials)`.

- [ ] **Step 1: Write Server Action tests**

Mock `@/lib/supabase/server` and `next/cache`. Cover these exact cases:

1. Invalid email returns `{ success: false, message: "Check the highlighted fields.", fieldErrors }` and never creates a Supabase client.
2. Supabase `signInWithPassword` receives normalized credentials.
3. A Supabase auth error returns `{ success: false, message: "Unable to sign in with those credentials." }` without returning the provider error text.
4. A thrown client/network error returns `{ success: false, message: "VEO OS could not reach the authentication service. Try again." }`.
5. Successful login calls `revalidatePath("/", "layout")` and returns `{ success: true }`.

- [ ] **Step 2: Run the action tests and observe RED**

Run:

```powershell
npm test -- "src/app/(auth)/login/actions.test.ts"
```

Expected: FAIL because `actions.ts` does not exist.

- [ ] **Step 3: Create `src/app/(auth)/login/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import type { LoginCredentials } from "@/lib/auth/login-schema";
import { loginSchema } from "@/lib/auth/login-schema";
import { createClient } from "@/lib/supabase/server";

export type LoginActionResult =
  | { success: true }
  | {
      success: false;
      message: string;
      fieldErrors?: Partial<Record<keyof LoginCredentials, string[]>>;
    };

export async function login(
  credentials: LoginCredentials,
): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(credentials);

  if (!parsed.success) {
    return {
      success: false,
      message: "Check the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);

    if (error) {
      return {
        success: false,
        message: "Unable to sign in with those credentials.",
      };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch {
    return {
      success: false,
      message: "VEO OS could not reach the authentication service. Try again.",
    };
  }
}
```

- [ ] **Step 4: Run the action tests and observe GREEN**

Run:

```powershell
npm test -- "src/app/(auth)/login/actions.test.ts"
```

Expected: all five cases pass.

- [ ] **Step 5: Commit the login action**

```powershell
git add "src/app/(auth)/login/actions.ts" "src/app/(auth)/login/actions.test.ts"
git commit -m "feat: add invite-only login action`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Build the accessible animated login form

**Files:**
- Create: `src/app/(auth)/login/login-form.test.tsx`
- Create: `src/app/(auth)/login/login-form.tsx`

**Interfaces:**
- Consumes: `loginSchema`, `login`, `Button`, and `Input`.
- Produces: `LoginForm({ authenticate? })` with an injectable action for focused tests.

- [ ] **Step 1: Write login-form behavior tests**

Use Testing Library and `userEvent`. Pass an `authenticate` test function through the component prop. Cover:

1. Email and password fields are discoverable by their visible labels.
2. Submitting invalid values shows `Enter a valid email address.` and `Password is required.` without calling `authenticate`.
3. During an unresolved action promise, the submit button is disabled and named `Authenticating…`.
4. An action failure displays `Unable to sign in with those credentials.` in an alert/live region.
5. `Show password` changes the input type to text and becomes `Hide password`.
6. A successful action calls mocked `router.replace("/")` and `router.refresh()`.

Mock `next/navigation` with stable `replace` and `refresh` spies.

- [ ] **Step 2: Run login-form tests and observe RED**

Run:

```powershell
npm test -- "src/app/(auth)/login/login-form.test.tsx"
```

Expected: FAIL because `login-form.tsx` does not exist.

- [ ] **Step 3: Create `src/app/(auth)/login/login-form.tsx`**

Implement a client component with:

- `useForm<LoginCredentials>({ resolver: zodResolver(loginSchema), defaultValues })`.
- Optional `authenticate` prop defaulting to the real `login` action.
- `useTransition` for pending state.
- Local server-message state.
- `EnvelopeSimple`, `LockKey`, `Eye`, `EyeSlash`, `SpinnerGap`, and `ArrowRight` from Phosphor.
- Framer Motion baseline spring and reduced-motion awareness.
- Persistent labels and `aria-describedby` links for field errors.
- `role="alert"` for server errors.
- `aria-busy` and disabled controls during submission.
- Password visibility button with state-reflective accessible name.
- Primary submit button with `whileTap={{ scale: 0.95 }}`.

On successful action:

```ts
router.replace("/");
router.refresh();
```

Do not render sign-up, reset-password, OAuth, or magic-link controls.

- [ ] **Step 4: Run login-form tests and observe GREEN**

Run:

```powershell
npm test -- "src/app/(auth)/login/login-form.test.tsx"
```

Expected: all six behaviors pass.

- [ ] **Step 5: Run the focused auth suite**

Run:

```powershell
npm test -- src/lib/auth "src/app/(auth)/login"
```

Expected: schema, action, and form tests pass.

- [ ] **Step 6: Commit the login form**

```powershell
git add "src/app/(auth)/login/login-form.tsx" "src/app/(auth)/login/login-form.test.tsx"
git commit -m "feat: build VEO login form`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Compose the VEO OS login portal

**Files:**
- Create: `src/app/(auth)/login/page.test.tsx`
- Create: `src/app/(auth)/login/page.tsx`

**Interfaces:**
- Consumes: server `createClient()`, `LoginForm`, and `ThemeToggle`.
- Produces: `/login` server page with authenticated redirect and VEO OS visual composition.

- [ ] **Step 1: Write page behavior tests**

Mock `@/lib/supabase/server` and `next/navigation`. Cover:

1. An unauthenticated response renders `VEO OS`, `Private studio access`, the email field, and the theme control.
2. An authenticated user causes `redirect("/")`.
3. The unauthenticated page contains no link or button matching `/sign up|create account|magic link|google/i`.

Call the async Server Component directly and render its returned JSX for the unauthenticated case.

- [ ] **Step 2: Run page tests and observe RED**

Run:

```powershell
npm test -- "src/app/(auth)/login/page.test.tsx"
```

Expected: FAIL because `page.tsx` does not exist.

- [ ] **Step 3: Create `src/app/(auth)/login/page.tsx`**

Implement an async Server Component:

```tsx
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();

if (user) {
  redirect("/");
}
```

Compose the page using semantic Tailwind classes and the `.glass-panel` utility:

- Full-height page with `16px` mobile and `32px` desktop safe margins.
- Top-right `ThemeToggle`.
- Two-column glass portal on large screens and a single-column form on small screens.
- Identity panel with `Waveform`, `ShieldCheck`, and a compact `VEO // PRIVATE NETWORK` label.
- Heading `Private studio access`.
- Supporting copy that clearly states access is limited to invited VEO team members.
- Login form in a dedicated `rounded-2xl` internal module.
- A small operational-status row that does not claim a live backend health check.
- No opaque primary container, remote image, generic SaaS illustration, or copied Stitch markup.

Use only Phosphor icons and approved spring motion inside client subcomponents. Keep the page itself a Server Component.

- [ ] **Step 4: Run page tests and observe GREEN**

Run:

```powershell
npm test -- "src/app/(auth)/login/page.test.tsx"
```

Expected: all page behaviors pass.

- [ ] **Step 5: Run all automated tests**

Run:

```powershell
npm test
```

Expected: zero failing tests.

- [ ] **Step 6: Run lint and production build**

Run:

```powershell
npm run lint
npm run build
```

Expected: both commands exit zero and `/login` is present in the route output.

- [ ] **Step 7: Commit the login portal**

```powershell
git add "src/app/(auth)/login/page.tsx" "src/app/(auth)/login/page.test.tsx"
git commit -m "feat: create VEO OS login portal`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: Browser-smoke, audit, commit plan, and push Phase 1

**Files:**
- Review: all Phase 1 files.
- Commit: `docs/superpowers/plans/2026-08-10-veo-os-phase-1-auth.md` if not already committed.

**Interfaces:**
- Consumes: completed Phase 1 implementation.
- Produces: verified `origin/main` Phase 1 delivery with no Phase 2 work.

- [ ] **Step 1: Start the development server for browser verification**

Run in the background:

```powershell
npm run dev
```

Expected: Next.js reports a local URL and remains running.

- [ ] **Step 2: Verify `/login` at desktop width**

Use the browser at `1440x1000` and verify:

- The route renders without application or console errors.
- Dark mode is initially active.
- The black ambient field and restrained purple illumination are visible.
- The main surface is frosted glass with clear hierarchy.
- Text, controls, and focus states are legible.
- No sign-up or provider-auth controls appear.

- [ ] **Step 3: Verify interaction and accessibility**

Using browser keyboard and form controls:

- Tab order reaches theme, email, password, password visibility, and submit controls logically.
- Empty submission presents field errors.
- Password visibility changes input type and accessible name.
- Theme switching activates a usable light theme and survives reload.
- Invalid credentials return only the generic authentication message.
- No raw Supabase provider error appears in the page or console.

Do not use a valid team password during automated or recorded verification.

- [ ] **Step 4: Verify mobile layout**

Resize to `390x844` and verify:

- No unintended horizontal scrolling.
- The form remains fully visible and usable.
- Mobile safe margins are approximately 16px.
- Decorative identity content does not displace the form below an unreasonable fold.

- [ ] **Step 5: Run the final automated verification from a clean command**

Run:

```powershell
npm test
npm run lint
npm run build
```

Expected: all tests pass, lint reports no warnings/errors, and production build succeeds.

- [ ] **Step 6: Verify Phase 1 scope and secret safety**

Confirm these Phase 2 paths do not exist:

```text
src/lib/store/useAudioStore.ts
src/app/(dashboard)/layout.tsx
src/components/audio/GlobalPlayer.tsx
```

Confirm `.env.local` remains ignored and unstaged. Scan staged/runtime files for assignments of:

```text
OPENAI_API_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=<actual value>
```

Expected: no secrets are staged or printed.

- [ ] **Step 7: Review Git state**

Run:

```powershell
git status --short
git diff --check
git log --oneline --decorate -12
```

Expected: only the plan may remain uncommitted; all implementation commits are present; no whitespace errors.

- [ ] **Step 8: Commit the implementation plan if needed**

```powershell
git add docs/superpowers/plans/2026-08-10-veo-os-phase-1-auth.md
git commit -m "docs: add VEO OS phase 1 implementation plan`n`nCo-Authored-By: Claude <noreply@anthropic.com>"
```

If the plan was committed earlier, skip this command rather than creating an empty commit.

- [ ] **Step 9: Push Phase 1**

Run:

```powershell
git push origin main
```

Expected: push succeeds without force and `origin/main` points to the final Phase 1 commit.

- [ ] **Step 10: Verify the remote and phase boundary**

Run:

```powershell
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
```

Expected: clean `main`, local and remote SHAs match, and no Phase 2 files exist.

- [ ] **Step 11: Stop**

Do not implement dashboard or audio work. Report the completed Phase 1 verification and wait for the user to type:

```text
PROCEED TO PHASE 2
```

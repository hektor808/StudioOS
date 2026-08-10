import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceMiddleware = resolve(process.cwd(), "src", "middleware.ts");
const rootMiddleware = resolve(process.cwd(), "middleware.ts");

describe("Next.js middleware entrypoint", () => {
  it("lives beside src/app so the framework discovers it", () => {
    expect(existsSync(sourceMiddleware)).toBe(true);
    expect(existsSync(rootMiddleware)).toBe(false);
  });

  it("preserves the auth session delegation and route matcher", () => {
    expect(existsSync(sourceMiddleware)).toBe(true);

    const source = readFileSync(sourceMiddleware, "utf8");

    expect(source).toContain(
      'import { updateSession } from "@/lib/supabase/middleware";',
    );
    expect(source).toContain("return updateSession(request);");
    expect(source).toContain(
      '"/((?!_next/static|_next/image|favicon.ico|.*\\\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",',
    );
  });
});

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

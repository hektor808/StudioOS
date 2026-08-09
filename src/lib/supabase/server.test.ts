import { beforeEach, describe, expect, it, vi } from "vitest";

const cookieStore = {
  getAll: vi.fn(() => [{ name: "sb-session", value: "session" }]),
  set: vi.fn(),
};
const cookies = vi.fn(() => cookieStore);
type ServerClientOptions = {
  cookies: {
    getAll: () => { name: string; value: string }[];
    setAll: (
      cookiesToSet: { name: string; value: string; options: { path: string } }[],
      headers: Record<string, string>,
    ) => void;
  };
};
type CreateServerClient = (
  url: string,
  anonKey: string,
  options: ServerClientOptions,
) => { kind: string };
const createServerClient = vi.fn<CreateServerClient>(() => ({
  kind: "server-client",
}));

vi.mock("next/headers", () => ({ cookies }));
vi.mock("@supabase/ssr", () => ({ createServerClient }));

describe("server Supabase client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    cookieStore.getAll.mockClear();
    cookieStore.set.mockReset();
    cookies.mockClear();
    createServerClient.mockClear();
  });

  it("reads and writes the Next.js cookie store", async () => {
    const { createClient } = await import("./server");

    await expect(createClient()).resolves.toEqual({ kind: "server-client" });
    expect(createServerClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "public-anon-key",
      expect.any(Object),
    );

    const options = createServerClient.mock.calls[0][2];
    expect(options.cookies.getAll()).toEqual([
      { name: "sb-session", value: "session" },
    ]);

    options.cookies.setAll(
      [{ name: "sb-session", value: "updated", options: { path: "/" } }],
      { "Cache-Control": "private, no-store" },
    );

    expect(cookieStore.set).toHaveBeenCalledWith("sb-session", "updated", {
      path: "/",
    });
  });

  it("ignores cookie writes from a read-only Server Component store", async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler.");
    });

    const { createClient } = await import("./server");
    await createClient();

    const options = createServerClient.mock.calls[0][2];
    expect(() => {
      options.cookies.setAll(
        [{ name: "sb-session", value: "updated", options: { path: "/" } }],
        { "Cache-Control": "private, no-store" },
      );
    }).not.toThrow();
  });
});

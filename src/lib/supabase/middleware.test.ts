import { beforeEach, describe, expect, it, vi } from "vitest";

const createServerClient = vi.fn();
const getClaims = vi.fn();
const next = vi.fn();

vi.mock("@supabase/ssr", () => ({ createServerClient }));
vi.mock("next/server", () => ({ NextResponse: { next } }));

describe("Supabase middleware session refresh", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
    createServerClient.mockReset();
    getClaims.mockReset();
    next.mockReset();
  });

  it("refreshes claims and propagates Supabase cookies and headers", async () => {
    const initialResponse = {
      cookies: { set: vi.fn() },
      headers: { set: vi.fn() },
    };
    const refreshedResponse = {
      cookies: { set: vi.fn() },
      headers: { set: vi.fn() },
    };
    const request = {
      cookies: {
        getAll: vi.fn(() => []),
        set: vi.fn(),
      },
      headers: new Headers(),
    };

    next.mockReturnValueOnce(initialResponse).mockReturnValueOnce(refreshedResponse);
    createServerClient.mockImplementation((_url, _anonKey, options) => {
      getClaims.mockImplementation(async () => {
        options.cookies.setAll(
          [{ name: "sb-session", value: "updated", options: { path: "/" } }],
          { "Cache-Control": "private, no-store" },
        );
      });

      return { auth: { getClaims } };
    });

    const { updateSession } = await import("./middleware");
    const result = await updateSession(request as never);

    expect(getClaims).toHaveBeenCalledTimes(1);
    expect(request.cookies.set).toHaveBeenCalledWith("sb-session", "updated");
    expect(refreshedResponse.cookies.set).toHaveBeenCalledWith(
      "sb-session",
      "updated",
      { path: "/" },
    );
    expect(refreshedResponse.headers.set).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store",
    );
    expect(result).toBe(refreshedResponse);
  });
});

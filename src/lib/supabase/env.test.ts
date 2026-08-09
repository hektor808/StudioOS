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

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  revalidatePath: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { login } from "./actions";

describe("login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({
      auth: { signInWithPassword: mocks.signInWithPassword },
    });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
  });

  it("returns field errors for invalid email without creating a client", async () => {
    const result = await login({
      email: "not-an-email",
      password: "studio-passphrase",
    });

    expect(result).toEqual({
      success: false,
      message: "Check the highlighted fields.",
      fieldErrors: { email: ["Enter a valid email address."] },
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("passes normalized credentials to Supabase", async () => {
    await login({
      email: "  producer@veo.internal  ",
      password: "studio-passphrase",
    });

    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: "producer@veo.internal",
      password: "studio-passphrase",
    });
  });

  it("returns a generic message when Supabase rejects credentials", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      error: { message: "Provider-specific diagnostic" },
    });

    const result = await login({
      email: "producer@veo.internal",
      password: "studio-passphrase",
    });

    expect(result).toEqual({
      success: false,
      message: "Unable to sign in with those credentials.",
    });
    expect(JSON.stringify(result)).not.toContain("Provider-specific diagnostic");
  });

  it("returns a generic service message when client creation or sign-in throws", async () => {
    mocks.createClient.mockRejectedValue(new Error("Network unavailable"));

    const result = await login({
      email: "producer@veo.internal",
      password: "studio-passphrase",
    });

    expect(result).toEqual({
      success: false,
      message: "VEO OS could not reach the authentication service. Try again.",
    });
  });

  it("revalidates the root layout after a successful login", async () => {
    const result = await login({
      email: "producer@veo.internal",
      password: "studio-passphrase",
    });

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(result).toEqual({ success: true });
  });
});

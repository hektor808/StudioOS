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

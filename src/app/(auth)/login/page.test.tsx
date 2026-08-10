import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({
    refresh: mocks.refresh,
    replace: mocks.replace,
  }),
}));

import LoginPage from "./page";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
  });

  it("renders the private VEO sign-in controls for an unauthenticated visitor", async () => {
    render(await LoginPage());

    expect(screen.getByText("VEO OS")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Private studio access" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(
      screen.getByRole("button", { name: /theme/i }),
    ).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects an authenticated user to the studio root", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "veo-producer" } },
      error: null,
    });

    await LoginPage();

    expect(mocks.redirect).toHaveBeenCalledWith("/");
  });

  it("does not offer account creation or alternate sign-in providers", async () => {
    render(await LoginPage());

    expect(
      screen.queryByRole("link", {
        name: /sign up|create account|magic link|google/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: /sign up|create account|magic link|google/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("removes the decorative identity signal from the mobile layout flow", async () => {
    render(await LoginPage());

    expect(
      screen.getByText("Identity signal").closest('[aria-hidden="true"]'),
    ).toHaveClass("hidden", "md:block");
  });
});

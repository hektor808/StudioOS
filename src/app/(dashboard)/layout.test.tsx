import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  childRender: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

vi.mock("@/components/dashboard/dashboard-shell", () => ({
  DashboardShell: ({ children }: { children: ReactNode }) => (
    <div data-testid="dashboard-shell">
      <main>{children}</main>
      <section aria-label="Global audio player" />
    </div>
  ),
}));

import DashboardLayout from "./layout";

function ChildProbe() {
  mocks.childRender();
  return <p>Protected child</p>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.createClient.mockResolvedValue({
    auth: { getUser: mocks.getUser },
  });
  mocks.getUser.mockResolvedValue({
    data: { user: null },
    error: null,
  });
});

describe("DashboardLayout", () => {
  it("redirects a missing user before rendering protected children", async () => {
    await expect(
      DashboardLayout({ children: <ChildProbe /> }),
    ).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.childRender).not.toHaveBeenCalled();
  });

  it("treats a returned provider error as unauthenticated without leaking it", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error("provider-secret-detail"),
    });

    await expect(
      DashboardLayout({ children: <ChildProbe /> }),
    ).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.childRender).not.toHaveBeenCalled();
  });

  it("redirects when the user lookup throws without swallowing the redirect", async () => {
    mocks.getUser.mockRejectedValue(new Error("network-provider-detail"));

    await expect(
      DashboardLayout({ children: <ChildProbe /> }),
    ).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(mocks.redirect).toHaveBeenCalledWith("/login");
    expect(mocks.childRender).not.toHaveBeenCalled();
  });

  it("preserves the developer-facing configuration failure", async () => {
    mocks.createClient.mockRejectedValue(
      new Error("Supabase environment is not configured."),
    );

    await expect(
      DashboardLayout({ children: <ChildProbe /> }),
    ).rejects.toThrow("Supabase environment is not configured.");

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.childRender).not.toHaveBeenCalled();
  });

  it("renders the shell and child for an authenticated user", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "veo-producer" } },
      error: null,
    });

    render(await DashboardLayout({ children: <ChildProbe /> }));

    expect(screen.getByTestId("dashboard-shell")).toBeInTheDocument();
    expect(screen.getByText("Protected child")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Global audio player" }),
    ).toBeInTheDocument();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.childRender).toHaveBeenCalledTimes(1);
  });
});

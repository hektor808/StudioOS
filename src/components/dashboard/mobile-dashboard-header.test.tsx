import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MobileDashboardHeader } from "./mobile-dashboard-header";

vi.mock("@/components/theme/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Toggle theme</button>,
}));

describe("MobileDashboardHeader", () => {
  it("shows the current context without unavailable navigation", () => {
    render(<MobileDashboardHeader />);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass("lg:hidden");
    expect(within(header).getByText("VEO OS")).toBeInTheDocument();
    expect(within(header).getByText("Dashboard")).toBeInTheDocument();
    expect(within(header).getAllByRole("button", { name: "Toggle theme" })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /menu/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    for (const moduleName of ["Studio", "Operations", "Content", "VEO AI"]) {
      expect(screen.queryByRole("link", { name: moduleName })).not.toBeInTheDocument();
    }
  });
});

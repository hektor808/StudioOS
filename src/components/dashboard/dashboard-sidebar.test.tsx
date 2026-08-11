import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardSidebar } from "./dashboard-sidebar";

vi.mock("@/components/theme/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Toggle theme</button>,
}));

describe("DashboardSidebar", () => {
  it("renders semantic current navigation and honest future destinations", () => {
    render(<DashboardSidebar />);

    const aside = screen.getByRole("complementary");
    expect(aside).toHaveClass("hidden", "lg:flex");
    expect(
      screen.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("VEO // PRIVATE NETWORK")).toBeInTheDocument();
    expect(within(aside).getAllByRole("button", { name: "Toggle theme" })).toHaveLength(1);

    for (const moduleName of ["Studio", "Operations", "Content", "VEO AI"]) {
      const label = screen.getByText(moduleName);
      expect(label.parentElement).toHaveTextContent("Coming soon");
      expect(screen.queryByRole("link", { name: moduleName })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: moduleName })).not.toBeInTheDocument();
    }
  });
});

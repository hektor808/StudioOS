import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardHome } from "./dashboard-home";

describe("DashboardHome", () => {
  it("renders the approved honest Phase 2 home state", () => {
    const { container } = render(<DashboardHome />);

    expect(
      screen.getByRole("heading", { name: "Studio command center" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The private VEO workspace is ready. Studio catalog, operations, content, and VEO AI modules will come online in their dedicated phases.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Listening layer ready" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tracks will appear here when the Studio catalog is connected.",
      ),
    ).toBeInTheDocument();

    for (const moduleName of ["Studio", "Operations", "Content", "VEO AI"]) {
      const moduleHeading = screen.getByRole("heading", { name: moduleName });
      expect(moduleHeading.parentElement).toHaveTextContent("Coming soon");
    }

    expect(container.textContent).not.toMatch(
      /deadline|comment|collaborator|storage|analytics|health|%/i,
    );
    expect(container.querySelector("main")).not.toBeInTheDocument();
    expect(container.querySelector("a, button, img")).not.toBeInTheDocument();
  });
});

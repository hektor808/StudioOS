import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import DashboardPage from "./page";

describe("DashboardPage", () => {
  it("renders the honest dashboard home without creating another main landmark", () => {
    const { container } = render(<DashboardPage />);

    expect(
      screen.getByRole("heading", { name: "Studio command center" }),
    ).toBeInTheDocument();
    expect(container.querySelector("main")).not.toBeInTheDocument();
  });
});

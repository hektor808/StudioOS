import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "./theme-toggle";

const setTheme = vi.fn();
let resolvedTheme = "dark";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme, setTheme }),
}));

describe("ThemeToggle", () => {
  beforeEach(() => {
    setTheme.mockClear();
    resolvedTheme = "dark";
  });

  it("switches from dark to light theme", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    await user.click(
      await screen.findByRole("button", { name: "Switch to light theme" }),
    );

    expect(setTheme).toHaveBeenCalledWith("light");
  });

  it("switches from light to dark theme", async () => {
    const user = userEvent.setup();
    resolvedTheme = "light";
    render(<ThemeToggle />);

    await user.click(
      await screen.findByRole("button", { name: "Switch to dark theme" }),
    );

    expect(setTheme).toHaveBeenCalledWith("dark");
  });
});

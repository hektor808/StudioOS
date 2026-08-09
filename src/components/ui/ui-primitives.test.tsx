import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./button";
import { Input } from "./input";

describe("Button", () => {
  it("renders its accessible name and forwards the disabled state", () => {
    render(<Button disabled>Open session</Button>);

    expect(
      screen.getByRole("button", { name: "Open session" }),
    ).toBeDisabled();
  });

  it("applies the semantic glass treatment", () => {
    render(<Button variant="glass">Preview track</Button>);

    expect(
      screen.getByRole("button", { name: "Preview track" }),
    ).toHaveClass(
      "border",
      "border-border",
      "bg-white/5",
      "text-foreground",
      "backdrop-blur-xl",
      "hover:bg-white/10",
    );
  });
});

describe("Input", () => {
  it("forwards its invalid state, type, and accessible label relationship", () => {
    render(
      <div>
        <label htmlFor="session-email">Email</label>
        <Input
          id="session-email"
          type="email"
          aria-invalid="true"
        />
      </div>,
    );

    const input = screen.getByRole("textbox", { name: "Email" });

    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});

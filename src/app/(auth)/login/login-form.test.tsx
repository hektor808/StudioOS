import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
}));

import { LoginForm } from "./login-form";

describe("LoginForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes the credential fields through persistent visible labels", () => {
    render(<LoginForm authenticate={vi.fn()} />);

    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
  });

  it("shows schema errors for invalid credentials without authenticating", async () => {
    const user = userEvent.setup();
    const authenticate = vi.fn();
    render(<LoginForm authenticate={authenticate} />);

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const emailError = await screen.findByText("Enter a valid email address.");
    const passwordError = screen.getByText("Password is required.");

    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription(
      "Enter a valid email address.",
    );
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "Password is required.",
    );
    expect(emailError).toBeInTheDocument();
    expect(passwordError).toBeInTheDocument();
    expect(authenticate).not.toHaveBeenCalled();
  });

  it("disables the form and names the submit button while authenticating", async () => {
    const user = userEvent.setup();
    const authenticate = vi.fn(
      () =>
        new Promise<{ success: true }>(() => {
          // Deliberately unresolved so the pending UI can be observed.
        }),
    );
    render(<LoginForm authenticate={authenticate} />);

    await user.type(screen.getByLabelText("Email"), "producer@veo.internal");
    await user.type(screen.getByLabelText("Password"), "studio-passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    const submitButton = await screen.findByRole("button", {
      name: "Authenticating…",
    });

    expect(submitButton).toBeDisabled();
    expect(screen.getByRole("form")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByLabelText("Email")).toBeDisabled();
    expect(screen.getByLabelText("Password")).toBeDisabled();
  });

  it("announces an authentication failure", async () => {
    const user = userEvent.setup();
    const authenticate = vi.fn().mockResolvedValue({
      success: false as const,
      message: "Unable to sign in with those credentials.",
    });
    render(<LoginForm authenticate={authenticate} />);

    await user.type(screen.getByLabelText("Email"), "producer@veo.internal");
    await user.type(screen.getByLabelText("Password"), "studio-passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to sign in with those credentials.",
    );
  });

  it("toggles password visibility with a state-reflective accessible name", async () => {
    const user = userEvent.setup();
    render(<LoginForm authenticate={vi.fn()} />);

    const password = screen.getByLabelText("Password");
    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(password).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Hide password" }),
    ).toBeInTheDocument();
  });

  it("replaces the route and refreshes after successful authentication", async () => {
    const user = userEvent.setup();
    const authenticate = vi.fn().mockResolvedValue({ success: true as const });
    render(<LoginForm authenticate={authenticate} />);

    await user.type(screen.getByLabelText("Email"), "producer@veo.internal");
    await user.type(screen.getByLabelText("Password"), "studio-passphrase");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith("/");
      expect(router.refresh).toHaveBeenCalledTimes(1);
    });
  });
});

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  signIn: vi.fn<
    (provider: string, form: FormData) => Promise<void>
  >(async () => undefined),
}));

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: authMocks.signIn }),
}));

import { AdminSignIn } from "@/components/admin/admin-session";

afterEach(() => {
  cleanup();
  authMocks.signIn.mockReset();
  authMocks.signIn.mockResolvedValue(undefined);
});

describe("AdminSignIn", () => {
  it("offers account creation only when the server allows initial setup", async () => {
    const user = userEvent.setup();
    const { container } = render(<AdminSignIn allowInitialAccountSetup />);

    expect(container.querySelector('input[name="flow"]')).toHaveValue("signIn");

    await user.click(
      screen.getByRole("button", {
        name: "Set up the first administrator account",
      }),
    );
    expect(
      screen.getByRole("heading", { name: "Create the initial account." }),
    ).toBeVisible();
    expect(container.querySelector('input[name="flow"]')).toHaveValue("signUp");

    await user.type(screen.getByLabelText("Display name"), "Club Owner");
    await user.type(screen.getByLabelText("Email address"), "owner@example.com");
    await user.type(screen.getByLabelText(/^Password/), "StrongPassword12");
    await user.click(
      screen.getByRole("button", { name: "Create initial identity" }),
    );

    await waitFor(() => expect(authMocks.signIn).toHaveBeenCalledTimes(1));
    const [provider, form] = authMocks.signIn.mock.calls[0];
    expect(provider).toBe("password");
    expect(form.get("flow")).toBe("signUp");
    expect(form.get("name")).toBe("Club Owner");
    expect(form.get("email")).toBe("owner@example.com");
  });

  it("does not expose account creation after an administrator exists", () => {
    render(<AdminSignIn />);

    expect(
      screen.getByRole("heading", { name: "Return to the workspace." }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", {
        name: "Set up the first administrator account",
      }),
    ).toBeNull();
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute("minlength", "12");
  });

  it("turns a missing password account into a safe first-account instruction", async () => {
    authMocks.signIn.mockRejectedValueOnce(
      new Error(
        "[CONVEX A(auth:signIn)] Server Error\nUncaught Error: InvalidAccountId",
      ),
    );
    const user = userEvent.setup();
    render(<AdminSignIn allowInitialAccountSetup />);

    await user.type(screen.getByLabelText("Email address"), "owner@example.com");
    await user.type(screen.getByLabelText(/^Password/), "StrongPassword12");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The email or password is incorrect. If this is the first account, choose “Set up the first administrator account” below.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("InvalidAccountId");
    expect(screen.getByRole("alert")).not.toHaveTextContent("CONVEX");
  });

  it("directs an existing identity back to sign in without exposing backend details", async () => {
    authMocks.signIn.mockRejectedValueOnce(
      new Error("Uncaught Error: Account password:owner@example.com already exists"),
    );
    const user = userEvent.setup();
    render(<AdminSignIn allowInitialAccountSetup />);

    await user.click(
      screen.getByRole("button", {
        name: "Set up the first administrator account",
      }),
    );
    await user.type(screen.getByLabelText("Display name"), "Club Owner");
    await user.type(screen.getByLabelText("Email address"), "owner@example.com");
    await user.type(screen.getByLabelText(/^Password/), "StrongPassword12");
    await user.click(
      screen.getByRole("button", { name: "Create initial identity" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "An account already exists for this email address. Return to sign in.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("password:owner");
  });

  it("uses a calm retry message after the auth rate limit", async () => {
    authMocks.signIn.mockRejectedValueOnce(
      new Error("Uncaught Error: TooManyFailedAttempts"),
    );
    const user = userEvent.setup();
    render(<AdminSignIn />);

    await user.type(screen.getByLabelText("Email address"), "owner@example.com");
    await user.type(screen.getByLabelText(/^Password/), "StrongPassword12");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Too many sign-in attempts. Wait a moment, then try again.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent(
      "TooManyFailedAttempts",
    );
  });
});

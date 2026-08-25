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
  it("exposes sign-in only and never offers browser account creation", () => {
    const { container } = render(<AdminSignIn />);

    expect(
      screen.getByRole("heading", { name: "Return to the workspace." }),
    ).toBeVisible();
    expect(container.querySelector('input[name="flow"]')).toHaveValue("signIn");
    expect(screen.queryByLabelText("Display name")).toBeNull();
    expect(
      screen.queryByRole("button", {
        name: "Set up the first administrator account",
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Create initial identity" }),
    ).toBeNull();
    expect(screen.getByLabelText(/^Password/)).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("always submits the Password provider sign-in flow", async () => {
    const user = userEvent.setup();
    render(<AdminSignIn />);

    await user.type(screen.getByLabelText("Email address"), "owner@example.com");
    await user.type(screen.getByLabelText(/^Password/), "StrongPassword12");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(authMocks.signIn).toHaveBeenCalledTimes(1));
    const [provider, form] = authMocks.signIn.mock.calls[0];
    expect(provider).toBe("password");
    expect(form.get("flow")).toBe("signIn");
    expect(form.get("email")).toBe("owner@example.com");
  });

  it("turns a missing password account into a non-enumerating sign-in error", async () => {
    authMocks.signIn.mockRejectedValueOnce(
      new Error(
        "[CONVEX A(auth:signIn)] Server Error\nUncaught Error: InvalidAccountId",
      ),
    );
    const user = userEvent.setup();
    render(<AdminSignIn />);

    await user.type(screen.getByLabelText("Email address"), "owner@example.com");
    await user.type(screen.getByLabelText(/^Password/), "StrongPassword12");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The email or password is incorrect.",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("InvalidAccountId");
    expect(screen.getByRole("alert")).not.toHaveTextContent("CONVEX");
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

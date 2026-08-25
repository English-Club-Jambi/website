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
  authMocks.signIn.mockClear();
});

describe("AdminSignIn", () => {
  it("offers account creation only when the server allows initial setup", async () => {
    const user = userEvent.setup();
    render(<AdminSignIn allowInitialAccountSetup />);

    await user.click(
      screen.getByRole("button", {
        name: "Set up the first administrator account",
      }),
    );
    expect(
      screen.getByRole("heading", { name: "Create the initial account." }),
    ).toBeVisible();

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
});

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("next/script", async () => {
  const React = await import("react");
  return {
    default: function ScriptMock({ onReady }: { onReady?: () => void }) {
      React.useEffect(() => {
        onReady?.();
      }, [onReady]);
      return null;
    },
  };
});

import {
  ResultEmailDelivery,
  type ResultEmailDeliveryInput,
  type ResultEmailDeliveryOutcome,
} from "@/components/practice/result-email-delivery";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  delete window.turnstile;
});

const turnstileSiteKey = "turnstile-test-site-key";
const turnstileToken = "turnstile-test-token-that-is-long-enough";
const scrollIntoViewMock = vi.fn();

beforeEach(() => {
  scrollIntoViewMock.mockClear();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoViewMock,
  });
  window.turnstile = {
    render: vi.fn((_container, options) => {
      queueMicrotask(() => options.callback(turnstileToken));
      return "turnstile-widget-1";
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  };
});

const accepted: ResultEmailDeliveryOutcome = {
  status: "accepted",
  maskedEmail: "s•••@example.com",
  reviewHref: "#answer-review-title",
  reviewExpiresAt: Date.UTC(2026, 8, 27),
};

async function waitForHumanVerification() {
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Email my result" }),
    ).toBeEnabled(),
  );
}

async function completeForm(user: ReturnType<typeof userEvent.setup>) {
  await waitForHumanVerification();
  await user.type(
    screen.getByLabelText("Name on certificate"),
    "  Siti   Rahma  ",
  );
  await user.type(screen.getByLabelText("Email address"), "siti@example.com");
  await user.click(
    screen.getByRole("checkbox", {
      name: /I agree that English Club may use this name and email address/i,
    }),
  );
}

describe("ResultEmailDelivery", () => {
  it("keeps the Mendalo default visible and offers exactly three optional designs", async () => {
    const user = userEvent.setup();
    render(
      <ResultEmailDelivery
        onSend={vi.fn()}
        turnstileEnabled
        turnstileSiteKey={turnstileSiteKey}
      />,
    );

    expect(screen.getByText("Mendalo Record is ready.")).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();

    const trigger = screen.getByRole("button", {
      name: "Choose another design",
    });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", {
      name: "Choose a certificate design",
    });
    expect(dialog).toHaveAttribute("open");
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /Mendalo Record/ })).toBeChecked();
    await waitFor(() =>
      expect(
        screen.getByRole("radio", { name: /Mendalo Record/ }),
      ).toHaveFocus(),
    );

    await user.click(screen.getByRole("radio", { name: /Cobalt Selvedge/ }));
    await user.click(screen.getByRole("button", { name: "Use this design" }));

    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Cobalt Selvedge is ready.")).toBeVisible();
    expect(screen.getByText("Cobalt Selvedge selected.")).toBeInTheDocument();
  });

  it("cancels the chooser without changing the active design", async () => {
    const user = userEvent.setup();
    render(
      <ResultEmailDelivery
        onSend={vi.fn()}
        turnstileEnabled
        turnstileSiteKey={turnstileSiteKey}
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "Choose another design",
    });
    await user.click(trigger);
    await user.click(screen.getByRole("radio", { name: /Titik Folio/ }));

    const dialog = screen.getByRole("dialog", {
      name: "Choose a certificate design",
    });
    fireEvent(dialog, new Event("cancel", { cancelable: true }));

    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Mendalo Record is ready.")).toBeVisible();
  });

  it("focuses each invalid field in form order and does not send", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(
      <ResultEmailDelivery
        onSend={onSend}
        turnstileEnabled
        turnstileSiteKey={turnstileSiteKey}
      />,
    );

    await waitForHumanVerification();

    await user.click(screen.getByRole("button", { name: "Email my result" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Check the marked delivery details.",
    );
    expect(screen.getByLabelText("Name on certificate")).toHaveFocus();
    expect(scrollIntoViewMock).toHaveBeenLastCalledWith({
      block: "center",
      inline: "nearest",
    });
    expect(
      screen.getByText("Enter the name to print on the certificate."),
    ).toBeVisible();

    await user.type(screen.getByLabelText("Name on certificate"), "Siti Rahma");
    await user.click(screen.getByRole("button", { name: "Email my result" }));
    expect(screen.getByLabelText("Email address")).toHaveFocus();
    expect(screen.getByText("Enter a valid email address.")).toBeVisible();

    await user.type(screen.getByLabelText("Email address"), "siti@example.com");
    await user.click(screen.getByRole("button", { name: "Email my result" }));
    expect(screen.getByRole("checkbox")).toHaveFocus();
    expect(
      screen.getByText(
        "Confirm that we may use these details for this delivery.",
      ),
    ).toBeVisible();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("locks duplicate input while pending and renders the provider-accepted state", async () => {
    const user = userEvent.setup();
    let resolveDelivery:
      ((outcome: ResultEmailDeliveryOutcome) => void) | undefined;
    const onSend = vi.fn<
      (input: ResultEmailDeliveryInput) => Promise<ResultEmailDeliveryOutcome>
    >(
      () =>
        new Promise<ResultEmailDeliveryOutcome>((resolve) => {
          resolveDelivery = resolve;
        }),
    );
    const onRevokeReviewLinks = vi.fn().mockResolvedValue(1);
    render(
      <ResultEmailDelivery
        onSend={onSend}
        onRevokeReviewLinks={onRevokeReviewLinks}
        turnstileEnabled
        turnstileSiteKey={turnstileSiteKey}
      />,
    );
    await completeForm(user);

    await user.click(screen.getByRole("button", { name: "Email my result" }));

    expect(
      screen.getByRole("button", { name: "Preparing email" }),
    ).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Preparing your certificate and email.",
    );
    expect(screen.getByLabelText("Name on certificate")).toBeDisabled();
    expect(screen.getByLabelText("Email address")).toBeDisabled();
    expect(onSend).toHaveBeenCalledOnce();

    const payload = onSend.mock.calls[0][0];
    expect(payload).toMatchObject({
      recipientName: "Siti Rahma",
      recipientEmail: "siti@example.com",
      certificateTemplate: "mendalo-record",
      consent: true,
      consentVersion: 1,
      turnstileToken,
    });
    expect(payload.requestId).toMatch(/^[a-z0-9-]+$/i);

    resolveDelivery?.(accepted);
    const acceptedHeading = await screen.findByRole("heading", {
      name: "Your email is on its way.",
    });
    await waitFor(() => expect(acceptedHeading).toHaveFocus());
    expect(scrollIntoViewMock).toHaveBeenLastCalledWith({
      block: "center",
      inline: "nearest",
    });
    expect(
      screen.getByText(/Brevo accepted the message for s•••@example.com/),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Open review here" }),
    ).toHaveAttribute("href", "#answer-review-title");
    expect(screen.getByText("27 September 2026")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Revoke private review link" }),
    );
    expect(onRevokeReviewLinks).toHaveBeenCalledOnce();
    expect(
      await screen.findByText("The emailed review link has been revoked."),
    ).toHaveAttribute("role", "status");

    await user.click(screen.getByRole("button", { name: "Send another copy" }));
    expect(screen.getByLabelText("Email address")).toHaveValue("");
    expect(screen.getByLabelText("Name on certificate")).toHaveValue(
      "  Siti   Rahma  ",
    );
  });

  it("keeps a failed delivery recoverable and starts a fresh confirmed attempt", async () => {
    const user = userEvent.setup();
    const onSend = vi
      .fn<
        (input: ResultEmailDeliveryInput) => Promise<ResultEmailDeliveryOutcome>
      >()
      .mockResolvedValueOnce({
        status: "rejected",
        code: "provider_unavailable",
      })
      .mockResolvedValueOnce(accepted);
    render(
      <ResultEmailDelivery
        onSend={onSend}
        turnstileEnabled
        turnstileSiteKey={turnstileSiteKey}
      />,
    );
    await completeForm(user);

    await user.click(screen.getByRole("button", { name: "Email my result" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not confirm delivery. Check your inbox before trying again.",
    );
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(
      await screen.findByRole("heading", { name: "Your email is on its way." }),
    ).toBeVisible();
    expect(onSend).toHaveBeenCalledTimes(2);
    expect(onSend.mock.calls[1][0].requestId).not.toBe(
      onSend.mock.calls[0][0].requestId,
    );
  });

  it("does not auto-retry an ambiguous provider result and requires a separate-copy action", async () => {
    const user = userEvent.setup();
    const onSend = vi
      .fn<
        (input: ResultEmailDeliveryInput) => Promise<ResultEmailDeliveryOutcome>
      >()
      .mockResolvedValueOnce({ status: "rejected", code: "delivery_uncertain" })
      .mockResolvedValueOnce(accepted);
    render(
      <ResultEmailDelivery
        onSend={onSend}
        turnstileEnabled
        turnstileSiteKey={turnstileSiteKey}
      />,
    );
    await completeForm(user);

    await user.click(screen.getByRole("button", { name: "Email my result" }));
    expect(
      await screen.findByRole("heading", {
        name: "Delivery status is unclear.",
      }),
    ).toBeVisible();
    expect(onSend).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole("button", { name: "Try again" }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Prepare a separate copy" }),
    );
    await waitForHumanVerification();
    await user.click(screen.getByRole("button", { name: "Email my result" }));
    expect(
      await screen.findByRole("heading", { name: "Your email is on its way." }),
    ).toBeVisible();
    expect(onSend).toHaveBeenCalledTimes(2);
    expect(onSend.mock.calls[1][0].requestId).not.toBe(
      onSend.mock.calls[0][0].requestId,
    );
  });

  it("sends without loading Turnstile while verification is deferred", async () => {
    const user = userEvent.setup();
    const onSend = vi.fn().mockResolvedValue(accepted);
    render(
      <ResultEmailDelivery
        onSend={onSend}
        turnstileEnabled={false}
        turnstileSiteKey={turnstileSiteKey}
      />,
    );

    expect(screen.queryByText("Human verification")).not.toBeInTheDocument();
    expect(window.turnstile!.render).not.toHaveBeenCalled();

    await completeForm(user);
    await user.click(screen.getByRole("button", { name: "Email my result" }));

    expect(onSend).toHaveBeenCalledOnce();
    expect(onSend.mock.calls[0]?.[0]).not.toHaveProperty("turnstileToken");
    expect(
      await screen.findByRole("heading", { name: "Your email is on its way." }),
    ).toBeVisible();
  });

  it("fails closed when enabled without a public Turnstile site key", () => {
    render(
      <ResultEmailDelivery
        onSend={vi.fn()}
        turnstileEnabled
        turnstileSiteKey=""
      />,
    );

    expect(
      screen.getByText("Email delivery is not configured for this site yet."),
    ).toHaveAttribute("role", "status");
    expect(
      screen.getByRole("button", { name: "Email my result" }),
    ).toBeDisabled();
  });

  it("binds Turnstile to the delivery action and disables sending after expiry", async () => {
    render(
      <ResultEmailDelivery
        onSend={vi.fn()}
        turnstileEnabled
        turnstileSiteKey={turnstileSiteKey}
      />,
    );
    await waitForHumanVerification();

    const renderTurnstile = vi.mocked(window.turnstile!.render);
    expect(renderTurnstile).toHaveBeenCalledOnce();
    const [host, options] = renderTurnstile.mock.calls[0]!;
    expect(host).toBeInstanceOf(HTMLElement);
    expect(options).toMatchObject({
      sitekey: turnstileSiteKey,
      action: "full-practice-result-email",
      theme: "auto",
      size: "flexible",
      retry: "never",
    });

    act(() => options["expired-callback"]());
    expect(
      screen.getByRole("button", { name: "Email my result" }),
    ).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "The verification expired. Complete it again before sending.",
    );
  });

  it("shows the Turnstile error code and recovers through an explicit retry", async () => {
    const user = userEvent.setup();
    render(
      <ResultEmailDelivery
        onSend={vi.fn()}
        turnstileEnabled
        turnstileSiteKey={turnstileSiteKey}
      />,
    );
    await waitForHumanVerification();

    const renderTurnstile = vi.mocked(window.turnstile!.render);
    const options = renderTurnstile.mock.calls[0]![1];

    act(() => options["error-callback"]("600010"));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Cloudflare could not complete this check (code 600010).",
    );
    expect(
      screen.getByRole("button", { name: "Email my result" }),
    ).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: "Retry verification" }),
    );

    expect(window.turnstile!.reset).toHaveBeenCalledWith("turnstile-widget-1");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    act(() => options.callback("new-turnstile-token-that-is-long-enough"));
    expect(
      screen.getByRole("button", { name: "Email my result" }),
    ).toBeEnabled();
  });
});

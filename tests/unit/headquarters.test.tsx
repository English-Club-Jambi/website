import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Headquarters } from "@/components/headquarters";
import { getPublicContentDefaults } from "@content/public-content";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("About headquarters", () => {
  it("renders a complete address and a direct Google Maps route without JavaScript", () => {
    const copy = getPublicContentDefaults("about");
    render(<Headquarters copy={copy} />);

    expect(
      screen.getByRole("heading", { name: copy.headquartersTitle }),
    ).toBeInTheDocument();
    expect(screen.getByText(copy.headquartersPlace)).toBeInTheDocument();
    expect(screen.getByText(copy.headquartersAddress)).toBeInTheDocument();
    expect(screen.getByText(copy.headquartersPlusCode)).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: `${copy.headquartersMapLink} (opens in a new tab)`,
      }),
    ).toHaveAttribute(
      "href",
      "https://maps.app.goo.gl/gZNDkHecRKxmZkYV7",
    );
  });

  it("copies the address and announces success", async () => {
    const copy = getPublicContentDefaults("about");
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
    render(<Headquarters copy={copy} />);

    fireEvent.click(
      screen.getByRole("button", { name: copy.headquartersCopyAddress }),
    );

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(copy.headquartersAddress);
      expect(screen.getByText(copy.headquartersAddressCopied)).toBeInTheDocument();
    });
  });

  it("keeps the location readable when clipboard access fails", async () => {
    const copy = getPublicContentDefaults("about");
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(async () => Promise.reject(new Error("denied"))) },
    });
    render(<Headquarters copy={copy} />);

    fireEvent.click(
      screen.getByRole("button", { name: copy.headquartersCopyPlusCode }),
    );

    expect(await screen.findByText(copy.headquartersCopyFailed)).toBeInTheDocument();
    expect(screen.getByText(copy.headquartersPlusCode)).toBeInTheDocument();
  });
});

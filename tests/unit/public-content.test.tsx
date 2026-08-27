import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  getPublicContentDefaults,
  getPublicContentManifestPages,
  mergePublishedPublicContent,
  publicContentManifest,
} from "@content/public-content";
import { PromptMixer } from "@/components/play/prompt-mixer";

const publishedAt = Date.UTC(2026, 7, 25);

afterEach(cleanup);

describe("public content manifest", () => {
  it("declares unique bounded keys and honest checked-in defaults", () => {
    const identities = new Set<string>();
    const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    for (const page of getPublicContentManifestPages()) {
      expect(page.pageKey).toMatch(keyPattern);
      expect(page.label.trim()).not.toBe("");

      for (const field of Object.values(page.fields)) {
        const identity = `${page.pageKey}.${field.contentKey}`;
        expect(identities.has(identity)).toBe(false);
        identities.add(identity);
        expect(field.contentKey).toMatch(keyPattern);
        expect(field.kind).toBe("plain-text");
        expect(field.defaultValue.trim()).not.toBe("");
        expect(field.defaultValue.length).toBeLessThanOrEqual(field.maxLength);
        expect(field.defaultValue).not.toMatch(
          /placeholder|sample data|preview only|synthetic slots|waiting for real names/i,
        );
      }
    }

    expect(Object.keys(publicContentManifest)).toEqual([
      "global",
      "home",
      "practice",
      "about",
      "activities",
      "programs",
      "members",
      "journal",
      "privacy",
      "contact",
    ]);
  });

  it("merges only the newest valid publication for a known field", () => {
    const resolved = mergePublishedPublicContent("home", [
      {
        contentKey: "hero-title-line-one",
        kind: "plain-text",
        value: "  English belongs\n to everyone  ",
        revision: 2,
        publishedAt,
      },
      {
        contentKey: "hero-title-line-one",
        kind: "plain-text",
        value: "Older title",
        revision: 1,
        publishedAt: publishedAt - 1,
      },
    ]);

    expect(resolved.heroTitleLineOne).toBe("English belongs to everyone");
    expect(resolved.heroTitleLineTwo).toBe(
      getPublicContentDefaults("home").heroTitleLineTwo,
    );
  });

  it("ignores unknown keys, kind mismatches, HTML-like input, and oversized copy", () => {
    const defaults = getPublicContentDefaults("home");
    const resolved = mergePublishedPublicContent("home", [
      {
        contentKey: "unknown-layout-command",
        kind: "plain-text",
        value: "Replace the page",
        revision: 1,
        publishedAt,
      },
      {
        contentKey: "hero-title-line-one",
        kind: "markdown",
        value: "# Replaced",
        revision: 4,
        publishedAt,
      },
      {
        contentKey: "hero-title-line-one",
        kind: "plain-text",
        value: "<script>alert(1)</script>",
        revision: 5,
        publishedAt,
      },
      {
        contentKey: "hero-title-line-two",
        kind: "plain-text",
        value: "x".repeat(43),
        revision: 1,
        publishedAt,
      },
    ]);

    expect(resolved).toEqual(defaults);
    expect(resolved).not.toHaveProperty("unknownLayoutCommand");
  });

  it("returns detached defaults so one request cannot mutate another", () => {
    const first = getPublicContentDefaults("contact");
    const second = getPublicContentDefaults("contact");
    first.heroEyebrow = "Changed in one render";

    expect(second.heroEyebrow).toBe("One message, kept private");
  });
});

describe("published copy in an interactive component", () => {
  it("hydrates the prompt relay with manifest-shaped custom wording", () => {
    const copy = mergePublishedPublicContent("home", [
      {
        contentKey: "prompt-title",
        kind: "plain-text",
        value: "Pick one question for the table.",
        revision: 3,
        publishedAt,
      },
      {
        contentKey: "prompt-next",
        kind: "plain-text",
        value: "Another question",
        revision: 3,
        publishedAt,
      },
      {
        contentKey: "prompt-two-topic",
        kind: "plain-text",
        value: "about a phrase",
        revision: 3,
        publishedAt,
      },
    ]);

    render(<PromptMixer copy={copy} />);

    expect(
      screen.getByRole("heading", { name: "Pick one question for the table." }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Another question" }));
    expect(screen.getByRole("status")).toHaveTextContent("about a phrase");
  });
});

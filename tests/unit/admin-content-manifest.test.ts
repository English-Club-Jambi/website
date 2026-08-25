import { describe, expect, it } from "vitest";

import { buildContentEditorItems } from "@/components/admin/content-manager";
import { publicContentManifest } from "@content/public-content";

describe("admin public-content manifest", () => {
  it("offers every checked-in global field before Convex has any rows", () => {
    const items = buildContentEditorItems("global", []);

    expect(items).toHaveLength(Object.keys(publicContentManifest.global.fields).length);
    expect(items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          contentKey: "site-name",
          draftValue: "English Club",
          draftRevision: 0,
          managed: true,
        }),
        expect.objectContaining({
          contentKey: "footer-statement",
          managed: true,
        }),
      ]),
    );
  });

  it("keeps unknown stored rows visible without presenting them as public copy", () => {
    const items = buildContentEditorItems("home", [
      {
        _id: "content_unknown" as never,
        pageKey: "home",
        locale: "en",
        contentKey: "retired-message",
        label: "Retired message",
        kind: "plain-text",
        draftValue: "An older message",
        draftRevision: 2,
        updatedAt: 1,
      },
    ]);

    expect(items.at(-1)).toEqual(
      expect.objectContaining({
        contentKey: "retired-message",
        managed: false,
        contractIssue: "Not used by public site",
      }),
    );
  });
});

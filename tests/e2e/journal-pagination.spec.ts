import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const archiveTitle = "Journal archive";
const bodyOnlyHeadings = [
  "Listening is part of speaking",
  "Keep the conversation moving",
  "Record only what helps",
];

test("archive HTML contains summaries but excludes full article bodies", async ({
  request,
}) => {
  const response = await request.get("/journal");
  const html = await response.text();

  expect(response.ok()).toBe(true);
  expect(html).toContain(archiveTitle);
  expect(html).toContain("Leeds the Way: Bridging England and Indonesia");
  for (const heading of bodyOnlyHeadings) {
    expect(html).not.toContain(heading);
  }
});

test("invalid cursor shapes return to the canonical archive", async ({ page }) => {
  await page.goto("/journal?after=one&after=two");

  await expect(page).toHaveURL(/\/journal#journal-archive$/);
  await expect(page.getByRole("heading", { level: 2, name: archiveTitle })).toBeVisible();
});

test("opaque cursor failures stay honest and out of the search index", async ({
  page,
}) => {
  await page.goto("/journal?after=not-a-real-cursor#journal-archive");

  await expect(
    page.getByRole("heading", {
      level: 3,
      name: "This part of the archive is temporarily unavailable.",
    }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex, follow|noindex,follow/,
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/journal$/,
  );
  await expect(page.getByRole("link", { name: "Newest stories" })).toHaveAttribute(
    "href",
    "/journal#journal-archive",
  );
});

test("archive rows stay dense, readable, and free of media overlap", async ({
  page,
}, testInfo) => {
  await page.goto("/journal");
  const heading = page.getByRole("heading", { level: 2, name: archiveTitle });
  await expect(heading).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /\/journal$/,
  );
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

  const geometry = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll("#journal-archive ol > li"));
    const rectangles = rows.map((row) => {
      const title = row.querySelector("h3")?.getBoundingClientRect();
      const image = row.querySelector('a[aria-hidden="true"]')?.getBoundingClientRect();
      const intersection =
        title && image
          ? Math.max(0, Math.min(title.right, image.right) - Math.max(title.left, image.left)) *
            Math.max(0, Math.min(title.bottom, image.bottom) - Math.max(title.top, image.top))
          : 0;

      return {
        height: row.getBoundingClientRect().height,
        intersection,
      };
    });
    const archiveHeading = document.querySelector("#journal-archive-title")?.getBoundingClientRect();

    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      viewportHeight: window.innerHeight,
      archiveHeadingTop: archiveHeading?.top ?? Number.POSITIVE_INFINITY,
      rectangles,
    };
  });

  expect(geometry.rectangles.length).toBeGreaterThan(0);
  expect(geometry.rectangles.length).toBeLessThanOrEqual(6);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
  expect(geometry.archiveHeadingTop).toBeLessThan(geometry.viewportHeight);
  expect(geometry.rectangles.every((row) => row.intersection === 0)).toBe(true);

  const maximumRowHeight =
    testInfo.project.name === "desktop-chromium"
      ? 190
      : testInfo.project.name === "narrow-chromium"
        ? 190
        : 245;
  expect(Math.max(...geometry.rectangles.map((row) => row.height))).toBeLessThanOrEqual(
    maximumRowHeight,
  );

  await page.screenshot({
    path: `docs/evidence/journal-pagination-${testInfo.project.name}-light.png`,
    fullPage: true,
  });

  const articleLinks = page.locator("#journal-archive ol h3 a");
  await articleLinks.first().focus();
  await expect(articleLinks.first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/journal\/leeds-the-way-bridging-england-and-indonesia$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Leeds the Way: Bridging England and Indonesia",
    }),
  ).toBeVisible();
});

test("journal archive passes WCAG A and AA checks in both themes", async ({
  page,
}, testInfo) => {
  await page.goto("/journal");
  await expect(page.getByRole("heading", { level: 2, name: archiveTitle })).toBeVisible();

  const lightResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(lightResults.violations).toEqual([]);

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.waitForTimeout(350);

  const darkResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(darkResults.violations).toEqual([]);

  if (testInfo.project.name === "desktop-chromium") {
    await page.screenshot({
      path: "docs/evidence/journal-pagination-desktop-chromium-dark.png",
      fullPage: true,
    });
  }
});

test("reduced motion removes archive transforms without hiding content", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "One motion contract covers every viewport");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/journal");

  const firstTitle = page.locator("#journal-archive ol h3 a").first();
  const firstImage = page.locator("#journal-archive ol img").first();
  await expect(firstTitle).toBeVisible();
  await firstTitle.hover();

  await expect
    .poll(() => firstImage.evaluate((image) => getComputedStyle(image).transform))
    .toBe("none");
});

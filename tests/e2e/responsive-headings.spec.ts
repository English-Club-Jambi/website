import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/about",
  "/activities",
  "/programs",
  "/members",
  "/practice",
  "/practice/full",
  "/practice/quick/listening",
  "/practice/quick/reading",
  "/practice/quick/structure",
  "/journal",
  "/journal/english-club-university-of-leeds-sharing-session",
  "/contact",
  "/privacy",
  "/admin",
] as const;

for (const path of routes) {
  test(`${path} keeps mobile headings compact and inside the canvas`, async ({
    page,
  }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);

    await page.evaluate(async () => document.fonts.ready);
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();

    const geometry = await page.evaluate(() => {
      const primary = document.querySelector<HTMLElement>("h1");
      const primaryBounds = primary?.getBoundingClientRect();
      const secondarySizes = Array.from(
        document.querySelectorAll<HTMLElement>("main h2"),
      ).map((item) => Number.parseFloat(getComputedStyle(item).fontSize));

      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        primaryFontSize: primary
          ? Number.parseFloat(getComputedStyle(primary).fontSize)
          : 0,
        primaryLeft: primaryBounds?.left ?? -1,
        primaryRight: primaryBounds?.right ?? Number.POSITIVE_INFINITY,
        primaryHeight: primaryBounds?.height ?? Number.POSITIVE_INFINITY,
        secondaryMax: Math.max(0, ...secondarySizes),
      };
    });

    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect(geometry.primaryLeft).toBeGreaterThanOrEqual(0);
    expect(geometry.primaryRight).toBeLessThanOrEqual(geometry.clientWidth + 1);
    if (geometry.clientWidth < 640) {
      expect(geometry.primaryFontSize).toBeLessThanOrEqual(45);
      expect(geometry.primaryHeight).toBeLessThanOrEqual(320);
      expect(geometry.secondaryMax).toBeLessThanOrEqual(41);
    }
  });
}

test("the 404 number does not cover the recovery heading", async ({
  page,
}) => {
  const response = await page.goto("/responsive-heading-audit-missing");
  expect(response?.status()).toBe(404);

  const overlapArea = await page.evaluate(() => {
    const code = document.querySelector<HTMLElement>(".not-found-code");
    const heading = document.querySelector<HTMLElement>(".not-found-inner h1");
    if (code === null || heading === null) return Number.POSITIVE_INFINITY;
    const codeBounds = code.getBoundingClientRect();
    const headingBounds = heading.getBoundingClientRect();
    const verticalOverlap = Math.max(
      0,
      Math.min(codeBounds.bottom, headingBounds.bottom) -
        Math.max(codeBounds.top, headingBounds.top),
    );
    const horizontalOverlap = Math.max(
      0,
      Math.min(codeBounds.right, headingBounds.right) -
        Math.max(codeBounds.left, headingBounds.left),
    );
    return verticalOverlap * horizontalOverlap;
  });

  expect(overlapArea).toBe(0);
});

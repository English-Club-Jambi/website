import { expect, test, type Locator, type Page } from "@playwright/test";

async function waitForHydration(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

async function hideDevelopmentChrome(page: Page) {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>("nextjs-portal").forEach((portal) => {
      portal.style.display = "none";
    });
  });
}

async function expectEveryTargetInsideViewport(targets: Locator, page: Page) {
  const viewportWidth = await page.evaluate(
    () => document.documentElement.clientWidth,
  );
  const count = await targets.count();

  for (let index = 0; index < count; index += 1) {
    const bounds = await targets.nth(index).evaluate((target) => {
      const rect = target.getBoundingClientRect();
      return {
        left: rect.left,
        right: rect.right,
        width: rect.width,
        height: rect.height,
      };
    });

    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(viewportWidth);
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
  }
}

test.describe("home phone adaptation", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop-chromium",
      "Phone geometry is covered by the phone projects.",
    );

    await page.emulateMedia({
      colorScheme: "light",
      reducedMotion: "no-preference",
    });
    await page.goto("/");
    await waitForHydration(page);
  });

  test("hero sentence, header, and four-state rail fit without clipping", async ({
    page,
  }, testInfo) => {
    const heading = page.getByRole("heading", {
      level: 1,
      name: "English grows in company.",
    });
    const controls = page.getByRole("group", {
      name: "Choose how the conversation moves",
    });

    const geometry = await heading.evaluate((element) => {
      const viewportWidth = document.documentElement.clientWidth;
      const frame = element.closest(".page-container")?.getBoundingClientRect();
      const textLines = Array.from(element.querySelectorAll("span")).map((line) => {
        const range = document.createRange();
        range.selectNodeContents(line);
        const bounds = range.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right };
      });
      const header = document
        .querySelector(".header-inner")
        ?.getBoundingClientRect();
      const rail = document
        .querySelector('[role="group"][aria-label="Choose how the conversation moves"]')
        ?.getBoundingClientRect();
      const railElement = document.querySelector<HTMLElement>(
        '[role="group"][aria-label="Choose how the conversation moves"]',
      );

      return {
        viewportWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        frameLeft: frame?.left ?? -1,
        frameRight: frame?.right ?? viewportWidth + 1,
        headerLeft: header?.left ?? -1,
        headerRight: header?.right ?? viewportWidth + 1,
        railLeft: rail?.left ?? -1,
        railRight: rail?.right ?? viewportWidth + 1,
        railClientWidth: railElement?.clientWidth ?? 0,
        railScrollWidth: railElement?.scrollWidth ?? 1,
        textLines,
      };
    });

    expect(geometry.documentScrollWidth).toBeLessThanOrEqual(
      geometry.viewportWidth,
    );
    expect(geometry.frameLeft).toBeGreaterThanOrEqual(0);
    expect(geometry.frameRight).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.headerLeft).toBeGreaterThanOrEqual(0);
    expect(geometry.headerRight).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.railLeft).toBeGreaterThanOrEqual(0);
    expect(geometry.railRight).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.railScrollWidth).toBeLessThanOrEqual(
      geometry.railClientWidth,
    );
    expect(geometry.textLines).toHaveLength(2);
    for (const line of geometry.textLines) {
      expect(line.left).toBeGreaterThanOrEqual(geometry.frameLeft);
      expect(line.right).toBeLessThanOrEqual(geometry.frameRight);
    }

    await expectEveryTargetInsideViewport(controls.getByRole("button"), page);
    await expectEveryTargetInsideViewport(
      page.getByRole("button", { name: /navigation|theme/ }),
      page,
    );
    await expect(
      controls.getByRole("button", { name: "Try again" }),
    ).toBeInViewport();

    const evidenceName =
      testInfo.project.name === "narrow-chromium" ? "320" : "pixel7";
    await hideDevelopmentChrome(page);
    await page.screenshot({
      path: `docs/evidence/home-mobile-responsive-${evidenceName}-light.png`,
      animations: "disabled",
    });
  });

  test("home activity choices reflow instead of becoming a hidden horizontal rail", async ({
    page,
  }, testInfo) => {
    const activityControls = page.getByRole("group", {
      name: "Choose an activity theme",
    });
    await activityControls.scrollIntoViewIfNeeded();

    const geometry = await activityControls.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left: bounds.left,
        right: bounds.right,
        viewportWidth: document.documentElement.clientWidth,
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        columns: style.gridTemplateColumns.split(" ").filter(Boolean).length,
      };
    });

    expect(geometry.left).toBeGreaterThanOrEqual(0);
    expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth);
    expect(geometry.columns).toBe(2);
    await expectEveryTargetInsideViewport(
      activityControls.getByRole("button"),
      page,
    );

    const evidenceName =
      testInfo.project.name === "narrow-chromium" ? "320" : "pixel7";
    await hideDevelopmentChrome(page);
    await page.screenshot({
      path: `docs/evidence/home-mobile-responsive-${evidenceName}-activity-light.png`,
      animations: "disabled",
    });
  });
});

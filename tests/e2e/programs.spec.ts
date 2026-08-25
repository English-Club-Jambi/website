import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Programs public record", () => {
  test("keeps claims, sources, and touch interaction usable at every viewport", async ({
    page,
  }, testInfo) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    const response = await page.goto("/programs");
    expect(response?.ok()).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "English leaves the club room.",
      }),
    ).toBeVisible();
    await expect(page.getByText("88 Universitas Jambi students").first()).toBeVisible();

    const opening = page.getByRole("button", {
      name: /English Club Opening Day/,
    });
    await opening.scrollIntoViewIfNeeded();
    await expect(opening).toHaveAttribute("aria-expanded", "false");
    if (testInfo.project.name === "desktop-chromium") await opening.click();
    else await opening.tap();
    await expect(opening).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("link", {
        name: /UPT Library Universitas Jambi record/,
      }),
    ).toBeVisible();

    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      controls: Array.from(document.querySelectorAll("button, a"))
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        })
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
    }));
    expect(geometry.scrollWidth).toBe(geometry.clientWidth);
    for (const control of geometry.controls) {
      expect(Math.max(control.width, control.height)).toBeGreaterThanOrEqual(44);
    }

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(consoleErrors).toEqual([]);

    const suffix =
      testInfo.project.name === "desktop-chromium"
        ? "desktop"
        : testInfo.project.name === "mobile-chromium"
          ? "pixel7"
          : "320";
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `docs/evidence/programs/programs-${suffix}-light.png`,
      animations: "disabled",
      fullPage: true,
    });
  });

  test("keeps the open direction undated and honours reduced motion", async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/programs");
    const community = page.getByRole("button", {
      name: /Community English Service/,
    });
    await community.scrollIntoViewIfNeeded();
    if (testInfo.project.name === "desktop-chromium") await community.click();
    else await community.tap();
    const article = community.locator("xpath=ancestor::article");
    await expect(article.locator("time")).toHaveCount(0);
    await expect(article).toContainText("remains an open programme direction");
    await expect(
      article.getByRole("link", { name: /English Club Universitas Jambi mission/ }),
    ).toBeVisible();
    await expect(article).toHaveAttribute("data-state", "planned");
  });
});

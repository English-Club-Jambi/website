import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectTouchable(page: Page, locator: Locator) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  const hit = await locator.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const top = document.elementFromPoint(x, y);
    return {
      width: bounds.width,
      height: bounds.height,
      inside: top === element || (top !== null && element.contains(top)),
    };
  });
  expect(hit.width).toBeGreaterThanOrEqual(44);
  expect(hit.height).toBeGreaterThanOrEqual(44);
  expect(hit.inside).toBe(true);
}

test.describe("public Practice routes", () => {
  test("renders an honest Assessment Lab overview with a reusable Practice route", async ({
    page,
  }, testInfo) => {
    await page.goto("/practice");
    await expect(page).toHaveTitle(/Practice/);
    await expect(
      page.getByRole("heading", { name: "English Club Assessment Lab" }),
    ).toBeVisible();
    await expect(page.getByText(/not official scores or admission evidence/i)).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/TOEFL prediction|CEFR|certificate awarded/i);

    const practiceLink = page.getByRole("link", { name: "Practice", exact: true }).first();
    if (testInfo.project.name === "desktop-chromium") {
      await expect(practiceLink).toHaveAttribute("aria-current", "page");
    } else {
      await page.locator(".menu-trigger").click();
      const menuPractice = page.locator("#mobile-menu").getByRole("link", {
        name: "Practice",
        exact: true,
      });
      await expect(menuPractice).toHaveAttribute("aria-current", "page");
      await expectTouchable(page, menuPractice);
      await page.locator(".mobile-menu-close").click();
      await expect(page.locator("#mobile-menu")).not.toHaveAttribute("open", "");
    }

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    const accessibility = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      accessibility.violations.filter((violation) =>
        violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);

    await page.screenshot({
      path: `docs/evidence/practice-overview-${testInfo.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  });

  test("Home club quiz remains local, explicit, and usable at 320px", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "narrow-chromium", "320px interaction evidence");
    await page.goto("/");
    const quizTitle = page.getByRole("heading", { name: "What happens at English Club?" });
    await quizTitle.scrollIntoViewIfNeeded();
    await expect(quizTitle).toBeVisible();

    const start = page.getByRole("button", { name: "Start the club quiz" });
    await expectTouchable(page, start);
    await start.click();
    await expect(page.getByText("Question 1 of 4")).toBeVisible();

    const speak = page.getByRole("radio", { name: "Speak" });
    await expectTouchable(page, speak.locator("xpath=.."));
    await speak.check();
    await page.getByRole("button", { name: "Check answer" }).click();
    await expect(
      page
        .getByRole("region", { name: "What happens at English Club?" })
        .getByRole("status"),
    ).toContainText("That matches the activity page.");

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);

    await page.screenshot({
      path: "docs/evidence/programme-quiz-320.png",
      animations: "disabled",
    });
  });

  test("keeps the editorial title inside the content edge at 412px", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "narrow-chromium", "mid-phone geometry evidence");
    await page.setViewportSize({ width: 412, height: 915 });
    await page.goto("/practice");
    const title = page.getByRole("heading", { name: "English Club Assessment Lab" });
    await expect(title).toBeVisible();
    const bounds = await title.boundingBox();
    expect(bounds).not.toBeNull();
    expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(396.5);
    await page.screenshot({
      path: "docs/evidence/practice-overview-412.png",
      animations: "disabled",
    });
  });

  test("respects reduced motion without removing interaction", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "narrow-chromium", "reduced-motion phone evidence");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/practice");
    await expect(
      page.getByRole("heading", { name: "English Club Assessment Lab" }),
    ).toBeVisible();
    const duration = await page.locator("main").evaluate((element) =>
      getComputedStyle(element).transitionDuration,
    );
    expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
  });

  test("handles plausible but invalid attempt and result routes without a browser error", async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    for (const route of ["attempt", "result"] as const) {
      await page.goto(`/practice/${route}/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`);
      await expect(
        page.getByRole("heading", { name: /practice session is not available/i }),
      ).toBeVisible();
      await expect(page.getByRole("link", { name: "Return to Assessment Lab" })).toBeVisible();
    }
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
});

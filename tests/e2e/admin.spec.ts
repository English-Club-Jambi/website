import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("admin sign-in is isolated, operable, and responsive", async ({ page }, testInfo) => {
  const clientErrors: string[] = [];
  page.on("pageerror", (error) => clientErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") clientErrors.push(message.text());
  });
  const response = await page.goto("/admin");

  expect(response?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", { level: 1, name: "Return to the workspace." }),
  ).toBeVisible();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.locator(".site-header")).toHaveCount(0);
  await expect(page.locator(".site-footer")).toHaveCount(0);

  await expect(page.getByRole("button", { name: "Create an account" })).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: "Set up the first administrator account",
    }),
  ).toHaveCount(0);
  await expect(page.getByLabel("Display name")).toHaveCount(0);
  await expect(page.locator('input[name="flow"]')).toHaveValue("signIn");
  await expect(page.getByText("provisioned by the deployment operator")).toBeVisible();

  await page.getByLabel("Email address").fill("admin@example.org");
  await page.getByLabel("Password").fill("keyboard-touch-check");
  await expect(page.getByLabel("Email address")).toHaveValue("admin@example.org");
  await expect(page.getByLabel("Password")).toHaveValue("keyboard-touch-check");
  await page.getByLabel("Email address").clear();
  await page.getByLabel("Password").clear();

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  const controls = page.locator("button, input, a");
  for (let index = 0; index < await controls.count(); index += 1) {
    const control = controls.nth(index);
    if (!(await control.isVisible())) continue;
    const box = await control.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  expect(clientErrors).toEqual([]);

  await page.screenshot({
    path: `docs/evidence/admin/admin-sign-in-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

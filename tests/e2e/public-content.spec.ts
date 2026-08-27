import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/about",
  "/activities",
  "/members",
  "/journal",
  "/privacy",
  "/contact",
] as const;

test.describe("published content delivery", () => {
  for (const path of publicRoutes) {
    test(`${path} keeps metadata, organization copy, and a bounded mobile canvas`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 800 });
      const response = await page.goto(path);

      expect(response?.ok()).toBe(true);
      await expect(page.locator("main h1")).toBeVisible();
      await expect(page.locator('meta[name="description"]')).toHaveAttribute(
        "content",
        /^.{20,}$/,
      );

      const audit = await page.evaluate(() => ({
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        mainCopy: document.querySelector("main")?.textContent ?? "",
      }));
      expect(audit.scrollWidth).toBeLessThanOrEqual(audit.clientWidth);
      expect(audit.mainCopy).not.toMatch(
        /placeholder|sample data|preview only|synthetic slots|waiting for real names/i,
      );
    });
  }

  test("server-rendered copy stays interactive after hydration", async ({ page }) => {
    await page.goto("/");
    const group = page.getByRole("group", {
      name: "Choose how the conversation moves",
    });

    await group.getByRole("button", { name: "Listen" }).click();
    await expect(
      page.getByText("A useful answer starts by staying with someone else's words."),
    ).toBeVisible();
    await page.getByRole("button", { name: "New prompt" }).click();
    await expect(page.getByRole("status")).toContainText("Tell the table");
  });
});

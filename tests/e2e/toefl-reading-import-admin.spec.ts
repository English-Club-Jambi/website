import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const credentialPath = process.env.ADMIN_TOUCH_CREDENTIALS_PATH;

function credentials() {
  if (!credentialPath) throw new Error("ADMIN_TOUCH_CREDENTIALS_PATH is required.");
  const value = JSON.parse(readFileSync(credentialPath, "utf8")) as {
    email?: unknown;
    password?: unknown;
  };
  if (typeof value.email !== "string" || typeof value.password !== "string") {
    throw new Error("The admin credential file is invalid.");
  }
  return { email: value.email, password: value.password };
}

test.describe("imported TOEFL Reading bank", () => {
  test.skip(!credentialPath, "Requires an ignored development admin credential.");

  test("shows imported records as paused review work", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "One authenticated cloud read proves the import projection.",
    );
    const clientErrors: string[] = [];
    page.on("pageerror", (error) => clientErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") clientErrors.push(message.text());
    });

    const account = credentials();
    await page.goto("/admin");
    await expect(page.locator("html")).toHaveAttribute(
      "data-admin-hydrated",
      "true",
    );
    await page.getByLabel("Email address").fill(account.email);
    await page.getByLabel("Password").fill(account.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: /Welcome back,/ })).toBeVisible({
      timeout: 20_000,
    });

    await page.goto("/admin/assessments/questions");
    await expect(page.getByRole("heading", { name: "Question Bank" })).toBeVisible();
    await page.getByRole("combobox", { name: "Selection status" }).click();
    await page.getByRole("option", { name: "Paused", exact: true }).click();

    const bankList = page.getByRole("list", { name: "Question bank entries" });
    const rows = bankList.getByRole("listitem");
    await expect(rows).toHaveCount(20);
    await rows.first().getByRole("button").click();
    const editor = page.getByLabel("Selected question editor");
    await expect(editor.getByLabel("Question prompt")).not.toHaveValue("");
    await expect(editor.getByLabel("Tags")).toHaveValue(/imported-reading/);
    await expect(editor.getByLabel("Tags")).toHaveValue(/rights-review/);
    await expect(editor.getByText("Question Bank original", { exact: true })).toBeVisible();
    await expect(editor.getByRole("radio", { name: "Correct answer" })).toHaveCount(5);

    const accessibility = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      accessibility.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);
    const width = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
    expect(clientErrors).toEqual([]);
  });
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

type AdminCredentials = {
  email: string;
  password: string;
};

const credentialPath =
  process.env.ADMIN_JOURNAL_CREDENTIALS_PATH ??
  process.env.ADMIN_TOUCH_CREDENTIALS_PATH;

function readCredentials(): AdminCredentials {
  if (!credentialPath) {
    throw new Error("An admin credential file is required for the journal editor smoke test.");
  }
  const value = JSON.parse(readFileSync(credentialPath, "utf8")) as Partial<AdminCredentials>;
  if (typeof value.email !== "string" || typeof value.password !== "string") {
    throw new Error("The admin credential file must contain an email and password.");
  }
  return { email: value.email, password: value.password };
}

async function signIn(page: Page) {
  const credentials = readCredentials();
  await page.goto("/admin");
  await expect(page.locator("html")).toHaveAttribute(
    "data-admin-hydrated",
    "true",
  );
  await page.getByLabel("Email address").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: /Welcome back,/ })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("admin journal page editor", () => {
  test.describe.configure({ timeout: 60_000 });

  test.skip(
    !credentialPath,
    "Set ADMIN_JOURNAL_CREDENTIALS_PATH or ADMIN_TOUCH_CREDENTIALS_PATH to run this private gate.",
  );

  test("writes through block tools without boxing in the page", async ({ page }, testInfo) => {
    const clientErrors: string[] = [];
    page.on("pageerror", (error) => clientErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") clientErrors.push(message.text());
    });

    await signIn(page);
    await page.goto("/admin/journal/new");
    await expect(page.getByRole("heading", { level: 1, name: "New story" })).toBeVisible();

    const title = page.getByRole("textbox", { name: "Story title" });
    const standfirst = page.getByRole("textbox", { name: "Standfirst" });
    await title.fill("How a listening circle changed the room");
    await standfirst.fill(
      "Members slowed the conversation down, heard one another clearly, and found better questions together.",
    );

    const titleSurface = await title.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        borderBottom: style.borderBottomWidth,
        borderLeft: style.borderLeftWidth,
        borderRight: style.borderRightWidth,
        borderTop: style.borderTopWidth,
      };
    });
    expect(titleSurface).toEqual({
      background: "rgba(0, 0, 0, 0)",
      borderBottom: "0px",
      borderLeft: "0px",
      borderRight: "0px",
      borderTop: "0px",
    });

    const settings = page.getByText("Story settings", { exact: true });
    await settings.click();
    await expect(page.getByLabel("URL slug")).toBeVisible();
    await page.getByLabel("URL slug").fill("how-a-listening-circle-changed-the-room");
    await settings.click();

    const editor = page.getByRole("textbox", { name: "Journal body" });
    await editor.click();
    await editor.press("/");
    const blockMenu = page.getByRole("menu", { name: "Add a block" });
    await expect(blockMenu).toBeVisible();
    await expect(editor).not.toContainText("/");

    const menuItems = blockMenu.getByRole("menuitem");
    for (let index = 0; index < await menuItems.count(); index += 1) {
      const item = menuItems.nth(index);
      if (!(await item.isVisible()) || !(await item.isEnabled())) continue;
      const box = await item.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    }

    await page.screenshot({
      path: `docs/evidence/admin/journal-block-menu-${testInfo.project.name}.png`,
      fullPage: false,
      animations: "disabled",
    });

    await blockMenu.getByRole("menuitem", { name: /^Heading 2/ }).click();
    await editor.type("What the room noticed");
    await editor.press("Enter");
    await editor.type(
      "A pause stopped feeling like a mistake. It became enough room for the next person to finish a thought.",
    );
    await expect(editor.locator("h2")).toHaveText("What the room noticed");

    const bodyGeometry = await editor.evaluate((element) => {
      const section = element.closest("section");
      if (!(section instanceof HTMLElement)) return null;
      const style = getComputedStyle(section);
      return {
        borderLeft: style.borderLeftWidth,
        borderRight: style.borderRightWidth,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
      };
    });
    expect(bodyGeometry).toEqual({
      borderLeft: "0px",
      borderRight: "0px",
      borderRadius: "0px",
      boxShadow: "none",
    });

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    expect(clientErrors).toEqual([]);

    await page.getByRole("heading", { name: "Write on the page" }).scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    });

    await page.screenshot({
      path: `docs/evidence/admin/journal-block-editor-${testInfo.project.name}.png`,
      fullPage: false,
      animations: "disabled",
    });
  });
});

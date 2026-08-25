import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type AdminCredentials = {
  email: string;
  password: string;
};

const credentialPath = process.env.ADMIN_TOUCH_CREDENTIALS_PATH;

function readCredentials(): AdminCredentials {
  if (!credentialPath) {
    throw new Error("ADMIN_TOUCH_CREDENTIALS_PATH is required.");
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

test.describe("admin journal image upload", () => {
  test.skip(!credentialPath, "A private QA admin credential file is required.");

  test("uploads through the same-origin relay and reloads the verified R2 asset", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "One cloud upload proves this shared transport for every viewport.",
    );
    const clientErrors: string[] = [];
    let browserS3Requests = 0;
    page.on("pageerror", (error) => clientErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") clientErrors.push(message.text());
    });
    page.on("request", (request) => {
      if (new URL(request.url()).hostname.endsWith(".r2.cloudflarestorage.com")) {
        browserS3Requests += 1;
      }
    });

    await signIn(page);
    await page.goto("/admin/journal/new");
    await expect(page.locator("html")).toHaveAttribute(
      "data-admin-hydrated",
      "true",
    );

    const title = "What stayed after the listening circle";
    const standfirst =
      "A shared pause gave every speaker enough room to finish a thought and ask a better question.";
    const storyParagraph =
      "The group kept a record of the exchange so the next circle could begin with the questions that mattered most.";
    const slug = `what-stayed-after-the-listening-circle-${Date.now()}`;
    await page.getByLabel("Story title").fill(title);
    await page.getByLabel("Standfirst").fill(standfirst);
    await page.getByText("Story settings", { exact: true }).click();
    await page.getByLabel("URL slug").fill(slug);

    const editor = page.getByRole("textbox", { name: "Journal body" });
    await editor.click();
    await editor.type(storyParagraph);
    await editor.press("Enter");
    await editor.press("/");
    await page
      .getByRole("menu", { name: "Add a block" })
      .getByRole("menuitem", { name: /^Image/ })
      .click();

    const panel = page.getByRole("group", { name: "Add an image" });
    const alt = "A speaker addresses an English Club panel while participants listen";
    await panel
      .getByLabel("Image file")
      .setInputFiles(resolve("public/images/leeds-panel.webp"));
    await panel.getByRole("textbox", { name: "Alternative text" }).fill(alt);

    const relayResponse = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/admin/media-upload" &&
        response.request().method() === "POST",
    );
    await panel.getByRole("button", { name: "Upload and insert" }).click();
    expect((await relayResponse).status()).toBe(204);

    const inserted = editor.getByAltText(alt);
    await expect(inserted).toBeVisible({ timeout: 30_000 });
    await expect(inserted).toHaveAttribute(
      "src",
      /^https:\/\/r2\.mukhtada\.my\.id\/uploads\/journal-inline\//,
    );
    const publicMediaUrl = await inserted.getAttribute("src");
    expect(publicMediaUrl).not.toBeNull();
    expect(browserS3Requests).toBe(0);

    await page.getByRole("button", { name: "Save revision" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Edit story" })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page).not.toHaveURL(/\/admin\/journal\/new$/);
    const editUrl = page.url();
    await expect(page.getByText(/Working from revision 1\.|Draft revision 1 saved\./)).toBeVisible();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute(
      "data-admin-hydrated",
      "true",
    );
    await expect(page).toHaveURL(editUrl);
    await expect(page.getByLabel("Story title")).toHaveValue(title);
    await expect(page.getByLabel("Standfirst")).toHaveValue(standfirst);
    const reloadedEditor = page.getByRole("textbox", { name: "Journal body" });
    await expect(reloadedEditor).toContainText(storyParagraph);
    const reloadedImage = reloadedEditor.getByAltText(alt);
    await expect(reloadedImage).toBeVisible({ timeout: 20_000 });
    await expect(reloadedImage).toHaveAttribute("src", publicMediaUrl!);
    await reloadedImage.scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "docs/evidence/admin/journal-image-upload-success-desktop-chromium.png",
      animations: "disabled",
    });

    await page.getByRole("button", { name: "Archive", exact: true }).click();
    const storyDialog = page.getByRole("dialog", { name: "Archive this story?" });
    await storyDialog.getByRole("button", { name: "Archive story" }).click();
    await expect(page).toHaveURL(/\/admin\/journal$/, { timeout: 20_000 });

    const staleStoryButtons = page.getByRole("button", {
      name: `Archive ${title}`,
      exact: true,
    });
    while ((await staleStoryButtons.count()) > 0) {
      const previousCount = await staleStoryButtons.count();
      await staleStoryButtons.first().click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Archive story" })
        .click();
      await expect(staleStoryButtons).toHaveCount(previousCount - 1, {
        timeout: 20_000,
      });
    }
    await expect(staleStoryButtons).toHaveCount(0);

    await page.goto("/admin/media");
    await expect(page.getByRole("heading", { name: "Media library" })).toBeVisible();
    const statusFilter = page.getByRole("combobox", { name: "Status" });
    const matchingAssets = page.getByRole("article").filter({ hasText: alt });
    for (const statusLabel of [
      "Ready",
      "Pending verification",
      "Rejected",
    ]) {
      await statusFilter.click();
      await page.getByRole("option", { name: statusLabel, exact: true }).click();
      if (statusLabel === "Ready") {
        const asset = matchingAssets.first();
        await expect(asset).toBeVisible({ timeout: 20_000 });
        await expect(asset).toContainText("ready");
      }

      while ((await matchingAssets.count()) > 0) {
        const previousCount = await matchingAssets.count();
        const currentAsset = matchingAssets.first();
        await currentAsset.getByRole("button", { name: "Archive asset" }).click();
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("button", { name: "Archive asset" }).click();
        await expect(matchingAssets).toHaveCount(previousCount - 1, {
          timeout: 20_000,
        });
      }
      await expect(matchingAssets).toHaveCount(0);
    }
    expect(clientErrors).toEqual([]);
  });
});

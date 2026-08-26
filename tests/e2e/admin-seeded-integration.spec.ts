import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

import { captureAdminEvidence } from "./helpers/admin-evidence";

type AdminCredentials = {
  email: string;
  password: string;
};

const credentialPath = process.env.ADMIN_TOUCH_CREDENTIALS_PATH;
const seedIllustratedQuestion = process.env.SEED_ILLUSTRATED_QUESTION === "1";

function credentials(): AdminCredentials {
  if (!credentialPath) {
    throw new Error("ADMIN_TOUCH_CREDENTIALS_PATH is required.");
  }
  const value = JSON.parse(
    readFileSync(credentialPath, "utf8"),
  ) as Partial<AdminCredentials>;
  if (typeof value.email !== "string" || typeof value.password !== "string") {
    throw new Error("The credential file is invalid.");
  }
  return { email: value.email, password: value.password };
}

test.describe("seeded public and admin integration", () => {
  test.describe.configure({ timeout: 60_000 });
  test.skip(!credentialPath, "Requires a provisioned development admin.");

  test("shows the same cloud records in management and public views", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "One integrated cloud read is sufficient.",
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
    await expect(
      page.getByRole("heading", { name: /Welcome back,/ }),
    ).toBeVisible({
      timeout: 20_000,
    });

    await page.goto("/admin/assessments/questions");
    await expect(
      page.getByRole("heading", { name: "Question Bank" }),
    ).toBeVisible();
    const capacity = page
      .getByText("Full-practice capacity")
      .locator("xpath=ancestor::section");
    for (const [skill, required] of [
      ["Listening", 50],
      ["Structure", 40],
      ["Reading", 50],
    ] as const) {
      const capacityText = await capacity
        .getByText(skill, { exact: true })
        .locator("..")
        .textContent();
      const readyCount = Number(
        capacityText?.match(new RegExp(`(\\d+)\\s*\\/\\s*${required}`))?.[1],
      );
      expect(readyCount).toBeGreaterThanOrEqual(required);
    }
    const bankList = page.getByRole("list", { name: "Question bank entries" });
    await expect(bankList).toBeVisible();
    const bankRows = bankList.getByRole("listitem");
    await expect(bankRows).toHaveCount(20);
    const tags = page.getByLabel("Tags");
    let foundSeededQuestion = false;
    for (let index = 0; index < (await bankRows.count()); index += 1) {
      await bankRows.nth(index).getByRole("button").click();
      const value = await tags.inputValue();
      if (
        value.includes("original-question") &&
        value.includes("source-ets-itp-level-1-content")
      ) {
        foundSeededQuestion = true;
        break;
      }
    }
    expect(foundSeededQuestion).toBe(true);

    const taskFamily = page.getByRole("combobox", { name: "Task family" });
    await taskFamily.click();
    const taskFamilyList = page.getByRole("listbox");
    for (const group of ["Listening", "Structure and Written Expression", "Reading"]) {
      await expect(
        taskFamilyList.getByText(group, { exact: true }),
      ).toBeVisible();
    }
    const optionStates = await taskFamilyList
      .getByRole("option")
      .evaluateAll((options) =>
        options.map((option) => option.hasAttribute("data-disabled")),
    );
    expect(optionStates).toContain(true);
    expect(optionStates).toContain(false);
    await captureAdminEvidence(page, {
      path: "docs/evidence/admin/question-bank-task-family-groups-desktop-chromium.png",
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    const directEditor = page.getByLabel("Selected question editor");
    await expect(
      directEditor.getByRole("button", { name: "Save question revision" }),
    ).toBeVisible();
    await expect(
      directEditor.getByRole("link", { name: "Edit source" }),
    ).toHaveCount(0);
    const popupTrigger = directEditor.getByRole("button", {
      name: "Open popup",
    });
    await popupTrigger.click();
    const questionPopup = page.getByRole("dialog", {
      name: "Edit question in a focused workspace",
    });
    await expect(questionPopup).toBeVisible();
    await expect(questionPopup.getByLabel("Question prompt")).toBeVisible();
    const popupA11y = await new AxeBuilder({ page })
      .include("dialog")
      .analyze();
    expect(
      popupA11y.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);
    await questionPopup
      .getByRole("button", { name: "Close question popup" })
      .click();
    await expect(popupTrigger).toBeFocused();

    await captureAdminEvidence(page, {
      path: "docs/evidence/admin/question-bank-seeded-desktop-chromium.png",
      fullPage: true,
      animations: "disabled",
    });

    await page.getByRole("combobox", { name: "Skill" }).click();
    await page.getByRole("option", { name: "Listening" }).click();
    const listeningEditor = page.getByLabel("Selected question editor");
    await expect(
      listeningEditor.getByRole("combobox", { name: "Reviewed recording" }),
    ).toBeVisible();
    const audioPreview = listeningEditor.locator("audio");
    await expect(audioPreview).toHaveCount(1);
    await expect(audioPreview).toHaveAttribute(
      "src",
      /^https:\/\/r2\.mukhtada\.my\.id\//,
    );
    await captureAdminEvidence(page, {
      path: "docs/evidence/admin/question-bank-listening-editor-desktop-chromium.png",
      fullPage: true,
      animations: "disabled",
    });

    await page.goto("/admin/members");
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
    await expect(
      page.getByText("Matching / loaded").locator(".."),
    ).toContainText("15 / 15");
    await expect(
      page.getByRole("button", { name: /Nabila Maheswari/ }),
    ).toBeVisible();

    await page.goto("/members");
    await expect(page.getByText("15 members", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Nabila Maheswari" }),
    ).toBeVisible();

    await page.goto("/admin/journal");
    await page.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Published" }).click();
    await expect(
      page.getByText("A room made for trying again", { exact: true }),
    ).toBeVisible();
    const visibleJournalText = await page
      .getByText("Visible in this view")
      .locator("..")
      .textContent();
    const visibleJournalCount = Number(
      visibleJournalText?.match(/(\d+)\s+stories/)?.[1],
    );
    expect(visibleJournalCount).toBeGreaterThanOrEqual(3);

    await page.goto("/journal");
    await expect(
      page.getByRole("link", { name: "A room made for trying again" }),
    ).toBeVisible();

    await page.goto("/admin/programs");
    await expect(page.getByRole("heading", { name: "Programs" })).toBeVisible();
    await expect(page.getByText("Loaded records").locator("..")).toContainText(
      "6",
    );
    await expect(
      page.getByRole("button", {
        name: /Sharing Session with University of Leeds/,
      }),
    ).toBeVisible();

    await page.goto("/programs");
    await expect(
      page.getByRole("button", {
        name: /Sharing Session with University of Leeds/,
      }),
    ).toBeVisible();
    await expect(
      page.getByText("20 August 2025", { exact: true }),
    ).toBeVisible();

    await page.goto("/admin/appearance");
    await expect(
      page.getByRole("group", { name: "Colour schemes" }),
    ).toBeVisible();
    await expect(page.getByText("4 schemes", { exact: true })).toBeVisible();
    for (const scheme of [
      "Relay Cobalt",
      "Field Notes",
      "After Class",
      "Tide Room",
    ]) {
      await expect(
        page.getByRole("button", { name: new RegExp(scheme) }),
      ).toBeVisible();
    }

    const accessibility = await new AxeBuilder({ page })
      .include("main")
      .analyze();
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

  test("opens a reusable question builder with reviewed R2 image and audio controls", async ({
    page,
  }, testInfo) => {
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
    await expect(
      page.getByRole("heading", { name: /Welcome back,/ }),
    ).toBeVisible({
      timeout: 20_000,
    });

    await page.goto("/admin/assessments/questions");
    await page.getByRole("button", { name: "Add question" }).click();
    const builder = page.getByRole("form", { name: "Author a bank question" });
    await expect(builder).toBeVisible();
    await expect(builder.getByLabel("Question prompt")).toBeVisible();
    await expect(
      builder.getByRole("button", { name: "No illustration" }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      builder.getByRole("button", { name: "Upload to R2" }),
    ).toBeDisabled();

    await builder.getByRole("combobox", { name: "Task family" }).click();
    const taskFamilyList = page.getByRole("listbox");
    for (const group of ["Listening", "Structure and Written Expression", "Reading"]) {
      await expect(
        taskFamilyList.getByText(group, { exact: true }),
      ).toBeVisible();
    }
    await page.keyboard.press("Escape");

    await builder.getByRole("combobox", { name: "Skill" }).click();
    await page.getByRole("option", { name: "Listening" }).click();
    await expect(
      builder.getByRole("combobox", { name: "Reviewed recording" }),
    ).toBeVisible();
    await expect(builder.getByLabel("Audio file")).toHaveAttribute(
      "accept",
      "audio/mpeg,audio/mp4,audio/ogg,audio/webm",
    );
    await expect(
      builder.getByRole("button", { name: "Upload audio to R2" }),
    ).toBeDisabled();
    await builder.getByRole("combobox", { name: "Reviewed recording" }).click();
    const audioOptions = page.getByRole("option");
    expect(await audioOptions.count()).toBeGreaterThan(1);
    await audioOptions.nth(1).click();
    const audioPreview = builder.locator("audio");
    await expect(audioPreview).toHaveCount(1);
    await expect(audioPreview).toHaveAttribute(
      "src",
      /^https:\/\/r2\.mukhtada\.my\.id\//,
    );
    await builder.getByLabel("Audio file").setInputFiles({
      name: "question-bank-upload-check.mp3",
      mimeType: "audio/mpeg",
      buffer: Buffer.from("ID3 question bank browser upload check"),
    });
    await builder
      .getByLabel("Accessible description")
      .fill("Two members arrange the next conversation circle");
    await expect(
      builder.getByRole("button", { name: "Upload audio to R2" }),
    ).toBeEnabled();

    const targets = await builder.getByRole("button").evaluateAll((buttons) =>
      buttons.map((button) => {
        const box = button.getBoundingClientRect();
        return {
          width: box.width,
          height: box.height,
          label: button.textContent,
        };
      }),
    );
    expect(
      targets
        .filter((target) => target.width > 0 && target.height > 0)
        .every((target) => target.height >= 44),
    ).toBe(true);
    const width = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
    const accessibility = await new AxeBuilder({ page })
      .include("main")
      .analyze();
    expect(
      accessibility.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);
    await captureAdminEvidence(page, {
      path: `docs/evidence/admin/question-bank-add-${testInfo.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(clientErrors).toEqual([]);
  });

  test("authors and activates one illustrated development question through the admin UI", async ({
    page,
  }, testInfo) => {
    test.skip(
      !seedIllustratedQuestion,
      "Explicit illustrated-question seed only.",
    );
    test.skip(testInfo.project.name !== "desktop-chromium", "Seed once.");
    test.setTimeout(90_000);
    const account = credentials();
    const prompt =
      "Which caption best describes the scene in the illustration?";
    await page.goto("/admin");
    await expect(page.locator("html")).toHaveAttribute(
      "data-admin-hydrated",
      "true",
    );
    await page.getByLabel("Email address").fill(account.email);
    await page.getByLabel("Password").fill(account.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(
      page.getByRole("heading", { name: /Welcome back,/ }),
    ).toBeVisible({
      timeout: 20_000,
    });
    await page.goto("/admin/assessments/questions");
    const bankList = page.getByRole("list", { name: "Question bank entries" });
    await expect(bankList).toBeVisible({ timeout: 20_000 });
    if (
      await bankList
        .getByText(prompt, { exact: true })
        .isVisible()
        .catch(() => false)
    ) {
      await bankList.getByText(prompt, { exact: true }).click();
      const selectedImage = page
        .getByLabel("Selected question editor")
        .locator('button[aria-pressed="true"] img');
      const selectedSource = await selectedImage.getAttribute("src");
      const selectedPublicUrl = selectedSource
        ? (new URL(selectedSource, "http://127.0.0.1:3987").searchParams.get(
            "url",
          ) ?? selectedSource)
        : null;
      if (selectedPublicUrl !== null) {
        await page.goto("/admin/media");
        await page
          .getByRole("combobox", { name: "Purpose", exact: true })
          .click();
        await page
          .getByRole("option", { name: "Question illustration" })
          .click();
        const duplicateCards = page.locator("article").filter({
          hasText: "conversation-hero-placeholder.webp",
        });
        await expect(duplicateCards.first()).toBeVisible({ timeout: 20_000 });
        const duplicateCount = await duplicateCards.count();
        for (let index = 0; index < duplicateCount; index += 1) {
          const card = duplicateCards.nth(index);
          const source = await card.locator("img").getAttribute("src");
          const publicUrl = source
            ? (new URL(source, "http://127.0.0.1:3987").searchParams.get(
                "url",
              ) ?? source)
            : null;
          if (publicUrl !== null && publicUrl !== selectedPublicUrl) {
            await card.getByRole("button", { name: "Archive asset" }).click();
            await page
              .getByRole("dialog")
              .getByRole("button", { name: "Archive asset" })
              .click();
            await expect(duplicateCards).toHaveCount(duplicateCount - 1, {
              timeout: 20_000,
            });
            break;
          }
        }
      }
      await page.goto("/admin/assessments/questions");
      await expect(
        page
          .getByRole("list", { name: "Question bank entries" })
          .getByText(prompt, { exact: true }),
      ).toBeVisible({ timeout: 20_000 });
      await page
        .getByRole("list", { name: "Question bank entries" })
        .getByText(prompt, { exact: true })
        .click();
      await captureAdminEvidence(page, {
        path: "docs/evidence/admin/question-bank-illustrated-seed-desktop-chromium.png",
        fullPage: true,
        animations: "disabled",
      });
      return;
    }

    await page.getByRole("button", { name: "Add question" }).click();
    const builder = page.getByRole("form", { name: "Author a bank question" });
    await builder.getByRole("combobox", { name: "Task family" }).click();
    await page.getByRole("option", { name: "Read in daily life" }).click();
    await builder.getByLabel("Question prompt").fill(prompt);
    await builder
      .getByLabel("Answer A")
      .fill("A small group exchanges ideas around a table.");
    await builder
      .getByLabel("Answer B")
      .fill("A lecturer addresses a crowded auditorium.");
    await builder
      .getByLabel("Answer C")
      .fill("One student studies alone in a library aisle.");
    await builder
      .getByLabel("Answer D")
      .fill("Several travellers wait beside a station platform.");
    await builder.getByLabel("Tags").fill("visual-reading, group-discussion");
    await builder
      .getByLabel("Answer note")
      .fill(
        "The people are seated together, facing one another, and taking turns in a shared discussion.",
      );
    await builder
      .getByLabel("Image file")
      .setInputFiles("public/images/conversation-hero-placeholder.webp");
    await builder
      .getByLabel("Alternative text")
      .fill("Four learners exchanging ideas around a table in a bright room");
    await builder.getByRole("button", { name: "Upload to R2" }).click();
    await expect(
      builder.locator('button[aria-pressed="true"]', {
        hasText: "conversation-hero-placeholder",
      }),
    ).toHaveAttribute("aria-pressed", "true", { timeout: 30_000 });
    await builder
      .getByRole("button", { name: "Create paused question" })
      .click();

    await expect(
      page.getByRole("form", { name: "Author a bank question" }),
    ).toBeHidden({
      timeout: 20_000,
    });
    await expect(bankList.getByText(prompt, { exact: true })).toBeVisible();
    const editor = page.getByLabel("Selected question editor");
    await editor.getByRole("combobox", { name: "Status" }).click();
    await page.getByRole("option", { name: "Ready for selection" }).click();
    await editor.getByRole("button", { name: "Save review settings" }).click();
    await page.getByRole("combobox", { name: "Selection status" }).click();
    await page.getByRole("option", { name: "Ready for selection" }).click();
    await expect(bankList.getByText(prompt, { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await captureAdminEvidence(page, {
      path: "docs/evidence/admin/question-bank-illustrated-seed-desktop-chromium.png",
      fullPage: true,
      animations: "disabled",
    });
  });
});

import AxeBuilder from "@axe-core/playwright";
import { existsSync, readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

import { captureAdminEvidence } from "./helpers/admin-evidence";

type AdminCredentials = { email: string; password: string };

const credentialPath = existsSync(".qa-admin-credentials.json")
  ? ".qa-admin-credentials.json"
  : undefined;

function credentials(): AdminCredentials {
  if (!credentialPath) {
    throw new Error("An ignored QA admin credential file is required.");
  }
  const parsed = JSON.parse(
    readFileSync(credentialPath, "utf8"),
  ) as Partial<AdminCredentials>;
  if (!parsed.email?.trim() || !parsed.password) {
    throw new Error("The QA admin credential file is incomplete.");
  }
  return { email: parsed.email.trim(), password: parsed.password };
}

async function signIn(page: Page) {
  await page.goto("/admin");
  await expect(page.locator("html")).toHaveAttribute(
    "data-admin-hydrated",
    "true",
  );
  const email = page.getByLabel("Email address");
  if (await email.isVisible()) {
    const account = credentials();
    await email.fill(account.email);
    await page.getByLabel("Password").fill(account.password);
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await expect(
    page.getByRole("heading", { name: /Welcome back,/ }),
  ).toBeVisible({
    timeout: 20_000,
  });
}

async function expectNoSeriousAccessibilityIssues(page: Page) {
  const accessibility = await new AxeBuilder({ page })
    .include("main")
    .analyze();
  expect(
    accessibility.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
}

async function expectNoDocumentOverflow(page: Page) {
  const width = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(width.scroll).toBeLessThanOrEqual(width.client + 1);
}

async function openAQuestionPool(page: Page) {
  await page.goto("/admin/assessments");
  await expect(
    page.getByRole("heading", { name: "Practice Builder" }),
  ).toBeVisible();

  const seededListeningFormat = page.getByRole("link", {
    name: /^Quick Listening: Campus Voices/,
  });
  await expect(seededListeningFormat).toBeVisible({ timeout: 20_000 });
  await seededListeningFormat.click();
  await expect(
    page.getByRole("button", { name: /^Review question \d+:/ }).first(),
  ).toBeVisible({ timeout: 20_000 });
}

test.describe("question administration", () => {
  test.describe.configure({ timeout: 90_000 });
  test.skip(
    !credentialPath,
    "Provide .qa-admin-credentials.json for admin QA.",
  );

  test("paginates the Question Bank and exposes guarded deletion", async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await signIn(page);
    await page.goto("/admin/assessments/questions");
    await expect(
      page.getByRole("heading", { name: "Question Bank" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("list", { name: "Question bank entries" })
        .getByRole("listitem"),
    ).toHaveCount(20);
    await expect(
      page.getByRole("button", { name: "Delete question" }),
    ).toBeVisible();

    const pageTwo = page.getByRole("button", { name: "Go to page 2" });
    await expect(pageTwo).toHaveCSS("min-width", "44px");
    await pageTwo.click();
    await expect(
      page.getByRole("button", { name: "Page 2, current page" }),
    ).toHaveAttribute("aria-current", "page");
    await expect(
      page
        .getByRole("list", { name: "Question bank entries" })
        .getByRole("listitem"),
    ).toHaveCount(20);

    await expectNoDocumentOverflow(page);
    await expectNoSeriousAccessibilityIssues(page);
    await captureAdminEvidence(page, {
      path: `docs/evidence/admin/question-bank-pages-${testInfo.project.name}.png`,
      animations: "disabled",
    });
    expect(errors).toEqual([]);
  });

  test("reviews complete question data and playable Listening audio", async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await signIn(page);
    await openAQuestionPool(page);

    const pool = page
      .getByRole("heading", { name: "Questions allowed in this format" })
      .locator("xpath=ancestor::section");

    const reviewTrigger = pool
      .getByRole("button", { name: /^Review question \d+:/ })
      .first();
    await reviewTrigger.click();

    const dialog = page.getByRole("dialog", { name: "Review question" });
    await expect(dialog).toHaveAttribute("open");
    await expect(dialog.getByText("Correct answer").first()).toBeVisible();
    const audio = dialog.locator("audio");
    await expect(audio).toHaveCount(1);
    await expect(audio).toHaveAttribute("controls", "");
    await expect(audio).toHaveAttribute("preload", "metadata");
    const source = await audio.getAttribute("src");
    expect(source).toMatch(/^https:\/\/r2\.mukhtada\.my\.id\//);
    const response = await page.request.get(source!);
    expect(response.ok()).toBe(true);

    const close = dialog.getByRole("button", { name: "Close question review" });
    const closeBox = await close.boundingBox();
    expect(closeBox?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(closeBox?.height ?? 0).toBeGreaterThanOrEqual(44);
    await expectNoDocumentOverflow(page);
    await expectNoSeriousAccessibilityIssues(page);

    await captureAdminEvidence(page, {
      path: `docs/evidence/admin/question-review-${testInfo.project.name}.png`,
      animations: "disabled",
    });

    await close.click();
    await expect(reviewTrigger).toBeFocused();
    expect(errors).toEqual([]);
  });
});

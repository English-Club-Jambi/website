import AxeBuilder from "@axe-core/playwright";
import { existsSync, readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { captureAdminEvidence } from "./helpers/admin-evidence";

type AdminCredentials = { email: string; password: string };

const credentialPath =
  process.env.ADMIN_CONTACT_CREDENTIALS_PATH ??
  (existsSync(".qa-admin-credentials.json")
    ? ".qa-admin-credentials.json"
    : undefined);

function credentials(): AdminCredentials {
  if (!credentialPath) throw new Error("Contact desk QA credentials are required.");
  const parsed = JSON.parse(readFileSync(credentialPath, "utf8")) as Partial<AdminCredentials>;
  if (!parsed.email?.trim() || !parsed.password) {
    throw new Error("Contact desk QA credentials are incomplete.");
  }
  return { email: parsed.email.trim(), password: parsed.password };
}

async function activate(locator: Locator, hasTouch: boolean) {
  await expect(locator).toBeVisible();
  if (hasTouch) await locator.tap();
  else await locator.click();
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
  await expect(page.getByRole("heading", { name: /Welcome back,/ })).toBeVisible({
    timeout: 20_000,
  });
}

test.describe("admin contact desk", () => {
  test.skip(!credentialPath, "Provide an ignored QA admin credential file.");

  test("keeps contact routes explicit, private, responsive, and touchable", async ({
    page,
  }, testInfo) => {
    const clientErrors: string[] = [];
    page.on("pageerror", (error) => clientErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") clientErrors.push(message.text());
    });

    await signIn(page);
    await page.goto("/admin/contacts");
    await expect(page.getByRole("heading", { name: "Contact desk" })).toBeVisible();

    for (const label of [
      "Join the club",
      "Propose something together",
      "Ask a question",
    ]) {
      const route = page.getByRole("button", { name: label, exact: true });
      const box = await route.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      await activate(route, Boolean(testInfo.project.use.hasTouch));
      await expect(route).toHaveAttribute("aria-pressed", "true");
    }

    const status = page.getByRole("combobox", { name: "Work status" });
    await activate(status, Boolean(testInfo.project.use.hasTouch));
    await activate(
      page.getByRole("option", { name: "Needs review" }),
      Boolean(testInfo.project.use.hasTouch),
    );
    await expect(status).toContainText("Needs review");

    await activate(status, Boolean(testInfo.project.use.hasTouch));
    await activate(
      page.getByRole("option", { name: "All statuses" }),
      Boolean(testInfo.project.use.hasTouch),
    );

    const rows = page.locator('[aria-label="Contact messages"] > button');
    if ((await rows.count()) > 0) {
      await activate(rows.first(), Boolean(testInfo.project.use.hasTouch));
      await expect(page.getByRole("link", { name: /Write an email to/ })).toBeVisible();
      await expect(page.getByRole("combobox", { name: "Record work status" })).toBeVisible();
    } else {
      await expect(page.getByText("No messages in this view")).toBeVisible();
    }

    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);

    const accessibility = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      accessibility.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);
    expect(clientErrors).toEqual([]);

    await captureAdminEvidence(page, {
      path: `docs/evidence/admin/contact-desk-${testInfo.project.name}.png`,
      animations: "disabled",
      mask: [page.locator("[data-contact-pii]")],
      maskColor: "#dce4ff",
    });
  });
});

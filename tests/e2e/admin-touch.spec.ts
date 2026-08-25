import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

type AdminCredentials = {
  email: string;
  password: string;
};

type TouchTrace = {
  type: string;
  target: string;
  pointerType: string | null;
  defaultPrevented: boolean;
};

declare global {
  interface Window {
    __adminTouchTrace: TouchTrace[];
  }
}

const credentialPath = process.env.ADMIN_TOUCH_CREDENTIALS_PATH;
const touchBaseUrl = process.env.ADMIN_TOUCH_BASE_URL;

function getCredentials(): AdminCredentials {
  if (!credentialPath) {
    throw new Error("ADMIN_TOUCH_CREDENTIALS_PATH is required for the private admin touch smoke test.");
  }

  const parsed = JSON.parse(readFileSync(credentialPath, "utf8")) as Partial<AdminCredentials>;
  if (typeof parsed.email !== "string" || typeof parsed.password !== "string") {
    throw new Error("The private credential file does not contain an email and password.");
  }
  return { email: parsed.email, password: parsed.password };
}

async function installTouchTrace(page: Page) {
  await page.addInitScript(() => {
    window.__adminTouchTrace = [];
    const eventNames = [
      "touchstart",
      "touchend",
      "pointerdown",
      "pointerup",
      "click",
    ] as const;

    for (const type of eventNames) {
      document.addEventListener(
        type,
        (event) => {
          const target = event.target;
          const element = target instanceof Element ? target : null;
          window.__adminTouchTrace.push({
            type,
            target:
              element?.closest("button, a, input, [role]")?.getAttribute("aria-label") ??
              element?.closest("button, a, input, [role]")?.tagName.toLowerCase() ??
              element?.tagName.toLowerCase() ??
              "unknown",
            pointerType:
              "pointerType" in event && typeof event.pointerType === "string"
                ? event.pointerType
                : null,
            defaultPrevented: event.defaultPrevented,
          });
        },
        { capture: true },
      );
    }
  });
}

async function expectCenterHitTarget(locator: Locator) {
  await expect(locator).toBeVisible();
  await locator.scrollIntoViewIfNeeded();
  const geometry = await locator.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const center = document.elementFromPoint(
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2,
    );
    return {
      height: bounds.height,
      hit: center === element || element.contains(center),
      width: bounds.width,
    };
  });
  expect(geometry.hit).toBe(true);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.width).toBeGreaterThanOrEqual(44);
}

async function expectTouchClickTrace(page: Page, locator: Locator) {
  await page.evaluate(() => {
    window.__adminTouchTrace = [];
  });
  await expectCenterHitTarget(locator);
  await locator.tap();
  const trace = await page.evaluate(() => window.__adminTouchTrace);
  const types = new Set(trace.map((entry) => entry.type));
  expect(types).toEqual(
    new Set(["touchstart", "touchend", "pointerdown", "pointerup", "click"]),
  );
  expect(trace.some((entry) => entry.pointerType === "touch")).toBe(true);
}

test.describe("private authenticated admin touch smoke", () => {
  test.skip(
    !credentialPath || !touchBaseUrl,
    "Set private credential and LAN base URL environment variables to run this gate.",
  );

  test("touch operates sign-in, mobile navigation, selects, theme controls, and editor panels", async ({
    page,
  }, testInfo) => {
    test.skip(!testInfo.project.use.hasTouch, "This gate requires a real Playwright touchscreen context.");

    const failedAssets: string[] = [];
    const clientErrors: string[] = [];
    page.on("response", (response) => {
      if (response.status() >= 400 && response.url().includes("/_next/")) {
        failedAssets.push(`${response.status()} ${new URL(response.url()).pathname}`);
      }
    });
    page.on("pageerror", (error) => clientErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") clientErrors.push(message.text());
    });
    await installTouchTrace(page);

    const credentials = getCredentials();
    await page.goto(new URL("/admin", touchBaseUrl).toString());

    const email = page.getByLabel("Email address");
    const password = page.getByLabel("Password");
    await expectCenterHitTarget(email);
    await email.tap();
    await email.fill(credentials.email);
    await expectCenterHitTarget(password);
    await password.tap();
    await password.fill(credentials.password);

    const signIn = page.getByRole("button", { name: "Sign in" });
    await expectTouchClickTrace(page, signIn);
    await expect(page.getByRole("heading", { name: /Welcome back,/ })).toBeVisible({
      timeout: 20_000,
    });

    const menuTrigger = page.getByRole("button", { name: "Open admin navigation" });
    await expectTouchClickTrace(page, menuTrigger);
    const menu = page.getByRole("dialog", { name: "Administration" });
    await expect(menu).toBeVisible();

    const pagesLink = menu.getByRole("link", { name: /Pages/ });
    await expectTouchClickTrace(page, pagesLink);
    await expect(page).toHaveURL(/\/admin\/pages$/);
    await expect(page.getByRole("heading", { name: "Page copy" })).toBeVisible();

    const pageSelect = page.getByRole("combobox", { name: "Page" });
    await expectTouchClickTrace(page, pageSelect);
    const aboutOption = page.getByRole("option", { name: "About" });
    await expectTouchClickTrace(page, aboutOption);
    await expect(pageSelect).toHaveText(/About/);

    await expectTouchClickTrace(page, menuTrigger);
    const appearanceLink = menu.getByRole("link", { name: /Appearance/ });
    await expectTouchClickTrace(page, appearanceLink);
    await expect(page).toHaveURL(/\/admin\/appearance$/);
    await expect(page.getByRole("heading", { name: "Appearance" })).toBeVisible();

    const darkMode = page.getByRole("button", { name: "dark" });
    if (await darkMode.count()) {
      await expectTouchClickTrace(page, darkMode);
      await expect(darkMode).toHaveAttribute("aria-pressed", "true");
    }

    await expectTouchClickTrace(page, menuTrigger);
    const journalLink = menu.getByRole("link", { name: /Journal/ });
    await expectTouchClickTrace(page, journalLink);
    await expect(page).toHaveURL(/\/admin\/journal$/);

    const newStory = page.getByRole("link", { name: "New story" });
    await expectTouchClickTrace(page, newStory);
    await expect(page).toHaveURL(/\/admin\/journal\/new$/);

    const editorLink = page.getByRole("button", { name: "Link" });
    await expect(editorLink).toBeEnabled({ timeout: 20_000 });
    await expectTouchClickTrace(page, editorLink);
    await expect(page.getByText("Add a link", { exact: true })).toBeVisible();

    await page.screenshot({
      path: `docs/evidence/admin/admin-owner-touch-${testInfo.project.name}.png`,
      animations: "disabled",
    });

    const closeLinkPanel = page.getByRole("button", { name: "Close link panel" });
    await expectTouchClickTrace(page, closeLinkPanel);
    await expect(page.getByText("Add a link", { exact: true })).toHaveCount(0);

    expect(failedAssets).toEqual([]);
    expect(clientErrors).toEqual([]);

    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);

  });
});

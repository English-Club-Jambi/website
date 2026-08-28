import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

import { captureAdminEvidence } from "./helpers/admin-evidence";

type AdminCredentials = {
  email: string;
  password: string;
};

const credentialPath =
  process.env.ADMIN_CURRENT_FIXES_CREDENTIALS_PATH ??
  process.env.ADMIN_TOUCH_CREDENTIALS_PATH;

function readCredentials(): AdminCredentials | null {
  if (credentialPath) {
    const value = JSON.parse(readFileSync(credentialPath, "utf8")) as Partial<AdminCredentials>;
    if (value.email?.trim() && value.password?.trim()) {
      return { email: value.email.trim(), password: value.password };
    }
    throw new Error(`Admin credentials in ${credentialPath} are incomplete.`);
  }

  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD?.trim();
  return email && password ? { email, password } : null;
}

const adminCredentials = readCredentials();

async function signIn(page: Page) {
  await page.goto("/admin");
  await expect(page.locator("html")).toHaveAttribute(
    "data-admin-hydrated",
    "true",
  );
  const email = page.getByLabel("Email address");
  if (await email.isVisible()) {
    if (!adminCredentials) {
      throw new Error("Admin credentials are required for this private gate.");
    }
    await email.fill(adminCredentials.email);
    await page.getByLabel("Password").fill(adminCredentials.password);
    await page.getByRole("button", { name: "Sign in" }).click();
  }
  await expect(page.getByRole("heading", { name: /Welcome back,/ })).toBeVisible({
    timeout: 20_000,
  });
}

async function activate(locator: Locator, projectName: string) {
  await expect(locator).toBeVisible();
  if (projectName === "desktop-chromium") {
    await locator.click();
  } else {
    await locator.tap();
  }
}

async function expectHealthyAdminPage(page: Page, clientErrors: string[]) {
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
}

test.describe("current administration fixes", () => {
  test.skip(
    !adminCredentials,
    "Set ADMIN_CURRENT_FIXES_CREDENTIALS_PATH or ADMIN_TOUCH_CREDENTIALS_PATH.",
  );

  test("keeps the Page Copy field rail independent from its editor", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium",
      "The independent two-pane workspace is a desktop contract.",
    );
    const clientErrors: string[] = [];
    page.on("pageerror", (error) => clientErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") clientErrors.push(message.text());
    });

    await signIn(page);
    await page.goto("/admin/pages");
    await expect(page.getByRole("heading", { name: "Page copy" })).toBeVisible();

    const rail = page.getByRole("region", { name: "Home content fields" });
    const canvas = page.getByRole("region", { name: /^Editing / });
    await expect(rail).toBeVisible();
    await expect(canvas).toBeVisible();

    const before = await page.evaluate(() => {
      const fieldRail = document.querySelector<HTMLElement>(
        '[aria-label="Home content fields"]',
      );
      const editor = document.querySelector<HTMLElement>(
        '[aria-label^="Editing "]',
      );
      if (!fieldRail || !editor) return null;
      return {
        documentTop: window.scrollY,
        railTop: fieldRail.scrollTop,
        railClientHeight: fieldRail.clientHeight,
        railScrollHeight: fieldRail.scrollHeight,
        editorTop: editor.scrollTop,
        editorClientHeight: editor.clientHeight,
      };
    });
    expect(before).not.toBeNull();
    expect(before?.railScrollHeight ?? 0).toBeGreaterThan(
      before?.railClientHeight ?? 0,
    );
    expect(before?.editorClientHeight ?? 0).toBeGreaterThan(0);

    await rail.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event("scroll", { bubbles: false }));
    });
    const after = await page.evaluate(() => {
      const fieldRail = document.querySelector<HTMLElement>(
        '[aria-label="Home content fields"]',
      );
      const editor = document.querySelector<HTMLElement>(
        '[aria-label^="Editing "]',
      );
      return {
        documentTop: window.scrollY,
        railTop: fieldRail?.scrollTop ?? -1,
        editorTop: editor?.scrollTop ?? -1,
      };
    });
    expect(after.railTop).toBeGreaterThan(0);
    expect(after.editorTop).toBe(before?.editorTop);
    expect(after.documentTop).toBe(before?.documentTop);

    const lastField = rail.getByRole("button").last();
    const selectedLabel = (await lastField.getByRole("strong").textContent())?.trim();
    await lastField.focus();
    await page.keyboard.press("Enter");
    await expect(lastField).toHaveAttribute("aria-current", "true");
    await expect(
      page.getByRole("region", { name: `Editing ${selectedLabel}` }),
    ).toBeVisible();
    await expect.poll(() => rail.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);

    await captureAdminEvidence(page, {
      path: "docs/evidence/admin/page-copy-independent-scroll-desktop-chromium.png",
      animations: "disabled",
    });
    await expectHealthyAdminPage(page, clientErrors);
  });

  test("keeps Page Copy selection usable on touch layouts", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop-chromium",
      "Desktop uses the independent two-pane workspace.",
    );
    const clientErrors: string[] = [];
    page.on("pageerror", (error) => clientErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") clientErrors.push(message.text());
    });

    await signIn(page);
    await page.goto("/admin/pages");
    await expect(page.getByRole("heading", { name: "Page copy" })).toBeVisible();

    const contentPicker = page.getByRole("combobox", { name: "Content field" });
    await activate(contentPicker, testInfo.project.name);
    const lastOption = page.getByRole("option").last();
    const selectedLabel = (await lastOption.textContent())?.trim();
    await activate(lastOption, testInfo.project.name);

    await expect(contentPicker).toContainText(selectedLabel ?? "");
    await expect(
      page.getByRole("region", { name: `Editing ${selectedLabel}` }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Home content fields" })).toBeHidden();

    await captureAdminEvidence(page, {
      path: `docs/evidence/admin/page-copy-touch-picker-${testInfo.project.name}.png`,
      animations: "disabled",
    });
    await expectHealthyAdminPage(page, clientErrors);
  });

  test("filters profiles and exposes the managed division catalogue", async ({
    page,
  }, testInfo) => {
    const clientErrors: string[] = [];
    page.on("pageerror", (error) => clientErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") clientErrors.push(message.text());
    });

    await signIn(page);
    await page.goto("/admin/members");
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();
    await expect(page.getByText("Matching / loaded").locator("..")).toContainText(
      "15 / 15",
    );

    const role = page.getByRole("combobox", { name: "Role" });
    const coordinatorOption = page.getByRole("option", { name: "Coordinator" });
    if (testInfo.project.name === "desktop-chromium") {
      await role.focus();
      await page.keyboard.press("Enter");
      await expect(coordinatorOption).toBeVisible();
      await coordinatorOption.focus();
      await page.keyboard.press("Enter");
    } else {
      await activate(role, testInfo.project.name);
      await activate(coordinatorOption, testInfo.project.name);
    }
    await expect(page.getByText("Matching / loaded").locator("..")).toContainText(
      "5 / 15",
    );

    const assignment = page.getByRole("combobox", {
      name: "Division or position",
    });
    const academicOption = page.getByRole("option", { name: "Academic" });
    if (testInfo.project.name === "desktop-chromium") {
      await assignment.focus();
      await page.keyboard.press("Enter");
      await expect(academicOption).toBeVisible();
      await academicOption.focus();
      await page.keyboard.press("Enter");
    } else {
      await activate(assignment, testInfo.project.name);
      await activate(academicOption, testInfo.project.name);
    }
    await expect(page.getByText("Matching / loaded").locator("..")).toContainText(
      "1 / 15",
    );

    await activate(
      page.getByRole("button", { name: "Divisions" }),
      testInfo.project.name,
    );
    await expect(page.getByText("Managed divisions").locator("..")).toContainText(
      "5",
    );
    await activate(
      page.getByRole("button", { name: /^Academic/ }),
      testInfo.project.name,
    );
    await expect(page.getByRole("combobox", { name: "Coordinator" })).toBeVisible();
    await expect(page.getByText(/Member assignments protect this division/)).toBeVisible();

    await captureAdminEvidence(page, {
      path: `docs/evidence/admin/member-divisions-${testInfo.project.name}.png`,
      animations: "disabled",
    });
    await expectHealthyAdminPage(page, clientErrors);
  });

  test("keeps the member table vertical and uses a right-side editor on touch layouts", async ({
    page,
  }, testInfo) => {
    const clientErrors: string[] = [];
    page.on("pageerror", (error) => clientErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") clientErrors.push(message.text());
    });

    await signIn(page);
    await page.goto("/admin/members");
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();

    const table = page.getByRole("region", { name: "Member table" });
    const rows = table.getByRole("button");
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(2);

    const tableGeometry = await rows.evaluateAll((elements) => {
      const boxes = elements.slice(0, 3).map((element) => {
        const box = element.getBoundingClientRect();
        return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
      });
      const rail = elements[0]?.parentElement?.getBoundingClientRect();
      return {
        boxes,
        rail: rail
          ? { left: rail.left, right: rail.right, width: rail.width }
          : null,
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });
    expect(tableGeometry.documentWidth).toBeLessThanOrEqual(
      tableGeometry.viewportWidth + 1,
    );
    expect(tableGeometry.rail).not.toBeNull();
    for (let index = 1; index < tableGeometry.boxes.length; index += 1) {
      expect(tableGeometry.boxes[index].top).toBeGreaterThanOrEqual(
        tableGeometry.boxes[index - 1].bottom - 1,
      );
      expect(tableGeometry.boxes[index].left).toBeCloseTo(
        tableGeometry.boxes[0].left,
        0,
      );
      expect(tableGeometry.boxes[index].right).toBeCloseTo(
        tableGeometry.boxes[0].right,
        0,
      );
    }

    await table.scrollIntoViewIfNeeded();
    await captureAdminEvidence(page, {
      path: `docs/evidence/admin/member-table-${testInfo.project.name}.png`,
      animations: "disabled",
    });

    const firstRow = rows.first();
    await activate(firstRow, testInfo.project.name);

    if (testInfo.project.name === "desktop-chromium") {
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.getByText(/^Edit /, { exact: false }).first(),
      ).toBeVisible();
      await expectHealthyAdminPage(page, clientErrors);
      return;
    }

    const drawer = page.getByRole("dialog", { name: /^Edit / });
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveAttribute("data-variant", "drawer");
    const drawerGeometry = await drawer.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        width: box.width,
        viewportWidth: document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });
    expect(drawerGeometry.right).toBeCloseTo(drawerGeometry.viewportWidth, 0);
    expect(drawerGeometry.left).toBeGreaterThanOrEqual(0);
    expect(drawerGeometry.width).toBeLessThan(drawerGeometry.viewportWidth);
    expect(drawerGeometry.documentWidth).toBeLessThanOrEqual(
      drawerGeometry.viewportWidth + 1,
    );
    const entryDuration = await drawer.locator("section").evaluate((element) => {
      const value = getComputedStyle(element).animationDuration;
      return value.endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value);
    });
    expect(entryDuration).toBeGreaterThanOrEqual(0.16);

    const drawerAccessibility = await new AxeBuilder({ page })
      .include("dialog")
      .analyze();
    expect(
      drawerAccessibility.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);

    await captureAdminEvidence(page, {
      path: `docs/evidence/admin/member-table-drawer-${testInfo.project.name}.png`,
      animations: "disabled",
    });

    await activate(
      drawer.getByRole("button", { name: "Close member editor" }),
      testInfo.project.name,
    );
    await expect(drawer).toBeHidden();
    await expect(firstRow).toBeFocused();

    await page.emulateMedia({ reducedMotion: "reduce" });
    await activate(firstRow, testInfo.project.name);
    await expect(drawer).toBeVisible();
    const reducedDuration = await drawer.locator("section").evaluate((element) => {
      const value = getComputedStyle(element).animationDuration;
      return value.endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value);
    });
    expect(reducedDuration).toBeLessThanOrEqual(0.001);
    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(firstRow).toBeFocused();
    await expectHealthyAdminPage(page, clientErrors);
  });

  test("creates, reassigns, protects, and removes a managed division", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop-chromium" ||
        process.env.ADMIN_MEMBER_MUTATION_QA !== "1",
      "Opt-in development-cloud mutation proof.",
    );
    const clientErrors: string[] = [];
    page.on("pageerror", (error) => clientErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") clientErrors.push(message.text());
    });

    await signIn(page);
    await page.goto("/admin/members");
    await page.getByRole("button", { name: "Divisions" }).click();
    await expect(page.getByText("Managed divisions").locator("..")).toContainText("5");
    await page.getByRole("button", { name: "Add division" }).click();

    await page.getByLabel("Division name").fill("Conversation Lab");
    await page.getByLabel("Division address").fill("conversation-lab-review");
    await page
      .getByLabel("Responsibility summary")
      .fill("Maintains conversation formats and supports small-group practice sessions.");
    await page.getByRole("combobox", { name: "Coordinator" }).click();
    await page.getByRole("option", { name: /Nabila Maheswari/ }).click();
    await page.getByRole("button", { name: "Save division" }).click();

    const divisionRow = page.getByRole("button", { name: /^Conversation Lab/ });
    await expect(page.getByText("Managed divisions").locator("..")).toContainText("6");
    await expect(divisionRow).toContainText("Nabila Maheswari");
    await expect(page.getByRole("button", { name: "Remove division" })).toBeDisabled();

    const coordinator = page.getByRole("combobox", { name: "Coordinator" });
    await coordinator.click();
    await page.getByRole("option", { name: /Reza Dananjaya/ }).click();
    await page.getByLabel("Division name").fill("Conversation Studio");
    await page.getByRole("button", { name: "Save division" }).click();
    const renamedDivisionRow = page.getByRole("button", {
      name: /^Conversation Studio/,
    });
    await expect(renamedDivisionRow).toContainText("Reza Dananjaya");

    await coordinator.click();
    await page.getByRole("option", { name: "No coordinator" }).click();
    await page.getByRole("button", { name: "Save division" }).click();
    await expect(page.getByRole("button", { name: "Remove division" })).toBeEnabled();
    await page.getByRole("button", { name: "Remove division" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Remove division" }).click();

    await expect(page.getByText("Managed divisions").locator("..")).toContainText("5");
    await expect(renamedDivisionRow).toHaveCount(0);

    await page.getByRole("button", { name: "Profiles" }).click();
    const role = page.getByRole("combobox", { name: "Role" });
    await role.click();
    await page.getByRole("option", { name: "Member", exact: true }).click();
    await expect(page.getByText("Matching / loaded").locator("..")).toContainText("2 / 15");

    await expectHealthyAdminPage(page, clientErrors);
  });

  test("loads a legacy story body and its public featured image in edit view", async ({
    page,
  }, testInfo) => {
    const clientErrors: string[] = [];
    page.on("pageerror", (error) => clientErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") clientErrors.push(message.text());
    });

    await signIn(page);
    await page.goto("/admin/journal");
    await activate(
      page.getByRole("combobox", { name: "Status" }),
      testInfo.project.name,
    );
    await activate(
      page.getByRole("option", { name: "Published" }),
      testInfo.project.name,
    );
    await page
      .getByRole("link", {
        name: "Edit Leeds the Way: Bridging England and Indonesia",
      })
      .click();

    await expect(page.getByLabel("Story title")).toHaveValue(
      "Leeds the Way: Bridging England and Indonesia",
    );
    await expect(page.getByRole("textbox", { name: "Journal body" })).toContainText(
      /language changes when it has a real person on the other side/i,
    );
    const featuredImage = page.getByRole("region", {
      name: "Featured image",
    });
    await expect(featuredImage).toBeVisible();
    await expect(page.getByText("Cover ready", { exact: true })).toBeVisible();
    const alternativeText = await featuredImage
      .getByLabel("Alternative text")
      .inputValue();
    expect(alternativeText.trim().length).toBeGreaterThan(2);
    await expect(featuredImage.locator("img")).toHaveAttribute(
      "alt",
      alternativeText,
    );
    const publishButton = page.getByRole("button", {
      name: "Published",
      exact: true,
    });
    await expect(publishButton).toBeDisabled();
    await expect(publishButton).toHaveAttribute(
      "title",
      "Save a new revision before publishing again.",
    );

    await page.getByRole("heading", { name: "Featured image" }).scrollIntoViewIfNeeded();
    await captureAdminEvidence(page, {
      path: `docs/evidence/admin/journal-featured-image-${testInfo.project.name}.png`,
      animations: "disabled",
    });
    await expectHealthyAdminPage(page, clientErrors);
  });
});

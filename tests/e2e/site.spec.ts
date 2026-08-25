import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const storyPath = "/journal/leeds-the-way-bridging-england-and-indonesia";

const routes = [
  { path: "/", heading: "English grows in company." },
  { path: "/about", heading: "Built around the next sentence." },
  { path: "/activities", heading: "English is the activity." },
  { path: "/programs", heading: "English leaves the club room." },
  { path: "/members", heading: "Every voice changes the room." },
  { path: "/journal", heading: "Stories inside the room." },
  { path: storyPath, heading: "Leeds the Way: Bridging England and Indonesia" },
  { path: "/contact", heading: "Start with what you want to say." },
] as const;

async function waitForImages(page: Page) {
  await page.waitForFunction(() =>
    Array.from(document.images)
      .filter((image) => {
        const bounds = image.getBoundingClientRect();
        return bounds.bottom > 0 && bounds.top < window.innerHeight;
      })
      .every((image) => image.complete && image.naturalWidth > 0),
  );
}

async function waitForHydration(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
}

async function chooseSelectOption(
  page: Page,
  trigger: ReturnType<Page["getByRole"]>,
  optionName: string | RegExp,
) {
  await trigger.click();
  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  await page.getByRole("option", { name: optionName, exact: typeof optionName === "string" }).click();
  await expect(listbox).toBeHidden();
}

test.describe("public route contract", () => {
  for (const route of routes) {
    test(`${route.path} renders its primary heading without overflow`, async ({ page }) => {
      const response = await page.goto(route.path);

      expect(response?.ok()).toBe(true);
      await expect(
        page.getByRole("heading", { level: 1, name: route.heading }),
      ).toBeVisible();
      await expect(page.locator("main")).toBeVisible();

      if (route.path !== storyPath) {
        const headingGeometry = await page
          .getByRole("heading", { level: 1, name: route.heading })
          .evaluate((heading) => {
            const lineHeight = Number.parseFloat(getComputedStyle(heading).lineHeight);
            const bounds = heading.getBoundingClientRect();
            return {
              left: bounds.left,
              right: bounds.right,
              lines: Math.round(bounds.height / lineHeight),
              viewportWidth: document.documentElement.clientWidth,
            };
          });
        expect(headingGeometry.left).toBeGreaterThanOrEqual(0);
        expect(headingGeometry.right).toBeLessThanOrEqual(
          headingGeometry.viewportWidth,
        );
        expect(headingGeometry.lines).toBeLessThanOrEqual(
          headingGeometry.viewportWidth < 640 ? 5 : 2,
        );
      }

      const dimensions = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
    });
  }

  test("unknown route has an honest recovery path", async ({ page }) => {
    const response = await page.goto("/not-a-real-page");

    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { level: 1, name: "This page left the room." }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Return home" })).toBeVisible();
  });
});

test("member atlas and organization roster exist in server HTML", async ({
  request,
}) => {
  const response = await request.get("/members");
  const html = await response.text();

  expect(response.ok()).toBe(true);
  for (const label of [
    "Member",
    "Pioneer",
    "Coordinator",
    "Core Member",
    "Board / Board of Directors",
  ]) {
    expect(html).toContain(label);
  }
  expect(html).toContain("Nabila Maheswari");
  expect(html).toContain("Treasury");
  expect(html).toContain("Meet the people behind the club.");
  expect(html).toContain("data-member-roster");
});

test.describe("accessibility", () => {
  for (const path of ["/", "/members", "/journal", storyPath, "/contact"] as const) {
    test(`${path} has no detectable WCAG A or AA violations`, async ({ page }) => {
      await page.goto(path);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }

  test("skip link reaches main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await expect(skipLink).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });
});

test("mobile navigation discloses, closes, and restores focus", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Phone-only interaction");

  await page.goto("/");
  await waitForHydration(page);
  const trigger = page.locator(".menu-trigger");
  await expect(trigger).toHaveAccessibleName("Open navigation");
  await trigger.click();

  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(trigger).toHaveAccessibleName("Close navigation");
  await expect(page.getByRole("link", { name: "About", exact: true }).last()).toBeVisible();
  await expect(page.getByRole("link", { name: "Join the club" }).last()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("hidden");

  await page.keyboard.press("Shift+Tab");
  await expect
    .poll(() =>
      page.locator("#mobile-menu").evaluate((dialog) =>
        dialog.contains(document.activeElement),
      ),
    )
    .toBe(true);

  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAccessibleName("Open navigation");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("sentence, prompt, and activity relays expose keyboard-operable state", async ({
  page,
}) => {
  await page.goto("/");
  await waitForHydration(page);

  const sentenceGroup = page.getByRole("group", {
    name: "Choose how the conversation moves",
  });
  const speak = sentenceGroup.getByRole("button", { name: "Speak" });
  const listen = sentenceGroup.getByRole("button", { name: "Listen" });

  await expect(speak).toHaveAttribute("aria-pressed", "true");
  await speak.focus();
  await page.keyboard.press("ArrowRight");
  await expect(listen).toBeFocused();
  await expect(listen).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("A useful answer starts by staying with someone else's words."),
  ).toBeVisible();

  const prompt = page.getByRole("status");
  const firstPrompt = await prompt.textContent();
  await page.getByRole("button", { name: "New prompt" }).click();
  await expect(prompt).not.toHaveText(firstPrompt ?? "");

  await page.goto("/activities");
  await waitForHydration(page);
  const activityGroup = page.getByRole("group", {
    name: "Choose an activity theme",
  });
  const activitySpeak = activityGroup.getByRole("button", { name: "Speak" });
  const exchange = activityGroup.getByRole("button", { name: "Exchange" });

  await activitySpeak.focus();
  await page.keyboard.press("ArrowRight");
  await expect(exchange).toBeFocused();
  await expect(exchange).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Meet across cultures" })).toBeVisible();
});

test("member role selector updates context without scroll-driven ambiguity", async ({
  page,
}) => {
  await page.goto("/members");
  await waitForHydration(page);

  const roleGroup = page.getByRole("group", {
    name: "Choose a member role to inspect",
  });
  const allRoles = roleGroup.getByRole("radio", { name: "All roles" });
  const coordinator = roleGroup.getByRole("radio", {
    name: /Coordinator/,
  });

  await expect(allRoles).toBeChecked();
  const memberGrid = page.locator("[data-member-roster]");
  await expect(memberGrid).toHaveAttribute("data-roster-source", "convex");
  await expect(memberGrid.locator(":scope > li")).toHaveCount(15);
  await expect(memberGrid.getByText("Nabila Maheswari")).toBeVisible();
  expect(
    await memberGrid.evaluate((element) => getComputedStyle(element).display),
  ).toBe("grid");

  const publicCopy = await page.locator("main").innerText();
  expect(publicCopy).not.toMatch(
    /placeholder|sample data|preview only|synthetic slots|waiting for real names|convex/i,
  );

  await coordinator.check();
  await expect(coordinator).toBeChecked();
  await expect(
    page.getByRole("heading", { level: 3, name: "Coordinator" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({
      hasText: "Showing 5 Coordinator members.",
    }),
  ).toHaveCount(1);
  await expect(memberGrid.locator(":scope > li")).toHaveCount(5);
  await expect(memberGrid.getByText("Academic", { exact: true })).toBeVisible();
  await expect(
    memberGrid.getByText("Media, Information, and Communication (MIC)", {
      exact: true,
    }),
  ).toBeVisible();
});

test("member roster keeps a responsive CSS grid", async ({ page }, testInfo) => {
  await page.goto("/members");
  await waitForHydration(page);

  const columns = await page.locator("[data-member-roster]").evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean),
  );

  expect(columns).toHaveLength(
    testInfo.project.name === "desktop-chromium" ? 5 : 1,
  );

  if (testInfo.project.name !== "desktop-chromium") {
    const compactCard = await page
      .locator("[data-member-roster] > li article")
      .first()
      .evaluate((element) => ({
        display: getComputedStyle(element).display,
        columns: getComputedStyle(element).gridTemplateColumns
          .split(" ")
          .filter(Boolean).length,
      }));
    expect(compactCard).toEqual({ display: "grid", columns: 2 });
  }
});

test("member filters combine role, responsibility, and joined year", async ({
  page,
}) => {
  await page.goto("/members");
  await waitForHydration(page);

  const filterToggle = page.getByRole("button", { name: /Filter/ });
  await filterToggle.click();
  await expect(filterToggle).toHaveAttribute("aria-expanded", "true");

  const panel = page.getByRole("region", { name: "Filter members" });
  const role = panel.getByLabel("Role");
  const assignment = panel.getByLabel("Position / division");
  const year = panel.getByLabel("Joined year");
  const memberGrid = page.locator("[data-member-roster]");

  await role.click();
  await page.keyboard.type("coo");
  const coordinatorOption = page.getByRole("option", {
    name: "Coordinator",
    exact: true,
  });
  await expect(coordinatorOption).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(role).toBeFocused();
  await expect(page.getByRole("radio", { name: /Coordinator/ })).toBeChecked();
  await expect(memberGrid.locator(":scope > li")).toHaveCount(5);

  await chooseSelectOption(page, assignment, "Academic");
  await expect(memberGrid.locator(":scope > li")).toHaveCount(1);
  await expect(memberGrid.getByText("Dimas Arga Pratama")).toBeVisible();

  await chooseSelectOption(page, year, "2025");
  await expect(memberGrid.getByText("Joined 2025")).toBeVisible();
  await expect(
    page.getByRole("status").filter({
      hasText:
        "Showing 1 member. Role: Coordinator. Position or division: Academic. Joined year: 2025.",
    }),
  ).toHaveCount(1);

  await panel.getByRole("button", { name: "Clear filters" }).click();
  await expect(memberGrid.locator(":scope > li")).toHaveCount(15);

  await chooseSelectOption(page, role, /Board/);
  await chooseSelectOption(page, year, "2026");
  await expect(
    page.getByRole("heading", {
      name: "No members match these filters.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).last().click();
  await expect(memberGrid.locator(":scope > li")).toHaveCount(15);
});

test("member filter controls stay touchable without mobile overflow", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "desktop-chromium", "Phone geometry only");

  await page.goto("/members");
  await waitForHydration(page);
  await page.getByRole("button", { name: /Filter/ }).click();

  const geometry = await page
    .getByRole("region", { name: "Filter members" })
    .evaluate((panel) => {
      const bounds = panel.getBoundingClientRect();
      const triggers = Array.from(
        panel.querySelectorAll<HTMLElement>("[data-select-trigger]"),
      ).map((trigger) => {
        const selectBounds = trigger.getBoundingClientRect();
        return {
          width: selectBounds.width,
          height: selectBounds.height,
          left: selectBounds.left,
          right: selectBounds.right,
        };
      });
      return {
        left: bounds.left,
        right: bounds.right,
        viewport: document.documentElement.clientWidth,
        triggers,
      };
    });

  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewport);
  for (const trigger of geometry.triggers) {
    expect(trigger.height).toBeGreaterThanOrEqual(44);
    expect(trigger.width).toBeGreaterThan(0);
    expect(trigger.left).toBeGreaterThanOrEqual(0);
    expect(trigger.right).toBeLessThanOrEqual(geometry.viewport);
  }

  const responsibility = page.getByRole("combobox", {
    name: "Position / division",
  });
  await responsibility.scrollIntoViewIfNeeded();
  await responsibility.click();

  const listbox = page.getByRole("listbox");
  await expect(listbox).toBeVisible();
  const menuGeometry = await listbox.evaluate((menu) => {
    const bounds = menu.getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
    };
  });

  expect(menuGeometry.left).toBeGreaterThanOrEqual(0);
  expect(menuGeometry.right).toBeLessThanOrEqual(menuGeometry.viewportWidth);
  expect(menuGeometry.top).toBeGreaterThanOrEqual(0);
  expect(menuGeometry.bottom).toBeLessThanOrEqual(menuGeometry.viewportHeight);

  const results = await new AxeBuilder({ page })
    .include('[role="listbox"]')
    // Radix moves focus between programmatically focusable options inside its
    // scroll viewport. Axe's generic Safari rule only recognises tab stops,
    // so keyboard behavior is asserted directly in the interaction test above.
    .disableRules(["scrollable-region-focusable"])
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(responsibility).toBeFocused();
});

test("expanded header stays aligned at intermediate desktop widths", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop geometry only");

  for (const width of [880, 900, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/members");
    await waitForHydration(page);

    const geometry = await page.evaluate(() => {
      const wordmark = document.querySelector(".wordmark")?.getBoundingClientRect();
      const actions = document.querySelector(".header-actions")?.getBoundingClientRect();
      const viewport = document.documentElement.clientWidth;
      return {
        wordmarkRight: wordmark?.right ?? 0,
        actionsLeft: actions?.left ?? 0,
        actionsRight: actions?.right ?? viewport + 1,
        viewport,
      };
    });

    expect(geometry.wordmarkRight).toBeLessThanOrEqual(geometry.actionsLeft);
    expect(geometry.actionsRight).toBeLessThanOrEqual(geometry.viewport);
  }
});

test("home journal preview follows the desktop reading line deterministically", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Wide preview only");

  await page.goto("/");
  await waitForHydration(page);

  const previewTitle = page.locator("[data-journal-preview] strong");
  const journalItems = page.locator("[data-journal-index]");

  const placeOnReadingLine = async (index: number) => {
    await journalItems.nth(index).evaluate((item) => {
      const bounds = item.getBoundingClientRect();
      const itemCentre = bounds.top + bounds.height / 2;
      const readingLine = window.innerHeight * 0.34;
      window.scrollBy({ top: itemCentre - readingLine, behavior: "instant" });
    });
  };

  await placeOnReadingLine(0);
  await expect(previewTitle).toHaveText(
    "Leeds the Way: Bridging England and Indonesia",
  );
  await waitForImages(page);
  await page.screenshot({
    path: "docs/evidence/redesign-journal-preview-first.png",
    animations: "disabled",
  });

  await placeOnReadingLine(1);

  await expect(previewTitle).toHaveText("A room made for trying again");
  await waitForImages(page);
  await page.screenshot({
    path: "docs/evidence/redesign-journal-preview-second.png",
    animations: "disabled",
  });
});

test("theme selection persists through reload", async ({ page }) => {
  await page.goto("/");
  await waitForHydration(page);

  const root = page.locator("html");
  const darkToggle = page.getByRole("button", { name: "Switch to dark theme" });
  await expect(root).toHaveAttribute("data-theme", "light");
  await darkToggle.click();
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect(
    page.getByRole("button", { name: "Switch to light theme" }),
  ).toBeVisible();

  await page.reload();
  await waitForHydration(page);
  await expect(root).toHaveAttribute("data-theme", "dark");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("english-club-theme")))
    .toBe("dark");
});

test("contact form persists a valid, consented enquiry", async ({ page }, testInfo) => {
  await page.goto("/contact?intent=join");
  await waitForHydration(page);

  await expect(page.getByRole("radio", { name: "Join the club" })).toBeChecked();
  await page.getByLabel("Name").fill("Codex QA Visitor");
  await page
    .getByLabel("Email address")
    .fill(`codex.qa+${testInfo.project.name}-${Date.now()}@example.com`);
  await page
    .getByRole("textbox", { name: "Message", exact: true })
    .fill("This is a local automated quality check for the contact submission path.");
  await page
    .getByLabel("I agree that the club may store these details to answer this message.")
    .check();
  await page.getByRole("button", { name: "Send enquiry" }).click();

  await expect(
    page.getByRole("heading", { level: 2, name: "Message received." }),
  ).toBeVisible({ timeout: 20_000 });
  const successPanel = page.getByRole("status");
  await expect(successPanel).toContainText(
    "Your message is in the club's private review queue.",
  );
  await expect(successPanel).toBeFocused();

  const successPosition = await successPanel.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { top: bounds.top, bottom: bounds.bottom, viewport: window.innerHeight };
  });
  expect(successPosition.top).toBeGreaterThanOrEqual(0);
  expect(successPosition.bottom).toBeLessThanOrEqual(successPosition.viewport);

  if (testInfo.project.name === "desktop-chromium") {
    await page.screenshot({
      path: "docs/evidence/contact-success-desktop-final-light.png",
      animations: "disabled",
    });
  }
});

test("reduced-motion preference collapses transition durations", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const transitionDuration = await page
    .getByRole("link", { name: "Join the club" })
    .first()
    .evaluate((element) => getComputedStyle(element).transitionDuration);
  expect(transitionDuration).toBe("1e-05s");

  await page.goto("/members");
  const memberTransitionDuration = await page
    .getByRole("radio", { name: /Coordinator/ })
    .evaluate((element) => getComputedStyle(element.closest("label")!).transitionDuration);
  expect(memberTransitionDuration).toBe("1e-05s");
});

test("member page visual evidence captures selected and responsive states", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await page.goto("/members");
  await waitForHydration(page);
  await waitForImages(page);
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });

  if (testInfo.project.name === "desktop-chromium") {
    await page.screenshot({
      path: "docs/evidence/members-desktop-light.png",
      animations: "disabled",
      fullPage: true,
    });
    await page.reload();
    await waitForHydration(page);
    await waitForImages(page);
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.documentElement.style.scrollBehavior = "auto";
      const roster = document.querySelector("[data-member-roster]");
      if (roster) {
        const rosterTop = roster.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, rosterTop - 530);
      }
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    });
    await expect(page.locator(".site-header")).toBeInViewport();
    await page.screenshot({
      path: "docs/evidence/members-desktop-roster-light.png",
      animations: "disabled",
    });
    await page.getByRole("button", { name: /Filter/ }).click();
    await page.screenshot({
      path: "docs/evidence/members-filter-desktop-light.png",
      animations: "disabled",
    });
    await page.getByRole("combobox", { name: "Position / division" }).click();
    await page.screenshot({
      path: "docs/evidence/members-custom-select-open-desktop-light.png",
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Close member filters" }).click();
    await page
      .getByRole("radio", { name: /Coordinator/ })
      .check();
    await page.locator("#member-role-map").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "docs/evidence/members-coordinator-desktop-light.png",
      animations: "disabled",
    });
    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await page.getByRole("button", { name: /Filter/ }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Filter/ }).click();
    await page.getByRole("combobox", { name: "Role" }).click();
    await page.screenshot({
      path: "docs/evidence/members-custom-select-open-desktop-dark.png",
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Close member filters" }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: "docs/evidence/members-desktop-dark.png",
      animations: "disabled",
      fullPage: true,
    });
  } else if (testInfo.project.name === "mobile-chromium") {
    await page.getByRole("button", { name: /Filter/ }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Filter/ }).click();
    await page.screenshot({
      path: "docs/evidence/members-filter-mobile-light.png",
      animations: "disabled",
    });
    await page.getByRole("combobox", { name: "Position / division" }).click();
    await page.screenshot({
      path: "docs/evidence/members-custom-select-open-mobile-light.png",
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Close member filters" }).click();
    await page
      .locator("[data-member-roster] > li")
      .first()
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "docs/evidence/members-mobile-roster-light.png",
      animations: "disabled",
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: "docs/evidence/members-mobile-light.png",
      animations: "disabled",
      fullPage: true,
    });
  } else {
    await page.getByRole("button", { name: /Filter/ }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: /Filter/ }).click();
    await page.screenshot({
      path: "docs/evidence/members-filter-320-light.png",
      animations: "disabled",
    });
    await page.getByRole("combobox", { name: "Position / division" }).click();
    await page.screenshot({
      path: "docs/evidence/members-custom-select-open-320-light.png",
      animations: "disabled",
    });
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Close member filters" }).click();
    await page
      .locator("[data-member-roster] > li")
      .first()
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: "docs/evidence/members-320-roster-light.png",
      animations: "disabled",
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: "docs/evidence/members-320-light.png",
      animations: "disabled",
      fullPage: true,
    });
  }
});

test("visual evidence captures final responsive and theme states", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "no-preference" });
  await page.goto("/");
  await waitForHydration(page);
  await waitForImages(page);
  await page.evaluate(async () => {
    await document.fonts.ready;
    window.scrollTo(0, 0);
  });
  await expect(page.getByRole("link", { name: "English Club home" })).toBeInViewport();
  if (testInfo.project.name === "desktop-chromium") {
    await expect(page.getByRole("link", { name: "Join", exact: true })).toBeInViewport();
  } else {
    await expect(page.getByRole("button", { name: "Open navigation" })).toBeInViewport();
  }

  if (testInfo.project.name === "desktop-chromium") {
    await page.screenshot({
      path: "docs/evidence/redesign-home-desktop-light.png",
      animations: "disabled",
      fullPage: true,
    });

    await page.getByRole("button", { name: "Switch to dark theme" }).click();
    await page.screenshot({
      path: "docs/evidence/redesign-home-desktop-dark.png",
      animations: "disabled",
      fullPage: true,
    });

    await page.goto("/activities");
    await waitForHydration(page);
    await page
      .getByRole("group", { name: "Choose an activity theme" })
      .getByRole("button", { name: "Exchange" })
      .click();
    await waitForImages(page);
    await page.evaluate(async () => {
      await document.fonts.ready;
      document.documentElement.style.scrollBehavior = "auto";
      if (document.scrollingElement) {
        document.scrollingElement.scrollTop = 0;
      }
    });
    await page.screenshot({
      path: "docs/evidence/redesign-activities-selected-dark.png",
      animations: "disabled",
      fullPage: true,
    });
  } else if (testInfo.project.name === "mobile-chromium") {
    await page.screenshot({
      path: "docs/evidence/redesign-home-mobile-light.png",
      animations: "disabled",
      fullPage: true,
    });

    await page.locator(".menu-trigger").click();
    await page.screenshot({
      path: "docs/evidence/redesign-mobile-menu-light.png",
      animations: "disabled",
    });
  } else {
    await page.screenshot({
      path: "docs/evidence/redesign-home-320-light.png",
      animations: "disabled",
      fullPage: true,
    });
  }
});

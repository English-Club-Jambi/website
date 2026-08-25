import { expect, test, type Locator, type Page } from "@playwright/test";

type RecordedTouchEvent = {
  type: string;
  target: string;
};

async function waitForHydration(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
}

async function installTouchTrace(page: Page) {
  await page.addInitScript(() => {
    const tracedWindow = window as Window & {
      __englishClubTouchTrace?: RecordedTouchEvent[];
    };

    tracedWindow.__englishClubTouchTrace = [];

    for (const type of ["pointerdown", "touchstart", "click"]) {
      document.addEventListener(
        type,
        (event) => {
          const target = event.target;
          tracedWindow.__englishClubTouchTrace?.push({
            type,
            target:
              target instanceof Element
                ? `${target.tagName.toLowerCase()}${target.id ? `#${target.id}` : ""}`
                : String(target),
          });
        },
        { capture: true, passive: true },
      );
    }
  });
}

async function touchTarget(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  await target.scrollIntoViewIfNeeded();

  const before = await page.evaluate(
    () =>
      (
        window as Window & {
          __englishClubTouchTrace?: RecordedTouchEvent[];
        }
      ).__englishClubTouchTrace?.length ?? 0,
  );
  const geometry = await target.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const hit = document.elementFromPoint(x, y);

    return {
      x,
      y,
      width: bounds.width,
      height: bounds.height,
      hitInsideTarget: Boolean(
        hit && (hit === element || element.contains(hit)),
      ),
      hitTag: hit?.tagName.toLowerCase() ?? null,
    };
  });

  expect(geometry.width).toBeGreaterThanOrEqual(44);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(
    geometry.hitInsideTarget,
    `Expected the target at (${geometry.x}, ${geometry.y}) but hit ${geometry.hitTag}.`,
  ).toBe(true);

  await page.touchscreen.tap(geometry.x, geometry.y);

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & {
              __englishClubTouchTrace?: RecordedTouchEvent[];
            }
          ).__englishClubTouchTrace?.length ?? 0,
      ),
    )
    .toBeGreaterThanOrEqual(before + 3);

  const events = await page.evaluate(
    (startIndex) =>
      (
        window as Window & {
          __englishClubTouchTrace?: RecordedTouchEvent[];
        }
      ).__englishClubTouchTrace?.slice(startIndex) ?? [],
    before,
  );
  expect(events.map((event) => event.type)).toEqual(
    expect.arrayContaining(["pointerdown", "touchstart", "click"]),
  );
}

async function touchLinkAndWait(
  page: Page,
  target: Locator,
  destination: RegExp,
) {
  await expect(target).toBeVisible();
  await target.scrollIntoViewIfNeeded();
  const geometry = await target.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      x,
      y,
      width: bounds.width,
      height: bounds.height,
      hitInsideTarget: Boolean(
        hit && (hit === element || element.contains(hit)),
      ),
    };
  });

  expect(geometry.width).toBeGreaterThanOrEqual(44);
  expect(geometry.height).toBeGreaterThanOrEqual(44);
  expect(geometry.hitInsideTarget).toBe(true);

  await Promise.all([
    page.waitForURL(destination),
    page.touchscreen.tap(geometry.x, geometry.y),
  ]);
}

test.describe("mobile touch interaction contract", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name === "desktop-chromium",
      "The interaction contract requires a touch-capable context.",
    );
    await installTouchTrace(page);
  });

  test("the shared shell receives real taps and releases modal state", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForHydration(page);

    await touchTarget(
      page,
      page.getByRole("button", { name: "Switch to dark theme" }),
    );
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const menuTrigger = page.locator(".menu-trigger");
    const menuDialog = page.locator("#mobile-menu");
    await touchTarget(page, menuTrigger);
    await expect(menuDialog).toHaveJSProperty("open", true);
    await expect(menuTrigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(".mobile-menu-close")).toBeFocused();
    await expect
      .poll(() => page.locator("body").evaluate((body) => body.style.overflow))
      .toBe("hidden");

    await touchTarget(page, page.locator(".mobile-menu-close"));
    await expect(menuDialog).toHaveJSProperty("open", false);
    await expect(menuTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(menuTrigger).toBeFocused();
    await expect
      .poll(() => page.locator("body").evaluate((body) => body.style.overflow))
      .toBe("");

    await touchTarget(page, menuTrigger);
    await touchLinkAndWait(
      page,
      menuDialog.getByRole("link", { name: "About", exact: true }),
      /\/about$/,
    );
    await waitForHydration(page);
    await expect(menuDialog).toHaveJSProperty("open", false);
    await expect
      .poll(() => page.locator("body").evaluate((body) => body.style.overflow))
      .toBe("");
  });

  test("home relays and the primary CTA receive unobstructed touch events", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await waitForHydration(page);

    const sentenceGroup = page.getByRole("group", {
      name: "Choose how the conversation moves",
    });
    for (const name of ["Listen", "Ask", "Try again", "Speak"]) {
      const control = sentenceGroup.getByRole("button", { name });
      await touchTarget(page, control);
      await expect(control).toHaveAttribute("aria-pressed", "true");
    }

    const prompt = page.getByRole("status").first();
    const firstPrompt = await prompt.textContent();
    await touchTarget(page, page.getByRole("button", { name: "New prompt" }));
    await expect(prompt).not.toHaveText(firstPrompt ?? "");

    const activityGroup = page.getByRole("group", {
      name: "Choose an activity theme",
    });
    const exchange = activityGroup.getByRole("button", { name: "Exchange" });
    await touchTarget(page, exchange);
    await expect(exchange).toHaveAttribute("aria-pressed", "true");

    const evidenceName =
      testInfo.project.name === "narrow-chromium" ? "320" : "pixel7";
    await page.goto("/");
    await waitForHydration(page);
    await page.screenshot({
      path: `docs/evidence/mobile-touch-${evidenceName}.png`,
      animations: "disabled",
    });

    await touchLinkAndWait(
      page,
      page.getByRole("link", { name: "Meet the club" }),
      /\/about$/,
    );
    await waitForHydration(page);

    await page.goto("/");
    await waitForHydration(page);
    await touchLinkAndWait(
      page,
      page.getByRole("link", { name: "Join the club" }).first(),
      /\/contact\?intent=join$/,
    );
    await waitForHydration(page);
    await expect(
      page.getByRole("radio", { name: "Join the club" }),
    ).toBeChecked();
  });

  test("page controls remain touchable after scrolling and route changes", async ({
    page,
  }) => {
    await page.goto("/about");
    await waitForHydration(page);
    await touchLinkAndWait(
      page,
      page.locator(".evidence-boundary-copy .text-link"),
      /\/journal$/,
    );
    await waitForHydration(page);

    const journalStory = page.locator("#journal-archive h3 a").first();
    if ((await journalStory.count()) > 0) {
      const storyHref = await journalStory.getAttribute("href");
      expect(storyHref).toMatch(/^\/journal\//);
      await touchLinkAndWait(page, journalStory, /\/journal\/[^/?#]+$/);
      await waitForHydration(page);
    }

    await page.goto("/practice");
    await waitForHydration(page);
    const practiceAction = page.locator("#main-content a").first();
    const practiceHref = await practiceAction.getAttribute("href");
    expect(practiceHref).toMatch(/^(?:\/practice|#practice)/);
    await touchLinkAndWait(
      page,
      practiceAction,
      /\/practice(?:\/[^?#]+|#practice-paths)?$/,
    );
    await waitForHydration(page);

    await page.goto("/members");
    await waitForHydration(page);
    const filterButton = page.getByRole("button", { name: /Filter/ }).first();
    await touchTarget(page, filterButton);
    await expect(filterButton).toHaveAttribute("aria-expanded", "true");

    await page.goto("/activities");
    await waitForHydration(page);
    const make = page
      .getByRole("group", { name: "Choose an activity theme" })
      .getByRole("button", { name: "Make" });
    await touchTarget(page, make);
    await expect(make).toHaveAttribute("aria-pressed", "true");

    await page.goto("/contact");
    await waitForHydration(page);
    const ask = page.getByRole("radio", { name: "Ask a question" });
    await touchTarget(page, ask.locator("xpath=.."));
    await expect(ask).toBeChecked();

    const name = page.getByRole("textbox", { name: "Name" });
    await touchTarget(page, name);
    await expect(name).toBeFocused();
  });
});

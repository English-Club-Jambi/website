import { expect, test, type Locator, type Page } from "@playwright/test";

import { getLanIPv4Hosts } from "../../src/config/dev-origins";

type TouchTrace = {
  type: string;
  pointerType: string | null;
  target: string;
  path: string[];
};

const lanHost = getLanIPv4Hosts()[0];
const lanOrigin = lanHost === undefined ? null : `http://${lanHost}:3987`;

async function targetCentre(page: Page, target: Locator) {
  await expect(target).toBeVisible();
  await target.scrollIntoViewIfNeeded();

  return target.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const x = bounds.left + bounds.width / 2;
    const y = bounds.top + bounds.height / 2;
    const hit = document.elementFromPoint(x, y);

    return {
      x,
      y,
      width: bounds.width,
      height: bounds.height,
      hitInsideTarget: Boolean(hit && (hit === element || element.contains(hit))),
      hit: hit instanceof Element ? hit.tagName.toLowerCase() : null,
    };
  });
}

test.describe("physical-phone LAN touch regression", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "mobile-chromium",
      "The LAN regression uses the Pixel 7 touch context.",
    );
    test.skip(lanOrigin === null, "No non-internal IPv4 interface is available.");

    await page.addInitScript(() => {
      const tracedWindow = window as Window & {
        __englishClubLanTouchTrace?: TouchTrace[];
      };
      tracedWindow.__englishClubLanTouchTrace = [];

      for (const type of ["pointerdown", "touchstart", "pointerup", "touchend", "click"]) {
        document.addEventListener(
          type,
          (event) => {
            tracedWindow.__englishClubLanTouchTrace?.push({
              type,
              pointerType:
                event instanceof PointerEvent ? event.pointerType : null,
              target:
                event.target instanceof Element
                  ? event.target.tagName.toLowerCase()
                  : String(event.target),
              path: event
                .composedPath()
                .filter((entry): entry is Element => entry instanceof Element)
                .slice(0, 6)
                .map((entry) => entry.tagName.toLowerCase()),
            });
          },
          { capture: true, passive: true },
        );
      }
    });
  });

  test("LAN-delivered scripts hydrate before native taps reach the shared shell", async ({
    page,
  }) => {
    const failedNextResponses: Array<{ status: number; path: string }> = [];
    page.on("response", (response) => {
      if (response.url().includes("/_next/") && response.status() >= 400) {
        failedNextResponses.push({
          status: response.status(),
          path: new URL(response.url()).pathname,
        });
      }
    });

    await page.goto(`${lanOrigin}/`);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    expect(failedNextResponses).toEqual([]);

    const themeToggle = page.getByRole("button", {
      name: "Switch to dark theme",
    });
    const themeGeometry = await targetCentre(page, themeToggle);
    expect(themeGeometry.width).toBeGreaterThanOrEqual(44);
    expect(themeGeometry.height).toBeGreaterThanOrEqual(44);
    expect(
      themeGeometry.hitInsideTarget,
      `Theme target centre hit ${themeGeometry.hit ?? "nothing"}.`,
    ).toBe(true);

    await page.touchscreen.tap(themeGeometry.x, themeGeometry.y);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

    const menuTrigger = page.locator(".menu-trigger");
    const menuGeometry = await targetCentre(page, menuTrigger);
    expect(menuGeometry.width).toBeGreaterThanOrEqual(44);
    expect(menuGeometry.height).toBeGreaterThanOrEqual(44);
    expect(menuGeometry.hitInsideTarget).toBe(true);
    await page.touchscreen.tap(menuGeometry.x, menuGeometry.y);
    await expect(page.locator("#mobile-menu")).toHaveJSProperty("open", true);

    const trace = await page.evaluate(
      () =>
        (
          window as Window & {
            __englishClubLanTouchTrace?: TouchTrace[];
          }
        ).__englishClubLanTouchTrace ?? [],
    );
    expect(trace.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        "pointerdown",
        "touchstart",
        "pointerup",
        "touchend",
        "click",
      ]),
    );
    expect(
      trace.some(
        (event) =>
          event.pointerType === "touch" && event.path.includes("button"),
      ),
    ).toBe(true);

    await page.screenshot({
      path: "docs/evidence/mobile-lan-touch-pixel7.png",
      animations: "disabled",
    });

    const aboutLink = page
      .locator("#mobile-menu")
      .getByRole("link", { name: "About", exact: true });
    const aboutGeometry = await targetCentre(page, aboutLink);
    expect(aboutGeometry.hitInsideTarget).toBe(true);
    await page.touchscreen.tap(aboutGeometry.x, aboutGeometry.y);
    await expect(page).toHaveURL(`${lanOrigin}/about`);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    expect(failedNextResponses).toEqual([]);
  });
});

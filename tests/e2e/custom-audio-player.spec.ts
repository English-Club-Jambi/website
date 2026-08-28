import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

import { getPublicContentDefaults } from "../../content/public-content";

const enabled = process.env.RUN_SEEDED_PRACTICE_E2E === "1";
const copy = getPublicContentDefaults("practice");

const listeningRoutes = [
  { key: "full", path: "/practice/full", itemCount: 50 },
  { key: "quick", path: "/practice/quick/listening", itemCount: 8 },
] as const;

async function activate(locator: Locator, testInfo: TestInfo) {
  if (testInfo.project.name === "desktop-chromium") await locator.click();
  else await locator.tap();
}

async function startListeningAttempt(
  page: Page,
  testInfo: TestInfo,
  route: (typeof listeningRoutes)[number],
) {
  await page.goto(route.path);
  await activate(page.getByRole("checkbox"), testInfo);
  await activate(
    page.getByRole("button", { name: "Start practice" }),
    testInfo,
  );
  await page.waitForURL(/\/practice\/attempt\//);
  await activate(
    page.getByRole("button", { name: "Begin section" }),
    testInfo,
  );
  await expect(
    page.getByText(`QUESTION 1 OF ${route.itemCount}`),
  ).toBeVisible();
}

async function getReadyPlayer(page: Page) {
  const player = page.locator("main [data-practice-audio-player]");
  const engine = player.locator("audio[data-practice-audio-engine]");
  await expect(player).toHaveCount(1);
  await expect(engine).toHaveCount(1);
  await expect
    .poll(async () => {
      const state = await player.getAttribute("data-state");
      return state === "ready" || state === "paused";
    }, { timeout: 20_000 })
    .toBe(true);
  return { player, engine };
}

function parseClock(value: string) {
  const match = value.trim().match(/^(\d+):(\d{2})$/);
  if (match === null) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

async function assertRealR2Media(player: Locator, engine: Locator) {
  const source = await engine.getAttribute("src");
  expect(source).not.toBeNull();
  expect(source).toMatch(/^https:\/\/r2\.mukhtada\.my\.id\//);

  await expect(engine).not.toHaveAttribute("controls", "");
  await expect(engine).not.toHaveAttribute("autoplay", "");
  expect(
    await engine.evaluate((element) => {
      const audio = element as HTMLAudioElement;
      return {
        controls: audio.controls,
        autoplay: audio.autoplay,
        paused: audio.paused,
        currentTime: audio.currentTime,
      };
    }),
  ).toMatchObject({
    controls: false,
    autoplay: false,
    paused: true,
  });
  expect(
    await engine.evaluate((element) => (element as HTMLAudioElement).currentTime),
  ).toBeLessThanOrEqual(0.1);

  const response = await engine.page().request.get(source!, {
    headers: { Range: "bytes=0-1023" },
  });
  expect([200, 206]).toContain(response.status());
  expect(response.headers()["content-type"]).toMatch(/^audio\//);
  expect((await response.body()).byteLength).toBeGreaterThan(0);

  await expect
    .poll(
      async () =>
        await engine.evaluate((element) => {
          const audio = element as HTMLAudioElement;
          return (
            audio.readyState >= HTMLMediaElement.HAVE_METADATA &&
            Number.isFinite(audio.duration) &&
            audio.duration > 0
          );
        }),
      { timeout: 20_000 },
    )
    .toBe(true);

  const label = await player.getAttribute("aria-label");
  expect(label).not.toBeNull();
  const seek = player.getByRole("slider", {
    name: `${copy.recordingPosition}: ${label}`,
  });
  await expect(seek).toBeEnabled();
  const [duration, maximum, valueText] = await Promise.all([
    engine.evaluate((element) => (element as HTMLAudioElement).duration),
    seek.getAttribute("max"),
    seek.getAttribute("aria-valuetext"),
  ]);
  expect(Math.abs(Number(maximum) - duration)).toBeLessThanOrEqual(0.15);
  expect(valueText).not.toBeNull();
  const visibleDuration = parseClock(valueText!.split("/").at(-1) ?? "");
  expect(Number.isFinite(visibleDuration)).toBe(true);
  expect(Math.abs(visibleDuration - duration)).toBeLessThanOrEqual(1.1);

  return { label: label!, seek };
}

async function assertPageQuality(page: Page, player: Locator) {
  const geometry = await player.evaluate((root) => {
    const rectangle = (element: Element | null) => {
      const rect = element?.getBoundingClientRect();
      return rect === undefined
        ? null
        : {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          };
    };
    const intersects = (
      first: ReturnType<typeof rectangle>,
      second: ReturnType<typeof rectangle>,
    ) =>
      first !== null &&
      second !== null &&
      first.left < second.right - 0.5 &&
      first.right > second.left + 0.5 &&
      first.top < second.bottom - 0.5 &&
      first.bottom > second.top + 0.5;

    const controls = [
      ...root.querySelectorAll<HTMLElement>("button, input[type='range']"),
    ].filter((control) => control.getClientRects().length > 0);
    const controlRects = controls.map((control) => rectangle(control)!);
    const overlaps: Array<[number, number]> = [];
    for (let left = 0; left < controlRects.length; left += 1) {
      for (let right = left + 1; right < controlRects.length; right += 1) {
        if (intersects(controlRects[left], controlRects[right])) {
          overlaps.push([left, right]);
        }
      }
    }

    const playerRect = rectangle(root)!;
    const answer = document.querySelector<HTMLElement>(
      "main [role='radio'], main [role='checkbox'], main [role='combobox']",
    );
    const transcript = [...document.querySelectorAll<HTMLElement>("main button")]
      .find((button) => /transcript/i.test(button.textContent ?? "")) ?? null;
    const navigator = document.querySelector<HTMLElement>(
      "main nav[aria-label='Question list']",
    );
    const nearby = [answer, transcript, navigator]
      .map((element) => rectangle(element))
      .filter((rect) => rect !== null);

    return {
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      mainRight:
        document.querySelector("main")?.getBoundingClientRect().right ?? 0,
      playerRect,
      controlRects,
      overlaps,
      nearbyOverlap: nearby.some((rect) => intersects(playerRect, rect)),
    };
  });

  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.mainRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.playerRect.left).toBeGreaterThanOrEqual(-1);
  expect(geometry.playerRect.right).toBeLessThanOrEqual(
    geometry.viewportWidth + 1,
  );
  expect(geometry.overlaps).toEqual([]);
  expect(geometry.nearbyOverlap).toBe(false);
  expect(geometry.controlRects.length).toBeGreaterThanOrEqual(3);
  for (const [index, control] of geometry.controlRects.entries()) {
    expect(control.height, `control ${index + 1} height`).toBeGreaterThanOrEqual(44);
    expect(control.width, `control ${index + 1} width`).toBeGreaterThanOrEqual(44);
  }

  const accessibility = await new AxeBuilder({ page }).include("main").analyze();
  expect(
    accessibility.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
}

async function tabToName(page: Page, expectedName: string) {
  for (let step = 0; step < 40; step += 1) {
    const activeName = await page.evaluate(
      () => document.activeElement?.getAttribute("aria-label") ?? null,
    );
    if (activeName === expectedName) return;
    await page.keyboard.press("Tab");
  }
  throw new Error(`Keyboard focus never reached ${expectedName}.`);
}

async function assertKeyboardControls(
  page: Page,
  player: Locator,
  engine: Locator,
  label: string,
) {
  const playName = `${copy.playRecording}: ${label}`;
  await tabToName(page, playName);
  const focusStyle = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement!);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focusStyle.outlineStyle).not.toBe("none");
  expect(focusStyle.outlineWidth).toBeGreaterThanOrEqual(2);

  const beforePlay = await engine.evaluate(
    (element) => (element as HTMLAudioElement).currentTime,
  );
  await page.keyboard.press("Space");
  await expect
    .poll(
      async () =>
        await engine.evaluate(
          (element) => (element as HTMLAudioElement).currentTime,
        ),
      { timeout: 8_000 },
    )
    .toBeGreaterThan(beforePlay + 0.3);
  await expect(
    player.getByRole("button", {
      name: `${copy.pauseRecording}: ${label}`,
    }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await expect(player).toHaveAttribute("data-state", "paused");

  const seekName = `${copy.recordingPosition}: ${label}`;
  await tabToName(page, seekName);
  const beforeSeek = await engine.evaluate(
    (element) => (element as HTMLAudioElement).currentTime,
  );
  for (let step = 0; step < 5; step += 1) {
    await page.keyboard.press("ArrowRight");
  }
  await expect
    .poll(async () =>
      await engine.evaluate(
        (element) => (element as HTMLAudioElement).currentTime,
      ),
    )
    .toBeGreaterThan(beforeSeek + 0.3);

  await tabToName(page, `${copy.muteRecording}: ${label}`);
  await page.keyboard.press("Enter");
  await expect(
    player.getByRole("button", {
      name: `${copy.unmuteRecording}: ${label}`,
    }),
  ).toBeFocused();
  expect(
    await engine.evaluate((element) => (element as HTMLAudioElement).muted),
  ).toBe(true);

  for (let step = 0; step < 3; step += 1) {
    await page.keyboard.press("Tab");
    if (
      !(await player.evaluate((root) => root.contains(document.activeElement)))
    ) {
      return;
    }
  }
  throw new Error("Keyboard focus did not leave the audio player.");
}

async function assertPointerPlayback(
  page: Page,
  testInfo: TestInfo,
  player: Locator,
  engine: Locator,
  label: string,
) {
  const play = player.getByRole("button", {
    name: `${copy.playRecording}: ${label}`,
  });
  const beforePlay = await engine.evaluate(
    (element) => (element as HTMLAudioElement).currentTime,
  );
  await activate(play, testInfo);
  await expect
    .poll(
      async () =>
        await engine.evaluate(
          (element) => (element as HTMLAudioElement).currentTime,
        ),
      { timeout: 8_000 },
    )
    .toBeGreaterThan(beforePlay + 0.3);
  await expect(
    player.getByRole("button", {
      name: `${copy.pauseRecording}: ${label}`,
    }),
  ).toBeVisible();

  const pause = player.getByRole("button", {
    name: `${copy.pauseRecording}: ${label}`,
  });
  await activate(pause, testInfo);
  await expect(player).toHaveAttribute("data-state", "paused");
  const pausedAt = await engine.evaluate(
    (element) => (element as HTMLAudioElement).currentTime,
  );
  await page.waitForTimeout(800);
  const afterWait = await engine.evaluate(
    (element) => (element as HTMLAudioElement).currentTime,
  );
  expect(Math.abs(afterWait - pausedAt)).toBeLessThanOrEqual(0.1);
}

async function assertTouchSeek(
  page: Page,
  seek: Locator,
  engine: Locator,
) {
  const box = await seek.boundingBox();
  expect(box).not.toBeNull();
  const duration = await engine.evaluate(
    (element) => (element as HTMLAudioElement).duration,
  );
  await page.touchscreen.tap(
    box!.x + box!.width * 0.6,
    box!.y + box!.height / 2,
  );
  const expectedTime = duration * 0.6;
  const tolerance = Math.max(duration * 0.05, 0.75);
  await expect
    .poll(
      async () =>
        await engine.evaluate(
          (element) => (element as HTMLAudioElement).currentTime,
        ),
    )
    .toBeGreaterThan(expectedTime - tolerance);
  expect(
    await engine.evaluate((element) => (element as HTMLAudioElement).currentTime),
  ).toBeLessThan(expectedTime + tolerance);
}

async function ensureMuted(
  player: Locator,
  engine: Locator,
  testInfo: TestInfo,
  label: string,
) {
  const muted = await engine.evaluate(
    (element) => (element as HTMLAudioElement).muted,
  );
  if (!muted) {
    await activate(
      player.getByRole("button", {
        name: `${copy.muteRecording}: ${label}`,
      }),
      testInfo,
    );
  }
  await expect(
    player.getByRole("button", {
      name: `${copy.unmuteRecording}: ${label}`,
    }),
  ).toBeVisible();
  expect(
    await engine.evaluate((element) => (element as HTMLAudioElement).muted),
  ).toBe(true);
}

function cssSeconds(value: string) {
  return Math.max(
    ...value.split(",").map((part) => {
      const normalized = part.trim();
      if (normalized.endsWith("ms")) return Number.parseFloat(normalized) / 1_000;
      if (normalized.endsWith("s")) return Number.parseFloat(normalized);
      return 0;
    }),
  );
}

test.describe("custom audio player in live Listening sessions", () => {
  test.skip(!enabled, "Requires the reviewed development practice seed.");

  for (const route of listeningRoutes) {
    test(`${route.key} practice uses the custom R2 transport`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(180_000);
      const browserErrors: string[] = [];
      page.on("pageerror", (error) => browserErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") browserErrors.push(message.text());
      });

      await startListeningAttempt(page, testInfo, route);
      const { player, engine } = await getReadyPlayer(page);
      const { label, seek } = await assertRealR2Media(player, engine);
      await expect(
        player.getByRole("button", {
          name: `${copy.playRecording}: ${label}`,
        }),
      ).toBeVisible();
      await expect(
        player.getByRole("button", {
          name: `${copy.muteRecording}: ${label}`,
        }),
      ).toBeVisible();
      await expect(page.locator("main audio[controls]")).toHaveCount(0);
      await expect(
        page.locator("main audio:not([data-practice-audio-engine])"),
      ).toHaveCount(0);

      if (testInfo.project.name === "desktop-chromium") {
        await assertKeyboardControls(page, player, engine, label);
      }

      await engine.evaluate((element) => {
        (element as HTMLAudioElement).currentTime = 0;
      });
      await assertPointerPlayback(page, testInfo, player, engine, label);
      await engine.evaluate((element) => {
        (element as HTMLAudioElement).currentTime = 0;
      });
      await activate(
        player.getByRole("button", {
          name: `${copy.playRecording}: ${label}`,
        }),
        testInfo,
      );
      await expect(
        player.getByRole("button", {
          name: `${copy.pauseRecording}: ${label}`,
        }),
      ).toBeVisible();
      await player.scrollIntoViewIfNeeded();
      await assertPageQuality(page, player);
      await page.screenshot({
        path: `docs/evidence/practice-audio-player-${route.key}-${testInfo.project.name}-light.png`,
        animations: "disabled",
      });
      await activate(
        player.getByRole("button", {
          name: `${copy.pauseRecording}: ${label}`,
        }),
        testInfo,
      );
      await expect(player).toHaveAttribute("data-state", "paused");

      if (testInfo.project.name !== "desktop-chromium") {
        await assertTouchSeek(page, seek, engine);
      }
      await ensureMuted(player, engine, testInfo, label);

      await activate(
        page.getByRole("button", { name: "Switch to dark theme" }),
        testInfo,
      );
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await player.scrollIntoViewIfNeeded();
      await assertPageQuality(page, player);
      await page.screenshot({
        path: `docs/evidence/practice-audio-player-${route.key}-${testInfo.project.name}-dark.png`,
        animations: "disabled",
      });

      expect(browserErrors).toEqual([]);
    });

    test(`${route.key} player respects reduced motion without stopping playback`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(180_000);
      const browserErrors: string[] = [];
      page.on("pageerror", (error) => browserErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") browserErrors.push(message.text());
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await startListeningAttempt(page, testInfo, route);
      const { player, engine } = await getReadyPlayer(page);
      const { label } = await assertRealR2Media(player, engine);

      const before = await player.evaluate((root) => {
        const rect = (element: Element) => {
          const bounds = element.getBoundingClientRect();
          return [bounds.x, bounds.y, bounds.width, bounds.height];
        };
        return [
          rect(root),
          ...[...root.querySelectorAll("button, input[type='range']")].map(rect),
        ];
      });
      await assertPointerPlayback(page, testInfo, player, engine, label);
      const motion = await player.evaluate((root) => {
        const elements = [root, ...root.querySelectorAll("*")];
        return elements.map((element) => {
          const style = getComputedStyle(element);
          return {
            animationDuration: style.animationDuration,
            transitionDuration: style.transitionDuration,
          };
        });
      });
      const after = await player.evaluate((root) => {
        const rect = (element: Element) => {
          const bounds = element.getBoundingClientRect();
          return [bounds.x, bounds.y, bounds.width, bounds.height];
        };
        return [
          rect(root),
          ...[...root.querySelectorAll("button, input[type='range']")].map(rect),
        ];
      });

      expect(after).toHaveLength(before.length);
      for (let index = 0; index < before.length; index += 1) {
        for (let value = 0; value < before[index].length; value += 1) {
          expect(Math.abs(after[index][value] - before[index][value])).toBeLessThanOrEqual(0.5);
        }
      }
      for (const style of motion) {
        expect(cssSeconds(style.animationDuration)).toBeLessThanOrEqual(0.000_01);
        expect(cssSeconds(style.transitionDuration)).toBeLessThanOrEqual(0.000_01);
      }
      await assertPageQuality(page, player);
      expect(browserErrors).toEqual([]);
    });
  }
});

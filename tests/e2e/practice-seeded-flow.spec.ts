import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const runSeededFlow = process.env.RUN_SEEDED_PRACTICE_E2E === "1";
const runIllustratedQuestion =
  process.env.RUN_ILLUSTRATED_QUESTION_E2E === "1";

test.describe("seeded paper-based practice flow", () => {
  test.skip(!runSeededFlow, "Requires the idempotent dev practice seed.");

  test("publishes one complete paper form and three focused sprints", async ({
    page,
  }) => {
    await page.goto("/practice");

    await expect(page.locator('a[href="/practice/full"]').first()).toBeVisible();
    for (const skill of ["listening", "structure", "reading"]) {
      await expect(
        page
          .locator("main")
          .locator(`a[href="/practice/quick/${skill}"]`)
          .first(),
      ).toBeVisible();
    }

    await page.goto("/practice/full");
    await expect(
      page.getByRole("heading", {
        name: "English Club Paper-Based Practice Form 1",
      }),
    ).toBeVisible();
    await expect(
      page.getByText("Listening, Structure and Written Expression, Reading"),
    ).toBeVisible();
    await expect(page.locator("main")).toContainText("115 minutes in standard mode");
    await expect(page.locator('a[href="/practice/quick/writing"]')).toHaveCount(0);
    await expect(page.locator('a[href="/practice/quick/speaking"]')).toHaveCount(0);

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test("starts the public full-practice live session from its bank-backed manifest", async ({
    page,
  }, testInfo) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });

    await page.goto("/practice/full");
    const acknowledgement = page.getByRole("checkbox");
    const start = page.getByRole("button", { name: "Start practice" });
    if (testInfo.project.name === "desktop-chromium") {
      await acknowledgement.check();
      await start.click();
    } else {
      await acknowledgement.tap();
      await start.tap();
    }
    await page.waitForURL(/\/practice\/attempt\//);
    const begin = page.getByRole("button", { name: "Begin section" });
    if (testInfo.project.name === "desktop-chromium") await begin.click();
    else await begin.tap();

    await expect(page.getByText("QUESTION 1 OF 50")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Question list" })).toBeVisible();
    await expect(
      page
        .getByRole("radio")
        .first()
        .or(page.getByRole("combobox", { name: /Blank 1/i })),
    ).toBeVisible();
    expect(browserErrors).toEqual([]);

    const geometry = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      mainRight:
        document.querySelector("main")?.getBoundingClientRect().right ?? 0,
    }));
    expect(geometry.documentWidth).toBeLessThanOrEqual(
      geometry.viewportWidth + 1,
    );
    expect(geometry.mainRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);

    const accessibility = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      accessibility.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);

    await page.screenshot({
      path: `docs/evidence/practice-full-bank-live-${testInfo.project.name}.png`,
      animations: "disabled",
    });
  });

  test("starts every focused sprint in its matching live skill section", async ({
    page,
  }, testInfo) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    const focusedFormats = [
      { skill: "listening", title: "Listening", itemCount: 8 },
      {
        skill: "structure",
        title: "Structure and Written Expression",
        itemCount: 8,
      },
      { skill: "reading", title: "Reading", itemCount: 8 },
    ] as const;

    for (const format of focusedFormats) {
      await page.goto(`/practice/quick/${format.skill}`);
      const acknowledgement = page.getByRole("checkbox");
      const start = page.getByRole("button", { name: "Start practice" });
      if (testInfo.project.name === "desktop-chromium") {
        await acknowledgement.check();
        await start.click();
      } else {
        await acknowledgement.tap();
        await start.tap();
      }
      await page.waitForURL(/\/practice\/attempt\//);
      await expect(
        page.getByRole("heading", { name: format.title, level: 1 }),
      ).toBeVisible();
      const begin = page.getByRole("button", { name: "Begin section" });
      if (testInfo.project.name === "desktop-chromium") await begin.click();
      else await begin.tap();
      await expect(
        page.getByText(`QUESTION 1 OF ${format.itemCount}`),
      ).toBeVisible();
      await expect(
        page.locator("main").getByText(format.title, {
          exact: true,
        }).first(),
      ).toBeVisible();
    }

    expect(browserErrors).toEqual([]);
  });

  test("delivers the seeded bank illustration inside the immutable live manifest", async ({
    page,
  }, testInfo) => {
    test.skip(!runIllustratedQuestion, "Requires the illustrated Question Bank record.");
    // A full form can require up to 50 authenticated Convex moves before the
    // illustrated item appears. Mobile emulation is intentionally slower, so
    // keep this proof independent from the product's section timer.
    test.setTimeout(300_000);
    const illustrationAlt =
      "Four learners exchanging ideas around a table in a bright room";
    let found = false;

    for (let attemptNumber = 0; attemptNumber < 2 && !found; attemptNumber += 1) {
      await page.goto("/practice/full");
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Start practice" }).click();
      await page.waitForURL(/\/practice\/attempt\//);
      await page.getByRole("button", { name: "Begin section" }).click();

      for (let question = 1; question <= 50; question += 1) {
        await expect(page.getByText(`QUESTION ${question} OF 50`)).toBeVisible();
        const illustration = page.getByRole("img", { name: illustrationAlt });
        if (await illustration.isVisible().catch(() => false)) {
          found = true;
          const source = await illustration.getAttribute("src");
          expect(source).toContain("r2.mukhtada.my.id");
          const geometry = await page.evaluate(() => {
            const image = document.querySelector<HTMLImageElement>(
              'img[alt="Four learners exchanging ideas around a table in a bright room"]',
            );
            const actions = document.querySelector<HTMLElement>(
              'nav[aria-label="Question list"]',
            );
            const lastAnswer = [...document.querySelectorAll<HTMLElement>(
              '[role="radio"]',
            )].at(-1);
            const imageBox = image?.getBoundingClientRect();
            const actionsBox = actions?.getBoundingClientRect();
            const answerBox = lastAnswer?.getBoundingClientRect();
            return {
              viewportWidth: document.documentElement.clientWidth,
              documentWidth: document.documentElement.scrollWidth,
              imageRight: imageBox?.right ?? 0,
              answerBottom: answerBox?.bottom ?? 0,
              actionsTop: actionsBox?.top ?? Number.POSITIVE_INFINITY,
            };
          });
          expect(geometry.documentWidth).toBeLessThanOrEqual(
            geometry.viewportWidth + 1,
          );
          expect(geometry.imageRight).toBeLessThanOrEqual(
            geometry.viewportWidth + 1,
          );
          expect(geometry.answerBottom).toBeLessThanOrEqual(
            geometry.actionsTop + 1,
          );
          const accessibility = await new AxeBuilder({ page }).include("main").analyze();
          expect(
            accessibility.violations.filter(
              (violation) =>
                violation.impact === "critical" || violation.impact === "serious",
            ),
          ).toEqual([]);
          await page.screenshot({
            path: `docs/evidence/practice-bank-illustration-live-${testInfo.project.name}.png`,
            animations: "disabled",
          });
          break;
        }
        if (question < 50) {
          await page.getByRole("button", { name: "Next", exact: true }).click();
        }
      }
    }
    expect(found).toBe(true);
  });

  test("submits a quick Reading sprint as a raw objective result", async ({
    page,
  }, testInfo) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });

    await page.goto("/practice/quick/reading");
    const acknowledgement = page.getByRole("checkbox");
    const start = page.getByRole("button", { name: "Start practice" });
    if (testInfo.project.name === "desktop-chromium") {
      await acknowledgement.check();
      await start.click();
    } else {
      await acknowledgement.tap();
      await start.tap();
    }
    await page.waitForURL(/\/practice\/attempt\//);
    const begin = page.getByRole("button", { name: "Begin section" });
    if (testInfo.project.name === "desktop-chromium") await begin.click();
    else await begin.tap();

    for (let question = 1; question <= 8; question += 1) {
      await expect(page.getByText(`QUESTION ${question} OF 8`)).toBeVisible();
      if (question < 8) {
        const next = page.getByRole("button", { name: "Next", exact: true });
        if (testInfo.project.name === "desktop-chromium") await next.click();
        else await next.tap();
      }
    }

    const submit = page.getByRole("button", { name: "Submit practice" });
    if (testInfo.project.name === "desktop-chromium") await submit.click();
    else await submit.tap();
    const dialog = page.getByRole("dialog", { name: "Submit this practice?" });
    await expect(dialog).toContainText("0 / 8");
    const confirm = dialog.getByRole("button", { name: "Submit and view result" });
    if (testInfo.project.name === "desktop-chromium") await confirm.click();
    else await confirm.tap();
    await page.waitForURL(/\/practice\/result\//);

    await expect(page.getByRole("heading", { name: "Your practice result" })).toBeVisible();
    await expect(page.getByText(/Correct answers \/ 8/i)).toBeVisible();
    await expect(page.getByText(/not an official or predicted score/i)).toBeVisible();
    await expect(page.getByText(/Paper-based estimate/i)).toHaveCount(0);
    await expect(page.locator("main")).toHaveCount(1);

    const accessibility = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      accessibility.violations.filter(
        (violation) => violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);
    expect(browserErrors).toEqual([]);

    await page.screenshot({
      path: `docs/evidence/practice-reading-result-${testInfo.project.name}.png`,
      animations: "disabled",
    });
  });

  test("serves one pinned Question Bank recording without duplicating legacy audio", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });

    await page.goto("/practice/quick/listening");
    const acknowledgement = page.getByRole("checkbox");
    const start = page.getByRole("button", { name: "Start practice" });
    if (testInfo.project.name === "desktop-chromium") {
      await acknowledgement.check();
      await start.click();
    } else {
      await acknowledgement.tap();
      await start.tap();
    }
    await page.waitForURL(/\/practice\/attempt\//);
    const begin = page.getByRole("button", { name: "Begin section" });
    if (testInfo.project.name === "desktop-chromium") await begin.click();
    else await begin.tap();

    const audio = page.locator('main audio[src^="https://r2.mukhtada.my.id/"]');
    await expect(audio).toBeVisible();
    await expect(audio).toHaveCount(1);
    const source = await audio.getAttribute("src");
    expect(source).not.toBeNull();
    const response = await page.request.get(source!, {
      headers: { Range: "bytes=0-1023" },
    });
    expect([200, 206]).toContain(response.status());
    expect(response.headers()["content-type"]).toContain("audio/mpeg");
    expect((await response.body()).byteLength).toBeGreaterThan(0);
    await expect
      .poll(
        async () =>
          await audio.evaluate(
            (element) => {
              const media = element as HTMLAudioElement;
              return (
                media.readyState >= HTMLMediaElement.HAVE_METADATA &&
                Number.isFinite(media.duration) &&
                media.duration > 0
              );
            },
          ),
        { timeout: 20_000 },
      )
      .toBe(true);

    const delivery = await audio.evaluate((element) => ({
      isQuestionLevel: element.closest("section[aria-label]") !== null,
      audioCount: document.querySelectorAll("main audio").length,
      right: element.getBoundingClientRect().right,
      viewportWidth: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(delivery.isQuestionLevel).toBe(true);
    expect(delivery.audioCount).toBe(1);
    expect(delivery.right).toBeLessThanOrEqual(delivery.viewportWidth + 1);
    expect(delivery.documentWidth).toBeLessThanOrEqual(delivery.viewportWidth + 1);

    const lastAnswer = page.getByRole("radio").last();
    const questionActions = page.getByRole("navigation", { name: "Question list" });
    const [answerBox, actionsBox] = await Promise.all([
      lastAnswer.boundingBox(),
      questionActions.boundingBox(),
    ]);
    expect(answerBox).not.toBeNull();
    expect(actionsBox).not.toBeNull();
    expect((answerBox?.y ?? 0) + (answerBox?.height ?? 0)).toBeLessThanOrEqual(
      actionsBox?.y ?? 0,
    );

    await page.screenshot({
      path: `docs/evidence/practice-bank-audio-live-${testInfo.project.name}.png`,
      animations: "disabled",
    });

    const accessibility = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      accessibility.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);
    expect(browserErrors).toEqual([]);
  });

  test("keeps a word-completion control inline at every supported width", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });

    const sentence = page.locator("[data-cloze-sentence]");
    let found = false;
    for (let attempt = 0; attempt < 3 && !found; attempt += 1) {
      await page.goto("/practice/quick/reading");
      await page.getByRole("checkbox").check();
      await page.getByRole("button", { name: "Start practice" }).click();
      await page.waitForURL(/\/practice\/attempt\//);
      await page.getByRole("button", { name: "Begin section" }).click();

      for (let question = 1; question <= 8; question += 1) {
        await expect(page.getByText(`QUESTION ${question} OF 8`)).toBeVisible();
        if (await sentence.isVisible().catch(() => false)) {
          found = true;
          break;
        }
        if (question < 8) {
          await page.getByRole("button", { name: "Next", exact: true }).click();
        }
      }
    }
    expect(found).toBe(true);

    const word = page.locator("[data-cloze-word]").first();
    const trigger = page.getByRole("combobox", { name: "Blank 1" }).first();
    await expect(sentence).toBeVisible();
    await expect(word).toBeVisible();
    await expect(trigger).toHaveAttribute("data-variant", "inline");

    const geometry = await trigger.evaluate((element) => {
      const triggerBox = element.getBoundingClientRect();
      const wordBox = element.closest("[data-cloze-word]")?.getBoundingClientRect();
      return {
        triggerWidth: triggerBox.width,
        triggerHeight: triggerBox.height,
        sameLine:
          wordBox !== undefined &&
          Math.abs(wordBox.top + wordBox.height / 2 - (triggerBox.top + triggerBox.height / 2)) < 2,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    expect(geometry.triggerWidth).toBeLessThan(150);
    expect(geometry.triggerHeight).toBeGreaterThanOrEqual(44);
    expect(geometry.sameLine).toBe(true);
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);

    await trigger.click();
    const selectedOption = page.getByRole("option").first();
    const selectedLabel = (await selectedOption.textContent())?.trim();
    expect(selectedLabel).toBeTruthy();
    await selectedOption.click();
    await expect(trigger).toContainText(selectedLabel!);

    const accessibility = await new AxeBuilder({ page })
      .include("[data-cloze-sentence]")
      .analyze();
    expect(
      accessibility.violations.filter(
        (violation) =>
          violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);
    expect(browserErrors).toEqual([]);

    await page.screenshot({
      path: `docs/evidence/practice-cloze-inline-${testInfo.project.name}.png`,
      fullPage: true,
      animations: "disabled",
    });
  });
});

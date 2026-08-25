import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const runSeededFlow = process.env.RUN_SEEDED_PRACTICE_E2E === "1";

test.describe("seeded four-skill practice flow", () => {
  test.skip(!runSeededFlow, "Requires the idempotent dev practice seed.");

  test("publishes one complete form and four focused sprints", async ({
    page,
  }) => {
    await page.goto("/practice");

    await expect(page.locator('a[href="/practice/full"]').first()).toBeVisible();
    for (const skill of ["listening", "reading", "writing", "speaking"]) {
      await expect(page.locator(`a[href="/practice/quick/${skill}"]`)).toBeVisible();
    }

    await page.goto("/practice/full");
    await expect(
      page.getByRole("heading", {
        name: "English Club Four-Skill Practice Form 1",
      }),
    ).toBeVisible();
    await expect(page.getByText("Reading, Listening, Writing, Speaking")).toBeVisible();
    await expect(page.locator("main")).toContainText("90 minutes in standard mode");

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test("completes the Writing sprint and renders its estimated result", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "One live result is sufficient.");
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });

    await page.goto("/practice/quick/writing");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Start practice" }).click();
    await page.waitForURL(/\/practice\/attempt\//);
    await page.getByRole("button", { name: "Begin section" }).click();

    for (let question = 1; question <= 3; question += 1) {
      await expect(page.getByText(`QUESTION ${question} OF 5`)).toBeVisible();
      const available = page.locator('[aria-label="Available phrases"] button');
      while ((await available.count()) > 0) await available.first().click();
      await expect(page.getByText("Saved", { exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Next", exact: true }).click();
    }

    const responses = [
      "Subject: Updated English Club room. Hello everyone, today's practice has moved to Room 204 because the library meeting space is unavailable. The session still begins at four o'clock. Please reply if you need directions or cannot attend. Thank you, Arif.",
      "I agree that community gardens can strengthen a neighbourhood because people share a practical responsibility. Regular work sessions also create natural chances to speak with neighbours who might not otherwise meet. However, the plan needs a clear watering schedule so the same volunteers do not carry all the work.",
    ];
    for (let question = 4; question <= 5; question += 1) {
      await expect(page.getByText(`QUESTION ${question} OF 5`)).toBeVisible();
      await page.locator("textarea").fill(responses[question - 4]);
      await expect(page.getByText("Saved", { exact: true })).toBeVisible();
      if (question === 4) {
        await page.getByRole("button", { name: "Next", exact: true }).click();
      }
    }

    await page.getByRole("button", { name: "Submit practice" }).click();
    const dialog = page.getByRole("dialog", { name: "Submit this practice?" });
    await expect(dialog).toContainText("5 / 5");
    await dialog.getByRole("button", { name: "Submit and view result" }).click();
    await page.waitForURL(/\/practice\/result\//);

    await expect(page.getByRole("heading", { name: "Your practice result" })).toBeVisible();
    await expect(page.getByText(/Estimated band \/ 6/i)).toBeVisible();
    await expect(page.getByText(/Comparable (?:practice score|estimate)/i)).toBeVisible();
    await expect(page.getByText(/not an official ETS score/i)).toBeVisible();
    await expect(page.locator("main")).toHaveCount(1);

    const accessibility = await new AxeBuilder({ page }).include("main").analyze();
    expect(
      accessibility.violations.filter(
        (violation) => violation.impact === "critical" || violation.impact === "serious",
      ),
    ).toEqual([]);
    expect(browserErrors).toEqual([]);

    await page.screenshot({
      path: "docs/evidence/practice-writing-result-desktop-chromium.png",
      fullPage: true,
      animations: "disabled",
    });
  });

  test("serves reviewed Listening audio from the R2 custom domain", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-chromium", "Mobile audio evidence only.");
    await page.goto("/practice/quick/listening");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Start practice" }).click();
    await page.waitForURL(/\/practice\/attempt\//);
    await page.getByRole("button", { name: "Begin section" }).click();

    const audio = page.locator('audio[src^="https://r2.mukhtada.my.id/assessments/"]');
    await expect(audio).toBeVisible();
    const source = await audio.getAttribute("src");
    expect(source).not.toBeNull();
    const response = await page.request.get(source!);
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("audio/mpeg");

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

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
    await page.screenshot({
      path: "docs/evidence/practice-listening-question-mobile-chromium.png",
      fullPage: true,
      animations: "disabled",
    });
  });
});

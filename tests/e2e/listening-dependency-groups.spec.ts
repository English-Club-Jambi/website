import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

const enabled = process.env.RUN_LISTENING_DEPENDENCY_E2E === "1";

const sets = [
  {
    key: "hearing-the-room",
    prompts: [
      "What is the main purpose of the lecture?",
      "How does the lecturer define reverberation time?",
      "Why does the lecturer compare painted blocks with thick carpet?",
      "What point does the lecturer make about a larger room?",
      "How is the lecture mainly organized?",
      "What will the group most likely do first?",
    ],
  },
  {
    key: "preserving-a-campus-voice",
    prompts: [
      "Why does the student speak with the coordinator?",
      "Why should the student keep the interview audio-only?",
      "What does the coordinator advise the student to do with the question list?",
      "Why does the coordinator tell the student not to record beside the window?",
      "What will the student most likely do next?",
    ],
  },
] as const;

async function activate(
  locator: Locator,
  testInfo: TestInfo,
) {
  if (testInfo.project.name === "desktop-chromium") await locator.click();
  else await locator.tap();
}

async function startListeningAttempt(
  page: Page,
  testInfo: TestInfo,
  route: "/practice/full" | "/practice/quick/listening",
) {
  await page.goto(route);
  await activate(page.getByRole("checkbox"), testInfo);
  await activate(page.getByRole("button", { name: "Start practice" }), testInfo);
  await page.waitForURL(/\/practice\/attempt\//);
  await activate(page.getByRole("button", { name: "Begin section" }), testInfo);
}

async function scanCurrentSection(
  page: Page,
  testInfo: TestInfo,
  itemCount: number,
) {
  const delivered: Array<{ prompt: string; audio: string | null }> = [];
  for (let index = 0; index < itemCount; index += 1) {
    await expect(
      page.getByText(`QUESTION ${index + 1} OF ${itemCount}`),
    ).toBeVisible();
    const prompt = (await page.locator("main h1").textContent())?.trim() ?? "";
    const audio = await page.locator("main audio").getAttribute("src");
    delivered.push({ prompt, audio });
    if (index + 1 < itemCount) {
      await activate(
        page.getByRole("button", { name: "Next", exact: true }),
        testInfo,
      );
    }
  }
  return delivered;
}

function inspectDependencyClosure(
  delivered: Array<{ prompt: string; audio: string | null }>,
) {
  const selectedSets = [];
  for (const set of sets) {
    const selected = set.prompts
      .map((prompt) => ({
        prompt,
        index: delivered.findIndex((entry) => entry.prompt === prompt),
      }))
      .filter((entry) => entry.index >= 0);
    if (selected.length === 0) continue;
    const anchor = selected.find((entry) => entry.prompt === set.prompts[0]);
    const followUps = selected.filter((entry) => entry.prompt !== set.prompts[0]);
    if (followUps.length > 0 && anchor === undefined) {
      throw new Error(`${set.key} delivered a follow-up without its anchor.`);
    }
    const ordered = [...selected].sort((left, right) => left.index - right.index);
    if (anchor !== undefined && ordered[0]?.prompt !== anchor.prompt) {
      throw new Error(`${set.key} did not deliver its anchor first.`);
    }
    const expectedOrders = Array.from(
      { length: ordered.length },
      (_, index) => ordered[0].index + index,
    );
    if (
      ordered.map((entry) => entry.index).join(",") !==
      expectedOrders.join(",")
    ) {
      throw new Error(`${set.key} was split by unrelated questions.`);
    }
    const audioSources = new Set(
      ordered.map((entry) => delivered[entry.index].audio),
    );
    if (audioSources.size !== 1 || audioSources.has(null)) {
      throw new Error(`${set.key} did not retain one parent recording.`);
    }
    selectedSets.push({ set, ordered, followUps });
  }
  return selectedSets;
}

async function assertPageQuality(page: Page, browserErrors: string[]) {
  const geometry = await page.evaluate(() => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    mainRight: document.querySelector("main")?.getBoundingClientRect().right ?? 0,
  }));
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.mainRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  const accessibility = await new AxeBuilder({ page }).include("main").analyze();
  expect(
    accessibility.violations.filter(
      (violation) =>
        violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
  expect(browserErrors).toEqual([]);
}

async function moveToSetEvidence(
  page: Page,
  testInfo: TestInfo,
  selected: ReturnType<typeof inspectDependencyClosure>[number],
) {
  const evidenceItem = selected.followUps[0] ?? selected.ordered[0];
  await activate(
    page.getByRole("button", { name: "Question list", exact: true }),
    testInfo,
  );
  const dialog = page.getByRole("dialog", { name: "Question list" });
  await expect(dialog).toBeVisible();
  const target = dialog.getByRole("button", {
    name: new RegExp(`^Question ${evidenceItem.index + 1}:`),
  });
  if ((await target.getAttribute("aria-current")) === "step") {
    await activate(dialog.getByRole("button", { name: "Close question list" }), testInfo);
  } else {
    await activate(target, testInfo);
  }
  await expect(page.getByRole("heading", { name: evidenceItem.prompt })).toBeVisible();
  await page.locator("main [data-practice-audio-player]").scrollIntoViewIfNeeded();
}

test.describe("Listening dependency groups in live practice", () => {
  test.skip(!enabled, "Requires the development Listening-set seed.");

  test("keeps a parent-first set inside the full Listening manifest", async ({
    page,
  }, testInfo) => {
    test.setTimeout(300_000);
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    await startListeningAttempt(page, testInfo, "/practice/full");
    const delivered = await scanCurrentSection(page, testInfo, 50);
    const selectedSets = inspectDependencyClosure(delivered);
    expect(
      selectedSets.some((selected) => selected.followUps.length > 0),
    ).toBe(true);
    await moveToSetEvidence(
      page,
      testInfo,
      selectedSets.find((selected) => selected.followUps.length > 0)!,
    );
    await assertPageQuality(page, browserErrors);
    await page.screenshot({
      path: `docs/evidence/listening-set-full-${testInfo.project.name}.png`,
      animations: "disabled",
    });
  });

  test("keeps a parent-first set inside a quick Listening manifest", async ({
    page,
  }, testInfo) => {
    test.setTimeout(300_000);
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") browserErrors.push(message.text());
    });
    let selectedSets: ReturnType<typeof inspectDependencyClosure> = [];
    for (let attempt = 0; attempt < 5 && selectedSets.length === 0; attempt += 1) {
      await startListeningAttempt(page, testInfo, "/practice/quick/listening");
      const delivered = await scanCurrentSection(page, testInfo, 8);
      selectedSets = inspectDependencyClosure(delivered).filter(
        (selected) => selected.followUps.length > 0,
      );
    }
    expect(selectedSets.length).toBeGreaterThan(0);
    await moveToSetEvidence(page, testInfo, selectedSets[0]);
    await assertPageQuality(page, browserErrors);
    await page.screenshot({
      path: `docs/evidence/listening-set-quick-${testInfo.project.name}.png`,
      animations: "disabled",
    });
  });
});

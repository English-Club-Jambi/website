import { expect, test } from "@playwright/test";

test("the public development domain may load the Next client bundle", async ({
  request,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop-chromium",
    "The origin contract only needs one browser project.",
  );

  const document = await request.get("/practice/quick/listening");
  expect(document.ok()).toBe(true);
  const html = await document.text();
  const scriptPath = html.match(/src="(\/_next\/static\/[^\"]+\.js)"/)?.[1];
  expect(scriptPath).toBeTruthy();

  const script = await request.get(scriptPath!, {
    headers: { Origin: "https://englishclubjambi.my.id" },
  });
  expect(script.status()).toBe(200);
  expect(script.headers()["content-type"]).toContain("javascript");
  expect((await script.body()).byteLength).toBeGreaterThan(100);
});

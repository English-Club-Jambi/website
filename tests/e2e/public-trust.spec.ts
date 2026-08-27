import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("institution, privacy, and verified contact routes stay clear and responsive", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  const suffix =
    testInfo.project.name === "desktop-chromium"
      ? "desktop"
      : testInfo.project.name === "mobile-chromium"
        ? "pixel7"
        : "320";

  const aboutResponse = await page.goto("/about");
  expect(aboutResponse?.ok()).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const institution = page.getByRole("region", {
    name: "English Club, in the university record.",
  });
  await expect(institution).toBeVisible();
  await expect(
    institution.getByAltText("Universitas Jambi emblem"),
  ).toBeVisible();
  await expect(
    institution.getByText("English Club UPT Perpustakaan Universitas Jambi"),
  ).toBeVisible();
  await expect(
    institution.getByRole("link", { name: "Read the formation record" }),
  ).toHaveAttribute(
    "href",
    "https://librarynew.unja.ac.id/english-club-upt-perpustakaan-resmi-di-bentuk/",
  );

  const institutionGeometry = await institution.evaluate((element) => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    controls: Array.from(element.querySelectorAll("a")).map((control) => {
      const rect = control.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
  }));
  expect(institutionGeometry.scrollWidth).toBeLessThanOrEqual(
    institutionGeometry.clientWidth,
  );
  expect(institutionGeometry.left).toBeGreaterThanOrEqual(0);
  expect(institutionGeometry.right).toBeLessThanOrEqual(
    institutionGeometry.clientWidth,
  );
  expect(
    institutionGeometry.controls.every(
      (control) => control.width >= 44 && control.height >= 44,
    ),
  ).toBe(true);

  const aboutAxe = await new AxeBuilder({ page })
    .include("main")
    .exclude('iframe[title="Interactive map showing the English Club secretariat"]')
    .analyze();
  expect(aboutAxe.violations).toEqual([]);
  await institution.screenshot({
    path: `docs/evidence/public-trust/about-institution-${suffix}.png`,
    animations: "disabled",
  });

  const contactResponse = await page.goto("/contact?intent=join");
  expect(contactResponse?.ok()).toBe(true);
  const operations = page.getByRole("region", {
    name: "Know where your message goes.",
  });
  await expect(operations).toBeVisible();
  await expect(operations.getByText("Within five working days")).toBeVisible();
  await expect(operations.getByText("180 days", { exact: true })).toBeVisible();
  await expect(
    operations.getByRole("heading", { name: "Perpustakaan UNJA channels" }),
  ).toBeVisible();
  await expect(
    operations.getByRole("link", { name: /perpustakaan@unja\.ac\.id/ }),
  ).toHaveAttribute("href", "mailto:perpustakaan@unja.ac.id");
  await expect(
    page.getByText(/removed no later than 180 days after submission/i),
  ).toBeVisible();

  const contactAxe = await new AxeBuilder({ page }).include("main").analyze();
  expect(contactAxe.violations).toEqual([]);
  await operations.screenshot({
    path: `docs/evidence/public-trust/contact-operations-${suffix}.png`,
    animations: "disabled",
  });

  const privacyResponse = await page.goto("/privacy");
  expect(privacyResponse?.ok()).toBe(true);
  await expect(
    page.getByRole("heading", { name: "When you contact the club" }),
  ).toBeVisible();
  await expect(page.getByText("180 days after submission")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start a privacy request" }),
  ).toHaveAttribute("href", "/contact?intent=ask");
  const privacyGeometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(privacyGeometry.scrollWidth).toBeLessThanOrEqual(
    privacyGeometry.clientWidth,
  );
  const privacyAxe = await new AxeBuilder({ page }).include("main").analyze();
  expect(privacyAxe.violations).toEqual([]);
  expect(errors).toEqual([]);

  await page.screenshot({
    path: `docs/evidence/public-trust/privacy-${suffix}.png`,
    fullPage: true,
    animations: "disabled",
  });

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const darkAxe = await new AxeBuilder({ page }).include("main").analyze();
  expect(darkAxe.violations).toEqual([]);
  if (testInfo.project.name === "desktop-chromium") {
    await page.screenshot({
      path: "docs/evidence/public-trust/privacy-dark-desktop.png",
      fullPage: true,
      animations: "disabled",
    });
  }
});

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("About publishes a usable secretariat location", async ({
  context,
  page,
}, testInfo) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });

  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  const response = await page.goto("/about");
  expect(response?.ok()).toBe(true);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");

  const section = page.getByRole("region", {
    name: "Find the club between classes.",
  });
  await expect(section).toBeVisible();
  await expect(
    section.getByText("Perpustakaan Universitas Jambi", { exact: true }),
  ).toBeVisible();
  await expect(
    section.getByText(/Unnamed Road, Jl\. Jambi - Muara Bulian KM 15/),
  ).toBeVisible();
  await expect(section.getByText(/9GP8\+9X Mendalo Darat/)).toBeVisible();
  await expect(
    section.getByRole("link", { name: /Open directions in Google Maps/ }),
  ).toHaveAttribute("href", "https://maps.app.goo.gl/gZNDkHecRKxmZkYV7");

  const mapFrame = section.getByTitle(
    "Interactive map showing the English Club secretariat",
  );
  await expect(mapFrame).toBeVisible();
  await expect(mapFrame).toHaveAttribute(
    "src",
    /openstreetmap\.org\/export\/embed\.html/,
  );
  await mapFrame.evaluate((element) => {
    element.scrollIntoView({ block: "center", behavior: "instant" });
  });
  const embeddedMap = page.frameLocator(
    'iframe[title="Interactive map showing the English Club secretariat"]',
  );
  await expect(embeddedMap.locator("#map")).toBeVisible();
  const zoomIn = embeddedMap.getByRole("button", { name: "Zoom In" });
  await expect(zoomIn).toBeVisible();
  await zoomIn.click();

  await section.getByRole("button", { name: "Copy address" }).click();
  await expect(section.getByText("Address copied.")).toBeVisible();

  const geometry = await section.evaluate((element) => ({
    viewportWidth: document.documentElement.clientWidth,
    documentWidth: document.documentElement.scrollWidth,
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    controls: Array.from(element.querySelectorAll("a, button")).map((control) => {
      const rect = control.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
  }));
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(
    geometry.controls.every(
      (control) => control.width >= 44 && control.height >= 44,
    ),
  ).toBe(true);

  const structuredData = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((scripts) =>
      scripts.map((script) => JSON.parse(script.textContent ?? "{}")),
    );
  const aboutPage = structuredData.find(
    (entry) => entry["@type"] === "AboutPage",
  );
  expect(aboutPage?.mainEntity?.location).toMatchObject({
    name: "Perpustakaan Universitas Jambi",
    hasMap: "https://maps.app.goo.gl/gZNDkHecRKxmZkYV7",
    geo: {
      latitude: -1.6140602,
      longitude: 103.5174476,
    },
    address: {
      addressLocality: "Mendalo Darat",
      postalCode: "36657",
      addressCountry: "ID",
    },
  });

  const accessibility = await new AxeBuilder({ page })
    .include("main")
    .exclude(
      'iframe[title="Interactive map showing the English Club secretariat"]',
    )
    .analyze();
  expect(accessibility.violations).toEqual([]);
  expect(errors).toEqual([]);

  const evidenceName =
    testInfo.project.name === "desktop-chromium"
      ? "desktop"
      : testInfo.project.name === "mobile-chromium"
        ? "pixel7"
        : "320";
  await page.evaluate(() => {
    document
      .querySelectorAll<HTMLElement>(".site-header, .skip-link, nextjs-portal")
      .forEach((element) => {
        element.style.display = "none";
      });
  });
  const viewport = page.viewportSize();
  if (viewport === null) {
    throw new Error("The screenshot viewport is unavailable.");
  }
  const evidenceHeight = Math.max(viewport.height, 1_900);
  await page.setViewportSize({ width: viewport.width, height: evidenceHeight });
  await section.evaluate((element) => {
    window.scrollTo({
      top: element.getBoundingClientRect().top + window.scrollY,
      behavior: "instant",
    });
  });
  const sectionHeight = await section.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await page.screenshot({
    path: `docs/evidence/about-headquarters-${evidenceName}.png`,
    animations: "disabled",
    clip: {
      x: 0,
      y: 0,
      width: viewport.width,
      height: Math.min(sectionHeight, evidenceHeight),
    },
  });
});

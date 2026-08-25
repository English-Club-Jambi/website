import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const adminCss = readFileSync(
  new URL("../../src/components/admin/admin-shell.module.css", import.meta.url),
  "utf8",
);
const globalCss = readFileSync(
  new URL("../../src/app/globals.css", import.meta.url),
  "utf8",
);

test("shared admin confirmation keeps a real modal contract across breakpoints", async ({
  page,
}, testInfo) => {
  const clientErrors: string[] = [];
  page.on("pageerror", (error) => clientErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") clientErrors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setContent(`<!doctype html>
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
        <title>Admin confirmation browser contract</title>
        <style>:root{--font-bricolage:Arial,sans-serif}\n${globalCss}\n${adminCss}</style>
      </head>
      <body>
        <div class="adminRoot">
          <aside class="sidebar" aria-label="Admin context">
            <div class="adminBrand"><span><strong>English Club</strong><small>Administration</small></span></div>
          </aside>
          <div class="adminWorkArea">
            <main class="adminMain">
              <header class="pageHeading">
                <div><h1>Journal workspace</h1><p>Archive controls require an explicit decision.</p></div>
              </header>
              <section class="adminSection" aria-labelledby="story-title">
                <header class="sectionHeader"><div><h2 id="story-title">A room made for trying again</h2><p>Published story</p></div></header>
                <div class="sectionBody">
                  <button id="confirmation-trigger" class="dangerButton" type="button">Archive story</button>
                  <p id="action-status" role="status">The story remains public.</p>
                </div>
              </section>
            </main>
          </div>
          <dialog class="confirmDialog" aria-labelledby="confirm-title" aria-describedby="confirm-description" aria-modal="true" tabindex="-1">
            <div class="confirmDialogPanel">
              <header>
                <span class="confirmDialogIcon" aria-hidden>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </span>
                <div><h2 id="confirm-title">Archive this story?</h2><p id="confirm-description">This removes it from public journal reads. The archived story remains available to administrators.</p></div>
              </header>
              <footer>
                <button id="confirmation-cancel" class="secondaryButton" type="button">Keep story</button>
                <button id="confirmation-submit" class="dangerButton" type="button">Archive story</button>
              </footer>
            </div>
          </dialog>
        </div>
        <script>
          const trigger = document.querySelector('#confirmation-trigger');
          const dialog = document.querySelector('.confirmDialog');
          const cancel = document.querySelector('#confirmation-cancel');
          const submit = document.querySelector('#confirmation-submit');
          const status = document.querySelector('#action-status');
          let returnFocus = null;
          let working = false;
          window.__archiveExecutions = 0;
          trigger.addEventListener('click', () => {
            returnFocus = document.activeElement;
            document.body.style.overflow = 'hidden';
            dialog.showModal();
            cancel.focus();
          });
          const closeDialog = () => { if (!working && dialog.open) dialog.close(); };
          cancel.addEventListener('click', closeDialog);
          dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            closeDialog();
          });
          dialog.addEventListener('keydown', (event) => {
            if (event.key !== 'Tab') return;
            const controls = [...dialog.querySelectorAll('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
              .filter((element) => element.getClientRects().length > 0);
            const first = controls[0];
            const last = controls.at(-1);
            if (!first || !last) {
              event.preventDefault();
              dialog.focus({ preventScroll: true });
            } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
              event.preventDefault();
              last.focus({ preventScroll: true });
            } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
              event.preventDefault();
              first.focus({ preventScroll: true });
            }
          });
          dialog.addEventListener('close', () => {
            document.body.style.overflow = '';
            if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
          });
          submit.addEventListener('click', async () => {
            if (working) return;
            working = true;
            window.__archiveExecutions += 1;
            cancel.disabled = true;
            submit.disabled = true;
            submit.textContent = 'Working…';
            await new Promise((resolve) => setTimeout(resolve, 60));
            status.textContent = 'The story is archived.';
            working = false;
            dialog.close();
          });
        </script>
      </body>
    </html>`);

  const trigger = page.getByRole("button", { name: "Archive story" }).first();
  const useTouch = testInfo.project.name !== "desktop-chromium";
  if (useTouch) await trigger.tap();
  else await trigger.click();

  const dialog = page.getByRole("dialog", { name: "Archive this story?" });
  const cancel = page.getByRole("button", { name: "Keep story" });
  const submit = dialog.getByRole("button", { name: "Archive story" });
  await expect(dialog).toBeVisible();
  await expect(cancel).toBeFocused();

  const geometry = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return {
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      bottom: bounds.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.viewportWidth + 1);

  for (const control of [cancel, submit]) {
    const box = await control.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);

  await page.screenshot({
    path: `docs/evidence/final-qa/admin-confirm-dialog-${testInfo.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });

  for (const key of ["Shift+Tab", "Shift+Tab", "Tab", "Tab"]) {
    await page.keyboard.press(key);
    expect(
      await dialog.evaluate(
        (element) =>
          element === document.activeElement ||
          element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("status")).toHaveText("The story remains public.");

  if (useTouch) await trigger.tap();
  else await trigger.click();
  if (useTouch) await submit.tap();
  else await submit.click();
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole("status")).toHaveText("The story is archived.");
  expect(await page.evaluate(() => window.__archiveExecutions)).toBe(1);
  await expect(trigger).toBeFocused();
  expect(clientErrors).toEqual([]);
});

declare global {
  interface Window {
    __archiveExecutions: number;
  }
}

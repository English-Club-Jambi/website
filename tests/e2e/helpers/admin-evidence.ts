import type { Page } from "@playwright/test";

type ScreenshotOptions = NonNullable<Parameters<Page["screenshot"]>[0]>;

/**
 * Masks authenticated identity pixels at capture time so off-screen full-page
 * compositing cannot retain a previously painted display name or identifier.
 */
export async function captureAdminEvidence(
  page: Page,
  options: ScreenshotOptions,
) {
  const signOut = page.getByRole("button", {
    name: "Sign out",
    exact: true,
    includeHidden: true,
  });
  if ((await signOut.count()) === 0) {
    await page.screenshot(options);
    return;
  }

  const accountFooter = signOut.first().locator("xpath=..");
  const displayName = accountFooter.locator("strong");
  const loginIdentifier = accountFooter.locator("small");
  await page.screenshot({
    ...options,
    mask: [...(options.mask ?? []), displayName, loginIdentifier],
    maskColor: "#fbfbf7",
  });
}

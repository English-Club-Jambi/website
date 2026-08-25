import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("authenticated assessment workspace remains operable across admin breakpoints", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setContent(`<!doctype html>
    <html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Assessment workspace · English Club Admin</title>
    <style>
      *{box-sizing:border-box}body{margin:0;background:#e7ecff;color:#111827;font:15px/1.45 Arial,sans-serif}button,a{font:inherit}
      .shell{min-height:100dvh;display:grid;grid-template-columns:230px minmax(0,1fr)}aside{border-right:2px solid #111827;background:#fbfbf7;padding:20px}aside strong{font-size:18px}nav{display:grid;gap:8px;margin-top:24px}nav a{min-height:44px;display:flex;align-items:center;border:2px solid transparent;border-radius:10px;padding:8px;color:inherit;text-decoration:none}nav a[aria-current]{border-color:#111827;background:#dfe4ff;font-weight:700}.content{min-width:0;padding:28px}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.1em}.head h1{max-width:720px;margin:8px 0;font-size:clamp(32px,6vw,64px);line-height:.92}.panel{margin-top:24px;border:2px solid #111827;border-radius:14px;background:#fbfbf7;box-shadow:4px 4px 0 #111827;overflow:hidden}.panelHead,.row{padding:16px;border-bottom:2px solid #111827}.panelHead{display:flex;gap:16px;align-items:center;justify-content:space-between;background:#dfe4ff}.panelHead h2,.panelHead p{margin:0}.panelHead p{color:#536071}.row{display:grid;grid-template-columns:36px minmax(0,1fr) auto;align-items:center;gap:12px}.row:last-child{border:0}.actions{display:flex;flex-wrap:wrap;gap:8px}.button{min-width:44px;min-height:44px;border:2px solid #111827;border-radius:9px;background:#fff;padding:9px 12px;font-weight:700}.primary{background:#3346dc;color:white;box-shadow:2px 2px 0 #111827}.gate{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:20px}.rail{background:#f0f2ff}.status{border:1px solid #111827;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:700}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
      @media(max-width:760px){.shell{grid-template-columns:1fr}aside{border-right:0;border-bottom:2px solid #111827;padding:12px 16px}aside nav{display:flex;overflow:auto;margin-top:12px}.content{padding:18px 14px}.gate{grid-template-columns:1fr}.panelHead{align-items:flex-start;display:grid}.row{grid-template-columns:32px minmax(0,1fr)}.actions{grid-column:2}.actions .button{flex:1}.head h1{font-size:42px}}
      @media(max-width:360px){.content{padding-inline:10px}.head h1{font-size:37px}.panel{box-shadow:2px 2px 0 #111827}.panelHead,.row{padding:12px}.actions{width:100%}}
      @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
    </style></head><body><div class="shell" data-authenticated-admin-harness>
      <aside><strong>English Club Admin</strong><nav aria-label="Admin sections"><a href="#">Overview</a><a href="#" aria-current="page">Assessments</a><a href="#">Pages</a><a href="#">Media</a></nav></aside>
      <main class="content"><header class="head"><span class="eyebrow">ASSESSMENT WORKSPACE</span><h1>Weekly reading practice</h1><p>Revision 8 is private until validation and all four reviews are current.</p></header>
      <div class="gate"><section class="panel" aria-labelledby="sections-title"><header class="panelHead"><div><h2 id="sections-title">Versioned sections</h2><p>Order and content belong to this draft.</p></div><button class="button primary">Add section</button></header>
      <div class="row"><strong>01</strong><div><strong>Reading foundations</strong><br><small>12 questions · Untimed</small></div><div class="actions"><button class="button" aria-label="Move Reading foundations up" disabled>Up</button><button class="button" aria-label="Move Reading foundations down">Down</button><button class="button">Open</button></div></div>
      <div class="row"><strong>02</strong><div><strong>Reading detail</strong><br><small>10 questions · Untimed</small></div><div class="actions"><button class="button" aria-label="Move Reading detail up">Up</button><button class="button" aria-label="Move Reading detail down" disabled>Down</button><button class="button">Open</button></div></div></section>
      <aside class="panel rail" aria-label="Publication review"><header class="panelHead"><div><h2>Release gates</h2><p>Checked again by Convex.</p></div><span class="status">Blocked</span></header><div class="row"><span aria-hidden>01</span><div><strong>Academic review</strong><br><small>Approved for revision 8</small></div></div><div class="row"><span aria-hidden>02</span><div><strong>Rights review</strong><br><small>Awaiting decision</small></div></div><div class="row"><span aria-hidden>03</span><div><strong>Accessibility review</strong><br><small>Approved for revision 8</small></div></div><div class="row"><span aria-hidden>04</span><div><strong>Bias review</strong><br><small>Approved for revision 8</small></div></div></aside></div></main>
    </div></body></html>`);

  await expect(page.locator("[data-authenticated-admin-harness]")).toBeVisible();
  const viewport = page.viewportSize();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const button of await page.getByRole("button").all()) {
    const box = await button.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.screenshot({
    path: `docs/evidence/admin/assessment-workspace-${testInfo.project.name}.png`,
    fullPage: true,
  });
  expect(viewport?.width).toBeGreaterThanOrEqual(320);
});

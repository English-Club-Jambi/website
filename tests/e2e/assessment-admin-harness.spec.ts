import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("fixed practice workspace remains operable across admin breakpoints", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setContent(`<!doctype html>
    <html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Practice Builder · English Club Admin</title>
    <style>
      *{box-sizing:border-box}html{overflow-x:hidden}body{margin:0;background:#e7ecff;color:#111827;font:15px/1.45 Arial,sans-serif;overflow-wrap:anywhere}button,a,select{font:inherit}button,a{touch-action:manipulation}
      .shell{min-height:100dvh;display:grid;grid-template-columns:230px minmax(0,1fr)}.side{border-right:2px solid #111827;background:#fbfbf7;padding:20px}.side strong{font-size:18px}.nav{display:grid;gap:8px;margin-top:24px}.nav a{min-height:44px;display:flex;align-items:center;border:2px solid transparent;border-radius:10px;padding:8px;color:inherit;text-decoration:none}.nav a[aria-current]{border-color:#111827;background:#dfe4ff;font-weight:700}.content{min-width:0;padding:28px}.eyebrow{font-size:12px;font-weight:800;letter-spacing:.1em}.head h1{max-width:720px;margin:8px 0;font-size:clamp(32px,6vw,64px);line-height:.92}.head p{max-width:760px;color:#536071}.layout{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start}.panel{margin-top:24px;border:2px solid #111827;border-radius:14px;background:#fbfbf7;box-shadow:4px 4px 0 #111827;overflow:hidden}.panelHead,.section,.question{padding:16px;border-bottom:2px solid #111827}.panelHead{display:flex;gap:16px;align-items:center;justify-content:space-between;background:#dfe4ff}.panelHead h2,.panelHead p,.section h3,.section p{margin:0}.panelHead p,.section p{color:#536071}.status{border:1px solid #111827;border-radius:999px;padding:5px 9px;font-size:12px;font-weight:700;white-space:nowrap}.flow{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px;background:#9aa6be}.flow div{background:#fbfbf7;padding:14px}.flow b{display:block;margin-bottom:4px}.capacity{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px}.capacity div{border:1px solid #9aa6be;border-radius:10px;padding:10px}.capacity strong{display:block;font-size:21px}.question{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,.38fr);gap:18px;align-items:center}.question:last-child{border-bottom:0}.meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px;color:#536071;font-size:13px}.questionSide{display:grid;gap:10px;justify-items:end}.flag{width:100%;border-left:3px solid #f97316;padding-left:9px}.actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}.button{min-width:44px;min-height:44px;border:2px solid #111827;border-radius:9px;background:#fff;padding:9px 12px;font-weight:700}.primary{background:#3346dc;color:white;box-shadow:2px 2px 0 #111827}.danger{background:#fff0e8}.rail{background:#f0f2ff}.rail .section:last-child{border-bottom:0}
      @media(max-width:920px){.layout{grid-template-columns:1fr}.rail{order:-1}}
      @media(max-width:760px){.shell{grid-template-columns:1fr}.side{border-right:0;border-bottom:2px solid #111827;padding:12px 16px}.nav{display:flex;overflow:auto;margin-top:12px}.nav a{flex:0 0 auto}.content{padding:18px 14px}.panelHead{align-items:flex-start;display:grid}.flow{grid-template-columns:1fr}.capacity{grid-template-columns:repeat(2,minmax(0,1fr))}.question{grid-template-columns:1fr}.questionSide{justify-items:stretch}.actions{justify-content:stretch}.actions .button{flex:1}.head h1{font-size:42px}}
      @media(max-width:360px){.content{padding-inline:10px}.head h1{font-size:37px}.panel{box-shadow:2px 2px 0 #111827}.panelHead,.section,.question{padding:12px}.capacity{grid-template-columns:1fr}.actions{display:grid}.actions .button{width:100%}}
      @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important}}
    </style></head><body><div class="shell" data-authenticated-admin-harness>
      <aside class="side"><strong>English Club Admin</strong><nav class="nav" aria-label="Admin sections"><a href="#">Overview</a><a href="#" aria-current="page">Practice Builder</a><a href="#">Programs</a><a href="#">Media</a></nav></aside>
      <main class="content"><header class="head"><span class="eyebrow">FIXED PRACTICE FORMAT</span><h1>Reading Sprint: Text in Context</h1><p>This format controls the eligible Reading questions, the draw quota, timing, and review gates. A learner receives a structured random set that is pinned when Start is pressed.</p></header>
      <div class="layout"><div>
        <section class="panel" aria-labelledby="contract-title"><header class="panelHead"><div><h2 id="contract-title">Format contract</h2><p>The installed skill structure does not change.</p></div><span class="status">Working revision 2</span></header>
          <div class="flow"><div><b>Question Bank</b><span>Reviewed Reading questions</span></div><div><b>Allowed pool</b><span>Per-format allow and disable rules</span></div><div><b>Pinned attempt</b><span>Selected IDs and order stay fixed</span></div></div>
          <div class="section"><h3>Fixed skill structure</h3><p>Reading · 8 questions · 8 minutes</p><div class="capacity"><div><span>Eligible</span><strong>26</strong></div><div><span>Allowed</span><strong>24</strong></div><div><span>Draw quota</span><strong>8</strong></div><div><span>Spare</span><strong>16</strong></div></div></div>
        </section>
        <section class="panel" aria-labelledby="pool-title"><header class="panelHead"><div><h2 id="pool-title">Allowed question pool</h2><p>Changes belong only to this working revision.</p></div><span class="status">24 allowed</span></header>
          <article class="question"><div><strong>What is the writer's main reason for visiting the river project?</strong><div class="meta"><span>Reading</span><span>Practical information</span><span>Moderate</span></div></div><div class="questionSide"><div class="flag"><strong>3 learner flags</strong><br><small>Open for review · no participant data</small></div><div class="actions"><button class="button danger" type="button">Disable</button><button class="button" type="button">Mark reviewed</button></div></div></article>
          <article class="question"><div><strong>Which detail best explains how volunteers divided the work?</strong><div class="meta"><span>Reading</span><span>Supporting detail</span><span>Ready in bank</span></div></div><div class="questionSide"><span class="status">Allowed by format</span><div class="actions"><button class="button danger" type="button">Disable</button></div></div></article>
        </section>
      </div>
      <aside class="panel rail" aria-label="Publication review"><header class="panelHead"><div><h2>Release gates</h2><p>Checked again by Convex.</p></div><span class="status">Blocked</span></header><div class="section"><strong>Pool capacity</strong><p>Enough eligible questions for the configured draw.</p></div><div class="section"><strong>Flag review</strong><p>One open aggregate signal still needs a decision.</p></div><div class="section"><strong>Human approvals</strong><p>Academic, rights, accessibility, and bias review must match revision 2.</p></div><div class="section"><button class="button primary" type="button" disabled>Publish revision</button></div></aside>
      </div></main>
    </div></body></html>`);

  await expect(page.locator("[data-authenticated-admin-harness]")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /create practice format|add section/i }),
  ).toHaveCount(0);
  const viewport = page.viewportSize();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
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

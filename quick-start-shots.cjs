// Captures the phone screenshots used on the Quick Start sheet (quick-start/*.jpg).
// Serve the app first (e.g. npx http-server . -p 8099 -c-1 -s), then:
//   node quick-start-shots.cjs [url]        (default http://localhost:8099)
// Uses Playwright's Chromium from the ForestScribe repo (set PLAYWRIGHT_DIR to use another copy).
// Everything shown is the made-up Sample Project.
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_DIR || 'C:/Users/james/Desktop/Claude/ForestScribe/node_modules/playwright');

const URL = process.argv[2] || 'http://localhost:8099';
const OUT = path.join(__dirname, 'quick-start');
const W = 390, H = 844;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: 'light' });
  await ctx.addInitScript(() => { try { localStorage.setItem('tt3.tourSeen', '1'); } catch (e) {} });
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.TTStore && window.TTStore.ready, null, { timeout: 30000 }).catch(() => {});
  await page.evaluate(async () => { if (window.TTStore && window.TTStore.ready && window.TTStore.ready.then) await window.TTStore.ready; });
  const tab = async (t) => { await page.click(`.tab-btn[data-tab="${t}"]`); await page.waitForTimeout(500); };
  page.on('dialog', (d) => d.accept());

  await tab('projects');
  await page.waitForTimeout(1200);
  await page.locator('#sampleProjectBtn').evaluate((b) => b.click());
  await page.waitForTimeout(1500);
  // Close any confirmation/notice left open by loading the sample.
  await page.keyboard.press('Escape').catch(() => {});
  await tab('takeData');

  // Saves a clip (CSS px, viewport coords) as a JPEG at ~2x print size (the 3x capture is kept: small enough as JPEG).
  const shot = async (name, clip) => {
    const file = path.join(OUT, name + '.jpg');
    await page.screenshot({ path: file, type: 'jpeg', quality: 85, clip: clip || { x: 0, y: 0, width: W, height: H } });
    console.log('wrote', file, Math.round(fs.statSync(file).size / 1024) + ' KB');
  };
  const box = async (sel) => page.locator(sel).first().boundingBox();
  const span = async (topSel, bottomSel, pad = 6) => {
    const a = await box(topSel), b = await box(bottomSel);
    const y = Math.max(0, a.y - pad), y2 = Math.min(H, b.y + b.height + pad);
    return { x: 0, y, width: W, height: y2 - y };
  };

  // Scroll so an element sits mid-screen (clear of the sticky header), then clip to it.
  const at = async (sel) => { await page.locator(sel).first().evaluate((e) => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(400); };

  // 1. Data tab, top: Area / Plot, Enough plots line, species buttons.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await shot('data-top', await span('#menuBtn', '#speciesSelect'));

  // 2. Wheels, Cut / UGS and Submit with the bottom tabs (bottom of the screen).
  await shot('data-wheels', await span('#dbhWheel', '.tab-btn[data-tab="recs"]', 30));

  // 3. Tap Grid (Settings -> Collection -> Tap Grid), then back to Scroll Wheel.
  const setEntry = async (v) => {
    await page.click('#menuBtn'); await page.click('#menuSettingsBtn'); await page.waitForTimeout(300);
    await page.selectOption('#entryModeSelect', v); await page.click('#settingsDoneBtn'); await page.waitForTimeout(500);
  };
  await setEntry('grid');
  await shot('tap-grid', await span('#tapGridPanel', '.tab-btn[data-tab="recs"]', 4));
  await setEntry('wheel');

  // 4. Settings sheet: title down to Collection / Dark Mode.
  await page.click('#menuBtn'); await page.click('#menuSettingsBtn'); await page.waitForTimeout(500);
  await shot('settings', await span('#settingsTitle', '#darkModeSelect', 22));
  await page.click('#settingsDoneBtn'); await page.waitForTimeout(300);

  // 5. Enough plots panel expanded.
  await page.click('#samplingToggle'); await page.waitForTimeout(400);
  await shot('enough-plots', await span('#samplingPanel', '#samplingPanel', 8));
  await page.click('#samplingToggle'); await page.waitForTimeout(300);

  // 6. Tally tab: the Gingrich stocking chart.
  await tab('tally');
  await at('#stockingChart');
  await shot('tally-chart', await span('#stockingChart', '#stockingChart', 6));

  // 7. Check Data results.
  await page.click('#checkDataBtn'); await page.waitForTimeout(600);
  await at('#checkDataResults');
  await shot('check-data', await span('#checkDataBtn', '#checkDataResults', 8));

  // 8. Recs for Area A with two library recommendations added.
  await tab('recs');
  const areas = await page.$$eval('#recsAreaSelect option', (o) => o.map((x) => x.value));
  if (areas.length) { await page.selectOption('#recsAreaSelect', areas[0]); await page.waitForTimeout(300); }
  const cat = page.locator('.rec-category-title', { hasText: 'Invasive' }).first();
  if ((await cat.getAttribute('aria-expanded')) !== 'true') { await cat.evaluate((b) => b.click()); await page.waitForTimeout(400); }
  for (const t of ['General Invasive Species Control', 'Tree-of-Heaven']) {
    await page.locator('.rec-btn', { hasText: t }).first().evaluate((b) => b.click()); await page.waitForTimeout(400);
    const modal = page.locator('#recsInputModal');
    if (await modal.isVisible()) {
      await modal.locator('input, textarea').first().fill('bush honeysuckle and autumn olive');
      await modal.getByText('Add Recommendation').click(); await page.waitForTimeout(400);
    }
  }
  await at('.rec-btn.rec-selected');
  await shot('recs', await span('.rec-category:has(.rec-selected) .rec-category-title', '.rec-category:has(.rec-selected) .rec-buttons', 8));

  await browser.close();
})();

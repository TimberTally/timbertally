// Prints quick-start.html to TimberTally-Quick-Start.pdf (2 letter pages).
// TimberTally has no node_modules of its own; this borrows Playwright's Chromium from the
// ForestScribe repo (it has @playwright/test installed). Set PLAYWRIGHT_DIR to use another copy.
// Its screenshots (quick-start/*.jpg) come from quick-start-shots.cjs (serve the app, then node quick-start-shots.cjs [url]).
// usage (from this folder): node build-quick-start.cjs
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_DIR || 'C:/Users/james/Desktop/Claude/ForestScribe/node_modules/playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file:///' + path.join(__dirname, 'quick-start.html').replace(/\\/g, '/'));
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
  const out = path.join(__dirname, 'TimberTally-Quick-Start.pdf');
  await page.pdf({ path: out, format: 'Letter', printBackground: true, preferCSSPageSize: true });
  // Overflow check: each .page must fit its sheet.
  const over = await page.evaluate(() => [...document.querySelectorAll('.page')].map((p) => p.scrollHeight > p.clientHeight + 1));
  console.log(`wrote ${out}${over.some(Boolean) ? `  ! content overflows on page ${over.indexOf(true) + 1}` : ''}`);
  await browser.close();
})();

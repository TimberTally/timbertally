// Shared e2e helpers: open the app on fresh storage, wait for it to be ready, collect errors.
const { test: base, expect } = require('@playwright/test');

/** Console errors that are not app bugs under the test server. */
const IGNORED = [
    /service ?worker/i, /SW registration failed/, // SW is blocked in tests (serviceWorkers: "block"); its file is checked by fetch
    /Failed to load resource.*favicon/i,
];

const test = base.extend({
    /** Errors seen on the page during the test; asserted empty after each test. */
    errors: [async ({ page }, use) => {
        const errors = [];
        page.on('pageerror', e => errors.push(`pageerror: ${e.message}`));
        page.on('console', m => {
            if (m.type() !== 'error') return;
            const t = m.text();
            if (!IGNORED.some(r => r.test(t))) errors.push(`console.error: ${t}`);
        });
        await use(errors);
        expect(errors, 'no console errors or uncaught exceptions').toEqual([]);
    }, { auto: true }],
});

/**
 * Opens the app. `welcome: false` (default) marks the first-run card as seen so it
 * doesn't cover the screen; `init` runs before any app script (e.g. to seed localStorage).
 */
async function openApp(page, { welcome = false, init, initArg } = {}) {
    if (!welcome) await page.addInitScript(() => { try { localStorage.setItem('tt3.tourSeen', '1'); } catch (e) { /* ignore */ } });
    if (init) await page.addInitScript(init, initArg);
    await page.goto('index.html');
    await waitReady(page);
}

async function waitReady(page) {
    await page.waitForFunction(() => window.TTStore && window.TTApp && window.TTApp.project && window.TTApp.project());
    await page.evaluate(() => window.TTStore.ready);
}

/** Stubs TTStore.saveFile so saved files land in window.__saved instead of a share sheet / download. */
async function stubSaveFile(page) {
    await page.evaluate(() => {
        window.__saved = [];
        window.TTStore.saveFile = async (blob, filename) => { window.__saved.push({ blob, filename }); return 'saved'; };
    });
}

async function tab(page, id) {
    await page.locator(`.tab-btn[data-tab="${id}"]`).click();
}

async function loadSample(page) {
    await page.evaluate(() => window.TTTour.loadSample());
    await expect.poll(() => page.evaluate(() => window.TTApp.data().length)).toBeGreaterThan(100);
}

/** Waits until IndexedDB has finished every write. */
async function flushed(page) {
    await expect.poll(() => page.evaluate(() => window.TTStore.pendingWrites())).toBe(0);
}

module.exports = { test, expect, openApp, waitReady, stubSaveFile, tab, loadSample, flushed };

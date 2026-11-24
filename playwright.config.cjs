// Playwright e2e tests for TimberTally (no build: the repo root is served as-is).
// Port: $E2E_PORT or 8117. Every test gets a fresh browser context (empty storage).
const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.E2E_PORT || 8117);
const phone = { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

module.exports = defineConfig({
    testDir: './e2e',
    timeout: 45_000,
    expect: { timeout: 7_000 },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 2 : undefined,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: `http://127.0.0.1:${PORT}/`,
        trace: 'retain-on-failure',
        // The service worker would cache files across reloads; its file is checked by fetch instead.
        serviceWorkers: 'block',
    },
    projects: [
        { name: 'chromium-phone', use: { ...devices['Desktop Chrome'], ...phone } },
        { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
        { name: 'webkit-phone', use: { ...devices['Desktop Safari'], ...phone } },
    ],
    webServer: {
        command: `node scripts/serve.cjs ${PORT}`,
        url: `http://127.0.0.1:${PORT}/index.html`,
        reuseExistingServer: !process.env.CI,
        timeout: 20_000,
    },
});

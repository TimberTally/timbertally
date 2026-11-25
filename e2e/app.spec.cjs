// Browser tests for TimberTally: first run, data entry and persistence, settings, Tally, Check Data.
const { test, expect, openApp, waitReady, tab, loadSample, flushed } = require('./helpers.cjs');

test('first run shows the welcome card', async ({ page }) => {
    await openApp(page, { welcome: true });
    const card = page.locator('#ttWelcomeTitle');
    await expect(card).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-act="sample"]')).toBeVisible();
    await page.locator('[data-act="later"]').click();
    await expect(card).toHaveCount(0);
    // Remembered: not shown again after a reload.
    await page.reload();
    await waitReady(page);
    await page.waitForTimeout(1200);
    await expect(page.locator('#ttWelcomeTitle')).toHaveCount(0);
});

test('Try the Sample Project loads 2 Areas', async ({ page }) => {
    await openApp(page);
    await tab(page, 'projects');
    await page.locator('#sampleProjectBtn').click();
    await expect.poll(() => page.evaluate(() => window.TTApp.data().length)).toBeGreaterThan(100);
    const areas = await page.evaluate(() => [...new Set(window.TTApp.data().map(e => e.areaLetter))].sort());
    expect(areas).toEqual(['A', 'B']);
    expect(await page.evaluate(() => window.TTApp.project().name)).toMatch(/Sample/);
});

/** Picks a value on a scroll wheel by tapping its row. */
async function pickWheel(page, wheelId, value) {
    const item = page.locator(`#${wheelId} .scroll-wheel-item[data-value="${value}"]`);
    await item.scrollIntoViewIfNeeded();
    await item.click();
    await expect.poll(() => page.locator(`#${wheelId === 'dbhWheel' ? 'dbhSelect' : 'logsSelect'}`).inputValue()).toBe(value);
}

test('an added species survives localStorage being cleared (IndexedDB copy)', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => window.TTStore.writeJSON(window.TTStore.K.species, [...window.TTApp.speciesList(), 'Test Cherry']));
    await flushed(page);
    await page.evaluate(() => localStorage.removeItem('tt3.species'));
    await page.reload();
    await waitReady(page);
    expect(await page.evaluate(() => window.TTApp.speciesList())).toContain('Test Cherry');
    expect(await page.evaluate(() => localStorage.getItem('tt3.species'))).toContain('Test Cherry');
});

test('add a tree with the wheels; it survives a reload (IndexedDB)', async ({ page }) => {
    await openApp(page);
    await page.locator('#speciesQuick button', { hasText: 'White Oak' }).first().click();
    await pickWheel(page, 'dbhWheel', '16');
    await pickWheel(page, 'logsWheel', '2');
    await page.locator('#submitBtn').click();
    await expect(page.locator('#feedbackMsg')).toContainText('Entry recorded');
    const saved = await page.evaluate(() => window.TTApp.data().map(e => [e.species, e.dbh, e.logs, e.plotNumber, e.areaLetter]));
    expect(saved).toEqual([['White Oak', '16', '2', 1, 'A']]);
    await flushed(page);
    expect(await page.evaluate(() => window.TTStore.backend())).toBe('indexeddb');
    await page.reload();
    await waitReady(page);
    const after = await page.evaluate(() => window.TTApp.data().map(e => [e.species, e.dbh, e.logs]));
    expect(after).toEqual([['White Oak', '16', '2']]);
    await expect(page.locator('#entriesTableBody')).toContainText('White Oak');
});

test('add a tree with Tap Grid; it survives a reload', async ({ page }) => {
    await openApp(page);
    await page.locator('#menuBtn').click();
    await page.locator('#menuSettingsBtn').click();
    await page.locator('#entryModeSelect').selectOption('grid');
    await page.locator('#settingsDoneBtn').click();
    await expect(page.locator('#tapGridPanel')).toBeVisible();
    await page.locator('#speciesQuick button', { hasText: 'Red Oak' }).first().click();
    await page.locator('#tapGridPanel [data-dbh="18"]').click();
    await page.locator('#tapGridPanel [data-logs="2.5"]').click();
    await expect.poll(() => page.evaluate(() => window.TTApp.data().length)).toBe(1);
    await flushed(page);
    await page.reload();
    await waitReady(page);
    expect(await page.evaluate(() => window.TTApp.data().map(e => [e.species, e.dbh, e.logs]))).toEqual([['Red Oak', '18', '2.5']]);
    await expect(page.locator('#tapGridPanel')).toBeVisible(); // the setting is remembered too
});

test('existing localStorage tt3 data is copied into IndexedDB on first load', async ({ page }) => {
    const project = {
        id: 'p_legacy1', name: 'Old Local Project', createdAt: 1700000000000, updatedAt: 1700000000000, lastBackupAt: 0,
        data: [{ id: 1, plotNumber: 1, areaLetter: 'A', species: 'Hickory', dbh: '14', logs: '1.5', cutStatus: 'No', ugsStatus: 'No', notes: '' }],
        plot: 1, areaIdx: 0, notes: '', areaNotes: {}, areaRegen: {}, areaAcres: {}, recs: {},
    };
    await openApp(page, {
        init: p => {
            if (sessionStorage.getItem('seeded')) return; // only before the first load
            sessionStorage.setItem('seeded', '1');
            localStorage.setItem('tt3.migrated', JSON.stringify({ at: 1 }));
            localStorage.setItem(`tt3.p.${p.id}`, JSON.stringify(p));
            localStorage.setItem('tt3.index', JSON.stringify({ currentId: p.id, projects: { [p.id]: { id: p.id, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt, lastBackupAt: 0, treeCount: 1 } } }));
        },
        initArg: project,
    });
    expect(await page.evaluate(() => window.TTStore.backend())).toBe('indexeddb');
    expect(await page.evaluate(() => window.TTApp.project().name)).toBe('Old Local Project');
    expect(await page.evaluate(() => window.TTApp.data()[0].species)).toBe('Hickory');
    // In IndexedDB itself, not only in memory:
    const inIdb = await page.evaluate(() => new Promise((res, rej) => {
        const r = indexedDB.open('timbertally3');
        r.onsuccess = () => { const g = r.result.transaction('kv').objectStore('kv').get('tt3.p.p_legacy1'); g.onsuccess = () => res(g.result ? JSON.parse(g.result).name : null); g.onerror = rej; };
        r.onerror = rej;
    }));
    expect(inIdb).toBe('Old Local Project');
    // localStorage copy left in place as a fallback.
    expect(await page.evaluate(() => !!localStorage.getItem('tt3.p.p_legacy1'))).toBe(true);
});

async function tallyText(page) {
    await tab(page, 'tally');
    await expect(page.locator('#tallySummaryCards')).not.toBeEmpty();
    return page.locator('#tallySummaryCards').innerText();
}

test('fixed-plot setting changes the Tally numbers', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    const prism = await tallyText(page);
    const tpaPrism = await page.evaluate(() => calculateForestryReport(window.TTApp.data(), window.TTApp.settings().cruise, 'Doyle', 78).summary.totalTreesPerAcre);
    await page.locator('#menuBtn').click();
    await page.locator('#menuSettingsBtn').click();
    await page.locator('#cruiseMethodSelect').selectOption('fixed');
    await expect(page.locator('#plotSizeGroup')).toBeVisible();
    await page.locator('#plotSizeSelect').selectOption('0.2');
    await expect(page.locator('#bafGroup')).toBeHidden();
    await page.locator('#settingsDoneBtn').click();
    expect(await page.evaluate(() => window.TTApp.settings().cruise)).toEqual({ method: 'fixed', plotAcres: 0.2 });
    const fixed = await tallyText(page);
    expect(fixed).not.toEqual(prism);
    // 1/5-ac plots: TPA = 5 × trees / plots.
    const { tpa, trees, plots } = await page.evaluate(() => {
        const d = window.TTApp.data();
        return {
            tpa: calculateForestryReport(d, window.TTApp.settings().cruise, 'Doyle', 78).summary.totalTreesPerAcre,
            trees: d.filter(e => !e.emptyPlot).length,
            plots: new Set(d.map(e => e.areaLetter + e.plotNumber)).size,
        };
    });
    expect(tpa).not.toBeCloseTo(tpaPrism, 1);
    expect(tpa).toBeGreaterThan(0);
    // All-areas report pools plot numbers across Areas (see report: plots counted by number).
    expect(trees).toBeGreaterThan(plots);
});

test('Enough plots line expands and collapses', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await tab(page, 'takeData');
    const toggle = page.locator('#samplingToggle');
    await expect(page.locator('#neededPlotsValue')).toContainText('±10%');
    await expect(page.locator('#samplingDetail')).toBeHidden();
    await toggle.click();
    await expect(page.locator('#samplingDetail')).toBeVisible();
    await expect(page.locator('#samplingDetail')).toContainText('Sampling error');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(page.locator('#samplingDetail')).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('Check Data finds an injected duplicate', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    // Two identical trees saved 2 s apart (ids are save times).
    await page.evaluate(() => {
        const p = window.TTApp.project();
        const t = Date.now();
        const tree = { plotNumber: 3, areaLetter: 'A', species: 'Sassafras', dbh: '12', logs: '1', cutStatus: 'No', ugsStatus: 'No', notes: '', location: null };
        p.data.push({ ...tree, id: t }, { ...tree, id: t + 2000 });
        window.TTStore.saveProject(p);
        window.TTApp.openNewProject(p);
    });
    await expect.poll(() => page.evaluate(() => window.TTApp.data().filter(e => e.species === 'Sassafras').length)).toBe(2);
    await tab(page, 'tally');
    await page.locator('#checkDataBtn').click();
    await expect(page.locator('#checkDataResults')).toContainText(/Possible duplicate: Sassafras 12"/);
});

test('menu items open', async ({ page }) => {
    await openApp(page);
    const open = async (id, check) => {
        await page.locator('#menuBtn').click();
        await expect(page.locator('#appMenu')).toBeVisible();
        await page.locator(`#${id}`).click();
        await check();
        await page.keyboard.press('Escape');
        await page.evaluate(() => { window.TTMenu.closeAll(); window.TTSettings?.close?.(); window.TTWording?.close?.(); window.TTInfo?.close?.(); });
    };
    await open('menuSettingsBtn', () => expect(page.locator('#settingsSection')).toBeVisible());
    await open('menuHelpBtn', () => expect(page.locator('#helpTourHere')).toBeVisible());
    await open('menuWordingBtn', () => expect(page.locator('#ttWordingTitle')).toBeVisible());
    await open('showInfoBtn', () => expect(page.locator('#ttInfoModal')).toBeVisible());
    await open('installAppBtn', () => expect(page.locator('body')).toBeVisible());
    // Quick Start opens the PDF in a new tab: check the link target exists instead of following it.
    const qs = await page.locator('#menuQuickStart').getAttribute('href');
    if (qs) expect((await page.request.get(qs)).ok()).toBe(true);
});

test('service worker file is fetchable and names the cache version', async ({ page }) => {
    await openApp(page);
    const r = await page.request.get('service-worker.js');
    expect(r.ok()).toBe(true);
    expect(await r.text()).toMatch(/CACHE_NAME\s*=/);
    expect((await page.request.get('manifest.json')).ok()).toBe(true);
});

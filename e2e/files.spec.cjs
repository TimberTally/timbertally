// Browser tests: Save ZIP, Save / Restore Backup, Standard Wording, tours.
const fs = require('node:fs');
const path = require('node:path');
const { test, expect, openApp, stubSaveFile, tab, loadSample, flushed } = require('./helpers.cjs');

test('Save ZIP produces the expected files', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await stubSaveFile(page);
    await page.locator('#saveCsvBtn').click();
    await expect.poll(() => page.evaluate(() => window.__saved.length), { timeout: 20000 }).toBe(1);
    const { filename, names, csvHead, csvText, csvBytes } = await page.evaluate(async () => {
        const { blob, filename } = window.__saved[0];
        const zip = await JSZip.loadAsync(blob);
        const names = Object.keys(zip.files).sort();
        const csv = names.find(n => /_AreaA_Doyl.*\.csv$/.test(n));
        const bytes = csv ? await zip.file(csv).async('uint8array') : new Uint8Array(0);
        const csvText = new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
        return { filename, names, csvText, csvBytes: Array.from(bytes.slice(0, 3)), csvHead: csvText.slice(1).split('\n')[0] };
    });
    expect(filename).toMatch(/_TimberTally_.*\.zip$/);
    // Exactly these files: per Area a data CSV (Doyle FC78, BAF 10, stand & stock tables at the bottom), Summary Report and Graphs pages;
    // then the property summary, the stocking chart for all Areas and the Area notes.
    const base = 'Sample_Property__made-up_data_';
    const expected = [];
    for (const a of ['A', 'B']) expected.push(`${base}_Area${a}_DoylFC78_BAF10.csv`, `${base}_Area${a}_Graphs.png`, `${base}_Area${a}_Summary_Report.png`);
    expected.push(`${base}_Area_Notes.txt`, `${base}_Property_Summary.png`, `${base}_Stocking_Chart_All_Areas.png`);
    expect(names).toEqual(expected.sort());
    expect(csvHead).toMatch(/Plot/i);
    // UTF-8 byte-order mark, so Excel does not show "â€”" for dashes and symbols
    expect(csvBytes).toEqual([0xEF, 0xBB, 0xBF]);
    // Stand & stock tables are at the bottom of the Area CSV
    expect(csvText).toContain('--- STAND AND STOCK TABLES - Area A');
    expect(csvText).toContain('--- STAND TABLE - Trees per acre ---');
    expect(csvText).toContain('--- STOCK TABLE - Volume per acre (board feet) ---');
    expect(csvText.indexOf('STAND TABLE')).toBeGreaterThan(csvText.indexOf('TALLY DATA'));
});

test('Save Backup contains every project and the Standard Wording', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.evaluate(() => window.TTStore.writeJSON(window.TTStore.K.wording, { recs: { anything: { text: 'My words' } }, added: [] }));
    await stubSaveFile(page);
    await tab(page, 'projects');
    await page.locator('#saveBackupBtn').click();
    await expect.poll(() => page.evaluate(() => window.__saved.length)).toBe(1);
    const b = await page.evaluate(async () => JSON.parse(await window.__saved[0].blob.text()));
    expect(window_filename(await page.evaluate(() => window.__saved[0].filename))).toBe(true);
    expect(b.format).toBe('timbertally-backup');
    expect(b.projects.length).toBe(await page.evaluate(() => window.TTStore.listProjects().length));
    expect(b.projects.some(p => /Sample/.test(p.name) && p.data.length > 100)).toBe(true);
    expect(b.wording.recs.anything.text).toBe('My words');
    await expect(page.locator('#backupFeedback')).toContainText('Backup saved');
});
const window_filename = f => /^TimberTally_Backup_\d{8}_\d{4}\.json$/.test(f);

test('Restore Backup adds projects and never replaces', async ({ page }) => {
    await openApp(page);
    page.on('dialog', d => d.accept());
    const before = await page.evaluate(() => window.TTStore.listProjects().map(p => p.name));
    const backup = {
        format: 'timbertally-backup', version: 1, exportedAt: '2026-01-02T03:04:05Z', app: 'TimberTally 3',
        projects: [{ id: 'p_restoreme', name: 'Restored Farm', createdAt: 1, updatedAt: 1, lastBackupAt: 0, plot: 1, areaIdx: 0, notes: '', areaNotes: {}, areaRegen: {}, areaAcres: {}, recs: {},
            data: [{ id: 5, plotNumber: 1, areaLetter: 'A', species: 'Beech', dbh: '20', logs: '2', cutStatus: 'No', ugsStatus: 'No', notes: '' }] }],
        species: ['Pawpaw'], recDetails: null, wording: { recs: {}, added: [] },
    };
    await tab(page, 'projects');
    await page.locator('#restoreBackupInput').setInputFiles({ name: 'TimberTally_Backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await expect.poll(() => page.evaluate(() => window.TTStore.listProjects().map(p => p.name))).toEqual(expect.arrayContaining([...before, 'Restored Farm']));
    // Restoring the same file again adds nothing (same contents are skipped).
    const n = await page.evaluate(() => window.TTStore.listProjects().length);
    await page.locator('#restoreBackupInput').setInputFiles({ name: 'TimberTally_Backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.TTStore.listProjects().length)).toBe(n);
    expect(await page.evaluate(() => window.TTApp.speciesList())).toContain('Pawpaw');
    await flushed(page);
});

test('Standard Wording edit flows into a newly added recommendation', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    // A library recommendation with no {{blank}} to ask for.
    const rec = await page.evaluate(() => {
        const r = window.TTWording.library().find(x => !/\{\{[a-z]/.test(x.text) && !/\[\[/.test(x.text));
        return { id: r.id, category: r.category, title: r.title };
    });
    const MINE = 'My own wording for this recommendation, written in the test.';
    await page.locator('#menuBtn').click();
    await page.locator('#menuWordingBtn').click();
    await expect(page.locator('#ttWordingTitle')).toBeVisible();
    const cat = page.locator(`details.tt-wording-cat[data-cat="${rec.category}"]`);
    await cat.locator('summary').click();
    await cat.locator(`.tt-wording-item[data-id="${rec.id}"] [data-act="open"]`).click();
    await page.locator('#ttwText').fill(MINE);
    await expect.poll(() => page.evaluate(id => window.TTWording.read().recs[id]?.text, rec.id)).toBe(MINE);
    await page.keyboard.press('Escape');
    await page.evaluate(() => window.TTWording.close());
    await tab(page, 'recs');
    const libCat = page.locator(`#recsLibrary [data-cat="${rec.category}"]`).first();
    if ((await libCat.getAttribute('aria-expanded')) !== 'true') await libCat.click();
    await page.locator(`#recsLibrary [data-rec="${rec.id}"]`).click();
    await expect.poll(async () => (await page.locator('#recsEditList').innerText()) + await page.locator('#recsEditList textarea').evaluateAll(t => t.map(x => x.value).join('\n'))).toContain(MINE);
});

// Tour step targets, read from tour.js so a renamed id fails here.
const tourSrc = fs.readFileSync(path.join(__dirname, '..', 'tour.js'), 'utf8');
const TOUR_NAMES = ['data', 'projects', 'tally', 'recs', 'settings'];

for (const name of TOUR_NAMES) {
    test(`tour "${name}" runs to the end and every step target exists`, async ({ page }) => {
        await openApp(page);
        await loadSample(page);
        await page.evaluate(n => window.TTTour.start(n), name);
        const card = page.locator('.tt-tour-card');
        await expect(card).toBeVisible();
        const total = Number((await page.locator('.tt-tour-count').innerText()).split(' of ')[1]);
        expect(total).toBeGreaterThan(1);
        for (let i = 1; i <= total; i++) {
            await expect(page.locator('.tt-tour-count')).toHaveText(`${i} of ${total}`);
            await page.locator('.tt-tour-card [data-act="next"]').click();
        }
        await expect(page.locator('.tt-tour-overlay')).toHaveCount(0);
        // Every target the tour names must be in the page (hidden is fine: such steps are skipped).
        const block = tourSrc.slice(tourSrc.indexOf(name === 'data' ? 'const DATA_STEPS' : `${name}: {`));
        const end = block.search(/\n\s*\],?;?\s*\n/); // the line closing the steps array
        const targets = [...block.slice(0, end).matchAll(/target:\s*'([^']+)'/g)].map(m => m[1]);
        expect(targets.length).toBeGreaterThan(1);
        if (name === 'settings') await page.evaluate(() => window.TTSettings?.open?.());
        const missing = await page.evaluate(ts => ts.filter(t => !document.querySelector(t)), targets);
        expect(missing, `tour "${name}" targets not in the page`).toEqual([]);
    });
}

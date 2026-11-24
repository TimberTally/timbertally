// Browser tests for the fixes from the 2026-11-24 code audit (docs/AUDIT-2026-11-24.md):
// hostile strings (#5), two windows (#3), CSV round-trip through Import (#6, #11),
// logs limited to the volume table (#4) and the save on hide (#9).
const { test, expect, openApp, waitReady, tab, flushed } = require('./helpers.cjs');

const H = '<img src=x onerror=window.__xss=1>';

test('hostile strings from CSV import and backup restore never run', async ({ page }) => {
    await openApp(page);
    page.on('dialog', d => d.accept(d.type() === 'prompt' ? 'A' : undefined));
    // 1) Backup restore: project name, entries, Area notes, a recommendation, the species list.
    const backup = {
        format: 'timbertally-backup', version: 1, exportedAt: '2026-01-02T03:04:05Z', app: 'TimberTally 3',
        projects: [{
            id: 'p_hostile', name: `Farm ${H}`, createdAt: 1, updatedAt: 1, lastBackupAt: 0, plot: 1, areaIdx: 0, notes: '',
            areaNotes: { A: `Notes ${H}` }, areaRegen: {}, areaAcres: { A: 10 },
            recs: { A: [{ id: `r1"><img src=x onerror=window.__xss=1>`, title: `Rec ${H}`, text: `Text ${H}` }] },
            data: [
                { id: 1, plotNumber: 1, areaLetter: 'A', species: H, dbh: '16', logs: '2', cutStatus: 'No', ugsStatus: 'No', notes: H },
                { id: 2, plotNumber: `2${H}`, areaLetter: H, species: 'White Oak', dbh: H, logs: H, cutStatus: H, ugsStatus: H, notes: '' },
                { id: 3, plotNumber: 2, areaLetter: 'A', species: 'Red Oak', dbh: '14', logs: '1', cutStatus: 'Yes', ugsStatus: 'No', notes: '' },
            ],
        }],
        species: [H], recDetails: null, wording: { recs: {}, added: [{ id: `w1${H}`, category: `Cat ${H}`, title: `Mine ${H}`, text: `Body ${H}` }] },
    };
    await tab(page, 'projects');
    await page.locator('#restoreBackupInput').setInputFiles({ name: 'TimberTally_Backup.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(backup)) });
    await expect.poll(() => page.evaluate(() => window.TTStore.listProjects().some(p => p.id === 'p_hostile'))).toBe(true);
    await page.locator('#loadProjectSelect').selectOption('p_hostile');
    await page.locator('#loadProjectBtn').click();
    await expect.poll(() => page.evaluate(() => window.TTApp.project().id)).toBe('p_hostile');

    // 2) CSV import (TimberTally format) with hostile species and notes, into the open project.
    const q = s => `"${s.replace(/"/g, '""')}"`;
    const csv = `PlotNumber,Area,DBH,Species,Logs,Cut,UGS,Notes,Latitude,Longitude\n3,A,18,${q(H)},2,No,No,${q(H)},37.1,-84.2\n3,A,20,${q('"><svg onload=window.__xss=1>')},3,Yes,No,${q('a\nb ' + H)},,\n`;
    await page.locator('#csvFileInput').setInputFiles({ name: `trees${'"'}.csv`, mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.locator('#loadCsvBtn').click();
    await expect.poll(() => page.evaluate(() => window.TTApp.data().length)).toBe(5);

    // 3) Match Columns (a CSV that isn't TimberTally's) with a hostile header and species.
    const other = `Plot,${H},Tree,Height\n4,${H},16,2\n`;
    await page.locator('#csvFileInput').setInputFiles({ name: 'other.csv', mimeType: 'text/csv', buffer: Buffer.from(other) });
    await page.locator('#loadCsvBtn').click();
    await expect(page.locator('#csvMatchModal')).toBeVisible();
    await page.locator('#csvMatchModal select[data-field="species"]').selectOption('1');
    await page.locator('#csvMatchModal select[data-field="dbh"]').selectOption('2');
    await page.locator('#csvMatchModal [data-import]').click();
    await expect.poll(() => page.evaluate(() => window.TTApp.data().length)).toBe(6);

    // 4) Visit everything that shows project text.
    for (const id of ['takeData', 'projects', 'tally', 'recs', 'takeData']) {
        await tab(page, id);
        await page.waitForTimeout(150);
    }
    await page.locator('#plotsBtn').click();
    await page.waitForTimeout(150);
    await page.keyboard.press('Escape');
    await page.evaluate(() => document.querySelectorAll('.modal-overlay').forEach(m => { if (m.id === 'plotsModal') m.style.display = 'none'; }));
    await page.locator('#areaNotesBtn').click();
    await page.waitForTimeout(150);
    await page.evaluate(() => document.querySelectorAll('.modal-overlay').forEach(m => { m.style.display = 'none'; }));
    await tab(page, 'tally');
    await page.locator('#checkDataBtn').click();
    await expect(page.locator('#checkDataResults')).toBeVisible();
    for (const a of ['A', 'ALL']) { await page.locator('#tallyAreaSelect').selectOption(a); await page.waitForTimeout(150); }
    await tab(page, 'recs');
    await page.evaluate(() => document.querySelector('.recs-mini-tab[data-mode="preview"]')?.click());
    await page.waitForTimeout(150);
    const openMenu = async id => {
        await page.locator('#menuBtn').click();
        await page.locator(`#${id}`).click();
        await page.waitForTimeout(200);
        await page.keyboard.press('Escape');
        await page.evaluate(() => { window.TTMenu.closeAll(); window.TTSettings?.close?.(); window.TTWording?.close?.(); window.TTInfo?.close?.(); });
    };
    await openMenu('menuSettingsBtn');
    await openMenu('menuHelpBtn');
    await openMenu('menuWordingBtn');
    await page.evaluate(() => window.TTWording?.open?.());
    await page.evaluate(() => document.querySelectorAll('#ttWordingModal details').forEach(d => { d.open = true; }));
    await page.waitForTimeout(200);
    await page.evaluate(() => window.TTWording?.close?.());
    await openMenu('showInfoBtn');

    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(await page.evaluate(() => document.querySelectorAll('img[src="x"], svg[onload]').length)).toBe(0);
    // The text itself is shown as text.
    await tab(page, 'takeData');
    await expect(page.locator('#entriesTableBody')).toContainText('<img src=x');
    await flushed(page);
});

for (const via of ['BroadcastChannel', 'storage event']) {
    test(`two windows on one project never lose a tree (${via})`, async ({ page, context }) => {
        const noBc = via !== 'BroadcastChannel';
        if (noBc) await context.addInitScript(() => { delete window.BroadcastChannel; });
        await openApp(page);
        await flushed(page);
        const page2 = await context.newPage();
        await page2.goto('index.html');
        await waitReady(page2);
        const id = await page.evaluate(() => window.TTApp.project().id);
        expect(await page2.evaluate(() => window.TTApp.project().id)).toBe(id);
        const add = (p, n) => p.evaluate(n => {
            window.TTApp.data().push({ id: n, plotNumber: 1, areaLetter: 'A', species: 'White Oak', dbh: '16', logs: '2', cutStatus: 'No', ugsStatus: 'No', notes: `tree ${n}`, location: null });
            return window.ttProject.save();
        }, n);
        const ids = p => p.evaluate(() => window.TTApp.data().map(e => e.id).sort((a, b) => a - b));

        // A tree in window 1 shows up in window 2 (reloaded before its next write), with a notice.
        await add(page, 101);
        await expect.poll(() => ids(page2)).toEqual([101]);
        await expect(page2.locator('#feedbackMsg')).toContainText('Updated from another window');
        await add(page2, 102);
        await expect.poll(() => ids(page)).toEqual([101, 102]);

        // Both windows save at the same moment: neither tree is lost, in either window or in storage.
        await Promise.all([add(page, 103), add(page2, 104)]);
        await expect.poll(() => ids(page), { timeout: 10000 }).toEqual([101, 102, 103, 104]);
        await expect.poll(() => ids(page2), { timeout: 10000 }).toEqual([101, 102, 103, 104]);
        await flushed(page); await flushed(page2);
        const page3 = await context.newPage();
        await page3.goto('index.html');
        await waitReady(page3);
        expect(await ids(page3)).toEqual([101, 102, 103, 104]);
        await page2.close(); await page3.close();
    });
}

test('CSV export → Import, Match Columns and Merge read back quotes, commas, line breaks and GPS', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
        const data = [
            { id: 1, plotNumber: 1, areaLetter: 'A', species: 'White Oak', dbh: '16', logs: '2', cutStatus: 'No', ugsStatus: 'No', notes: 'Den tree\nmarked twice', location: { lat: 37.123456, lon: -84.654321 } },
            { id: 2, plotNumber: 2, areaLetter: 'A', species: 'Oak "big"', dbh: '20', logs: '3', cutStatus: 'Yes', ugsStatus: 'Yes', notes: 'fire scar, base; says "hollow"', location: { lat: 37.5, lon: -84.25 } },
            { id: 3, plotNumber: 3, areaLetter: 'A', species: '=HYPERLINK("x")', dbh: '14', logs: 'Cull', cutStatus: 'No', ugsStatus: 'No', notes: '+1 -2 @3', location: null },
            { id: 4, plotNumber: 4, areaLetter: 'A', emptyPlot: true, species: '', dbh: '', logs: '', cutStatus: 'No', ugsStatus: 'No', notes: '', location: { lat: 37.6, lon: -84.3 } },
        ];
        const text = window.TTApp.entriesCsv(data) + '\n\n--- TALLY DATA ---\n';
        const pick = e => [e.plotNumber, e.species, e.notes, e.cutStatus, e.ugsStatus, !!e.emptyPlot, e.location ? [e.location.lat, e.location.lon] : null];
        const t = window.TTCsvMatch.readTable(text);
        const match = window.TTCsvMatch.buildEntries(t, window.TTCsvMatch.guessColumns(t.headers), 'logs16', {}).entries;
        return {
            text,
            want: data.map(pick),
            imported: window.TTApp.parseCsv(text).map(pick),
            merged: window.TTMerge.parseTimberTallyCsv(text).map(pick),
            matched: match.map(pick),
        };
    });
    expect(r.imported).toEqual(r.want);
    expect(r.merged).toEqual(r.want);
    expect(r.matched).toEqual(r.want);
    // Text that starts like a formula is guarded in the file; GPS stays a number (negative longitude).
    expect(r.text).toContain(`"'=HYPERLINK(""x"")"`);
    expect(r.text).toContain(`"'+1 -2 @3"`);
    expect(r.text).toContain(',37.123456,-84.654321');
});

test('logs choices follow the volume table for the DBH, and the selection is clamped', async ({ page }) => {
    await openApp(page);
    const r = await page.evaluate(() => {
        const e = window.ttEntry;
        const out = { 12: e.logValues('12'), 16: e.logValues('16'), 20: e.logValues('20'), 30: e.logValues('30'), 8: e.logValues('8') };
        e.setDbh('30'); e.setLogs('6');
        e.setDbh('16');
        out.clamped16 = e.getLogs();
        e.setLogs('Cull'); e.setDbh('24');
        out.cullKept = e.getLogs();
        return out;
    });
    expect(r[12]).toEqual(['1', '1.5', '2', '2.5', '3', '3.5', '4', 'Cull']);
    expect(r[16]).toEqual(['1', '1.5', '2', '2.5', '3', '3.5', '4', 'Cull']);
    expect(r[20]).toEqual(['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', 'Cull']);
    expect(r[30]).toEqual(['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', 'Cull']);
    expect(r[8]).toEqual(['0']);
    expect(r.clamped16).toBe('4');
    expect(r.cullKept).toBe('Cull');
    // Tap Grid shows the same choices.
    await page.evaluate(() => {
        const sel = document.getElementById('entryModeSelect');
        sel.value = 'grid';
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        window.ttEntry.setDbh('16');
    });
    await expect.poll(() => page.evaluate(() => [...document.querySelectorAll('#tapGridPanel [data-logs]')].map(b => b.dataset.logs)))
        .toEqual(['1', '1.5', '2', '2.5', '3', '3.5', '4', 'Cull']);
});

test('leaving the app (pagehide / screen off) does not mark the project changed', async ({ page }) => {
    await openApp(page);
    await page.evaluate(() => {
        const p = window.TTApp.project();
        p.data.push({ id: 7, plotNumber: 1, areaLetter: 'A', species: 'White Oak', dbh: '16', logs: '2', cutStatus: 'No', ugsStatus: 'No', notes: '', location: null });
        p.lastBackupAt = Date.now() + 1000;   // backed up after the last change
        window.ttProject.save();
    });
    await flushed(page);
    const before = await page.evaluate(() => window.TTStore.listProjects()[0].updatedAt);
    await page.waitForTimeout(30);
    await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); document.dispatchEvent(new Event('visibilitychange')); });
    await flushed(page);
    const after = await page.evaluate(() => window.TTStore.listProjects()[0]);
    expect(after.updatedAt).toBe(before);
    expect(after.updatedAt <= after.lastBackupAt).toBe(true);
});

test('Merge Another Device shows its summary in the Merge section, not an alert box', async ({ page }) => {
    await openApp(page);
    const dialogs = [];
    page.on('dialog', d => { dialogs.push(d.type()); d.accept(); });
    await page.evaluate(() => {
        window.TTApp.data().push({ id: 1, plotNumber: 9, areaLetter: 'A', species: 'White Oak', dbh: '16', logs: '2', cutStatus: 'No', ugsStatus: 'No', notes: '', location: null });
        window.ttProject.save();
    });
    const csv = 'PlotNumber,Area,DBH,Species,Logs,Cut,UGS,Notes,Latitude,Longitude\n9,A,14,Red Oak,1,No,No,,,\n';
    await tab(page, 'projects');
    await page.locator('#mergeDeviceInput').setInputFiles({ name: 'phone.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.locator('#mergeGo').click();
    const fb = page.locator('#mergeFeedback');
    await expect(fb).toBeVisible();
    await expect(fb).toContainText('Added 1 tree from phone.csv.');
    await expect(fb).toContainText('Area A: 1 tree, plot 10 (renumbered)');
    await expect(fb).not.toContainText('10–10');
    expect(dialogs.filter(t => t === 'alert')).toEqual([]);
    await flushed(page);
});

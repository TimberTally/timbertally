// Plots / Data: the tabbed plot sheet over the project's real trees; the blank CSV template.
const { test, expect, openApp, stubSaveFile, tab, loadSample, flushed } = require('./helpers.cjs');

const cell = (m, r, c) => m.locator(`input[data-r="${r}"][data-c="${c}"]`);

test('Plots / Data: type a new plot, mark an empty plot, edit and delete saved trees, Save', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await tab(page, 'takeData');
    const before = await page.evaluate(() => window.TTApp.data().map(e => ({ ...e })));
    const a1 = before.filter(e => e.areaLetter === 'A' && e.plotNumber === 1 && !e.emptyPlot);
    const maxA = Math.max(...before.filter(e => e.areaLetter === 'A').map(e => e.plotNumber));
    await page.locator('#plotsDataBtn').click();
    const m = page.locator('#plotsDataModal');
    await expect(m).toBeVisible();
    await expect(m.locator('.pe-tab.active')).toContainText('Area A');
    await expect(m.locator('.pe-pill.active')).toHaveText(`Plot 1 · ${a1.length}`);
    await expect(m.locator('.pe-status')).toHaveText('All saved');

    // + Plot → the next free number, first Species cell focused.
    await m.locator('[data-addplot]').click();
    const newNo = maxA + 1;
    await expect(m.locator('.pe-pill.active')).toHaveText(`Plot ${newNo} · none`);
    await expect(cell(m, 0, 'species')).toBeFocused();
    const k = page.keyboard;
    // Tree 1: odd DBH 13 → 12.
    await k.type('wo'); await expect(m.locator('.pe-suggest')).toBeVisible();
    await k.press('Tab');
    await k.type('13'); await k.press('Enter');
    await expect(cell(m, 0, 'dbh')).toHaveValue('12');
    await expect(m.locator('.pe-dbhnotes')).toContainText('Row 1: DBH 13 entered as 12');
    await k.type('2'); await k.press('Enter');
    await k.type('y'); await k.press('Enter'); await k.press('Enter'); await k.press('Enter');
    // Tree 2: ditto species.
    await expect(cell(m, 1, 'species')).toBeFocused();
    await k.type('"');
    await expect(cell(m, 1, 'species')).toHaveValue('wo');
    await k.press('Enter'); await k.type('16'); await k.press('Enter'); await k.type('c'); await k.press('Enter');
    // Tree 3: quick line.
    await m.locator('.pe-quick').click();
    await k.type('ro 18 2.5 cut'); await k.press('Enter');
    await expect(m.locator('.pe-quick')).toHaveValue('');
    await expect(cell(m, 2, 'species')).toHaveValue('Red Oak');
    await expect(m.locator('.pe-pill.active')).toHaveText(`Plot ${newNo} · 3`);
    // Ctrl+Enter → the next plot (added), quick line focused (last used).
    await k.press('Control+Enter');
    await expect(m.locator('.pe-pill.active')).toHaveText(`Plot ${newNo + 1} · none`);
    await expect(m.locator('.pe-quick')).toBeFocused();
    await m.locator('.pe-empty').check();

    // Plot 1: edit a saved tree's DBH, delete another saved tree.
    await m.locator('.pe-pill', { hasText: /^Plot 1 ·/ }).click();
    // A saw-log tree (over 10"): its DBH one class up; the next tree is deleted.
    const ei = a1.findIndex(e => parseFloat(e.dbh) > 10 && parseFloat(e.logs) > 0);
    const di = ei === 0 ? 1 : 0;
    const newDbh = String(parseInt(a1[ei].dbh, 10) + 2);
    await cell(m, ei, 'dbh').fill(newDbh);
    await cell(m, ei, 'dbh').press('Tab');
    await m.locator(`tr[data-row="${di}"] .pe-del`).click();
    await expect(m.locator('.pe-status')).toHaveText('Unsaved changes');
    await expect(m.locator('.pe-problems')).toHaveText('');
    await expect(m.locator('[data-save]')).toHaveText('Save changes (6 changes)');
    await m.locator('[data-save]').click();
    await expect(m.locator('.pe-status')).toHaveText('All saved');

    const after = await page.evaluate(() => window.TTApp.data());
    const typed = after.filter(e => e.areaLetter === 'A' && e.plotNumber === newNo).map(e => [e.species, e.dbh, e.logs, e.cutStatus]);
    expect(typed).toEqual([['White Oak', '12', '2', 'Yes'], ['White Oak', '16', 'Cull', 'No'], ['Red Oak', '18', '2.5', 'Yes']]);
    expect(after.filter(e => e.areaLetter === 'A' && e.plotNumber === newNo + 1).map(e => !!e.emptyPlot)).toEqual([true]);
    const edited = after.find(e => e.id === a1[ei].id);
    expect(edited).toEqual({ ...a1[ei], dbh: newDbh });
    expect(after.some(e => e.id === a1[di].id)).toBe(false);
    expect(after.length).toBe(before.length + 3);
    // Untouched trees are the same, every field.
    const untouched = before.filter(e => e.id !== a1[ei].id && e.id !== a1[di].id);
    for (const e of untouched) expect(after.find(x => x.id === e.id)).toEqual(e);
    await flushed(page);
    const stored = await page.evaluate(() => window.TTStore.getProject(window.TTApp.project().id).data.length);
    expect(stored).toBe(after.length);
    expect(await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('tt.plotsDraft.')).length)).toBe(0);

    await page.keyboard.press('Escape');
    await expect(m).toHaveCount(0);
    // Recent Entries (newest first): the empty plot, then the quick-line Red Oak.
    await expect(page.locator('#entriesTableBody tr').nth(0)).toContainText(`${newNo + 1}`);
    await expect(page.locator('#entriesTableBody tr').nth(0)).toContainText('Empty plot');
    await expect(page.locator('#entriesTableBody tr').nth(1)).toContainText('Red Oak');
});

test('Plots / Data: moving a plot onto an existing number warns and offers the next free one', async ({ page }) => {
    await openApp(page);
    await loadSample(page);
    await page.locator('#plotsDataBtn').click();
    const m = page.locator('#plotsDataModal');
    await expect(m).toBeVisible();
    const n2 = await page.evaluate(() => window.TTApp.data().filter(e => e.areaLetter === 'A' && e.plotNumber === 2 && !e.emptyPlot).length);
    const maxA = await page.evaluate(() => Math.max(...window.TTApp.data().filter(e => e.areaLetter === 'A').map(e => e.plotNumber)));
    await m.locator('[data-move]').click();
    await m.locator('.pe-move-num').fill('2');
    await expect(m.locator('.pe-move-warn')).toContainText(`Area A already has Plot 2 (${n2} trees)`);
    await expect(m.locator('[data-move-ok]')).toBeDisabled();
    await m.locator('[data-move-next]').click();
    await expect(m.locator('.pe-move-num')).toHaveValue(String(maxA + 1));
    await m.locator('[data-move-ok]').click();
    await expect(m.locator('.pe-pill.active')).toContainText(`Plot ${maxA + 1} ·`);
    // Close with unsaved changes asks; Discard leaves the data as it was.
    await m.locator('[data-close]').click();
    await expect(m.locator('.pe-ask')).toBeVisible();
    await m.locator('.pe-ask button', { hasText: 'Discard' }).click();
    await expect(m).toHaveCount(0);
    expect(await page.evaluate(() => window.TTApp.data().filter(e => e.areaLetter === 'A' && e.plotNumber === 1).length)).toBeGreaterThan(0);
});

test('Plots / Data opens from Projects → CSV section', async ({ page }) => {
    await openApp(page);
    await tab(page, 'projects');
    await page.locator('#paperGridBtn').click();
    await expect(page.locator('#plotsDataModal')).toBeVisible();
});

test('Blank CSV Template downloads with the exact header', async ({ page }) => {
    await openApp(page);
    await stubSaveFile(page);
    await tab(page, 'projects');
    await page.locator('#paperTemplateBtn').click();
    await expect.poll(() => page.evaluate(() => window.__saved.length)).toBe(1);
    const f = await page.evaluate(async () => {
        const { blob, filename } = window.__saved[0];
        const bytes = new Uint8Array(await blob.arrayBuffer());
        return { filename, bom: Array.from(bytes.slice(0, 3)), text: new TextDecoder('utf-8', { ignoreBOM: false }).decode(bytes) };
    });
    expect(f.filename).toBe('plot-sheet-template.csv');
    expect(f.bom).toEqual([0xEF, 0xBB, 0xBF]);
    expect(f.text).toBe('Area,PlotNumber,Species,DBH,Logs,Cut,UGS,Notes\r\n');
});

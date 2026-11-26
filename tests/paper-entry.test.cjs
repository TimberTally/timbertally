// Plots / Data (paper-entry.js): DBH rounding, quick line, working copy and its diff, duplicate
// plots, paste; and the Import CSV reader's paper-sheet rules (parseTreeCsv in csv-match.js).
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load.cjs');

const env = load(['forestry-data.js', 'forestry-calc.js', 'csv-match.js', 'paper-entry.js']);
const run = (expr, args) => { env.ctx.__a = JSON.parse(JSON.stringify(args ?? null)); return JSON.parse(env.ev(`JSON.stringify(${expr})`)); };
const KNOWN = ['White Oak', 'Red Oak', 'Yellow-poplar', 'Sugar Maple', 'Hickory', 'Black Cherry'];
const OPTS = '{ known: ' + JSON.stringify(KNOWN) + ', suggest: TTCsvMatch.suggestSpecies }';
const csv = text => run('parseTreeCsv(__a)', text);
const quick = text => run(`TTPaperEntry.parseQuickLine(__a, ${OPTS})`, text);
const row = (species, dbh, logs, cut = '', ugs = '', notes = '') => ({ id: null, species, dbh, logs, cut, ugs, notes });
const check = r => run(`TTPaperEntry.checkRow(__a, ${OPTS})`, r);

// A small project: Area A plots 1 (2 trees), 2 (empty record), Area B plot 4 (1 tree); one entry with no plot.
const E = () => [
    { id: 1, plotNumber: 1, areaLetter: 'A', species: 'White Oak', dbh: '16', logs: '2', cutStatus: 'Yes', ugsStatus: 'No', notes: 'fork', location: { lat: 37.1, lon: -85.2 }, grade: 2, by: 'JB' },
    { id: 2, plotNumber: 1, areaLetter: 'A', species: 'Red Oak', dbh: '13', logs: '1.5', cutStatus: 'No', ugsStatus: 'No', notes: '', location: null, height: 60 },
    { id: 3, emptyPlot: true, plotNumber: 2, areaLetter: 'A', species: '', dbh: '', logs: '', cutStatus: 'No', ugsStatus: 'No', notes: '', location: { lat: 1, lon: 2 } },
    { id: 4, plotNumber: 4, areaLetter: 'B', species: 'Hickory', dbh: '20', logs: '3', cutStatus: 'No', ugsStatus: 'No', notes: '', location: null },
    { id: 5, plotNumber: '', areaLetter: 'A', species: 'Odd', dbh: '8', logs: '0', cutStatus: 'No', ugsStatus: 'No' },
];
/** Builds the working copy of E(), runs `body` (JS using wc, P = TTPaperEntry) on it, then the diff. */
const withWc = body => {
    env.ctx.__e = E();
    return JSON.parse(env.ev(`(() => { const P = TTPaperEntry; const wc = P.buildWorkingCopy(__e); const pl = (a, n) => wc.plots.find(p => p.area === a && p.plot === n);
        ${body};
        const d = P.applyWorkingCopy(__e, wc, Object.assign(${OPTS}, { t0: 1000 })); return JSON.stringify(d); })()`));
};

test('DBH: odd or fractional rounds DOWN to the even class; 4–40 after rounding', () => {
    const r = v => run('TTPaperEntry.roundDbh(__a)', v);
    assert.equal(r('13').value, 12); assert.equal(r('13').changed, true);
    assert.equal(r('13.9').value, 12);
    assert.equal(r('15').value, 14);
    assert.equal(r('12.5').value, 12);
    assert.equal(r('5').value, 4);
    assert.equal(r('12').changed, false);
    assert.equal(r('41').value, 40);
    assert.equal(r('3').ok, false);
    assert.equal(r('42').ok, false);
    assert.equal(r('').ok, false);
    assert.equal(r('abc').ok, false);
});

test('rows: no species = not a tree; DBH or Logs with no species = "Species missing"', () => {
    assert.equal(check(row('', '', '', '', '', 'just a note')).tree, false);
    assert.equal(check(row('', '', '', '', '', 'just a note')).issues.length, 0);
    const m = check(row('', '16', '2'));
    assert.equal(m.tree, false);
    assert.deepEqual(m.issues.map(i => [i.col, i.msg]), [['species', 'Species missing']]);
    const c = check(row('wo', '13', '2'));
    assert.equal(c.dbh, 12); assert.equal(c.note, 'DBH 13 entered as 12'); assert.equal(c.species, 'White Oak');
    assert.equal(check(row('wo', '8', '2')).logs, '0');
    assert.deepEqual(check(row('wo', '16', '')).issues.map(i => i.col), ['logs']);
    assert.deepEqual(check(row('wo', '16', '0')).issues.map(i => i.col), ['logs']);
    assert.equal(check(row('wo', '16', 'c')).logs, 'Cull');
    assert.equal(check(row('Zelkova', '16', '2')).issues[0].level, 'warn');
    for (const y of ['Y', 'c', 'X', '1', 'Cut', '✓']) assert.equal(check(row('wo', '16', '2', y)).cut, true, y);
    assert.ok(check(row('wo', '16', '2', 'maybe')).issues.some(i => i.col === 'cut'));
});

test('rows: blank rows padded to 20, always 8 blank after the last filled one', () => {
    assert.equal(run('TTPaperEntry.padRows([]).length'), 20);
    env.ctx.__r = Array.from({ length: 15 }, () => ({ species: 'WO', dbh: '12', logs: '1', cut: '', ugs: '', notes: '' }));
    assert.equal(run('TTPaperEntry.padRows(__r).length'), 23);
});

test('quick line: codes, two-word names, small trees skip logs, cull vs cut, notes', () => {
    let q = quick('wo 14 2 cut');
    assert.equal(q.ok, true);
    assert.deepEqual([q.row.species, q.row.dbh, q.row.logs, q.row.cut, q.row.ugs, q.row.notes], ['White Oak', '14', '2', '✓', '', '']);
    q = quick('White Oak 16 2');
    assert.deepEqual([q.row.species, q.row.dbh, q.row.logs, q.row.cut], ['White Oak', '16', '2', '']);
    q = quick('hk 8 c u');
    assert.deepEqual([q.row.species, q.row.dbh, q.row.logs, q.row.cut, q.row.ugs], ['Hickory', '8', '', '✓', '✓']);
    q = quick('ro 18 c');
    assert.deepEqual([q.row.logs, q.row.cut], ['C', '']);
    q = quick('ro 18 cull x');
    assert.deepEqual([q.row.logs, q.row.cut], ['C', '✓']);
    q = quick('YP 15 2.5 forked top "bad seam"');
    assert.deepEqual([q.row.species, q.row.dbh, q.row.logs, q.row.notes], ['Yellow-poplar', '14', '2.5', 'forked top bad seam']);
    assert.equal(q.note, 'DBH 15 entered as 14');
    assert.equal(quick('16 2').ok, false);
    assert.equal(quick('wo').ok, false);
    assert.match(quick('wo 16').error, /Logs missing/);
    assert.equal(quick('wo 3').ok, false);
    assert.equal(quick('wo 16 7').ok, false);
});

test('working copy: plots of all Areas, empty-plot records, entries with no plot left out', () => {
    env.ctx.__e = E();
    const wc = run('TTPaperEntry.buildWorkingCopy(__e)');
    assert.deepEqual(wc.plots.map(p => [p.area, p.plot, p.rows.filter(r => r.species).length, p.empty]), [['A', 1, 2, false], ['A', 2, 0, true], ['B', 4, 1, false]]);
    assert.deepEqual(wc.loadedIds, [1, 2, 3, 4]);
    assert.equal(wc.plots[0].rows.length, 20);
});

test('diff: nothing touched = no changes, every entry the same', () => {
    const d = withWc('');
    assert.equal(d.changes, 0);
    assert.deepEqual(d.data, E());
});

test('diff: add / edit / delete; untouched trees and extra fields kept', () => {
    const d = withWc(`
        const p1 = pl('A', 1);
        p1.rows[0].dbh = '17'; P.setDbh(p1.rows[0], '17');       // edit: 17 → 16 = same as saved → no change
        p1.rows[0].notes = 'fork, big';                            // edit notes
        p1.rows.splice(1, 1);                                      // delete Red Oak (id 2)
        P.appendRow(p1, { id: null, species: 'sm', dbh: '13', logs: '1', cut: 'Y', ugs: '', notes: '' });`);
    assert.equal(d.edited, 1); assert.equal(d.deleted, 1); assert.equal(d.added, 1);
    assert.equal(d.changes, 3);
    const e1 = d.data.find(e => e.id === 1);
    assert.deepEqual(e1, { ...E()[0], notes: 'fork, big' }); // location, grade, by kept; dbh unchanged
    assert.ok(!d.data.some(e => e.id === 2));
    const added = d.data[d.data.length - 1];
    assert.deepEqual(added, { id: 1000, plotNumber: 1, areaLetter: 'A', dbh: '12', species: 'Sugar Maple', logs: '1', cutStatus: 'Yes', ugsStatus: 'No', notes: '', location: null });
    assert.deepEqual(d.data.find(e => e.id === 4), E()[3]);
    assert.deepEqual(d.data.find(e => e.id === 5), E()[4]); // no plot number: kept as it is
});

test('diff: a saved odd DBH stays until its cell is edited', () => {
    const same = withWc(`pl('A', 1).rows[1].notes = 'x'`);
    assert.equal(same.data.find(e => e.id === 2).dbh, '13');
    const ed = withWc(`P.setDbh(pl('A', 1).rows[1], '15')`);
    assert.equal(ed.data.find(e => e.id === 2).dbh, '14');
    assert.equal(ed.data.find(e => e.id === 2).height, 60);
});

test('diff: move / renumber keeps ids and GPS; empty plot record moves too', () => {
    const d = withWc(`P.movePlot(wc, pl('A', 1).uid, 'B', 7); P.movePlot(wc, pl('A', 2).uid, 'A', 3);`);
    assert.equal(d.moves.length, 2);
    const e1 = d.data.find(e => e.id === 1);
    assert.deepEqual([e1.areaLetter, e1.plotNumber, e1.location.lat, e1.grade], ['B', 7, 37.1, 2]);
    const e3 = d.data.find(e => e.id === 3);
    assert.deepEqual([e3.emptyPlot, e3.plotNumber, e3.location.lat], [true, 3, 1]);
    assert.equal(d.deleted, 0); assert.equal(d.edited, 0);
});

test('diff: "No trees" adds an empty-plot record; trees in an empty plot drop it; deleting a plot', () => {
    let d = withWc(`const p = P.addPlot(wc, 'A'); P.setEmpty(wc, p.uid, true);`);
    assert.equal(d.emptyAdded, 1);
    assert.deepEqual(d.data[d.data.length - 1], { id: 1000, emptyPlot: true, plotNumber: 3, areaLetter: 'A', species: '', dbh: '', logs: '', cutStatus: 'No', ugsStatus: 'No', notes: '', location: null });
    d = withWc(`P.appendRow(pl('A', 2), { id: null, species: 'wo', dbh: '12', logs: '1', cut: '', ugs: '', notes: '' });`);
    assert.ok(!d.data.some(e => e.id === 3)); assert.equal(d.added, 1);
    d = withWc(`P.deletePlot(wc, pl('A', 1).uid)`);
    assert.equal(d.deleted, 2);
    assert.deepEqual(d.data.map(e => e.id), [3, 4, 5]);
    const refuse = run(`(() => { const wc = TTPaperEntry.buildWorkingCopy(__e); return TTPaperEntry.setEmpty(wc, wc.plots[0].uid, true); })()`);
    assert.deepEqual(refuse, { ok: false, msg: 'Remove the trees first' });
    // A new plot left with no trees and not marked empty writes nothing.
    assert.equal(withWc(`P.addPlot(wc, 'C')`).changes, 0);
});

test('duplicate plot: found, never merged, next free number offered', () => {
    env.ctx.__e = E();
    const r = run(`(() => { const P = TTPaperEntry, wc = P.buildWorkingCopy(__e); return P.movePlot(wc, wc.plots[0].uid, 'B', 4); })()`);
    assert.equal(r.ok, false);
    assert.equal(r.msg, 'Area B already has Plot 4 (1 tree)');
    assert.equal(r.next, 5);
    assert.equal(run(`(() => { const wc = TTPaperEntry.buildWorkingCopy(__e); return TTPaperEntry.nextFreePlot(wc, 'A'); })()`), 3);
    assert.equal(run(`(() => { const wc = TTPaperEntry.buildWorkingCopy(__e); return TTPaperEntry.nextFreePlot(wc, 'Z'); })()`), 1);
    assert.equal(run(`(() => { const wc = TTPaperEntry.buildWorkingCopy(__e); return TTPaperEntry.findPlot(wc, 'A', 2).plot; })()`), 2);
});

test('Open a filled CSV: new plots after the Area\'s plots, DBH rounded', () => {
    const text = '\uFEFFArea,PlotNumber,Species,DBH,Logs,Cut,UGS,Notes\r\n,1,WO,15,2,Y,,\r\n,,"""",14,C,,,\r\n,2,none,,,,,\r\n';
    env.ctx.__e = E(); env.ctx.__t = text;
    const r = JSON.parse(env.ev(`JSON.stringify((() => { const P = TTPaperEntry, wc = P.buildWorkingCopy(__e); const res = P.addCsvPlots(wc, 'A', parseTreeCsv(__t));
        return { res, plots: wc.plots.filter(p => p.area === 'A').map(p => [p.plot, p.empty, p.rows.filter(x => x.species).map(x => x.species + ' ' + x.dbh + ' ' + x.logs)]) }; })())`));
    assert.equal(r.res.message, 'CSV plots 1–2 added as Plots 3–4');
    assert.deepEqual(r.plots, [[1, false, ['White Oak 16 2', 'Red Oak 13 1.5']], [2, true, []], [3, false, ['WO 14 2', 'WO 14 Cull']], [4, true, []]]);
});

test('species type-ahead: code hit first, then names', () => {
    const m = run(`TTPaperEntry.speciesMatches('wo', ${JSON.stringify(KNOWN)}, TTCsvMatch.suggestSpecies)`);
    assert.equal(m[0].name, 'White Oak'); assert.equal(m[0].code, 'wo');
    const r = run(`TTPaperEntry.speciesMatches('oak', ${JSON.stringify(KNOWN)}, null)`);
    assert.deepEqual(r.map(x => x.name), ['White Oak', 'Red Oak']);
});

test('species: code, name, unique prefix; a shared prefix does not resolve', () => {
    const res = v => run(`TTPaperEntry.resolveSpecies(__a, ${JSON.stringify(KNOWN)}, TTCsvMatch.suggestSpecies)`, v);
    assert.equal(res('wo'), 'White Oak'); assert.equal(res('802'), 'White Oak'); assert.equal(res('whi'), 'White Oak');
    assert.equal(res('YP'), 'Yellow-poplar'); assert.equal(res('Zzz'), '');
    assert.equal(run('TTPaperEntry.resolveSpecies("re", ["Red Oak", "Red Maple"], null)'), '');
    assert.equal(run('TTPaperEntry.resolveSpecies("red o", ["Red Oak", "Red Maple"], null)'), 'Red Oak');
});

test('paste: tab-separated (Excel) and comma-separated text fill from the cell; DBH rounded, ditto', () => {
    const cells = run('TTPaperEntry.parsePaste(__a)', 'WO\t16\t2\r\nRO\t15\t1\tY\r\n"\t"\t1\r\n');
    assert.deepEqual(cells[0], ['WO', '16', '2']);
    assert.deepEqual(run('TTPaperEntry.parsePaste(__a)', 'WO,16,"a, b"'), [['WO', '16', 'a, b']]);
    env.ctx.__cells = cells;
    const rows = run('TTPaperEntry.applyPaste([], 0, "species", __cells)');
    assert.equal(rows.length, 3);
    assert.deepEqual([rows[1].species, rows[1].dbh, rows[1].dbhTyped, rows[1].cut], ['RO', '14', '15', '✓']);
    assert.deepEqual([rows[2].species, rows[2].dbh], ['RO', '14']);
    const at = run('TTPaperEntry.applyPaste([], 1, "dbh", [["20","3"]])');
    assert.equal(at.length, 2); assert.equal(at[1].dbh, '20'); assert.equal(at[1].logs, '3');
});

test('template: exact header, BOM, no rows; loads through Import CSV with no rows', () => {
    const t = run('TTPaperEntry.templateCsv()');
    assert.equal(t, '\uFEFFArea,PlotNumber,Species,DBH,Logs,Cut,UGS,Notes\r\n');
    assert.deepEqual(csv(t), []);
});

test('printable sheet: title, blanks, ruled rows, hint', () => {
    const h = run('TTPaperEntry.printableHtml()');
    assert.match(h, /<title>Plot Sheet<\/title>/);
    for (const b of ['Property', 'Area', 'Date', 'Cruiser', 'BAF / Plot size', 'Page']) assert.ok(h.includes(b), b);
    assert.equal((h.match(/<tr><td><\/td>/g) || []).length, 28);
    assert.ok(h.includes('Logs C = cull'));
});

// ---- Import CSV reader rules (spec §4) ----
const HEAD = 'Area,PlotNumber,Species,DBH,Logs,Cut,UGS,Notes\n';

test('CSV: blank PlotNumber = the plot above (blank Area rows are read)', () => {
    const p = csv(HEAD + ',4,White Oak,16,2,No,No,\n,,Red Oak,14,1,No,No,\n');
    assert.deepEqual(p.map(e => e.plotNumber), [4, 4]);
    assert.equal(p[1].species, 'Red Oak');
});

test('CSV: a blank plot before any numbered row is skipped', () => {
    const p = csv(HEAD + ',,Red Oak,14,1,No,No,\n,2,White Oak,16,2,No,No,\n');
    assert.deepEqual(p.map(e => e.plotNumber), [2]);
});

test('CSV: """" (a lone " from Excel) and \'\' = same column as the row above', () => {
    const p = csv(HEAD + ',1,White Oak,16,2,Yes,No,big\n,,"""",\'\',"""",\'\',,\n');
    assert.equal(p[1].species, 'White Oak'); assert.equal(p[1].dbh, '16'); assert.equal(p[1].logs, '2'); assert.equal(p[1].cutStatus, 'Yes');
});

test('CSV: Logs C = Cull; Cut Y / X = yes', () => {
    const p = csv(HEAD + ',1,White Oak,16,C,Y,x,\n,1,White Oak,16,c,N,,\n');
    assert.equal(p[0].logs, 'Cull'); assert.equal(p[1].logs, 'Cull');
    assert.equal(p[0].cutStatus, 'Yes'); assert.equal(p[0].ugsStatus, 'Yes'); assert.equal(p[1].cutStatus, 'No');
});

test('CSV: a plot number and nothing else = a plot with no trees', () => {
    const p = csv(HEAD + ',7,,,,,,\n');
    assert.equal(p.length, 1); assert.equal(p[0].emptyPlot, true); assert.equal(p[0].plotNumber, 7);
});

test('CSV: "none" in Species with no DBH = a plot with no trees', () => {
    const p = csv(HEAD + ',1,White Oak,14,1,,,\n,2,none,,,,,\n');
    assert.equal(p.length, 2); assert.equal(p[1].emptyPlot, true); assert.equal(p[1].plotNumber, 2);
});

test('CSV: report sections below "---" never borrow a plot number', () => {
    const p = csv('PlotNumber,Area,DBH,Species,Logs,Cut,UGS,Notes,Latitude,Longitude\n1,A,16,"White Oak",2,No,No,"",,\n\n\n--- TALLY DATA ---\n,16,White Oak,2,No,No\n');
    assert.equal(p.length, 1);
});

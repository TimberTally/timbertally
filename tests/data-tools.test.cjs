// Check Data (check-data.js) and CSV / species-code handling (csv-match.js).
// Both are browser IIFEs; their pure functions are exposed on window.TTCheckData / window.TTCsvMatch.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load.cjs');

const env = load(['forestry-data.js', 'forestry-calc.js', 'check-data.js', 'csv-match.js', 'merge.js', 'glossary.js']);
const check = entries => {
    env.ctx.__e = entries;
    return JSON.parse(env.ev('JSON.stringify(TTCheckData.checkArea(__e, "Doyle", 78))'));
};
const T0 = 1.75e12; // a Date.now()-style id
const tr = (id, plot, dbh, logs, extra = {}) => ({ id, areaLetter: 'A', plotNumber: plot, species: 'White Oak', dbh: String(dbh), logs: String(logs), cutStatus: 'No', ...extra });

test('Check Data: a gap in plot numbers is flagged', () => {
    const out = check([tr(T0, 1, 16, 2), tr(T0 + 60000, 3, 14, 1)]);
    assert.ok(out.some(i => i.level === 'warn' && /Plot 2 is missing/.test(i.text)), JSON.stringify(out));
});

test('Check Data: an empty plot is not a gap, and is reported as info', () => {
    const out = check([tr(T0, 1, 16, 2), { id: T0 + 1000, emptyPlot: true, areaLetter: 'A', plotNumber: 2, species: '', dbh: '', logs: '' }, tr(T0 + 90000, 3, 14, 1)]);
    assert.ok(!out.some(i => /missing/.test(i.text)));
    assert.ok(out.some(i => i.level === 'info' && /recorded with no trees: 2/.test(i.text)));
});

test('Check Data: same tree twice within 20 s is a possible duplicate; 30 s apart is not', () => {
    const dup = check([tr(T0, 1, 16, 2), tr(T0 + 5000, 1, 16, 2)]);
    const d = dup.find(i => /Possible duplicate/.test(i.text));
    assert.ok(d, JSON.stringify(dup));
    assert.equal(d.id, T0 + 5000);
    const ok = check([tr(T0, 1, 16, 2), tr(T0 + 30000, 1, 16, 2)]);
    assert.ok(!ok.some(i => /duplicate/i.test(i.text)));
    // Saved together (CSV import, sample): under 300 ms apart is not a double tap.
    const batch = check([tr(T0, 1, 16, 2), tr(T0 + 1, 1, 16, 2)]);
    assert.ok(!batch.some(i => /duplicate/i.test(i.text)));
});

test('Check Data: logs on a tree 10" or under are flagged', () => {
    const out = check([tr(T0, 1, 8, 1), tr(T0 + 60000, 1, 10, 1.5)]);
    const hits = out.filter(i => /10" and under have no saw logs/.test(i.text));
    assert.equal(hits.length, 2, JSON.stringify(out));
    assert.ok(!check([tr(T0, 1, 8, 0)]).some(i => /saw logs/.test(i.text)));
});

test('Check Data: logs beyond the volume table count as 0 BF', () => {
    const out = check([tr(T0, 1, 12, 6)]);
    assert.ok(out.some(i => /beyond the Doyle volume table/.test(i.text)), JSON.stringify(out));
});

// ---- CSV ----
const readTable = text => { env.ctx.__t = text; return JSON.parse(env.ev('JSON.stringify(TTCsvMatch.readTable(__t))')); };
const build = (table, cols, unit = 'logs16', map = {}) => {
    env.ctx.__a = [table, cols, unit, map];
    return JSON.parse(env.ev('JSON.stringify(TTCsvMatch.buildEntries(...__a))'));
};

test('CSV: quotes, commas and doubled quotes inside a quoted note, BOM and CRLF', () => {
    const text = '﻿Plot,Species,DBH,Logs,Notes\r\n1,White Oak,16,2,"fire scar, base"\r\n2,Red Oak,14,1.5,"says ""hollow"""\r\n';
    const t = readTable(text);
    assert.deepEqual(t.headers, ['Plot', 'Species', 'DBH', 'Logs', 'Notes'], 'BOM stripped from first header');
    assert.equal(t.rows.length, 2);
    assert.deepEqual(t.rows[0], ['1', 'White Oak', '16', '2', 'fire scar, base']);
    assert.equal(t.rows[1][4], 'says "hollow"');
    assert.ok(!t.rows.some(r => r.some(c => c.includes('\r'))), 'no stray CR');
});

test('CSV: a quoted note may span lines', () => {
    const t = readTable('Plot,Species,DBH,Notes\n1,White Oak,16,"line one\nline two"\n');
    assert.equal(t.rows.length, 1);
    assert.equal(t.rows[0][3], 'line one\nline two');
});

test('CSV: reading stops at the "---" report section', () => {
    const t = readTable('Plot,Species,DBH\n1,White Oak,16\n--- SUMMARY ---\nTPA,12\n');
    assert.equal(t.rows.length, 1);
});

test('CSV: column guessing and building entries, EMPTY PLOT rows included', () => {
    const t = readTable('Plot Number,Area Letter,Species,DBH,Logs,Cut,Notes\n1,A,White Oak,16,2,Yes,"a, b"\n2,A,EMPTY PLOT,,,,\n3,a,Red Oak,8,2,No,\n');
    env.ctx.__h = t.headers;
    const cols = JSON.parse(env.ev('JSON.stringify(TTCsvMatch.guessColumns(__h))'));
    assert.deepEqual(cols, { plot: 0, area: 1, dbh: 3, species: 2, logs: 4, cut: 5, notes: 6 });
    const { entries, skipped } = build(t, cols, 'logs16', { 'White Oak': 'White Oak', 'Red Oak': 'Red Oak' });
    assert.equal(skipped, 0);
    assert.equal(entries.length, 3);
    assert.equal(entries[0].cutStatus, 'Yes');
    assert.equal(entries[0].notes, 'a, b');
    assert.equal(entries[1].emptyPlot, true);
    assert.equal(entries[1].plotNumber, 2);
    assert.equal(entries[2].areaLetter, 'A', 'area letter upper-cased');
    assert.equal(entries[2].logs, '0', 'trees 10" and under get 0 logs');
});

test('CSV: logs given in feet or half logs convert to 16-ft logs', () => {
    const t = { headers: ['Plot', 'Species', 'DBH', 'Logs'], rows: [['1', 'White Oak', '16', '32']] };
    assert.equal(build(t, { plot: 0, species: 1, dbh: 2, logs: 3 }, 'feet').entries[0].logs, '2');
    const h = { headers: ['Plot', 'Species', 'DBH', 'Sticks'], rows: [['1', 'White Oak', '16', '5']] };
    assert.equal(build(h, { plot: 0, species: 1, dbh: 2, logs: 3 }, 'logs8').entries[0].logs, '2.5');
});

test('species codes: FIA numbers and letter codes become TimberTally names', () => {
    const known = JSON.stringify(env.evj('DEFAULT_SPECIES'));
    const sug = v => env.ev(`TTCsvMatch.suggestSpecies(${JSON.stringify(v)}, ${known})`);
    assert.equal(sug('802'), 'White Oak');
    assert.equal(sug('WO'), 'White Oak');
    assert.equal(sug('wo'), 'White Oak');
    assert.equal(sug('0802'), 'White Oak', 'leading zeros');
    assert.equal(sug('833'), 'Red Oak');
    assert.equal(sug('YP'), 'Yellow-poplar');
    assert.equal(sug('693'), 'Black Gum', 'Blackgum matches Black Gum');
    assert.equal(sug('white oak'), 'White Oak');
    assert.equal(sug('ZZZ'), '');
    assert.equal(sug(''), '');
});

test('glossary: every term has a non-empty meaning', () => {
    const g = env.evj('TT_GLOSSARY');
    const keys = Object.keys(g);
    assert.ok(keys.length >= 5);
    for (const k of ['dbh', 'tpa', 'ba', 'qmd', 'baf', 'cv']) assert.ok(keys.some(x => x.toLowerCase() === k), `glossary has ${k}`);
});

// ---- Audit 2026-11-24 fixes ----

test('Check Data: logs beyond the table are flagged for every log rule', () => {
    for (const rule of ['Doyle', 'Scribner', 'International']) {
        env.ctx.__e = [tr(T0, 1, 12, 6), tr(T0 + 60000, 1, 16, 4.5), tr(T0 + 120000, 1, 20, 6), tr(T0 + 180000, 2, 16, 2), tr(T0 + 240000, 2, 18, 0.5)];
        const out = JSON.parse(env.ev(`JSON.stringify(TTCheckData.checkArea(__e, ${JSON.stringify(rule)}, 78))`));
        const hits = out.filter(i => new RegExp(`beyond the ${rule} volume table`).test(i.text));
        assert.equal(hits.length, 4, `${rule}: ${JSON.stringify(out)}`); // 12"x6, 16"x4.5, 20"x6, 18"x0.5 (16"x2 is fine)
    }
});

test('CSV: one record splitter for Import, Match Columns and Merge (quotes, commas, line breaks)', () => {
    const recs = JSON.parse(env.ev('JSON.stringify(splitCsvRecords("a,\\"x, \\"\\"y\\"\\"\\nz\\",c\\r\\nd,e,f"))'));
    assert.deepEqual(recs, ['a,"x, ""y""\nz",c', 'd,e,f']);
    assert.equal(env.ev('csvUnguard("\'=SUM(A1)")'), '=SUM(A1)');
    assert.equal(env.ev('csvUnguard("\'tis")'), "'tis", 'an apostrophe not before = + - @ is kept');
});

test('CSV round-trip through Match Columns and Merge: notes with quotes, commas, line breaks; GPS kept', () => {
    // As script.js entriesCsv writes it (csvCell for text, plain numbers for GPS).
    const cell = v => env.ev(`csvCell(${JSON.stringify(v)})`);
    const rows = [
        { plot: 1, area: 'A', dbh: '16', sp: 'White Oak', logs: '2', cut: 'No', notes: 'Den tree\nmarked twice', lat: 37.123456, lon: -84.654321 },
        { plot: 2, area: 'A', dbh: '20', sp: 'Oak "big"', logs: '3', cut: 'Yes', notes: 'fire scar, base; says "hollow"', lat: 37.5, lon: -84.25 },
        { plot: 3, area: 'B', dbh: '14', sp: 'Red Oak', logs: '1.5', cut: 'No', notes: '=cmd|calc', lat: 38, lon: -85 },
    ];
    const csv = 'PlotNumber,Area,DBH,Species,Logs,Cut,UGS,Notes,Latitude,Longitude\n'
        + rows.map(r => `${r.plot},${r.area},${r.dbh},${cell(r.sp)},${r.logs},${r.cut},No,${cell(r.notes)},${r.lat},${r.lon}`).join('\n') + '\n\n\n--- TALLY DATA ---\n';
    // Match Columns
    const t = readTable(csv);
    assert.equal(t.rows.length, 3);
    const cols = JSON.parse(env.ev(`JSON.stringify(TTCsvMatch.guessColumns(${JSON.stringify(t.headers)}))`));
    const m = build(t, cols).entries;
    // Merge (merge.js parser)
    env.ctx.__csv = csv;
    const g = JSON.parse(env.ev('JSON.stringify(TTMerge.parseTimberTallyCsv(__csv))'));
    for (const got of [m, g]) {
        assert.equal(got.length, 3);
        got.forEach((e, i) => {
            const r = rows[i];
            assert.equal(e.plotNumber, r.plot);
            assert.equal(e.areaLetter, r.area);
            assert.equal(e.species, r.sp);
            assert.equal(e.notes, r.notes);
            assert.equal(e.cutStatus, r.cut);
            assert.deepEqual([e.location.lat, e.location.lon], [r.lat, r.lon]);
        });
    }
});

test('Match Columns: plot numbers above 999 are left out and counted, not folded into plot 999', () => {
    const t = readTable('Plot,Species,DBH,Logs\n998,White Oak,16,2\n999,White Oak,16,2\n1000,Red Oak,14,1\n1001,Red Oak,14,1\n');
    const r = build(t, { plot: 0, species: 1, dbh: 2, logs: 3 });
    assert.equal(r.tooBig, 2);
    assert.deepEqual(r.entries.map(e => e.plotNumber), [998, 999]);
});

test('Merge summary: "plot 10" for one plot, "plots 10–12" for a range', () => {
    const sum = (perArea, mode = 'renumber') => {
        env.ctx.__a = [{ added: 4, addedEmpty: 0, skipped: 0, perArea }, { notes: [], filled: [] }, mode, 'phone.json'];
        return JSON.parse(env.ev('JSON.stringify(TTMerge.mergeSummary(...__a))'));
    };
    const one = sum([{ area: 'A', trees: 1, plots: 1, first: 10, last: 10, clash: 1 }]);
    assert.ok(one.includes('Area A: 1 tree, plot 10 (renumbered)'), JSON.stringify(one));
    assert.ok(!one.some(l => /10–10/.test(l)));
    const many = sum([{ area: 'B', trees: 3, plots: 3, first: 10, last: 12, clash: 0 }]);
    assert.ok(many.includes('Area B: 3 trees, plots 10–12'), JSON.stringify(many));
    assert.equal(many[0], 'Added 4 trees from phone.json.');
});

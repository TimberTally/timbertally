// Unit tests for forestry-data.js + forestry-calc.js + property.js (pure calculation code).
// Expected numbers are worked by hand in the comments, not copied from the code's output.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load, call } = require('./helpers/load.cjs');

const env = load();
const vol = (dbh, logs, rule, fc) => env.ev(`getTreeVolume(${JSON.stringify(dbh)}, ${JSON.stringify(logs)}, ${JSON.stringify(rule)}, ${fc ?? 78})`);
const near = (actual, expected, tol = 1e-6, msg) =>
    assert.ok(Math.abs(actual - expected) <= tol, `${msg || ''} expected ${expected}, got ${actual}`);

// One tree helper: a valid entry.
let nextId = 1;
const tree = (plot, dbh, logs, extra = {}) => ({ id: nextId++, areaLetter: 'A', plotNumber: plot, species: 'White Oak', dbh: String(dbh), logs: String(logs), cutStatus: 'No', ugsStatus: 'No', notes: '', ...extra });
const empty = (plot, area = 'A') => ({ id: nextId++, emptyPlot: true, areaLetter: area, plotNumber: plot, species: '', dbh: '', logs: '', cutStatus: 'No' });
const FIFTH = { method: 'fixed', plotAcres: 0.2 };

test('volume tables: known Form Class 78 values (Mesavage & Girard)', () => {
    assert.equal(vol('16', '2', 'Doyle'), 116);
    assert.equal(vol('16', '1', 'Doyle'), 72);
    assert.equal(vol('20', '2', 'Doyle'), 225);
    assert.equal(vol('16', '2', 'Scribner'), 159);
    assert.equal(vol('16', '2', 'International'), 180);
    assert.equal(vol('16', '3', 'International'), 241);
});

test('volume: half-log rounding, small trees, Cull and bad input are 0 or floored', () => {
    assert.equal(vol('16', '2.4', 'Doyle'), 116, '2.4 logs floors to the 2.0 row');
    assert.equal(vol('16', '2.5', 'Doyle'), 132);
    assert.equal(vol('8', '1', 'Doyle'), 0, 'under 10" has no board feet');
    assert.equal(vol('16', 'Cull', 'Doyle'), 0, 'Cull = 0 BF');
    assert.equal(vol('16', 'Cull', 'International'), 0);
    assert.equal(vol('16', '0', 'Doyle'), 0);
    assert.equal(vol('abc', '2', 'Doyle'), 0);
    assert.equal(vol('16', '2', 'Smalian'), 0, 'unknown rule');
});

test('Doyle form class scales the FC78 volume: round(v × fc / 78)', () => {
    assert.equal(vol('16', '2', 'Doyle', 80), Math.round(116 * 80 / 78)); // 118.97 → 119
    assert.equal(vol('16', '2', 'Doyle', 80), 119);
    assert.equal(vol('16', '2', 'Doyle', 70), 104);                       // 104.10 → 104
    assert.equal(vol('16', '2', 'Doyle', 75), 116, 'invalid form class falls back to 78');
    assert.equal(vol('16', '2', 'Scribner', 80), 159, 'form class only affects Doyle');
});

test('BAF expansion: one 12" tree at BAF 10', () => {
    // BA of a 12" tree = 0.005454 × 12² = 0.785376 sq ft; TPA = 10 / 0.785376 = 12.732755
    near(env.ev('treeExpansion(12, 10)'), 10 / 0.785376);
    near(env.ev('treeBaPerAcre(12, 10)'), 10);
    const r = call(env, 'calculateForestryReport', [tree(1, 12, 1)], 10, 'Doyle', 78).summary;
    assert.equal(r.numberOfPlots, 1);
    near(r.totalTreesPerAcre, 12.732755, 1e-5);
    near(r.totalBaPerAcre, 10);
    near(r.avgTractDbh, 12, 1e-9, 'QMD of one 12" tree');
    near(r.totalVolPerAcre, vol('12', '1', 'Doyle') * 10 / 0.785376, 1e-6, 'BF/ac = tree BF × TPA');
});

test('fixed plot expansion: 1/5 ac → 5 TPA per tree', () => {
    near(env.ev('treeExpansion(16, { method: "fixed", plotAcres: 0.2 })'), 5);
    near(env.ev('treeBaPerAcre(12, { method: "fixed", plotAcres: 0.2 })'), 0.785376 * 5);
    const r = call(env, 'calculateForestryReport', [tree(1, 16, 2), tree(1, 16, 2)], FIFTH, 'Doyle', 78).summary;
    near(r.totalTreesPerAcre, 10);
    near(r.totalVolPerAcre, 116 * 10);
    near(env.ev('fixedPlotRadiusFt(0.2)'), Math.sqrt(0.2 * 43560 / Math.PI)); // 52.66 ft
    assert.equal(env.ev('cruiseLabel({ method: "fixed", plotAcres: 0.2 })'), 'Fixed 1/5 ac');
    assert.equal(env.ev('cruiseLabel(10)'), 'BAF 10');
});

test('empty plots count toward the number of plots', () => {
    const r = call(env, 'calculateForestryReport', [tree(1, 16, 2), empty(2)], FIFTH, 'Doyle', 78).summary;
    assert.equal(r.numberOfPlots, 2);
    near(r.totalTreesPerAcre, 2.5);           // 5 TPA spread over 2 plots
    near(r.totalVolPerAcre, 116 * 5 / 2);
    const s = call(env, 'calculatePlotStats', [tree(1, 16, 2), empty(2)], FIFTH, 'Doyle', 78);
    assert.equal(s.numValidPlots, 2);
    assert.deepEqual(s.plotVolumes, [580, 0]);
});

test('Cull trees count for TPA and BA but 0 board feet', () => {
    const r = call(env, 'calculateForestryReport', [tree(1, 16, 'Cull')], FIFTH, 'Doyle', 78).summary;
    near(r.totalTreesPerAcre, 5);
    near(r.totalVolPerAcre, 0);
});

test('sampling statistics: mean, SD, CV, sampling error and plots needed (hand math)', () => {
    // 1/5-ac plots of 16" 2-log trees (116 BF Doyle × 5 TPA = 580 BF/ac each):
    // plot volumes 580, 1160, 1740 → mean 1160, SD 580, CV 50 %.
    const data = [tree(1, 16, 2), tree(2, 16, 2), tree(2, 16, 2), tree(3, 16, 2), tree(3, 16, 2), tree(3, 16, 2)];
    const s = call(env, 'calculatePlotStats', data, FIFTH, 'Doyle', 78);
    assert.deepEqual(s.plotVolumes, [580, 1160, 1740]);
    assert.equal(s.numValidPlots, 3);
    near(s.meanV, 1160);
    near(s.stdDevV, 580);
    near(s.cvV, 50);
    // Sampling error at t = 2: 2 × (580/√3) / 1160 = 57.735 %
    const se = s.stdDevV / Math.sqrt(s.numValidPlots);
    near((2 * se / s.meanV) * 100, 57.735, 1e-3);
    // Plots needed = ⌈(t·CV/E)²⌉ with t = 2 (script.js calculateAndDisplayNeededPlots):
    // ±10 % → (100/10)² = 100; ±15 % → 6.667² = 44.4 → 45; ±20 % → 5² = 25.
    const need = E => Math.ceil(Math.pow(2 * s.cvV / E, 2));
    assert.deepEqual([need(10), need(15), need(20)], [100, 45, 25]);
});

test('sampling statistics include empty plots as 0-volume plots', () => {
    const data = [tree(1, 16, 2), tree(2, 16, 2), tree(2, 16, 2), tree(3, 16, 2), tree(3, 16, 2), tree(3, 16, 2), empty(4)];
    const s = call(env, 'calculatePlotStats', data, FIFTH, 'Doyle', 78);
    assert.deepEqual(s.plotVolumes, [580, 1160, 1740, 0]);
    near(s.meanV, 870);
    // SD = √((290² + 290² + 870² + 870²) / 3) = √(1682000/3) = 748.78
    near(s.stdDevV, Math.sqrt(1682000 / 3), 1e-6);
});

test('Gingrich stocking for a known stand: 100 TPA of 12" trees', () => {
    // 20 twelve-inch trees on one 1/5-ac plot = 100 TPA, QMD 12.
    // % = −0.00507·100 + 0.01698·100·12 + 0.00317·100·144 = −0.507 + 20.376 + 45.648 = 65.517
    const data = Array.from({ length: 20 }, () => tree(1, 12, 1));
    const [st] = call(env, 'calculateStandStocking', data, FIFTH);
    near(st.totalTpa, 100);
    near(st.totalQmd, 12, 1e-9);
    near(st.totalBa, 78.5376, 1e-9);
    near(st.totalPct, 65.517, 1e-9);
    assert.equal(st.totalLevel, 'Fully stocked');
    assert.equal(env.ev('gingrichLevel(100)'), 'Overstocked');
    assert.equal(env.ev('gingrichLevel(59.9)'), 'Understocked');
    // gingrichBaAt inverts gingrichPercent.
    near(env.ev('gingrichBaAt(65.517, 100)'), 78.5376, 1e-6);
});

test('stand & stock table totals equal the area summary', () => {
    const data = [tree(1, 12, 1), tree(1, 16, 2, { species: 'Red Oak', cutStatus: 'Yes' }), tree(2, 20, 3), empty(3)];
    for (const cruise of [10, FIFTH]) {
        const st = call(env, 'calculateStandStockTable', data, cruise, 'Doyle', 78);
        const s = call(env, 'calculateForestryReport', data, cruise, 'Doyle', 78).summary;
        assert.equal(st.numPlots, 3);
        near(st.all.total.tpa, s.totalTreesPerAcre);
        near(st.all.total.ba, s.totalBaPerAcre);
        near(st.all.total.vol, s.totalVolPerAcre);
        near(st.cut.total.vol, s.volumePerAcreCut);
    }
});

test('property summary weights each Area by its acres', () => {
    // A: 1 plot, 1 tree → 5 TPA; B: 1 plot, 2 trees → 10 TPA. Acres 30 and 10.
    // Weighted TPA = (5·30 + 10·10) / 40 = 6.25; total BF = 580·30 + 1160·10 = 29000.
    const data = [tree(1, 16, 2), tree(1, 16, 2, { areaLetter: 'B' }), tree(1, 16, 2, { areaLetter: 'B' })];
    const ps = call(env, 'calculatePropertySummary', data, { A: 30, B: 10 }, FIFTH, 'Doyle', 78);
    assert.equal(ps.rows.length, 2);
    assert.equal(ps.allAcres, true);
    near(ps.total.acres, 40);
    near(ps.total.tpa, 6.25);
    near(ps.total.bfac, (580 * 30 + 1160 * 10) / 40);
    near(ps.total.totalBf, 29000);
    near(ps.total.qmd, 16, 1e-9);
    // Without acres for every Area there are no property totals.
    const partial = call(env, 'calculatePropertySummary', data, { A: 30 }, FIFTH, 'Doyle', 78);
    assert.equal(partial.total, null);
});

test('combined (stratified) sampling error: var = Σ w² s² / n, t = 2', () => {
    const strata = [
        { acres: 30, stats: { meanV: 1000, stdDevV: 400, numValidPlots: 4 } },
        { acres: 10, stats: { meanV: 2000, stdDevV: 800, numValidPlots: 4 } },
    ];
    const c = call(env, 'combinedPlotStats', strata);
    // mean = .75·1000 + .25·2000 = 1250; var = .5625·160000/4 + .0625·640000/4 = 22500 + 10000 = 32500
    near(c.mean, 1250);
    near(c.samplingErrorPct, 2 * Math.sqrt(32500) / 1250 * 100);
    near(c.total, 1250 * 40);
});

test('CSV report text is produced for a report', () => {
    const r = env.ev('formatReportForCsv(calculateForestryReport([{plotNumber:1,areaLetter:"A",species:"White Oak",dbh:"16",logs:"2",cutStatus:"No"}], 10, "Doyle", 78))');
    assert.equal(typeof r, 'string');
    assert.ok(r.length > 50);
});

// Audit 2026-11-24 #1: plots are keyed by Area + plot number, so on the Tally tab's "All Areas"
// view Area A plot 1 and Area B plot 1 are two plots (they used to be pooled into one).
test('all-Areas report counts Area A plot 1 and Area B plot 1 as two plots', () => {
    const data = [tree(1, 16, 2), tree(1, 16, 2, { areaLetter: 'B' })];
    const r = call(env, 'calculateForestryReport', data, FIFTH, 'Doyle', 78).summary;
    assert.equal(r.numberOfPlots, 2);
    near(r.totalTreesPerAcre, 5);
    // The audit's scenario: one 20" tree in A-1 and one in B-1 at BAF 10 → BA 10, not 20.
    const p = call(env, 'calculateForestryReport', [tree(1, 20, 2), tree(1, 20, 2, { areaLetter: 'B' })], 10, 'Doyle', 78).summary;
    assert.equal(p.numberOfPlots, 2);
    near(p.totalBaPerAcre, 10);
    near(p.totalVolPerAcre, call(env, 'calculateForestryReport', [tree(1, 20, 2)], 10, 'Doyle', 78).summary.totalVolPerAcre);
});

test('all-Areas plot stats count each Area\'s plot 1 separately', () => {
    const data = [tree(1, 16, 2), tree(1, 16, 2, { areaLetter: 'B' }), tree(2, 16, 2, { areaLetter: 'B' })];
    const st = call(env, 'calculatePlotStats', data, FIFTH, 'Doyle', 78);
    assert.equal(st.numValidPlots, 3);
    assert.deepEqual(st.plotVolumes, [580, 580, 580]); // 116 BF × 5 TPA each
});

test('plot numbers stored as text ("1") and as numbers (1) are the same plot', () => {
    const r = call(env, 'calculateForestryReport', [tree(1, 16, 2), tree('1', 16, 2)], FIFTH, 'Doyle', 78).summary;
    assert.equal(r.numberOfPlots, 1);
});

// Audit #12: an invalid tree (no species or DBH) is a stem in the INVALID row but adds no BA,
// so Stand Distribution TOTALS agree with the summary.
test('invalid trees: summary BA == Stand Distribution TOTALS BA (prism and fixed)', () => {
    for (const cruise of [10, FIFTH]) {
        const data = [tree(1, 16, 2), tree(1, 0, 0, { species: '' }), tree(2, 14, 1, { species: '', cutStatus: 'Yes' }), tree(2, 18, 2, { cutStatus: 'Yes' })];
        const r = call(env, 'calculateForestryReport', data, cruise, 'Doyle', 78);
        const tot = r.standDistribution.TOTALS;
        near(tot.baSqFtPerAcreTotal, r.summary.totalBaPerAcre, 1e-9, `total BA ${JSON.stringify(cruise)}`);
        near(tot.baSqFtPerAcreCut, r.summary.baPerAcreCut, 1e-9, 'cut BA');
        near(tot.baSqFtPerAcreLeave, r.summary.baPerAcreLeave, 1e-9, 'leave BA');
        near(tot.volumeBfPerAcre, r.summary.totalVolPerAcre, 1e-9, 'volume');
        assert.equal(r.standDistribution.Invalid.baSqFtPerAcreTotal, 0);
    }
    // The audit's scenario: a prism tree with no species → summary BA 10 and TOTALS 10 (was 20).
    const one = call(env, 'calculateForestryReport', [tree(1, 16, 2), tree(1, 16, 2, { species: '' })], 10, 'Doyle', 78);
    near(one.summary.totalBaPerAcre, 10);
    near(one.standDistribution.TOTALS.baSqFtPerAcreTotal, 10);
});

// Audit #13: one plots-needed formula (script.js and charts.js both use it).
test('plotsNeeded = ceil((2·CV / E)²)', () => {
    assert.equal(env.ev('plotsNeeded(30, 10)'), 36);
    assert.equal(env.ev('plotsNeeded(30, 20)'), 9);
    assert.equal(env.ev('plotsNeeded(25, 15)'), Math.ceil((2 * 25 / 15) ** 2));
    assert.equal(env.ev('plotsNeeded(0, 10)'), 0);
});

// Audit #4: the logs wheel / Tap Grid offer only log counts the volume tables hold for that DBH.
test('every DBH × logs choice the Data tab offers has a volume > 0 in all three rules', () => {
    const offered = d => env.evj(`logsChoicesFor(${JSON.stringify(String(d))})`);
    let n = 0;
    for (let d = 4; d <= 40; d += 2) {
        const logs = offered(d);
        if (d <= 10) continue; // the Data tab offers only 0 logs at 10" and under (script.js MAX_ZERO_LOG_DBH)
        assert.ok(logs.length >= 6, `${d}" offers ${logs}`);
        for (const l of logs) for (const rule of ['Doyle', 'Scribner', 'International']) {
            assert.ok(vol(String(d), l, rule) > 0, `${d}" ${l} logs ${rule}`);
            n++;
        }
    }
    assert.ok(n > 300);
    // The table limits: 4 logs at 12-18", 5 at 20-26", 6 at 28"+, from a half log up.
    assert.equal(env.ev('maxLogsFor("12")'), 4);
    assert.equal(env.ev('maxLogsFor("18")'), 4);
    assert.equal(env.ev('maxLogsFor("20")'), 5);
    assert.equal(env.ev('maxLogsFor("28")'), 6);
    assert.ok(offered(16).includes('0.5'));
    assert.ok(!offered(16).includes('4.5'));
});

// Audit #11: one CSV text cell helper.
test('csvCell: quotes doubled, formula starts guarded, plain text quoted', () => {
    const c = v => env.ev(`csvCell(${JSON.stringify(v)})`);
    assert.equal(c('White Oak'), '"White Oak"');
    assert.equal(c('Oak "big"'), '"Oak ""big"""');
    assert.equal(c('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
    assert.equal(c('+1'), '"\'+1"');
    assert.equal(c('-dead top'), '"\'-dead top"');
    assert.equal(c('@cmd'), '"\'@cmd"');
    assert.equal(c('line1\nline2'), '"line1\nline2"');
    assert.equal(c(null), '""');
    const r = env.ev('formatReportForCsv(calculateForestryReport([{plotNumber:1,areaLetter:"A",species:"Oak \\"big\\"",dbh:"16",logs:"2",cutStatus:"No"}], 10, "Doyle", 78))');
    assert.ok(r.includes('"Oak ""big"""'), 'species quoted in the report CSV');
});

// A half log is half of a 1-log tree of the same DBH, in every rule and form class.
test('half log = half the 1-log volume, and every table value is returned as listed', () => {
    const tables = { Doyle: 'DOYLE_FC78_VOLUMES', Scribner: 'SCRIBNER_FC78_VOLUMES', International: 'INTERNATIONAL_FC78_VOLUMES' };
    let n = 0;
    for (const [rule, name] of Object.entries(tables)) {
        const t = env.evj(name);
        for (const d of Object.keys(t)) {
            const keys = Object.keys(t[d]).map(Number).sort((a, b) => a - b);
            for (let i = 1; i < keys.length; i++) assert.ok(t[d][keys[i].toFixed(1)] > t[d][keys[i - 1].toFixed(1)], `${rule} ${d}" rises with logs`);
            if (t[d - 1]) for (const k of Object.keys(t[d])) if (t[d - 1][k] != null) assert.ok(t[d][k] > t[d - 1][k], `${rule} ${k} logs rises with DBH at ${d}"`);
            for (const fc of rule === 'Doyle' ? [70, 72, 74, 76, 78, 80, 82, 84, 86] : [78]) {
                const scale = v => (rule === 'Doyle' && fc !== 78 ? Math.round(v * fc / 78) : v);
                for (const k of keys) { assert.equal(vol(d, String(k), rule, fc), scale(t[d][k.toFixed(1)]), `${rule} FC${fc} ${d}" ${k}`); n++; }
                assert.equal(vol(d, '0.5', rule, fc), vol(d, '1', rule, fc) / 2, `${rule} FC${fc} ${d}" half log`);
                n++;
            }
        }
    }
    assert.ok(n > 3000);
    assert.equal(vol('12', '0.5', 'Doyle'), 14.5);
    assert.equal(vol('20', '0.5', 'Doyle'), 67.5);
});

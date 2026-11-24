// Golden test: the full summary for the sample project must match the saved numbers.
// A failure here means a calculation changed. If that was intended, run
// `node scripts/update-golden.cjs` and review the diff of tests/fixtures/sample-golden.json.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { FIXTURE, GOLDEN, sampleFromTour, computeSummary, fs } = require('./helpers/golden.cjs');

const entries = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));

test('sample project summary matches the golden numbers', () => {
    const expected = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
    assert.deepStrictEqual(computeSummary(entries), expected);
});

test('sample fixture still matches tour.js sampleEntries()', () => {
    assert.deepStrictEqual(sampleFromTour(), entries,
        'tour.js sample data changed: run `node scripts/update-golden.cjs --sample` if intended');
});

test('golden sanity: sample has 2 Areas, 9 plots each, plot B4 empty', () => {
    const g = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
    assert.equal(g.baf10.Doyle78.A.report.summary.numberOfPlots, 9);
    assert.equal(g.baf10.Doyle78.B.report.summary.numberOfPlots, 9);
    assert.ok(entries.some(e => e.emptyPlot && e.areaLetter === 'B' && e.plotNumber === 4));
    // Stand & stock totals equal the area summary for every rule and Area.
    for (const rule of Object.keys(g.baf10).filter(k => k !== 'stocking')) {
        for (const a of ['A', 'B', 'ALL']) {
            const r = g.baf10[rule][a];
            assert.ok(Math.abs(r.standStockTotals.all.vol - r.report.summary.totalVolPerAcre) < 1e-4, `${rule} ${a}`);
            assert.ok(Math.abs(r.standStockTotals.all.tpa - r.report.summary.totalTreesPerAcre) < 1e-4, `${rule} ${a}`);
        }
    }
});

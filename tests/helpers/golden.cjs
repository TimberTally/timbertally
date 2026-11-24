// Shared by tests/golden.test.cjs and scripts/update-golden.cjs: the full set of
// numbers TimberTally computes for the sample project, rounded so float noise
// never fails a test but any real change to a calculation does.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('./load.cjs');

const FIXTURE = path.join(__dirname, '..', 'fixtures', 'sample-entries.json');
const GOLDEN = path.join(__dirname, '..', 'fixtures', 'sample-golden.json');
const ACRES = { A: 42, B: 18 }; // tour.js loadSample() areaAcres

/** tour.js sampleEntries(), without the time-based ids. */
function sampleFromTour() {
    const env = load(['tour.js']);
    const entries = JSON.parse(env.ev('JSON.stringify(TTTour.sampleEntries())'));
    return entries.map(({ id, ...rest }) => rest);
}

function round(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : String(v);
    if (Array.isArray(v)) return v.map(round);
    if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, round(v[k])]));
    return v;
}

function computeSummary(entries) {
    const env = load();
    env.ctx.__d = entries;
    env.ctx.__acres = ACRES;
    const out = {};
    const cruises = { baf10: 10, fixed_fifth: { method: 'fixed', plotAcres: 0.2 } };
    for (const [cname, cruise] of Object.entries(cruises)) {
        env.ctx.__c = cruise;
        const c = (out[cname] = {});
        for (const [rule, fc] of [['Doyle', 78], ['Doyle', 74], ['Scribner', 78], ['International', 78]]) {
            const key = `${rule}${rule === 'Doyle' ? fc : ''}`;
            const r = (c[key] = {});
            for (const area of ['ALL', 'A', 'B']) {
                const sub = area === 'ALL' ? '__d' : `__d.filter(e => e.areaLetter === "${area}")`;
                r[area] = JSON.parse(env.ev(`JSON.stringify({
                    report: calculateForestryReport(${sub}, __c, "${rule}", ${fc}),
                    plotStats: calculatePlotStats(${sub}, __c, "${rule}", ${fc}),
                    standStockTotals: (t => ({ all: t.all.total, cut: t.cut && t.cut.total, classes: t.classes, species: t.species }))(calculateStandStockTable(${sub}, __c, "${rule}", ${fc})),
                })`));
            }
            r.property = JSON.parse(env.ev(`JSON.stringify((p => ({ rows: p.rows, total: p.total, strat: p.strat }))(calculatePropertySummary(__d, __acres, __c, "${rule}", ${fc})))`));
        }
        c.stocking = JSON.parse(env.ev('JSON.stringify(calculateStandStocking(__d, __c))'));
    }
    return round(out);
}

module.exports = { FIXTURE, GOLDEN, ACRES, sampleFromTour, computeSummary, round, fs };

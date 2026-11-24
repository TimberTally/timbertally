#!/usr/bin/env node
// Rewrites the golden numbers for the sample project. Run ONLY when a calculation
// change is intended (see TESTING.md, "Updating the golden numbers"):
//   node scripts/update-golden.cjs           → recompute tests/fixtures/sample-golden.json
//   node scripts/update-golden.cjs --sample  → also re-extract the sample trees from tour.js
'use strict';
const { FIXTURE, GOLDEN, sampleFromTour, computeSummary, fs } = require('../tests/helpers/golden.cjs');

if (process.argv.includes('--sample') || !fs.existsSync(FIXTURE)) {
    const entries = sampleFromTour();
    fs.writeFileSync(FIXTURE, JSON.stringify(entries, null, 1) + '\n');
    console.log(`wrote ${FIXTURE} (${entries.length} entries)`);
}
const entries = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
fs.writeFileSync(GOLDEN, JSON.stringify(computeSummary(entries), null, 1) + '\n');
console.log(`wrote ${GOLDEN}`);

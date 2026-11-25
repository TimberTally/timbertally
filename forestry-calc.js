// =============================================================================
// forestry-calc.js — Forestry calculation functions
// Depends on: forestry-data.js (BA_CONST, volume tables, VALID_DOYLE_FC)
// =============================================================================

/**
 * Look up board-foot volume for a single tree.
 * @param {string} dbhStr  - DBH as string (even integers 4-40)
 * @param {string} logsStr - Log count as string, or 'Cull'
 * @param {string} logRule - 'Doyle' | 'Scribner' | 'International'
 * @param {number} formClass - Doyle form class (70-86), default 78
 * @returns {number} Board feet, or 0 if not found
 */
function getTreeVolume(dbhStr, logsStr, logRule, formClass = 78) {
    try {
        const dbhInt = parseInt(dbhStr, 10);
        if (isNaN(dbhInt) || dbhInt < 10) return 0;
        if (logsStr === 'Cull') return 0;
        const logsNum = parseFloat(logsStr);
        if (isNaN(logsNum) || logsNum <= 0) return 0;
        const logsKey = (Math.floor(logsNum * 2) / 2).toFixed(1);
        if (parseFloat(logsKey) <= 0) return 0;
        // A half log is exactly half of a 1-log tree of the same DBH (form class included).
        if (logsKey === '0.5') return getTreeVolume(dbhStr, '1', logRule, formClass) / 2;
        const tables = {
            Doyle: DOYLE_FC78_VOLUMES,
            Scribner: SCRIBNER_FC78_VOLUMES,
            International: INTERNATIONAL_FC78_VOLUMES
        };
        const table = tables[logRule];
        if (!table) return 0;
        const baseVol = tableVolume(table, dbhInt, logsKey);
        if (!baseVol || baseVol <= 0) return 0;
        if (logRule === 'Doyle') {
            let fc = parseInt(formClass, 10);
            if (!VALID_DOYLE_FC.includes(fc)) fc = 78;
            return fc === 78 ? baseVol : Math.round(baseVol * (fc / 78.0));
        }
        return baseVol;
    } catch (e) { return 0; }
}

/**
 * Form Class 78 table volume for a DBH and a log key ('1.0', '1.5' …). A half log ('0.5')
 * is half the 1-log volume, since the tables start at 1 log. 0 when the table has no value.
 */
function tableVolume(table, dbh, logsKey) {
    const row = table && table[String(parseInt(dbh, 10))];
    if (!row) return 0;
    if (logsKey === '0.5') return (row['1.0'] || 0) / 2;
    return Object.prototype.hasOwnProperty.call(row, logsKey) ? row[logsKey] : 0;
}

/** Log counts the Data tab offers above 10" (the wheel and Tap Grid), before limiting by DBH. */
const LOG_COUNT_CHOICES = ['0.5','1','1.5','2','2.5','3','3.5','4','4.5','5','5.5','6'];
/**
 * The log counts every volume table (Doyle, Scribner, International) has a value for at
 * this DBH, as the Data tab shows them ('1', '1.5' …). Empty for trees 10" and under.
 */
function logsChoicesFor(dbh) {
    const d = String(parseInt(dbh, 10));
    const tables = [DOYLE_FC78_VOLUMES, SCRIBNER_FC78_VOLUMES, INTERNATIONAL_FC78_VOLUMES];
    return LOG_COUNT_CHOICES.filter(v => tables.every(t => tableVolume(t, d, parseFloat(v).toFixed(1)) > 0));
}
/** The largest log count the volume tables hold for this DBH (0 when none). */
function maxLogsFor(dbh) {
    const c = logsChoicesFor(dbh);
    return c.length ? parseFloat(c[c.length - 1]) : 0;
}

/**
 * Classify a tree by DBH into a standard size class.
 * @param {number|string} dbh
 * @returns {string} Size class name
 */
function getDbhClass(dbh) {
    const n = parseFloat(dbh);
    if (isNaN(n)) return 'Invalid';
    if (n >= 2  && n <= 5.9)  return 'Sapling';
    if (n >= 6  && n <= 11.9) return 'Poletimber';
    if (n >= 12 && n <= 17.9) return 'Small Sawtimber';
    if (n >= 18 && n <= 23.9) return 'Medium Sawtimber';
    if (n >= 24)               return 'Large Sawtimber';
    return 'Other';
}

// =============================================================================
// CRUISE METHOD — prism (BAF) or fixed-radius plots
// Every calculation takes a `cruise` argument: a number is a BAF (as before);
// { method: 'fixed', plotAcres } is a fixed plot. The helpers below are the
// only place the expansion factor is worked out.
// =============================================================================
const FIXED_PLOT_SIZES = [
    { acres: 0.25, label: '1/4' }, { acres: 0.2, label: '1/5' }, { acres: 0.1, label: '1/10' },
    { acres: 0.05, label: '1/20' }, { acres: 0.02, label: '1/50' }
];
function isFixedCruise(cruise) { return !!cruise && typeof cruise === 'object' && cruise.method === 'fixed' && cruise.plotAcres > 0; }
/** Trees per acre one tally tree stands for (BAF / tree BA, or 1 / plot acres). */
function treeExpansion(dbh, cruise) {
    const d = parseFloat(dbh);
    if (isFixedCruise(cruise)) return 1 / cruise.plotAcres;
    const ba = BA_CONST * Math.pow(d, 2);
    return ba > 0 ? Number(cruise) / ba : 0;
}
/** Basal area per acre (sq ft) one tally tree stands for (BAF, or tree BA / plot acres). */
function treeBaPerAcre(dbh, cruise) {
    if (isFixedCruise(cruise)) { const d = parseFloat(dbh); return d > 0 ? BA_CONST * d * d / cruise.plotAcres : 0; }
    return Number(cruise);
}
/** Fixed plot radius in feet: sqrt(acres * 43560 / pi). */
function fixedPlotRadiusFt(acres) { return acres > 0 ? Math.sqrt(acres * 43560 / Math.PI) : 0; }
function fixedPlotFraction(acres) { const m = FIXED_PLOT_SIZES.find(p => p.acres === acres); return m ? m.label : String(acres); }
/** "BAF 10" or "Fixed 1/5 ac". */
function cruiseLabel(cruise) { return isFixedCruise(cruise) ? `Fixed ${fixedPlotFraction(cruise.plotAcres)} ac` : `BAF ${cruise}`; }
/** CSV header part: "BAF=10" or "Plot=0.2 ac". */
function cruiseCsvTag(cruise, sep = '=') { return isFixedCruise(cruise) ? `Plot${sep}${cruise.plotAcres} ac` : `BAF${sep}${cruise}`; }
/** File name part: "BAF10" or "FIX0.2ac". */
function cruiseFileTag(cruise) { return isFixedCruise(cruise) ? `FIX${cruise.plotAcres}ac` : `BAF${cruise}`; }

/**
 * A plot's identity: Area letter + plot number ("A|1"), or null when the plot number is
 * missing. Plot 1 in Area A and plot 1 in Area B are different plots.
 */
function plotKey(e) {
    if (!e || e.plotNumber == null) return null;
    const n = parseInt(e.plotNumber, 10);
    if (isNaN(n)) return null;
    return `${e.areaLetter || ''}|${n}`;
}
function comparePlotKeys(a, b) {
    const [aa, an] = a.split('|'), [ba, bn] = b.split('|');
    return aa === ba ? Number(an) - Number(bn) : (aa < ba ? -1 : 1);
}
/** Plots needed for ±E % sampling error at t = 2: ceil((t·CV / E)²). */
function plotsNeeded(cv, E, t = 2) {
    return Math.ceil(Math.pow(t * cv / E, 2));
}

/**
 * Calculate the full forestry report for a subset of tree entries.
 * @param {Array}  dataSubset - Array of entry objects
 * @param {number|Object} baf - BAF number, or { method: 'fixed', plotAcres }
 * @param {string} logRule    - Log rule name
 * @param {number} formClass  - Doyle form class
 * @returns {Object} Report with summary, standDistribution, speciesSummary1, speciesSummary2
 */
function calculateForestryReport(dataSubset, baf, logRule, formClass) {
    const report = { summary: {}, standDistribution: {}, speciesSummary1: {}, speciesSummary2: {} };
    if (!dataSubset || dataSubset.length === 0) return report;

    // Plots are keyed by Area + plot number: Area A plot 1 and Area B plot 1 are two plots.
    const plotNums = new Set(dataSubset.map(plotKey).filter(k => k != null));
    const numPlots = plotNums.size;
    if (numPlots === 0) { report.summary = { numberOfPlots: 0 }; return report; }

    let totTpaSum = 0, totVolSum = 0, cutTpaSum = 0, cutVolSum = 0;
    const specData = {};
    const CLS_KEYS = ['Sapling','Poletimber','Small Sawtimber','Medium Sawtimber','Large Sawtimber','Other','Invalid'];
    const clsData = Object.fromEntries(CLS_KEYS.map(k => [k, {s:0,c:0,t:0,v:0,ct:0,b:0,bc:0}]));
    let totBaSum = 0, cutBaSum = 0;

    dataSubset.forEach(entry => {
        // Empty-plot records count toward the number of plots but hold no tree.
        if (!entry || entry.emptyPlot) return;
        const dbh = parseFloat(entry.dbh);
        const spec = entry.species;
        const isCut = entry.cutStatus === 'Yes';
        if (isNaN(dbh) || dbh <= 0 || !spec?.trim()) {
            // Counted as a stem in the INVALID row but given no BA (prism or fixed), so the
            // Stand Distribution TOTALS agree with the summary BA/acre.
            clsData['Invalid'].s++;
            if (isCut) clsData['Invalid'].c++;
            return;
        }
        const dbhCls = getDbhClass(dbh);
        const tpaT = treeExpansion(dbh, baf);
        const baPT = treeBaPerAcre(dbh, baf);
        totBaSum += baPT; if (isCut) cutBaSum += baPT;
        const volT = getTreeVolume(entry.dbh, entry.logs, logRule, formClass);
        const vpaT = volT * tpaT;
        totTpaSum += tpaT; totVolSum += vpaT;
        if (isCut) { cutTpaSum += tpaT; cutVolSum += vpaT; }

        if (!specData[spec]) specData[spec] = {s:0,c:0,t:0,v:0,vS:0,vM:0,vL:0,tpaSap:0,tpaPole:0,tpaSaw:0};
        specData[spec].s++; specData[spec].t += tpaT; specData[spec].v += vpaT;
        if (isCut) specData[spec].c++;
        if (dbhCls === 'Small Sawtimber')  specData[spec].vS += vpaT;
        else if (dbhCls === 'Medium Sawtimber') specData[spec].vM += vpaT;
        else if (dbhCls === 'Large Sawtimber')  specData[spec].vL += vpaT;
        if      (dbhCls === 'Sapling')     specData[spec].tpaSap  += tpaT;
        else if (dbhCls === 'Poletimber')  specData[spec].tpaPole += tpaT;
        else if (dbhCls.includes('Sawtimber')) specData[spec].tpaSaw += tpaT;

        if (clsData[dbhCls]) {
            clsData[dbhCls].s++; clsData[dbhCls].t += tpaT; clsData[dbhCls].v += vpaT; clsData[dbhCls].b += baPT;
            if (isCut) { clsData[dbhCls].c++; clsData[dbhCls].ct += tpaT; clsData[dbhCls].bc += baPT; }
        }
    });

    const tpa    = numPlots > 0 ? totTpaSum / numPlots : 0;
    const tpaCut = numPlots > 0 ? cutTpaSum / numPlots : 0;
    const volPA  = numPlots > 0 ? totVolSum / numPlots : 0;
    const baPA   = numPlots > 0 ? totBaSum / numPlots : 0;
    const baPACut= numPlots > 0 ? cutBaSum / numPlots : 0;
    const qmd    = tpa > 0 && baPA > 0 ? Math.sqrt((baPA / tpa) / BA_CONST) : 0;

    report.summary = {
        numberOfPlots: numPlots,
        totalTreesPerAcre: tpa, treesPerAcreCut: tpaCut, treesPerAcreLeave: tpa - tpaCut,
        totalBaPerAcre: baPA, baPerAcreCut: baPACut, baPerAcreLeave: baPA - baPACut,
        avgTractDbh: qmd,
        totalVolPerAcre: volPA,
        volumePerAcreCut: numPlots > 0 ? cutVolSum / numPlots : 0,
        volumePerAcreLeave: volPA - (numPlots > 0 ? cutVolSum / numPlots : 0),
        bafUsed: isFixedCruise(baf) ? null : baf, cruiseUsed: baf, logRuleUsed: logRule,
        formClassUsed: logRule === 'Doyle' ? formClass : 'N/A'
    };

    // Stand distribution by DBH class
    let sd = {percStems:0,baPA:0,baPACut:0,baPALeave:0,volPA:0,percBa:0,percVol:0,tpaCut:0,tpaLeave:0};
    CLS_KEYS.concat(['Invalid']).filter((v,i,a) => a.indexOf(v)===i).forEach(cls => {
        const ci = clsData[cls] || {s:0,c:0,t:0,v:0,ct:0,b:0,bc:0};
        const clsTpa   = numPlots > 0 ? ci.t / numPlots : 0;
        const clsVol   = numPlots > 0 ? ci.v / numPlots : 0;
        const clsBa    = numPlots > 0 ? ci.b / numPlots : 0;
        const clsBaCut = numPlots > 0 ? ci.bc / numPlots : 0;
        const clsTpaCut= numPlots > 0 ? ci.ct / numPlots : 0;
        const pStems = tpa   > 0 ? (clsTpa / tpa)   * 100 : 0;
        const pBa    = baPA  > 0 ? (clsBa  / baPA)  * 100 : 0;
        const pVol   = volPA > 0 ? (clsVol / volPA) * 100 : 0;
        report.standDistribution[cls] = {
            percentTotalStems: pStems, baSqFtPerAcreCut: clsBaCut,
            baSqFtPerAcreLeave: clsBa - clsBaCut, baSqFtPerAcreTotal: clsBa,
            percentBa: pBa, volumeBfPerAcre: clsVol, percentVolume: pVol,
            tpaPerAcreCut: clsTpaCut, tpaPerAcreLeave: clsTpa - clsTpaCut
        };
        sd.percStems += pStems; sd.baPA += clsBa; sd.baPACut += clsBaCut;
        sd.baPALeave += clsBa - clsBaCut; sd.volPA += clsVol;
        sd.percBa += pBa; sd.percVol += pVol;
        sd.tpaCut += clsTpaCut; sd.tpaLeave += clsTpa - clsTpaCut;
    });
    report.standDistribution['TOTALS'] = {
        percentTotalStems: sd.percStems, baSqFtPerAcreCut: sd.baPACut,
        baSqFtPerAcreLeave: sd.baPALeave, baSqFtPerAcreTotal: sd.baPA,
        percentBa: sd.percBa, volumeBfPerAcre: sd.volPA,
        percentVolume: sd.percVol, tpaPerAcreCut: sd.tpaCut, tpaPerAcreLeave: sd.tpaLeave
    };

    // Species composition
    const sortedSpecs = Object.keys(specData).sort();
    let ss1 = {percStems:0,percSaw:0,percPole:0,percSap:0};
    sortedSpecs.forEach(spec => {
        const sd = specData[spec];
        const spTpa  = numPlots > 0 ? sd.t / numPlots : 0;
        const pStems = tpa > 0 ? (spTpa / tpa) * 100 : 0;
        const pSaw   = tpa > 0 ? ((sd.tpaSaw   / numPlots) / tpa) * 100 : 0;
        const pPole  = tpa > 0 ? ((sd.tpaPole  / numPlots) / tpa) * 100 : 0;
        const pSap   = tpa > 0 ? ((sd.tpaSap   / numPlots) / tpa) * 100 : 0;
        report.speciesSummary1[spec] = {percentTotalStems:pStems,sawtimberPercent:pSaw,poletimberPercent:pPole,saplingPercent:pSap};
        ss1.percStems+=pStems; ss1.percSaw+=pSaw; ss1.percPole+=pPole; ss1.percSap+=pSap;
    });
    report.speciesSummary1['TOTALS'] = {percentTotalStems:ss1.percStems,sawtimberPercent:ss1.percSaw,poletimberPercent:ss1.percPole,saplingPercent:ss1.percSap};

    // Volume by species
    let ss2 = {v:0,vS:0,vM:0,vL:0,perc:0};
    sortedSpecs.forEach(spec => {
        const sd = specData[spec];
        const spVolA = numPlots > 0 ? sd.v  / numPlots : 0;
        const spVS   = numPlots > 0 ? sd.vS / numPlots : 0;
        const spVM   = numPlots > 0 ? sd.vM / numPlots : 0;
        const spVL   = numPlots > 0 ? sd.vL / numPlots : 0;
        const pVol   = volPA > 0 ? (spVolA / volPA) * 100 : 0;
        report.speciesSummary2[spec] = {volSmallPerAcre:spVS,volMediumPerAcre:spVM,volLargePerAcre:spVL,totalSpeciesVolPerAcre:spVolA,percentTotalVolume:pVol};
        ss2.v+=spVolA; ss2.vS+=spVS; ss2.vM+=spVM; ss2.vL+=spVL; ss2.perc+=pVol;
    });
    report.speciesSummary2['TOTALS'] = {volSmallPerAcre:ss2.vS,volMediumPerAcre:ss2.vM,volLargePerAcre:ss2.vL,totalSpeciesVolPerAcre:ss2.v,percentTotalVolume:ss2.perc};

    return report;
}

/**
 * Calculate per-plot volume statistics for a data subset.
 * @returns {Object|null} {meanV, stdDevV, cvV, numValidPlots, plotVolumes}
 */
function calculatePlotStats(dataSubset, baf, logRule, formClass) {
    if (!dataSubset?.length) return null;
    const plots = {};
    dataSubset.forEach(e => {
        if (!e?.plotNumber) return;
        const k = plotKey(e);
        if (k != null) { if (!plots[k]) plots[k] = []; plots[k].push(e); }
    });
    const plotNums = Object.keys(plots).sort(comparePlotKeys);
    if (!plotNums.length) return null;

    const plotVols = plotNums.map(pn => {
        let vpa = 0;
        plots[pn].forEach(t => {
            if (!t?.dbh || !t?.logs) return;
            const dbh = parseFloat(t.dbh);
            if (isNaN(dbh) || dbh <= 0) return;
            vpa += getTreeVolume(t.dbh, t.logs, logRule, formClass) * treeExpansion(dbh, baf);
        });
        return Math.round(vpa);
    });

    const n = plotVols.length;
    if (n < 2) return { meanV: n === 1 ? plotVols[0] : 0, stdDevV: 0, cvV: 0, numValidPlots: n, plotVolumes: plotVols };
    const mean     = plotVols.reduce((a, v) => a + v, 0) / n;
    const variance = plotVols.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / (n - 1);
    const stdDev   = Math.sqrt(variance);
    return { meanV: mean, stdDevV: stdDev, cvV: mean !== 0 ? (stdDev / mean) * 100 : 0, numValidPlots: n, plotVolumes: plotVols };
}

/**
 * Build a tally object grouped by species → DBH → logs → cut status.
 * @param {Array} dataSubset
 * @returns {Object}
 */
function generateTallyData(dataSubset) {
    const tally = {};
    dataSubset.forEach(entry => {
        if (!entry) return;
        const { species, dbh, logs, cutStatus } = entry;
        if (!species || !dbh || !logs || !cutStatus) return;
        const kS = String(species), kD = String(dbh), kL = String(logs), kC = String(cutStatus);
        if (!tally[kS])          tally[kS]          = {};
        if (!tally[kS][kD])      tally[kS][kD]      = {};
        if (!tally[kS][kD][kL]) tally[kS][kD][kL]  = {};
        tally[kS][kD][kL][kC] = (tally[kS][kD][kL][kC] || 0) + 1;
    });
    return tally;
}

// =============================================================================
// GINGRICH (1967) STOCKING — upland central hardwoods (same math as ForestScribe)
//
// A-level percent stocking = -0.00507 N + 0.01698 ΣD + 0.00317 ΣD²
// (N = trees/acre, ΣD = sum of diameters/acre, ΣD² = sum of squared diameters/acre).
// 100% = A-line (average maximum stocking); the B-line (minimum for full site
// use) is 60%. Between B and A the stand is fully stocked, above A overstocked,
// below B understocked. Stocking is read as on the chart: from trees/acre and
// quadratic mean diameter, so the %, the level and the plotted point always agree.
// =============================================================================
const GINGRICH_A_PCT = 100;
const GINGRICH_B_PCT = 60;
const _GA = -0.00507, _GB = 0.01698, _GC = 0.00317;

/** Percent stocking for a stand of uniform diameter `qmd` at `tpa` trees/acre. */
function gingrichPercent(tpa, qmd) {
    if (!(tpa > 0) || !(qmd > 0)) return 0;
    return _GA * tpa + _GB * tpa * qmd + _GC * tpa * qmd * qmd;
}

/** BA/acre on the `pct` stocking curve at `tpa` trees/acre (solved for uniform diameter). */
function gingrichBaAt(pct, tpa) {
    const a = _GC * tpa, b = _GB * tpa, c = _GA * tpa - pct;
    const disc = b * b - 4 * a * c;
    if (a <= 0 || disc < 0) return NaN;
    const d = (-b + Math.sqrt(disc)) / (2 * a);
    return tpa * BA_CONST * d * d;
}

function gingrichLevel(pct) {
    if (pct >= GINGRICH_A_PCT) return 'Overstocked';
    if (pct >= GINGRICH_B_PCT) return 'Fully stocked';
    return 'Understocked';
}

/**
 * Per-area stocking for the Gingrich chart: the stand as cruised (Total), the
 * marked trees (Cut) and the residual stand after the cut (Leave).
 * @param {Array}  collectedData - Full dataset
 * @param {number|Object} baf - BAF number, or { method: 'fixed', plotAcres }
 * @returns {Array|null}
 */
function calculateStandStocking(collectedData, baf) {
    if (!collectedData?.length) return null;
    const areas = [...new Set(collectedData.map(e => e.areaLetter).filter(Boolean))].sort();
    if (!areas.length) return null;

    const list = areas.map(area => {
        const areaData = collectedData.filter(e => e.areaLetter === area);
        // Empty-plot records count as plots (they hold no trees).
        const plots    = new Set(areaData.map(e => e.plotNumber).filter(p => p != null && !isNaN(parseInt(p, 10))));
        const numPlots = plots.size;
        if (numPlots === 0) return null;

        const acc = { total: { n: 0, d2: 0 }, cut: { n: 0, d2: 0 }, leave: { n: 0, d2: 0 } };
        areaData.forEach(entry => {
            if (entry.emptyPlot) return;
            const dbh = parseFloat(entry.dbh);
            if (isNaN(dbh) || dbh <= 0) return;
            // trees/acre this tally tree stands for (prism expression kept as before, to the last digit)
            const tpa = isFixedCruise(baf) ? treeExpansion(dbh, baf) : baf / (BA_CONST * dbh * dbh);
            const buckets = entry.cutStatus === 'Yes' ? [acc.total, acc.cut] : [acc.total, acc.leave];
            buckets.forEach(b => { b.n += tpa; b.d2 += tpa * dbh * dbh; });
        });
        if (!(acc.total.n > 0)) return { area, numPlots, empty: true };

        const point = b => {
            const tpa = b.n / numPlots, sumD2 = b.d2 / numPlots;
            const qmd = tpa > 0 ? Math.sqrt(sumD2 / tpa) : 0;
            return { tpa, ba: BA_CONST * sumD2, qmd, pct: gingrichPercent(tpa, qmd) };
        };
        const t = point(acc.total), c = point(acc.cut), l = point(acc.leave);
        return {
            area, numPlots,
            totalTpa: t.tpa, totalBa: t.ba, totalQmd: t.qmd, totalPct: t.pct, totalLevel: gingrichLevel(t.pct),
            cutTpa: c.tpa, cutBa: c.ba, cutQmd: c.qmd,
            leaveTpa: l.tpa, leaveBa: l.ba, leaveQmd: l.qmd, leavePct: l.pct, leaveLevel: gingrichLevel(l.pct),
        };
    }).filter(s => s && !s.empty);
    return list.length ? list : null;
}

/**
 * One quoted CSV text cell: quotes doubled, and a leading = + - @ prefixed with ' so
 * Excel / Sheets don't run it as a formula. Use for text only (numbers stay numbers).
 */
function csvCell(v) {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Format a forestry report object as CSV-ready text.
 * @param {Object} report - Output of calculateForestryReport()
 * @returns {string}
 */
function formatReportForCsv(report) {
    const fmt  = (n, d = 1) => !isNaN(parseFloat(n)) ? parseFloat(n).toFixed(d) : '0.0';
    const fmtI = n => !isNaN(parseFloat(n)) ? parseFloat(n).toFixed(0) : '0';
    const fmtP = (n, d = 1) => !isNaN(parseFloat(n)) ? parseFloat(n).toFixed(d) + '%' : '0.0%';

    if (!report?.summary?.numberOfPlots) return "\n--- FORESTRY REPORT DATA ---\nError: Report incomplete.\n";

    const sum = report.summary;
    let csv = `\n\n--- FORESTRY REPORT DATA (${cruiseCsvTag(sum.cruiseUsed ?? sum.bafUsed)}, Rule=${sum.logRuleUsed}${sum.logRuleUsed === 'Doyle' ? ', FC=' + sum.formClassUsed : ''}) ---\n`;
    csv += `TOTAL VOLUME/ACRE (BF),${fmtI(sum.totalVolPerAcre)},,VOL/ACRE CUT (BF),${fmtI(sum.volumePerAcreCut)},,VOL/ACRE LEAVE (BF),${fmtI(sum.volumePerAcreLeave)}\n`;
    csv += `AVG DBH (QMD),${fmt(sum.avgTractDbh)},,TOTAL TREES/ACRE,${fmt(sum.totalTreesPerAcre)},,NUMBER OF PLOTS,${fmtI(sum.numberOfPlots)}\n`;
    csv += `TOTAL BA/ACRE,${fmt(sum.totalBaPerAcre)},,TREES/ACRE CUT,${fmt(sum.treesPerAcreCut)},,TREES/ACRE LEAVE,${fmt(sum.treesPerAcreLeave)}\n`;
    csv += `BA/ACRE CUT,${fmt(sum.baPerAcreCut)},,BA/ACRE LEAVE,${fmt(sum.baPerAcreLeave)}\n\n`;

    csv += "STAND DISTRIBUTION,STEMS (%),BA/ACRE CUT,BA/ACRE LEAVE,BA/ACRE TOTAL,BA (%),VOL/ACRE (BF),VOL (%),TPA CUT,TPA LEAVE\n";
    const CLS_ORDER = ['Sapling','Poletimber','Small Sawtimber','Medium Sawtimber','Large Sawtimber','Other','Invalid','TOTALS'];
    const CLS_LABEL = {
        'Sapling':'SAPLINGS (2-5.9")','Poletimber':'POLETIMBER (6-11.9")',
        'Small Sawtimber':'S SAW (12-17.9")','Medium Sawtimber':'M SAW (18-23.9")',
        'Large Sawtimber':'L SAW (24"+)','Other':'OTHER','Invalid':'INVALID','TOTALS':'TOTALS'
    };
    CLS_ORDER.forEach(cls => {
        const d = report.standDistribution[cls] || {};
        csv += `${csvCell(CLS_LABEL[cls] || cls)},${fmtP(d.percentTotalStems)},${fmt(d.baSqFtPerAcreCut)},${fmt(d.baSqFtPerAcreLeave)},${fmt(d.baSqFtPerAcreTotal)},${fmtP(d.percentBa)},${fmtI(d.volumeBfPerAcre)},${fmtP(d.percentVolume)},${fmt(d.tpaPerAcreCut)},${fmt(d.tpaPerAcreLeave)}\n`;
    });

    csv += "\nSPECIES COMPOSITION,STEMS (%),SAW (%),POLE (%),SAP (%)\n";
    [...Object.keys(report.speciesSummary1).filter(s => s !== 'TOTALS').sort(), 'TOTALS'].forEach(spec => {
        const d = report.speciesSummary1[spec] || {};
        csv += `${csvCell(spec)},${fmtP(d.percentTotalStems)},${fmtP(d.sawtimberPercent)},${fmtP(d.poletimberPercent)},${fmtP(d.saplingPercent)}\n`;
    });

    csv += '\nVOL/ACRE BY SPECIES,S SAW (12-17.9"),M SAW (18-23.9"),L SAW (24"+),TOTAL VOL/ACRE,VOL (%)\n';
    [...Object.keys(report.speciesSummary2).filter(s => s !== 'TOTALS').sort(), 'TOTALS'].forEach(spec => {
        const d = report.speciesSummary2[spec] || {};
        csv += `${csvCell(spec)},${fmtI(d.volSmallPerAcre)},${fmtI(d.volMediumPerAcre)},${fmtI(d.volLargePerAcre)},${fmtI(d.totalSpeciesVolPerAcre)},${fmtP(d.percentTotalVolume)}\n`;
    });

    return csv;
}

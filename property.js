// --- START OF FILE property.js ---
// Area acres, the Property Summary page and the Stand & Stock tables
// (ported from ForestScribe src/export/propertySummary.ts and standStockXlsx.ts).
// Depends on forestry-calc.js (treeExpansion, treeBaPerAcre, getTreeVolume,
// calculateForestryReport, calculatePlotStats, calculateStandStocking, cruiseLabel).

// =============================================================================
// STAND & STOCK TABLE — species × 2" DBH class: trees, BA and BF per acre
// =============================================================================
/**
 * @returns {{ classes:number[], species:string[], numPlots:number, all:Object, cut:Object|null }}
 * where all/cut = { cells: {sp: {dbh: {tpa,ba,vol}}}, rowTot: {sp: …}, colTot: {dbh: …}, total: {tpa,ba,vol} }
 */
function calculateStandStockTable(areaData, cruise, logRule, formClass) {
    const plots = new Set((areaData || []).map(plotKey).filter(k => k != null)); // Area + plot number
    const numPlots = plots.size;
    const blank = () => ({ cells: {}, rowTot: {}, colTot: {}, total: { tpa: 0, ba: 0, vol: 0 } });
    const all = blank(), cut = blank();
    const classSet = new Set(), spSet = new Set();
    let anyCut = false;
    const add = (o, k, v) => { o[k] = o[k] || { tpa: 0, ba: 0, vol: 0 }; o[k].tpa += v.tpa; o[k].ba += v.ba; o[k].vol += v.vol; };
    if (numPlots) for (const e of areaData) {
        if (!e || e.emptyPlot) continue;
        const dbh = parseFloat(e.dbh);
        if (isNaN(dbh) || dbh <= 0 || !e.species?.trim()) continue;
        const cls = Math.round(dbh), sp = e.species;
        const tpa = treeExpansion(dbh, cruise);
        const v = { tpa: tpa / numPlots, ba: treeBaPerAcre(dbh, cruise) / numPlots, vol: getTreeVolume(e.dbh, e.logs, logRule, formClass) * tpa / numPlots };
        classSet.add(cls); spSet.add(sp);
        const tabs = e.cutStatus === 'Yes' ? [all, cut] : [all];
        if (e.cutStatus === 'Yes') anyCut = true;
        for (const t of tabs) {
            t.cells[sp] = t.cells[sp] || {};
            add(t.cells[sp], cls, v); add(t.rowTot, sp, v); add(t.colTot, cls, v);
            t.total.tpa += v.tpa; t.total.ba += v.ba; t.total.vol += v.vol;
        }
    }
    return { classes: [...classSet].sort((a, b) => a - b), species: [...spSet].sort(), numPlots, all, cut: anyCut ? cut : null };
}

/** CSV text for one Area's stand & stock tables (three blocks, plus Cut-only blocks when trees are marked). */
function formatStandStockCsv(st, title, cruise) {
    const q = s => csvCell(s);
    const r1 = v => (Math.round(v * 10) / 10).toFixed(1), r0 = v => String(Math.round(v));
    let out = `${q(title)}\n${q(cruiseLabel(cruise))},${st.numPlots} plots\n`;
    const block = (heading, t, pick, fmt) => {
        out += `\n${q(heading)}\nSpecies,${st.classes.map(c => `${c}"`).join(',')},Total\n`;
        for (const sp of st.species) {
            if (!t.rowTot[sp]) continue;
            out += `${q(sp)},${st.classes.map(c => (t.cells[sp]?.[c] ? fmt(t.cells[sp][c][pick]) : '')).join(',')},${fmt(t.rowTot[sp][pick])}\n`;
        }
        out += `TOTAL,${st.classes.map(c => (t.colTot[c] ? fmt(t.colTot[c][pick]) : '')).join(',')},${fmt(t.total[pick])}\n`;
    };
    const tables = [['', st.all]];
    if (st.cut) tables.push(['CUT ONLY — ', st.cut]);
    for (const [pre, t] of tables) {
        block(`${pre}STAND TABLE — Trees per acre`, t, 'tpa', r1);
        block(`${pre}STOCK TABLE — Basal area per acre (sq ft)`, t, 'ba', r1);
        block(`${pre}STOCK TABLE — Volume per acre (board feet)`, t, 'vol', r0);
    }
    return out;
}

// =============================================================================
// PROPERTY SUMMARY — every Area, weighted by acres
// =============================================================================
/** Acres for an Area letter (0 when not entered). */
function areaAcresOf(areaAcres, letter) {
    const a = Number(areaAcres?.[letter]);
    return a > 0 ? a : 0;
}

/**
 * Property sampling error as ForestScribe does it: Areas are strata weighted by
 * acres; var = Σ (w² s² / n). t = 2 at 95%, as everywhere else in TimberTally.
 * Null unless every Area has acres and 2+ plots.
 */
function combinedPlotStats(strata) {
    const used = strata.filter(s => s.stats && s.stats.meanV > 0);
    if (!used.length || used.some(s => !(s.acres > 0) || s.stats.numValidPlots < 2)) return null;
    const A = used.reduce((t, s) => t + s.acres, 0);
    let mean = 0, v = 0;
    for (const s of used) {
        const w = s.acres / A;
        mean += w * s.stats.meanV;
        v += (w * w * s.stats.stdDevV * s.stats.stdDevV) / s.stats.numValidPlots;
    }
    if (!(mean > 0)) return null;
    const pct = (2 * Math.sqrt(v) / mean) * 100;
    const total = mean * A;
    return { mean, total, acres: A, samplingErrorPct: pct, low: Math.max(0, total * (1 - pct / 100)), high: total * (1 + pct / 100) };
}

/** One row per Area with trees, plus property totals (acre-weighted) when every Area has acres. */
function calculatePropertySummary(collectedData, areaAcres, cruise, logRule, formClass) {
    const areas = [...new Set((collectedData || []).map(e => e?.areaLetter).filter(Boolean))].sort();
    const stockAll = calculateStandStocking(collectedData, cruise) || [];
    const rows = areas.map(letter => {
        const data = collectedData.filter(e => e.areaLetter === letter);
        const report = calculateForestryReport(data, cruise, logRule, formClass);
        const s = report.summary;
        if (!s?.numberOfPlots || !data.some(e => !e.emptyPlot)) return null;
        const acres = areaAcresOf(areaAcres, letter);
        return {
            area: letter, acres, plots: s.numberOfPlots,
            tpa: s.totalTreesPerAcre, ba: s.totalBaPerAcre, qmd: s.avgTractDbh,
            bfac: s.totalVolPerAcre, cutBfac: s.volumePerAcreCut,
            totalBf: acres ? s.totalVolPerAcre * acres : null,
            stock: stockAll.find(x => x.area === letter) || null,
            stats: calculatePlotStats(data, cruise, logRule, formClass),
        };
    }).filter(Boolean);
    const allAcres = rows.length > 0 && rows.every(r => r.acres > 0);
    const anyCut = rows.some(r => r.cutBfac > 0);
    let total = null;
    if (allAcres) {
        const A = rows.reduce((t, r) => t + r.acres, 0);
        const w = get => rows.reduce((t, r) => t + get(r) * r.acres, 0) / A;
        total = {
            acres: A, plots: rows.reduce((t, r) => t + r.plots, 0),
            tpa: w(r => r.tpa), ba: w(r => r.ba), bfac: w(r => r.bfac), cutBfac: w(r => r.cutBfac),
            totalBf: rows.reduce((t, r) => t + r.totalBf, 0),
            totalCutBf: rows.reduce((t, r) => t + r.cutBfac * r.acres, 0),
        };
        // QMD from the weighted TPA and BA, so it agrees with them.
        total.qmd = total.tpa > 0 ? Math.sqrt((total.ba / total.tpa) / BA_CONST) : 0;
    }
    const strat = combinedPlotStats(rows.map(r => ({ acres: r.acres, stats: r.stats })));
    return { rows, total, allAcres, anyCut, strat, stockAll };
}

/** The Property table (Tally tab, All Areas). */
function renderPropertyTableHtml(ps) {
    if (!ps || ps.rows.length < 2) return '';
    const f0 = v => (v != null && !isNaN(v) ? Math.round(v).toLocaleString() : '—');
    const f1 = v => (v != null && !isNaN(v) ? Number(v).toFixed(1) : '—');
    const lvl = s => (s ? `${Math.round(s.totalPct)}% · ${s.totalLevel}` : '—');
    const cut = ps.anyCut;
    let html = `<table><thead><tr><th>Area</th><th>Acres</th><th>Plots</th><th>TPA</th><th>BA/Ac</th><th>QMD</th><th>BF/Ac</th><th>Total BF</th><th>Stocking</th>${cut ? '<th>Cut BF/Ac</th>' : ''}</tr></thead><tbody>`;
    for (const r of ps.rows) html += `<tr><td><strong>${String(r.area).replace(/[^A-Z]/g, '')}</strong></td><td>${r.acres ? f1(r.acres) : '—'}</td><td>${r.plots}</td><td>${f0(r.tpa)}</td><td>${f1(r.ba)}</td><td>${f1(r.qmd)}"</td><td>${f0(r.bfac)}</td><td>${r.totalBf != null ? f0(r.totalBf) : '—'}</td><td>${lvl(r.stock)}</td>${cut ? `<td>${f0(r.cutBfac)}</td>` : ''}</tr>`;
    if (ps.total) {
        const t = ps.total;
        html += `<tr class="property-total"><td><strong>Total</strong></td><td>${f1(t.acres)}</td><td>${t.plots}</td><td>${f0(t.tpa)}</td><td>${f1(t.ba)}</td><td>${f1(t.qmd)}"</td><td>${f0(t.bfac)}</td><td>${f0(t.totalBf)}</td><td></td>${cut ? `<td>${f0(t.cutBfac)}</td>` : ''}</tr>`;
    }
    html += '</tbody></table>';
    const note = ps.total
        ? (ps.strat ? `Property sampling error ±${ps.strat.samplingErrorPct.toFixed(1)}% (95%, Areas weighted by acres) · ${f0(ps.strat.low)}–${f0(ps.strat.high)} BF` : 'Property sampling error needs 2+ plots in every Area.')
        : 'Enter Area acres (Area Notes) for property totals.';
    return html + `<p class="property-note">${note}</p>`;
}

/** Property Summary page: 11 × 8.5 landscape, 2200 × 1700, same look as the Area Summary Report. */
async function buildPropertySummaryCanvas(ps, projectName, logRule, formClass, cruise) {
    if (!ps || ps.rows.length < 2) return null;
    const LW = 1400, LH = Math.round(1400 * 8.5 / 11);
    const canvas = document.createElement('canvas');
    canvas.width = 2200; canvas.height = 1700;
    const ctx = canvas.getContext('2d');
    ctx.scale(2200 / LW, 1700 / LH);
    const C = {
        bg: '#ffffff', header: '#2d5016', headerTx: '#ffffff', section: '#3d6b20', secTx: '#ffffff',
        head: '#d4eabf', rowAlt: '#f3f8ec', total: '#e2f0d3', border: '#c9dcb6', dark: '#1e2d0f', muted: '#5f6d4c',
        over: '#1e5aa0', full: '#2b6424', under: '#b4461f',
    };
    const FONT = 'Arial, Helvetica, sans-serif';
    const font = (px, bold) => `${bold ? 'bold ' : ''}${px}px ${FONT}`;
    const num = v => v != null && !isNaN(v);
    const f0 = v => (num(v) ? Math.round(v).toLocaleString() : '—');
    const f1 = v => (num(v) ? Number(v).toFixed(1) : '—');
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, LW, LH);

    const M = 22, HEAD = 74, FOOT = 30;
    ctx.fillStyle = C.header; ctx.fillRect(0, 0, LW, HEAD);
    ctx.fillStyle = C.headerTx; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.font = font(30, true); ctx.fillText(`${projectName || 'Untitled'} — Property Summary`, M, 28);
    ctx.font = font(16); ctx.fillText(`${ps.rows.length} Areas${ps.total ? `  ·  ${f1(ps.total.acres)} acres` : ''}`, M, 56);
    ctx.textAlign = 'right';
    const rule = logRule === 'Doyle' ? `Doyle FC${formClass}` : logRule === 'International' ? 'International ¼"' : logRule;
    ctx.font = font(17, true); ctx.fillText(`${cruiseLabel(cruise)}  ·  ${rule}`, LW - M, 28);
    const plots = ps.rows.reduce((t, r) => t + r.plots, 0);
    ctx.font = font(16); ctx.fillText(`${plots} plots  ·  ${new Date().toLocaleDateString()}`, LW - M, 56);

    // Areas table across the top.
    const cut = ps.anyCut;
    const lvl = s => (s ? { text: `${Math.round(s.totalPct)}% · ${s.totalLevel}`, color: s.totalLevel === 'Overstocked' ? C.over : s.totalLevel === 'Fully stocked' ? C.full : C.under } : '—');
    const head = ['Area', 'Acres', 'Plots', 'TPA', 'BA/ac', 'QMD', 'BF/ac', 'Total BF', 'Stocking', ...(cut ? ['Cut BF/ac'] : [])];
    const wts = [0.85, 0.8, 0.65, 0.65, 0.8, 0.75, 0.9, 1.2, 2.6, ...(cut ? [1.15] : [])];
    const rows = ps.rows.map(r => [`Area ${r.area}`, r.acres ? f1(r.acres) : '—', String(r.plots), f0(r.tpa), f1(r.ba), `${f1(r.qmd)}"`, f0(r.bfac), r.totalBf != null ? f0(r.totalBf) : '—', lvl(r.stock), ...(cut ? [f0(r.cutBfac)] : [])]);
    if (ps.total) { const t = ps.total; rows.push(['TOTAL', f1(t.acres), String(t.plots), f0(t.tpa), f1(t.ba), `${f1(t.qmd)}"`, f0(t.bfac), f0(t.totalBf), '', ...(cut ? [f0(t.cutBfac)] : [])]); }

    const SEC_H = 32, bottom = LH - FOOT - 12;
    const leftW = 760, x0 = M;
    let y = HEAD + 16;
    const avail = bottom - y - SEC_H - 140;
    const rowH = Math.max(18, Math.min(40, Math.floor(avail / (rows.length + 1))));
    const tw = wts.reduce((a, b) => a + b, 0), cw = wts.map(v => (v / tw) * leftW);
    let px = Math.max(11, Math.min(18, Math.round(rowH * 0.5)));
    // Shrink the text until every cell fits its column.
    const fits = p => { ctx.font = font(p, true); return [head, ...rows].every(r => r.every((v, i) => ctx.measureText(typeof v === 'object' && v ? v.text : String(v)).width <= cw[i] - 12)); };
    while (px > 9 && !fits(px)) px--;
    ctx.fillStyle = C.section; ctx.fillRect(x0, y, leftW, SEC_H);
    ctx.fillStyle = C.secTx; ctx.font = font(16, true); ctx.textAlign = 'left';
    ctx.fillText('AREAS (PER-ACRE VALUES; TOTAL ROW WEIGHTED BY ACRES)', x0 + 10, y + SEC_H / 2 + 1);
    y += SEC_H;
    const drawRow = (cells, bg, bold) => {
        ctx.fillStyle = bg; ctx.fillRect(x0, y, leftW, rowH);
        let cx = x0;
        cells.forEach((v, i) => {
            const o = typeof v === 'object' && v ? v : { text: String(v) };
            ctx.fillStyle = o.color || C.dark; ctx.font = font(px, bold || !!o.color);
            ctx.textAlign = i === 0 ? 'left' : 'right';
            ctx.fillText(o.text, i === 0 ? cx + 8 : cx + cw[i] - 8, y + rowH / 2 + 1);
            cx += cw[i];
        });
        y += rowH;
    };
    const tableTop = y;
    drawRow(head, C.head, true);
    rows.forEach((r, i) => drawRow(r, ps.total && i === rows.length - 1 ? C.total : i % 2 ? C.rowAlt : C.bg, ps.total && i === rows.length - 1));
    ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.strokeRect(x0, tableTop, leftW, y - tableTop);

    // Property sampling.
    y += 16;
    ctx.fillStyle = C.section; ctx.fillRect(x0, y, leftW, SEC_H);
    ctx.fillStyle = C.secTx; ctx.font = font(16, true); ctx.textAlign = 'left';
    ctx.fillText('PROPERTY SAMPLING (BOARD FEET)', x0 + 10, y + SEC_H / 2 + 1);
    y += SEC_H + 8;
    const lines = !ps.total
        ? ['Enter Area acres for property totals.', 'Each Area is listed on its own until every Area has acres (Area Notes on the Data tab).']
        : ps.strat
            ? [`Total volume: ${f0(ps.strat.total)} BF`, `Sampling error (95%): ±${ps.strat.samplingErrorPct.toFixed(1)}%`, `95% range: ${f0(ps.strat.low)} – ${f0(ps.strat.high)} BF`, 'Areas weighted by acres (stratified sample, t = 2).']
            : [`Total volume: ${f0(ps.total.totalBf)} BF`, 'Sampling error needs 2+ plots in every Area.'];
    ctx.fillStyle = C.dark;
    lines.forEach((l, i) => { ctx.font = font(17, i === 0); ctx.fillText(l, x0 + 10, y + 12 + i * 26); });

    // Gingrich chart: every Area (the same drawing as the All Areas stocking chart).
    const rx = x0 + leftW + 22, rw = LW - M - rx, top = HEAD + 16;
    if (ps.stockAll.length && typeof renderGingrichSvg === 'function') {
        ctx.fillStyle = C.section; ctx.fillRect(rx, top, rw, SEC_H);
        ctx.fillStyle = C.secTx; ctx.font = font(16, true); ctx.textAlign = 'left';
        ctx.fillText('STOCKING — ALL AREAS', rx + 10, top + SEC_H / 2 + 1);
        const room = bottom - top - SEC_H - 6;
        const w = Math.min(rw, room * GINGRICH_W / GINGRICH_H), h = w * GINGRICH_H / GINGRICH_W;
        try {
            const svg = renderGingrichSvg(gingrichPoints(ps.stockAll), { fontScale: 1.25 });
            const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
            try {
                const img = new Image();
                await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
                ctx.drawImage(img, rx + (rw - w) / 2, top + SEC_H + 6, w, h);
            } finally { URL.revokeObjectURL(url); }
            ctx.strokeStyle = C.border; ctx.strokeRect(rx + (rw - w) / 2, top + SEC_H + 6, w, h);
        } catch (e) { console.error('Property stocking chart error:', e); }
    }

    ctx.fillStyle = C.header; ctx.fillRect(0, LH - FOOT, LW, FOOT);
    ctx.fillStyle = C.headerTx; ctx.font = font(13); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`Generated by TimberTally  •  Property Summary, ${ps.rows.length} Areas, ${plots} plots  •  Volumes in board feet  •  Stocking: Gingrich (1967)`, LW / 2, LH - FOOT / 2);
    return canvas;
}

// =============================================================================
// AREA ACRES — an Acres box in the Area Notes dialog (browser only)
// =============================================================================
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const input = document.getElementById('areaAcresInput');
        const select = document.getElementById('areaNotesSelect');
        if (!input || !select) return;
        const fill = () => {
            const p = window.ttProject?.get();
            const a = p?.areaAcres?.[select.value];
            input.value = a > 0 ? String(a) : '';
        };
        input.addEventListener('input', () => {
            const p = window.ttProject?.get();
            if (!p || !select.value) return;
            p.areaAcres = p.areaAcres || {};
            const v = parseFloat(input.value);
            if (v > 0) p.areaAcres[select.value] = Math.round(v * 100) / 100; else delete p.areaAcres[select.value];
            window.ttProject.save();
        });
        window.addEventListener('tt-area-notes-shown', fill);
    });
}

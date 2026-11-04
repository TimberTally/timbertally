// =============================================================================
// charts.js — Chart.js generators for TimberTally
// Depends on: forestry-data.js (BA_CONST)
//             forestry-calc.js (calculateForestryReport, calculateStandStocking, gingrichBaAt)
// All functions are called from script.js; chart instances are managed there.
// =============================================================================

// --- Shared color palette ---
const CHART_COLORS = {
    leave: 'rgba(61,107,32,0.65)', leaveBorder: 'rgba(61,107,32,1)',
    cut:   'rgba(200,35,51,0.65)', cutBorder:   'rgba(200,35,51,1)',
    blue:  'rgba(13,110,253,0.65)', blueBorder:  'rgba(13,110,253,1)'
};

const AREA_COLORS = ['#e8920a','#2196F3','#9C27B0','#009688','#FF5722','#607D8B','#795548','#E91E63'];

// DBH class label mapping (long key → short display label)
const DBH_CLASS_MAP = {
    'Sapling':        'Sapling',
    'Poletimber':     'Poletimber',
    'Small Sawtimber':'S Saw',
    'Medium Sawtimber':'M Saw',
    'Large Sawtimber': 'L Saw',
    'Other':          'Other'
};
const DBH_CLASS_LABELS = ['Sapling','Poletimber','S Saw','M Saw','L Saw','Other'];

// --- Shared chart options builder ---
function buildChartOpts(title, xLabel, yLabel, stacked = false) {
    return {
        animation: false,
        plugins: {
            customCanvasBackgroundColor: { color: 'white' },
            title: { display: true, text: title, font: { size: 14, weight: 'bold' }, color: '#1e2d0f' },
            legend: { labels: { font: { size: 11 } } },
            tooltip: { mode: 'index' }
        },
        responsive: true, maintainAspectRatio: true,
        scales: {
            x: { stacked, title: { display: true, text: xLabel, font: { size: 11 }, color: '#3d4d2e' } },
            y: { stacked, title: { display: true, text: yLabel, font: { size: 11 }, color: '#3d4d2e' }, beginAtZero: true }
        }
    };
}

// Shared export options builder (fixed-size, print-quality)
function buildExportOpts(title, xLabel, yLabel, stacked = false, horizontal = false) {
    const opts = {
        animation: false,
        plugins: {
            customCanvasBackgroundColor: { color: 'white' },
            title: { display: true, text: title, font: { size: 18, weight: 'bold' }, color: '#000000' },
            tooltip: { mode: 'index' }
        },
        responsive: false, maintainAspectRatio: false,
        scales: {
            x: { stacked, title: { display: true, text: horizontal ? yLabel : xLabel, font: { size: 14, weight: 'bold' }, color: '#000000' } },
            y: { stacked, title: { display: true, text: horizontal ? xLabel : yLabel, font: { size: 14, weight: 'bold' }, color: '#000000' }, beginAtZero: true }
        }
    };
    if (horizontal) opts.indexAxis = 'y';
    return opts;
}

// Helper: resolve short label → dist entry
function distByLabel(dist, shortLabel) {
    const key = Object.keys(DBH_CLASS_MAP).find(k => DBH_CLASS_MAP[k] === shortLabel);
    return key ? (dist[key] || {}) : {};
}

// =============================================================================
// IN-APP (RESPONSIVE) CHART GENERATORS — called from renderTallyCharts()
// =============================================================================

/**
 * Render the tally BA/TPA/Vol charts into tallyChartsContainer.
 * Manages its own instance array; returns array of Chart instances.
 * @param {Array}  subset            - Filtered entry data
 * @param {number} baf
 * @param {string} logRule
 * @param {number} formClass
 * @param {HTMLElement} container    - DOM element to append canvases into
 * @returns {Chart[]} instances for later .destroy()
 */
function renderTallyCharts(subset, baf, logRule, formClass, container) {
    container.innerHTML = '';
    const instances = [];

    if (!subset?.length) {
        container.innerHTML = '<p class="placeholder-msg">Add data to see charts.</p>';
        return instances;
    }

    const report = calculateForestryReport(subset, baf, logRule, formClass);
    if (!report?.summary?.numberOfPlots) {
        container.innerHTML = '<p class="placeholder-msg">Need at least 1 plot to generate charts.</p>';
        return instances;
    }

    const baCan  = document.createElement('canvas'); container.appendChild(baCan);
    const tpaCan = document.createElement('canvas'); container.appendChild(tpaCan);
    const volCan = document.createElement('canvas'); container.appendChild(volCan);

    const baChart  = generateBaChart(report, baCan);   if (baChart)  instances.push(baChart);
    const tpaChart = generateTpaChart(report, tpaCan);  if (tpaChart) instances.push(tpaChart);
    const volChart = generateVolSpeciesChart(report, volCan); if (volChart) instances.push(volChart);

    return instances;
}

function generateBaChart(report, canvas) {
    if (!canvas || !report?.standDistribution) return null;
    const dist = report.standDistribution;
    const leaveData = DBH_CLASS_LABELS.map(l => distByLabel(dist, l).baSqFtPerAcreLeave || 0);
    const cutData   = DBH_CLASS_LABELS.map(l => distByLabel(dist, l).baSqFtPerAcreCut   || 0);
    try {
        return new Chart(canvas, {
            type: 'bar',
            data: { labels: DBH_CLASS_LABELS, datasets: [
                { label: 'Leave BA/Acre', data: leaveData, backgroundColor: CHART_COLORS.leave, borderColor: CHART_COLORS.leaveBorder, borderWidth: 1 },
                { label: 'Cut BA/Acre',   data: cutData,   backgroundColor: CHART_COLORS.cut,   borderColor: CHART_COLORS.cutBorder,   borderWidth: 1 }
            ]},
            options: buildChartOpts('Basal Area Distribution (sq ft/Acre)', 'DBH Class', 'BA/Acre (sq ft)', true)
        });
    } catch(e) { return null; }
}

function generateTpaChart(report, canvas) {
    if (!canvas || !report?.standDistribution) return null;
    const dist = report.standDistribution;
    const leaveData = DBH_CLASS_LABELS.map(l => distByLabel(dist, l).tpaPerAcreLeave || 0);
    const cutData   = DBH_CLASS_LABELS.map(l => distByLabel(dist, l).tpaPerAcreCut   || 0);
    try {
        return new Chart(canvas, {
            type: 'bar',
            data: { labels: DBH_CLASS_LABELS, datasets: [
                { label: 'Leave TPA', data: leaveData, backgroundColor: CHART_COLORS.leave, borderColor: CHART_COLORS.leaveBorder, borderWidth: 1 },
                { label: 'Cut TPA',   data: cutData,   backgroundColor: CHART_COLORS.cut,   borderColor: CHART_COLORS.cutBorder,   borderWidth: 1 }
            ]},
            options: buildChartOpts('Trees Per Acre Distribution', 'DBH Class', 'Trees/Acre', true)
        });
    } catch(e) { return null; }
}

function generateVolSpeciesChart(report, canvas) {
    if (!canvas || !report?.speciesSummary2) return null;
    const sorted = Object.entries(report.speciesSummary2)
        .filter(([s, d]) => s !== 'TOTALS' && d?.totalSpeciesVolPerAcre > 0)
        .sort(([, a], [, b]) => b.totalSpeciesVolPerAcre - a.totalSpeciesVolPerAcre);
    if (!sorted.length) return null;
    const labels = sorted.map(([s]) => s);
    const data   = sorted.map(([, d]) => d.totalSpeciesVolPerAcre);
    try {
        return new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Vol/Acre (BF)', data, backgroundColor: CHART_COLORS.blue, borderColor: CHART_COLORS.blueBorder, borderWidth: 1 }]},
            options: {
                ...buildChartOpts('Volume by Species (BF/Acre)', 'Species', 'Board Feet/Acre'),
                indexAxis: 'y',
                plugins: {
                    ...buildChartOpts('Volume by Species (BF/Acre)', 'Species', 'Board Feet/Acre').plugins,
                    legend: { display: false }
                }
            }
        });
    } catch(e) { return null; }
}

// =============================================================================
// EXPORT-QUALITY (FIXED-SIZE) CHART GENERATORS — called from CSV export
// =============================================================================

function generateBaChartExport(report, canvas) {
    if (!canvas || !report?.standDistribution) return null;
    const dist = report.standDistribution;
    const leaveData = DBH_CLASS_LABELS.map(l => distByLabel(dist, l).baSqFtPerAcreLeave || 0);
    const cutData   = DBH_CLASS_LABELS.map(l => distByLabel(dist, l).baSqFtPerAcreCut   || 0);
    try {
        return new Chart(canvas, {
            type: 'bar',
            data: { labels: DBH_CLASS_LABELS, datasets: [
                { label: 'Leave BA/Acre', data: leaveData, backgroundColor: 'rgba(75,192,192,0.6)', borderColor: 'rgba(75,192,192,1)', borderWidth: 1 },
                { label: 'Cut BA/Acre',   data: cutData,   backgroundColor: 'rgba(255,99,132,0.6)', borderColor: 'rgba(255,99,132,1)', borderWidth: 1 }
            ]},
            options: buildExportOpts('Basal Area Distribution (SqFt/Acre)', 'BA / Acre (Sq Ft)', 'DBH Class', true)
        });
    } catch(e) { return null; }
}

function generateTpaChartExport(report, canvas) {
    if (!canvas || !report?.standDistribution) return null;
    const dist = report.standDistribution;
    const leaveData = DBH_CLASS_LABELS.map(l => distByLabel(dist, l).tpaPerAcreLeave || 0);
    const cutData   = DBH_CLASS_LABELS.map(l => distByLabel(dist, l).tpaPerAcreCut   || 0);
    try {
        return new Chart(canvas, {
            type: 'bar',
            data: { labels: DBH_CLASS_LABELS, datasets: [
                { label: 'Leave TPA', data: leaveData, backgroundColor: 'rgba(75,192,192,0.6)', borderColor: 'rgba(75,192,192,1)', borderWidth: 1 },
                { label: 'Cut TPA',   data: cutData,   backgroundColor: 'rgba(255,99,132,0.6)', borderColor: 'rgba(255,99,132,1)', borderWidth: 1 }
            ]},
            options: buildExportOpts('Trees Per Acre Distribution', 'Trees / Acre', 'DBH Class', true)
        });
    } catch(e) { return null; }
}

function generateVolSpeciesChartExport(report, canvas) {
    if (!canvas || !report?.speciesSummary2) return null;
    const sorted = Object.entries(report.speciesSummary2)
        .filter(([s, d]) => s !== 'TOTALS' && d?.totalSpeciesVolPerAcre > 0)
        .sort(([, a], [, b]) => b.totalSpeciesVolPerAcre - a.totalSpeciesVolPerAcre);
    const labels = sorted.map(([s]) => s);
    const data   = sorted.map(([, d]) => d.totalSpeciesVolPerAcre);
    try {
        return new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Total Vol/Acre', data, backgroundColor: 'rgba(54,162,235,0.6)', borderColor: 'rgba(54,162,235,1)', borderWidth: 1 }]},
            options: { ...buildExportOpts('Volume by Species (BF/Acre)', 'Board Feet / Acre', 'Species', false, true), plugins: { ...buildExportOpts().plugins, legend: { display: false } } }
        });
    } catch(e) { return null; }
}

function generateVolSawtimberChartExport(report, canvas) {
    if (!canvas || !report?.speciesSummary2) return null;
    const sorted = Object.entries(report.speciesSummary2)
        .filter(([s, d]) => s !== 'TOTALS' && d && (d.volSmallPerAcre > 0 || d.volMediumPerAcre > 0 || d.volLargePerAcre > 0))
        .map(([s, d]) => ({ species: s, small: d.volSmallPerAcre || 0, medium: d.volMediumPerAcre || 0, large: d.volLargePerAcre || 0, totalSaw: (d.volSmallPerAcre || 0) + (d.volMediumPerAcre || 0) + (d.volLargePerAcre || 0) }))
        .sort((a, b) => b.totalSaw - a.totalSaw);
    const labels = sorted.map(i => i.species);
    try {
        return new Chart(canvas, {
            type: 'bar',
            data: { labels, datasets: [
                { label: 'S Saw Vol/Acre (12-17.9")', data: sorted.map(i => i.small),  backgroundColor: 'rgba(255,206,86,0.6)',  borderColor: 'rgba(255,206,86,1)',  borderWidth: 1 },
                { label: 'M Saw Vol/Acre (18-23.9")', data: sorted.map(i => i.medium), backgroundColor: 'rgba(255,159,64,0.6)',  borderColor: 'rgba(255,159,64,1)',  borderWidth: 1 },
                { label: 'L Saw Vol/Acre (24"+)',      data: sorted.map(i => i.large),  backgroundColor: 'rgba(153,102,255,0.6)', borderColor: 'rgba(153,102,255,1)', borderWidth: 1 }
            ]},
            options: buildExportOpts('Sawtimber Volume Distribution by Species (BF/Acre)', 'Board Feet / Acre', 'Species', true)
        });
    } catch(e) { return null; }
}

// =============================================================================
// GINGRICH STOCKING CHART — the ForestScribe drawing (SVG), used on screen and
// for the PNG export. X = trees per acre, Y = basal area per acre (sq ft).
// Each Area is a filled dot (stand as cruised); when trees are marked to cut, a
// dashed arrow runs to a hollow circle (the residual stand after the cut).
// Curves come from the Gingrich (1967) equation (forestry-calc.js).
// =============================================================================

const GINGRICH_LIGHT = {
    bg: '#ffffff', text: '#1c211a', muted: '#6b7466', grid: '#e3e6df',
    aLine: '#1f4e1b', bLine: '#1f4e1b',
    fully: 'rgba(55,122,47,0.10)', over: 'rgba(30,90,160,0.08)',
    point: '#b4461f', residual: '#2b6424',
};
const GINGRICH_DARK = {
    bg: '#1a1f18', text: '#e7ece4', muted: '#9aa494', grid: '#2f372c',
    aLine: '#8fd07f', bLine: '#8fd07f',
    fully: 'rgba(120,200,100,0.12)', over: 'rgba(90,150,230,0.12)',
    point: '#f08a62', residual: '#8fd07f',
};
const GINGRICH_W = 720, GINGRICH_H = 560;

const _svgEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Chart points from calculateStandStocking(): current stand + residual after the marked cut. */
function gingrichPoints(areaStats) {
    return (areaStats || []).map(s => ({
        label: `Area ${s.area}`, tpa: s.totalTpa, ba: s.totalBa,
        residual: s.cutTpa > 0 ? { tpa: s.leaveTpa, ba: s.leaveBa } : null,
    }));
}

/**
 * The Gingrich chart as an SVG string.
 * @param {Array}  points - [{label, tpa, ba, residual:{tpa,ba}|null}]
 * @param {Object} opts   - {width, height, colors, title, fontScale, xMax, yMax}
 */
function renderGingrichSvg(points, opts = {}) {
    const fsc = opts.fontScale ?? 1;
    const fz = n => (n * fsc).toFixed(1);
    const W = opts.width ?? GINGRICH_W, H = opts.height ?? GINGRICH_H;
    const C = opts.colors ?? GINGRICH_LIGHT;
    const m = { l: 44 + 18 * fsc, r: 46 + 18 * fsc, t: opts.title ? 44 : 20, b: 36 + 16 * fsc };
    const pw = W - m.l - m.r, ph = H - m.t - m.b;

    const allTpa = points.flatMap(p => [p.tpa, p.residual?.tpa ?? 0]);
    const allBa  = points.flatMap(p => [p.ba,  p.residual?.ba  ?? 0]);
    const xMax = opts.xMax ?? Math.max(450, Math.ceil((Math.max(0, ...allTpa) * 1.12) / 50) * 50);
    const yMax = opts.yMax ?? Math.max(160, Math.ceil((Math.max(0, ...allBa) * 1.12) / 10) * 10);
    const X = tpa => m.l + (tpa / xMax) * pw;
    const Y = ba => m.t + ph - (ba / yMax) * ph;

    const curve = pct => {
        const pts = [];
        for (let tpa = 20; tpa <= xMax; tpa += 5) {
            const ba = gingrichBaAt(pct, tpa);
            if (!Number.isFinite(ba) || ba > yMax) continue;
            const d = Math.sqrt(ba / (tpa * BA_CONST));
            if (d < 3 || d > 24) continue;
            pts.push([X(tpa), Y(ba)]);
        }
        return pts;
    };
    const xy = pts => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L');
    const path = pts => (pts.length ? 'M' + xy(pts) : '');

    const out = [];
    out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Arial, Helvetica, sans-serif">`);
    out.push(`<rect width="${W}" height="${H}" fill="${C.bg}"/>`);
    if (opts.title) out.push(`<text x="${W / 2}" y="26" text-anchor="middle" font-size="${fz(16)}" font-weight="700" fill="${C.text}">${_svgEsc(opts.title)}</text>`);

    // Grid
    for (let t = 50; t <= xMax; t += 50) {
        out.push(`<line x1="${X(t)}" y1="${m.t}" x2="${X(t)}" y2="${m.t + ph}" stroke="${C.grid}" stroke-width="1"/>`);
        out.push(`<text x="${X(t)}" y="${m.t + ph + 18}" text-anchor="middle" font-size="${fz(12)}" fill="${C.muted}">${t}</text>`);
    }
    for (let b = 20; b <= yMax; b += 20) {
        out.push(`<line x1="${m.l}" y1="${Y(b)}" x2="${m.l + pw}" y2="${Y(b)}" stroke="${C.grid}" stroke-width="1"/>`);
        out.push(`<text x="${m.l - 8}" y="${Y(b) + 4}" text-anchor="end" font-size="${fz(12)}" fill="${C.muted}">${b}</text>`);
    }

    // Shaded zones: fully stocked (B..A) and overstocked (above A)
    const a = curve(GINGRICH_A_PCT), bl = curve(GINGRICH_B_PCT);
    if (a.length && bl.length) {
        out.push(`<path d="${path(a)}L${xy([...bl].reverse())}Z" fill="${C.fully}"/>`);
        const ax0 = a[0][0], ax1 = a[a.length - 1][0];
        out.push(`<path d="${path(a)}L${ax1.toFixed(1)},${m.t}L${ax0.toFixed(1)},${m.t}Z" fill="${C.over}"/>`);
    }

    // Average-diameter rays
    for (const d of [6, 8, 10, 12, 14, 16, 18, 20]) {
        const k = BA_CONST * d * d;
        const exitsRight = yMax / k > xMax;
        const tEnd = exitsRight ? xMax : yMax / k;
        const x2 = X(tEnd), y2 = Y(k * tEnd);
        out.push(`<line x1="${X(0)}" y1="${Y(0)}" x2="${x2}" y2="${y2}" stroke="${C.muted}" stroke-width="0.7" stroke-dasharray="2 4" opacity="0.7"/>`);
        out.push(exitsRight
            ? `<text x="${x2 - 4}" y="${y2 + 12 * fsc}" font-size="${fz(10)}" fill="${C.muted}" text-anchor="end">${d}" dbh</text>`
            : `<text x="${x2}" y="${y2 - 4}" font-size="${fz(10)}" fill="${C.muted}" text-anchor="middle">${d}"</text>`);
    }

    // Stocking-percent curves, then the A and B lines
    for (const pct of [50, 70, 80, 90, 110, 120]) {
        const c = curve(pct);
        if (!c.length) continue;
        out.push(`<path d="${path(c)}" fill="none" stroke="${C.muted}" stroke-width="0.8" opacity="0.6"/>`);
        const [lx, ly] = c[c.length - 1];
        out.push(`<text x="${lx + 4}" y="${ly + 4}" font-size="${fz(10)}" fill="${C.muted}">${pct}%</text>`);
    }
    for (const [pct, name, color] of [[GINGRICH_A_PCT, 'A', C.aLine], [GINGRICH_B_PCT, 'B', C.bLine]]) {
        const c = curve(pct);
        if (!c.length) continue;
        out.push(`<path d="${path(c)}" fill="none" stroke="${color}" stroke-width="2.6"/>`);
        const [x0, y0] = c[0];
        out.push(`<text x="${x0 - 4}" y="${y0 + 5}" text-anchor="end" font-size="${fz(15)}" font-weight="700" fill="${color}">${name}</text>`);
        const [lx, ly] = c[c.length - 1];
        out.push(`<text x="${lx + 4}" y="${ly + 4}" font-size="${fz(11)}" font-weight="700" fill="${color}">${pct}%</text>`);
    }

    // Zone labels
    const zone = (text, pct, tpa) => {
        const ba = gingrichBaAt(pct, tpa);
        if (Number.isFinite(ba) && ba < yMax) out.push(`<text x="${X(tpa)}" y="${Y(ba)}" font-size="${fz(12)}" font-weight="700" fill="${C.muted}" text-anchor="middle" letter-spacing="1">${text}</text>`);
    };
    zone('OVERSTOCKED', 115, Math.min(xMax * 0.55, 260));
    zone('FULLY STOCKED', 80, Math.min(xMax * 0.6, 280));
    zone('UNDERSTOCKED', 42, Math.min(xMax * 0.6, 280));

    // Axes
    out.push(`<rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}" fill="none" stroke="${C.text}" stroke-width="1.2"/>`);
    out.push(`<text x="${m.l + pw / 2}" y="${H - 12}" text-anchor="middle" font-size="${fz(13)}" font-weight="700" fill="${C.text}">Trees per acre</text>`);
    out.push(`<text transform="translate(18 ${m.t + ph / 2}) rotate(-90)" text-anchor="middle" font-size="${fz(13)}" font-weight="700" fill="${C.text}">Basal area per acre (sq ft)</text>`);

    // Points
    const arrowId = `tt-res-arrow-${C.residual.replace(/[^a-z0-9]/gi, '')}`;
    out.push(`<defs><marker id="${arrowId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10Z" fill="${C.residual}"/></marker></defs>`);
    for (const p of points) {
        if (!(p.tpa > 0 && p.ba > 0)) continue;
        const px = X(Math.min(p.tpa, xMax)), py = Y(Math.min(p.ba, yMax));
        if (p.residual && p.residual.tpa > 0 && Math.abs(p.residual.ba - p.ba) > 0.5) {
            const rx = X(p.residual.tpa), ry = Y(p.residual.ba);
            const len = Math.hypot(rx - px, ry - py);
            const k = len > 18 ? (len - 9) / len : 1;
            out.push(`<line x1="${px}" y1="${py}" x2="${(px + (rx - px) * k).toFixed(1)}" y2="${(py + (ry - py) * k).toFixed(1)}" stroke="${C.residual}" stroke-width="1.8" stroke-dasharray="5 3"${k < 1 ? ` marker-end="url(#${arrowId})"` : ''}/>`);
            out.push(`<circle cx="${rx}" cy="${ry}" r="6" fill="${C.bg}" stroke="${C.residual}" stroke-width="2.4"/>`);
        }
        out.push(`<circle cx="${px}" cy="${py}" r="7" fill="${C.point}" stroke="${C.bg}" stroke-width="2"/>`);
        const label = p.label;
        const flip = px + 10 + label.length * 14 * fsc * 0.62 > m.l + pw;
        out.push(`<text x="${flip ? px - 10 : px + 10}" y="${py - 8}" text-anchor="${flip ? 'end' : 'start'}" font-size="${fz(14)}" font-weight="800" fill="${C.text}" stroke="${C.bg}" stroke-width="3" paint-order="stroke">${_svgEsc(label)}</text>`);
    }
    out.push('</svg>');
    return out.join('');
}

/**
 * Draws the on-screen chart into `container` (sized to it, larger text on phones,
 * recoloured for dark mode) with a small legend underneath.
 */
function renderGingrichInto(container, areaStats) {
    if (!container) return;
    const points = gingrichPoints(areaStats);
    const dark = document.body.classList.contains('dark-mode');
    const C = dark ? GINGRICH_DARK : GINGRICH_LIGHT;
    const width = container.clientWidth || GINGRICH_W;
    const fontScale = Math.min(2, Math.max(1, (GINGRICH_W / Math.max(width, 1)) * 0.75));
    const hasCut = points.some(p => p.residual && Math.abs(p.residual.ba - p.ba) > 0.5);
    const dot = (style) => `<span style="display:inline-block;width:11px;height:11px;border-radius:50%;vertical-align:middle;margin-right:5px;${style}"></span>`;
    container.innerHTML = `<div class="gingrich-svg">${renderGingrichSvg(points, { colors: C, fontScale })}</div>
        <div class="gingrich-legend">
            <span>${dot(`background:${C.point}`)}Current stand</span>
            ${hasCut ? `<span>${dot(`border:2px solid ${C.residual}`)}After marked cut</span>` : ''}
            <span class="gingrich-legend-muted">A = 100% · B = 60%</span>
        </div>`;
}

/** The chart drawn onto a canvas (white background) for the PNG export. */
async function buildGingrichCanvas(areaStats, scale = 2) {
    const svg = renderGingrichSvg(gingrichPoints(areaStats), { title: 'Gingrich Stocking Guide — Upland Hardwoods' });
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Chart render failed')); img.src = url; });
        const c = document.createElement('canvas');
        c.width = Math.round(GINGRICH_W * scale); c.height = Math.round(GINGRICH_H * scale);
        const g = c.getContext('2d');
        g.scale(scale, scale);
        g.drawImage(img, 0, 0, GINGRICH_W, GINGRICH_H);
        return c;
    } finally { URL.revokeObjectURL(url); }
}

// =============================================================================
// SUMMARY REPORT PNG — landscape one-pager of the forestry report data
// =============================================================================

/**
 * Draw a landscape summary report PNG from a forestry report object.
 * Returns the canvas (1400×900) with everything drawn — no Chart.js needed.
 * @param {Object} report     - Output of calculateForestryReport()
 * @param {Object} plotStats  - Output of calculatePlotStats()
 * @param {string} areaLetter
 * @param {string} projectName
 * @param {string} logRule
 * @param {number} formClass
 * @param {number} baf
 * @returns {HTMLCanvasElement|null}
 */
function buildSummaryReportCanvas(report, plotStats, areaLetter, projectName, logRule, formClass, baf) {
    if (!report?.summary?.numberOfPlots) return null;

    // Logical layout dimensions — all coordinates written in these units
    const LW = 1400, LH = 900;
    // 3x scale = crisp at 100% zoom, roughly 300 DPI on an 11" wide print
    const SCALE = 3;
    const canvas = document.createElement('canvas');
    canvas.width  = LW * SCALE;
    canvas.height = LH * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    const C = {
        bg: '#ffffff', header: '#2d5016', headerTx: '#ffffff',
        section: '#3d6b20', secTx: '#ffffff',
        rowAlt: '#f0f6e8', border: '#b8d4a0',
        dark: '#1e2d0f', mid: '#3d4d2e', muted: '#6c7a55',
    };

    const fmt1 = n => (n != null && !isNaN(n)) ? parseFloat(n).toFixed(1) : '\u2014';
    const fmt0 = n => (n != null && !isNaN(n)) ? Math.round(n).toLocaleString() : '\u2014';
    const fmtP = n => (n != null && !isNaN(n)) ? parseFloat(n).toFixed(1) + '%' : '\u2014';

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, LW, LH);

    // Header bar
    ctx.fillStyle = C.header;
    ctx.fillRect(0, 0, LW, 64);
    ctx.fillStyle = C.headerTx;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('TimberTally \u2014 Forestry Report Summary', 20, 42);
    ctx.font = '15px sans-serif';
    const ruleStr = logRule + (logRule === 'Doyle' ? ' FC' + formClass : '') + '  |  BAF ' + baf;
    const headerRight = 'Project: ' + (projectName || 'Untitled') + '   Area: ' + areaLetter + '   ' + ruleStr + '   ' + new Date().toLocaleDateString();
    ctx.textAlign = 'right';
    ctx.fillText(headerRight, LW - 20, 42);
    ctx.textAlign = 'left';

    const sum = report.summary;

    // Key stat boxes
    const statBoxes = [
        { label: 'Total Vol/Acre (BF)', value: fmt0(sum.totalVolPerAcre) },
        { label: 'Vol/Acre Cut (BF)',   value: fmt0(sum.volumePerAcreCut) },
        { label: 'Vol/Acre Leave (BF)', value: fmt0(sum.volumePerAcreLeave) },
        { label: 'Total TPA',           value: fmt1(sum.totalTreesPerAcre) },
        { label: 'TPA Cut',             value: fmt1(sum.treesPerAcreCut) },
        { label: 'TPA Leave',           value: fmt1(sum.treesPerAcreLeave) },
        { label: 'Total BA/Acre',       value: fmt1(sum.totalBaPerAcre) },
        { label: 'Avg DBH (QMD)',       value: fmt1(sum.avgTractDbh) + '"' },
        { label: 'Num Plots',           value: String(sum.numberOfPlots) },
    ];
    const statH = 62, bW = Math.floor(LW / statBoxes.length);
    statBoxes.forEach(function(b, i) {
        const x = i * bW;
        ctx.fillStyle = i % 2 === 0 ? '#eaf4de' : '#f5faf0';
        ctx.fillRect(x, 65, bW, statH);
        ctx.strokeStyle = C.border; ctx.lineWidth = 0.75;
        ctx.strokeRect(x, 65, bW, statH);
        ctx.fillStyle = C.dark;
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.value, x + bW / 2, 93);
        ctx.font = '12px sans-serif';
        ctx.fillStyle = C.muted;
        ctx.fillText(b.label, x + bW / 2, 114);
        ctx.textAlign = 'left';
    });

    function sectionHeader(label, x, y, w) {
        ctx.fillStyle = C.section;
        ctx.fillRect(x, y, w, 24);
        ctx.fillStyle = C.secTx;
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(label, x + 8, y + 16);
    }

    function drawTable(headers, rows, x, y, colWidths, rowH) {
        rowH = rowH || 21;
        const tableW = colWidths.reduce(function(a,b){return a+b;}, 0);
        ctx.fillStyle = '#d4eabf';
        ctx.fillRect(x, y, tableW, rowH);
        ctx.lineWidth = 0.5;
        let cx = x;
        headers.forEach(function(h, i) {
            ctx.strokeStyle = C.border;
            ctx.strokeRect(cx, y, colWidths[i], rowH);
            ctx.fillStyle = C.dark;
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = i === 0 ? 'left' : 'right';
            ctx.fillText(h, i === 0 ? cx + 5 : cx + colWidths[i] - 5, y + 14);
            cx += colWidths[i];
        });
        ctx.textAlign = 'left';
        rows.forEach(function(row, ri) {
            const ry = y + rowH * (ri + 1);
            const isTotals = ri === rows.length - 1;
            ctx.fillStyle = isTotals ? '#daefc8' : (ri % 2 === 0 ? C.bg : C.rowAlt);
            ctx.fillRect(x, ry, tableW, rowH);
            cx = x;
            row.forEach(function(cell, ci) {
                ctx.strokeStyle = C.border;
                ctx.strokeRect(cx, ry, colWidths[ci], rowH);
                ctx.fillStyle = C.dark;
                ctx.font = (isTotals ? 'bold ' : '') + '11px sans-serif';
                ctx.textAlign = ci === 0 ? 'left' : 'right';
                ctx.fillText(String(cell), ci === 0 ? cx + 5 : cx + colWidths[ci] - 5, ry + 14);
                cx += colWidths[ci];
            });
            ctx.textAlign = 'left';
        });
        return y + rowH * (rows.length + 1) + 6;
    }

    const CONTENT_TOP = 138, ROW_H = 21, SEC_H = 24, GAP = 10;
    const leftX = 12, leftW = 628, rightX = 648, rightW = LW - 648 - 12;

    // Stand Distribution
    sectionHeader('STAND DISTRIBUTION', leftX, CONTENT_TOP, leftW);
    const CLS_ORDER = ['Sapling','Poletimber','Small Sawtimber','Medium Sawtimber','Large Sawtimber','Other','Invalid','TOTALS'];
    const CLS_SHORT = {
        'Sapling':'Saplings (2-5.9")','Poletimber':'Poletimber (6-11.9")',
        'Small Sawtimber':'S Saw (12-17.9")','Medium Sawtimber':'M Saw (18-23.9")',
        'Large Sawtimber':'L Saw (24+")','Other':'Other','Invalid':'Invalid','TOTALS':'TOTALS'
    };
    const distRows = CLS_ORDER.map(function(cls) {
        const d = report.standDistribution[cls] || {};
        return [CLS_SHORT[cls]||cls, fmtP(d.percentTotalStems),
                fmt1(d.baSqFtPerAcreTotal), fmt1(d.baSqFtPerAcreCut), fmt1(d.baSqFtPerAcreLeave),
                fmtP(d.percentBa), fmt0(d.volumeBfPerAcre), fmtP(d.percentVolume)];
    });
    const afterDist = drawTable(
        ['Size Class','Stems%','BA/Ac','BA Cut','BA Lv','BA%','Vol/Ac','Vol%'],
        distRows, leftX, CONTENT_TOP + SEC_H, [162,58,58,58,58,52,72,52], ROW_H
    );

    // Species Composition
    sectionHeader('SPECIES COMPOSITION (% of TPA)', leftX, afterDist + GAP, leftW);
    const specs1 = Object.keys(report.speciesSummary1).filter(function(s){return s!=='TOTALS';}).sort().concat(['TOTALS']);
    const spec1Rows = specs1.map(function(sp) {
        const d = report.speciesSummary1[sp] || {};
        return [sp, fmtP(d.percentTotalStems), fmtP(d.sawtimberPercent), fmtP(d.poletimberPercent), fmtP(d.saplingPercent)];
    });
    drawTable(['Species','Stems%','Saw%','Pole%','Sap%'], spec1Rows, leftX, afterDist + GAP + SEC_H, [162,116,116,117,117], ROW_H);

    // Volume by Species
    sectionHeader('VOLUME / ACRE BY SPECIES (Board Feet)', rightX, CONTENT_TOP, rightW);
    const specs2 = Object.keys(report.speciesSummary2).filter(function(s){return s!=='TOTALS';}).sort().concat(['TOTALS']);
    const spec2Rows = specs2.map(function(sp) {
        const d = report.speciesSummary2[sp] || {};
        return [sp, fmt0(d.volSmallPerAcre), fmt0(d.volMediumPerAcre), fmt0(d.volLargePerAcre),
                fmt0(d.totalSpeciesVolPerAcre), fmtP(d.percentTotalVolume)];
    });
    const afterVol = drawTable(
        ['Species','S Saw (12-17.9")','M Saw (18-23.9")','L Saw (24+")','Total Vol/Ac','Vol%'],
        spec2Rows, rightX, CONTENT_TOP + SEC_H, [148,112,112,112,126,80], ROW_H
    );

    // Plot Stats
    if (plotStats && plotStats.numValidPlots > 0) {
        sectionHeader('PLOT VOLUME STATISTICS', rightX, afterVol + GAP, rightW);
        const psRows = [['Num Plots', String(plotStats.numValidPlots)], ['Mean BF/Acre', fmt1(plotStats.meanV)]];
        if (plotStats.numValidPlots > 1) {
            psRows.push(['Std Dev', fmt1(plotStats.stdDevV)]);
            psRows.push(['CV (%)', fmt1(plotStats.cvV)]);
        }
        drawTable(['Statistic','Value'], psRows, rightX, afterVol + GAP + SEC_H, [240,210], ROW_H);
    }

    // Footer
    ctx.fillStyle = C.header;
    ctx.fillRect(0, LH - 24, LW, 24);
    ctx.fillStyle = C.headerTx;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Generated by TimberTally  \u2022  Gingrich (1967) stocking reference  \u2022  All volumes in Board Feet per Acre', LW / 2, LH - 8);
    ctx.textAlign = 'left';

    return canvas;
}

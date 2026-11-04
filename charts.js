// =============================================================================
// charts.js — stand charts, Gingrich stocking chart and export sheets for TimberTally
// Depends on: forestry-data.js (BA_CONST)
//             forestry-calc.js (calculateForestryReport, calculateStandStocking, gingrichBaAt)
// All functions are called from script.js; chart instances are managed there.
// =============================================================================

// --- Stand chart colors (the same in the app and in the saved Graphs sheet) ---
const CHART_COLORS = {
    leave:  'rgba(75,192,192,0.6)',  leaveBorder:  'rgba(75,192,192,1)',
    cut:    'rgba(255,99,132,0.6)',  cutBorder:    'rgba(255,99,132,1)',
    vol:    'rgba(54,162,235,0.6)',  volBorder:    'rgba(54,162,235,1)',
    sawS:   'rgba(255,206,86,0.6)',  sawSBorder:   'rgba(255,206,86,1)',
    sawM:   'rgba(255,159,64,0.6)',  sawMBorder:   'rgba(255,159,64,1)',
    sawL:   'rgba(153,102,255,0.6)', sawLBorder:   'rgba(153,102,255,1)',
};

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

// Helper: resolve short label → dist entry
function distByLabel(dist, shortLabel) {
    const key = Object.keys(DBH_CLASS_MAP).find(k => DBH_CLASS_MAP[k] === shortLabel);
    return key ? (dist[key] || {}) : {};
}

// =============================================================================
// THE FOUR STAND CHARTS — one definition, used on the Tally tab and in the
// saved Graphs sheet, so both look the same.
// =============================================================================
const STAND_CHART_KEYS = ['ba', 'tpa', 'volSpecies', 'volSawtimber'];

/**
 * Chart.js options. `print` = fixed size for the Graphs sheet (no animation,
 * 1:1 pixels); otherwise responsive for the Tally tab. `dark` recolours text
 * and grid lines for dark mode (bars keep their colours).
 */
function standChartOptions(title, xLabel, yLabel, { stacked = false, horizontal = false, legend = true, print = false, dark = false, scale = 1, aspect = 1.5, noTitle = false } = {}) {
    const text = dark ? '#d8ecc8' : '#000000';
    const grid = dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
    const f = n => Math.round(n * scale);
    const axis = (label) => ({
        stacked, beginAtZero: true,
        title: { display: true, text: label, font: { size: f(13), weight: 'bold' }, color: text },
        ticks: { color: text, font: { size: f(11) } },
        grid: { color: grid },
    });
    const opts = {
        animation: false,
        responsive: !print, maintainAspectRatio: !print,
        aspectRatio: aspect,
        plugins: {
            customCanvasBackgroundColor: { color: dark ? '#1a2712' : 'white' },
            title: { display: !noTitle, text: title, font: { size: f(16), weight: 'bold' }, color: text },
            legend: { display: legend, labels: { font: { size: f(11) }, color: text } },
            tooltip: { mode: 'index', enabled: !print },
        },
        scales: { x: axis(xLabel), y: axis(yLabel) },
    };
    if (horizontal) opts.indexAxis = 'y';
    if (print) opts.devicePixelRatio = 1;
    return opts;
}

/** Chart.js config for one of the four stand charts, or null when it has nothing to show. */
function standChartConfig(key, report, opt = {}) {
    const dist = report?.standDistribution;
    const ss2 = report?.speciesSummary2;
    const ds = (label, data, c) => ({ label, data, backgroundColor: CHART_COLORS[c], borderColor: CHART_COLORS[c + 'Border'], borderWidth: 1 });
    if (key === 'ba' || key === 'tpa') {
        if (!dist) return null;
        const [fLeave, fCut] = key === 'ba' ? ['baSqFtPerAcreLeave', 'baSqFtPerAcreCut'] : ['tpaPerAcreLeave', 'tpaPerAcreCut'];
        const leave = DBH_CLASS_LABELS.map(l => distByLabel(dist, l)[fLeave] || 0);
        const cut   = DBH_CLASS_LABELS.map(l => distByLabel(dist, l)[fCut]   || 0);
        return {
            type: 'bar',
            data: { labels: DBH_CLASS_LABELS, datasets: key === 'ba'
                ? [ds('Leave BA/Acre', leave, 'leave'), ds('Cut BA/Acre', cut, 'cut')]
                : [ds('Leave TPA', leave, 'leave'), ds('Cut TPA', cut, 'cut')] },
            options: key === 'ba'
                ? standChartOptions('Basal Area Distribution (sq ft/Acre)', 'DBH Class', 'BA / Acre (sq ft)', { ...opt, stacked: true })
                : standChartOptions('Trees Per Acre Distribution', 'DBH Class', 'Trees / Acre', { ...opt, stacked: true }),
        };
    }
    if (!ss2) return null;
    if (key === 'volSpecies') {
        const sorted = Object.entries(ss2)
            .filter(([s, d]) => s !== 'TOTALS' && d?.totalSpeciesVolPerAcre > 0)
            .sort(([, a], [, b]) => b.totalSpeciesVolPerAcre - a.totalSpeciesVolPerAcre);
        if (!sorted.length) return null;
        return {
            type: 'bar',
            data: { labels: sorted.map(([s]) => s), datasets: [ds('Total Vol/Acre', sorted.map(([, d]) => d.totalSpeciesVolPerAcre), 'vol')] },
            options: standChartOptions('Volume by Species (BF/Acre)', 'Board Feet / Acre', 'Species', { ...opt, horizontal: true, legend: false }),
        };
    }
    if (key === 'volSawtimber') {
        const sorted = Object.entries(ss2)
            .filter(([s, d]) => s !== 'TOTALS' && d && (d.volSmallPerAcre > 0 || d.volMediumPerAcre > 0 || d.volLargePerAcre > 0))
            .map(([s, d]) => ({ species: s, small: d.volSmallPerAcre || 0, medium: d.volMediumPerAcre || 0, large: d.volLargePerAcre || 0 }))
            .sort((a, b) => (b.small + b.medium + b.large) - (a.small + a.medium + a.large));
        if (!sorted.length) return null;
        return {
            type: 'bar',
            data: { labels: sorted.map(i => i.species), datasets: [
                ds('S Saw (12-17.9")', sorted.map(i => i.small), 'sawS'),
                ds('M Saw (18-23.9")', sorted.map(i => i.medium), 'sawM'),
                ds('L Saw (24"+)', sorted.map(i => i.large), 'sawL'),
            ]},
            options: standChartOptions('Sawtimber Volume by Species (BF/Acre)', 'Species', 'Board Feet / Acre', { ...opt, stacked: true }),
        };
    }
    return null;
}

const STAND_CHART_EMPTY = {
    ba: 'Basal Area Distribution', tpa: 'Trees Per Acre Distribution',
    volSpecies: 'Volume by Species — no merchantable volume', volSawtimber: 'Sawtimber Volume by Species — no sawtimber volume',
};

/**
 * Renders the four stand charts into the Tally tab container.
 * @returns {Chart[]} instances for later .destroy()
 */
function renderTallyCharts(subset, baf, logRule, formClass, container) {
    container.innerHTML = '';
    const instances = [];
    if (!subset?.length) {
        container.innerHTML = '<p class="placeholder-msg">Add data to see charts.</p>';
        return instances;
    }
    if (typeof Chart === 'undefined') {
        container.innerHTML = '<p class="placeholder-msg">Charts could not load.</p>';
        return instances;
    }
    const report = calculateForestryReport(subset, baf, logRule, formClass);
    if (!report?.summary?.numberOfPlots) {
        container.innerHTML = '<p class="placeholder-msg">Need at least 1 plot to generate charts.</p>';
        return instances;
    }
    const dark = document.body.classList.contains('dark-mode');
    const grid = document.createElement('div');
    grid.className = 'stand-charts-grid';
    container.appendChild(grid);
    for (const key of STAND_CHART_KEYS) {
        const cell = document.createElement('div');
        cell.className = 'stand-chart-cell';
        grid.appendChild(cell);
        const cfg = standChartConfig(key, report, { dark, aspect: (container.clientWidth || 600) < 560 ? 1.05 : 1.5 });
        if (!cfg) { cell.innerHTML = `<p class="placeholder-msg">${STAND_CHART_EMPTY[key]}</p>`; continue; }
        const canvas = document.createElement('canvas');
        cell.appendChild(canvas);
        try { instances.push(new Chart(canvas, cfg)); } catch (e) { console.error('Chart error', key, e); }
    }
    return instances;
}

// =============================================================================
// GRAPHS SHEET — the four stand charts for one Area on a single letter-size
// landscape page (11 x 8.5 in at 200 dpi = 2200 x 1700 px) for the ZIP export.
// =============================================================================
const SHEET_W = 2200, SHEET_H = 1700;

/** Section titles on the Graphs page (the chart's own title is left off there). */
const STAND_CHART_SECTION = {
    ba: 'Basal Area by Size Class (sq ft/acre)',
    tpa: 'Trees per Acre by Size Class',
    volSpecies: 'Volume by Species (BF/acre)',
    volSawtimber: 'Sawtimber Volume by Species (BF/acre)',
};

/**
 * The Graphs page: the four stand charts for one Area on one letter-size
 * landscape page (11 x 8.5 in at 200 dpi = 2200 x 1700 px), styled like the
 * Summary Report (same header, section bars and footer).
 */
function buildGraphsSheetCanvas(report, areaLetter, projectName, logRule, formClass, baf) {
    const LW = 1400, LH = Math.round(1400 * 8.5 / 11), S = SHEET_W / LW;
    const sheet = document.createElement('canvas');
    sheet.width = SHEET_W; sheet.height = SHEET_H;
    const g = sheet.getContext('2d');
    g.scale(S, SHEET_H / LH);
    const C = { header: '#2d5016', headerTx: '#ffffff', section: '#3d6b20', border: '#c9dcb6', muted: '#5f6d4c' };
    const FONT = 'Arial, Helvetica, sans-serif';
    const font = (px, bold) => `${bold ? 'bold ' : ''}${px}px ${FONT}`;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, LW, LH);

    // Header (same as the Summary Report)
    const M = 22, HEAD = 74, plots = report?.summary?.numberOfPlots || 0;
    g.fillStyle = C.header; g.fillRect(0, 0, LW, HEAD);
    g.fillStyle = C.headerTx; g.textBaseline = 'middle'; g.textAlign = 'left';
    g.font = font(30, true); g.fillText(`${projectName || 'Untitled'} — Area ${areaLetter}`, M, 28);
    g.font = font(16); g.fillText('Stand Graphs', M, 56);
    const rule = logRule === 'Doyle' ? `Doyle FC${formClass}` : logRule === 'International' ? 'International ¼"' : logRule;
    g.textAlign = 'right';
    g.font = font(17, true); g.fillText(`BAF ${baf}  ·  ${rule}`, LW - M, 28);
    g.font = font(16); g.fillText(`${plots} plot${plots === 1 ? '' : 's'}  ·  ${new Date().toLocaleDateString()}`, LW - M, 56);

    // 2 x 2 grid of charts, each under a green section bar
    const FOOT = 30, SEC_H = 32, gapX = 22, gapY = 18;
    const top = HEAD + 16, bottom = LH - FOOT - 12;
    const cw = (LW - 2 * M - gapX) / 2;
    const ch = (bottom - top - gapY) / 2;
    STAND_CHART_KEYS.forEach((key, i) => {
        const x = M + (i % 2) * (cw + gapX), y = top + Math.floor(i / 2) * (ch + gapY);
        g.fillStyle = C.section; g.fillRect(x, y, cw, SEC_H);
        g.fillStyle = C.headerTx; g.font = font(16, true); g.textAlign = 'left'; g.textBaseline = 'middle';
        g.fillText(STAND_CHART_SECTION[key].toUpperCase(), x + 10, y + SEC_H / 2 + 1);
        const bx = x, by = y + SEC_H, bw = cw, bh = ch - SEC_H;
        g.strokeStyle = C.border; g.lineWidth = 1; g.strokeRect(bx, by, bw, bh);
        const cfg = typeof Chart !== 'undefined' ? standChartConfig(key, report, { print: true, scale: 1.45, noTitle: true }) : null;
        if (!cfg) {
            g.fillStyle = C.muted; g.font = font(18); g.textAlign = 'center';
            g.fillText(STAND_CHART_EMPTY[key], bx + bw / 2, by + bh / 2);
            return;
        }
        // Drawn at full print resolution, then placed in its box.
        const pad = 10;
        const c = document.createElement('canvas');
        c.width = Math.round((bw - 2 * pad) * S); c.height = Math.round((bh - 2 * pad) * S);
        let inst = null;
        try {
            inst = new Chart(c, cfg);
            g.drawImage(c, bx + pad, by + pad, bw - 2 * pad, bh - 2 * pad);
        } catch (e) { console.error('Graphs sheet chart error', key, e); }
        try { inst?.destroy(); } catch (e) {}
    });

    // Footer (same as the Summary Report)
    g.fillStyle = C.header; g.fillRect(0, LH - FOOT, LW, FOOT);
    g.fillStyle = C.headerTx; g.font = font(13); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('Generated by TimberTally  •  Per-acre values  •  Volumes in board feet  •  Leave = trees not marked to cut', LW / 2, LH - FOOT / 2);
    return sheet;
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
 * Draw the Summary Report: one letter-size landscape page (11 × 8.5 in), 2200 × 1700 px
 * (200 dpi, the same size as the Graphs page). No Chart.js needed.
 *
 * Layout: header, a band of key numbers, then two columns. Left: Stand
 * Distribution, Gingrich Stocking and Sampling Statistics. Right: the Species
 * table (composition and volume together). Row height and text size grow or shrink with the number of
 * species; when a column has room left, this Area's Gingrich stocking chart fills it.
 *
 * @param {Object} report     - Output of calculateForestryReport()
 * @param {Object} plotStats  - Output of calculatePlotStats()
 * @param {string} areaLetter
 * @param {string} projectName
 * @param {string} logRule
 * @param {number} formClass
 * @param {number} baf
 * @param {Object} [stock]    - This Area's entry from calculateStandStocking()
 * @returns {Promise<HTMLCanvasElement|null>}
 */
async function buildSummaryReportCanvas(report, plotStats, areaLetter, projectName, logRule, formClass, baf, stock) {
    if (!report?.summary?.numberOfPlots) return null;

    const LW = 1400, LH = Math.round(1400 * 8.5 / 11);   // 1400 x 1082 layout units = 11 x 8.5 in
    const canvas = document.createElement('canvas');
    canvas.width = 2200; canvas.height = 1700;
    const ctx = canvas.getContext('2d');
    ctx.scale(2200 / LW, 1700 / LH);

    const C = {
        bg: '#ffffff', header: '#2d5016', headerTx: '#ffffff', section: '#3d6b20', secTx: '#ffffff',
        head: '#d4eabf', rowAlt: '#f3f8ec', total: '#e2f0d3', border: '#c9dcb6',
        dark: '#1e2d0f', muted: '#5f6d4c',
        over: '#1e5aa0', full: '#2b6424', under: '#b4461f',
    };
    const FONT = 'Arial, Helvetica, sans-serif';
    const font = (px, bold) => `${bold ? 'bold ' : ''}${px}px ${FONT}`;
    const num = v => v != null && !isNaN(v);
    const f0 = v => num(v) ? Math.round(v).toLocaleString() : '—';
    const f1 = v => num(v) ? Number(v).toFixed(1) : '—';
    const fP = v => num(v) ? Number(v).toFixed(1) + '%' : '—';
    const sum = report.summary;

    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, LW, LH);

    // ── Header ────────────────────────────────────────────────────────────────
    const M = 22, HEAD = 74;
    ctx.fillStyle = C.header; ctx.fillRect(0, 0, LW, HEAD);
    ctx.fillStyle = C.headerTx; ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = font(30, true);
    ctx.fillText(`${projectName || 'Untitled'} — Area ${areaLetter}`, M, 28);
    ctx.font = font(16);
    ctx.fillText('Forestry Report Summary', M, 56);
    ctx.textAlign = 'right';
    const rule = logRule === 'Doyle' ? `Doyle FC${formClass}` : logRule === 'International' ? 'International ¼"' : logRule;
    ctx.font = font(17, true);
    ctx.fillText(`BAF ${baf}  ·  ${rule}`, LW - M, 28);
    ctx.font = font(16);
    ctx.fillText(`${sum.numberOfPlots} plot${sum.numberOfPlots === 1 ? '' : 's'}  ·  ${new Date().toLocaleDateString()}`, LW - M, 56);

    // ── Key numbers: Total / Cut / Leave for volume, trees and basal area ────
    const bandY = HEAD + 12, bandH = 96;
    const groups = [
        { title: 'Volume (BF/acre)', vals: [sum.totalVolPerAcre, sum.volumePerAcreCut, sum.volumePerAcreLeave], fmt: f0 },
        { title: 'Trees per acre',   vals: [sum.totalTreesPerAcre, sum.treesPerAcreCut, sum.treesPerAcreLeave], fmt: f1 },
        { title: 'Basal area (sq ft/acre)', vals: [sum.totalBaPerAcre, sum.baPerAcreCut, sum.baPerAcreLeave], fmt: f1 },
    ];
    const qmdW = 170;
    const gW = (LW - 2 * M - qmdW - 3 * 12) / 3;
    groups.forEach((g, gi) => {
        const x = M + gi * (gW + 12);
        ctx.fillStyle = '#f3f8ec'; ctx.fillRect(x, bandY, gW, bandH);
        ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.strokeRect(x, bandY, gW, bandH);
        ctx.fillStyle = C.section; ctx.font = font(14, true); ctx.textAlign = 'left';
        ctx.fillText(g.title.toUpperCase(), x + 12, bandY + 18);
        ['Total', 'Cut', 'Leave'].forEach((lab, i) => {
            const cx = x + gW * (i + 0.5) / 3;
            ctx.textAlign = 'center';
            ctx.fillStyle = i === 1 ? '#a8323e' : C.dark;
            ctx.font = font(i === 0 ? 30 : 26, true);
            ctx.fillText(g.fmt(g.vals[i]), cx, bandY + 54);
            ctx.fillStyle = C.muted; ctx.font = font(14);
            ctx.fillText(lab, cx, bandY + 82);
        });
    });
    {
        const x = LW - M - qmdW;
        ctx.fillStyle = '#f3f8ec'; ctx.fillRect(x, bandY, qmdW, bandH);
        ctx.strokeStyle = C.border; ctx.strokeRect(x, bandY, qmdW, bandH);
        ctx.fillStyle = C.section; ctx.font = font(14, true); ctx.textAlign = 'left';
        ctx.fillText('AVG DBH (QMD)', x + 12, bandY + 18);
        ctx.textAlign = 'center'; ctx.fillStyle = C.dark; ctx.font = font(30, true);
        ctx.fillText(num(sum.avgTractDbh) ? `${f1(sum.avgTractDbh)}"` : '—', x + qmdW / 2, bandY + 54);
        ctx.fillStyle = C.muted; ctx.font = font(14);
        ctx.fillText('all trees', x + qmdW / 2, bandY + 82);
    }

    // ── Sections ──────────────────────────────────────────────────────────────
    const CLS = [
        ['Sapling', 'Sapling 2–5.9"'], ['Poletimber', 'Pole 6–11.9"'],
        ['Small Sawtimber', 'Sm. saw 12–17.9"'], ['Medium Sawtimber', 'Med. saw 18–23.9"'],
        ['Large Sawtimber', 'Lg. saw 24"+'], ['Other', 'Other'], ['Invalid', 'Invalid'],
    ];
    const sd = report.standDistribution || {};
    const distRows = CLS.filter(([k]) => !['Other', 'Invalid'].includes(k) || (sd[k]?.percentTotalStems > 0))
        .map(([k, label]) => { const d = sd[k] || {}; return [label, fP(d.percentTotalStems), f1(d.baSqFtPerAcreTotal), f1(d.baSqFtPerAcreCut), f1(d.baSqFtPerAcreLeave), f0(d.volumeBfPerAcre), fP(d.percentVolume)]; });
    { const d = sd.TOTALS || {}; distRows.push(['Total', fP(d.percentTotalStems), f1(d.baSqFtPerAcreTotal), f1(d.baSqFtPerAcreCut), f1(d.baSqFtPerAcreLeave), f0(d.volumeBfPerAcre), fP(d.percentVolume)]); }

    const s1 = report.speciesSummary1 || {}, s2 = report.speciesSummary2 || {};
    const species = Object.keys(s1).filter(s => s !== 'TOTALS')
        .sort((a, b) => (s2[b]?.totalSpeciesVolPerAcre || 0) - (s2[a]?.totalSpeciesVolPerAcre || 0) || (s1[b]?.percentTotalStems || 0) - (s1[a]?.percentTotalStems || 0) || a.localeCompare(b));
    const specRows = species.map(sp => { const a = s1[sp] || {}, b = s2[sp] || {}; return [sp, fP(a.percentTotalStems), f0(b.volSmallPerAcre), f0(b.volMediumPerAcre), f0(b.volLargePerAcre), f0(b.totalSpeciesVolPerAcre), fP(b.percentTotalVolume)]; });
    { const a = s1.TOTALS || {}, b = s2.TOTALS || {}; specRows.push(['Total', fP(a.percentTotalStems), f0(b.volSmallPerAcre), f0(b.volMediumPerAcre), f0(b.volLargePerAcre), f0(b.totalSpeciesVolPerAcre), fP(b.percentTotalVolume)]); }

    const sections = {
        dist: { title: 'Stand Distribution by Size Class', head: ['Size class', 'Stems', 'BA', 'BA cut', 'BA leave', 'Vol/ac', 'Vol'], w: [2.1, 1, 0.9, 0.95, 1.05, 1.15, 1], rows: distRows, total: true },
        spec: { title: 'Species — Composition and Volume per Acre (BF)', head: ['Species', 'Stems', 'Small saw', 'Med saw', 'Large saw', 'Total vol/ac', 'Vol'], w: [2.2, 0.95, 1.1, 1.1, 1.1, 1.3, 0.95], rows: specRows, total: true },
    };
    if (stock && stock.totalTpa > 0) {
        const lvl = (pct, level) => ({ text: `${Math.round(pct)}% · ${level}`, color: level === 'Overstocked' ? C.over : level === 'Fully stocked' ? C.full : C.under });
        const cut = stock.cutTpa > 0;
        sections.stock = {
            title: 'Gingrich Stocking (upland hardwoods)',
            head: cut ? ['', 'As cruised', 'After marked cut'] : ['', 'As cruised'],
            w: cut ? [1.3, 1.35, 1.35] : [1.3, 1.6],
            rows: [
                ['Trees/acre', f0(stock.totalTpa), ...(cut ? [f0(stock.leaveTpa)] : [])],
                ['Basal area/acre', f1(stock.totalBa), ...(cut ? [f1(stock.leaveBa)] : [])],
                ['QMD', `${f1(stock.totalQmd)}"`, ...(cut ? [`${f1(stock.leaveQmd)}"`] : [])],
                ['Stocking', lvl(stock.totalPct, stock.totalLevel), ...(cut ? [lvl(stock.leavePct, stock.leaveLevel)] : [])],
            ],
        };
    }
    if (plotStats && plotStats.numValidPlots > 0) {
        const n = plotStats.numValidPlots, mean = plotStats.meanV;
        const rows = [['Plots', String(n)], ['Mean volume', `${f0(mean)} BF/ac`]];
        if (n > 1 && mean > 0) {
            const se = plotStats.stdDevV / Math.sqrt(n);
            const need = e => Math.ceil(Math.pow(2 * plotStats.cvV / e, 2));
            const mark = e => (n >= need(e) ? '✓ met' : `${need(e)} plots`);
            rows.push(['Std deviation', `${f0(plotStats.stdDevV)} BF/ac`], ['CV', fP(plotStats.cvV)],
                ['Sampling error (95%)', `±${f1(2 * se / mean * 100)}%  (±${f0(2 * se)} BF/ac)`],
                ['Plots needed ±10% / ±20%', `${mark(10)}  /  ${mark(20)}`]);
        } else rows.push(['Sampling error', 'needs 2+ plots']);
        sections.stats = { title: 'Sampling Statistics (volume per plot)', head: ['Statistic', 'Value'], w: [1.5, 1.6], rows, noHead: true };
    }

    // Two columns; the narrow sections go under whichever column is shorter.
    const top = bandY + bandH + 16, FOOT = 30, bottom = LH - FOOT - 12;
    const gapX = 22, leftW = 640, rightW = LW - 2 * M - gapX - leftW;
    const cols = [{ x: M, w: leftW, list: ['dist'] }, { x: M + leftW + gapX, w: rightW, list: ['spec'] }];
    const lines = k => sections[k].rows.length + (sections[k].noHead ? 0 : 1);
    const count = col => col.list.reduce((t, k) => t + lines(k) + 1.6, 0);   // a section title ~1.6 rows
    // Stocking and Sampling Statistics stack under Stand Distribution; the species table has the
    // right column to itself, and the stocking chart fills whatever room is left under it.
    for (const k of ['stock', 'stats']) if (sections[k]) cols[0].list.push(k);
    void count;

    const SEC_H = 32, GAP = 16;
    const fit = col => {
        const fixed = col.list.length * SEC_H + (col.list.length - 1) * GAP;
        const r = col.list.reduce((t, k) => t + lines(k), 0);
        return (bottom - top - fixed) / r;
    };
    // Each column fills the page height; text size follows the tighter column so both sides match.
    cols.forEach(col => { col.rowH = Math.max(14, Math.min(50, Math.floor(fit(col)))); });
    let bodyPx = Math.max(10, Math.min(21, Math.round(Math.min(cols[0].rowH, cols[1].rowH) * 0.5)));
    let rowH = 21;
    // One text size for the whole page: the largest at which every table's cells fit their columns.
    const colWidthsOf = (sec, w) => { const tw = sec.w.reduce((a, b) => a + b, 0); return sec.w.map(v => (v / tw) * w); };
    const sectionFits = (sec, w, p) => {
        const cw = colWidthsOf(sec, w);
        ctx.font = font(p, true);
        return [sec.noHead ? null : sec.head, ...sec.rows].filter(Boolean)
            .every(r => r.every((v, i) => ctx.measureText(typeof v === 'object' && v ? v.text : String(v)).width <= cw[i] - 16));
    };
    for (const col of cols) for (const k of col.list) while (bodyPx > 9 && !sectionFits(sections[k], col.w, bodyPx)) bodyPx--;
    // Rows stay in proportion to the text.
    cols.forEach(col => { col.rowH = Math.min(col.rowH, Math.round(bodyPx * 2.75)); });

    function drawSection(sec, x, y, w) {
        ctx.fillStyle = C.section; ctx.fillRect(x, y, w, SEC_H);
        ctx.fillStyle = C.secTx; ctx.font = font(16, true); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(sec.title.toUpperCase(), x + 10, y + SEC_H / 2 + 1);
        y += SEC_H;
        const tw = sec.w.reduce((a, b) => a + b, 0);
        const cw = sec.w.map(v => (v / tw) * w);
        let px = bodyPx;
        while (px > 9 && !sectionFits(sec, w, px)) px--;   // only shrinks for a clipped long list
        const cell = (text, i, cx, cy, bold, color) => {
            ctx.fillStyle = color || C.dark; ctx.font = font(px, bold);
            ctx.textAlign = i === 0 ? 'left' : 'right';
            ctx.fillText(text, i === 0 ? cx + 8 : cx + cw[i] - 8, cy + rowH / 2 + 1);
        };
        if (!sec.noHead) {
            ctx.fillStyle = C.head; ctx.fillRect(x, y, w, rowH);
            let cx = x;
            sec.head.forEach((h, i) => { cell(h, i, cx, y, true, C.dark); cx += cw[i]; });
            y += rowH;
        }
        sec.rows.forEach((row, ri) => {
            const isTotal = sec.total && ri === sec.rows.length - 1;
            ctx.fillStyle = isTotal ? C.total : ri % 2 ? C.rowAlt : C.bg;
            ctx.fillRect(x, y, w, rowH);
            let cx = x;
            row.forEach((v, i) => {
                const o = typeof v === 'object' && v ? v : { text: String(v) };
                cell(o.text, i, cx, y, isTotal || (sec.noHead && i === 0) || !!o.color, o.color);
                cx += cw[i];
            });
            if (isTotal) { ctx.strokeStyle = C.section; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke(); }
            y += rowH;
        });
        ctx.strokeStyle = C.border; ctx.lineWidth = 1;
        ctx.strokeRect(x, y - rowH * (sec.rows.length + (sec.noHead ? 0 : 1)), w, rowH * (sec.rows.length + (sec.noHead ? 0 : 1)));
        return y;
    }

    // Save room: if a very long species list still overflows, clip it with a note.
    for (const col of cols) {
        let y = top;
        rowH = col.rowH;
        col.list.forEach((k, i) => {
            const sec = sections[k];
            const avail = Math.floor((bottom - y - SEC_H) / rowH) - (sec.noHead ? 0 : 1);
            if (sec.rows.length > avail && avail > 2) {
                const hidden = sec.rows.length - avail + 1;
                sec.rows = [...sec.rows.slice(0, avail - 2), [`+ ${hidden} more (see CSV)`, '', '', '', '', '', ''].slice(0, sec.w.length), sec.rows[sec.rows.length - 1]];
            }
            y = drawSection(sec, col.x, y, col.w) + (i < col.list.length - 1 ? GAP : 0);
        });
        col.end = y;
    }

    // Room left under a column: this Area's stocking chart (the same drawing as the Tally tab).
    if (stock && stock.totalTpa > 0 && typeof renderGingrichSvg === 'function') {
        const col = cols.reduce((a, b) => (bottom - a.end >= bottom - b.end ? a : b));
        const y0 = col.end + GAP, room = bottom - y0;
        if (room >= 300) {
            ctx.fillStyle = C.section; ctx.fillRect(col.x, y0, col.w, SEC_H);
            ctx.fillStyle = C.secTx; ctx.font = font(16, true); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(`STOCKING CHART \u2014 AREA ${areaLetter}`, col.x + 10, y0 + SEC_H / 2 + 1);
            const h = room - SEC_H - 6, w = Math.min(col.w, h * GINGRICH_W / GINGRICH_H);
            const ch = w * GINGRICH_H / GINGRICH_W;
            try {
                const svg = renderGingrichSvg(gingrichPoints([stock]), { fontScale: 1.25 });
                const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
                try {
                    const img = new Image();
                    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
                    ctx.drawImage(img, col.x + (col.w - w) / 2, y0 + SEC_H + 6, w, ch);
                } finally { URL.revokeObjectURL(url); }
                ctx.strokeStyle = C.border; ctx.lineWidth = 1;
                ctx.strokeRect(col.x + (col.w - w) / 2, y0 + SEC_H + 6, w, ch);
            } catch (e) { console.error('Summary stocking chart error:', e); }
        }
    }

    // ── Footer ────────────────────────────────────────────────────────────────
    ctx.fillStyle = C.header; ctx.fillRect(0, LH - FOOT, LW, FOOT);
    ctx.fillStyle = C.headerTx; ctx.font = font(13); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Generated by TimberTally  •  Per-acre values  •  Volumes in board feet  •  Leave = trees not marked to cut  •  Stocking: Gingrich (1967)', LW / 2, LH - FOOT / 2);
    return canvas;
}

// --- START OF FILE csv-match.js ---
// "Match Columns" (from ForestScribe): for a cruise CSV from another program (a spreadsheet,
// another cruise app…) whose header isn't TimberTally's. The forester picks which column holds
// each item and what the logs column counts; species codes (FIA numbers like 802, letter codes
// like WO) become TimberTally species names. The trees then go through the normal import
// (Area letter prompt, plot renumbering, safety copy) in script.js.

/**
 * Splits CSV text into records. A quoted field may hold commas, doubled quotes and line
 * breaks (a multi-line tree note), so it is not split on every newline. Shared by Import CSV
 * (script.js), Match Columns (below) and Merge Another Device (merge.js).
 */
function splitCsvRecords(text) {
    const out = []; let start = 0, inQ = false, fieldStart = true;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQ) { if (ch === '"') { if (text[i + 1] === '"') i++; else inQ = false; } continue; }
        if (ch === '"' && fieldStart) { inQ = true; fieldStart = false; }
        else if (ch === ',') fieldStart = true;
        else if (ch === '\n') { out.push(text.slice(start, i).replace(/\r$/, '')); start = i + 1; fieldStart = true; }
        else if (ch !== ' ' && ch !== '\t') fieldStart = false;
    }
    out.push(text.slice(start).replace(/\r$/, ''));
    return out;
}
/** Undoes csvCell's formula guard (forestry-calc.js): "'=x" read back from a TimberTally CSV is "=x". */
function csvUnguard(v) {
    const s = String(v ?? '');
    return /^'[=+\-@\t\r]/.test(s) ? s.slice(1) : s;
}

/**
 * Import CSV's reader (called by script.js): the tree rows of a TimberTally CSV (or the blank
 * Plot Sheet template filled in by hand). Throws "CSV header not found" for any other file.
 * Paper-sheet shorthand, which never occurs in an app-written CSV (every row has a plot number):
 *   - a blank PlotNumber = the plot of the row above (only after a row that had one);
 *   - a cell that is exactly " (Excel writes """") or '' = the same column of the row above;
 *   - Logs C = cull; Cut / UGS Y, X, C, 1, Cut = yes;
 *   - a row with a plot number and nothing else = a plot with no trees.
 */
function parseTreeCsv(csvContent) {
    const lines = splitCsvRecords(String(csvContent).replace(/^﻿/, ''));
    let headerIndex = -1, headers = [];
    for (let i = 0; i < lines.length; i++) {
        const norm = lines[i].trim().toLowerCase().split(',').map(h => h.trim().replace(/\s/g,''));
        if (norm.includes('plotnumber') && norm.includes('dbh') && norm.includes('species') && norm.includes('logs') && norm.includes('cut')) {
            headerIndex = i;
            headers = lines[i].trim().split(',').map(h => h.trim().toLowerCase());
            break;
        }
    }
    if (headerIndex === -1) throw new Error("CSV header not found. Requires: PlotNumber, DBH, Species, Logs, Cut");
    const idx = {
        p: headers.indexOf('plotnumber'), d: headers.indexOf('dbh'), sp: headers.indexOf('species'),
        l: headers.indexOf('logs'), c: headers.indexOf('cut'), n: headers.indexOf('notes'),
        lat: headers.indexOf('latitude'), lon: headers.indexOf('longitude'), ugs: headers.indexOf('ugs')
    };
    const isYes = s => /^(yes|y|x|c|1|cut|true|✓)$/i.test(String(s || '').trim());
    const isDitto = s => s === '"' || s === "''";
    const parsedData = [];
    let prev = null;        // the previous tree row's cells (dittos already filled in)
    let lastPlot = null;    // the previous tree row's plot (for a blank PlotNumber)
    for (let i = headerIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('---')) { prev = null; lastPlot = null; continue; } // report sections below the trees
        if (!line || /^[,\s]*$/.test(line)) continue;
        const values = []; let cur = '', inQ = false;
        for (let j = 0; j < line.length; j++) {
            const c = line[j], nc = line[j+1];
            if (c==='"' && inQ && nc==='"') { cur+='"'; j++; }
            else if (c==='"') { inQ=!inQ; }
            else if (c===',' && !inQ) { values.push(cur.trim()); cur=''; }
            else cur += c;
        }
        values.push(cur.trim());
        if (values.length <= Math.max(idx.p,idx.d,idx.sp,idx.l,idx.c)) continue;
        for (let k = 0; k < values.length; k++) if (isDitto(values[k])) values[k] = prev ? (prev[k] ?? '') : '';
        for (const k of [idx.sp, idx.n]) if (k > -1 && values[k] != null) values[k] = csvUnguard(values[k]);
        // "none" in Species with no DBH (as the printable plot sheet says) = a plot with no trees.
        if (/^(none|no trees|no tally)$/i.test((values[idx.sp] || '').trim()) && !(parseFloat(values[idx.d]) > 0)) values[idx.sp] = '';
        try {
            const plotRaw = values[idx.p];
            let plotNum = parseInt(plotRaw, 10);
            if (isNaN(plotNum)) {
                const hasTree = [idx.sp, idx.d, idx.l].some(k => (values[k] || '').trim());
                if (plotRaw !== '' || lastPlot === null || !hasTree) { if (plotRaw !== '') { prev = null; lastPlot = null; } continue; }
                plotNum = lastPlot;
                values[idx.p] = String(plotNum);
            }
            prev = values.slice();
            lastPlot = plotNum;
            const cutStr = (values[idx.c] || 'No').trim();
            const ugsStr = (idx.ugs > -1 && values[idx.ugs]) ? values[idx.ugs].trim() : 'No';
            const lat = idx.lat > -1 ? parseFloat(values[idx.lat]) : null;
            const lon = idx.lon > -1 ? parseFloat(values[idx.lon]) : null;
            const location = (lat!==null && lon!==null && !isNaN(lat) && !isNaN(lon)) ? {lat,lon} : null;
            const noTree = ![idx.sp, idx.d, idx.l].some(k => (values[k] || '').trim());
            if ((values[idx.sp] || '').trim().toUpperCase() === 'EMPTY PLOT' || noTree) {
                parsedData.push({ id: Date.now() + i, emptyPlot: true, plotNumber: plotNum, dbh: '', species: '', logs: '', cutStatus: 'No', ugsStatus: 'No', notes: '', location });
                continue;
            }
            const logsRaw = values[idx.l];
            parsedData.push({
                id: Date.now() + i, plotNumber: plotNum, dbh: values[idx.d], species: values[idx.sp],
                logs: /^c(ull)?$/i.test(logsRaw || '') ? 'Cull' : logsRaw, cutStatus: isYes(cutStr)?'Yes':'No',
                ugsStatus: isYes(ugsStr)?'Yes':'No',
                notes: idx.n > -1 ? (values[idx.n]||'') : '',
                location
            });
        } catch(e) { continue; }
    }
    return parsedData;
}

(function () {
    'use strict';

    // Species codes other cruising programs write instead of names (ForestScribe speciesCodes.ts):
    // forester shorthand, USDA PLANTS symbols and USFS FIA numbers.
    const CODES = [
        ['White Oak', ['WO', 'QUAL', '802']],
        ['Red Oak', ['RO', 'NRO', 'QURU', '833']],
        ['Southern Red Oak', ['SRO', 'QUFA', '812']],
        ['Black Oak', ['BO', 'QUVE', '837']],
        ['Chestnut Oak', ['CO', 'CHO', 'CNO', 'QUMO4', 'QUPR2', '832']],
        ['Scarlet Oak', ['SO', 'SCO', 'QUCO2', '806']],
        ['Post Oak', ['PO', 'QUST', '835']],
        ['Chinkapin Oak', ['CKO', 'CHK', 'QUMU', '826']],
        ['Blackjack Oak', ['BJO', 'BJ', 'QUMA3', '824']],
        ['Pin Oak', ['PIO', 'QUPA2', '830']],
        ['Shumard Oak', ['SHO', 'QUSH', '834']],
        ['Bur Oak', ['BUO', 'BRO', 'QUMA2', '823']],
        ['Swamp White Oak', ['SWO', 'QUBI', '804']],
        ['Cherrybark Oak', ['CBO', 'QUPA5', '813']],
        ['Overcup Oak', ['OCO', 'QULY', '822']],
        ['Yellow-poplar', ['YP', 'TP', 'LITU', '621']],
        ['Hickory', ['HI', 'HIC', 'HK', 'CARYA', '400', '402', '403', '405', '407', '408', '409']],
        ['Sugar Maple', ['SM', 'HM', 'ACSA3', '318']],
        ['Red Maple', ['RM', 'ACRU', '316']],
        ['Silver Maple', ['SVM', 'SIM', 'ACSA2', '317']],
        ['Boxelder', ['BX', 'BE2', 'ACNE2', '313']],
        ['Black Walnut', ['BW', 'WAL', 'WN', 'JUNI', '602']],
        ['Butternut', ['BN', 'JUCI', '601']],
        ['Black Cherry', ['BC', 'CH', 'PRSE2', '762']],
        ['Ash', ['WA', 'ASH', 'GA', 'FRAM2', 'FRPE', '541', '544', '540']],
        ['Beech', ['BE', 'AB', 'FAGR', '531']],
        ['Sweetgum', ['SG', 'LIST2', '611']],
        ['Blackgum', ['BG', 'NYSY', '693']],
        ['Sycamore', ['SY', 'SYC', 'PLOC', '731']],
        ['Elm', ['EL', 'AE', 'SLE', 'ULAM', 'ULRU', '972', '975']],
        ['Hackberry', ['HB', 'HA', 'CEOC', '462']],
        ['Sassafras', ['SS', 'SA', 'SAAL5', '931']],
        ['Basswood', ['BS', 'BW2', 'TIAM', '951']],
        ['Black Locust', ['BL', 'ROPS', '901']],
        ['Honeylocust', ['HL', 'GLTR', '552']],
        ['Kentucky Coffeetree', ['KC', 'GYDI', '571']],
        ['Cottonwood', ['CW', 'PODE3', '742']],
        ['Willow', ['WI', 'SALIX', '920']],
        ['River Birch', ['RB', 'BENI', '373']],
        ['Sourwood', ['SW', 'OXAR', '711']],
        ['Dogwood', ['DW', 'COFL2', '491']],
        ['Hophornbeam', ['HH', 'OSVI', '701']],
        ['Persimmon', ['PE', 'DIVI5', '521']],
        ['Buckeye', ['BU', 'BK', 'AEFL', 'AEGL', '332', '331']],
        ['Magnolia', ['MG', 'MAGNO', '650', '651', '652']],
        ['Hemlock', ['HE', 'TSCA', '261']],
        ['Eastern redcedar', ['RC', 'ERC', 'JUVI', '68', '068']],
        ['Loblolly Pine', ['LOB', 'LP', 'PITA', '131']],
        ['Shortleaf Pine', ['SLP', 'PIEC2', '110']],
        ['Virginia Pine', ['VP', 'PIVI2', '132']],
        ['White Pine', ['WP', 'EWP', 'PIST', '129']],
        ['Slash Pine', ['SAP', 'PIEL', '111']],
        ['Longleaf Pine', ['LLP', 'PIPA2', '121']],
        ['Pitch Pine', ['PP', 'PIRI', '126']],
        ['Pine', ['PI']],
    ];
    const BY_CODE = new Map();
    for (const [name, codes] of CODES) for (const c of codes) BY_CODE.set(c.toUpperCase(), name);

    const squash = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    /** TimberTally's species (the user's list plus the defaults). */
    function knownSpecies() {
        const list = (window.TTApp?.speciesList?.() || []).concat(typeof DEFAULT_SPECIES !== 'undefined' ? DEFAULT_SPECIES : []);
        return [...new Set(list.filter(Boolean))].sort((a, b) => a.localeCompare(b));
    }

    /** The TimberTally species a file value stands for, or '' when unknown. Only species TimberTally knows. */
    function suggestSpecies(value, known) {
        const v = String(value || '').trim();
        if (!v) return '';
        const find = name => known.find(s => squash(s) === squash(name)) || '';
        const exact = find(v);
        if (exact) return exact;
        const byCode = BY_CODE.get(v.toUpperCase()) || BY_CODE.get(v.replace(/^0+/, '').toUpperCase());
        return byCode ? find(byCode) : '';
    }

    // ---- CSV text ----
    function splitCsvLine(line) {
        const out = []; let cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQ) {
                if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
                else if (ch === '"') inQ = false;
                else cur += ch;
            } else if (ch === '"') inQ = true;
            else if (ch === ',') { out.push(cur); cur = ''; }
            else cur += ch;
        }
        out.push(cur);
        return out.map(s => s.trim());
    }
    function readTable(text) {
        const lines = splitCsvRecords(String(text).replace(/^﻿/, ''));
        const h = lines.findIndex(l => l.trim().length > 0);
        if (h < 0) return { headers: [], rows: [] };
        const rows = [];
        for (let i = h + 1; i < lines.length; i++) {
            if (lines[i].startsWith('---')) break;
            if (lines[i].trim()) rows.push(splitCsvLine(lines[i]));
        }
        return { headers: splitCsvLine(lines[h]), rows };
    }

    const FIELDS = [
        ['plot', 'Plot'],
        ['area', 'Area (optional)'],
        ['species', 'Species *'],
        ['dbh', 'DBH (in) *'],
        ['logs', 'Logs'],
        ['cut', 'Cut'],
        ['ugs', 'UGS'],
        ['notes', 'Notes'],
        ['lat', 'Latitude'],
        ['lon', 'Longitude'],
    ];
    const GUESS = {
        plot: ['plotnumber', 'plot', 'plotno', 'plotid', 'point', 'pt', 'pointno', 'plotnum'],
        area: ['area', 'arealetter', 'stand', 'standid', 'stratum', 'unit', 'block'],
        dbh: ['dbh', 'diameter', 'dia', 'diam', 'dbhin', 'd'],
        species: ['species', 'spp', 'sp', 'spec', 'speciescode', 'spcode', 'spcd', 'code', 'commonname'],
        logs: ['logs', 'numlogs', 'log', 'logs16', 'sawlogs', 'merchht', 'merchheight', 'mht', 'merch', 'sticks', 'halflogs', 'height16'],
        cut: ['cut', 'cutstatus', 'cutleave', 'marked', 'mark', 'harvest', 'status'],
        ugs: ['ugs'],
        notes: ['notes', 'note', 'comment', 'comments', 'remarks'],
        lat: ['latitude', 'lat', 'y'],
        lon: ['longitude', 'lng', 'lon', 'long', 'x'],
    };
    function guessColumns(headers) {
        const norm = headers.map(squash);
        const out = {}, used = new Set();
        for (const f of Object.keys(GUESS)) {
            for (const alias of GUESS[f]) {
                const i = norm.findIndex((h, k) => h === alias && !used.has(k));
                if (i >= 0) { out[f] = i; used.add(i); break; }
            }
        }
        return out;
    }
    function guessLogsUnit(headers, rows, col) {
        if (col == null) return 'logs16';
        const h = (headers[col] || '').toLowerCase();
        if (/stick|half/.test(h)) return 'logs8';
        if (/ht|height|feet|ft/.test(h)) return 'feet';
        const max = Math.max(0, ...rows.map(r => parseFloat(r[col])).filter(Number.isFinite));
        return max > 8 ? 'feet' : 'logs16';
    }
    const yes = s => /^(y|yes|true|1|cut|c|x|m|marked)$/i.test(String(s || '').trim());

    /** Highest plot number TimberTally takes (script.js MAX_PLOT_NUMBER). */
    const MAX_PLOT = 999;
    /** Rows whose plot number is above MAX_PLOT (they are not imported). */
    const plotsTooBig = (table, cols) => (cols.plot == null ? 0 : table.rows.filter(r => parseInt(String(r[cols.plot] ?? '').trim(), 10) > MAX_PLOT).length);

    /** TimberTally entries from the file with the chosen columns. */
    function buildEntries(table, cols, logsUnit, speciesMap) {
        const out = [], unknown = new Set();
        let skipped = 0, tooBig = 0;
        const t0 = Date.now();
        table.rows.forEach((r, i) => {
            const val = f => (cols[f] != null ? String(r[cols[f]] ?? '').trim() : '');
            const plot = cols.plot != null ? parseInt(val('plot'), 10) : 1;
            if (!Number.isFinite(plot) || plot < 1) { skipped++; return; }
            // TimberTally numbers plots 1-999: a larger plot number is left out (and reported),
            // not folded into plot 999 with other plots.
            if (plot > MAX_PLOT) { tooBig++; return; }
            const areaRaw = val('area').toUpperCase();
            const areaLetter = /^[A-Z]$/.test(areaRaw) ? areaRaw : '';
            const lat = parseFloat(val('lat')), lon = parseFloat(val('lon'));
            const location = Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
            const spRaw = csvUnguard(val('species'));
            if (spRaw.toUpperCase() === 'EMPTY PLOT') {
                out.push({ id: t0 + i, emptyPlot: true, plotNumber: plot, areaLetter, dbh: '', species: '', logs: '', cutStatus: 'No', ugsStatus: 'No', notes: '', location });
                return;
            }
            const dbhNum = parseFloat(val('dbh'));
            if (!spRaw || !Number.isFinite(dbhNum) || dbhNum <= 0) { skipped++; return; }
            const species = speciesMap[spRaw] || spRaw;
            if (!speciesMap[spRaw]) unknown.add(spRaw);
            const dbh = String(Math.round(dbhNum * 10) / 10);
            const logsRaw = val('logs');
            let logs;
            if (dbhNum <= 10) logs = '0';
            else if (/cull/i.test(logsRaw)) logs = 'Cull';
            else {
                let n = parseFloat(logsRaw) || 0;
                if (logsUnit === 'logs8') n = n / 2;
                else if (logsUnit === 'feet') n = n / 16;
                n = Math.min(6, Math.max(0, Math.round(n * 2) / 2));
                logs = String(n === 0 && dbhNum > 10 ? 0.5 : n);
            }
            out.push({
                id: t0 + i, plotNumber: plot, areaLetter,
                dbh, species, logs,
                cutStatus: yes(val('cut')) ? 'Yes' : 'No',
                ugsStatus: yes(val('ugs')) ? 'Yes' : 'No',
                notes: csvUnguard(val('notes')), location,
            });
        });
        return { entries: out, skipped, tooBig, unknown: [...unknown].sort() };
    }

    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    function open(text, fileName) {
        const table = readTable(text);
        if (!table.headers.length || !table.rows.length) { window.TTApp?.projectFeedback('No rows found in that CSV.', true); return; }
        const known = knownSpecies();
        const cols = guessColumns(table.headers);
        let logsUnit = guessLogsUnit(table.headers, table.rows, cols.logs);
        const speciesPick = {};   // file value → chosen species ('' = keep as written)

        document.getElementById('csvMatchModal')?.remove();
        const modal = document.createElement('div');
        modal.id = 'csvMatchModal';
        modal.className = 'modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-label', 'Match Columns');
        modal.innerHTML = `
            <div class="modal-content" style="max-width:720px;">
                <button type="button" class="modal-close-btn" data-cancel title="Close">&#215;</button>
                <h2>Match Columns — ${esc(fileName)}</h2>
                <p class="notes-hint">This file's columns weren't recognized as a TimberTally CSV. Pick which column holds each item (Species and DBH are required; without a Plot column every tree goes in plot 1).</p>
                <div class="csvm-fields"></div>
                <div class="csvm-preview table-container"></div>
                <div class="csvm-species"></div>
                <div class="csvm-warn feedback-message error" style="display:none;"></div>
                <div class="project-actions" style="justify-content:flex-end;">
                    <button type="button" class="control-button btn-secondary" data-cancel>Cancel</button>
                    <button type="button" class="control-button btn-success" data-import>Import</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        if (!document.getElementById('csvMatchStyle')) {
            const st = document.createElement('style');
            st.id = 'csvMatchStyle';
            st.textContent = '.csvm-fields{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:6px 12px;margin:8px 0 10px}' +
                '.csvm-fields label{display:block;font-size:.82em;font-weight:600}.csvm-fields select{width:100%}' +
                '.csvm-preview{margin-bottom:10px;overflow-x:auto}.csvm-preview table{font-size:.78em;border-collapse:collapse}' +
                '.csvm-preview th,.csvm-preview td{padding:3px 6px;border:1px solid var(--forest-border);white-space:nowrap}' +
                '.csvm-preview th.on{background:var(--forest-pale)}.csvm-preview th small{display:block;font-weight:400}' +
                '.csvm-species{margin-bottom:10px}.csvm-species .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:4px 12px}' +
                '.csvm-species label{display:flex;align-items:center;gap:6px;font-size:.85em}.csvm-species code{min-width:48px}.csvm-species select{flex:1;padding:2px 4px}';
            document.head.appendChild(st);
        }
        const $ = s => modal.querySelector(s);
        const close = () => { modal.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = e => { if (e.key === 'Escape') close(); };
        document.addEventListener('keydown', onKey);
        modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-cancel]')) close(); });

        const colOptions = sel => `<option value="">— not in file —</option>` +
            table.headers.map((h, i) => `<option value="${i}"${sel === i ? ' selected' : ''}>${esc(h || `Column ${i + 1}`)}</option>`).join('');

        function renderFields() {
            $('.csvm-fields').innerHTML = FIELDS.map(([f, label]) =>
                `<div><label>${label}</label><select data-field="${f}">${colOptions(cols[f])}</select></div>`).join('') +
                (cols.logs != null ? `<div><label>The logs column counts</label><select data-logs-unit>
                    <option value="logs16"${logsUnit === 'logs16' ? ' selected' : ''}>16' logs</option>
                    <option value="logs8"${logsUnit === 'logs8' ? ' selected' : ''}>8' sticks (÷2)</option>
                    <option value="feet"${logsUnit === 'feet' ? ' selected' : ''}>Feet (÷16)</option></select></div>` : '');
        }
        function renderPreview() {
            const head = table.headers.map((h, i) => {
                const f = FIELDS.find(([k]) => cols[k] === i);
                return `<th class="${f ? 'on' : ''}">${esc(h || `Column ${i + 1}`)}${f ? `<small>→ ${f[1].replace(' *', '').replace(' (optional)', '')}</small>` : ''}</th>`;
            }).join('');
            const body = table.rows.slice(0, 5).map(r => `<tr>${table.headers.map((_, k) => `<td>${esc(r[k] ?? '')}</td>`).join('')}</tr>`).join('');
            $('.csvm-preview').innerHTML = `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
        }
        function speciesValues() {
            if (cols.species == null) return [];
            return [...new Set(table.rows.map(r => String(r[cols.species] ?? '').trim()).filter(v => v && v.toUpperCase() !== 'EMPTY PLOT'))]
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        }
        const speciesOf = v => (v in speciesPick ? speciesPick[v] : suggestSpecies(v, known));
        function renderSpecies() {
            const vals = speciesValues();
            if (!vals.length || vals.length > 80) { $('.csvm-species').innerHTML = ''; return; }
            $('.csvm-species').innerHTML = `<div style="font-weight:600;font-size:.9em;margin-bottom:4px;">Species in the file</div><div class="grid">` +
                vals.map(v => `<label><code>${esc(v)}</code>→<select data-sp="${esc(v)}"><option value="">(keep “${esc(v)}”)</option>` +
                    known.map(k => `<option${speciesOf(v) === k ? ' selected' : ''}>${esc(k)}</option>`).join('') + `</select></label>`).join('') + `</div>`;
            renderWarn();
        }
        function renderWarn() {
            const unknown = speciesValues().filter(v => !speciesOf(v));
            const w = $('.csvm-warn');
            const msgs = [];
            if (cols.species == null || cols.dbh == null) msgs.push('Pick the Species and DBH columns.');
            if (unknown.length) msgs.push(`Not a TimberTally species, kept as written: ${unknown.join(', ')}`);
            const big = plotsTooBig(table, cols);
            if (big) msgs.push(`${big} row${big === 1 ? ' has a plot number' : 's have plot numbers'} above ${MAX_PLOT}, which TimberTally can't hold; ${big === 1 ? 'it is' : 'they are'} left out. Renumber the plots in the file to import ${big === 1 ? 'it' : 'them'}.`);
            w.textContent = msgs.join(' ');
            w.style.display = msgs.length ? 'block' : 'none';
            $('[data-import]').disabled = cols.species == null || cols.dbh == null;
        }
        function renderAll() { renderFields(); renderPreview(); renderSpecies(); renderWarn(); }

        modal.addEventListener('change', e => {
            const t = e.target;
            if (t.dataset.field) {
                const f = t.dataset.field;
                if (t.value === '') delete cols[f]; else cols[f] = parseInt(t.value, 10);
                if (f === 'logs') logsUnit = guessLogsUnit(table.headers, table.rows, cols.logs);
                renderAll();
            } else if (t.hasAttribute('data-logs-unit')) {
                logsUnit = t.value;
            } else if (t.dataset.sp != null) {
                speciesPick[t.dataset.sp] = t.value;
                renderWarn();
            }
        });
        $('[data-import]').addEventListener('click', async () => {
            const map = {};
            speciesValues().forEach(v => { const s = speciesOf(v); if (s) map[v] = s; });
            const r = buildEntries(table, cols, logsUnit, map);
            if (!r.entries.length) { const w = $('.csvm-warn'); w.textContent = 'No tree rows were found with these columns.'; w.style.display = 'block'; return; }
            close();
            const ok = await window.TTApp.addImported(r.entries, fileName, { keepAreas: cols.area != null });
            if (ok && (r.unknown.length || r.skipped || r.tooBig)) {
                const parts = [];
                if (r.tooBig) parts.push(`${r.tooBig} row${r.tooBig === 1 ? '' : 's'} left out: plot number above ${MAX_PLOT}.`);
                if (r.unknown.length) parts.push(`Species kept as written: ${r.unknown.join(', ')}.`);
                if (r.skipped) parts.push(`${r.skipped} row${r.skipped === 1 ? '' : 's'} skipped (no plot, species or DBH).`);
                setTimeout(() => window.TTApp.projectFeedback(parts.join(' '), !!(r.unknown.length || r.tooBig), 8000), 4100);
            }
        });
        renderAll();
    }

    window.TTCsvMatch = { open, suggestSpecies, buildEntries, readTable, guessColumns, splitCsvRecords, csvUnguard, MAX_PLOT };
})();
// --- END OF FILE csv-match.js ---

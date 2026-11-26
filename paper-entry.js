// --- START OF FILE paper-entry.js ---
// Plots / Data: one screen that is a tabbed plot sheet over the open project's real trees.
// Area tabs → plot tabs → a grid of the plot's saved trees with blank rows below to type more
// (from a paper plot sheet), a quick line ("wo 14 2 cut"), and the plot jobs (go to, move /
// renumber, delete, no trees). Everything is done on a working copy (kept as a draft in
// localStorage) and written on Save through script.js (TTApp.savePlotSheet: safety copy first,
// then the field screen is refreshed). Untouched trees are never rewritten.
// Also: a blank CSV template for Excel and a printable blank plot sheet.
// Pure functions are on window.TTPaperEntry for the node tests.
(function () {
    'use strict';

    const COLS = ['species', 'dbh', 'logs', 'cut', 'ugs', 'notes'];
    const LABELS = { species: 'Species', dbh: 'DBH', logs: 'Logs', cut: 'Cut', ugs: 'UGS', notes: 'Notes' };
    const TEMPLATE_HEADER = 'Area,PlotNumber,Species,DBH,Logs,Cut,UGS,Notes';
    // DBH choices are script.js DBH_MIN 4 … DBH_MAX 40 in 2-inch classes.
    const MAX_PLOT = 999, MAX_ZERO_LOG_DBH = 10, DBH_MIN = 4, DBH_MAX = 40, MAX_LOGS = 6;
    const MIN_ROWS = 20, MIN_BLANK = 8;
    const CHECK = '✓';
    const AREAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

    const blankRow = () => ({ id: null, species: '', dbh: '', logs: '', cut: '', ugs: '', notes: '' });
    const isDitto = v => { const s = String(v ?? '').trim(); return s === '"' || s === "''"; };
    const isYes = v => /^(y|yes|x|c|1|cut|true|✓)$/i.test(String(v ?? '').trim());
    const isNo = v => /^(|n|no|0|false)$/i.test(String(v ?? '').trim());
    const squash = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
    const hasContent = r => COLS.some(c => String(r?.[c] ?? '').trim() !== '');
    const isTree = r => String(r?.species ?? '').trim() !== '';

    /**
     * Species typed on the sheet → the project species it stands for. Exact name or code (Match
     * Columns' lookup), else a unique name prefix ("whi" → White Oak only when one name fits).
     */
    function resolveSpecies(text, known, suggest) {
        const v = String(text || '').trim();
        if (!v) return '';
        const hit = suggest ? suggest(v, known) : known.find(s => squash(s) === squash(v));
        if (hit) return hit;
        const q = squash(v);
        if (!q) return '';
        const pre = known.filter(s => squash(s).startsWith(q));
        return pre.length === 1 ? pre[0] : '';
    }

    /** Type-ahead list for a Species cell: the code / exact hit first, then name matches (max 6). */
    function speciesMatches(text, known, suggest, max = 6) {
        const v = String(text || '').trim();
        const q = squash(v);
        if (!q) return [];
        const out = [];
        const hit = suggest ? suggest(v, known) : '';
        if (hit) out.push({ name: hit, code: squash(hit).startsWith(q) ? '' : v });
        const words = s => String(s).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        known.forEach(s => {
            if (out.some(o => o.name === s)) return;
            if (squash(s).startsWith(q) || words(s).some(w => w.startsWith(q))) out.push({ name: s, code: '' });
        });
        return out.slice(0, max);
    }

    /**
     * DBH is tallied in 2-inch classes: an odd or fractional entry is rounded DOWN to the even
     * number below (13 → 12, 13.9 → 12, 5 → 4). After rounding it must be DBH_MIN–DBH_MAX.
     */
    function roundDbh(raw) {
        const s = String(raw ?? '').trim();
        if (s === '') return { ok: false, msg: 'DBH is missing' };
        const d = Number(s);
        if (!Number.isFinite(d)) return { ok: false, msg: 'DBH must be a number' };
        const v = Math.floor(d / 2) * 2;
        if (v < DBH_MIN || v > DBH_MAX) return { ok: false, msg: `DBH must be ${DBH_MIN}–${DBH_MAX}"` };
        return { ok: true, value: v, changed: v !== d };
    }

    /** Puts a typed DBH in a row, rounded to the even class below; remembers what was typed. */
    function setDbh(row, raw) {
        const s = String(raw ?? '').trim();
        const r = roundDbh(s);
        if (r.ok && r.changed) { row.dbh = String(r.value); row.dbhTyped = s; }
        else { row.dbh = r.ok ? String(r.value) : s; delete row.dbhTyped; }
        return row;
    }

    /** A saved entry → a grid row (cells as text) that remembers its saved cells. */
    function entryToRow(e) {
        const cells = {
            species: String(e.species ?? ''), dbh: String(e.dbh ?? ''), logs: String(e.logs ?? ''),
            cut: isYes(e.cutStatus) ? CHECK : '', ugs: isYes(e.ugsStatus) ? CHECK : '', notes: String(e.notes ?? ''),
        };
        return { id: e.id, ...cells, saved: { ...cells } };
    }
    /** A saved row whose cells were changed (new rows are not "dirty"; they are new). */
    const isDirty = r => !!r.saved && COLS.some(c => String(r[c] ?? '') !== r.saved[c]);

    /**
     * One grid row → its tree values and problems. Rows with nothing in Species are not trees
     * (DBH / Logs with no species = "Species missing"). Saved rows nobody changed are shown as
     * they are and never checked (they are not rewritten).
     */
    function checkRow(row, { known = [], suggest = null } = {}) {
        const v = {};
        COLS.forEach(c => { v[c] = String(row?.[c] ?? '').trim(); });
        const out = { tree: false, species: '', speciesKnown: false, dbh: null, logs: '', cull: false, zeroLogs: false,
            cut: isYes(v.cut), ugs: isYes(v.ugs), notes: v.notes, issues: [], note: '' };
        if (v.species === '') {
            if (v.dbh !== '' || v.logs !== '') out.issues.push({ col: 'species', level: 'error', msg: 'Species missing' });
            return out;
        }
        out.tree = true;
        const sp = resolveSpecies(v.species, known, suggest);
        out.species = sp || v.species;
        out.speciesKnown = !!sp;
        const untouched = row.saved && !isDirty(row);
        if (untouched) {
            const d = Number(v.dbh);
            out.dbh = Number.isFinite(d) ? d : null;
            out.zeroLogs = out.dbh !== null && out.dbh <= MAX_ZERO_LOG_DBH;
            out.logs = v.logs; out.cull = /^c(ull)?$/i.test(v.logs);
            return out;
        }
        if (!sp) out.issues.push({ col: 'species', level: 'warn', msg: `Not in your species list: "${v.species}"` });
        const savedDbh = row.saved && v.dbh === row.saved.dbh && Number(v.dbh) > 0;
        const r = savedDbh ? { ok: true, value: Number(v.dbh), changed: false } : roundDbh(v.dbh);
        if (!r.ok) out.issues.push({ col: 'dbh', level: 'error', msg: r.msg });
        else {
            out.dbh = r.value;
            if (row.dbhTyped && row.dbhTyped !== v.dbh) out.note = `DBH ${row.dbhTyped} entered as ${v.dbh}`;
            else if (r.changed) out.note = `DBH ${v.dbh} entered as ${r.value}`;
        }
        if (out.dbh !== null && out.dbh <= MAX_ZERO_LOG_DBH) { out.logs = '0'; out.zeroLogs = true; }
        else if (/^c(ull)?$/i.test(v.logs)) { out.logs = 'Cull'; out.cull = true; }
        else if (v.logs !== '') {
            const l = Number(v.logs);
            if (!Number.isFinite(l) || l < 0 || l * 2 !== Math.round(l * 2)) out.issues.push({ col: 'logs', level: 'error', msg: 'Logs: 0.5, 1, 1.5 … 6, or C for cull' });
            else if (l > MAX_LOGS) out.issues.push({ col: 'logs', level: 'error', msg: `More than ${MAX_LOGS} logs` });
            else if (l === 0) out.issues.push({ col: 'logs', level: 'error', msg: `A tree over ${MAX_ZERO_LOG_DBH}" needs at least 0.5 log (or C)` });
            else out.logs = String(l);
        } else if (out.dbh !== null) out.issues.push({ col: 'logs', level: 'error', msg: 'Logs are missing (C = cull)' });
        ['cut', 'ugs'].forEach(c => { if (!isYes(v[c]) && !isNo(v[c])) out.issues.push({ col: c, level: 'error', msg: `${LABELS[c]}: Y or blank` }); });
        return out;
    }

    /** At least 20 rows and always at least 8 blank rows after the last filled one. */
    function padRows(rows) {
        let last = -1;
        rows.forEach((r, i) => { if (hasContent(r)) last = i; });
        const want = Math.max(MIN_ROWS, last + 1 + MIN_BLANK);
        while (rows.length < want) rows.push(blankRow());
        return rows;
    }

    /** "" ditto: the same column of the row above (dittos are resolved at once). */
    function resolveDittos(rows) {
        rows.forEach((r, i) => COLS.forEach(c => {
            if (!isDitto(r[c])) return;
            const above = i > 0 ? rows[i - 1][c] : '';
            if (c === 'dbh') { r.dbh = above; delete r.dbhTyped; } else r[c] = above;
        }));
        return rows;
    }

    // ---------------- Working copy ----------------
    const plotKey = (a, n) => `${a}-${n}`;

    /**
     * The project's entries → the working copy: every plot (all Areas) with its saved tree rows
     * and its empty-plot records. Entries with no plot number are not shown (and kept as they are).
     */
    function buildWorkingCopy(entries) {
        const wc = { seq: 0, plots: [], loadedIds: [] };
        const byKey = new Map();
        (entries || []).forEach(e => {
            if (!e) return;
            const a = String(e.areaLetter || '').toUpperCase(), n = parseInt(e.plotNumber, 10);
            if (!AREAS.includes(a) || !(n >= 1)) return;
            wc.loadedIds.push(e.id);
            let p = byKey.get(plotKey(a, n));
            if (!p) {
                p = { uid: `p${++wc.seq}`, area: a, plot: n, from: { area: a, plot: n }, empty: false, emptyIds: [], rows: [] };
                byKey.set(plotKey(a, n), p);
                wc.plots.push(p);
            }
            if (e.emptyPlot) { p.emptyIds.push(e.id); p.empty = true; } else p.rows.push(entryToRow(e));
        });
        wc.plots.forEach(p => { if (p.rows.some(isTree)) p.empty = false; padRows(p.rows); });
        sortPlots(wc);
        return wc;
    }
    function sortPlots(wc) { wc.plots.sort((x, y) => x.area.localeCompare(y.area) || x.plot - y.plot); return wc; }

    const plotsIn = (wc, area) => wc.plots.filter(p => p.area === area);
    const treeCount = p => p.rows.filter(isTree).length;
    /** The plot with that number in that Area (other than `exceptUid`), or null. */
    function findPlot(wc, area, n, exceptUid) { return wc.plots.find(p => p.area === area && p.plot === n && p.uid !== exceptUid) || null; }
    /** The next free plot number in an Area: the highest one + 1. */
    function nextFreePlot(wc, area, exceptUid) {
        const nums = plotsIn(wc, area).filter(p => p.uid !== exceptUid).map(p => p.plot);
        return Math.min(MAX_PLOT, (nums.length ? Math.max(...nums) : 0) + 1);
    }
    function duplicateMessage(p) {
        const t = treeCount(p);
        return `Area ${p.area} already has Plot ${p.plot} (${t ? plural(t, 'tree') : 'no trees'})`;
    }
    function addPlot(wc, area, n) {
        const p = { uid: `p${++wc.seq}`, area, plot: n ?? nextFreePlot(wc, area), from: null, empty: false, emptyIds: [], rows: padRows([]) };
        wc.plots.push(p);
        sortPlots(wc);
        return p;
    }
    /** Moves / renumbers a plot. Never merges: a plot already there → { ok: false, conflict, next }. */
    function movePlot(wc, uid, area, n) {
        const p = wc.plots.find(x => x.uid === uid);
        if (!p) return { ok: false };
        if (!(n >= 1 && n <= MAX_PLOT) || !AREAS.includes(area)) return { ok: false, msg: `Plot must be 1–${MAX_PLOT}` };
        const there = findPlot(wc, area, n, uid);
        if (there) return { ok: false, conflict: there, msg: duplicateMessage(there), next: nextFreePlot(wc, area, uid) };
        p.area = area; p.plot = n;
        sortPlots(wc);
        return { ok: true, plot: p };
    }
    function deletePlot(wc, uid) { wc.plots = wc.plots.filter(p => p.uid !== uid); return wc; }
    /** "No trees in this plot": only when the grid has no trees. */
    function setEmpty(wc, uid, on) {
        const p = wc.plots.find(x => x.uid === uid);
        if (!p) return { ok: false };
        if (on && p.rows.some(isTree)) return { ok: false, msg: 'Remove the trees first' };
        p.empty = !!on;
        return { ok: true };
    }

    /**
     * The working copy → the project's new entries and what changed. Untouched entries are the
     * very same objects (every field kept). Edited trees get only the changed fields; moved plots
     * get the new Area / plot; removed trees and empty-plot records are dropped; new trees are added.
     */
    function applyWorkingCopy(entries, wc, { known = [], suggest = null, t0 = Date.now() } = {}) {
        const byId = new Map((entries || []).map(e => [String(e?.id), e]));
        const loaded = new Set(wc.loadedIds.map(String));
        const keep = new Map();
        const added = [];
        const usedIds = new Set((entries || []).map(e => String(e?.id)));
        let nextId = t0;
        const newId = () => { while (usedIds.has(String(nextId))) nextId++; usedIds.add(String(nextId)); return nextId++; };
        let edited = 0, emptyAdded = 0;
        const moves = [];
        wc.plots.forEach(p => {
            const moved = !!p.from && (p.from.area !== p.area || p.from.plot !== p.plot);
            if (moved) moves.push({ from: { ...p.from }, to: { area: p.area, plot: p.plot } });
            const trees = p.rows.filter(isTree);
            trees.forEach(r => {
                const c = checkRow(r, { known, suggest });
                const orig = r.id != null ? byId.get(String(r.id)) : null;
                if (orig && loaded.has(String(orig.id))) {
                    let obj = orig;
                    if (isDirty(r)) {
                        const ch = {};
                        const dbhChanged = r.dbh !== r.saved.dbh;
                        if (r.species !== r.saved.species && c.species !== orig.species) ch.species = c.species;
                        if (dbhChanged && String(c.dbh) !== String(orig.dbh)) ch.dbh = String(c.dbh);
                        if ((dbhChanged || r.logs !== r.saved.logs) && c.logs !== String(orig.logs ?? '')) ch.logs = c.logs;
                        const cut = c.cut ? 'Yes' : 'No', ugs = c.ugs ? 'Yes' : 'No';
                        if (r.cut !== r.saved.cut && cut !== orig.cutStatus) ch.cutStatus = cut;
                        if (r.ugs !== r.saved.ugs && ugs !== orig.ugsStatus) ch.ugsStatus = ugs;
                        if (r.notes !== r.saved.notes && c.notes !== (orig.notes || '')) ch.notes = c.notes;
                        if (Object.keys(ch).length) { obj = { ...orig, ...ch }; edited++; }
                    }
                    if (moved) obj = { ...obj, areaLetter: p.area, plotNumber: p.plot };
                    keep.set(String(orig.id), obj);
                } else {
                    added.push({ id: newId(), plotNumber: p.plot, areaLetter: p.area, dbh: String(c.dbh ?? ''), species: c.species, logs: c.logs,
                        cutStatus: c.cut ? 'Yes' : 'No', ugsStatus: c.ugs ? 'Yes' : 'No', notes: c.notes || '', location: null });
                }
            });
            if (p.empty && !trees.length) {
                const id = p.emptyIds.find(x => byId.has(String(x)));
                if (id != null) {
                    const orig = byId.get(String(id));
                    keep.set(String(id), moved ? { ...orig, areaLetter: p.area, plotNumber: p.plot } : orig);
                } else {
                    emptyAdded++;
                    added.push({ id: newId(), emptyPlot: true, plotNumber: p.plot, areaLetter: p.area, species: '', dbh: '', logs: '',
                        cutStatus: 'No', ugsStatus: 'No', notes: '', location: null });
                }
            }
        });
        let deleted = 0;
        const data = [];
        (entries || []).forEach(e => {
            const id = String(e?.id);
            if (!loaded.has(id)) { data.push(e); return; }
            if (keep.has(id)) data.push(keep.get(id)); else deleted++;
        });
        const addedTrees = added.filter(e => !e.emptyPlot).length;
        const changes = added.length + edited + deleted + moves.length;
        return { data: data.concat(added), added: addedTrees, emptyAdded, edited, deleted, moves, changes };
    }

    /** Every problem and DBH note on the sheet, all Areas and plots. */
    function sheetProblems(wc, opts) {
        const problems = [], notes = [];
        wc.plots.forEach(p => p.rows.forEach((r, i) => {
            const c = checkRow(r, opts);
            c.issues.forEach(x => problems.push({ uid: p.uid, area: p.area, plot: p.plot, row: i, ...x }));
            if (c.note) notes.push({ uid: p.uid, area: p.area, plot: p.plot, row: i, msg: c.note });
        }));
        return { problems, notes, errors: problems.filter(x => x.level === 'error').length };
    }

    /**
     * The quick line: "wo 14 2 cut", "white oak 16 2", "hk 8 u", "ro 18 c \"forked top\"".
     * Species = the words up to the first number; then DBH (rounded to the even class below);
     * over 10" the next word is Logs (a number, or C / Cull); then cut / c / x / y = Cut,
     * u / ugs = UGS; anything else (or "quoted text") = Notes.
     */
    function parseQuickLine(text, { known = [], suggest = null } = {}) {
        let s = String(text || '').trim();
        if (!s) return { ok: false, error: 'Type a tree, e.g. wo 14 2 cut' };
        const quoted = [];
        s = s.replace(/"([^"]*)"?/g, (m, q) => { quoted.push(q.trim()); return ' '; });
        const toks = s.split(/\s+/).filter(Boolean);
        const isNum = t => /^\d+(\.\d+)?$/.test(t);
        const sp = [];
        while (toks.length && !isNum(toks[0])) sp.push(toks.shift());
        if (!sp.length) return { ok: false, error: 'Start with the species (name or code), then the DBH' };
        if (!toks.length) return { ok: false, error: 'No DBH: type the species, then the DBH' };
        const dbhRaw = toks.shift();
        const d = roundDbh(dbhRaw);
        if (!d.ok) return { ok: false, error: `${d.msg} (typed ${dbhRaw})` };
        const row = blankRow();
        row.species = resolveSpecies(sp.join(' '), known, suggest) || sp.join(' ');
        setDbh(row, dbhRaw);
        if (d.value > MAX_ZERO_LOG_DBH) {
            const l = toks.shift();
            if (l == null) return { ok: false, error: `Logs missing: a ${d.value}" tree needs logs (or C for cull)` };
            if (/^c(ull)?$/i.test(l)) row.logs = 'C';
            else if (isNum(l)) row.logs = l;
            else return { ok: false, error: `Logs must be a number or C (typed ${l})` };
        }
        const words = [];
        toks.forEach(t => {
            if (/^(cut|c|x|y)$/i.test(t)) row.cut = CHECK;
            else if (/^(u|ugs)$/i.test(t)) row.ugs = CHECK;
            else words.push(t);
        });
        row.notes = words.concat(quoted).filter(Boolean).join(' ');
        const c = checkRow(row, { known, suggest });
        const err = c.issues.find(x => x.level === 'error');
        if (err) return { ok: false, error: err.msg };
        return { ok: true, row, note: c.note };
    }

    /** Puts a tree row into the first empty row of a plot (more blank rows follow). */
    function appendRow(p, row) {
        let i = p.rows.findIndex(r => !hasContent(r));
        if (i < 0) { i = p.rows.length; p.rows.push(blankRow()); }
        p.rows[i] = row;
        p.empty = false;
        padRows(p.rows);
        return i;
    }

    const rangeText = nums => {
        if (!nums.length) return '';
        const contiguous = nums.every((n, i) => i === 0 || n === nums[i - 1] + 1);
        if (nums.length === 1) return String(nums[0]);
        return contiguous ? `${nums[0]}–${nums[nums.length - 1]}` : nums.join(', ');
    };

    /**
     * Entries read from a CSV (parseTreeCsv) → new plots in `area`, numbered after its existing
     * plots, DBH rounded to the even class below. Nothing is saved until Save.
     */
    function addCsvPlots(wc, area, parsed) {
        const groups = new Map();
        (parsed || []).forEach(e => {
            const n = parseInt(e.plotNumber, 10);
            if (!(n >= 1)) return;
            if (!groups.has(n)) groups.set(n, []);
            groups.get(n).push(e);
        });
        const from = [...groups.keys()], to = [];
        let n = nextFreePlot(wc, area) - 1;
        from.forEach(k => {
            const p = addPlot(wc, area, Math.min(MAX_PLOT, ++n));
            to.push(p.plot);
            const rows = [];
            groups.get(k).forEach(e => {
                if (e.emptyPlot) return;
                const r = blankRow();
                r.species = String(e.species || '');
                setDbh(r, e.dbh);
                r.logs = String(e.logs ?? '');
                r.cut = isYes(e.cutStatus) ? CHECK : '';
                r.ugs = isYes(e.ugsStatus) ? CHECK : '';
                r.notes = String(e.notes || '');
                rows.push(r);
            });
            p.empty = !rows.length;
            p.rows = padRows(rows);
        });
        return { from, to, message: from.length ? `CSV plots ${rangeText(from)} added as Plot${to.length === 1 ? '' : 's'} ${rangeText(to)}` : '' };
    }

    /** Text pasted from Excel (tab-separated) or a CSV (comma-separated) → rows of cells. */
    function parsePaste(text) {
        const s = String(text ?? '').replace(/\r\n?/g, '\n').replace(/\n$/, '');
        if (!s) return [];
        const lines = s.split('\n');
        const sep = lines.some(l => l.includes('\t')) ? '\t' : ',';
        return lines.map(l => {
            if (sep === '\t') return l.split('\t').map(c => c.trim());
            const cells = []; let cur = '', inQ = false;
            for (let i = 0; i < l.length; i++) {
                const ch = l[i];
                if (inQ) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') inQ = false; else cur += ch; }
                else if (ch === '"' && cur.trim() === '' && l.indexOf('"', i + 1) > -1) inQ = true;
                else if (ch === ',') { cells.push(cur.trim()); cur = ''; }
                else cur += ch;
            }
            cells.push(cur.trim());
            return cells;
        });
    }

    /** Puts a block of pasted cells into the rows starting at (row, col); adds rows as needed. */
    function applyPaste(rows, startRow, startCol, cells) {
        const out = rows.map(r => ({ ...r }));
        const c0 = COLS.indexOf(startCol);
        cells.forEach((line, k) => {
            const ri = startRow + k;
            while (out.length <= ri) out.push(blankRow());
            line.forEach((val, j) => {
                const c = COLS[c0 + j];
                if (!c) return;
                if (c === 'dbh' && !isDitto(val)) setDbh(out[ri], val);
                else if ((c === 'cut' || c === 'ugs') && !isDitto(val)) out[ri][c] = isYes(val) ? CHECK : (isNo(val) ? '' : val);
                else out[ri][c] = val;
            });
        });
        return resolveDittos(out);
    }

    /** The blank CSV template (UTF-8 BOM so Excel opens it cleanly). */
    function templateCsv() { return '﻿' + TEMPLATE_HEADER + '\r\n'; }

    /** The printable blank plot sheet (black on white, ~28 ruled rows per letter page). */
    function printableHtml(rowsPerPage = 28) {
        const head = ['Plot', 'Species', 'DBH', 'Logs', 'Cut', 'UGS', 'Notes'].map(h => `<th>${h}</th>`).join('');
        const body = Array.from({ length: rowsPerPage }, () => '<tr>' + '<td></td>'.repeat(7) + '</tr>').join('');
        return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Plot Sheet</title><style>
@page{size:letter;margin:.45in}body{font-family:Arial,sans-serif;color:#000;background:#fff;margin:0}
h1{font-size:18pt;margin:0 0 8px}.blanks{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px 18px;font-size:10.5pt;margin-bottom:10px}
.blanks span{display:flex;gap:6px}.blanks i{flex:1;border-bottom:1px solid #000}
table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #000;height:.29in;font-size:10pt}
th{background:#fff;font-weight:700}col.n{width:8%}col.s{width:17%}col.d{width:8%}col.l{width:8%}col.c{width:6%}col.u{width:6%}
.hint{font-size:9pt;margin-top:6px}@media screen{body{padding:20px;max-width:8in}}</style></head><body>
<h1>Plot Sheet</h1><div class="blanks"><span>Property <i></i></span><span>Area <i></i></span><span>Date <i></i></span>
<span>Cruiser <i></i></span><span>BAF / Plot size <i></i></span><span>Page <i></i> of <i></i></span></div>
<table><colgroup><col class="n"><col class="s"><col class="d"><col class="l"><col class="c"><col class="u"><col></colgroup>
<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
<p class="hint">Blank Plot = same as above · " = ditto · Logs C = cull · Plot with no trees: write the plot number and 'none'</p>
<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},200)})<\/script></body></html>`;
    }

    // ================= Browser UI =================
    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const app = () => window.TTApp;
    const draftKey = () => `tt.plotsDraft.${app()?.project()?.id || 'none'}`;
    function knownSpecies() {
        const list = (app()?.speciesList?.() || []).concat(typeof DEFAULT_SPECIES !== 'undefined' ? DEFAULT_SPECIES : []);
        return [...new Set(list.filter(Boolean))];
    }
    const suggest = (v, known) => window.TTCsvMatch?.suggestSpecies(v, known) || '';

    async function saveBlob(blob, name) {
        if (window.TTStore?.saveFile) { try { return await window.TTStore.saveFile(blob, name); } catch (e) { /* fall back */ } }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    function downloadTemplate() { return saveBlob(new Blob([templateCsv()], { type: 'text/csv;charset=utf-8' }), 'plot-sheet-template.csv'); }
    function openPrintable() {
        const w = window.open('', '_blank');
        if (!w) { app()?.projectFeedback('Allow pop-ups to open the printable sheet.', true); return; }
        w.document.open(); w.document.write(printableHtml()); w.document.close();
    }

    let screen = null; // the open screen's controller

    async function openScreen() {
        if (screen) return;
        const known = knownSpecies();
        const opts = { known, suggest };
        const project = app()?.project();
        let wc = buildWorkingCopy(app()?.data() || []);
        let draft = null;
        try { draft = JSON.parse(localStorage.getItem(draftKey()) || 'null'); } catch (e) { draft = null; }

        const modal = document.createElement('div');
        modal.id = 'plotsDataModal';
        modal.className = 'modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-label', 'Plots / Data');
        modal.style.display = 'flex';
        modal.innerHTML = `
            <div class="modal-content pe-content">
                <button type="button" class="modal-close-btn" data-close title="Close">&#215;</button>
                <div class="pe-head"><h2>Plots / Data</h2><span class="pe-status notes-hint"></span></div>
                <div class="pe-tabs pe-areatabs" role="tablist" aria-label="Areas"></div>
                <div class="pe-tabs pe-plottabs" role="tablist" aria-label="Plots"></div>
                <div class="pe-plotbar">
                    <label class="pe-emptylbl"><input type="checkbox" class="pe-empty"> No trees in this plot</label>
                    <button type="button" class="control-button btn-info" data-move>Move / renumber…</button>
                    <button type="button" class="control-button delete-button" data-delplot>Delete plot</button>
                    <button type="button" class="control-button btn-secondary" data-goto-plot>Go to plot</button>
                </div>
                <div class="pe-move" hidden>
                    <p class="pe-move-title"></p>
                    <div class="pe-move-row">
                        <label>Area <select class="pe-move-area"></select></label>
                        <label>Plot # <input type="number" class="pe-move-num" min="1" max="${MAX_PLOT}" inputmode="numeric"></label>
                    </div>
                    <p class="move-plot-warn pe-move-warn" hidden></p>
                    <div class="pe-move-actions">
                        <button type="button" class="control-button btn-info" data-move-next hidden></button>
                        <button type="button" class="control-button btn-secondary" data-move-cancel>Cancel</button>
                        <button type="button" class="control-button btn-success" data-move-ok>Move</button>
                    </div>
                </div>
                <div class="pe-ask" hidden><p class="pe-ask-msg"></p><div class="pe-ask-actions"></div></div>
                <input type="text" class="pe-quick" placeholder="Quick line: wo 14 2 cut  ·  Enter adds the tree" autocomplete="off" spellcheck="false" aria-label="Quick line">
                <p class="pe-quickmsg" hidden></p>
                <div class="pe-wrap"><table class="pe-grid">
                    <thead><tr><th>#</th>${COLS.map(c => `<th class="pe-h-${c}">${LABELS[c]}</th>`).join('')}<th></th></tr></thead>
                    <tbody></tbody></table></div>
                <div class="pe-suggest" hidden role="listbox"></div>
                <ul class="pe-dbhnotes"></ul>
                <p class="notes-hint pe-keys">Enter or Tab = next cell · ↑/↓ = row above/below · " = ditto · Logs C = cull · Space toggles Cut/UGS · Ctrl+Enter = next plot</p>
                <div class="pe-foot"><span class="pe-count"></span><ul class="pe-problems"></ul></div>
                <div class="project-actions pe-actions">
                    <button type="button" class="control-button btn-info" data-opencsv>Open a filled CSV…</button>
                    <input type="file" accept=".csv,text/csv" hidden data-csvinput>
                    <button type="button" class="control-button btn-info" data-template>&#11015; Blank CSV Template</button>
                    <button type="button" class="control-button btn-info" data-print>&#128424; Printable Plot Sheet</button>
                    <button type="button" class="control-button btn-success" data-save>Save changes</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        const $ = s => modal.querySelector(s);
        const tbody = $('tbody');
        const sugBox = $('.pe-suggest');

        // ---- state ----
        const cur = app()?.currentArea() || 'A';
        const curPlotNo = app()?.currentPlot?.() || 1;
        let area = cur, uid = null, lastUsed = 'grid';
        let sug = { list: [], idx: -1, r: -1 };

        const plot = () => wc.plots.find(p => p.uid === uid) || null;
        const diff = () => applyWorkingCopy(app()?.data() || [], wc, opts);
        function persist() {
            try {
                if (diff().changes) localStorage.setItem(draftKey(), JSON.stringify({ savedAt: Date.now(), wc }));
                else localStorage.removeItem(draftKey());
            } catch (e) { /* storage full */ }
        }
        function selectPlot(a, n) {
            area = a;
            let p = wc.plots.find(x => x.area === a && x.plot === n) || plotsIn(wc, a)[0];
            if (!p) p = addPlot(wc, a, n || 1);
            uid = p.uid;
        }

        // ---- ask (in-screen dialog) ----
        let askResolve = null;
        function ask(msg, buttons) {
            return new Promise(res => {
                askResolve = res;
                $('.pe-ask-msg').textContent = msg;
                $('.pe-ask-actions').innerHTML = buttons.map((b, i) => `<button type="button" class="control-button ${b.cls || 'btn-secondary'}" data-ask="${i}">${esc(b.label)}</button>`).join('');
                $('.pe-ask').hidden = false;
                $('.pe-ask [data-ask="0"]')?.focus();
                $('.pe-ask-actions').onclick = e => {
                    const b = e.target.closest('[data-ask]'); if (!b) return;
                    $('.pe-ask').hidden = true; askResolve = null;
                    res(buttons[+b.dataset.ask].value);
                };
            });
        }
        function cancelAsk() { if (askResolve) { const r = askResolve; askResolve = null; $('.pe-ask').hidden = true; r(null); } }

        // ---- rendering ----
        function renderTabs() {
            const areas = [...new Set([...wc.plots.map(p => p.area), cur, area])].sort();
            $('.pe-areatabs').innerHTML = areas.map(a => {
                const n = plotsIn(wc, a).length;
                return `<button type="button" class="pe-tab${a === area ? ' active' : ''}" role="tab" aria-selected="${a === area}" data-area="${a}">Area ${a} · ${plural(n, 'plot')}</button>`;
            }).join('') + '<button type="button" class="pe-tab pe-add" data-addarea title="Add the next free Area letter">+ Area</button>';
            $('.pe-plottabs').innerHTML = plotsIn(wc, area).map(p => {
                const t = treeCount(p);
                return `<button type="button" class="pe-pill${p.uid === uid ? ' active' : ''}" role="tab" aria-selected="${p.uid === uid}" data-uid="${p.uid}">Plot ${p.plot} · ${t || 'none'}</button>`;
            }).join('') + '<button type="button" class="pe-pill pe-add" data-addplot title="Add the next plot number">+ Plot</button>';
            $('.pe-plottabs .active')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        }
        function buildGrid() {
            const p = plot();
            if (!p) { tbody.innerHTML = ''; return; }
            padRows(p.rows);
            tbody.innerHTML = p.rows.map((r, i) => `<tr data-row="${i}"><td class="pe-num">${i + 1}</td>` +
                COLS.map(c => `<td class="pe-cell pe-${c}"><input type="text" data-r="${i}" data-c="${c}" value="${esc(r[c])}" autocomplete="off" spellcheck="false"${c === 'dbh' || c === 'logs' ? ' inputmode="decimal"' : ''}${c === 'cut' || c === 'ugs' ? ' inputmode="none"' : ''} aria-label="Row ${i + 1} ${LABELS[c]}">${c === 'species' ? '<small class="pe-sp"></small>' : ''}</td>`).join('') +
                `<td><button type="button" class="pe-del" data-del="${i}" title="Delete this tree" tabindex="-1">&#10005;</button></td></tr>`).join('');
        }
        function render() { renderTabs(); buildGrid(); refresh(); }

        let lastSheet = { problems: [], notes: [], errors: 0 };
        function refresh() {
            const p = plot();
            if (p) p.rows.forEach((r, i) => {
                const tr = tbody.querySelector(`tr[data-row="${i}"]`);
                if (!tr) return;
                const c = checkRow(r, opts);
                COLS.forEach(col => {
                    const inp = cellInput(i, col);
                    const iss = c.issues.find(x => x.col === col);
                    inp.classList.toggle('pe-error', iss?.level === 'error');
                    inp.classList.toggle('pe-warn', iss?.level === 'warn');
                    inp.title = iss ? iss.msg : '';
                });
                const lin = cellInput(i, 'logs');
                const ro = c.tree && c.zeroLogs && !(r.saved && !isDirty(r) && r.logs !== '' && r.logs !== '0');
                lin.readOnly = ro;
                lin.classList.toggle('pe-muted', ro);
                lin.placeholder = ro ? '0' : '';
                tr.querySelector('.pe-sp').textContent = c.speciesKnown && squash(c.species) !== squash(r.species) ? c.species : '';
            });
            const emptyBox = $('.pe-empty');
            emptyBox.checked = !!p?.empty;
            lastSheet = sheetProblems(wc, opts);
            $('.pe-dbhnotes').innerHTML = lastSheet.notes.filter(n => n.uid === uid).map(n => `<li>Row ${n.row + 1}: ${esc(n.msg)}</li>`).join('');
            $('.pe-problems').innerHTML = lastSheet.problems.slice(0, 40).map((x, k) =>
                `<li><a href="#" data-prob="${k}" class="${x.level === 'error' ? 'pe-perr' : 'pe-pwarn'}">Area ${x.area} Plot ${x.plot}, row ${x.row + 1} ${LABELS[x.col]}: ${esc(x.msg)}</a></li>`).join('');
            const ap = plotsIn(wc, area);
            const at = ap.reduce((s, q) => s + treeCount(q), 0);
            const st = wc.plots.reduce((s, q) => s + treeCount(q), 0);
            $('.pe-count').textContent = `Area ${area}: ${plural(at, 'tree')} on ${plural(ap.length, 'plot')} · Sheet: ${plural(st, 'tree')}`;
            const d = diff();
            const btn = $('[data-save]');
            btn.disabled = lastSheet.errors > 0 || !d.changes;
            btn.textContent = d.changes ? `Save changes (${d.changes} change${d.changes === 1 ? '' : 's'})` : 'Save changes';
            $('.pe-status').textContent = d.changes ? 'Unsaved changes' : 'All saved';
            $('.pe-status').classList.toggle('pe-unsaved', !!d.changes);
            // Plot tab counts follow the typing.
            ap.forEach(q => {
                const pill = $(`.pe-pill[data-uid="${q.uid}"]`);
                if (pill) pill.textContent = `Plot ${q.plot} · ${treeCount(q) || 'none'}`;
            });
            persist();
        }

        const cellInput = (r, c) => tbody.querySelector(`input[data-r="${r}"][data-c="${c}"]`);
        function focusCell(r, c) {
            const p = plot(); if (!p) return;
            if (r >= p.rows.length) { while (p.rows.length <= r) p.rows.push({ ...blankRow() }); buildGrid(); refresh(); }
            const inp = cellInput(r, c);
            if (inp) { inp.focus(); inp.select?.(); lastUsed = 'grid'; }
        }
        function commitDbh(r) {
            const p = plot(); const row = p?.rows[r]; if (!row) return;
            const inp = cellInput(r, 'dbh');
            const v = String(row.dbh).trim();
            if (v === '' || (row.saved && v === row.saved.dbh)) return;
            const rd = roundDbh(v);
            if (!rd.ok || !rd.changed) return; // already an even class (keeps the "entered as" note)
            setDbh(row, v);
            if (inp) inp.value = row.dbh;
            refresh();
        }
        function growIfNeeded(r, c) {
            const p = plot();
            const before = p.rows.length;
            padRows(p.rows);
            if (p.rows.length !== before) {
                const inp = cellInput(r, c); const pos = inp?.selectionStart;
                buildGrid(); refresh();
                const again = cellInput(r, c);
                if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }
            }
        }
        function next(r, c) {
            if (c === 'dbh') commitDbh(r);
            let k = COLS.indexOf(c) + 1;
            if (COLS[k] === 'logs' && cellInput(r, 'logs')?.readOnly) k++;
            if (k < COLS.length) focusCell(r, COLS[k]); else focusCell(r + 1, 'species');
        }
        function prev(r, c) {
            if (c === 'dbh') commitDbh(r);
            let k = COLS.indexOf(c) - 1;
            if (COLS[k] === 'logs' && cellInput(r, 'logs')?.readOnly) k--;
            if (k >= 0) focusCell(r, COLS[k]); else if (r > 0) focusCell(r - 1, COLS[COLS.length - 1]);
        }

        // ---- species type-ahead ----
        function closeSug() { sugBox.hidden = true; sug = { list: [], idx: -1, r: -1 }; }
        function showSug(r) {
            const inp = cellInput(r, 'species');
            const list = speciesMatches(inp.value, known, suggest);
            if (!list.length || !inp.value.trim()) { closeSug(); return; }
            sug = { list, idx: -1, r };
            drawSug();
            const box = inp.getBoundingClientRect(), host = $('.pe-content').getBoundingClientRect();
            sugBox.style.left = `${box.left - host.left}px`;
            sugBox.style.top = `${box.bottom - host.top + $('.pe-content').scrollTop}px`;
            sugBox.style.minWidth = `${box.width}px`;
            sugBox.hidden = false;
        }
        function drawSug() {
            sugBox.innerHTML = sug.list.map((s, i) => `<div class="pe-sug${i === sug.idx ? ' active' : ''}" role="option" data-sug="${i}">${s.code ? `${esc(s.code)} → ` : ''}${esc(s.name)}</div>`).join('');
        }
        function acceptSug() {
            if (sug.idx < 0 || !sug.list[sug.idx]) return false;
            const p = plot(); const r = sug.r;
            p.rows[r].species = sug.list[sug.idx].name;
            cellInput(r, 'species').value = p.rows[r].species;
            closeSug(); refresh();
            return true;
        }
        sugBox.addEventListener('mousedown', e => {
            const d = e.target.closest('[data-sug]'); if (!d) return;
            e.preventDefault();
            sug.idx = +d.dataset.sug; const r = sug.r;
            acceptSug(); next(r, 'species');
        });

        // ---- grid events ----
        tbody.addEventListener('input', e => {
            const inp = e.target; if (!inp.dataset.c) return;
            const p = plot();
            const r = +inp.dataset.r, c = inp.dataset.c;
            let val = inp.value;
            if (isDitto(val)) {
                val = r > 0 ? String(p.rows[r - 1][c] ?? '') : '';
                inp.value = val;
                if (c === 'dbh') { p.rows[r].dbh = val; delete p.rows[r].dbhTyped; }
            } else if ((c === 'cut' || c === 'ugs') && val !== "'") {
                if (isYes(val)) val = CHECK; else if (isNo(val)) val = '';
                inp.value = val;
            }
            p.rows[r][c] = val;
            if (c === 'dbh') delete p.rows[r].dbhTyped;
            if (c === 'species') showSug(r);
            refresh();
            growIfNeeded(r, c);
        });
        tbody.addEventListener('focusout', e => {
            const inp = e.target;
            if (inp.dataset?.c === 'dbh') { commitDbh(+inp.dataset.r); refresh(); }
            if (inp.dataset?.c === 'species') setTimeout(() => { if (!tbody.contains(document.activeElement) || document.activeElement !== cellInput(sug.r, 'species')) closeSug(); }, 150);
        });
        tbody.addEventListener('focusin', e => { if (e.target.dataset?.c) lastUsed = 'grid'; });
        tbody.addEventListener('keydown', e => {
            const inp = e.target; if (!inp.dataset.c) return;
            const r = +inp.dataset.r, c = inp.dataset.c;
            const sugOpen = !sugBox.hidden && sug.r === r && c === 'species';
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) return; // next plot (modal handler)
            if (sugOpen && e.key === 'ArrowDown') { e.preventDefault(); sug.idx = Math.min(sug.list.length - 1, sug.idx + 1); drawSug(); return; }
            if (sugOpen && e.key === 'ArrowUp') { e.preventDefault(); sug.idx = Math.max(-1, sug.idx - 1); drawSug(); return; }
            if (sugOpen && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeSug(); return; }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                if (sugOpen && !e.shiftKey) acceptSug();
                closeSug();
                if (e.shiftKey) prev(r, c); else next(r, c);
            } else if (e.key === 'ArrowDown') { e.preventDefault(); if (c === 'dbh') commitDbh(r); closeSug(); focusCell(r + 1, c); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); if (c === 'dbh') commitDbh(r); closeSug(); if (r > 0) focusCell(r - 1, c); }
            else if (e.key === ' ' && (c === 'cut' || c === 'ugs')) {
                e.preventDefault();
                const p = plot();
                p.rows[r][c] = inp.value = isYes(inp.value) ? '' : CHECK;
                refresh();
            }
        });
        tbody.addEventListener('paste', e => {
            const inp = e.target; if (!inp.dataset.c) return;
            const text = e.clipboardData?.getData('text') || '';
            if (!/[\t\n]/.test(text) && !(text.includes(',') && inp.dataset.c !== 'notes')) return;
            e.preventDefault();
            const p = plot();
            p.rows = padRows(applyPaste(p.rows, +inp.dataset.r, inp.dataset.c, parsePaste(text)));
            p.empty = p.empty && !p.rows.some(isTree);
            render();
        });
        tbody.addEventListener('click', e => {
            const d = e.target.closest('[data-del]');
            if (!d) return;
            const p = plot();
            p.rows.splice(+d.dataset.del, 1);
            padRows(p.rows);
            render();
        });

        // ---- tabs and plot bar ----
        async function switchTo(fn) { closeSug(); fn(); render(); }
        $('.pe-areatabs').addEventListener('click', e => {
            const t = e.target.closest('[data-area]');
            if (t) { switchTo(() => selectPlot(t.dataset.area, plotsIn(wc, t.dataset.area)[0]?.plot)); return; }
            if (e.target.closest('[data-addarea]')) {
                const used = new Set([...wc.plots.map(p => p.area), cur]);
                const a = AREAS.find(x => !used.has(x));
                if (!a) return;
                switchTo(() => { area = a; uid = addPlot(wc, a, 1).uid; });
                focusCell(0, 'species');
            }
        });
        function addNextPlot() { const p = addPlot(wc, area); uid = p.uid; render(); focusFirst(); }
        function focusFirst() { if (lastUsed === 'quick') $('.pe-quick').focus(); else focusCell(0, 'species'); }
        $('.pe-plottabs').addEventListener('click', e => {
            const t = e.target.closest('[data-uid]');
            if (t) { switchTo(() => { uid = t.dataset.uid; }); return; }
            if (e.target.closest('[data-addplot]')) { lastUsed = 'grid'; addNextPlot(); }
        });
        function nextPlot() {
            closeSug();
            const list = plotsIn(wc, area);
            const i = list.findIndex(p => p.uid === uid);
            if (i >= 0 && i < list.length - 1) { uid = list[i + 1].uid; render(); focusFirst(); }
            else addNextPlot();
        }
        $('.pe-empty').addEventListener('change', e => {
            const res = setEmpty(wc, uid, e.target.checked);
            if (!res.ok) { e.target.checked = false; showQuickMsg(res.msg); }
            refresh();
        });
        $('[data-delplot]').addEventListener('click', async () => {
            const p = plot(); if (!p) return;
            const t = treeCount(p);
            const ok = await ask(`Delete Plot ${p.plot}${t ? ` and its ${plural(t, 'tree')}` : ''}?`, [
                { label: 'Delete plot', value: true, cls: 'delete-button' }, { label: 'Cancel', value: false }]);
            if (!ok) return;
            deletePlot(wc, p.uid);
            const rest = plotsIn(wc, area);
            uid = rest[0]?.uid || addPlot(wc, area, 1).uid;
            render();
        });

        // ---- move / renumber ----
        function updateMove() {
            const p = plot();
            const a = $('.pe-move-area').value, n = parseInt($('.pe-move-num').value, 10);
            const there = n >= 1 ? findPlot(wc, a, n, p.uid) : null;
            const warn = $('.pe-move-warn'), nb = $('[data-move-next]');
            warn.hidden = !there;
            warn.textContent = there ? `${duplicateMessage(there)}. Plots are never combined.` : '';
            const free = nextFreePlot(wc, a, p.uid);
            nb.hidden = !there;
            nb.textContent = `Use Plot ${free} instead`;
            nb.dataset.n = free;
            $('[data-move-ok]').disabled = !!there || !(n >= 1 && n <= MAX_PLOT) || (a === p.area && n === p.plot);
        }
        $('[data-move]').addEventListener('click', () => {
            const p = plot(); if (!p) return;
            $('.pe-move-title').textContent = `Move Plot ${p.plot} (Area ${p.area}, ${treeCount(p) ? plural(treeCount(p), 'tree') : 'no trees'}). Its trees and GPS points move with it.`;
            $('.pe-move-area').innerHTML = AREAS.map(a => `<option value="${a}">${a}</option>`).join('');
            $('.pe-move-area').value = p.area;
            $('.pe-move-num').value = p.plot;
            $('.pe-move').hidden = false;
            updateMove();
            $('.pe-move-num').select();
        });
        $('.pe-move-area').addEventListener('change', updateMove);
        $('.pe-move-num').addEventListener('input', updateMove);
        $('[data-move-next]').addEventListener('click', e => { $('.pe-move-num').value = e.target.dataset.n; updateMove(); });
        $('[data-move-cancel]').addEventListener('click', () => { $('.pe-move').hidden = true; });
        function doMove() {
            const res = movePlot(wc, uid, $('.pe-move-area').value, parseInt($('.pe-move-num').value, 10));
            if (!res.ok) { updateMove(); return; }
            $('.pe-move').hidden = true;
            area = res.plot.area;
            render();
        }
        $('[data-move-ok]').addEventListener('click', doMove);
        $('.pe-move').addEventListener('keydown', e => { if (e.key === 'Enter' && !$('[data-move-ok]').disabled) { e.preventDefault(); doMove(); } });

        // ---- quick line ----
        function showQuickMsg(msg) { const m = $('.pe-quickmsg'); m.textContent = msg || ''; m.hidden = !msg; }
        $('.pe-quick').addEventListener('focus', () => { lastUsed = 'quick'; });
        $('.pe-quick').addEventListener('input', () => showQuickMsg(''));
        $('.pe-quick').addEventListener('keydown', e => {
            if (e.key !== 'Enter' || e.ctrlKey || e.metaKey) return;
            e.preventDefault();
            const res = parseQuickLine(e.target.value, opts);
            if (!res.ok) { showQuickMsg(res.error); return; }
            appendRow(plot(), res.row);
            e.target.value = '';
            showQuickMsg(res.note ? `Added: ${res.note}` : '');
            buildGrid(); refresh(); renderTabs();
        });

        // ---- problems list ----
        $('.pe-problems').addEventListener('click', e => {
            const a = e.target.closest('[data-prob]'); if (!a) return;
            e.preventDefault();
            const x = lastSheet.problems[+a.dataset.prob]; if (!x) return;
            area = x.area; uid = x.uid; render();
            focusCell(x.row, x.col);
        });

        // ---- CSV, template, printable ----
        $('[data-opencsv]').addEventListener('click', () => $('[data-csvinput]').click());
        $('[data-csvinput]').addEventListener('change', e => {
            const f = e.target.files?.[0]; if (!f) return;
            const rd = new FileReader();
            rd.onload = () => {
                try {
                    const parsed = typeof parseTreeCsv === 'function' ? parseTreeCsv(String(rd.result)) : app().parseCsv(String(rd.result));
                    if (!parsed.length) throw new Error('No tree rows in that CSV.');
                    const res = addCsvPlots(wc, area, parsed);
                    const first = plotsIn(wc, area).find(p => p.plot === res.to[0]);
                    if (first) uid = first.uid;
                    render();
                    showQuickMsg(`${res.message}. Not saved until Save changes.`);
                } catch (err) { showQuickMsg(err.message); }
                e.target.value = '';
            };
            rd.readAsText(f);
        });
        $('[data-template]').addEventListener('click', downloadTemplate);
        $('[data-print]').addEventListener('click', openPrintable);

        // ---- save / close ----
        async function save() {
            refresh();
            if (lastSheet.errors) return false;
            const unknown = [];
            wc.plots.forEach(p => p.rows.forEach(r => {
                const c = checkRow(r, opts);
                if (c.issues.some(x => x.level === 'warn' && x.col === 'species')) unknown.push(r.species.trim());
            }));
            if (unknown.length) {
                const names = [...new Set(unknown)];
                const ok = await ask(`Save ${plural(unknown.length, 'tree')} with species not in your list: ${names.join(', ')}?`, [
                    { label: 'Save', value: true, cls: 'btn-success' }, { label: 'Keep editing', value: false }]);
                if (!ok) return false;
            }
            const d = diff();
            if (!d.changes) return true;
            const parts = [];
            if (d.added) parts.push(`${d.added} added`);
            if (d.edited) parts.push(`${d.edited} edited`);
            if (d.deleted) parts.push(`${d.deleted} removed`);
            if (d.moves.length) parts.push(`${plural(d.moves.length, 'plot')} moved`);
            if (d.emptyAdded) parts.push(`${plural(d.emptyAdded, 'empty plot')}`);
            const ok = await app().savePlotSheet(d.data, d.moves, parts.join(', '));
            if (!ok) return false;
            try { localStorage.removeItem(draftKey()); } catch (e) { /* ignore */ }
            const keepArea = area, keepPlot = plot()?.plot;
            wc = buildWorkingCopy(app().data());
            selectPlot(keepArea, keepPlot);
            render();
            app().showFeedback?.(`✓ Plots / Data saved: ${parts.join(', ')}`, false, 4000);
            return true;
        }
        $('[data-save]').addEventListener('click', () => { save(); });

        function close() {
            closeSug();
            modal.remove();
            document.removeEventListener('keydown', onKey, true);
            screen = null;
        }
        /** Close / Go to plot with unsaved changes: Save / Discard / Keep editing. */
        async function leave() {
            if (!diff().changes) { try { localStorage.removeItem(draftKey()); } catch (e) { /* ignore */ } return true; }
            const errs = lastSheet.errors;
            const choice = await ask(errs ? `There are unsaved changes (fix ${plural(errs, 'problem')} to save them).` : 'Save your changes?', [
                ...(errs ? [] : [{ label: 'Save', value: 'save', cls: 'btn-success' }]),
                { label: 'Discard', value: 'discard', cls: 'delete-button' }, { label: 'Keep editing', value: 'keep' }]);
            if (choice === 'save') return save();
            if (choice === 'discard') { try { localStorage.removeItem(draftKey()); } catch (e) { /* ignore */ } return true; }
            return false;
        }
        async function requestClose() { if (await leave()) close(); }
        modal.addEventListener('click', e => { if (e.target.closest('[data-close]')) requestClose(); });
        $('[data-goto-plot]').addEventListener('click', async () => {
            const p = plot(); if (!p) return;
            const a = p.area, n = p.plot;
            if (!(await leave())) return;
            close();
            app().goToPlot(a, n);
        });
        function onKey(e) {
            if (!modal.isConnected) return;
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); if ($('.pe-ask').hidden && $('.pe-move').hidden) nextPlot(); return; }
            if (e.key !== 'Escape') return;
            e.stopPropagation();
            if (!sugBox.hidden) { closeSug(); return; }
            if (askResolve) { cancelAsk(); return; }
            if (!$('.pe-move').hidden) { $('.pe-move').hidden = true; return; }
            requestClose();
        }
        document.addEventListener('keydown', onKey, true);

        screen = {
            /** Project switch: the draft stays in storage; it is offered when the screen opens again. */
            dismiss() { close(); },
        };

        // ---- start ----
        selectPlot(cur, curPlotNo);
        render();
        if (draft?.wc?.plots && draft.savedAt > (project?.updatedAt || 0)) {
            const when = new Date(draft.savedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
            const keepIt = await ask(`Keep unsaved changes from ${when}?`, [{ label: 'Keep', value: true, cls: 'btn-success' }, { label: 'Discard', value: false }]);
            if (!screen) return;
            if (keepIt) { wc = draft.wc; wc.plots.forEach(p => padRows(p.rows)); selectPlot(cur, curPlotNo); render(); }
            else { try { localStorage.removeItem(draftKey()); } catch (e) { /* ignore */ } }
        } else if (draft) { try { localStorage.removeItem(draftKey()); } catch (e) { /* ignore */ } }
        focusCell(Math.max(0, (plot()?.rows.findIndex(r => !hasContent(r)) ?? 0)), 'species');
    }

    function init() {
        document.getElementById('plotsDataBtn')?.addEventListener('click', openScreen);
        document.getElementById('paperGridBtn')?.addEventListener('click', openScreen);
        document.getElementById('paperTemplateBtn')?.addEventListener('click', downloadTemplate);
        document.getElementById('paperPrintBtn')?.addEventListener('click', openPrintable);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    window.TTPaperEntry = { COLS, TEMPLATE_HEADER, DBH_MIN, DBH_MAX, resolveSpecies, speciesMatches, roundDbh, setDbh, entryToRow, isDirty,
        checkRow, padRows, resolveDittos, buildWorkingCopy, findPlot, nextFreePlot, duplicateMessage, addPlot, movePlot, deletePlot, setEmpty,
        applyWorkingCopy, sheetProblems, parseQuickLine, appendRow, addCsvPlots, parsePaste, applyPaste, templateCsv, printableHtml,
        isYes, isDitto, open: openScreen, isOpen: () => !!screen, dismiss: () => screen?.dismiss(), downloadTemplate, openPrintable };
})();
// --- END OF FILE paper-entry.js ---

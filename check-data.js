// --- START OF FILE check-data.js ---
// ✓ Check Data on the Tally tab (ported from ForestScribe's field data checks, checks.ts).
// For each Area (or the one picked in the Tally tab's Area filter): skipped plot numbers,
// plots recorded empty, a plot with far more trees than the rest, likely double entries,
// log counts beyond the volume table, unusual sizes and plots without GPS.
// Tap a tree issue to open the Edit Entry box; the list refreshes after the edit.
(function () {
    'use strict';

    /** Seconds between two identical entries that look like a double tap (ForestScribe). */
    const DUPLICATE_SECONDS = 20;
    /** Entries saved less than this apart came in together (CSV import, sample), not a double tap. */
    const MIN_TAP_GAP_MS = 300;
    /** Trees this size and under carry no saw logs (ForestScribe MAX_ZERO_LOG_DBH). */
    const MAX_ZERO_LOG_DBH = 10;

    const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
    const list = nums => (nums.length > 8 ? `${nums.slice(0, 8).join(', ')}…` : nums.join(', '));
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const isCull = t => t.logs === 'Cull';
    const logsText = t => (isCull(t) ? 'Cull' : `${t.logs} logs`);
    const sameTree = (a, b) => a.plotNumber === b.plotNumber && a.species === b.species && String(a.dbh) === String(b.dbh) && String(a.logs) === String(b.logs);
    // Entries saved from the Data tab use Date.now() as their id, so the id is the time saved.
    const looksLikeTime = id => typeof id === 'number' && id > 1e12;

    /** Issues for one Area's entries: [{ level: 'warn'|'info', text, id? }] */
    function checkArea(entries, logRule, formClass) {
        const out = [];
        const trees = entries.filter(e => !e.emptyPlot);
        if (!entries.length) return out;
        const plotOf = e => parseInt(e.plotNumber, 10);

        // Plot numbering: gaps in the sequence, and plots recorded with no trees.
        const withTrees = new Set(trees.map(plotOf).filter(n => !isNaN(n)));
        const all = new Set(entries.map(plotOf).filter(n => !isNaN(n)));
        const max = Math.max(0, ...all);
        const missing = [];
        for (let i = 1; i <= max; i++) if (!all.has(i)) missing.push(i);
        if (missing.length) out.push({ level: 'warn', text: `Plot ${list(missing)} ${missing.length === 1 ? 'is' : 'are'} missing (no trees and not recorded as empty).` });
        const empty = [...all].filter(p => !withTrees.has(p)).sort((a, b) => a - b);
        if (empty.length) out.push({ level: 'info', text: `${plural(empty.length, 'plot')} recorded with no trees: ${list(empty)}.` });

        // A plot with far more trees than the rest is often two plots entered as one.
        const counts = [...withTrees].map(p => ({ p, n: trees.filter(t => plotOf(t) === p).length }));
        if (counts.length >= 4) {
            const avg = counts.reduce((a, c) => a + c.n, 0) / counts.length;
            counts.filter(c => c.n >= Math.max(8, avg * 2.5)).sort((a, b) => a.p - b.p)
                .forEach(c => out.push({ level: 'warn', text: `Plot ${c.p} has ${c.n} trees (average ${avg.toFixed(1)}) — two plots entered as one?` }));
        }

        // Same plot, species, DBH and logs saved within a few seconds: a double tap.
        // Without a time (older or imported entries), identical entries one after the other.
        const sorted = trees.slice().sort((a, b) => (looksLikeTime(a.id) && looksLikeTime(b.id) ? a.id - b.id : 0));
        for (let i = 1; i < sorted.length; i++) {
            const a = sorted[i - 1], b = sorted[i];
            if (!sameTree(a, b)) continue;
            if (looksLikeTime(a.id) && looksLikeTime(b.id)) {
                const gap = b.id - a.id;
                if (gap >= MIN_TAP_GAP_MS && gap < DUPLICATE_SECONDS * 1000)
                    out.push({ level: 'warn', id: b.id, text: `Possible duplicate: ${b.species} ${b.dbh}" ${logsText(b)} entered twice within ${DUPLICATE_SECONDS} s in plot ${b.plotNumber}.` });
            } else {
                out.push({ level: 'warn', id: b.id, text: `Possible double entry: ${b.species} ${b.dbh}" ${logsText(b)} entered twice in a row in plot ${b.plotNumber}.` });
            }
        }

        for (const t of trees) {
            const dbh = parseFloat(t.dbh), logs = parseFloat(t.logs);
            if (isNaN(dbh)) { out.push({ level: 'warn', id: t.id, text: `A tree in plot ${t.plotNumber} has no DBH.` }); continue; }
            // Log counts the volume table has no value for count as 0 board feet.
            if (!isCull(t) && logs > 0 && dbh > MAX_ZERO_LOG_DBH && typeof getTreeVolume === 'function' && getTreeVolume(String(t.dbh), String(t.logs), logRule, formClass) <= 0)
                out.push({ level: 'warn', id: t.id, text: `${t.species} ${t.dbh}" with ${t.logs} logs (plot ${t.plotNumber}) is beyond the ${logRule} volume table, so it counts as 0 board feet.` });
            // Unusual sizes: very large trees, and many logs on a small tree.
            if (dbh >= 40) out.push({ level: 'info', id: t.id, text: `${t.species} ${t.dbh}" in plot ${t.plotNumber} — check the DBH.` });
            else if (!isCull(t) && logs >= 4 && dbh <= 14) out.push({ level: 'warn', id: t.id, text: `${t.species} ${t.dbh}" with ${t.logs} logs in plot ${t.plotNumber} — unusually tall for its size.` });
            else if (!isCull(t) && logs > 0 && dbh <= MAX_ZERO_LOG_DBH) out.push({ level: 'warn', id: t.id, text: `${t.species} ${t.dbh}" with ${t.logs} logs in plot ${t.plotNumber} — trees ${MAX_ZERO_LOG_DBH}" and under have no saw logs, so it counts as 0 board feet.` });
            if (!t.species) out.push({ level: 'warn', id: t.id, text: `A ${t.dbh}" tree in plot ${t.plotNumber} has no species.` });
        }

        // Plots without a GPS location (only when some plots have one).
        const hasLoc = e => e.location && e.location.lat != null;
        const located = new Set(entries.filter(hasLoc).map(plotOf));
        const noGps = [...withTrees].filter(p => !located.has(p)).sort((a, b) => a - b);
        if (noGps.length && located.size) out.push({ level: 'info', text: `${plural(noGps.length, 'plot')} without a GPS location: ${list(noGps)}.` });
        return out;
    }

    let open = false;

    function render() {
        const box = document.getElementById('checkDataResults');
        const app = window.TTApp;
        if (!box || !app) return;
        if (!open) { box.hidden = true; box.innerHTML = ''; return; }
        const data = app.data() || [];
        const { logRule, formClass } = app.settings();
        const pick = app.tallyArea ? app.tallyArea() : 'ALL';
        const letters = [...new Set(data.map(e => e.areaLetter).filter(Boolean))].sort()
            .filter(l => pick === 'ALL' || l === pick);
        let html = '';
        let total = 0;
        for (const l of letters) {
            const entries = data.filter(e => e.areaLetter === l);
            const trees = entries.filter(e => !e.emptyPlot);
            const issues = checkArea(entries, logRule, formClass);
            const warn = issues.filter(i => i.level === 'warn').length;
            total += issues.length;
            const plots = new Set(entries.map(e => e.plotNumber)).size;
            html += `<div class="check-data-area">Area ${esc(l)}</div>`
                + `<p class="check-data-summary">${plural(trees.length, 'tree')} in ${plural(plots, 'plot')}. `
                + (!issues.length ? '<span class="ok">✓ No problems found.</span>' : warn ? `<span class="warn">${plural(warn, 'thing')} to look at.</span>` : 'Notes only, nothing looks wrong.')
                + '</p>';
            html += issues.map(i => {
                const inner = `<span class="cd-icon" aria-hidden="true">${i.level === 'warn' ? '⚠' : 'ℹ'}</span><span class="cd-text">${esc(i.text)}</span>`;
                return i.id != null
                    ? `<button type="button" class="check-data-item" data-id="${esc(i.id)}" title="Edit this tree">${inner}<span class="cd-edit">Edit</span></button>`
                    : `<div class="check-data-item">${inner}</div>`;
            }).join('');
        }
        if (!letters.length) html = '<p class="check-data-summary">No entries yet.</p>';
        else if (!total && letters.length > 1) html = '<p class="check-data-summary"><span class="ok">✓ No problems found.</span></p>' + html;
        box.innerHTML = html;
        box.hidden = false;
    }

    function setOpen(v) {
        open = v;
        const btn = document.getElementById('checkDataBtn');
        if (btn) { btn.setAttribute('aria-expanded', String(v)); btn.innerHTML = v ? '&#10003; Hide Check' : '&#10003; Check Data'; }
        render();
    }

    function init() {
        document.getElementById('checkDataBtn')?.addEventListener('click', () => setOpen(!open));
        document.getElementById('checkDataResults')?.addEventListener('click', e => {
            const b = e.target.closest('.check-data-item[data-id]');
            if (!b) return;
            const raw = b.dataset.id;
            window.TTApp?.editEntry(isNaN(Number(raw)) ? raw : Number(raw));
        });
        document.addEventListener('tt:entries-changed', render);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    window.TTCheckData = { refresh: render, checkArea };
})();
// --- END OF FILE check-data.js ---

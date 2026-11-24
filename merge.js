// --- START OF FILE merge.js ---
// ⇄ Merge Another Device (ported from ForestScribe's merge in src/db/backup.ts):
// adds the trees from another phone's backup (.json) or TimberTally CSV to the
// OPEN project, keeping each tree's Area letter. A safety copy is taken first,
// exact duplicates are skipped, and plots that collide are either combined
// (two people on one plot) or renumbered after the last plot (default).
// Uses window.ttProject (script.js) and window.TTStore (storage.js).

(function () {
    'use strict';

    const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

    // ---- Reading the file ----
    function parseCsvLine(line) {
        const out = []; let cur = '', q = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (q) {
                if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
                else if (ch === '"') q = false;
                else cur += ch;
            } else if (ch === '"') q = true;
            else if (ch === ',') { out.push(cur); cur = ''; }
            else cur += ch;
        }
        out.push(cur);
        return out;
    }

    /** Trees from a TimberTally CSV export (the raw section at the top; one or more Area files joined is fine). */
    function parseTimberTallyCsv(text) {
        // Records, not lines: a quoted note may hold line breaks (csv-match.js splitCsvRecords).
        const lines = splitCsvRecords(String(text).replace(/^\uFEFF/, ''));
        const data = [];
        let cols = null, base = Date.now();
        for (const line of lines) {
            if (!line.trim() || line.startsWith('---')) { cols = null; continue; }
            const cells = parseCsvLine(line);
            if (/^plot\s*number$/i.test(cells[0]?.trim()) || /^plot$/i.test(cells[0]?.trim())) {
                cols = cells.map(c => c.trim().toLowerCase().replace(/\s+/g, ''));
                continue;
            }
            if (!cols) continue;
            const get = k => { const i = cols.indexOf(k); return i >= 0 ? (cells[i] ?? '').trim() : ''; };
            const plot = parseInt(get('plotnumber') || get('plot'), 10);
            const area = (get('area') || 'A').toUpperCase();
            if (isNaN(plot) || !/^[A-Z]$/.test(area)) continue;
            const lat = parseFloat(get('latitude')), lon = parseFloat(get('longitude'));
            const location = !isNaN(lat) && !isNaN(lon) ? { lat, lon } : null;
            if (get('species') === 'EMPTY PLOT') {
                data.push({ id: base++, emptyPlot: true, plotNumber: plot, areaLetter: area, species: '', dbh: '', logs: '', cutStatus: 'No', ugsStatus: 'No', notes: '', location });
                continue;
            }
            data.push({
                id: base++, plotNumber: plot, areaLetter: area,
                dbh: get('dbh'), species: csvUnguard(get('species')), logs: get('logs'),
                cutStatus: /^y/i.test(get('cut')) ? 'Yes' : 'No', ugsStatus: /^y/i.test(get('ugs')) ? 'Yes' : 'No',
                notes: csvUnguard(get('notes')), location,
            });
        }
        if (!data.length) throw new Error('No TimberTally trees were found in this CSV.');
        return data;
    }

    /** [{ name, project, csv }] from the chosen file. */
    async function readSources(file) {
        const text = await file.text();
        if (/\.json$/i.test(file.name) || text.trim().startsWith('{')) {
            const b = window.TTStore.parseBackup(text);
            return b.projects.map(p => window.TTStore.normalizeProject(p))
                .filter(p => p.data.length)
                .map(p => ({ name: p.name, project: p, csv: false }));
        }
        return [{ name: file.name, project: { name: file.name, data: parseTimberTallyCsv(text), areaNotes: {}, areaRegen: {}, areaAcres: {} }, csv: true }];
    }

    // ---- Merging ----
    const locKey = l => (l && l.lat != null ? `${Number(l.lat).toFixed(6)},${Number(l.lon).toFixed(6)}` : '');
    const contentKey = e => [e.areaLetter, parseInt(e.plotNumber, 10), e.emptyPlot ? 'EMPTY' : e.species, e.dbh, e.logs, e.cutStatus || 'No', e.ugsStatus || 'No', (e.notes || '').trim(), locKey(e.location)].join('|');

    /**
     * @param {Array} mine   - open project's entries
     * @param {Array} theirs - entries to add
     * @param {'renumber'|'combine'} mode
     * @param {boolean} byId - entries carry ids from the other device (backup): a duplicate must match id too
     */
    function mergeEntries(mine, theirs, mode, byId) {
        // Duplicates: the same tree already here (merging the same file twice, or a copy of this phone's data).
        const have = new Map();
        for (const e of mine) {
            const k = contentKey(e) + (byId ? `#${e.id}` : '');
            have.set(k, (have.get(k) || 0) + 1);
        }
        let skipped = 0;
        const fresh = [];
        for (const e of theirs) {
            const k = contentKey(e) + (byId ? `#${e.id}` : '');
            if (have.get(k) > 0) { have.set(k, have.get(k) - 1); skipped++; } else fresh.push(e);
        }

        const plotsOf = (list, a) => new Set(list.filter(e => e.areaLetter === a).map(e => parseInt(e.plotNumber, 10)).filter(n => !isNaN(n)));
        const areas = [...new Set(fresh.map(e => e.areaLetter))].sort();
        const perArea = [];
        let idBase = Date.now(), renumbered = 0, combined = 0;
        const added = [];
        for (const a of areas) {
            const minePlots = plotsOf(mine, a), theirPlots = [...plotsOf(fresh, a)].sort((x, y) => x - y);
            const clash = theirPlots.filter(p => minePlots.has(p));
            const map = new Map(theirPlots.map(p => [p, p]));
            if (clash.length && mode === 'renumber') {
                // Every incoming plot of this Area moves after the last plot here, in order.
                let next = Math.max(0, ...minePlots) + 1;
                for (const p of theirPlots) map.set(p, next++);
                renumbered += theirPlots.length;
            } else combined += clash.length;
            const list = fresh.filter(e => e.areaLetter === a);
            for (const e of list) added.push({ ...e, id: idBase++, plotNumber: Math.min(999, map.get(parseInt(e.plotNumber, 10)) ?? e.plotNumber) });
            perArea.push({ area: a, trees: list.filter(e => !e.emptyPlot).length, plots: theirPlots.length, clash: clash.length, first: Math.min(...theirPlots.map(p => map.get(p))), last: Math.max(...theirPlots.map(p => map.get(p))) });
        }
        let out = mine.concat(added);
        // A plot that now holds trees is no longer an empty plot; keep one empty record per plot.
        const withTrees = new Set(out.filter(e => !e.emptyPlot).map(e => `${e.areaLetter}|${parseInt(e.plotNumber, 10)}`));
        const seenEmpty = new Set();
        out = out.filter(e => {
            if (!e.emptyPlot) return true;
            const k = `${e.areaLetter}|${parseInt(e.plotNumber, 10)}`;
            if (withTrees.has(k) || seenEmpty.has(k)) return false;
            seenEmpty.add(k); return true;
        });
        return { data: out, added: added.filter(e => !e.emptyPlot).length, addedEmpty: added.filter(e => e.emptyPlot).length, skipped, renumbered, combined, perArea };
    }

    /** Area notes (appended under a "from" line when different), regeneration and acres (blanks filled). */
    function mergeAreaInfo(project, other, fromName) {
        const notes = [], filled = [];
        project.areaNotes = project.areaNotes || {};
        project.areaRegen = project.areaRegen || {};
        project.areaAcres = project.areaAcres || {};
        for (const [a, text] of Object.entries(other.areaNotes || {})) {
            const t = String(text || '').trim(), m = String(project.areaNotes[a] || '').trim();
            if (!t || m === t || m.includes(t)) continue;
            project.areaNotes[a] = m ? `${m}\n\n— from ${fromName} —\n${t}` : t;
            notes.push(a);
        }
        for (const [a, r] of Object.entries(other.areaRegen || {})) if (!project.areaRegen[a]) { project.areaRegen[a] = r; filled.push(`${a} regeneration`); }
        for (const [a, v] of Object.entries(other.areaAcres || {})) if (!(project.areaAcres[a] > 0) && v > 0) { project.areaAcres[a] = v; filled.push(`${a} acres`); }
        return { notes, filled };
    }

    /** "plot 10" for one plot, "plots 10–12" for a range. */
    const plotRange = (a, b) => (a === b ? `plot ${a}` : `plots ${a}–${b}`);
    /** The lines of the summary shown after a merge. */
    function mergeSummary(r, info, mode, name) {
        const areas = r.perArea.filter(a => a.trees || a.plots).map(a => `Area ${a.area}: ${a.trees} tree${a.trees === 1 ? '' : 's'}, ${plotRange(a.first, a.last)}${a.clash ? (mode === 'combine' ? ` (${a.clash} combined)` : ' (renumbered)') : ''}`);
        return [
            `Added ${r.added} tree${r.added === 1 ? '' : 's'}${r.addedEmpty ? ` and ${r.addedEmpty} empty plot${r.addedEmpty === 1 ? '' : 's'}` : ''} from ${name}.`,
            ...areas,
            r.skipped ? `${r.skipped} exact duplicate${r.skipped === 1 ? '' : 's'} skipped.` : '',
            info.notes.length ? `Area notes added for ${info.notes.join(', ')}.` : '',
            info.filled.length ? `Filled in: ${info.filled.join(', ')}.` : '',
            'A safety copy from before the merge is on this tab.',
        ].filter(Boolean);
    }

    window.TTMerge = { parseTimberTallyCsv, mergeEntries, mergeAreaInfo, mergeSummary, plotRange };

    // ---- Dialog ----
    let modal = null, sources = [], fileName = '';
    function feedback(msg, err) {
        const el = document.getElementById('mergeFeedback');
        if (!el) return;
        el.textContent = msg;
        el.className = `feedback-message ${err ? 'error' : 'success'}`;
        el.style.display = 'block';
        el.style.whiteSpace = 'pre-line';   // one line per Area
        el.style.opacity = 1;
    }
    function closeModal() { if (modal) modal.style.display = 'none'; }

    function openModal() {
        const cur = window.ttProject?.get();
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mergeModal';
            modal.className = 'modal-overlay';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-label', 'Merge another device');
            document.body.appendChild(modal);
            modal.addEventListener('click', e => {
                if (e.target === modal || e.target.id === 'mergeCancel' || e.target.id === 'mergeCancelX') closeModal();
                else if (e.target.id === 'mergeGo') runMerge();
            });
        }
        const opts = sources.map((s, i) => `<option value="${i}">${esc(s.name)} (${s.project.data.filter(e => !e.emptyPlot).length} trees)</option>`).join('');
        modal.innerHTML = `<div class="modal-content merge-modal">
            <button type="button" id="mergeCancelX" class="modal-close-btn" title="Close">&#215;</button>
            <h2>&#8644; Merge Another Device</h2>
            <p class="notes-hint">From <b>${esc(fileName)}</b> into the open project <b>${esc(cur?.name || '')}</b>. Each tree keeps its Area letter.</p>
            ${sources.length > 1 ? `<div class="input-group"><label for="mergeProject">Project in the file:</label><select id="mergeProject">${opts}</select></div>` : `<p class="notes-hint">${opts.replace(/<[^>]+>/g, '')}</p>`}
            <fieldset class="merge-choice"><legend>Plot numbers already used in the same Area:</legend>
                <label><input type="radio" name="mergeMode" value="renumber" checked> <b>Different plots</b> — renumber after the last plot</label>
                <label><input type="radio" name="mergeMode" value="combine"> <b>Same plots</b> — combine trees (two people tallying one plot)</label>
            </fieldset>
            <div class="recs-modal-actions">
                <button type="button" id="mergeCancel" class="control-button btn-secondary">Cancel</button>
                <button type="button" id="mergeGo" class="control-button btn-success">Merge</button>
            </div></div>`;
        modal.style.display = 'flex';
    }

    async function runMerge() {
        const api = window.ttProject;
        const project = api?.get();
        if (!project) return;
        const src = sources[parseInt(document.getElementById('mergeProject')?.value || '0', 10)];
        const mode = modal.querySelector('input[name="mergeMode"]:checked')?.value === 'combine' ? 'combine' : 'renumber';
        if (src.project.id && src.project.id === project.id && !confirm('This looks like the open project itself. Merge anyway? (Duplicates are skipped.)')) return;
        if (!(await api.safetyCopy(`Before merging ${src.name}`))) return;
        const r = mergeEntries(api.getData(), src.project.data, mode, !src.csv);
        const info = mergeAreaInfo(project, src.project, src.name);
        const ok = api.setData(r.data);
        closeModal();
        const lines = mergeSummary(r, info, mode, src.name);
        // Shown in the Merge section's message area on the Projects tab (no browser alert box).
        feedback(ok ? lines.join('\n') : 'Merged, but the project could not be saved (device storage is full).', !ok);
        document.getElementById('mergeFeedback')?.scrollIntoView?.({ block: 'nearest' });
    }

    document.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('mergeDeviceBtn'), input = document.getElementById('mergeDeviceInput');
        if (!btn || !input) return;
        btn.addEventListener('click', () => { input.value = ''; input.click(); });
        input.addEventListener('change', async () => {
            const file = input.files?.[0];
            if (!file) return;
            try {
                sources = await readSources(file);
                fileName = file.name;
                if (!sources.length) throw new Error('This backup has no projects with trees.');
                openModal();
            } catch (e) { feedback(e.message || String(e), true); }
        });
        document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal?.style.display === 'flex') closeModal(); });
    });
})();

// --- START OF FILE wording.js ---
// Standard Wording (☰ Menu → Standard Wording), modeled on ForestScribe's WordingEditor.
//   • Every recommendation in the library (recommendations-data.js), by category, can be
//     rewritten in the forester's own words (title and text), reset to the standard wording,
//     or all reset at once. Forester's own library recommendations can be added to a category
//     and deleted again.
//   • Saved on this device under tt3.wording ({ recs: { id: {title?, text?} }, added: [...] })
//     and included in Save Backup / Restore Backup (storage.js).
//   • The Recs tab library buttons and newly added recommendations use this wording
//     (recommendations.js reads TTWording.library()). Recommendations already added to an
//     Area keep their text.
//   • {{blanks}} (asked for when a recommendation is added) and {{TOKENS}} / [[if:…]] wording
//     must survive an edit: a warning shows when one is missing from the edited text.
(function () {
    'use strict';

    const KEY = window.TTStore?.K?.wording || 'tt3.wording';
    const BASE = Array.isArray(window.REC_LIBRARY) ? window.REC_LIBRARY : [];
    const BASE_CATS = [...new Set(BASE.map(r => r.category))];
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    function read() {
        try {
            const w = window.TTStore ? window.TTStore.readJSON(KEY, null) : JSON.parse(localStorage.getItem(KEY) || 'null');
            return { recs: (w && typeof w.recs === 'object' && w.recs) || {}, added: (w && Array.isArray(w.added)) ? w.added : [] };
        } catch (e) { return { recs: {}, added: [] }; }
    }
    function write(w) {
        // Drop empty edits so an all-standard library stores nothing.
        const recs = {};
        for (const [id, e] of Object.entries(w.recs || {})) {
            const out = {};
            if (typeof e?.title === 'string') out.title = e.title;
            if (typeof e?.text === 'string') out.text = e.text;
            if (Object.keys(out).length) recs[id] = out;
        }
        const val = { recs, added: w.added || [] };
        try {
            if (window.TTStore) window.TTStore.writeJSON(KEY, val);
            else localStorage.setItem(KEY, JSON.stringify(val));
        } catch (e) { console.warn('[Wording] could not save', e); }
        window.TTRecs?.render?.();
    }

    /** The library with this device's wording: edited items, then the forester's own items. */
    function library() {
        const w = read();
        const out = BASE.map(r => {
            const e = w.recs[r.id];
            return e ? { ...r, title: e.title ?? r.title, text: e.text ?? r.text, edited: true } : r;
        });
        for (const a of w.added) {
            if (a && a.id && typeof a.text === 'string') out.push({ id: a.id, category: a.category || BASE_CATS[0], title: a.title || 'Untitled', text: a.text, custom: true });
        }
        return out;
    }
    function categories() {
        return [...new Set([...BASE_CATS, ...library().map(r => r.category)])];
    }

    /** {{blanks}}, {{TOKENS}} and [[if:…]] / [[else]] / [[/if]] marks in a text. */
    const marksIn = t => [...new Set((String(t || '').match(/\{\{\s*[\w.]+\s*\}\}|\[\[[^\]]*\]\]/g) || []).map(m => m.replace(/\s+/g, '')))];
    function missingMarks(standard, text) {
        const have = new Set(marksIn(text));
        return marksIn(standard).filter(m => !have.has(m));
    }

    // ============================================================
    // EDITOR
    // ============================================================
    let ov = null, openId = null, query = '';

    function addStyle() {
        if (document.getElementById('ttWordingStyle')) return;
        const s = document.createElement('style');
        s.id = 'ttWordingStyle';
        s.textContent = `
.tt-wording-modal{max-width:720px;text-align:left;}
.tt-wording-modal h2{margin-top:0;}
.tt-wording-hint{font-size:.85em;color:var(--text-muted);line-height:1.45;margin:0 0 8px;}
.tt-wording-hint code{background:var(--forest-pale);padding:0 3px;border-radius:3px;}
.tt-wording-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0;}
.tt-wording-tools input[type=search]{flex:1;min-width:140px;padding:6px 8px;border:1px solid var(--forest-border);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-dark);}
.tt-wording-cat{border:1px solid var(--forest-border);border-radius:var(--radius-md);margin:8px 0;background:var(--bg-card);}
.tt-wording-cat>summary{cursor:pointer;padding:8px 10px;font-weight:700;color:var(--forest-dark);}
.tt-wording-item{border-top:1px solid var(--forest-border);padding:6px 10px;}
.tt-wording-row{display:flex;align-items:center;gap:8px;}
.tt-wording-row .grow{flex:1;min-width:0;}
.tt-wording-row button.tt-wording-open{background:none;border:none;color:var(--text-dark);text-align:left;font:inherit;cursor:pointer;padding:4px 0;width:100%;}
.tt-badge{font-size:.72em;font-weight:700;padding:1px 6px;border-radius:8px;margin-left:6px;background:var(--forest-pale);color:var(--forest-dark);white-space:nowrap;}
.tt-badge.own{background:#e7f1fb;color:#0b5394;}
body.dark-mode .tt-badge.own{background:#16314a;color:#9cc8f0;}
.tt-wording-edit{margin:6px 0 4px;}
.tt-wording-edit input,.tt-wording-edit textarea,.tt-wording-edit select{width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--forest-border);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-dark);font:inherit;font-size:.92em;}
.tt-wording-edit textarea{min-height:160px;line-height:1.4;}
.tt-wording-edit label{display:block;font-size:.8em;color:var(--text-muted);margin:6px 0 2px;}
.tt-wording-warn{font-size:.82em;color:#8a6412;background:#fffaeb;border:1px solid #e2c26b;border-radius:var(--radius-sm);padding:4px 8px;margin-top:6px;}
body.dark-mode .tt-wording-warn{background:#3a3010;color:#f0d080;border-color:#806a20;}
.tt-wording-btns{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px;}
.tt-wording-modal .modal-actions{display:flex;justify-content:flex-end;margin-top:10px;}`;
        document.head.appendChild(s);
    }

    function itemHtml(r, w) {
        const base = BASE.find(b => b.id === r.id);
        const own = !!r.custom;
        const isOpen = openId === r.id;
        const badge = own ? '<span class="tt-badge own">Yours</span>' : r.edited ? '<span class="tt-badge">Edited</span>' : '';
        let body = '';
        if (isOpen) {
            const missing = base ? missingMarks(base.text, r.text) : [];
            body = `<div class="tt-wording-edit">
                <label for="ttwTitle">Title</label>
                <input type="text" id="ttwTitle" data-f="title" value="${esc(r.title)}">
                ${own ? `<label for="ttwCat">Category</label><select id="ttwCat" data-f="category">${categories().map(c => `<option ${c === r.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>` : ''}
                <label for="ttwText">Text</label>
                <textarea id="ttwText" data-f="text" rows="10">${esc(r.text)}</textarea>
                <div class="tt-wording-warn" data-warn ${missing.length ? '' : 'hidden'}>${warnText(missing)}</div>
                <div class="tt-wording-btns">
                    ${own ? '<button type="button" class="control-button delete-button" data-act="delete">Delete</button>'
                          : `<button type="button" class="control-button btn-secondary" data-act="reset" ${w.recs[r.id] ? '' : 'disabled'}>Reset to standard</button>`}
                    <span style="flex:1"></span>
                    <button type="button" class="control-button btn-success" data-act="close">Done</button>
                </div></div>`;
        }
        return `<div class="tt-wording-item" data-id="${esc(r.id)}">
            <div class="tt-wording-row"><span class="grow"><button type="button" class="tt-wording-open" data-act="open" aria-expanded="${isOpen}">${isOpen ? '&#9662;' : '&#9656;'} ${esc(r.title)}${badge}</button></span></div>
            ${body}</div>`;
    }
    function warnText(missing) {
        if (!missing.length) return '';
        return `&#9888; The standard wording has ${missing.map(m => `<b>${esc(m)}</b>`).join(', ')}, which this text no longer has. `
            + `{{blanks}} are asked for when the recommendation is added, and {{TOKENS}} / [[if]] marks fill in the county, phone and agency. Type it back in to keep it.`;
    }

    function renderCount(w) {
        const changed = Object.keys(w.recs).length + w.added.length;
        ov.querySelector('[data-count]').textContent = changed ? `${changed} changed or added` : 'All standard wording';
        ov.querySelector('[data-act="resetAll"]').disabled = !changed;
    }
    function render() {
        if (!ov) return;
        const w = read();
        const lib = library();
        const q = query.trim().toLowerCase();
        renderCount(w);
        const list = ov.querySelector('[data-list]');
        const openCats = new Set([...list.querySelectorAll('details[open]')].map(d => d.dataset.cat));
        list.innerHTML = categories().map(cat => {
            const items = lib.filter(r => r.category === cat && (!q || r.id === openId || r.title.toLowerCase().includes(q) || r.text.toLowerCase().includes(q)));
            if (!items.length) return '';
            const isOpen = q || openCats.has(cat) || items.some(r => r.id === openId);
            const n = items.filter(r => r.edited || r.custom).length;
            return `<details class="tt-wording-cat" data-cat="${esc(cat)}" ${isOpen ? 'open' : ''}>
                <summary>${esc(cat)} <span class="tt-wording-count" style="font-weight:400;color:var(--text-muted)">(${items.length}${n ? `, ${n} changed` : ''})</span></summary>
                ${items.map(r => itemHtml(r, w)).join('')}
                <div class="tt-wording-item"><button type="button" class="link-btn" data-act="add" data-cat="${esc(cat)}">+ Add your own to ${esc(cat)}</button></div>
            </details>`;
        }).join('') || '<p class="placeholder-msg">Nothing matches.</p>';
    }

    function update(id, field, value) {
        const w = read();
        const own = w.added.find(a => a.id === id);
        if (own) own[field] = value;
        else {
            const base = BASE.find(b => b.id === id);
            if (!base || (field !== 'title' && field !== 'text')) return;
            const e = { ...(w.recs[id] || {}) };
            if (value === base[field]) delete e[field]; else e[field] = value;
            w.recs[id] = e;
        }
        write(w);
    }

    function onClick(e) {
        if (e.target === ov || e.target.closest('[data-close]')) { close(); return; }
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const item = b.closest('[data-id]');
        const id = item?.dataset.id;
        const act = b.dataset.act;
        const w = read();
        if (act === 'open') { openId = openId === id ? null : id; render(); ov.querySelector('#ttwText')?.focus(); }
        else if (act === 'close') { openId = null; render(); }
        else if (act === 'reset') {
            if (!confirm('Put back the standard wording for this recommendation? Your changes to it will be lost.')) return;
            delete w.recs[id]; write(w); render();
        } else if (act === 'delete') {
            const a = w.added.find(x => x.id === id);
            if (!confirm(`Delete "${a?.title || 'this recommendation'}" from your library? Areas that already have it keep their copy.`)) return;
            w.added = w.added.filter(x => x.id !== id); openId = null; write(w); render();
        } else if (act === 'add') {
            const nid = 'own-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            w.added.push({ id: nid, category: b.dataset.cat, title: 'My recommendation', text: '' });
            write(w); openId = nid; query = ''; ov.querySelector('[data-q]').value = ''; render();
            const t = ov.querySelector('#ttwTitle'); if (t) { t.focus(); t.select(); }
        } else if (act === 'resetAll') {
            const n = Object.keys(w.recs).length, m = w.added.length;
            if (!confirm(`Reset all wording to standard?\n\n${n} edited recommendation${n === 1 ? '' : 's'} go back to the standard wording${m ? ` and your ${m} own recommendation${m === 1 ? ' is' : 's are'} deleted` : ''}. Areas that already have them keep their text.`)) return;
            write({ recs: {}, added: [] }); openId = null; render();
        }
    }
    function onInput(e) {
        if (e.target.matches('[data-q]')) { query = e.target.value; render(); return; }
        const f = e.target.dataset.f;
        const id = e.target.closest('[data-id]')?.dataset.id;
        if (!f || !id) return;
        update(id, f, e.target.value);
        if (f === 'text') {
            const base = BASE.find(b => b.id === id);
            const warn = e.target.closest('[data-id]').querySelector('[data-warn]');
            const missing = base ? missingMarks(base.text, e.target.value) : [];
            if (warn) { warn.hidden = !missing.length; warn.innerHTML = warnText(missing); }
        }
        // Keep the badge / reset button honest without re-rendering the box being typed in.
        const reset = e.target.closest('[data-id]').querySelector('[data-act="reset"]');
        const w = read();
        if (reset) reset.disabled = !w.recs[id];
        renderCount(w);
    }
    function onChange(e) { if (e.target.dataset.f === 'category' || e.target.dataset.f === 'title') render(); }
    function onKey(e) { if (e.key === 'Escape' && ov && ov.style.display !== 'none') close(); }

    function open() {
        addStyle();
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'ttWordingModal';
            ov.className = 'modal-overlay';
            ov.setAttribute('role', 'dialog');
            ov.setAttribute('aria-modal', 'true');
            ov.setAttribute('aria-labelledby', 'ttWordingTitle');
            ov.innerHTML = `<div class="modal-content tt-wording-modal">
                <button type="button" class="modal-close-btn" data-close title="Close">&#215;</button>
                <h2 id="ttWordingTitle">Standard Wording</h2>
                <p class="tt-wording-hint">Rewrite any recommendation in the library in your own words, or add your own. The Recs tab library buttons use this wording from now on. <b>Recommendations already added to an Area keep their text</b> (change those on the Recs tab).</p>
                <p class="tt-wording-hint">Markup: <code>**bold**</code>, <code>__underline__</code>, a line starting with <code>• </code> is a bullet, a blank line starts a new paragraph. Keep <code>{{blanks}}</code> (asked for when added, e.g. the pest or species) and <code>{{COUNTY}}</code>-style marks as they are.</p>
                <div class="tt-wording-tools">
                    <input type="search" data-q placeholder="Search recommendations" aria-label="Search recommendations">
                    <span data-count class="tt-wording-hint" style="margin:0"></span>
                    <button type="button" class="control-button btn-secondary" data-act="resetAll">Reset all</button>
                </div>
                <div data-list></div>
                <div class="modal-actions"><button type="button" class="control-button btn-success" data-close>Done</button></div>
            </div>`;
            ov.addEventListener('click', onClick);
            ov.addEventListener('input', onInput);
            ov.addEventListener('change', onChange);
            document.body.appendChild(ov);
        }
        openId = null; query = ''; ov.querySelector('[data-q]').value = '';
        ov.style.display = 'flex';
        render();
        document.addEventListener('keydown', onKey);
        ov.querySelector('.modal-close-btn')?.focus();
    }
    function close() {
        if (ov) ov.style.display = 'none';
        document.removeEventListener('keydown', onKey);
        window.TTRecs?.render?.();
    }

    window.TTWording = { library, categories, open, close, read, missingMarks };
})();
// --- END OF FILE wording.js ---

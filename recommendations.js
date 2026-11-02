// --- START OF FILE recommendations.js ---
// Recommendation Builder (Recs tab): a stripped-down port of the ForestScribe
// recommendation library. Tap library buttons to add recommendations to an Area,
// edit the wording, then Preview and copy the finished text into your plan.
// Depends on recommendations-data.js (window.REC_LIBRARY) and two hooks exposed
// by script.js: window.ttGetDataAreas() and window.ttGetCurrentArea().

(function () {
    'use strict';

    // Plan details are kept once per device; the per-area lists belong to the open project (script.js).
    const DETAILS_KEY = window.TTStore?.K.recDetails || 'tt3.recDetails';
    const LIBRARY = Array.isArray(window.REC_LIBRARY) ? window.REC_LIBRARY : [];
    const CATEGORIES = [...new Set(LIBRARY.map(r => r.category))];

    const US_STATES = [
        ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],['CA','California'],['CO','Colorado'],
        ['CT','Connecticut'],['DE','Delaware'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],['ID','Idaho'],
        ['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],
        ['ME','Maine'],['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],['MS','Mississippi'],
        ['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],
        ['NM','New Mexico'],['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],['OK','Oklahoma'],
        ['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],
        ['TX','Texas'],['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],['WV','West Virginia'],
        ['WI','Wisconsin'],['WY','Wyoming'],
    ];
    const stateName = code => (US_STATES.find(([c]) => c === code) || [code, code])[1];

    // Services a non-agency organization can offer; each turns on its sentence in the library.
    const SERVICES = [
        { id: 'marking', label: 'Timber marking & tally' },
        { id: 'tsi-marking', label: 'TSI / crop tree marking' },
        { id: 'invasive-marking', label: 'Invasive plant marking' },
        { id: 'buyer-list', label: 'Timber buyer list' },
    ];

    const STATE_PACKS = {
        KY: { region: 'Kentucky', bmpGuide: 'the Kentucky Forest Practice Guidelines for Water Quality Management' },
    };
    const GENERIC_PACK = { region: 'this region', bmpGuide: "your state's forestry best management practices (BMP) guidelines" };

    const DEFAULT_DETAILS = {
        state: 'KY', orgType: 'consultant', orgName: '', orgShort: '', services: [], markingFee: '',
        county: '', nrcsPhone: '', officePhone: '',
    };

    // ============================================================
    // STATE
    // ============================================================
    const store = {
        details: { ...DEFAULT_DETAILS },
        /** { A: [recommendation, …], B: … } for the open project. */
        get areas() { return window.ttGetProjectRecs ? window.ttGetProjectRecs() : (this._areas ||= {}); },
    };
    let currentArea = null;
    let mode = 'edit';
    let openCats = new Set(CATEGORIES.slice(0, 1));

    function load() {
        const d = window.TTStore ? window.TTStore.readJSON(DETAILS_KEY, null) : null;
        store.details = { ...DEFAULT_DETAILS, ...(d || {}) };
    }
    function save() {
        if (window.TTStore) window.TTStore.writeJSON(DETAILS_KEY, store.details);
        window.ttSaveProjectRecs?.();
    }
    const recs = () => (store.areas[currentArea] ||= []);
    const newId = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

    // ============================================================
    // TEXT RESOLUTION (state/organization wording + placeholders)
    // ============================================================
    function orgContext() {
        const d = store.details;
        const pack = { ...GENERIC_PACK, ...(STATE_PACKS[d.state] || {}) };
        const name = stateName(d.state);
        const isAgency = d.orgType === 'state-agency';
        const orgName = d.orgName.trim() || (isAgency && d.state === 'KY' ? 'Kentucky Division of Forestry' : 'our office');
        const fee = d.markingFee.trim();
        return {
            state: d.state,
            agency: isAgency,
            kdf: isAgency && d.state === 'KY',
            services: d.services || [],
            tokens: {
                STATE_NAME: name,
                STATE_POSS: `${name}'s`,
                REGION: pack.region,
                ORG_NAME: orgName,
                ORG_SHORT: d.orgShort.trim() || (orgName === 'Kentucky Division of Forestry' ? 'KDF' : orgName),
                MARKING_FEE_TEXT: fee ? ` for a fee of ${fee}` : '',
                BMP_GUIDE: pack.bmpGuide,
            },
        };
    }

    function testCond(cond, ctx) {
        return cond.split('+').every(raw => {
            const neg = raw.startsWith('!');
            const t = neg ? raw.slice(1) : raw;
            let v = false;
            if (t.startsWith('state:')) v = ctx.state === t.slice(6);
            else if (t.startsWith('service:')) v = ctx.services.includes(t.slice(8));
            else if (t === 'agency') v = ctx.agency;
            else if (t === 'kdf') v = ctx.kdf;
            return neg ? !v : v;
        });
    }

    const BLOCK = /\[\[if:([^\]]+)\]\]([\s\S]*?)(?:\[\[else\]\]([\s\S]*?))?\[\[\/if\]\]/g;

    /** Library text worded for this state/organization (plan-specific tokens are left for preview). */
    function resolveOrgText(text) {
        const ctx = orgContext();
        return text
            .replace(BLOCK, (_m, cond, yes, no) => (testCond(cond.trim(), ctx) ? yes : (no || '')))
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in ctx.tokens ? ctx.tokens[k] : m));
    }

    /** Final text for the preview: plan details filled in, unfilled blanks become write-in lines. */
    function fillPlaceholders(text) {
        const d = store.details;
        const map = {
            COUNTY: d.county.trim() || '________',
            NRCS_PHONE: d.nrcsPhone.trim() || '(___) ___-____',
            OFFICE_PHONE: d.officePhone.trim() || '(___) ___-____',
            FORESTER_PHONE: d.officePhone.trim() || '(___) ___-____',
            WATERSHED: '________',
            AREA: currentArea || '',
        };
        return resolveOrgText(text)
            .replace(/\{\{([A-Z_]+)\}\}/g, (m, k) => (k in map ? map[k] : m))
            .replace(/\{\{[a-z][A-Za-z0-9]*\}\}/g, '________');
    }

    const missingInputs = text => [...new Set([...text.matchAll(/\{\{([a-z][A-Za-z0-9]*)\}\}/g)].map(m => m[1]))];
    const applyInputs = (text, values) => text.replace(/\{\{([a-z][A-Za-z0-9]*)\}\}/g, (m, k) => (values[k] || '').trim() || m);

    // ============================================================
    // MARKUP -> HTML / PLAIN TEXT
    // ============================================================
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const inlineHtml = s => esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<u>$1</u>');
    const stripInline = s => s.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1');

    const BULLET = /^\s*[•\-*]\s+/;
    const TABLE_ROW = /^\s*\|.*\|\s*$/;
    const TABLE_RULE = /^\s*\|(?:\s*:?-{3,}:?\s*\|)+\s*$/;
    const cells = line => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());

    /** Splits text into paragraph / bullet / table blocks. */
    function parseBlocks(text) {
        const blocks = [];
        let para = [], table = [];
        const flush = () => {
            const t = para.join(' ').replace(/\s+/g, ' ').trim();
            if (t) blocks.push({ type: 'p', text: t });
            para = [];
            if (table.length) {
                const hasHeader = table.length >= 2 && TABLE_RULE.test(table[1]);
                const rows = table.filter(l => !TABLE_RULE.test(l)).map(cells);
                blocks.push({ type: 'table', header: hasHeader ? rows[0] : null, rows: hasHeader ? rows.slice(1) : rows });
            }
            table = [];
        };
        for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
            if (TABLE_ROW.test(raw)) { if (para.length) flush(); table.push(raw); continue; }
            if (table.length) flush();
            if (!raw.trim()) { flush(); continue; }
            if (BULLET.test(raw)) { flush(); blocks.push({ type: 'bullet', text: raw.replace(BULLET, '').trim() }); continue; }
            para.push(raw.trim());
        }
        flush();
        return blocks;
    }

    // Inline styles so formatting survives a paste into Word / Google Docs.
    const TD = 'border:1px solid #888;padding:4px 6px;vertical-align:top;';
    function blocksToHtml(blocks, prefix) {
        let html = '', list = [];
        const flushList = () => { if (list.length) html += `<ul>${list.map(t => `<li>${inlineHtml(t)}</li>`).join('')}</ul>`; list = []; };
        blocks.forEach((b, i) => {
            if (b.type === 'bullet') { list.push(b.text); return; }
            flushList();
            const pre = i === 0 && prefix ? esc(prefix) : '';
            if (b.type === 'p') html += `<p>${pre}${inlineHtml(b.text)}</p>`;
            else {
                const head = b.header ? `<tr>${b.header.map(c => `<th style="${TD}background:#e8f0e0;text-align:left;">${inlineHtml(c)}</th>`).join('')}</tr>` : '';
                const body = b.rows.map(r => `<tr>${r.map(c => `<td style="${TD}">${inlineHtml(c)}</td>`).join('')}</tr>`).join('');
                html += `${pre ? `<p>${pre}</p>` : ''}<table style="border-collapse:collapse;width:100%;font-size:0.92em;">${head}${body}</table>`;
            }
        });
        flushList();
        return html;
    }
    function blocksToText(blocks, prefix) {
        return blocks.map((b, i) => {
            const pre = i === 0 && prefix ? prefix : '';
            if (b.type === 'bullet') return `${pre}• ${stripInline(b.text)}`;
            if (b.type === 'p') return pre + stripInline(b.text);
            return pre + [b.header, ...b.rows].filter(Boolean).map(r => r.map(stripInline).join('\t')).join('\n');
        }).join('\n\n');
    }

    /** The current Area's recommendations, finished, as { html, text }. */
    function buildOutput() {
        const includeTitles = document.getElementById('recsIncludeTitles')?.checked;
        const list = recs().map(r => ({ title: r.title.trim(), text: fillPlaceholders(r.text).trim() })).filter(r => r.text);
        const htmlParts = [], textParts = [];
        list.forEach((r, i) => {
            const num = list.length > 1 ? `${i + 1}) ` : '';
            const blocks = parseBlocks(r.text);
            if (includeTitles && r.title) {
                htmlParts.push(`<p><strong>${esc(num + r.title)}</strong></p>` + blocksToHtml(blocks, ''));
                textParts.push(`${num}${r.title}\n\n${blocksToText(blocks, '')}`);
            } else {
                htmlParts.push(blocksToHtml(blocks, num));
                textParts.push(blocksToText(blocks, num));
            }
        });
        return { html: htmlParts.join(''), text: textParts.join('\n\n') };
    }

    // ============================================================
    // RENDERING
    // ============================================================
    const $ = id => document.getElementById(id);
    const libItemOf = r => (r.sourceId ? LIBRARY.find(x => x.id === r.sourceId || (x.aliases || []).includes(r.sourceId)) : undefined);
    const has = item => recs().some(r => r.sourceId === item.id || (item.aliases || []).includes(r.sourceId));

    function areaOptions() {
        const data = typeof window.ttGetDataAreas === 'function' ? window.ttGetDataAreas() : [];
        const cur = typeof window.ttGetCurrentArea === 'function' ? window.ttGetCurrentArea() : 'A';
        const withRecs = Object.keys(store.areas).filter(a => store.areas[a].length);
        return { list: [...new Set([...data, ...withRecs, cur])].sort(), cur };
    }

    function render() {
        const sel = $('recsAreaSelect');
        if (!sel) return;
        const { list, cur } = areaOptions();
        if (!currentArea || !list.includes(currentArea)) currentArea = cur;
        sel.innerHTML = list.map(a => `<option value="${a}">Area ${a}${store.areas[a]?.length ? ` (${store.areas[a].length})` : ''}</option>`).join('');
        sel.value = currentArea;
        renderDetails();
        renderLibrary();
        renderMode();
    }

    function renderDetails() {
        const d = store.details;
        $('recsState').value = d.state;
        $('recsOrgType').value = d.orgType;
        $('recsOrgName').value = d.orgName;
        $('recsMarkingFee').value = d.markingFee;
        $('recsCounty').value = d.county;
        $('recsNrcsPhone').value = d.nrcsPhone;
        $('recsOfficePhone').value = d.officePhone;
        $('recsServicesGroup').hidden = d.orgType === 'state-agency';
        $('recsServices').innerHTML = SERVICES.map(s =>
            `<label class="recs-check"><input type="checkbox" value="${s.id}" ${d.services.includes(s.id) ? 'checked' : ''}> ${s.label}</label>`).join('');
    }

    function renderLibrary() {
        const box = $('recsLibrary');
        box.innerHTML = CATEGORIES.map(cat => {
            const items = LIBRARY.filter(r => r.category === cat);
            const open = openCats.has(cat);
            const count = items.filter(has).length;
            return `<div class="rec-category">
                <button type="button" class="rec-category-title" data-cat="${esc(cat)}" aria-expanded="${open}">
                    ${open ? '&#9662;' : '&#9656;'} ${esc(cat)}${count ? ` <span class="rec-count">(${count})</span>` : ''}
                </button>
                ${open ? `<div class="rec-buttons">${items.map(r =>
                    `<button type="button" class="rec-btn${has(r) ? ' rec-selected' : ''}" data-rec="${r.id}" title="${esc(stripInline(fillPlaceholders(r.text)).slice(0, 400))}">${has(r) ? '&#10003; ' : ''}${esc(r.title)}</button>`).join('')}</div>` : ''}
            </div>`;
        }).join('');
    }

    function renderMode() {
        document.querySelectorAll('.recs-mini-tab').forEach(b => {
            const on = b.dataset.mode === mode;
            b.classList.toggle('active', on);
            b.setAttribute('aria-selected', String(on));
        });
        $('recsEditPane').hidden = mode !== 'edit';
        $('recsPreviewPane').hidden = mode !== 'preview';
        if (mode === 'edit') renderEdit(); else renderPreview();
    }

    function renderEdit() {
        const list = recs();
        const box = $('recsEditList');
        if (!list.length) {
            box.innerHTML = '<p class="placeholder-msg">No recommendations for this Area yet — tap a library button above, or add your own.</p>';
            return;
        }
        box.innerHTML = list.map((r, i) => {
            const needs = missingInputs(r.text).length > 0;
            return `<div class="rec-item" data-id="${r.id}">
                <div class="rec-item-head">
                    <span class="rec-item-num">${list.length > 1 ? `${i + 1})` : ''}</span>
                    <input type="text" class="rec-title-input" placeholder="Title" value="${esc(r.title)}">
                    <button type="button" class="control-button btn-secondary rec-move" data-by="-1" ${i === 0 ? 'disabled' : ''} title="Move up">&#8593;</button>
                    <button type="button" class="control-button btn-secondary rec-move" data-by="1" ${i === list.length - 1 ? 'disabled' : ''} title="Move down">&#8595;</button>
                    <button type="button" class="control-button delete-button rec-remove" title="Remove">&#10005;</button>
                </div>
                <textarea class="rec-text-input" rows="${Math.min(14, Math.max(4, Math.ceil(r.text.length / 90)))}">${esc(r.text)}</textarea>
                ${needs ? '<button type="button" class="control-button btn-info rec-fill">&#9998; Fill in missing information</button>' : ''}
            </div>`;
        }).join('');
    }

    function renderPreview() {
        const { html } = buildOutput();
        $('recsPreview').innerHTML = html || '<p class="placeholder-msg">No recommendations yet.</p>';
        $('recsCopyBtn').disabled = !html;
        $('recsCopyStatus').textContent = '';
    }

    // ============================================================
    // ACTIONS
    // ============================================================
    function addFromLibrary(item) {
        const text = resolveOrgText(item.text);
        const push = t => { recs().push({ id: newId(), sourceId: item.id, title: item.title, text: t }); save(); render(); };
        const fields = inputFields(text, item);
        if (fields.length) askInputs(item.title, fields, 'Add Recommendation', values => push(applyInputs(text, values)));
        else push(text);
    }

    function toggleLibrary(item) {
        if (!has(item)) { addFromLibrary(item); return; }
        const list = recs();
        const at = list.findIndex(r => r.sourceId === item.id || (item.aliases || []).includes(r.sourceId));
        const edited = list[at].text !== resolveOrgText(item.text) && list[at].text !== item.text;
        if (edited && !confirm(`Remove "${item.title}"? Your edits to it will be lost.`)) return;
        list.splice(at, 1);
        save();
        render();
    }

    function inputFields(text, item) {
        return missingInputs(text).map(f => {
            const p = item?.prompts?.find(x => x.field === f);
            return {
                key: f,
                label: p?.label ?? f.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()),
                placeholder: p?.placeholder ?? '',
                value: p?.default ?? '',
            };
        });
    }

    /** Popup asking for the blanks a recommendation needs (species names, a pest…). */
    function askInputs(title, fields, okLabel, onDone) {
        const modal = $('recsInputModal');
        $('recsInputTitle').textContent = title;
        $('recsInputFields').innerHTML = fields.map((f, i) => `
            <div class="input-group recs-field">
                <label for="recsIn${i}">${esc(f.label)}</label>
                <input type="text" id="recsIn${i}" data-key="${f.key}" value="${esc(f.value)}" placeholder="${esc(f.placeholder)}">
            </div>`).join('');
        $('recsInputOk').textContent = okLabel;
        modal.style.display = 'flex';
        const first = $('recsIn0');
        if (first) setTimeout(() => first.focus(), 50);
        const close = () => { modal.style.display = 'none'; $('recsInputOk').onclick = null; $('recsInputCancel').onclick = null; };
        $('recsInputCancel').onclick = close;
        $('recsInputOk').onclick = () => {
            const values = {};
            $('recsInputFields').querySelectorAll('input').forEach(inp => { values[inp.dataset.key] = inp.value; });
            close();
            onDone(values);
        };
    }

    async function copyOutput() {
        const { html, text } = buildOutput();
        const status = $('recsCopyStatus');
        if (!text) return;
        const doc = `<div style="font-family:Calibri,Arial,sans-serif;font-size:11pt;">${html}</div>`;
        try {
            if (window.ClipboardItem && navigator.clipboard?.write) {
                await navigator.clipboard.write([new ClipboardItem({
                    'text/html': new Blob([doc], { type: 'text/html' }),
                    'text/plain': new Blob([text], { type: 'text/plain' }),
                })]);
            } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else throw new Error('no clipboard API');
            status.textContent = '✓ Copied — paste into your plan';
        } catch (e) {
            // Fallback: select the rendered preview and use the legacy copy command.
            try {
                const range = document.createRange();
                range.selectNodeContents($('recsPreview'));
                const s = window.getSelection();
                s.removeAllRanges(); s.addRange(range);
                const ok = document.execCommand('copy');
                s.removeAllRanges();
                status.textContent = ok ? '✓ Copied — paste into your plan' : 'Copy failed — select the text and copy manually.';
            } catch (e2) { status.textContent = 'Copy failed — select the text and copy manually.'; }
        }
    }

    // ============================================================
    // EVENTS
    // ============================================================
    function init() {
        if (!$('tab-recs')) return;
        load();

        $('recsAreaSelect').addEventListener('change', e => { currentArea = e.target.value; renderLibrary(); renderMode(); });

        // Plan details
        const bindDetail = (id, key) => $(id).addEventListener('input', e => { store.details[key] = e.target.value; save(); if (mode === 'preview') renderPreview(); });
        bindDetail('recsOrgName', 'orgName');
        bindDetail('recsMarkingFee', 'markingFee');
        bindDetail('recsCounty', 'county');
        bindDetail('recsNrcsPhone', 'nrcsPhone');
        bindDetail('recsOfficePhone', 'officePhone');
        $('recsState').innerHTML = US_STATES.map(([c, n]) => `<option value="${c}">${n}</option>`).join('');
        $('recsState').addEventListener('change', e => { store.details.state = e.target.value; save(); render(); });
        $('recsOrgType').addEventListener('change', e => { store.details.orgType = e.target.value; save(); render(); });
        $('recsServices').addEventListener('change', () => {
            store.details.services = [...$('recsServices').querySelectorAll('input:checked')].map(i => i.value);
            save();
            renderLibrary();
        });

        // Library buttons
        $('recsLibrary').addEventListener('click', e => {
            const cat = e.target.closest('[data-cat]');
            if (cat) {
                const c = cat.dataset.cat;
                openCats.has(c) ? openCats.delete(c) : openCats.add(c);
                renderLibrary();
                return;
            }
            const btn = e.target.closest('[data-rec]');
            if (btn) {
                const item = LIBRARY.find(r => r.id === btn.dataset.rec);
                if (item) toggleLibrary(item);
            }
        });

        // Edit / Preview
        document.querySelectorAll('.recs-mini-tab').forEach(b => b.addEventListener('click', () => { mode = b.dataset.mode; renderMode(); }));
        $('recsIncludeTitles').addEventListener('change', renderPreview);
        $('recsCopyBtn').addEventListener('click', copyOutput);
        $('recsAddCustomBtn').addEventListener('click', () => {
            recs().push({ id: newId(), title: '', text: '' });
            save();
            render();
            const last = $('recsEditList').querySelector('.rec-item:last-child .rec-title-input');
            if (last) last.focus();
        });
        $('recsClearAreaBtn').addEventListener('click', () => {
            if (!recs().length || !confirm(`Remove all recommendations for Area ${currentArea}?`)) return;
            store.areas[currentArea] = [];
            save();
            render();
        });

        // Edit list (delegated)
        const editList = $('recsEditList');
        const rowOf = el => {
            const row = el.closest('.rec-item');
            const list = recs();
            const i = row ? list.findIndex(r => r.id === row.dataset.id) : -1;
            return { list, i, r: list[i] };
        };
        editList.addEventListener('input', e => {
            const { r } = rowOf(e.target);
            if (!r) return;
            if (e.target.classList.contains('rec-title-input')) r.title = e.target.value;
            if (e.target.classList.contains('rec-text-input')) r.text = e.target.value;
            save();
        });
        // Re-render on blur so "Fill in missing information" appears/disappears with the text.
        editList.addEventListener('change', e => { if (e.target.classList.contains('rec-text-input')) renderEdit(); });
        editList.addEventListener('click', e => {
            const { list, i, r } = rowOf(e.target);
            if (!r) return;
            if (e.target.closest('.rec-move')) {
                const j = i + Number(e.target.closest('.rec-move').dataset.by);
                if (j >= 0 && j < list.length) { [list[i], list[j]] = [list[j], list[i]]; save(); renderEdit(); }
            } else if (e.target.closest('.rec-remove')) {
                if (confirm(`Remove "${r.title || 'this recommendation'}"?`)) { list.splice(i, 1); save(); render(); }
            } else if (e.target.closest('.rec-fill')) {
                askInputs(r.title || 'Recommendation', inputFields(r.text, libItemOf(r)), 'Save', values => {
                    r.text = applyInputs(r.text, values);
                    save();
                    renderEdit();
                });
            }
        });

        $('recsInputModal').addEventListener('keydown', e => {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') $('recsInputOk').click();
            if (e.key === 'Escape') $('recsInputCancel').click();
        });
    }

    window.TTRecs = { render };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();

// --- END OF FILE recommendations.js ---

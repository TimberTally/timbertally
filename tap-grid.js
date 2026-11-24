// --- START OF FILE tap-grid.js ---
// Tap Grid collection mode (Settings → Collection), ported from ForestScribe's
// TapEntryPanel: the DBH and Logs wheels are replaced by grids of buttons.
// Pick the species as usual (quick-pick or list), tap a DBH, then tap Logs:
// the last tap saves the tree through the same Submit path as the wheels
// (window.ttEntry from script.js), so GPS, notes, Cut/UGS, auto-GPS and the
// double-tap guard all work the same. DBH and Logs are shared with the
// wheels, so switching modes mid-plot keeps the selection.

(function () {
    'use strict';

    let panel = null;

    function render() {
        const api = window.ttEntry;
        panel = panel || document.getElementById('tapGridPanel');
        if (!panel || !api) return;
        const on = api.mode() === 'grid';
        panel.hidden = !on;
        if (!on) return;
        const dbh = api.getDbh(), logs = api.getLogs();
        const term = k => (window.ttTermBtn ? window.ttTermBtn(k) : '');
        const btn = (kind, v, label, sel) =>
            `<button type="button" class="sp-btn tap-grid-btn${sel ? ' selected' : ''}" data-${kind}="${v}" aria-pressed="${sel}">${label}</button>`;
        const logVals = api.logValues(dbh);
        panel.innerHTML =
            `<div class="tap-grid-head"><label>DBH ${term('dbh')}</label><span class="tap-grid-hint">Tap DBH, then Logs to save the tree</span></div>`
            + `<div class="tap-grid tap-grid-dbh" role="group" aria-label="DBH">${api.dbhValues().map(v => btn('dbh', v, `${v}"`, v === dbh)).join('')}</div>`
            + `<div class="tap-grid-head"><label>Logs ${term('logs')}</label>${logVals.length === 1 ? '<span class="tap-grid-hint">10" and under: 0 logs</span>' : ''}</div>`
            + `<div class="tap-grid tap-grid-logs" role="group" aria-label="Logs">${logVals.map(v => btn('logs', v, v, v === logs)).join('')}</div>`;
    }

    // Delegated, so it works whichever script finishes loading first.
    document.addEventListener('click', e => {
        const b = e.target.closest?.('#tapGridPanel .tap-grid-btn');
        const api = window.ttEntry;
        if (!b || !api) return;
        if (b.dataset.dbh) api.setDbh(b.dataset.dbh);
        else if (b.dataset.logs) {
            api.setLogs(b.dataset.logs);
            api.submit();
        }
    });
    window.addEventListener('tt-settings-changed', render);

    window.TapGrid = { sync: render };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', render);
    else render();
    window.addEventListener('load', render);
})();

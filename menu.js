// --- START OF FILE menu.js ---
// ☰ Menu and Help & Tours (modeled on ForestScribe's AppMenu and HelpSheet).
//   • ☰ in the header opens a short menu: Settings, Help & Tours, Quick Start sheet, Standard
//     Wording, Install App, Check for Updates, Info / Contact. A choice, a tap outside or Esc
//     closes it. Install App, Check for Updates and Info keep their ids (installAppBtn,
//     manualUpdateCheckBtn, showInfoBtn), so script.js / info.js still handle them.
//   • ? in the header (or Menu → Help & Tours) opens the Help sheet: a tour of the open tab,
//     every tour, the Quick Start sheet, install steps and Report a Problem (an email with the
//     app version and browser, no project data).
(function () {
    'use strict';

    const CONTACT = 'timbertallyapp@gmail.com';
    const QUICK_START = './TimberTally-Quick-Start.pdf';
    const $ = id => document.getElementById(id);
    const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // ============================================================
    // ☰ MENU
    // ============================================================
    const menu = () => $('appMenu');
    function openMenu() {
        const m = menu(); if (!m) return;
        m.hidden = false;
        $('menuBtn')?.setAttribute('aria-expanded', 'true');
        m.querySelector('.app-menu-item')?.focus();
    }
    function closeMenu(focusBtn) {
        const m = menu(); if (!m || m.hidden) return;
        m.hidden = true;
        $('menuBtn')?.setAttribute('aria-expanded', 'false');
        if (focusBtn) $('menuBtn')?.focus();
    }

    // ============================================================
    // HELP & TOURS
    // ============================================================
    const TAB_TOUR_LABEL = { data: 'Tour of the Data tab', projects: 'Tour of the Projects tab', tally: 'Tour of the Tally tab', recs: 'Tour of the Recs tab', settings: 'Tour of Settings' };
    const isStandalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    async function appVersion() {
        try {
            const keys = await caches.keys();
            const k = keys.find(n => n.startsWith('timber-tally3-cache-'));
            if (k) return `TimberTally 3 (${k.replace('timber-tally3-cache-', '')})`;
        } catch (e) { /* no caches: read the version from the service worker file */ }
        try {
            const m = (await (await fetch('./service-worker.js', { cache: 'no-store' })).text()).match(/CACHE_PREFIX \+ '([^']+)'/);
            return m ? `TimberTally 3 (${m[1]})` : 'TimberTally 3';
        } catch (e) { return 'TimberTally 3'; }
    }
    /** mailto: link for Report a Problem: version and browser only, no project data. */
    async function problemReportHref() {
        const body = [
            `App version: ${await appVersion()}`,
            `Installed app: ${isStandalone() ? 'yes' : 'no'}`,
            `Browser: ${navigator.userAgent}`,
            '',
            'What happened:',
            '',
            '',
        ].join('\n');
        return `mailto:${CONTACT}?subject=${encodeURIComponent('TimberTally problem')}&body=${encodeURIComponent(body)}`;
    }

    let helpOv = null;
    function helpHtml() {
        const cur = window.TTTour?.currentName?.() || 'data';
        const tours = window.TTTour?.tours?.() || [];
        const row = (act, icon, title, sub, extra = '') => `<button type="button" class="tt-help-row" data-act="${act}" ${extra}><i>${icon}</i><span><b>${title}</b><small>${sub}</small></span></button>`;
        return `<div class="modal-content tt-help-modal">
            <button type="button" class="modal-close-btn" data-close title="Close">&#215;</button>
            <h2 id="ttHelpTitle">Help &amp; Tours</h2>
            ${row('tour-current', '&#9873;', esc(TAB_TOUR_LABEL[cur] || 'Tour of this screen'), 'A quick walk past the controls on this screen', `data-tour="${cur}" id="helpTourHere"`)}
            <div class="tt-help-sub">All tours</div>
            <div class="tt-help-tours">${tours.map(t => `<button type="button" class="tt-help-row" data-act="tour" data-tour="${esc(t.name)}"><span><b>${esc(t.label)}</b></span></button>`).join('')}</div>
            <a class="tt-help-row" id="helpQuickStart" href="${QUICK_START}" target="_blank" rel="noopener"><i>&#128196;</i><span><b>Quick Start sheet</b><small>Two printable pages: setting up, entering trees, backing up</small></span></a>
            ${row('install', '&#128229;', isStandalone() ? 'Installed' : 'Install on your phone', isStandalone() ? 'You are using the installed app' : 'Works with no signal once it’s on your home screen', 'id="helpInstall" aria-expanded="false"')}
            <div class="tt-help-install" id="helpInstallSteps" hidden>
                ${isIOS()
                    ? '<p>In <b>Safari</b>: tap <b>Share</b>, then <b>Add to Home Screen</b>.</p>'
                    : '<p><b>Android:</b> Chrome → ⋮ → <b>Install app</b>. <b>iPhone:</b> Safari → Share → <b>Add to Home Screen</b>. <b>Computer:</b> Chrome or Edge → the install icon in the address bar.</p>'}
                <p>Then open it from the home screen. It saves everything on the device and works with no signal.</p>
                ${isStandalone() ? '' : '<button type="button" class="control-button btn-success" data-act="install-now">&#128229; Install App</button>'}
            </div>
            ${row('report', '&#9993;', 'Report a Problem', 'Opens an email with the app version and browser; you add what happened. No project data is sent.', 'id="helpReport"')}
            <p class="tt-help-foot">Questions or ideas? <a href="mailto:${CONTACT}?subject=TimberTally">${CONTACT}</a></p>
            <div class="modal-actions" style="text-align:right;margin-top:10px"><button type="button" class="control-button btn-secondary" data-close>Close</button></div>
        </div>`;
    }
    function openHelp() {
        closeMenu();
        if (!helpOv) {
            helpOv = document.createElement('div');
            helpOv.id = 'ttHelpModal';
            helpOv.className = 'modal-overlay';
            helpOv.setAttribute('role', 'dialog');
            helpOv.setAttribute('aria-modal', 'true');
            helpOv.setAttribute('aria-labelledby', 'ttHelpTitle');
            helpOv.addEventListener('click', onHelpClick);
            document.body.appendChild(helpOv);
        }
        helpOv.innerHTML = helpHtml();
        helpOv.style.display = 'flex';
        helpOv.querySelector('#helpTourHere')?.focus();
    }
    function closeHelp() { if (helpOv) helpOv.style.display = 'none'; }
    async function onHelpClick(e) {
        if (e.target === helpOv || e.target.closest('[data-close]')) { closeHelp(); return; }
        if (e.target.closest('#helpQuickStart')) { closeHelp(); return; }
        const b = e.target.closest('[data-act]');
        if (!b) return;
        const act = b.dataset.act;
        if (act === 'tour' || act === 'tour-current') { closeHelp(); window.TTTour?.start(b.dataset.tour); }
        else if (act === 'install') {
            const steps = helpOv.querySelector('#helpInstallSteps');
            steps.hidden = !steps.hidden;
            b.setAttribute('aria-expanded', String(!steps.hidden));
        } else if (act === 'install-now') { closeHelp(); $('installAppBtn')?.click(); }
        else if (act === 'report') { window.location.href = await problemReportHref(); }
    }

    function closeAll() { closeMenu(); closeHelp(); }

    // ============================================================
    // WIRING
    // ============================================================
    function init() {
        $('menuBtn')?.addEventListener('click', e => {
            e.stopPropagation();
            menu()?.hidden ? openMenu() : closeMenu();
        });
        $('helpBtn')?.addEventListener('click', openHelp);
        menu()?.addEventListener('click', e => {
            const item = e.target.closest('.app-menu-item');
            if (!item) return;
            if (!item.hasAttribute('data-keep-open')) closeMenu();
        });
        $('menuSettingsBtn')?.addEventListener('click', () => window.TTSettings?.open());
        $('menuHelpBtn')?.addEventListener('click', openHelp);
        $('menuWordingBtn')?.addEventListener('click', () => window.TTWording?.open());
        // A tap anywhere outside the menu closes it.
        document.addEventListener('pointerdown', e => {
            const m = menu();
            if (m && !m.hidden && !m.contains(e.target) && !$('menuBtn')?.contains(e.target)) closeMenu();
        });
        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            if (menu() && !menu().hidden) { closeMenu(true); return; }
            if (helpOv && helpOv.style.display === 'flex') closeHelp();
        });
        // Arrow keys move through the menu.
        menu()?.addEventListener('keydown', e => {
            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            const items = [...menu().querySelectorAll('.app-menu-item')];
            const i = items.indexOf(document.activeElement);
            items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
            e.preventDefault();
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

    window.TTMenu = { open: openMenu, close: closeMenu, openHelp, closeHelp, closeAll, problemReportHref };
})();
// --- END OF FILE menu.js ---

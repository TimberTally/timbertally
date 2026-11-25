// --- START OF FILE tour.js ---
// Help tours and sample project (modeled on ForestScribe's Tour and sample project).
//   • Tours: step bubbles that ring a real control and say what it's for. One tour per bottom
//     tab (Data, Projects, Tally, Recs) and one of the Settings sheet; each opens its own tab
//     (or the sheet) first. Next / Back / Done; Esc closes; ← → step. Steps whose control
//     isn't on screen are left out.
//   • The Data tour is offered once on first run (remembered under tt3.tourSeen); all tours
//     are in Help & Tours (the ? at the top, or ☰ Menu → Help & Tours; menu.js).
//   • Try the Sample Project: adds a NEW project of made-up cruise data (two Areas) and opens it.
//     Never touches existing projects. Offered on first run when no project has trees, and on the
//     Projects tab.
(function () {
    'use strict';

    const SEEN_KEY = 'tt3.tourSeen';
    const SAMPLE_NAME = 'Sample Property (made-up data)';
    const getSeen = () => { try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; } };
    const setSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* ignore */ } };

    const DATA_STEPS = [
        { title: 'Welcome to TimberTally', text: 'Tally trees on your phone with no signal, then save one ZIP with the CSVs, reports and graphs. Here is a quick look around the main screen.' },
        { target: '.tab-btn[data-tab="takeData"]', title: 'Data tab', text: 'Where you tally trees in the woods. The tabs along the bottom hold your projects, results and recommendations.' },
        { target: '#plotCounterRow', title: 'Area and plot', text: 'The Area letter and the plot you are standing in. Tap + when you walk to the next plot, or swipe across here. Underneath: plots needed for ±10, 15 and 20%. Tap it for the sampling error and whether you have enough plots.' },
        { target: '#speciesQuick', title: 'Species', text: 'Tap a button or pick from the list below it. Your most-used species move onto the buttons as you go. Tap edit species to add or remove names.' },
        { target: '.dbh-logs-row', title: 'DBH and logs', text: 'Spin each wheel to the tree’s diameter and its number of 16′ logs (or tap a row). Tap Cut or UGS below if it applies.' },
        { target: '#submitBtn', title: 'Submit', text: 'Saves the tree to this plot. Every tree is saved right away. A plot with no trees? Record it as an empty plot with the link under this button.' },
        { target: '.tab-nav', title: 'Tabs at the bottom', text: 'Projects: switch, back up, import a CSV, export plot locations. Tally: trees, basal area and volume per acre and the stocking chart. Recs: write the recommendations for each Area.' },
        { target: '#saveCsvBtn', title: 'Save ZIP', text: 'One file with everything for the open project: a CSV, Summary Report and Graphs page for each Area, the stocking chart and Area notes.' },
        { target: '#helpBtn', title: 'Help & Tours', text: 'A tour of whichever tab is open, the other tours, the printable Quick Start sheet and Report a Problem.' },
        { target: '#menuBtn', title: 'Menu', text: 'Settings (BAF or fixed plot, log rule, form class, dark mode), Leaf/Twig ID, Standard Wording, Install App, Check for Updates and Info / Contact.' },
    ];

    const TOURS = {
        data: { label: 'Data entry', tab: 'takeData', steps: DATA_STEPS },
        projects: {
            label: 'Projects & backup', tab: 'projects', steps: [
                { target: '.tab-btn[data-tab="projects"]', title: 'Projects tab', text: 'Every property you cruise is its own project. It is saved as you go; this tab switches between them and keeps them safe.' },
                { target: '#projectNameInput', title: 'Open project', text: 'The project you are working in. Type here to rename it. Below it: trees, plots and the last backup.' },
                { target: '#loadProjectSelect', title: 'Switch projects', text: 'Pick another project to open it. The one you leave is already saved.' },
                { target: '#newProjectBtn', title: 'New, copy, delete', text: 'Start a fresh cruise, save a copy of this one, or delete it (a safety copy is kept for 7 days).' },
                { target: '#saveBackupBtn', title: 'Save Backup', text: 'One file with every project, your species list, plan details and Standard Wording. Send it to Files, email or a cloud drive. Your data lives only on this device, so do this often.' },
                { target: '#restoreBackupBtn', title: 'Restore Backup', text: 'Adds the projects from a backup file, on this device or a new one. Nothing already here is replaced.' },
                { target: '#mergeDeviceBtn', title: 'Merge Another Device', text: 'Two cruisers on one property? Pick the other phone’s backup or CSV to combine its plots into this project.' },
                { target: '#snapshotList', title: 'Safety copies', text: 'Copies kept automatically before anything is deleted or moved, for 7 days. Restoring one adds it as a new project.' },
                { target: '#plotExportBtn', title: 'Plot locations', text: 'One point per plot with GPS, as KML (Google Earth), GPX (GPS units, Avenza) or GeoJSON (GIS).' },
                { target: '#loadCsvBtn', title: 'Import CSV', text: 'Add trees from a TimberTally CSV or another program’s CSV (Match Columns sorts out the headings).' },
                { target: '#sampleProjectBtn', title: 'Sample project', text: 'Adds a made-up property with two Areas to try things out. Your projects are not changed.' },
            ],
        },
        tally: {
            label: 'Tally & Check Data', tab: 'tally', steps: [
                { target: '.tab-btn[data-tab="tally"]', title: 'Tally tab', text: 'Results for the open project as you cruise: per-acre numbers, stocking and charts.' },
                { target: '#tallyAreaSelect', title: 'Area', text: 'Show every Area together or one at a time.' },
                { target: '#tallySummaryCards', title: 'Summary', text: 'Trees, basal area and board-foot volume per acre, average diameter (QMD), plots and trees.' },
                { target: '#checkDataBtn', title: 'Check Data', text: 'Finds skipped plots, likely double entries, odd log counts and missing species or DBH before you leave the woods. Tap an issue to fix the tree.' },
                { target: '#stockingResults', title: 'Stocking', text: 'Each Area on the Gingrich stocking chart, with percent stocking. When trees are marked Cut, an arrow shows the stand left after the cut.' },
                { target: '#tallyResults', title: 'Tree tally', text: 'Every tree by species, DBH, logs and Cut / leave.' },
                { target: '#tallyChartsContainer', title: 'Stand charts', text: 'Basal area and trees per acre by diameter class, and volume by species: the same charts as the Graphs page in the ZIP.' },
            ],
        },
        recs: {
            label: 'Recommendations', tab: 'recs', steps: [
                { target: '.tab-btn[data-tab="recs"]', title: 'Recs tab', text: 'Write the management recommendations for each Area from a library of standard wording.' },
                { target: '#recsAreaSelect', title: 'Area', text: 'Recommendations are kept for each Area separately.' },
                { target: '.recs-details', title: 'Plan details', text: 'Pick the county; its NRCS office phone fills into the recommendations that mention it.' },
                { target: '#recsLibrary', title: 'Library', text: 'Open a category and tap a recommendation to add it (tap again to remove). Some ask for a detail, such as the invasive species.' },
                { target: '.recs-mini-tabs', title: 'Edit and Preview', text: 'Edit: change the wording for this Area, reorder or remove. Preview: the finished, numbered list, with Copy and Copy as plain text.' },
                { target: '#recsAddCustomBtn', title: 'Your own', text: 'Add a recommendation of your own to this Area.' },
                { target: '#menuBtn', title: 'Standard Wording', text: '☰ Menu → Standard Wording rewrites the library in your own words, or adds your own library recommendations, for every project from then on.' },
            ],
        },
        settings: {
            label: 'Settings', settings: true, steps: [
                { target: '#cruiseMethodSelect', title: 'Cruise method', text: 'Prism (BAF) or fixed plot. Fixed plots ask for the plot size.' },
                { target: '#bafGroup', title: 'BAF', text: 'The basal area factor of your prism or gauge.' },
                { target: '#logRuleSelect', title: 'Log rule', text: 'Doyle, Scribner or International ¼″ for all board-foot volumes.' },
                { target: '#formClassGroup', title: 'Form class', text: 'For the Doyle rule only.' },
                { target: '#entryModeSelect', title: 'Collection', text: 'Scroll Wheel, or Tap Grid: tap a DBH, then logs, and the tree is saved.' },
                { target: '#darkModeSelect', title: 'Dark mode', text: 'Off, On, or follow the phone (System).' },
                { target: '#settingsDoneBtn', title: 'Done', text: 'Settings save as you change them. Done goes back to where you were.' },
            ],
        },
    };
    /** The tour for the tab that is open. */
    function currentTourName() {
        if (window.TTSettings?.isOpen?.()) return 'settings';
        const tab = document.querySelector('.tab-btn.active')?.dataset.tab;
        return Object.keys(TOURS).find(k => TOURS[k].tab === tab) || 'data';
    }

    function visible(sel) {
        for (const el of document.querySelectorAll(sel)) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el;
        }
        return null;
    }

    function addStyle() {
        if (document.getElementById('ttTourStyle')) return;
        const st = document.createElement('style');
        st.id = 'ttTourStyle';
        st.textContent = `
.tt-tour-overlay{position:fixed;inset:0;z-index:3000;}
.tt-tour-overlay.dim{background:rgba(0,0,0,.55);}
.tt-tour-spot{position:fixed;border-radius:10px;box-shadow:0 0 0 3px var(--accent-amber),0 0 0 9999px rgba(0,0,0,.55);pointer-events:none;transition:all .2s;}
.tt-tour-card{position:fixed;left:50%;transform:translateX(-50%);width:min(92vw,380px);background:var(--bg-card);color:var(--text-dark);border-radius:var(--radius-lg);box-shadow:0 6px 24px rgba(0,0,0,.35);padding:14px 16px;border:1px solid var(--forest-border);}
.tt-tour-card.center{top:50%;transform:translate(-50%,-50%);}
.tt-tour-card h3{margin:2px 0 6px;font-size:1.05em;color:var(--forest-dark);}
.tt-tour-card p{margin:0 0 12px;font-size:.92em;line-height:1.45;}
.tt-tour-count{font-size:.75em;color:var(--text-muted);}
.tt-tour-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.tt-tour-actions .grow{flex:1;}`;
        document.head.appendChild(st);
    }

    let active = null;

    /** Runs a tour (data, projects, tally, recs, settings), opening its tab or the Settings sheet first. */
    function startTour(name) {
        endTour();
        setSeen();
        addStyle();
        const tour = TOURS[typeof name === 'string' && TOURS[name] ? name : 'data'];
        window.TTMenu?.closeAll?.();
        if (tour.settings) window.TTSettings?.open?.();
        else {
            window.TTSettings?.close?.();
            window.TTApp?.switchTab?.(tour.tab);
        }
        window.scrollTo(0, 0);

        const steps = tour.steps.filter(s => !s.target || visible(s.target));
        if (!steps.length) return;
        let i = 0;
        const ov = document.createElement('div');
        ov.className = 'tt-tour-overlay';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-modal', 'true');
        ov.setAttribute('aria-labelledby', 'ttTourTitle');
        document.body.appendChild(ov);
        let measureT = null;

        function place() {
            const step = steps[i];
            const el = step.target ? visible(step.target) : null;
            const rect = el ? el.getBoundingClientRect() : null;
            const spot = ov.querySelector('.tt-tour-spot');
            const card = ov.querySelector('.tt-tour-card');
            ov.classList.toggle('dim', !rect);
            if (spot) spot.style.display = rect ? '' : 'none';
            if (!rect) { card.classList.add('center'); card.style.top = ''; card.style.bottom = ''; return; }
            const pad = 6, vh = window.innerHeight;
            Object.assign(spot.style, { top: rect.top - pad + 'px', left: rect.left - pad + 'px', width: rect.width + pad * 2 + 'px', height: rect.height + pad * 2 + 'px' });
            card.classList.remove('center');
            if (rect.top + rect.height / 2 < vh * 0.55) { card.style.top = Math.min(rect.bottom + pad + 12, vh - 200) + 'px'; card.style.bottom = ''; }
            else { card.style.bottom = Math.max(vh - rect.top + pad + 12, 12) + 'px'; card.style.top = ''; }
        }
        function render() {
            const step = steps[i];
            const last = i >= steps.length - 1;
            ov.innerHTML = `<div class="tt-tour-spot"></div>
                <div class="tt-tour-card">
                    <div class="tt-tour-count">${i + 1} of ${steps.length}</div>
                    <h3 id="ttTourTitle">${step.title}</h3>
                    <p>${step.text}</p>
                    <div class="tt-tour-actions">
                        <button type="button" class="control-button btn-secondary" data-act="skip">${last ? 'Close' : 'Skip'}</button>
                        <span class="grow"></span>
                        ${i > 0 ? '<button type="button" class="control-button btn-secondary" data-act="back">Back</button>' : ''}
                        <button type="button" class="control-button btn-success" data-act="next">${last ? 'Done' : 'Next'}</button>
                    </div>
                </div>`;
            const el = step.target ? visible(step.target) : null;
            if (el) el.scrollIntoView({ block: 'center', behavior: 'auto' });
            place();
            clearTimeout(measureT);
            measureT = setTimeout(place, 150); // sticky headers can move things after the scroll
            ov.querySelector('[data-act="next"]').focus();
        }
        const next = () => { if (i >= steps.length - 1) endTour(); else { i++; render(); } };
        const back = () => { if (i > 0) { i--; render(); } };
        const onKey = e => {
            if (e.key === 'Escape') { e.stopImmediatePropagation(); endTour(); }
            else if (e.key === 'ArrowRight') next();
            else if (e.key === 'ArrowLeft') back();
        };
        ov.addEventListener('click', e => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            if (b.dataset.act === 'next') next(); else if (b.dataset.act === 'back') back(); else endTour();
        });
        document.addEventListener('keydown', onKey, true);
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        active = () => {
            clearTimeout(measureT);
            document.removeEventListener('keydown', onKey, true);
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
            ov.remove();
            if (!tour.settings) window.scrollTo(0, 0);
        };
        render();
    }
    function endTour() { if (active) { const f = active; active = null; f(); } }

    // ============================================================
    // SAMPLE PROJECT (made-up data)
    // ============================================================
    /** Small seeded random numbers so the sample is the same every time. */
    function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

    /** 16' logs for a DBH: a typical count for the size, sometimes a half log more or less. */
    function logsFor(dbh, r) {
        if (dbh <= 10) return '0';
        const base = dbh <= 12 ? 1 : dbh <= 14 ? 1.5 : dbh <= 18 ? 2 : dbh <= 22 ? 2.5 : 3;
        const v = Math.max(1, Math.min(3.5, base + (r() < 0.25 ? -0.5 : r() > 0.8 ? 0.5 : 0)));
        return String(v);
    }

    /**
     * Made-up Kentucky upland hardwood cruise at BAF 10 (deterministic: seeded random numbers).
     *   A — 42 ac upland oak-hickory, 9 plots of 9–11 trees (BA ~100 sq ft/ac, fully stocked),
     *       with a light thinning marked (Cut) so the residual-stand arrow shows on the chart.
     *   B — 18 ac cove hardwoods, 9 plots (plot 4 recorded empty), similar density, no marking.
     * Each plot gets a similar mix of pole and sawtimber sizes so the sampling error stays moderate.
     */
    function sampleEntries() {
        const out = [];
        let id = Date.now();
        const areas = {
            A: { plots: 9, seed: 11, thin: true,
                mix: [['White Oak', 28], ['Red Oak', 14], ['Hickory', 16], ['Chestnut Oak', 12], ['Red Maple', 10], ['Black Gum', 6], ['Sugar Maple', 6], ['Beech', 4], ['Black Cherry', 4]] },
            B: { plots: 9, seed: 109, thin: false,
                mix: [['Yellow-poplar', 34], ['White Oak', 16], ['Red Oak', 12], ['Sugar Maple', 14], ['Black Walnut', 8], ['Beech', 10], ['Hackberry', 3], ['Elm', 3]] },
        };
        // DBH classes for one plot, smallest to largest: about 1/3 poles (6–10"), the rest sawtimber.
        const sizeSlots = [[6, 8], [6, 8], [8, 10], [8, 10], [10, 12], [12, 14], [12, 16], [14, 18], [16, 20], [18, 22], [20, 26]];
        for (const [letter, a] of Object.entries(areas)) {
            const r = rng(a.seed);
            const total = a.mix.reduce((s, [, w]) => s + w, 0);
            const pick = () => { let x = r() * total; for (const [sp, w] of a.mix) { if ((x -= w) < 0) return sp; } return a.mix[0][0]; };
            for (let plot = 1; plot <= a.plots; plot++) {
                // Area B plot 4 is an empty plot (counts toward the number of plots).
                if (letter === 'B' && plot === 4) {
                    out.push({ id: id++, emptyPlot: true, plotNumber: plot, areaLetter: letter, species: '', dbh: '', logs: '', cutStatus: 'No', ugsStatus: 'No', notes: '', location: null });
                    continue;
                }
                const n = 9 + Math.floor(r() * 3);              // 9–11 trees = 90–110 sq ft/ac BA
                for (let k = 0; k < n; k++) {
                    const [lo, hi] = sizeSlots[Math.min(sizeSlots.length - 1, Math.floor(k * sizeSlots.length / n))];
                    const dbh = lo + 2 * Math.floor(r() * ((hi - lo) / 2 + 1));
                    let sp = pick();
                    if (dbh <= 10 && (sp === 'Black Walnut' || sp === 'Yellow-poplar') && r() < 0.5) sp = letter === 'A' ? 'Red Maple' : 'Sugar Maple';
                    const ugs = r() < 0.1;
                    const logs = ugs && dbh >= 14 && r() < 0.35 ? 'Cull' : logsFor(dbh, r);
                    // Light thinning in A: take UGS stems, some red maple / black gum, and a few mature red oak.
                    const cut = a.thin && (ugs || ((sp === 'Red Maple' || sp === 'Black Gum') && r() < 0.5) || (sp === 'Red Oak' && dbh >= 20 && r() < 0.5));
                    out.push({
                        id: id++, plotNumber: plot, areaLetter: letter,
                        species: sp, dbh: String(dbh), logs,
                        cutStatus: cut ? 'Yes' : 'No', ugsStatus: ugs ? 'Yes' : 'No',
                        notes: ugs && r() < 0.4 ? 'Made-up sample: fire scar at base' : '',
                        location: null,
                    });
                }
            }
        }
        return out;
    }

    /** Adds a new project of made-up data and opens it. Existing projects are untouched. */
    function loadSample() {
        const Store = window.TTStore, app = window.TTApp;
        if (!Store || !app) return;
        const p = Store.blankProject(SAMPLE_NAME);
        p.data = sampleEntries();
        p.plot = 1;
        p.areaIdx = 0;
        p.areaNotes = {
            A: 'SAMPLE DATA — made up for trying the app. Upland oak-hickory on a north-facing slope; an old skid road crosses the middle of the Area.',
            B: 'SAMPLE DATA — made up for trying the app. Cove hardwoods along a small creek; yellow-poplar and walnut on the lower slope.',
        };
        p.areaAcres = { A: 42, B: 18 };   // so the Property Summary shows property totals
        p.areaRegen = {
            A: { density: 'adequate', browse: 'light', ground: 'leaf-litter', invasives: [], species: 'White oak, hickory and red maple seedlings' },
            B: { density: 'abundant', browse: 'moderate', ground: 'herbaceous', invasives: ['Bush Honeysuckle'], species: 'Yellow-poplar and sugar maple saplings' },
        };
        if (app.openNewProject(p)) {
            app.switchTab?.('takeData');
            app.projectFeedback?.(`Opened "${p.name}" — made-up data to try things out. Your other projects are still saved.`, false, 5000);
            window.scrollTo(0, 0);
        }
    }

    const anyTrees = () => (window.TTStore?.listProjects() || []).some(m => (m.treeCount || 0) > 0);

    // ============================================================
    // FIRST RUN + BUTTONS
    // ============================================================
    function firstRunOffer() {
        if (getSeen()) return;
        // People already cruising with TimberTally don't need a welcome card after an update;
        // the tours are still under Help & Tours (the ? at the top).
        if (anyTrees()) { setSeen(); return; }
        addStyle();
        const offerSample = true;
        const ov = document.createElement('div');
        ov.className = 'tt-tour-overlay dim';
        ov.setAttribute('role', 'dialog');
        ov.setAttribute('aria-labelledby', 'ttWelcomeTitle');
        ov.innerHTML = `<div class="tt-tour-card center">
                <h3 id="ttWelcomeTitle">Welcome to TimberTally</h3>
                <p>Take a one-minute tour of the main screen?${offerSample ? ' Or try the sample project first: a made-up property with two Areas, added as its own project.' : ''} You can find both later under the <b>?</b> at the top (Help &amp; Tours).</p>
                <div class="tt-tour-actions">
                    <button type="button" class="control-button btn-secondary" data-act="later">Not now</button>
                    <span class="grow"></span>
                    ${offerSample ? '<button type="button" class="control-button btn-info" data-act="sample">Try the sample</button>' : ''}
                    <button type="button" class="control-button btn-success" data-act="tour">Take the tour</button>
                </div></div>`;
        const close = () => { setSeen(); ov.remove(); document.removeEventListener('keydown', onKey); };
        const onKey = e => { if (e.key === 'Escape') close(); };
        ov.addEventListener('click', e => {
            const b = e.target.closest('[data-act]');
            if (!b) return;
            close();
            if (b.dataset.act === 'tour') startTour('data');
            else if (b.dataset.act === 'sample') { loadSample(); setTimeout(() => startTour('data'), 300); }
        });
        document.addEventListener('keydown', onKey);
        document.body.appendChild(ov);
        ov.querySelector('[data-act="tour"]').focus();
    }

    function init() {
        // Projects tab → Try the Sample Project
        const projActions = document.getElementById('newProjectBtn')?.parentElement;
        if (projActions && !document.getElementById('sampleProjectBtn')) {
            const b = document.createElement('button');
            b.type = 'button'; b.id = 'sampleProjectBtn'; b.className = 'control-button btn-info';
            b.textContent = 'Try the Sample Project';
            b.title = 'Adds a new project of made-up cruise data (two Areas). Your projects are not changed.';
            projActions.appendChild(b);
            b.addEventListener('click', loadSample);
        }
        // First run: wait for script.js to open the project and lay out the screen.
        // Wait for saved projects to load first (storage may be asynchronous), so a returning
        // user is recognised by their projects.
        Promise.resolve(window.TTStore?.ready).catch(() => {})
            .then(() => setTimeout(() => { if (window.TTApp) firstRunOffer(); }, 900));
    }
    if (document.readyState === 'complete') init(); else document.addEventListener('DOMContentLoaded', init);

    window.TTTour = { start: startTour, end: endTour, loadSample, sampleEntries, tours: () => Object.entries(TOURS).map(([name, t]) => ({ name, label: t.label })), currentName: currentTourName };
})();
// --- END OF FILE tour.js ---

// --- START OF script.js (TimberTally 3) ---

// ============================================================
// SERVICE WORKER REGISTRATION & UPDATE HANDLING
// ============================================================
if ('serviceWorker' in navigator) {
    const updateNotification = document.getElementById('updateNotification');
    const updateNowBtn = document.getElementById('updateNowBtn');
    const updateDismissBtn = document.getElementById('updateDismissBtn');
    let newWorker;

    function showUpdateBar() {
        if (updateNotification) updateNotification.style.display = 'flex';
    }
    function hideUpdateBar() {
        if (updateNotification) updateNotification.style.display = 'none';
    }

    window.addEventListener('load', () => {
        try {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    if (!registration) return;   // some browsers / test setups resolve with nothing
                    if (registration.waiting) { newWorker = registration.waiting; showUpdateBar(); }
                    registration.addEventListener('updatefound', () => {
                        const installingWorker = registration.installing;
                        if (installingWorker) {
                            if (!newWorker) newWorker = installingWorker;
                            installingWorker.addEventListener('statechange', () => {
                                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    if (registration.waiting) newWorker = registration.waiting;
                                    showUpdateBar();
                                }
                            });
                        }
                    });
                    setInterval(() => registration.update().catch(() => {}), 3600000);
                })
                .catch(err => console.error('SW registration failed:', err));

            // Reload when an update takes over, but not on the very first install (no worker was
            // controlling the page yet: clients.claim() fires controllerchange then too).
            let refreshing = false;
            const hadController = !!navigator.serviceWorker.controller;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!hadController || refreshing) return;
                refreshing = true;
                window.location.reload();
            });
        } catch (e) { console.error('SW setup error:', e); }

        if (updateNowBtn) {
            updateNowBtn.addEventListener('click', () => {
                if (newWorker) { newWorker.postMessage({ type: 'SKIP_WAITING' }); hideUpdateBar(); }
                else hideUpdateBar();
            });
        }
        if (updateDismissBtn) updateDismissBtn.addEventListener('click', hideUpdateBar);
    });
}

// ============================================================
// CHART.JS BACKGROUND PLUGIN
// ============================================================
if (typeof Chart !== 'undefined') {
    Chart.register({
        id: 'customCanvasBackgroundColor',
        beforeDraw: (chart, args, options) => {
            if (options?.color) {
                const { ctx } = chart;
                ctx.save();
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = options.color;
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        }
    });
}

// ============================================================
// MAIN APPLICATION LOGIC
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Saved projects load from IndexedDB first (storage.js); nothing below runs until they are in.
    try { await window.TTStore?.ready; } catch (e) { console.error('Storage startup failed:', e); }

    // --- DOM References ---
    const dbhSelect           = document.getElementById('dbhSelect');
    const speciesSelect       = document.getElementById('speciesSelect');
    const logsSelect          = document.getElementById('logsSelect');
    const cutCheckbox         = document.getElementById('cutCheckbox');
    const ugsCheckbox         = document.getElementById('ugsCheckbox');
    const notesTextarea       = document.getElementById('notesTextarea');
    const getLocationBtn      = document.getElementById('getLocationBtn');
    // Area notes (Data tab → Area Notes)
    const areaNotesTextarea   = document.getElementById('areaNotesTextarea');
    const areaNotesSavedStatus = document.getElementById('areaNotesSavedStatus');
    // Dark mode
    const darkModeSelect      = document.getElementById('darkModeSelect');
    // Install prompt
    const installBanner       = document.getElementById('installBanner');
    const installAcceptBtn    = document.getElementById('installAcceptBtn');
    const installDismissBtn   = document.getElementById('installDismissBtn');
    const installAppBtn       = document.getElementById('installAppBtn');
    const locationStatus      = document.getElementById('locationStatus');
    const submitBtn           = document.getElementById('submitBtn');
    const saveCsvBtn          = document.getElementById('saveCsvBtn');
    const deleteBtn           = document.getElementById('deleteBtn');
    const deleteAllBtn        = document.getElementById('deleteAllBtn');
    const entriesTableBody    = document.getElementById('entriesTableBody');
    const noEntriesRow        = document.getElementById('noEntriesRow');
    const entryCountSpan      = document.getElementById('entryCount');
    const feedbackMsg         = document.getElementById('feedbackMsg');
    const plotDecrementBtn    = document.getElementById('plotDecrementBtn');
    const plotIncrementBtn    = document.getElementById('plotIncrementBtn');
    const plotNumberDisplay   = document.getElementById('plotNumberDisplay');
    const neededPlotsValue    = document.getElementById('neededPlotsValue');
    const areaDecrementBtn    = document.getElementById('areaDecrementBtn');
    const areaIncrementBtn    = document.getElementById('areaIncrementBtn');
    const areaLetterDisplay   = document.getElementById('areaLetterDisplay');
    const settingsSection     = document.getElementById('settingsSection');
    const bafSelect           = document.getElementById('bafSelect');
    const logRuleSelect       = document.getElementById('logRuleSelect');
    const formClassSelect     = document.getElementById('formClassSelect');
    const formClassGroup      = document.getElementById('formClassGroup');
    const settingsFeedback    = document.getElementById('settingsFeedback');
    const manualUpdateCheckBtn = document.getElementById('manualUpdateCheckBtn');
    const updateCheckStatus   = document.getElementById('updateCheckStatus');
    const showInfoBtn         = document.getElementById('showInfoBtn');
    const showTreeKeyBtn      = document.getElementById('showTreeKeyBtn');
    const newSpeciesInput     = document.getElementById('newSpeciesInput');
    const addSpeciesBtn       = document.getElementById('addSpeciesBtn');
    const removeSpeciesSelect = document.getElementById('removeSpeciesSelect');
    const removeSpeciesBtn    = document.getElementById('removeSpeciesBtn');
    const speciesMgmtFeedback = document.getElementById('speciesMgmtFeedback');
    const projectNameInput    = document.getElementById('projectNameInput');
    const loadProjectSelect   = document.getElementById('loadProjectSelect');
    const loadProjectBtn      = document.getElementById('loadProjectBtn');
    const deleteProjectBtn    = document.getElementById('deleteProjectBtn');
    const csvFileInput        = document.getElementById('csvFileInput');
    const loadCsvBtn          = document.getElementById('loadCsvBtn');
    const projectMgmtFeedback = document.getElementById('projectMgmtFeedback');
    const showCompassBtn      = document.getElementById('showCompassBtn');
    const compassContainer    = document.getElementById('compassContainer');
    const compassNeedle       = document.getElementById('compassNeedle');
    const compassHeading      = document.getElementById('compassHeading');
    const compassSource       = document.getElementById('compassSource');
    const closeCompassBtn     = document.getElementById('closeCompassBtn');
    const treeKeyModal        = document.getElementById('treeKeyModal');
    const closeTreeKeyBtn     = document.getElementById('closeTreeKeyBtn');
    const closeTreeKeyBtnBottom = document.getElementById('closeTreeKeyBtnBottom');
    const autosaveStatus      = document.getElementById('autosaveStatus');
    const tallyAreaSelect     = document.getElementById('tallyAreaSelect');
    const tallySummaryCards   = document.getElementById('tallySummaryCards');
    const tallyResults        = document.getElementById('tallyResults');
    const tallyChartsContainer = document.getElementById('tallyChartsContainer');
    const stockingResults     = document.getElementById('stockingResults');
    const stockingStatsTable  = document.getElementById('stockingStatsTable');
    const stockingNoData      = document.getElementById('stockingNoData');

    // --- Storage Keys ---
    // Everything is stored through storage.js (window.TTStore) under "tt3." keys.
    const Store = window.TTStore;
    const SPECIES_STORAGE_KEY  = Store.K.species;
    const SETTINGS_STORAGE_KEY = Store.K.settings;

    // --- Constants ---
    /** The full guide (the README on GitHub; ./README.md is not cached for offline use). */
    const README_URL         = 'https://github.com/timbertally/timbertally#readme';
    const MIN_PLOT_NUMBER    = 1;
    const MAX_PLOT_NUMBER    = 999;
    const areaLetters        = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

    // --- State ---
    let collectedData       = [];
    let currentLocation     = null;
    /** The open project: the saved copy of everything below (see saveSessionData). */
    let currentProject      = null;
    let currentPlotNumber   = 1;
    let currentAreaIndex    = 0;
    let currentBaf          = 10;
    /** Cruise method: 'baf' (prism) or 'fixed' (fixed-radius plots of currentPlotAcres). */
    let currentCruiseMethod = 'baf';
    let currentPlotAcres    = 0.1;
    /** Data tab collection mode: 'wheel' (scroll wheels) or 'grid' (tap grid, tap-grid.js). */
    let currentEntryMode    = 'wheel';
    /** What the calculations take: the BAF number, or { method: 'fixed', plotAcres }. */
    const cruiseSpec = () => (currentCruiseMethod === 'fixed' ? { method: 'fixed', plotAcres: currentPlotAcres } : currentBaf);
    let currentLogRule      = 'Doyle';
    let currentFormClass    = 78;
    let currentDarkMode     = 'off';
    let deferredInstallPrompt = null;   // holds the beforeinstallprompt event
    let currentSpeciesList  = [];

    // Feedback timeout handles
    let feedbackTimeout = null, settingsFeedbackTimeout = null;
    let speciesFeedbackTimeout = null, projectFeedbackTimeout = null, backupFeedbackTimeout = null;
    let updateStatusTimeout = null;

    // Active tally chart instances
    let tallyChartInstances = [];

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
    /** Escapes text for innerHTML / attribute values (every user or imported string goes through this). */
    const escHtml = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    function showFeedbackMessage(element, message, isError, duration, timeoutHandle) {
        if (!element) return timeoutHandle;
        if (timeoutHandle) clearTimeout(timeoutHandle);
        element.textContent = message;
        element.className = isError ? 'feedback-message error' : 'feedback-message';
        element.style.display = 'block';
        void element.offsetWidth;
        element.style.opacity = 1;
        return setTimeout(() => {
            element.style.opacity = 0;
            setTimeout(() => { element.style.display = 'none'; }, 500);
        }, duration);
    }
    function showFeedback(msg, isError = false, dur = 2500) {
        feedbackTimeout = showFeedbackMessage(feedbackMsg, msg, isError, dur, feedbackTimeout);
    }
    function showSettingsFeedback(msg, isError = false) {
        settingsFeedbackTimeout = showFeedbackMessage(settingsFeedback, msg, isError, 2000, settingsFeedbackTimeout);
    }
    function showSpeciesFeedback(msg, isError = false) {
        speciesFeedbackTimeout = showFeedbackMessage(speciesMgmtFeedback, msg, isError, 2500, speciesFeedbackTimeout);
    }
    function showProjectFeedback(msg, isError = false, dur = 3000) {
        projectFeedbackTimeout = showFeedbackMessage(projectMgmtFeedback, msg, isError, dur, projectFeedbackTimeout);
    }

    // ============================================================
    // AUTOSAVE / SESSION
    // ============================================================
    /**
     * Saves the open project (called after every change). Returns false if the save failed.
     * `opts` goes to Store.saveProject: the screen-off / app-switch save passes
     * { touch: false, ifChanged: true }, so it neither marks the project changed (backup
     * reminder, project order) nor tells other windows anything when nothing changed.
     */
    function saveSessionData(opts) {
        if (!currentProject) return false;
        currentProject.data = collectedData;
        currentProject.plot = currentPlotNumber;
        currentProject.areaIdx = currentAreaIndex;
        const ok = Store.saveProject(currentProject, opts);
        renderProjectMeta();
        return ok;
    }

    /** Another window (installed app + a browser tab) saved the open project: show its version. */
    let reloadingFromRemote = false;
    Store.onRemoteChange(({ id, deleted }) => {
        if (!currentProject || reloadingFromRemote) return;
        if (id !== currentProject.id || deleted) { renderProjectsPanel(); return; }
        reloadingFromRemote = true;
        try {
            flushNotes();
            const p = Store.getProject(id);
            if (!p) return;
            // This window keeps its own place (Area and plot); trees, notes and recs come from storage.
            p.plot = currentPlotNumber; p.areaIdx = currentAreaIndex;
            currentProject = p;
            collectedData = p.data;
            collectedData.forEach((e, i) => { if (!e.id) e.id = Date.now() + i; });
            renderEntries();
            updatePlotDisplay(); updateAreaDisplay();
            renderProjectsPanel();
            window.TTRecs?.render();
            renderTallyTab();
            showFeedback('Updated from another window', false, 3000);
            document.dispatchEvent(new CustomEvent('tt:entries-changed'));
        } finally { reloadingFromRemote = false; }
    });

    /** Header status: the time of the last good save, or a visible error. */
    function renderSaveState(st) {
        const bar = document.getElementById('saveErrorBar');
        if (st.error) {
            if (bar) { bar.hidden = false; bar.textContent = `⚠ Not saved — ${st.error} Tap for help.`; }
            if (autosaveStatus) { autosaveStatus.textContent = '⚠ Not saved'; autosaveStatus.classList.add('save-error'); autosaveStatus.title = st.error; }
        } else {
            if (bar) bar.hidden = true;
            if (autosaveStatus) {
                autosaveStatus.classList.remove('save-error');
                autosaveStatus.textContent = st.lastSavedAt ? `✓ Saved ${new Date(st.lastSavedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : '';
                autosaveStatus.title = 'Every change is saved to the open project automatically';
            }
        }
        updateStickyHeight?.();
    }
    function updateStickyHeight() {
        const block = document.querySelector('.sticky-top-block');
        if (block) document.documentElement.style.setProperty('--sticky-block-height', block.offsetHeight + 'px');
    }

    /** Shows a project: its trees, plot position, notes and recommendations. */
    function openProject(p, { quiet = false } = {}) {
        flushNotes();
        closeAreaNotes(); window.TTPaperEntry?.dismiss();
        currentProject = p;
        if (!p.areaNotes || typeof p.areaNotes !== 'object') p.areaNotes = {};
        if (!p.areaRegen || typeof p.areaRegen !== 'object') p.areaRegen = {};
        Store.setCurrentId(p.id);
        collectedData = Array.isArray(p.data) ? p.data : [];
        collectedData.forEach((e, i) => { if (!e.id) e.id = Date.now() + i; });
        currentPlotNumber = p.plot || 1;
        currentAreaIndex = p.areaIdx || 0;
        notesDirty = false;
        if (projectNameInput) projectNameInput.value = p.name;
        currentLocation = null;
        if (locationStatus) locationStatus.textContent = '';
        renderEntries();
        updatePlotDisplay(); updateAreaDisplay(); calculateAndDisplayNeededPlots();
        renderProjectsPanel();
        window.TTRecs?.render();
        if (!quiet) showProjectFeedback(`Opened "${p.name}".`);
    }

    // ============================================================
    // PROJECTS TAB: switch / new / copy / delete, backup & restore, safety copies
    // ============================================================
    const fmtDate = t => (t ? new Date(t).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'never');
    const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

    function renderProjectMeta() {
        const el = document.getElementById('projectMeta');
        if (!el || !currentProject) return;
        const trees = collectedData.filter(e => !e.emptyPlot).length;
        const plots = new Set(collectedData.map(e => `${e.areaLetter}-${e.plotNumber}`)).size;
        el.textContent = `${plural(trees, 'tree')} · ${plural(plots, 'plot')} · saved automatically · last backup: ${fmtDate(currentProject.lastBackupAt)}`;
    }

    function renderProjectsPanel() {
        if (loadProjectSelect) {
            const list = Store.listProjects().filter(m => m.id !== currentProject?.id);
            loadProjectSelect.innerHTML = list.length
                ? list.map(m => `<option value="${escHtml(m.id)}">${escHtml(m.name)} — ${plural(m.treeCount || 0, 'tree')}</option>`).join('')
                : '<option value="">No other projects</option>';
            loadProjectSelect.disabled = !list.length;
            if (loadProjectBtn) loadProjectBtn.disabled = !list.length;
        }
        renderProjectMeta();
        renderSnapshots();
        renderBackupStatus();
    }

    function renderSnapshots() {
        const box = document.getElementById('snapshotList');
        if (!box) return;
        const list = Store.listSnapshots();
        box.innerHTML = list.length ? list.map(s => `
            <div class="snapshot-row">
                <div class="snapshot-info"><b>${escHtml(s.name)}</b><span>${escHtml(s.reason)} · ${fmtDate(s.createdAt)} · ${plural(s.treeCount || 0, 'tree')}</span></div>
                <button type="button" class="control-button btn-info" data-restore-snap="${escHtml(s.id)}">Restore</button>
            </div>`).join('') : '<p class="placeholder-msg" style="padding:6px;">No safety copies in the last 7 days.</p>';
    }

    async function renderBackupStatus() {
        const el = document.getElementById('backupStatus');
        if (!el) return;
        const list = Store.listProjects();
        const last = list.length ? Math.min(...list.map(m => m.lastBackupAt || 0)) : 0;
        const info = await Store.storageInfo();
        const keep = info.persisted === true ? 'protected from clean-up' : info.persisted === false ? 'not protected — install the app to keep it safe' : '';
        el.textContent = `${plural(list.length, 'project')} on this device · oldest backup: ${fmtDate(last || 0)} · ${info.usedKb} KB used${keep ? ' · ' + keep : ''}`;
        renderBackupReminder();
    }

    /**
     * Takes a safety copy of the open project before a destructive action and waits until it is
     * really stored. Resolves false (do not go on) when it failed and the user does not continue.
     */
    async function safetyCopy(reason) {
        saveSessionData();
        if (await Store.snapshot(currentProject, reason)) { renderSnapshots(); return true; }
        return confirm('A safety copy could not be kept (device storage is full). Continue anyway?');
    }

    function handleNewProject() {
        const name = prompt('Name for the new project:', `Cruise ${new Date().toLocaleDateString()}`);
        if (name === null) return;
        saveSessionData();
        const p = Store.blankProject(name.trim() || 'Untitled Cruise');
        if (!Store.saveProject(p)) { showProjectFeedback('Could not create the project — device storage is full.', true, 5000); return; }
        openProject(p, { quiet: true });
        showProjectFeedback(`Created "${p.name}". Your other projects are still saved.`);
    }

    function handleOpenProject() {
        const id = loadProjectSelect?.value;
        if (!id) return;
        saveSessionData();
        const p = Store.getProject(id);
        if (!p) { showProjectFeedback('That project could not be read.', true); renderProjectsPanel(); return; }
        openProject(p);
    }

    function handleCopyProject() {
        saveSessionData();
        const copy = Store.addProjectCopy(currentProject, `${currentProject.name} (copy)`);
        if (!copy) { showProjectFeedback('Could not copy — device storage is full.', true, 5000); return; }
        renderProjectsPanel();
        showProjectFeedback(`Saved a copy: "${copy.name}". You are still in "${currentProject.name}".`);
    }

    async function handleDeleteProject() {
        if (!currentProject) return;
        const n = collectedData.filter(e => !e.emptyPlot).length;
        if (!confirm(`Delete project "${currentProject.name}" (${plural(n, 'tree')})?\n\nA safety copy is kept for 7 days on this tab.`)) return;
        if (!(await safetyCopy('Project deleted'))) return;
        const gone = currentProject.name;
        Store.deleteProject(currentProject.id);
        const next = Store.listProjects()[0];
        let p = next ? Store.getProject(next.id) : null;
        if (!p) { p = Store.blankProject('Untitled Cruise'); Store.saveProject(p); }
        currentProject = null;
        openProject(p, { quiet: true });
        showProjectFeedback(`Deleted "${gone}". Opened "${p.name}".`);
    }

    function handleRestoreSnapshot(id) {
        const snap = Store.getSnapshot(id);
        const meta = Store.listSnapshots().find(s => s.id === id);
        if (!snap || !meta) { showProjectFeedback('That safety copy is no longer available.', true); renderSnapshots(); return; }
        saveSessionData();
        const copy = Store.addProjectCopy(snap, `${meta.name} (restored ${new Date(meta.createdAt).toLocaleDateString()})`);
        if (!copy) { showProjectFeedback('Could not restore — device storage is full.', true, 5000); return; }
        openProject(copy, { quiet: true });
        showProjectFeedback(`Restored "${copy.name}" as a new project.`, false, 4000);
    }

    async function handleSaveBackup() {
        saveSessionData();
        const fb = m => { backupFeedbackTimeout = showFeedbackMessage(document.getElementById('backupFeedback'), m.text, m.err, 5000, backupFeedbackTimeout); };
        try {
            const backup = Store.buildBackup();
            const d = new Date(), pad = n => String(n).padStart(2, '0');
            const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
            const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
            const r = await Store.saveFile(blob, `TimberTally_Backup_${stamp}.json`);
            if (r === 'cancelled') return fb({ text: 'Backup cancelled.', err: false });
            const t = Date.now();
            Store.markAllBackedUp(t);
            if (currentProject) currentProject.lastBackupAt = t;
            renderProjectsPanel();
            fb({ text: r === 'downloaded'
                ? `✓ Backup downloaded (${plural(backup.projects.length, 'project')}). Move it into OneDrive or Google Drive, or email it to yourself.`
                : `✓ Backup saved (${plural(backup.projects.length, 'project')}).`, err: false });
        } catch (e) {
            fb({ text: `Backup failed: ${e.message}`, err: true });
        }
    }

    function handleRestoreBackupFile(file) {
        const fb = (text, err) => { backupFeedbackTimeout = showFeedbackMessage(document.getElementById('backupFeedback'), text, err, 7000, backupFeedbackTimeout); };
        const reader = new FileReader();
        reader.onload = () => {
            try {
                saveSessionData();
                const r = Store.restoreBackup(Store.parseBackup(String(reader.result)));
                initializeSpeciesManagement();
                renderProjectsPanel();
                const parts = [];
                if (r.added.length) parts.push(`added ${plural(r.added.length, 'project')}: ${r.added.join(', ')}`);
                if (r.skipped.length) parts.push(`${plural(r.skipped.length, 'project')} already here, skipped`);
                if (r.failed.length) parts.push(`${r.failed.length} could not be saved (storage full)`);
                if (!r.added.length && !r.failed.length) fb(r.skipped.length ? `Nothing new — all ${plural(r.skipped.length, 'project')} in that backup are already on this device.` : 'The backup had no projects.', false);
                else fb(`✓ Restore ${parts.join('; ')}.${r.added.length ? ' Open them from "Switch to Another Project".' : ''}`, r.failed.length > 0);
            } catch (e) { fb(e.message, true); }
        };
        reader.onerror = () => fb('Could not read that file.', true);
        reader.readAsText(file);
    }

    /** Banner once any project has gone more than 7 days with changes that aren't in a backup. */
    function renderBackupReminder() {
        const el = document.getElementById('backupReminder');
        if (!el) return;
        const now = Date.now();
        const stale = Store.listProjects().filter(m => (m.treeCount || 0) > 0 && m.updatedAt > (m.lastBackupAt || 0));
        const oldest = Math.min(...stale.map(m => m.lastBackupAt || m.createdAt));
        const snoozed = Number(Store.readJSON(Store.K.backupSnooze, 0)) > now;
        const days = stale.length ? Math.floor((now - oldest) / 86400000) : 0;
        const show = stale.length > 0 && days >= 7 && !snoozed;
        el.hidden = !show;
        if (show) document.getElementById('backupReminderText').textContent = `No backup in ${days} days. Save one so your cruise data is safe off this device.`;
        updateStickyHeight();
    }

    // ============================================================
    // SETTINGS    // ============================================================
    // SETTINGS
    // ============================================================
    function updateFormClassVisibility() {
        if (!logRuleSelect || !formClassGroup) return;
        formClassGroup.hidden = (logRuleSelect.value !== 'Doyle');
    }

    function saveSettings() {
        Store.writeJSON(SETTINGS_STORAGE_KEY, {
            baf: currentBaf, logRule: currentLogRule,
            formClass: currentFormClass, darkMode: currentDarkMode,
            cruiseMethod: currentCruiseMethod, plotAcres: currentPlotAcres, entryMode: currentEntryMode
        });
        window.dispatchEvent(new CustomEvent('tt-settings-changed'));
    }

    function loadSettings() {
        try {
            const json = localStorage.getItem(SETTINGS_STORAGE_KEY);
            if (json) {
                const s = JSON.parse(json);
                if (s && typeof s === 'object') {
                    currentBaf = parseInt(s.baf, 10) || 10;
                    currentLogRule = ['Doyle','Scribner','International'].includes(s.logRule) ? s.logRule : 'Doyle';
                    currentFormClass = parseInt(s.formClass, 10) || 78;
                    if (!VALID_DOYLE_FC.includes(currentFormClass)) currentFormClass = 78;
                    currentDarkMode = ['off','on','system'].includes(s.darkMode) ? s.darkMode : 'off';
                    if (bafSelect) bafSelect.value = String(currentBaf);
                    if (logRuleSelect) logRuleSelect.value = currentLogRule;
                    if (formClassSelect) formClassSelect.value = String(currentFormClass);
                    if (darkModeSelect) darkModeSelect.value = currentDarkMode;
                    // Older saved settings have no cruise method: they stay on the prism.
                    currentCruiseMethod = s.cruiseMethod === 'fixed' ? 'fixed' : 'baf';
                    currentPlotAcres = FIXED_PLOT_SIZES.some(p => p.acres === Number(s.plotAcres)) ? Number(s.plotAcres) : 0.1;
                    currentEntryMode = s.entryMode === 'grid' ? 'grid' : 'wheel';
                    syncCruiseControls();
                } else applyDefaultSettings();
            } else applyDefaultSettings();
        } catch (e) { applyDefaultSettings(); }
        applyDarkMode();
        if (settingsSection) settingsSection.hidden = true;
        updateSaveBtnLabel();
    }

    function applyDefaultSettings() {
        currentBaf = 10; currentLogRule = 'Doyle'; currentFormClass = 78;
        currentDarkMode = 'off';
        currentCruiseMethod = 'baf'; currentPlotAcres = 0.1; currentEntryMode = 'wheel';
        syncCruiseControls();
        if (bafSelect) bafSelect.value = '10';
        if (logRuleSelect) logRuleSelect.value = 'Doyle';
        if (formClassSelect) formClassSelect.value = '78';
        if (darkModeSelect) darkModeSelect.value = 'off';
        saveSettings();
    }

    /** Cruise method / plot size / collection mode selects match the current settings. */
    function syncCruiseControls() {
        const m = document.getElementById('cruiseMethodSelect'), ps = document.getElementById('plotSizeSelect'), em = document.getElementById('entryModeSelect');
        if (m) m.value = currentCruiseMethod;
        if (ps) ps.value = String(currentPlotAcres);
        if (em) em.value = currentEntryMode;
        const bg = document.getElementById('bafGroup'), pg = document.getElementById('plotSizeGroup');
        if (bg) bg.hidden = currentCruiseMethod === 'fixed';
        if (pg) pg.hidden = currentCruiseMethod !== 'fixed';
        document.body.classList.toggle('entry-grid', currentEntryMode === 'grid');
    }

    function applyDarkMode() {
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const useDark = currentDarkMode === 'on' || (currentDarkMode === 'system' && prefersDark);
        document.body.classList.toggle('dark-mode', useDark);
        if (document.getElementById('tab-tally')?.classList.contains('active')) renderStockingChart();
    }

    function updateSaveBtnLabel() {
        if (saveCsvBtn) saveCsvBtn.textContent = '\uD83D\uDCBE Save ZIP';
    }

    // ============================================================
    // SPECIES MANAGEMENT
    // ============================================================
    function saveSpeciesList() {
        Store.writeJSON(SPECIES_STORAGE_KEY, currentSpeciesList);
    }

    function populateSpeciesDropdowns() {
        if (!speciesSelect || !removeSpeciesSelect) return;
        const currentVal = speciesSelect.value;
        speciesSelect.innerHTML = '';
        removeSpeciesSelect.innerHTML = '';
        currentSpeciesList.sort((a, b) => a.localeCompare(b)).forEach(sp => {
            const o1 = document.createElement('option'); o1.value = o1.textContent = sp;
            const o2 = document.createElement('option'); o2.value = o2.textContent = sp;
            speciesSelect.appendChild(o1);
            removeSpeciesSelect.appendChild(o2);
        });
        const ph = document.createElement('option');
        ph.value = ''; ph.textContent = 'Pick a species…'; ph.disabled = true;
        speciesSelect.insertBefore(ph, speciesSelect.firstChild);
        speciesSelect.value = currentSpeciesList.includes(currentVal) ? currentVal : '';
        renderSpeciesQuickPick(true);
    }

    function initializeSpeciesManagement() {
        const valid = v => Array.isArray(v) && v.length > 0 && v.every(s => typeof s === 'string');
        // Store.readJSON also finds the IndexedDB copy if the phone cleared localStorage.
        const stored = Store.readJSON(SPECIES_STORAGE_KEY, null);
        if (valid(stored)) {
            currentSpeciesList = [...stored];
        } else {
            // No saved list: start from the TimberTally 2 list if there is one, else the defaults,
            // plus every species already in the saved projects, so nothing tallied goes missing.
            let legacy = null;
            try { legacy = JSON.parse(localStorage.getItem('timberTallyCustomSpecies') || 'null'); } catch (e) { /* ignore */ }
            const base = valid(legacy) ? legacy : DEFAULT_SPECIES;
            const used = [];
            try {
                for (const m of Store.listProjects()) {
                    for (const e of (Store.getProject(m.id)?.data || [])) if (typeof e.species === 'string' && e.species.trim()) used.push(e.species.trim());
                }
            } catch (e) { /* ignore */ }
            const seen = new Set();
            currentSpeciesList = [...base, ...used].filter(sp => { const k = sp.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
            saveSpeciesList();
        }
        populateSpeciesDropdowns();
    }

    // ============================================================
    // UI POPULATION & DISPLAY
    // ============================================================

    // DBH / Logs scroll wheels (scroll-wheel.js). Hidden inputs hold the values for submit.
    // Trees 10" and under are always 0 logs; larger trees take the log counts the volume
    // tables hold for that DBH (forestry-calc.js logsChoicesFor: up to 4 at 12-18", 5 at
    // 20-26", 6 at 28"+) or Cull, so every choice has a board-foot volume.
    const DBH_MIN = 4, DBH_MAX = 40, DBH_STEP = 2, MAX_ZERO_LOG_DBH = 10;
    const DBH_VALUES = [];
    for (let d = DBH_MIN; d <= DBH_MAX; d += DBH_STEP) DBH_VALUES.push({ value: String(d), label: `${d}"` });
    const logsWheelValues = dbh => (parseInt(dbh, 10) <= MAX_ZERO_LOG_DBH ? ['0'] : [...logsChoicesFor(dbh), 'Cull']).map(v => ({ value: v, label: v }));
    let dbhWheel = null, logsWheel = null;

    function setLogsValue(v) {
        if (logsSelect) logsSelect.value = v;
        if (logsWheel && logsWheel.getValue() !== v) logsWheel.setValue(v);
        window.TapGrid?.sync();
    }
    function setDbhValue(val) {
        const clamped = Math.max(DBH_MIN, Math.min(DBH_MAX, val));
        if (dbhSelect) dbhSelect.value = String(clamped);
        if (dbhWheel && dbhWheel.getValue() !== String(clamped)) dbhWheel.setValue(String(clamped));
        checkAndSetLogsForDbh();
        updateBorderlineText();
        window.TapGrid?.sync();
    }
    /** Shared DBH / Logs state for the tap grid (tap-grid.js): the wheels and grid stay in step. */
    /** The open project for property.js / merge.js. */
    window.ttProject = {
        get: () => currentProject,
        getData: () => collectedData,
        /** Replaces the open project's trees (merge.js) and redraws everything. */
        setData: data => { collectedData = data; renderEntries(); updatePlotDisplay(); updateAreaDisplay(); return saveSessionData(); },
        save: () => saveSessionData(),
        safetyCopy: reason => safetyCopy(reason),
    };
    window.ttEntry = {
        dbhValues: () => DBH_VALUES.map(v => v.value),
        logValues: dbh => logsWheelValues(dbh).map(v => v.value),
        getDbh: () => dbhSelect?.value || '',
        getLogs: () => logsSelect?.value || '',
        setDbh: d => setDbhValue(parseInt(d, 10)),
        setLogs: v => setLogsValue(v),
        submit: () => handleSubmitEntry(),
        mode: () => currentEntryMode,
    };
    function populateDbhOptions() {
        const el = document.getElementById('dbhWheel');
        if (el && window.createScrollWheel) {
            dbhWheel = window.createScrollWheel(el, { id: 'dbhWheelList', ariaLabel: 'Select DBH', values: DBH_VALUES, value: '10', onChange: v => setDbhValue(parseInt(v, 10)) });
        }
        setDbhValue(10);
    }
    function populateLogsOptions() {
        const el = document.getElementById('logsWheel');
        const vals = logsWheelValues(dbhSelect?.value || '10');
        if (el && window.createScrollWheel && !logsWheel) {
            logsWheel = window.createScrollWheel(el, { id: 'logsWheelList', ariaLabel: 'Select Logs', values: vals, value: vals[0].value, onChange: v => setLogsValue(v) });
        }
        setLogsValue(vals[0].value);
    }

    /** Keeps the Logs wheel's choices in step with DBH (moving above 10" starts at 1 log). */
    function checkAndSetLogsForDbh() {
        if (!dbhSelect || !logsSelect) return;
        const vals = logsWheelValues(dbhSelect.value);
        const cur = logsSelect.value;
        let next;
        if (vals.some(v => v.value === cur)) next = cur;
        else if (vals.length === 1) next = vals[0].value;
        else {
            // More logs than this DBH's table holds: clamp to the largest it has; else 1 log.
            const nums = vals.filter(v => v.value !== 'Cull').map(v => v.value);
            const n = parseFloat(cur);
            next = n > parseFloat(nums[nums.length - 1]) ? nums[nums.length - 1] : (nums.includes('1') ? '1' : nums[0]);
        }
        if (logsWheel) logsWheel.setValues(vals, next);
        setLogsValue(next);
    }

    // ---- Species quick-pick: the 8 most-used species (2 rows of 4), refreshed every 10 entries ----
    const STARTER_SPECIES = ['White Oak', 'Red Oak', 'Yellow-poplar', 'Yellow Poplar', 'Hickory'];
    let quickPickKey = null;
    function topSpecies() {
        const counts = new Map();
        for (const e of collectedData) if (currentSpeciesList.includes(e.species)) counts.set(e.species, (counts.get(e.species) || 0) + 1);
        const used = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([s]) => s);
        // Fill the first row with starters until the user's own species do.
        for (const s of STARTER_SPECIES) if (used.length < 4 && currentSpeciesList.includes(s) && !used.includes(s)) used.push(s);
        return used;
    }
    /** Shorter forms of a name for a narrow button: regional words first (Northern → N.), then the most-shared word. */
    const REGIONAL = { northern: 'N.', southern: 'S.', eastern: 'E.', western: 'W.', american: 'Am.' };
    function speciesShortForms(name) {
        const forms = [name];
        const push = f => { if (!forms.includes(f)) forms.push(f); };
        const initial = w => `${w[0].toUpperCase()}.`;
        let words = name.trim().split(/\s+/);
        if (words.length === 1) {
            const dash = name.indexOf('-');
            if (dash > 0 && dash < name.length - 1) push(`${initial(name)} ${name[dash + 1].toUpperCase()}${name.slice(dash + 2)}`);
            return forms;
        }
        words = words.map(w => REGIONAL[w.toLowerCase()] || w);
        push(words.join(' '));
        const uses = w => currentSpeciesList.filter(s => s.toLowerCase().split(/[\s-]+/).includes(w.toLowerCase())).length;
        const order = words.map((w, i) => ({ i, n: uses(w), abbr: w.endsWith('.') })).filter(x => !x.abbr).sort((a, b) => b.n - a.n || a.i - b.i);
        for (const { i } of order.slice(0, -1)) {
            words = words.map((w, j) => (j === i ? initial(w) : w));
            push(words.join(' '));
        }
        return forms;
    }
    function fitQuickLabels(box) {
        const btn = box.querySelector('.sp-btn:not(.species-quick-empty)');
        const c2d = document.createElement('canvas').getContext('2d');
        if (!btn || !c2d) return;
        const cs = getComputedStyle(btn);
        const room = btn.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        if (room <= 0) return;
        c2d.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const taken = new Set();
        box.querySelectorAll('.sp-btn[data-species]').forEach(b => {
            const name = b.dataset.species;
            const forms = speciesShortForms(name).filter(f => f === name || (!taken.has(f) && !currentSpeciesList.includes(f)));
            const label = forms.find(f => c2d.measureText(f).width <= room) || forms[forms.length - 1];
            b.textContent = label;
            taken.add(label);
        });
    }
    function renderSpeciesQuickPick(force) {
        const box = document.getElementById('speciesQuick');
        if (!box) return;
        const n = collectedData.length;
        const key = `${n < 20 ? n : Math.floor(n / 10) * 10}|${currentSpeciesList.join('|')}`;
        if (force || key !== quickPickKey) {
            quickPickKey = key;
            const top = topSpecies();
            const slots = top.length > 4 ? 8 : 4;
            box.innerHTML = top.map(s => `<button type="button" class="sp-btn" data-species="${escHtml(s)}" title="${escHtml(s)}">${escHtml(s)}</button>`).join('')
                + Array.from({ length: slots - top.length }, () => '<button type="button" class="sp-btn species-quick-empty" disabled aria-hidden="true" tabindex="-1"></button>').join('');
            fitQuickLabels(box);
        }
        const cur = speciesSelect?.value;
        box.querySelectorAll('.sp-btn[data-species]').forEach(b => b.classList.toggle('selected', b.dataset.species === cur));
        if (speciesSelect) speciesSelect.classList.toggle('select-empty', !cur);
    }

    /** "· 3 trees" beside Plot # for the current plot. */
    function updatePlotTreeCount() {
        const el = document.getElementById('plotTreeCount');
        if (!el) return;
        const letter = areaLetters[currentAreaIndex];
        const n = collectedData.filter(e => e.areaLetter === letter && e.plotNumber === currentPlotNumber && !e.emptyPlot).length;
        el.textContent = n ? ` · ${n} tree${n === 1 ? '' : 's'}` : '';
        updateEmptyPlotLine();
    }

    function setNotesOpen(open) {
        const group = document.getElementById('notesGroup');
        const btn = document.getElementById('notesToggleBtn');
        const hasNote = !!notesTextarea?.value.trim();
        if (group) group.hidden = !(open || hasNote);
        if (btn) {
            btn.classList.toggle('on', open || hasNote);
            btn.setAttribute('aria-expanded', String(open || hasNote));
            const dot = btn.querySelector('.tool-dot');
            if (dot) dot.hidden = !hasNote;
        }
    }

    /** The line above the counters: project name, "Area A · Plot 3", and the Area Notes dot. */
    function updateDataStrip() {
        const name = document.getElementById('dataProjectName');
        const line = document.getElementById('dataContextLine');
        if (name) name.textContent = currentProject?.name || '';
        if (line) line.textContent = `Area ${areaLetters[currentAreaIndex]} · Plot ${currentPlotNumber}`;
        const dot = document.querySelector('#areaNotesBtn .tool-dot');
        const cur = areaLetters[currentAreaIndex];
        const has = !!String(currentProject?.areaNotes?.[cur] || '').trim() || !!currentProject?.areaRegen?.[cur];
        if (dot) dot.hidden = !has;
        document.getElementById('areaNotesBtn')?.classList.toggle('has-notes', has);
    }

    function updatePlotDisplay() {
        if (plotNumberDisplay) plotNumberDisplay.textContent = currentPlotNumber;
        if (plotDecrementBtn) plotDecrementBtn.disabled = currentPlotNumber <= MIN_PLOT_NUMBER;
        if (plotIncrementBtn) plotIncrementBtn.disabled = currentPlotNumber >= MAX_PLOT_NUMBER;
        updatePlotTreeCount();
        updateDataStrip();
    }

    function updateAreaDisplay() {
        if (areaLetterDisplay) areaLetterDisplay.textContent = areaLetters[currentAreaIndex];
        if (areaDecrementBtn) areaDecrementBtn.disabled = currentAreaIndex <= 0;
        if (areaIncrementBtn) areaIncrementBtn.disabled = currentAreaIndex >= areaLetters.length - 1;
        updatePlotTreeCount();
        updateDataStrip();
    }

    function renderEntries() {
        if (!entriesTableBody || !entryCountSpan || !noEntriesRow || !saveCsvBtn || !deleteAllBtn || !deleteBtn) return;
        entriesTableBody.innerHTML = '';
        entryCountSpan.textContent = collectedData.length;
        const hasData = collectedData.length > 0;
        noEntriesRow.hidden = hasData;
        if (hasData) {
            collectedData.forEach((entry, idx) => {
                if (!entry.id) entry.id = Date.now() + idx;
            });
            for (let i = collectedData.length - 1; i >= 0; i--) {
                const e = collectedData[i];
                if (!e) continue;
                const tr = document.createElement('tr');
                tr.dataset.id = e.id;
                if (e.emptyPlot) {
                    tr.className = 'empty-plot-row';
                    tr.innerHTML = `
                    <td><input type="checkbox" data-id="${escHtml(e.id)}"></td>
                    <td>${escHtml(e.plotNumber ?? '?')}</td>
                    <td>${escHtml(e.areaLetter ?? '?')}</td>
                    <td colspan="5">Empty plot (no tally trees)</td>`;
                } else tr.innerHTML = `
                    <td><input type="checkbox" data-id="${escHtml(e.id)}"></td>
                    <td>${escHtml(e.plotNumber ?? '?')}</td>
                    <td>${escHtml(e.areaLetter ?? '?')}</td>
                    <td>${escHtml(e.species ?? 'N/A')}</td>
                    <td>${escHtml(e.dbh ?? '?')}</td>
                    <td>${escHtml(e.logs ?? '?')}</td>
                    <td>${escHtml(e.cutStatus || 'No')}</td>
                    <td>${escHtml(e.ugsStatus || 'No')}</td>`;
                entriesTableBody.appendChild(tr);
            }
        }
        saveCsvBtn.disabled = !hasData;
        deleteAllBtn.disabled = !hasData;
        deleteBtn.disabled = !isAnyCheckboxChecked();
        calculateAndDisplayNeededPlots();
        updatePlotTreeCount();
        renderSpeciesQuickPick();
    }

    function isAnyCheckboxChecked() {
        return entriesTableBody?.querySelector('input[type="checkbox"]:checked') !== null;
    }

    /** Small ⓘ that opens a term's meaning (glossary.js). */
    const ti = k => (window.ttTermBtn ? window.ttTermBtn(k) : '');

    // "Enough plots?" panel for the current Area (ForestScribe's SamplingStats).
    // Uses the per-plot volume stats (BAF or fixed plots, empty plots count) and
    // t = 2, so it matches the Summary Report and CSV. Collapsed: plots needed
    // for ±10/15/20%; expanded: sampling error, mean, 95% CI, SE and CV.
    const SAMPLING_OPEN_KEY = 'tt3.samplingOpen';
    let samplingOpen = false;
    try { samplingOpen = localStorage.getItem(SAMPLING_OPEN_KEY) === '1'; } catch (_) { /* private mode */ }
    function setSamplingOpen(open) {
        samplingOpen = open;
        try { localStorage.setItem(SAMPLING_OPEN_KEY, open ? '1' : '0'); } catch (_) { /* ignore */ }
        calculateAndDisplayNeededPlots();
    }
    document.getElementById('samplingToggle')?.addEventListener('click', () => setSamplingOpen(!samplingOpen));

    function calculateAndDisplayNeededPlots() {
        if (!neededPlotsValue) return;
        const toggle = document.getElementById('samplingToggle');
        const detail = document.getElementById('samplingDetail');
        const letter = areaLetters[currentAreaIndex];
        const areaData = collectedData.filter(e => e.areaLetter === letter);
        const stats = calculatePlotStats(areaData, cruiseSpec(), currentLogRule, currentFormClass);
        const n = stats ? stats.numValidPlots : 0;
        const ready = stats && n >= 2 && stats.meanV > 0;
        const t = 2;
        const fmtN = v => Math.round(v).toLocaleString();
        const need = E => plotsNeeded(stats.cvV, E, t);
        const mark = E => n >= need(E)
            ? `<span class="met">✓${need(E)}</span>`
            : `<span class="not-met">${need(E)}</span>`;

        neededPlotsValue.innerHTML = ready
            ? `Plots needed ±10%: ${mark(10)} &nbsp;±15%: ${mark(15)} &nbsp;±20%: ${mark(20)}`
            : 'Plots needed: need 2+ plots';
        const open = samplingOpen && ready;
        if (toggle) {
            toggle.setAttribute('aria-expanded', String(open));
            toggle.classList.toggle('open', open);
            toggle.disabled = !ready;
        }
        if (!detail) return;
        detail.hidden = !open;
        if (!open) { detail.innerHTML = ''; return; }
        const se = stats.stdDevV / Math.sqrt(n);
        const pct = (t * se / stats.meanV) * 100;
        const lo = Math.max(0, Math.round(stats.meanV - t * se)), hi = Math.round(stats.meanV + t * se);
        const adequate = pct <= 15;
        detail.innerHTML =
            `<div><b>Enough plots?</b> (${n} plots) ${adequate ? '<span class="met">✓ Yes</span>' : '<span class="not-met">Not yet</span>'}</div>` +
            `<div>Sampling error ${ti('samplingError')} <b>${pct.toFixed(1)}%</b> · Mean <b>${fmtN(stats.meanV)} BF/ac</b></div>` +
            `<div>95% CI ${ti('ci')} <b>${lo.toLocaleString()} – ${hi.toLocaleString()} BF/ac</b> · SE ${ti('se')} <b>±${fmtN(se)}</b> · CV ${ti('cv')} <b>${stats.cvV.toFixed(1)}%</b></div>` +
            `<div>Plots needed for ±10%: ${mark(10)} &nbsp; ±15%: ${mark(15)} &nbsp; ±20%: ${mark(20)}</div>`;
    }

    // ============================================================
    // TALLY & STATS

    function displayTallyResults(tallyData) {
        if (!tallyResults) return;
        tallyResults.innerHTML = '';
        const speciesKeys = Object.keys(tallyData).sort();
        if (!speciesKeys.length) {
            tallyResults.innerHTML = '<p class="no-tally-data">No data to tally.</p>';
            return;
        }
        speciesKeys.forEach(species => {
            const div = document.createElement('div');
            div.classList.add('tally-species');
            div.innerHTML = `<h3>${escHtml(species)}</h3>`;
            const dbhKeys = Object.keys(tallyData[species]).sort((a,b) => Number(a)-Number(b));
            dbhKeys.forEach(dbh => {
                div.innerHTML += `<h4>DBH: ${escHtml(dbh)}"</h4>`;
                const logKeys = Object.keys(tallyData[species][dbh]).sort((a,b) => {
                    if (a==='Cull') return 1; if (b==='Cull') return -1;
                    const nA=parseFloat(a), nB=parseFloat(b);
                    return isNaN(nA)?1:isNaN(nB)?-1:nA-nB;
                });
                logKeys.forEach(logs => {
                    const counts = tallyData[species][dbh][logs];
                    const cut = counts['Yes'] || 0, notCut = counts['No'] || 0;
                    if (cut > 0) div.innerHTML += `<div class="tally-log-item"><span class="log-label">Logs: ${escHtml(logs)} (Cut)</span> — <span class="log-count">${cut}</span></div>`;
                    if (notCut > 0) div.innerHTML += `<div class="tally-log-item"><span class="log-label">Logs: ${escHtml(logs)} (Leave)</span> — <span class="log-count">${notCut}</span></div>`;
                });
            });
            tallyResults.appendChild(div);
        });
    }

    // ============================================================
    // STOCKING CHART (wrapper — rendering delegated to charts.js)
    // ============================================================
    function renderStockingChart() {
        const areaStats = calculateStandStocking(collectedData, cruiseSpec());
        if (!areaStats?.length) {
            if (stockingResults) stockingResults.style.display = 'none';
            if (stockingNoData) stockingNoData.style.display = 'block';
            return;
        }
        if (stockingNoData) stockingNoData.style.display = 'none';
        if (stockingResults) stockingResults.style.display = 'block';

        // Stats table
        if (stockingStatsTable) {
            const f0 = v => v.toFixed(0), f1 = v => v.toFixed(1);
            const levelCls = l => (l === 'Overstocked' ? 'stk-over' : l === 'Fully stocked' ? 'stk-full' : 'stk-under');
            const anyCut = areaStats.some(s => s.cutTpa > 0);
            let html = `<table><thead><tr><th>Area</th><th>Plots</th><th>TPA ${ti('tpa')}</th><th>BA/Ac ${ti('ba')}</th><th>QMD ${ti('qmd')}</th><th>Stocking ${ti('stocking')}</th>${anyCut ? '<th>Cut TPA</th><th>Cut BA/Ac</th><th>Leave TPA</th><th>Leave BA/Ac</th><th>After Cut</th>' : ''}</tr></thead><tbody>`;
            areaStats.forEach(s => {
                html += `<tr>
                    <td><strong>${escHtml(s.area)}</strong></td>
                    <td>${s.numPlots}</td>
                    <td>${f0(s.totalTpa)}</td>
                    <td>${f1(s.totalBa)}</td>
                    <td>${f1(s.totalQmd)}"</td>
                    <td><span class="${levelCls(s.totalLevel)}">${f0(s.totalPct)}% · ${s.totalLevel}</span></td>
                    ${anyCut ? `<td>${f0(s.cutTpa)}</td><td>${f1(s.cutBa)}</td><td>${f0(s.leaveTpa)}</td><td>${f1(s.leaveBa)}</td>
                    <td>${s.cutTpa > 0 ? `<span class="${levelCls(s.leaveLevel)}">${f0(s.leavePct)}% · ${s.leaveLevel}</span>` : '—'}</td>` : ''}
                </tr>`;
            });
            html += '</tbody></table>';
            stockingStatsTable.innerHTML = html;
        }

        renderGingrichInto(document.getElementById('stockingChart'), areaStats);
    }

    function renderTallyTab() {
        if (!document.getElementById('tab-tally')?.classList.contains('active')) return;
        const selectedArea = tallyAreaSelect?.value || 'ALL';
        const subset = selectedArea === 'ALL'
            ? collectedData
            : collectedData.filter(e => e.areaLetter === selectedArea);

        // Update area dropdown
        updateTallyAreaDropdown();

        // Summary cards
        if (tallySummaryCards) {
            if (subset.length === 0) {
                tallySummaryCards.innerHTML = '<p class="placeholder-msg" style="padding:10px 12px; margin:0;">No data for selected area.</p>';
            } else {
                const report = calculateForestryReport(subset, cruiseSpec(), currentLogRule, currentFormClass);
                const s = report.summary;
                tallySummaryCards.innerHTML = `
                    <div class="stat-card">
                        <span class="stat-value">${s.totalTreesPerAcre != null ? s.totalTreesPerAcre.toFixed(1) : '—'}</span>
                        <span class="stat-label">Trees/Acre ${ti('tpa')}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${s.totalBaPerAcre != null ? s.totalBaPerAcre.toFixed(1) : '—'}</span>
                        <span class="stat-label">BA/Acre (sq ft) ${ti('ba')}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${s.avgTractDbh != null ? s.avgTractDbh.toFixed(1) + '"' : '—'}</span>
                        <span class="stat-label">Avg DBH (QMD) ${ti('qmd')}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${s.totalVolPerAcre != null ? Math.round(s.totalVolPerAcre) : '—'}</span>
                        <span class="stat-label">Vol/Acre (BF) ${ti('vol')}</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${s.numberOfPlots != null ? s.numberOfPlots : '—'}</span>
                        <span class="stat-label">Plots</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${subset.filter(e => !e.emptyPlot).length}</span>
                        <span class="stat-label">Tree Entries</span>
                    </div>`;
            }
        }

        // Tally breakdown
        if (tallyResults) {
            if (subset.length === 0) {
                tallyResults.innerHTML = '<p class="placeholder-msg">No entries for this area.</p>';
            } else {
                displayTallyResults(generateTallyData(subset));
            }
        }

        // Gingrich stocking chart (every Area)
        renderStockingChart();

        // Property table (property.js): every Area weighted by acres, on All Areas
        const propBox = document.getElementById('propertyTable');
        if (propBox) {
            const html = selectedArea === 'ALL' && typeof calculatePropertySummary === 'function'
                ? renderPropertyTableHtml(calculatePropertySummary(collectedData, currentProject?.areaAcres, cruiseSpec(), currentLogRule, currentFormClass)) : '';
            propBox.innerHTML = html;
            propBox.hidden = !html;
        }

        // In-app charts — charts.js manages instances
        tallyChartInstances.forEach(c => { try { c.destroy(); } catch(e) {} });
        tallyChartInstances = renderTallyCharts(subset, cruiseSpec(), currentLogRule, currentFormClass, tallyChartsContainer);
        window.TTCheckData?.refresh();
    }

    function updateTallyAreaDropdown() {
        if (!tallyAreaSelect) return;
        const cur = tallyAreaSelect.value;
        const areas = [...new Set(collectedData.map(e => e.areaLetter).filter(Boolean))].sort();
        tallyAreaSelect.innerHTML = '<option value="ALL">All Areas</option>';
        areas.forEach(a => {
            const o = document.createElement('option');
            o.value = o.textContent = a;
            tallyAreaSelect.appendChild(o);
        });
        if (areas.includes(cur)) tallyAreaSelect.value = cur;
        else tallyAreaSelect.value = 'ALL';
    }

    // ============================================================
    // CSV PARSING
    // ============================================================
    // The reader itself is parseTreeCsv in csv-match.js (pure, unit-tested).
    function parseCsvAndLoadData(csvContent) {
        return parseTreeCsv(csvContent);
    }

    // ============================================================
    // CSV FORMAT FOR EXPORT

    // ============================================================
    // CSV EXPORT
    // ============================================================
    /**
     * Save: one ZIP with everything for the open project —
     *   Area CSVs (trees, tally, per-plot volumes, forestry report), one per Area
     *   Area Summary Reports (PNG), one per Area
     *   Area Graphs sheets (the four stand charts on one 11 x 8.5 in page), one per Area
     *   the Gingrich stocking chart with every Area (PNG)
     *   Area notes (.txt), when any were written
     * On a phone the ZIP goes to the share sheet (Files, email, Drive) in one step.
     */
    /**
     * The tree rows of an Area CSV (the raw section Import, Match Columns and Merge read back).
     * Text (species, notes) goes through csvCell: quotes doubled, line breaks kept inside the
     * quotes, and a leading = + - @ guarded with ' so a spreadsheet does not run it.
     * Numbers (plot, DBH, logs, GPS) are written as plain numbers (a negative longitude stays a number).
     */
    function entriesCsv(areaData) {
        const num = v => (v == null || v === '' || !Number.isFinite(Number(v)) ? '' : String(Number(v)));
        const area = e => (/^[A-Z]$/.test(e.areaLetter || '') ? e.areaLetter : '');
        let raw = "PlotNumber,Area,DBH,Species,Logs,Cut,UGS,Notes,Latitude,Longitude\n";
        areaData.forEach(e => {
            if (!e) return;
            const loc = e.location || {};
            const gps = `${num(loc.lat)},${num(loc.lon)}`;
            if (e.emptyPlot) {
                raw += `${num(e.plotNumber)},${area(e)},0,"EMPTY PLOT",0,No,No,"No tally trees",${gps}\n`;
                return;
            }
            const logs = e.logs === 'Cull' ? 'Cull' : num(e.logs);
            raw += `${num(e.plotNumber)},${area(e)},${num(e.dbh)},${csvCell(e.species ?? '')},${logs},${e.cutStatus === 'Yes' ? 'Yes' : 'No'},${e.ugsStatus === 'Yes' ? 'Yes' : 'No'},${csvCell(e.notes || '')},${gps}\n`;
        });
        return raw;
    }

    async function generateAndDownloadCsv() {
        if (!collectedData.length) { showFeedback("No data to save.", true); return; }
        if (typeof JSZip === 'undefined') { showFeedback("The ZIP tool did not load. Reload the app and try again.", true, 6000); return; }
        const selBaf = cruiseSpec(), selRule = currentLogRule, selFc = currentFormClass;
        if (saveCsvBtn) saveCsvBtn.disabled = true;
        showFeedback("Building ZIP...", false, 10000);
        const zip = new JSZip();
        const pause = () => new Promise(r => setTimeout(r, 0)); // keep the screen responsive between pages

        async function addCanvasPng(canvas, filename) {
            if (!canvas) return;
            const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
            if (blob) zip.file(filename, blob);
        }

        try {
            const grouped = collectedData.reduce((acc, e) => {
                const area = e.areaLetter || 'Unknown';
                if (!acc[area]) acc[area] = [];
                acc[area].push(e); return acc;
            }, {});
            const sortedAreas = Object.keys(grouped).sort();
            if (!sortedAreas.length) { showFeedback("No areas found.", true); return; }
            const d = new Date(), pad = n => String(n).padStart(2, '0');
            const ts = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
            const projName = projectNameInput?.value.trim() || 'Untitled';
            const projBase = projName.replace(/[^a-z0-9_\-]/gi, '_') || 'TimberTally';
            const ruleP = selRule.substring(0, 4);
            const fcP = selRule === 'Doyle' ? `FC${selFc}` : '';

            for (const [i, areaLetter] of sortedAreas.entries()) {
                const areaData = grouped[areaLetter];
                showFeedback(`Area ${areaLetter} (${i + 1}/${sortedAreas.length})...`, false, 10000);
                await pause();
                let reportData = null, tallyData = null, plotStats = null;
                try { reportData = calculateForestryReport(areaData, selBaf, selRule, selFc); } catch(e) {}
                try { tallyData = generateTallyData(areaData); } catch(e) {}
                try { plotStats = calculatePlotStats(areaData, selBaf, selRule, selFc); } catch(e) {}
                const nameBase = `${projBase}_Area${areaLetter}`;

                if (reportData?.summary?.numberOfPlots > 0) {
                    try {
                        const stock = calculateStandStocking(areaData, selBaf)?.[0];
                        await addCanvasPng(await buildSummaryReportCanvas(reportData, plotStats, areaLetter, projName, selRule, selFc, selBaf, stock), `${nameBase}_Summary_Report.png`);
                    } catch(e) { console.error('Summary report export error:', e); }
                    await pause();
                    try {
                        await addCanvasPng(buildGraphsSheetCanvas(reportData, areaLetter, projName, selRule, selFc, selBaf), `${nameBase}_Graphs.png`);
                    } catch(e) { console.error('Graphs sheet export error:', e); }
                }

                const raw = entriesCsv(areaData);

                let tallyCsv = "\n\n--- TALLY DATA ---\nSpecies,DBH,Logs,Cut Status,Count\n";
                if (tallyData) {
                    Object.keys(tallyData).sort().forEach(sp => {
                        Object.keys(tallyData[sp]).sort((a,b)=>Number(a)-Number(b)).forEach(dbh => {
                            Object.keys(tallyData[sp][dbh]).sort((a,b)=>{if(a==='Cull')return 1;if(b==='Cull')return -1;return (parseFloat(a)||0)-(parseFloat(b)||0);}).forEach(logs => {
                                const c = tallyData[sp][dbh][logs];
                                if (c['Yes']>0) tallyCsv+=`${csvCell(sp)},${dbh},${logs},"Yes",${c['Yes']}\n`;
                                if (c['No']>0)  tallyCsv+=`${csvCell(sp)},${dbh},${logs},"No",${c['No']}\n`;
                            });
                        });
                    });
                }

                let plotCsv = `\n\n--- PER-PLOT VOLUME & STATS (Rule:${selRule}${selRule==='Doyle'?' FC'+selFc:''}, ${cruiseCsvTag(selBaf, ':')}) ---\n`;
                if (plotStats?.numValidPlots > 0) {
                    plotCsv += "Plot,Volume (BF/Acre)\n";
                    const plotsInArea = {};
                    areaData.forEach(e => { if (e?.plotNumber) { const n=parseInt(e.plotNumber,10); if (!isNaN(n)) plotsInArea[n]=true; } });
                    const plotNsInArea = Object.keys(plotsInArea).map(Number).sort((a,b)=>a-b);
                    plotNsInArea.forEach((pn,idx) => { plotCsv += `${pn},${plotStats.plotVolumes?.[idx]??0}\n`; });
                    plotCsv += `\nNum Plots,${plotStats.numValidPlots}\nMean BF/Acre,${plotStats.meanV.toFixed(1)}\n`;
                    if (plotStats.numValidPlots > 1) {
                        plotCsv += `Variance,${(plotStats.stdDevV*plotStats.stdDevV).toFixed(1)}\nStd Dev,${plotStats.stdDevV.toFixed(1)}\nCV (%),${plotStats.cvV.toFixed(1)}\n`;
                    }
                } else plotCsv += "No plot data.\n";

                const reportCsv = reportData ? (() => { try { return formatReportForCsv(reportData); } catch(e) { return "\n--- FORESTRY REPORT DATA ---\nError formatting report.\n"; } })() : "\n--- FORESTRY REPORT DATA ---\nReport failed.\n";

                // Stand & stock tables (property.js), added to the bottom of the same CSV
                let standStockCsv = '';
                try {
                    if (reportData?.summary?.numberOfPlots > 0) {
                        const acres = currentProject?.areaAcres?.[areaLetter];
                        const st = calculateStandStockTable(areaData, selBaf, selRule, selFc);
                        if (st.species.length) standStockCsv = formatStandStockCsv(st, `STAND AND STOCK TABLES - Area ${areaLetter}${acres > 0 ? ` - ${acres} acres` : ''}`, selBaf);
                    }
                } catch(e) { console.error('Stand & stock export error:', e); }

                // The byte-order mark tells Excel the file is UTF-8, so accented species names and symbols read correctly.
                zip.file(`${nameBase}_${ruleP}${fcP}_${cruiseFileTag(selBaf)}.csv`, String.fromCharCode(0xFEFF) + raw + tallyCsv + plotCsv + reportCsv + standStockCsv);
            }

            // Property Summary (property.js): 2+ Areas with trees
            try {
                const ps = calculatePropertySummary(collectedData, currentProject?.areaAcres, selBaf, selRule, selFc);
                if (ps.rows.length >= 2) await addCanvasPng(await buildPropertySummaryCanvas(ps, projName, selRule, selFc, selBaf), `${projBase}_Property_Summary.png`);
            } catch(e) { console.error('Property summary export error:', e); }

            // Gingrich stocking chart: every Area on one chart
            try {
                const allAreaStats = calculateStandStocking(collectedData, selBaf);
                if (allAreaStats?.length) await addCanvasPng(await buildGingrichCanvas(allAreaStats), `${projBase}_Stocking_Chart_All_Areas.png`);
            } catch(e) { console.error('Gingrich export error:', e); }

            // Area notes
            const notesText = getAreaNotesText();
            if (notesText) {
                const header = `TimberTally Area Notes\nProject: ${projName}\nExported: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
                zip.file(`${projBase}_Area_Notes.txt`, header + notesText);
            }

            showFeedback("Compressing ZIP...", false, 10000);
            const zipBlob = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            const zipName = `${projBase}_TimberTally_${ts}.zip`;
            const r = await Store.saveFile(zipBlob, zipName, { description: 'ZIP file', accept: { 'application/zip': ['.zip'] } });
            if (r === 'cancelled') showFeedback('Save cancelled.', false, 3000);
            else showFeedback(`✓ ZIP saved: ${zipName} (${plural(sortedAreas.length, 'Area')})`, false, 5000);
        } catch(err) {
            console.error('Export error:', err);
            showFeedback(`Save Error: ${err.message||'Unknown'}`, true, 6000);
        } finally {
            if (saveCsvBtn) saveCsvBtn.disabled = !collectedData.length;
        }
    }
    // ============================================================
    // EVENT HANDLERS
    // ============================================================
    // Entries that stand for a plot with no tally trees (Record empty plot). They count
    // toward the number of plots (so per-acre values stay right) but hold no tree.
    const isEmptyPlot = e => !!e?.emptyPlot;
    const plotEntries = (letter, plot) => collectedData.filter(e => e.areaLetter === letter && e.plotNumber === plot);

    let submitBusy = false;
    function handleSubmitEntry() {
        // A second (gloved double) tap within half a second doesn't save the tree twice.
        if (submitBusy) return;
        submitBusy = true;
        setTimeout(() => { submitBusy = false; }, 500);
        try {
            if (!dbhSelect || !speciesSelect || !logsSelect || !cutCheckbox) return;
            checkAndSetLogsForDbh();
            const currentLetter = areaLetters[currentAreaIndex];
            const newEntry = {
                id: Date.now(),
                plotNumber: currentPlotNumber, areaLetter: currentLetter,
                dbh: dbhSelect.value, species: speciesSelect.value,
                logs: logsSelect.value,
                cutStatus: cutCheckbox.checked ? 'Yes' : 'No',
                ugsStatus: ugsCheckbox?.checked ? 'Yes' : 'No',
                notes: notesTextarea?.value.trim() || '',
                location: currentLocation
            };
            if (!newEntry.species) { showFeedback("Pick a species first.", true); return; }
            if (!newEntry.dbh || !newEntry.logs) {
                showFeedback("Species, DBH, and Logs are required.", true); return;
            }
            // A tree in a plot recorded as empty: the plot isn't empty any more.
            collectedData = collectedData.filter(e => !(isEmptyPlot(e) && e.areaLetter === currentLetter && e.plotNumber === currentPlotNumber));
            collectedData.push(newEntry);
            renderEntries();
            saveSessionData();
            showFeedback(`✓ Entry recorded — ${newEntry.species} ${newEntry.dbh}" · Plot ${currentPlotNumber}, Area ${currentLetter}`);
            navigator.vibrate?.(50);
            if (cutCheckbox) { cutCheckbox.checked = false; cutChip?.classList.remove('on'); }
            if (ugsCheckbox) { ugsCheckbox.checked = false; ugsChip?.classList.remove('on'); }
            if (notesTextarea) notesTextarea.value = '';
            setNotesOpen(false);
            const usedManualFix = !!currentLocation;
            currentLocation = null;
            if (usedManualFix && locationStatus) { locationStatus.textContent = ''; locationStatus.classList.remove('gps-weak'); }
            maybeAutoGps(newEntry);
        } catch(e) {
            console.error('Submit error:', e);
            showFeedback(`Submit Error: ${e.message}`, true, 5000);
        }
    }

    function handleRecordEmptyPlot() {
        const letter = areaLetters[currentAreaIndex];
        if (plotEntries(letter, currentPlotNumber).length) { showFeedback(`Plot ${currentPlotNumber} already has entries.`, true); return; }
        collectedData.push({
            id: Date.now(), emptyPlot: true,
            plotNumber: currentPlotNumber, areaLetter: letter,
            species: '', dbh: '', logs: '', cutStatus: 'No', ugsStatus: 'No',
            notes: '', location: currentLocation
        });
        currentLocation = null;
        if (locationStatus) { locationStatus.textContent = ''; locationStatus.classList.remove('gps-weak'); }
        renderEntries();
        saveSessionData();
        showFeedback(`✓ Plot ${currentPlotNumber} recorded with no tally trees`);
    }

    /** "No trees in plot N? Record empty plot" under Submit while the plot has no entries. */
    function updateEmptyPlotLine() {
        const el = document.getElementById('emptyPlotLine');
        if (!el) return;
        const list = plotEntries(areaLetters[currentAreaIndex], currentPlotNumber);
        if (list.some(isEmptyPlot)) el.textContent = `Plot ${currentPlotNumber} is recorded with no tally trees.`;
        else if (!list.length) el.innerHTML = `<button type="button" class="link-btn" id="recordEmptyPlotBtn" title="Counts this plot in the per-acre averages even though no trees were tallied">No trees in plot ${currentPlotNumber}? Record empty plot</button>`;
        else el.textContent = '';
    }

    // ============================================================
    // GPS (averaged fix, ported from ForestScribe)
    // ============================================================
    /** Accuracy worse than this (m) is flagged as weak. */
    const WEAK_GPS_M = 15;
    let locationWorked = false;
    let gpsBusy = false;

    /** Location already approved, so a fix can be taken without a permission prompt popping up mid-plot. */
    async function locationApproved() {
        if (!navigator.geolocation) return false;
        try {
            const status = await navigator.permissions?.query({ name: 'geolocation' });
            if (status?.state === 'granted') return true;
            if (status?.state === 'denied') return false;
        } catch (e) { /* Permissions API not available (older iPhones) */ }
        return locationWorked;
    }

    /** Watches the position for a few seconds and averages the good readings (weighted by accuracy). */
    function getAveragedFix(onProgress, maxMs = 12000, goodAcc = 8) {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('GPS not available on this device'));
            const readings = [];
            let done = false, id = null, timer = null;
            const finish = () => {
                if (done) return;
                done = true;
                navigator.geolocation.clearWatch(id);
                clearTimeout(timer);
                if (!readings.length) return reject(new Error('No GPS signal — try again in a more open spot'));
                const best = Math.min(...readings.map(r => r.accuracy));
                const use = readings.filter(r => r.accuracy <= Math.max(best * 2, best + 5));
                let w = 0, lat = 0, lon = 0;
                for (const r of use) {
                    const k = 1 / Math.max(1, r.accuracy) ** 2;
                    w += k; lat += r.latitude * k; lon += r.longitude * k;
                }
                resolve({ lat: lat / w, lon: lon / w, acc: Math.round(best), n: use.length });
            };
            id = navigator.geolocation.watchPosition(
                pos => {
                    locationWorked = true;
                    readings.push(pos.coords);
                    const best = Math.min(...readings.map(r => r.accuracy));
                    onProgress?.(Math.round(best), readings.length);
                    if (readings.filter(r => r.accuracy <= goodAcc).length >= 3) finish();
                },
                err => {
                    if (readings.length) return finish();
                    done = true;
                    navigator.geolocation.clearWatch(id);
                    clearTimeout(timer);
                    reject(new Error(err.code === 1 ? 'Location permission is off for TimberTally' : (err.message || 'GPS error')));
                },
                { enableHighAccuracy: true, maximumAge: 0, timeout: maxMs }
            );
            timer = setTimeout(finish, maxMs);
        });
    }

    function setGpsStatus(text, weak = false) {
        if (!locationStatus) return;
        locationStatus.textContent = text;
        locationStatus.classList.toggle('gps-weak', weak);
    }

    /** GPS button: an averaged fix held for the next tree. */
    async function handleGetLocation() {
        if (gpsBusy) return;
        gpsBusy = true;
        if (getLocationBtn) getLocationBtn.disabled = true;
        setGpsStatus('GPS: averaging…');
        try {
            const g = await getAveragedFix((best, n) => setGpsStatus(`Averaging… ±${best} m (${n})`));
            currentLocation = { lat: g.lat, lon: g.lon, acc: g.acc };
            const weak = g.acc > WEAK_GPS_M;
            setGpsStatus(`${g.lat.toFixed(5)}, ${g.lon.toFixed(5)} ±${g.acc} m${weak ? ' — weak, try a more open spot' : ''} · saved with the next tree`, weak);
        } catch (e) {
            currentLocation = null;
            setGpsStatus(`GPS: ${e.message}`, true);
        } finally {
            gpsBusy = false;
            if (getLocationBtn) getLocationBtn.disabled = false;
        }
    }

    /**
     * Auto GPS: on a plot's 3rd tree, locate the plot if location access is already
     * approved and no entry in the plot has a location yet. The fix goes on that tree.
     */
    async function maybeAutoGps(entry) {
        const trees = plotEntries(entry.areaLetter, entry.plotNumber).filter(e => !isEmptyPlot(e));
        if (trees.length !== 3 || trees.some(e => e.location) || gpsBusy) return;
        if (!(await locationApproved())) return;
        gpsBusy = true;
        const label = `Plot ${entry.plotNumber}`;
        setGpsStatus(`${label} GPS: averaging…`);
        try {
            const g = await getAveragedFix((best, n) => setGpsStatus(`${label} averaging… ±${best} m (${n})`));
            const target = collectedData.find(e => e.id === entry.id);
            if (target && !target.location) {
                target.location = { lat: g.lat, lon: g.lon, acc: g.acc };
                saveSessionData();
            }
            const weak = g.acc > WEAK_GPS_M;
            setGpsStatus(`${label}: ${g.lat.toFixed(5)}, ${g.lon.toFixed(5)} ±${g.acc} m${weak ? ' — weak' : ''}`, weak);
            setTimeout(() => { if (locationStatus?.textContent.startsWith(label + ':') && !currentLocation) setGpsStatus(''); }, 6000);
        } catch (e) {
            setGpsStatus('');
        } finally {
            gpsBusy = false;
        }
    }

    // ============================================================
    // EDIT ENTRY (tap a row in Recent Entries)
    // ============================================================
    let editingId = null;
    const editModal = document.getElementById('editEntryModal');
    const $id = id => document.getElementById(id);

    function fillSelect(sel, values, current) {
        const list = values.includes(current) || current === '' || current == null ? values : [current, ...values];
        sel.innerHTML = list.map(v => `<option value="${escHtml(v)}">${escHtml(v)}</option>`).join('');
        sel.value = current ?? '';
    }
    /** Logs choices for a DBH; `keepLegacy` keeps an older entry's value (e.g. 0 logs on a 14") when the box opens. */
    function editLogsFor(dbh, current, keepLegacy = false) {
        const vals = logsWheelValues(dbh).map(v => v.value);
        const next = vals.includes(current) ? current : keepLegacy && current ? current : (vals.includes('1') ? '1' : vals[0]);
        fillSelect($id('editLogs'), vals, next);
    }
    function openEditEntry(id) {
        const e = collectedData.find(x => x.id === id);
        if (!e || !editModal) return;
        editingId = id;
        const empty = isEmptyPlot(e);
        $id('editEntryTitle').textContent = empty ? `Plot ${e.plotNumber}, Area ${e.areaLetter}` : 'Edit Entry';
        $id('editEntryTreeFields').hidden = empty;
        $id('editSaveBtn').hidden = empty;
        const msg = $id('editEntryEmptyMsg');
        msg.hidden = !empty;
        msg.textContent = empty ? 'Recorded as an empty plot (no tally trees). Delete it if trees should be entered here, or just enter a tree in this plot.' : '';
        if (!empty) {
            fillSelect($id('editArea'), areaLetters, e.areaLetter);
            $id('editPlot').value = e.plotNumber;
            fillSelect($id('editSpecies'), [...currentSpeciesList].sort((a, b) => a.localeCompare(b)), e.species);
            fillSelect($id('editDbh'), DBH_VALUES.map(v => v.value), String(e.dbh));
            editLogsFor(String(e.dbh), String(e.logs), true);
            $id('editCut').checked = e.cutStatus === 'Yes';
            $id('editUgs').checked = e.ugsStatus === 'Yes';
            $id('editNotes').value = e.notes || '';
        }
        editModal.style.display = 'flex';
    }
    function closeEditEntry() { if (editModal) editModal.style.display = 'none'; editingId = null; }
    function saveEditEntry() {
        const e = collectedData.find(x => x.id === editingId);
        if (!e) return closeEditEntry();
        const plot = parseInt($id('editPlot').value, 10);
        if (isNaN(plot) || plot < MIN_PLOT_NUMBER || plot > MAX_PLOT_NUMBER) { alert('Plot # must be 1–999.'); return; }
        const area = $id('editArea').value;
        Object.assign(e, {
            areaLetter: area, plotNumber: plot,
            species: $id('editSpecies').value, dbh: $id('editDbh').value, logs: $id('editLogs').value,
            cutStatus: $id('editCut').checked ? 'Yes' : 'No', ugsStatus: $id('editUgs').checked ? 'Yes' : 'No',
            notes: $id('editNotes').value.trim(),
        });
        // Moved into a plot recorded as empty: that plot has a tree now.
        collectedData = collectedData.filter(x => !(isEmptyPlot(x) && x.areaLetter === area && x.plotNumber === plot));
        closeEditEntry();
        renderEntriesKeepingPosition();
        saveSessionData();
        showFeedback(`✓ Entry updated — ${e.species} ${e.dbh}" · Plot ${plot}, Area ${area}`);
    }
    function deleteEditEntry() {
        const e = collectedData.find(x => x.id === editingId);
        if (!e) return closeEditEntry();
        const what = isEmptyPlot(e) ? `the empty-plot record for Plot ${e.plotNumber}` : `${e.species} ${e.dbh}" (Plot ${e.plotNumber})`;
        if (!confirm(`Delete ${what}?`)) return;
        collectedData = collectedData.filter(x => x.id !== editingId);
        closeEditEntry();
        renderEntriesKeepingPosition();
        saveSessionData();
        showFeedback('Entry deleted.');
    }
    /** Re-renders the list without moving the Area / Plot counters off where the cruiser is. */
    function renderEntriesKeepingPosition() {
        const plot = currentPlotNumber, area = currentAreaIndex;
        renderEntries();
        currentPlotNumber = plot; currentAreaIndex = area;
        updatePlotDisplay(); updateAreaDisplay(); calculateAndDisplayNeededPlots();
        saveSessionData();
        document.dispatchEvent(new CustomEvent('tt:entries-changed'));
    }

    // ============================================================
    // BORDERLINE TREES (prism): limiting distance for the DBH on the wheel
    // ============================================================
    const plotRadiusFactor = () => Math.sqrt(75.625 / (currentBaf || 10));
    // Fixed plots: one radius for every tree, whatever its DBH.
    const limitingDistanceFt = dbh => (currentCruiseMethod === 'fixed' ? fixedPlotRadiusFt(currentPlotAcres) : dbh > 0 ? dbh * plotRadiusFactor() : null);
    function updateBorderlineText() {
        const el = document.getElementById('borderlineText');
        if (!el || !dbhSelect) return;
        const d = parseInt(dbhSelect.value, 10);
        el.textContent = currentCruiseMethod === 'fixed'
            ? `Plot radius ${fixedPlotRadiusFt(currentPlotAcres).toFixed(1)} ft: trees inside are in (${cruiseLabel(cruiseSpec())})`
            : `Borderline ${d}": in within ${limitingDistanceFt(d).toFixed(1)} ft (BAF ${currentBaf})`;
    }
    function renderBorderline() {
        const d = parseFloat($id('blDbh').value), face = parseFloat($id('blDist').value);
        const ld = limitingDistanceFt(d);
        $id('borderlineRule').textContent = currentCruiseMethod === 'fixed'
            ? `${cruiseLabel(cruiseSpec())}: a tree is in when the distance from plot center to the tree's center is at most the plot radius, ${fixedPlotRadiusFt(currentPlotAcres).toFixed(1)} ft, whatever its DBH.`
            : `BAF ${currentBaf}: a tree is in when the distance from plot center to the tree's center is at most ${plotRadiusFactor().toFixed(3)} ft per inch of DBH.`;
        const res = $id('blResult');
        if (ld == null) res.innerHTML = '';
        else {
            // Measured to the face of the tree at breast height; the rule is to its center.
            const toCenter = face > 0 ? face + d / 24 : null;
            res.innerHTML = `Limiting distance: <b>${ld.toFixed(1)} ft</b>` + (toCenter != null
                ? ` · to center ${toCenter.toFixed(1)} ft → <b class="${toCenter <= ld ? 'bl-in' : 'bl-out'}">${toCenter <= ld ? 'IN' : 'OUT'}</b>` : '');
        }
        const rows = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40];
        const half = rows.length / 2;
        $id('blTable').innerHTML = '<thead><tr><th>DBH</th><th>In within (ft)</th><th>DBH</th><th>In within (ft)</th></tr></thead><tbody>'
            + rows.slice(0, half).map((r, i) => `<tr><td>${r}"</td><td>${limitingDistanceFt(r).toFixed(1)}</td><td>${rows[i + half]}"</td><td>${limitingDistanceFt(rows[i + half]).toFixed(1)}</td></tr>`).join('')
            + '</tbody>';
    }
    function openBorderline() {
        $id('blDbh').value = dbhSelect?.value || '';
        $id('blDist').value = '';
        renderBorderline();
        $id('borderlineModal').style.display = 'flex';
        setTimeout(() => $id('blDist').focus(), 50);
    }

    async function handleDeleteSelected() {
        if (!entriesTableBody) return;
        const checks = entriesTableBody.querySelectorAll('input[type="checkbox"]:checked');
        if (!checks.length) { showFeedback("No entries selected.", true); return; }
        const ids = new Set(Array.from(checks).map(cb => parseInt(cb.getAttribute('data-id'),10)).filter(id => !isNaN(id)));
        if (!confirm(`Delete ${ids.size} selected ${ids.size===1?'entry':'entries'}?`)) return;
        if (!(await safetyCopy(`Before deleting ${ids.size} ${ids.size===1?'entry':'entries'}`))) return;
        collectedData = collectedData.filter(e => !(e?.id && ids.has(e.id)));
        renderEntries(); saveSessionData();
        showFeedback(`${ids.size} ${ids.size===1?'entry':'entries'} deleted.`);
    }

    async function handleDeleteAll() {
        if (!collectedData.length) { showFeedback("No data to delete.", true); return; }
        if (!confirm(`Delete ALL ${collectedData.length} entries in "${currentProject?.name}"?\n\nA safety copy is kept for 7 days (Projects tab).`)) return;
        if (!(await safetyCopy('Delete All Data'))) return;
        collectedData = [];
        currentAreaIndex = 0; currentPlotNumber = 1;
        renderEntries();
        updatePlotDisplay(); updateAreaDisplay();
        saveSessionData();
        showFeedback('All entries deleted. A safety copy is on the Projects tab for 7 days.', false, 4000);
        currentLocation = null;
        if (locationStatus) locationStatus.textContent = '';
    }

    // Hooks for the Recommendation Builder (recommendations.js)
    window.ttGetDataAreas = () => [...new Set(collectedData.map(e => e.areaLetter).filter(Boolean))].sort();
    window.ttGetCurrentArea = () => areaLetters[currentAreaIndex];

    // ============================================================
    // TAB SWITCHING
    // ============================================================
    function switchTab(tabId) {
        // The species panel belongs to the Data tab (it has no tab button of its own).
        const navTab = tabId === 'species' ? 'takeData' : tabId;
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === navTab);
            btn.setAttribute('aria-selected', String(btn.dataset.tab === navTab));
        });
        document.querySelectorAll('.tab-panel').forEach(panel => {
            const isActive = panel.id === `tab-${tabId}`;
            panel.classList.toggle('active', isActive);
            panel.hidden = !isActive;
        });
        if (tabId === 'tally') renderTallyTab();
        if (tabId === 'takeData') updateDataStrip();
        if (tabId === 'recs') window.TTRecs?.render();
    }

    // ============================================================
    // COMPASS
    // ============================================================
    let orientationHandler = null;
    const handleOrientation = (event) => {
        let h = null, s = '---';
        try {
            if (event.absolute===true && event.alpha!==null) { h=360-event.alpha; s='True (abs)'; }
            else if (event.webkitCompassHeading!=null) { h=event.webkitCompassHeading; s='Mag (webkit)'; }
            else if (event.alpha!==null) { h=360-event.alpha; s='Mag (alpha)'; }
            if (h !== null) {
                h = (h+360) % 360;
                if (compassNeedle) compassNeedle.style.transform = `translateX(-50%) rotate(${h}deg)`;
                if (compassHeading) compassHeading.textContent = `${h.toFixed(0)}°`;
                if (compassSource) compassSource.textContent = ` (${s})`;
            }
        } catch(e) {}
    };

    function startCompass() {
        if (!compassContainer) return;
        compassContainer.style.display = 'flex';
        if (compassHeading) compassHeading.textContent = '---°';
        if (compassSource) compassSource.textContent = ' (Initializing...)';
        orientationHandler = handleOrientation;
        if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', orientationHandler, true);
        else if ('ondeviceorientation' in window) window.addEventListener('deviceorientation', orientationHandler, true);
        else { if (compassHeading) compassHeading.textContent = 'N/A'; if (compassSource) compassSource.textContent = ' (Unsupported)'; }
    }

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    if (submitBtn)     submitBtn.addEventListener('click', handleSubmitEntry);
    if (getLocationBtn) getLocationBtn.addEventListener('click', handleGetLocation);
    if (saveCsvBtn)    saveCsvBtn.addEventListener('click', generateAndDownloadCsv);
    if (deleteBtn)     deleteBtn.addEventListener('click', handleDeleteSelected);
    if (deleteAllBtn)  deleteAllBtn.addEventListener('click', handleDeleteAll);

    if (entriesTableBody) {
        entriesTableBody.addEventListener('change', e => {
            if (e.target.type === 'checkbox' && deleteBtn) deleteBtn.disabled = !isAnyCheckboxChecked();
        });
    }

    // Record empty plot, edit entry (tap a row), borderline checker
    document.getElementById('emptyPlotLine')?.addEventListener('click', e => { if (e.target.closest('#recordEmptyPlotBtn')) handleRecordEmptyPlot(); });
    if (entriesTableBody) entriesTableBody.addEventListener('click', e => {
        if (e.target.closest('input[type="checkbox"]')) return;
        const tr = e.target.closest('tr[data-id]');
        if (tr) openEditEntry(Number(tr.dataset.id));
    });
    $id('editDbh')?.addEventListener('change', e => editLogsFor(e.target.value, $id('editLogs').value));
    $id('editSaveBtn')?.addEventListener('click', saveEditEntry);
    $id('editCancelBtn')?.addEventListener('click', closeEditEntry);
    $id('editDeleteBtn')?.addEventListener('click', deleteEditEntry);
    editModal?.addEventListener('click', e => { if (e.target === editModal) closeEditEntry(); });
    $id('borderlineBtn')?.addEventListener('click', openBorderline);
    $id('blDbh')?.addEventListener('input', renderBorderline);
    $id('blDist')?.addEventListener('input', renderBorderline);
    $id('borderlineCloseBtn')?.addEventListener('click', () => { $id('borderlineModal').style.display = 'none'; });
    $id('borderlineModal')?.addEventListener('click', e => { if (e.target.id === 'borderlineModal') e.target.style.display = 'none'; });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (editModal?.style.display === 'flex') closeEditEntry();
        if ($id('borderlineModal')?.style.display === 'flex') $id('borderlineModal').style.display = 'none';
    });
    // iPhone Safari ignores user-scalable=no; block pinch zoom directly.
    document.addEventListener('gesturestart', e => e.preventDefault());

    // Species quick-pick, Cut / UGS chips, notes toggle
    const speciesQuick = document.getElementById('speciesQuick');
    const cutChip = document.getElementById('cutChip');
    const ugsChip = document.getElementById('ugsChip');
    if (speciesQuick) speciesQuick.addEventListener('click', e => {
        const b = e.target.closest('.sp-btn[data-species]');
        if (!b || !speciesSelect) return;
        speciesSelect.value = b.dataset.species;
        renderSpeciesQuickPick();
    });
    if (speciesSelect) speciesSelect.addEventListener('change', () => renderSpeciesQuickPick());
    if (cutCheckbox) cutCheckbox.addEventListener('change', () => cutChip?.classList.toggle('on', cutCheckbox.checked));
    if (ugsCheckbox) ugsCheckbox.addEventListener('change', () => ugsChip?.classList.toggle('on', ugsCheckbox.checked));
    const notesToggleBtn = document.getElementById('notesToggleBtn');
    if (notesToggleBtn) notesToggleBtn.addEventListener('click', () => {
        const group = document.getElementById('notesGroup');
        const open = !!group?.hidden;
        if (!open && notesTextarea?.value.trim()) { notesTextarea.focus(); return; }
        setNotesOpen(open);
        if (open) setTimeout(() => {
            notesTextarea?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            notesTextarea?.focus({ preventScroll: true });
        }, 30);
    });
    if (notesTextarea) notesTextarea.addEventListener('input', () => setNotesOpen(true));
    window.addEventListener('resize', () => { const b = document.getElementById('speciesQuick'); if (b) fitQuickLabels(b); });

    // Swipe left/right across the Area / Plot counters to change plots.
    const plotCounterRow = document.getElementById('plotCounterRow');
    let swipeStart = null;
    if (plotCounterRow) {
        plotCounterRow.addEventListener('touchstart', e => { swipeStart = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }, { passive: true });
        plotCounterRow.addEventListener('touchend', e => {
            const s = swipeStart; swipeStart = null;
            if (!s) return;
            const t = e.changedTouches[0];
            const dx = t.clientX - s.x, dy = t.clientY - s.y;
            if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) return;
            if (dx > 0) plotIncrementBtn?.click(); else plotDecrementBtn?.click();
            navigator.vibrate?.(30);
        });
    }


    if (plotDecrementBtn) plotDecrementBtn.addEventListener('click', () => {
        if (currentPlotNumber > MIN_PLOT_NUMBER) { currentPlotNumber--; updatePlotDisplay(); saveSessionData(); }
    });
    if (plotIncrementBtn) plotIncrementBtn.addEventListener('click', () => {
        if (currentPlotNumber < MAX_PLOT_NUMBER) { currentPlotNumber++; updatePlotDisplay(); saveSessionData(); }
    });
    if (areaDecrementBtn) areaDecrementBtn.addEventListener('click', () => {
        if (currentAreaIndex > 0) { currentAreaIndex--; updateAreaDisplay(); calculateAndDisplayNeededPlots(); saveSessionData(); }
    });
    if (areaIncrementBtn) areaIncrementBtn.addEventListener('click', () => {
        if (currentAreaIndex < areaLetters.length-1) { currentAreaIndex++; updateAreaDisplay(); calculateAndDisplayNeededPlots(); saveSessionData(); }
    });

    // Settings sheet (☰ Menu → Settings): full height, Done / Esc / tap outside closes it.
    let settingsReturnFocus = null;
    function openSettings() {
        if (!settingsSection) return;
        settingsReturnFocus = document.activeElement;
        settingsSection.hidden = false;
        settingsSection.scrollTop = 0;
        document.body.classList.add('sheet-open');
        document.getElementById('settingsDoneBtn')?.focus();
    }
    function closeSettings() {
        if (!settingsSection || settingsSection.hidden) return;
        settingsSection.hidden = true;
        document.body.classList.remove('sheet-open');
        if (settingsReturnFocus && document.contains(settingsReturnFocus)) settingsReturnFocus.focus?.();
    }
    document.getElementById('settingsDoneBtn')?.addEventListener('click', closeSettings);
    settingsSection?.addEventListener('click', e => { if (e.target === settingsSection) closeSettings(); });
    document.addEventListener('keydown', e => {
        // Esc closes the sheet unless a dialog opened from it (Leaf/Twig ID, ⓘ) is on top.
        if (e.key !== 'Escape' || !settingsSection || settingsSection.hidden) return;
        if (treeKeyModal && treeKeyModal.style.display === 'flex') return;
        if (document.querySelector('.tt-tour-overlay')) return;
        closeSettings();
    });
    window.TTSettings = { open: openSettings, close: closeSettings, isOpen: () => !!settingsSection && !settingsSection.hidden };

    const cruiseChanged = msg => { syncCruiseControls(); saveSettings(); showSettingsFeedback(msg); calculateAndDisplayNeededPlots(); updateBorderlineText(); };
    document.getElementById('cruiseMethodSelect')?.addEventListener('change', e => { currentCruiseMethod = e.target.value === 'fixed' ? 'fixed' : 'baf'; cruiseChanged(`Cruise: ${cruiseLabel(cruiseSpec())}`); });
    document.getElementById('plotSizeSelect')?.addEventListener('change', e => { currentPlotAcres = Number(e.target.value) || 0.1; cruiseChanged(`Cruise: ${cruiseLabel(cruiseSpec())}`); });
    document.getElementById('entryModeSelect')?.addEventListener('change', e => { currentEntryMode = e.target.value === 'grid' ? 'grid' : 'wheel'; syncCruiseControls(); saveSettings(); showSettingsFeedback(currentEntryMode === 'grid' ? 'Collection: Tap Grid' : 'Collection: Scroll Wheel'); });
    if (bafSelect) bafSelect.addEventListener('change', e => { currentBaf = parseInt(e.target.value,10); saveSettings(); showSettingsFeedback(`BAF = ${currentBaf}`); calculateAndDisplayNeededPlots(); updateBorderlineText(); });
    if (logRuleSelect) logRuleSelect.addEventListener('change', e => { currentLogRule = e.target.value; saveSettings(); showSettingsFeedback(`Rule: ${currentLogRule}`); checkAndSetLogsForDbh(); calculateAndDisplayNeededPlots(); updateFormClassVisibility(); });
    if (formClassSelect) formClassSelect.addEventListener('change', e => { currentFormClass = parseInt(e.target.value,10); saveSettings(); showSettingsFeedback(`Doyle FC: ${currentFormClass}`); calculateAndDisplayNeededPlots(); });

    // Dark mode
    if (darkModeSelect) darkModeSelect.addEventListener('change', e => {
        currentDarkMode = e.target.value;
        saveSettings();
        applyDarkMode();
        showSettingsFeedback(`Dark mode: ${currentDarkMode}`);
    });
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (currentDarkMode === 'system') applyDarkMode();
    });

    // Manual update check
    if (manualUpdateCheckBtn && 'serviceWorker' in navigator) {
        manualUpdateCheckBtn.addEventListener('click', () => {
            if (updateStatusTimeout) clearTimeout(updateStatusTimeout);
            if (updateCheckStatus) updateCheckStatus.textContent = 'Checking...';
            manualUpdateCheckBtn.disabled = true;
            navigator.serviceWorker.ready
                .then(r => r.update())
                .then(reg => {
                    if (!reg) { if (updateCheckStatus) updateCheckStatus.textContent = 'Check failed.'; return; }
                    if (reg.installing) { if (updateCheckStatus) updateCheckStatus.textContent = 'Update installing...'; }
                    else if (reg.waiting) { if (updateCheckStatus) updateCheckStatus.textContent = 'Update ready!'; }
                    else { if (updateCheckStatus) updateCheckStatus.textContent = 'Up to date.'; }
                    updateStatusTimeout = setTimeout(() => { if (updateCheckStatus) updateCheckStatus.textContent = ''; }, 3000);
                })
                .catch(() => { if (updateCheckStatus) updateCheckStatus.textContent = 'Check failed.'; })
                .finally(() => { if (manualUpdateCheckBtn) manualUpdateCheckBtn.disabled = false; });
        });
    }

    if (showInfoBtn) showInfoBtn.addEventListener('click', () => window.TTInfo ? window.TTInfo.open() : window.open(README_URL, '_blank', 'noopener'));

    // Species management
    if (addSpeciesBtn) addSpeciesBtn.addEventListener('click', () => {
        if (!newSpeciesInput) return;
        const name = newSpeciesInput.value.trim();
        if (!name) { showSpeciesFeedback("Enter a species name.", true); return; }
        if (currentSpeciesList.some(s => s.toLowerCase() === name.toLowerCase())) { showSpeciesFeedback(`"${name}" already exists.`, true); return; }
        currentSpeciesList.push(name);
        populateSpeciesDropdowns(); saveSpeciesList(); newSpeciesInput.value = '';
        showSpeciesFeedback(`"${name}" added.`);
    });

    if (removeSpeciesBtn) removeSpeciesBtn.addEventListener('click', () => {
        if (!removeSpeciesSelect) return;
        const toRemove = Array.from(removeSpeciesSelect.selectedOptions).map(o => o.value);
        if (!toRemove.length) { showSpeciesFeedback("Select species to remove.", true); return; }
        if (!confirm(`Remove: ${toRemove.join(', ')}?`)) return;
        currentSpeciesList = currentSpeciesList.filter(s => !toRemove.includes(s));
        populateSpeciesDropdowns(); saveSpeciesList();
        showSpeciesFeedback(`Removed: ${toRemove.join(', ')}.`);
    });

    // Projects tab
    if (projectNameInput) {
        projectNameInput.addEventListener('change', () => {
            const name = projectNameInput.value.trim();
            if (!name || !currentProject) { projectNameInput.value = currentProject?.name || ''; return; }
            currentProject.name = name;
            saveSessionData();
            renderProjectsPanel();
            showProjectFeedback(`Renamed to "${name}".`);
        });
    }
    if (loadProjectBtn) loadProjectBtn.addEventListener('click', handleOpenProject);
    document.getElementById('newProjectBtn')?.addEventListener('click', handleNewProject);
    document.getElementById('copyProjectBtn')?.addEventListener('click', handleCopyProject);
    if (deleteProjectBtn) deleteProjectBtn.addEventListener('click', handleDeleteProject);
    document.getElementById('snapshotList')?.addEventListener('click', e => {
        const b = e.target.closest('[data-restore-snap]');
        if (b) handleRestoreSnapshot(b.dataset.restoreSnap);
    });
    document.getElementById('saveBackupBtn')?.addEventListener('click', handleSaveBackup);
    document.getElementById('backupReminderSave')?.addEventListener('click', handleSaveBackup);
    document.getElementById('backupReminderLater')?.addEventListener('click', () => {
        Store.writeJSON(Store.K.backupSnooze, Date.now() + 86400000, { quiet: true });
        renderBackupReminder();
    });
    const restoreInput = document.getElementById('restoreBackupInput');
    document.getElementById('restoreBackupBtn')?.addEventListener('click', () => restoreInput?.click());
    restoreInput?.addEventListener('change', () => {
        const f = restoreInput.files?.[0];
        if (f) handleRestoreBackupFile(f);
        restoreInput.value = '';
    });
    document.getElementById('saveErrorBar')?.addEventListener('click', () => {
        const st = Store.getSaveState();
        alert(`${st.error || 'Saving failed.'}\n\nYour latest changes are still on screen. To protect them:\n1. Projects tab → Save Backup.\n2. Delete finished projects you have backed up.\n3. Make any change to save again.`);
    });
    Store.onSaveState(renderSaveState);

        // ============================================================
    // CSV FILE LOADER — shared by button and drag-and-drop
    // ============================================================
    function loadCsvFile(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showProjectFeedback("Must be a .csv file.", true);
            if (csvFileInput) csvFileInput.value = null;
            return;
        }
        const reader = new FileReader();
        reader.onload = e => {
            const text = e.target.result;
            let parsed;
            try {
                parsed = parseCsvAndLoadData(text);
            } catch(err) {
                // Not a TimberTally CSV: match its columns by hand (csv-match.js).
                if (/header not found/i.test(err.message) && window.TTCsvMatch) {
                    if (csvFileInput) csvFileInput.value = null;
                    window.TTCsvMatch.open(text, file.name);
                    return;
                }
                showProjectFeedback(`CSV Error: ${err.message}`, true, 5000);
                if (csvFileInput) csvFileInput.value = null;
                return;
            }
            addImportedEntries(parsed, file.name);
        };
        reader.onerror = () => { showProjectFeedback("File read error.", true); if (csvFileInput) csvFileInput.value=null; };
        reader.readAsText(file);
    }

    /**
     * Adds parsed CSV entries to the open project: asks for one Area letter (unless keepAreas is
     * set and every entry already has one), renumbers plots per Area when that Area already has
     * data, and keeps a safety copy first.
     */
    async function addImportedEntries(parsed, fileName, { keepAreas = false } = {}) {
        try {
            if (!parsed.length) { showProjectFeedback("No valid data found in CSV.", true); if (csvFileInput) csvFileInput.value=null; return false; }
            const lacking = parsed.filter(e => !keepAreas || !areaLetters.includes(e.areaLetter));
            let chosenArea = null;
            if (lacking.length) {
                const msg = keepAreas
                    ? `Enter Area Letter (A-Z) for the ${lacking.length} entries from "${fileName}" with no Area:`
                    : `Enter Area Letter (A-Z) for all ${parsed.length} entries from "${fileName}":`;
                do {
                    chosenArea = prompt(msg, areaLetters[currentAreaIndex]);
                    if (chosenArea === null) { showProjectFeedback("CSV load cancelled.", false); if (csvFileInput) csvFileInput.value=null; return false; }
                    chosenArea = chosenArea.trim().toUpperCase();
                } while (!(chosenArea.length===1 && areaLetters.includes(chosenArea)) && (alert("Enter a single letter A-Z.") || true));
            }
            lacking.forEach(e => { e.areaLetter = chosenArea; });

            let renumbered = false;
            const letters = [...new Set(parsed.map(e => e.areaLetter))].sort();
            letters.forEach(letter => {
                const existing = collectedData.filter(e => e.areaLetter === letter);
                const maxPlot = existing.reduce((max, e) => Math.max(max, parseInt(e.plotNumber,10)||0), 0);
                if (maxPlot <= 0) return;
                renumbered = true;
                let nextPlot = maxPlot + 1;
                const rows = parsed.filter(e => e.areaLetter === letter);
                const origPlots = [...new Set(rows.map(e => parseInt(e.plotNumber,10)).filter(n => !isNaN(n)))].sort((a,b)=>a-b);
                const plotMap = {};
                origPlots.forEach(op => { plotMap[op] = Math.min(nextPlot++, MAX_PLOT_NUMBER); });
                rows.forEach(e => {
                    const op = parseInt(e.plotNumber,10);
                    if (!isNaN(op) && plotMap[op] !== undefined) e.plotNumber = plotMap[op];
                });
            });
            if (!(await safetyCopy(`Before adding ${fileName}`))) { if (csvFileInput) csvFileInput.value = null; return false; }
            collectedData = collectedData.concat(parsed);
            renderEntries(); saveSessionData();
            showProjectFeedback(`Added ${parsed.length} entries to Area ${letters.join(', ')}.${renumbered?' Plots renumbered.':''}`, false, 4000);
            currentLocation = null;
            if (locationStatus) locationStatus.textContent = '';
            if (csvFileInput) csvFileInput.value = null;
            return true;
        } catch(err) {
            showProjectFeedback(`CSV Error: ${err.message}`, true, 5000);
            if (csvFileInput) csvFileInput.value = null;
            return false;
        }
    }

    if (loadCsvBtn) loadCsvBtn.addEventListener('click', () => {
        const file = csvFileInput?.files[0];
        if (!file) { showProjectFeedback("Select a CSV file.", true); return; }
        loadCsvFile(file);
    });

    // ---- Drag-and-drop CSV zone ----
    const csvDropZone = document.getElementById('csvDropZone');
    if (csvDropZone) {
        csvDropZone.addEventListener('dragover', e => {
            e.preventDefault();
            csvDropZone.classList.add('drag-over');
        });
        csvDropZone.addEventListener('dragleave', e => {
            if (!csvDropZone.contains(e.relatedTarget)) csvDropZone.classList.remove('drag-over');
        });
        csvDropZone.addEventListener('drop', e => {
            e.preventDefault();
            csvDropZone.classList.remove('drag-over');
            const file = e.dataTransfer?.files[0];
            if (!file) return;
            if (!file.name.toLowerCase().endsWith('.csv')) {
                showProjectFeedback("Must be a .csv file.", true);
                return;
            }
            loadCsvFile(file);
        });
        // Also allow tapping the drop zone on mobile to trigger file picker
        csvDropZone.addEventListener('click', () => csvFileInput?.click());
    }

    // Tally area selector
    if (tallyAreaSelect) tallyAreaSelect.addEventListener('change', renderTallyTab);

    // Stocking chart: redraw at the new width while the tab is open.
    let stockingResizeTimer = null;
    window.addEventListener('resize', () => {
        clearTimeout(stockingResizeTimer);
        stockingResizeTimer = setTimeout(() => { if (document.getElementById('tab-tally')?.classList.contains('active')) renderStockingChart(); }, 200);
    });

    // Compass
    if (showCompassBtn) {
        showCompassBtn.addEventListener('click', () => {
            if (typeof DeviceOrientationEvent !== 'undefined') {
                if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                    DeviceOrientationEvent.requestPermission()
                        .then(p => { if (p==='granted') startCompass(); else alert("Permission required for compass."); })
                        .catch(e => alert("Permission error: " + e.message));
                } else startCompass();
            } else alert("Compass not supported by this browser.");
        });
    }

    if (closeCompassBtn) {
        closeCompassBtn.addEventListener('click', () => {
            if (compassContainer) compassContainer.style.display = 'none';
            if (orientationHandler) {
                window.removeEventListener('deviceorientationabsolute', orientationHandler, true);
                window.removeEventListener('deviceorientation', orientationHandler, true);
                orientationHandler = null;
            }
        });
    }

    // Tree Key Modal
    if (showTreeKeyBtn && treeKeyModal) showTreeKeyBtn.addEventListener('click', () => treeKeyModal.style.display = 'flex');
    const closeKeyModal = () => { if (treeKeyModal) treeKeyModal.style.display = 'none'; };
    if (closeTreeKeyBtn)       closeTreeKeyBtn.addEventListener('click', closeKeyModal);
    if (closeTreeKeyBtnBottom) closeTreeKeyBtnBottom.addEventListener('click', closeKeyModal);
    if (treeKeyModal) treeKeyModal.addEventListener('click', e => { if (e.target === treeKeyModal) closeKeyModal(); });

    // Tab buttons
    // Species management has no tab: "edit species" on the Data tab opens it, Done returns.
    document.getElementById('editSpeciesLink')?.addEventListener('click', () => { switchTab('species'); window.scrollTo(0, 0); });
    document.getElementById('speciesDoneBtn')?.addEventListener('click', () => switchTab('takeData'));

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // ============================================================
    // ============================================================
    // AREA NOTES (Data tab → Area Notes): one notes box per Area of the open project
    // ============================================================
    let notesSaveTimeout = null;
    /** Typed into Area Notes since the last save. */
    let notesDirty = false;
    let notesArea = null;
    const areaNotesModal = document.getElementById('areaNotesModal');
    const areaNotesSelect = document.getElementById('areaNotesSelect');

    const areaNotesOf = letter => String(currentProject?.areaNotes?.[letter] || '');

    // Regeneration per Area (from ForestScribe's regen notes): one-tap choices plus species & size.
    const REGEN_CHOICES = {
        density: [['abundant', 'Abundant'], ['adequate', 'Adequate'], ['sparse', 'Sparse'], ['none', 'None/Minimal']],
        browse: [['none', 'None'], ['light', 'Light'], ['moderate', 'Moderate'], ['heavy', 'Heavy']],
        ground: [['leaf-litter', 'Leaf litter'], ['herbaceous', 'Herbaceous'], ['fern', 'Fern'], ['grass', 'Grass'], ['bare-soil', 'Bare soil'], ['mixed', 'Mixed']],
        invasives: ['Bush Honeysuckle', 'Multiflora Rose', 'Japanese Stiltgrass', 'Tree-of-heaven', 'Autumn Olive', 'Oriental Bittersweet',
            'Chinese Privet', 'Callery Pear', 'Winter Creeper', 'Paulownia', 'Garlic Mustard', 'Japanese Knotweed', 'English Ivy', 'Kudzu', 'Mimosa'].map(v => [v, v]),
    };
    const blankRegen = () => ({ density: '', browse: '', ground: '', invasives: [], species: '' });
    const regenOf = letter => ({ ...blankRegen(), ...(currentProject?.areaRegen?.[letter] || {}) });
    const hasRegen = r => !!(r && (r.density || r.browse || r.ground || r.invasives?.length || r.species?.trim()));
    const regenLabel = (key, v) => (REGEN_CHOICES[key].find(([k]) => k === v) || [v, v])[1];
    /** "Density: Adequate · Deer browse: Light · …" for the notes file. */
    function regenText(r) {
        if (!hasRegen(r)) return '';
        const parts = [];
        if (r.density) parts.push(`Density: ${regenLabel('density', r.density)}`);
        if (r.browse) parts.push(`Deer browse: ${regenLabel('browse', r.browse)}`);
        if (r.ground) parts.push(`Ground cover: ${regenLabel('ground', r.ground)}`);
        if (r.species?.trim()) parts.push(`Species & size: ${r.species.trim()}`);
        if (r.invasives?.length) parts.push(`Invasives: ${r.invasives.join(', ')}`);
        return parts.join('\n');
    }
    function saveRegen(letter, r) {
        if (!currentProject || !letter) return;
        currentProject.areaRegen ||= {};
        if (hasRegen(r)) currentProject.areaRegen[letter] = r; else delete currentProject.areaRegen[letter];
        saveSessionData();
        updateDataStrip();
        if (areaNotesSavedStatus) {
            areaNotesSavedStatus.textContent = '✓ Saved';
            clearTimeout(notesSaveTimeout);
            notesSaveTimeout = setTimeout(() => { if (areaNotesSavedStatus) areaNotesSavedStatus.textContent = ''; }, 2000);
        }
    }
    function renderRegen() {
        if (!notesArea) return;
        const r = regenOf(notesArea);
        document.querySelectorAll('#areaNotesModal .regen-chips').forEach(box => {
            const key = box.dataset.regen;
            box.innerHTML = REGEN_CHOICES[key].map(([v, label]) => {
                const on = key === 'invasives' ? r.invasives.includes(v) : r[key] === v;
                return `<button type="button" class="regen-chip${on ? ' on' : ''}${key === 'invasives' ? ' inv' : ''}" data-key="${key}" data-value="${escHtml(v)}" aria-pressed="${on}">${escHtml(label)}</button>`;
            }).join('');
        });
        const sp = document.getElementById('regenSpecies');
        if (sp && document.activeElement !== sp) sp.value = r.species;
    }

    /** Copies the box into the project and saves it. */
    function saveAreaNotes() {
        clearTimeout(notesSaveTimeout);
        if (!currentProject || !notesArea || !areaNotesTextarea) return;
        currentProject.areaNotes ||= {};
        const v = areaNotesTextarea.value;
        if (v.trim()) currentProject.areaNotes[notesArea] = v; else delete currentProject.areaNotes[notesArea];
        const ok = saveSessionData();
        updateDataStrip();
        if (areaNotesSavedStatus && ok) {
            areaNotesSavedStatus.textContent = '✓ Saved';
            notesSaveTimeout = setTimeout(() => { if (areaNotesSavedStatus) areaNotesSavedStatus.textContent = ''; }, 2000);
        }
    }
    /** Writes notes typed in the last moment (before a project switch, or when the app is hidden). */
    function flushNotes() {
        if (notesDirty && currentProject) { notesDirty = false; saveAreaNotes(); }
    }

    function areaNotesOptions() {
        const withNotes = [...Object.keys(currentProject?.areaNotes || {}).filter(a => areaNotesOf(a).trim()), ...Object.keys(currentProject?.areaRegen || {})];
        return [...new Set([...window.ttGetDataAreas(), ...withNotes, areaLetters[currentAreaIndex]])].sort();
    }
    function showAreaNotesFor(letter) {
        flushNotes();
        notesArea = letter;
        if (areaNotesSelect) {
            areaNotesSelect.innerHTML = areaNotesOptions().map(a => `<option value="${escHtml(a)}">Area ${escHtml(a)}${areaNotesOf(a).trim() || hasRegen(regenOf(a)) ? ' ✎' : ''}</option>`).join('');
            areaNotesSelect.value = letter;
        }
        if (areaNotesTextarea) areaNotesTextarea.value = areaNotesOf(letter);
        if (areaNotesSavedStatus) areaNotesSavedStatus.textContent = '';
        renderRegen();
        window.dispatchEvent(new CustomEvent('tt-area-notes-shown', { detail: letter }));
    }
    function openAreaNotes() {
        if (!areaNotesModal) return;
        showAreaNotesFor(areaLetters[currentAreaIndex]);
        areaNotesModal.style.display = 'flex';
        setTimeout(() => areaNotesTextarea?.focus(), 50);
    }
    function closeAreaNotes() {
        if (!areaNotesModal || areaNotesModal.style.display !== 'flex') return;
        flushNotes();
        areaNotesModal.style.display = 'none';
        notesArea = null;
    }

    /** All Areas' notes and regeneration as one text (for the .txt export). */
    function getAreaNotesText() {
        flushNotes();
        const areas = [...new Set([...Object.keys(currentProject?.areaNotes || {}), ...Object.keys(currentProject?.areaRegen || {})])].sort();
        return areas.map(a => {
            const notes = areaNotesOf(a).trim(), regen = regenText(regenOf(a));
            if (!notes && !regen) return '';
            return [`Area ${a}`, '-'.repeat(20), notes, regen ? `${notes ? '\n' : ''}Regeneration\n${regen}` : ''].filter(Boolean).join('\n');
        }).filter(Boolean).join('\n\n');
    }

    document.getElementById('areaNotesBtn')?.addEventListener('click', openAreaNotes);
    areaNotesModal?.addEventListener('click', e => {
        const b = e.target.closest('.regen-chip');
        if (!b || !notesArea) return;
        const r = regenOf(notesArea), key = b.dataset.key, v = b.dataset.value;
        if (key === 'invasives') r.invasives = r.invasives.includes(v) ? r.invasives.filter(x => x !== v) : [...r.invasives, v];
        else r[key] = r[key] === v ? '' : v;
        saveRegen(notesArea, r);
        renderRegen();
    });
    let regenSpeciesTimer = null;
    document.getElementById('regenSpecies')?.addEventListener('input', e => {
        const letter = notesArea, value = e.target.value;
        clearTimeout(regenSpeciesTimer);
        regenSpeciesTimer = setTimeout(() => { if (letter) saveRegen(letter, { ...regenOf(letter), species: value }); }, 500);
    });
    document.getElementById('regenSpecies')?.addEventListener('change', e => { if (notesArea) { clearTimeout(regenSpeciesTimer); saveRegen(notesArea, { ...regenOf(notesArea), species: e.target.value }); } });
    document.getElementById('areaNotesDoneBtn')?.addEventListener('click', closeAreaNotes);
    areaNotesModal?.addEventListener('click', e => { if (e.target === areaNotesModal) closeAreaNotes(); });
    areaNotesSelect?.addEventListener('change', e => showAreaNotesFor(e.target.value));
    areaNotesTextarea?.addEventListener('input', () => {
        notesDirty = true;
        clearTimeout(notesSaveTimeout);
        notesSaveTimeout = setTimeout(() => { notesDirty = false; saveAreaNotes(); }, 600);
        if (areaNotesSavedStatus) areaNotesSavedStatus.textContent = '';
    });
    document.getElementById('areaNotesClearBtn')?.addEventListener('click', async () => {
        if (!notesArea || (!areaNotesTextarea?.value.trim() && !hasRegen(regenOf(notesArea)))) return;
        if (!confirm(`Clear the notes and regeneration for Area ${notesArea}? A safety copy is kept for 7 days.`)) return;
        flushNotes();
        const area = notesArea;
        if (!(await safetyCopy(`Area ${area} notes cleared`))) return;
        if (notesArea !== area) return;
        areaNotesTextarea.value = '';
        saveAreaNotes();
        saveRegen(notesArea, blankRegen());
        showAreaNotesFor(notesArea);
    });

    // ============================================================
    // PLOTS / DATA (paper-entry.js): go to a plot, and save the screen's changes
    // ============================================================
    function goToPlot(letter, n) {
        currentAreaIndex = Math.max(0, areaLetters.indexOf(letter));
        currentPlotNumber = n;
        updatePlotDisplay(); updateAreaDisplay(); calculateAndDisplayNeededPlots();
        saveSessionData();
        showFeedback(`Now entering Area ${letter}, Plot ${n}`);
    }

    /**
     * Writes the Plots / Data screen's changes: a safety copy first (as every destructive action),
     * then the new entry list (untouched entries are the same objects). If the plot being entered
     * on the field screen was moved, the field screen follows it.
     */
    async function savePlotSheet(data, moves, summary) {
        if (!(await safetyCopy(`Before Plots / Data changes${summary ? ` (${summary})` : ''}`))) return false;
        collectedData = data;
        const cur = areaLetters[currentAreaIndex];
        const mv = (moves || []).find(m => m.from.area === cur && m.from.plot === currentPlotNumber);
        if (mv) { currentAreaIndex = Math.max(0, areaLetters.indexOf(mv.to.area)); currentPlotNumber = mv.to.plot; }
        renderEntriesKeepingPosition();
        window.TTRecs?.render();
        return true;
    }

    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (treeKeyModal?.style.display === 'flex') closeKeyModal();
        else if (areaNotesModal?.style.display === 'flex') closeAreaNotes();
    });

    // Screen lock, app switch or close: save anything still pending.
    // Leaving the app (screen off, app switch): save anything pending, without marking the
    // project changed, so the backup reminder and project order only follow real edits.
    const HIDE_SAVE = { touch: false, ifChanged: true };
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { flushNotes(); saveSessionData(HIDE_SAVE); } });
    window.addEventListener('pagehide', () => { flushNotes(); saveSessionData(HIDE_SAVE); });

    // Recommendation Builder keeps its per-area lists in the open project.
    window.ttGetProjectRecs = () => (currentProject ? (currentProject.recs ||= {}) : {});
    window.ttSaveProjectRecs = () => saveSessionData();

        // ============================================================
    // INSTALL PROMPT (PWA)
    // ============================================================
    // The Install App button in the ☰ Menu is always there. With Chrome's install offer in hand it
    // installs in one tap; otherwise it shows the steps for this phone or computer.
    const isInstalled = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
    function showInstallUI(show) {
        if (installBanner) installBanner.style.display = show && !isInstalled() ? 'flex' : 'none';
    }
    function takeInstallEvent(e) {
        deferredInstallPrompt = e;
        if (!sessionStorage.getItem('installDismissed')) showInstallUI(true);
    }
    if (window.ttInstallEvent) takeInstallEvent(window.ttInstallEvent);
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); takeInstallEvent(e); });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        window.ttInstallEvent = null;
        showInstallUI(false);
        showFeedback('✓ TimberTally installed. Open it from its icon.', false, 4000);
    });

    function installSteps() {
        const ua = navigator.userAgent || '';
        const ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const android = /Android/i.test(ua);
        const firefox = /Firefox|FxiOS/i.test(ua);
        const samsung = /SamsungBrowser/i.test(ua);
        const edge = /Edg\//i.test(ua);
        const safariIOS = ios && !/CriOS|FxiOS|EdgiOS/i.test(ua);
        const li = items => `<ol class="install-steps">${items.map(t => `<li>${t}</li>`).join('')}</ol>`;
        if (isInstalled()) return { title: 'TimberTally is installed', html: '<p>You are using the installed app. To reinstall, remove its icon first, then open the website and tap Install App again.</p>' };
        if (ios && !safariIOS) return { title: 'Open in Safari to install', html: '<p>On iPhone and iPad, apps are added from <b>Safari</b>.</p>' + li(['Copy this page\'s address and open it in <b>Safari</b>.', 'Tap the <b>Share</b> button (square with an arrow).', 'Tap <b>Add to Home Screen</b>, then <b>Add</b>.']) };
        if (ios) return { title: 'Install on iPhone / iPad', html: li(['Tap the <b>Share</b> button (square with an arrow) at the bottom of Safari.', 'Scroll down and tap <b>Add to Home Screen</b>.', 'Tap <b>Add</b>. TimberTally appears on your home screen.']) };
        if (android && firefox) return { title: 'Use Chrome to install', html: '<p>Firefox adds a shortcut with a Firefox badge instead of installing the app.</p>' + li(['Open this page in <b>Chrome</b>.', 'Tap ☰ → <b>Install App</b> again, or Chrome\'s <b>⋮</b> menu → <b>Install app</b>.']) };
        if (android && samsung) return { title: 'Install on Android (Samsung Internet)', html: li(['Tap the <b>☰</b> menu at the bottom.', 'Tap <b>Add page to</b> → <b>Home screen</b>.', 'Tap <b>Add</b>.']) };
        if (android) return { title: 'Install on Android', html: li(['Tap Chrome\'s <b>⋮</b> menu (top right).', 'Tap <b>Install app</b>. If you only see <b>Add to Home screen</b>, close the tab, reopen the site, wait a few seconds and look again — "Add to Home screen" makes a shortcut with a Chrome badge.', 'Tap <b>Install</b>.']) };
        if (firefox) return { title: 'Use Chrome or Edge to install', html: '<p>Firefox on computers cannot install web apps. Open this page in <b>Chrome</b> or <b>Edge</b> and tap Install App again.</p>' };
        if (edge) return { title: 'Install on this computer (Edge)', html: li(['Click the <b>App available</b> icon at the right end of the address bar, or the <b>…</b> menu → <b>Apps</b> → <b>Install TimberTally</b>.', 'Click <b>Install</b>.']) };
        return { title: 'Install on this computer', html: li(['Click the <b>install</b> icon (a monitor with a down arrow) at the right end of Chrome\'s address bar, or the <b>⋮</b> menu → <b>Cast, save and share</b> → <b>Install page as app</b>.', 'Click <b>Install</b>.']) + '<p class="notes-hint">On a Mac with Safari: <b>File</b> → <b>Add to Dock</b>.</p>' };
    }
    function showInstallSteps() {
        const m = document.getElementById('installModal');
        if (!m) return;
        const { title, html } = installSteps();
        document.getElementById('installTitle').textContent = title;
        document.getElementById('installSteps').innerHTML = html;
        m.style.display = 'flex';
    }
    async function triggerInstall() {
        const ev = deferredInstallPrompt || window.ttInstallEvent;
        if (!ev) { showInstallSteps(); return; }
        try {
            ev.prompt();
            const { outcome } = await ev.userChoice;
            if (outcome === 'accepted') { deferredInstallPrompt = null; window.ttInstallEvent = null; }
        } catch (e) { showInstallSteps(); }
        showInstallUI(false);
    }

    if (installAcceptBtn) installAcceptBtn.addEventListener('click', triggerInstall);
    if (installAppBtn) {
        installAppBtn.addEventListener('click', triggerInstall);
        if (isInstalled()) { const l = installAppBtn.querySelector('span:last-child'); if (l) l.textContent = 'App Installed'; else installAppBtn.textContent = '✓ App Installed'; }
    }
    if (installDismissBtn) installDismissBtn.addEventListener('click', () => {
        showInstallUI(false);
        sessionStorage.setItem('installDismissed', '1');
    });
    const closeInstall = () => { const m = document.getElementById('installModal'); if (m) m.style.display = 'none'; };
    document.getElementById('installCloseBtn')?.addEventListener('click', closeInstall);
    document.getElementById('installOkBtn')?.addEventListener('click', closeInstall);
    document.getElementById('installModal')?.addEventListener('click', e => { if (e.target.id === 'installModal') closeInstall(); });

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function initializeApp() {
        console.log("TimberTally 3 initializing...");
        try {
            const updateEl = document.getElementById('updateNotification');
            if (updateEl) updateEl.style.display = 'none';
            const startProject = Store.open(); // migrates TimberTally 2 data once, before settings and species are read
            loadSettings();
            updateFormClassVisibility();
            initializeSpeciesManagement();
            populateDbhOptions();
            populateLogsOptions();
            checkAndSetLogsForDbh();
            // Opens the last project. Nothing is ever asked or deleted at startup.
            openProject(startProject, { quiet: true });
            renderSaveState(Store.getSaveState());
            updateSaveBtnLabel();
            console.log("TimberTally 3 initialized.");
        } catch(err) {
            console.error("INIT ERROR:", err);
            if (document.body) {
                document.body.innerHTML = `<div style="padding:20px;color:red;"><h2>App Init Failed</h2><p>${escHtml(err?.message)}</p>Check console.</div>`;
            }
        }
    }

    // Bridge for the add-on files (tour.js, csv-match.js, plot-export.js).
    window.TTApp = {
        project: () => currentProject,
        data: () => collectedData,
        areaLetters,
        currentArea: () => areaLetters[currentAreaIndex],
        currentPlot: () => currentPlotNumber,
        goToPlot: (letter, n) => goToPlot(letter, n),
        savePlotSheet: (data, moves, summary) => savePlotSheet(data, moves, summary),
        showFeedback: (m, e, d) => showFeedback(m, e, d),
        settings: () => ({ baf: currentBaf, logRule: currentLogRule, formClass: currentFormClass, cruise: typeof cruiseSpec === 'function' ? cruiseSpec() : currentBaf }),
        speciesList: () => currentSpeciesList.slice(),
        /** Saves the open project, then adds and opens a new one. */
        openNewProject(p) {
            saveSessionData();
            if (!Store.saveProject(p)) { showProjectFeedback('Could not create the project — device storage is full.', true, 5000); return false; }
            openProject(p, { quiet: true });
            return true;
        },
        addImported: (parsed, fileName, opts) => addImportedEntries(parsed, fileName, opts),
        /** The tree rows of an Area CSV, and the Import CSV reader (round-trip tests). */
        entriesCsv: data => entriesCsv(data),
        parseCsv: text => parseCsvAndLoadData(text),
        switchTab: id => switchTab(id),
        /** Opens the Edit Entry box for one entry (used by check-data.js). */
        editEntry: id => openEditEntry(id),
        tallyArea: () => tallyAreaSelect?.value || 'ALL',
        projectFeedback: (m, e, d) => showProjectFeedback(m, e, d),
    };

    initializeApp();

}); // end DOMContentLoaded

// --- END OF script.js ---

// --- START OF script.js (TimberTally v7) ---

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

            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) { window.location.reload(); refreshing = true; }
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
document.addEventListener('DOMContentLoaded', () => {

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
    const toggleSettingsBtn   = document.getElementById('toggleSettingsBtn');
    const bafSelect           = document.getElementById('bafSelect');
    const logRuleSelect       = document.getElementById('logRuleSelect');
    const formClassSelect     = document.getElementById('formClassSelect');
    const formClassGroup      = document.getElementById('formClassGroup');
    const generateGraphsSelect = document.getElementById('generateGraphsSelect');
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
    const saveProjectBtn      = document.getElementById('saveProjectBtn');
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
    const zipExportSelect     = document.getElementById('zipExportSelect');

    // --- Storage Keys ---
    // Everything is stored through storage.js (window.TTStore) under "tt3." keys.
    const Store = window.TTStore;
    const SPECIES_STORAGE_KEY  = Store.K.species;
    const SETTINGS_STORAGE_KEY = Store.K.settings;

    // --- Constants ---
    const PRIVACY_POLICY_URL = 'https://timbertally.github.io/TimberTally/privacy.html';
    const README_URL         = 'https://github.com/TimberTally/TimberTally/blob/main/README.md';
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
    let currentLogRule      = 'Doyle';
    let currentFormClass    = 78;
    let currentGenerateGraphs = 'No';
    let currentZipExport    = 'No';
    let currentDarkMode     = 'off';
    let deferredInstallPrompt = null;   // holds the beforeinstallprompt event
    let currentSpeciesList  = [];
    let autosaveTimer       = null;
    let autosaveInterval    = null;

    // Feedback timeout handles
    let feedbackTimeout = null, settingsFeedbackTimeout = null;
    let speciesFeedbackTimeout = null, projectFeedbackTimeout = null, backupFeedbackTimeout = null;
    let updateStatusTimeout = null;

    // Active tally chart instances
    let tallyChartInstances = [];

    // ============================================================
    // UTILITY FUNCTIONS
    // ============================================================
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
    /** Saves the open project (called after every change). Returns false if the save failed. */
    function saveSessionData() {
        if (!currentProject) return false;
        currentProject.data = collectedData;
        currentProject.plot = currentPlotNumber;
        currentProject.areaIdx = currentAreaIndex;
        const ok = Store.saveProject(currentProject);
        renderProjectMeta();
        return ok;
    }

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
        closeAreaNotes(); closePlots();
        currentProject = p;
        if (!p.areaNotes || typeof p.areaNotes !== 'object') p.areaNotes = {};
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
                ? list.map(m => `<option value="${m.id}">${escHtml(m.name)} — ${plural(m.treeCount || 0, 'tree')}</option>`).join('')
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
                <button type="button" class="control-button btn-info" data-restore-snap="${s.id}">Restore</button>
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

    /** Takes a safety copy of the open project before a destructive action. False = the user cancelled. */
    function safetyCopy(reason) {
        saveSessionData();
        if (Store.snapshot(currentProject, reason)) { renderSnapshots(); return true; }
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

    function handleDeleteProject() {
        if (!currentProject) return;
        const n = collectedData.filter(e => !e.emptyPlot).length;
        if (!confirm(`Delete project "${currentProject.name}" (${plural(n, 'tree')})?\n\nA safety copy is kept for 7 days on this tab.`)) return;
        if (!safetyCopy('Project deleted')) return;
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
            formClass: currentFormClass, generateGraphs: currentGenerateGraphs,
            zipExport: currentZipExport, darkMode: currentDarkMode
        });
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
                    currentGenerateGraphs = s.generateGraphs === 'Yes' ? 'Yes' : 'No';
                    currentZipExport = s.zipExport === 'Yes' ? 'Yes' : 'No';
                    currentDarkMode = ['off','on','system'].includes(s.darkMode) ? s.darkMode : 'off';
                    if (bafSelect) bafSelect.value = String(currentBaf);
                    if (logRuleSelect) logRuleSelect.value = currentLogRule;
                    if (formClassSelect) formClassSelect.value = String(currentFormClass);
                    if (generateGraphsSelect) generateGraphsSelect.value = currentGenerateGraphs;
                    if (zipExportSelect) zipExportSelect.value = currentZipExport;
                    if (darkModeSelect) darkModeSelect.value = currentDarkMode;
                } else applyDefaultSettings();
            } else applyDefaultSettings();
        } catch (e) { applyDefaultSettings(); }
        applyDarkMode();
        if (settingsSection) settingsSection.hidden = true;
        if (toggleSettingsBtn) toggleSettingsBtn.setAttribute('aria-expanded', 'false');
        updateSaveBtnLabel();
    }

    function applyDefaultSettings() {
        currentBaf = 10; currentLogRule = 'Doyle'; currentFormClass = 78;
        currentGenerateGraphs = 'No'; currentZipExport = 'No'; currentDarkMode = 'off';
        if (bafSelect) bafSelect.value = '10';
        if (logRuleSelect) logRuleSelect.value = 'Doyle';
        if (formClassSelect) formClassSelect.value = '78';
        if (generateGraphsSelect) generateGraphsSelect.value = 'No';
        if (zipExportSelect) zipExportSelect.value = 'No';
        if (darkModeSelect) darkModeSelect.value = 'off';
        saveSettings();
    }

    function applyDarkMode() {
        const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
        const useDark = currentDarkMode === 'on' || (currentDarkMode === 'system' && prefersDark);
        document.body.classList.toggle('dark-mode', useDark);
        if (document.getElementById('tab-tally')?.classList.contains('active')) renderStockingChart();
    }

    function updateSaveBtnLabel() {
        if (saveCsvBtn) {
            if (currentZipExport === 'Yes') {
                saveCsvBtn.textContent = '\uD83D\uDCBE Save ZIP';
            } else if (currentGenerateGraphs === 'Yes') {
                saveCsvBtn.textContent = '\uD83D\uDCBE Save CSV & Graphs';
            } else {
                saveCsvBtn.textContent = '\uD83D\uDCBE Save CSV';
            }
        }
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
        try {
            const json = localStorage.getItem(SPECIES_STORAGE_KEY);
            if (json) {
                const stored = JSON.parse(json);
                currentSpeciesList = Array.isArray(stored) && stored.every(s => typeof s === 'string')
                    ? stored : [...DEFAULT_SPECIES];
            } else {
                currentSpeciesList = [...DEFAULT_SPECIES];
                saveSpeciesList();
            }
        } catch (e) { currentSpeciesList = [...DEFAULT_SPECIES]; }
        populateSpeciesDropdowns();
    }

    // ============================================================
    // UI POPULATION & DISPLAY
    // ============================================================
    function updatePlotNumberAndAreaFromData() {
        let lastPlot = null, lastAreaIdx = null;
        for (let i = collectedData.length - 1; i >= 0; i--) {
            const e = collectedData[i];
            if (e?.plotNumber && lastPlot === null) {
                const n = parseInt(e.plotNumber, 10);
                if (!isNaN(n) && n >= MIN_PLOT_NUMBER && n <= MAX_PLOT_NUMBER) lastPlot = n;
            }
            if (e?.areaLetter && lastAreaIdx === null) {
                const idx = areaLetters.indexOf(e.areaLetter);
                if (idx !== -1) lastAreaIdx = idx;
            }
            if (lastPlot !== null && lastAreaIdx !== null) break;
        }
        currentPlotNumber = lastPlot ?? 1;
        currentAreaIndex  = lastAreaIdx ?? 0;
        updatePlotDisplay(); updateAreaDisplay();
    }

    // DBH / Logs scroll wheels (scroll-wheel.js). Hidden inputs hold the values for submit.
    // Trees 10" and under are always 0 logs; larger trees take 0.5–6 logs or Cull.
    const DBH_MIN = 4, DBH_MAX = 40, DBH_STEP = 2, MAX_ZERO_LOG_DBH = 10;
    const DBH_VALUES = [];
    for (let d = DBH_MIN; d <= DBH_MAX; d += DBH_STEP) DBH_VALUES.push({ value: String(d), label: `${d}"` });
    const LOG_CHOICES = ['0.5','1','1.5','2','2.5','3','3.5','4','4.5','5','5.5','6','Cull'];
    const logsWheelValues = dbh => (parseInt(dbh, 10) <= MAX_ZERO_LOG_DBH ? ['0'] : LOG_CHOICES).map(v => ({ value: v, label: v }));
    let dbhWheel = null, logsWheel = null;

    function setLogsValue(v) {
        if (logsSelect) logsSelect.value = v;
        if (logsWheel && logsWheel.getValue() !== v) logsWheel.setValue(v);
    }
    function setDbhValue(val) {
        const clamped = Math.max(DBH_MIN, Math.min(DBH_MAX, val));
        if (dbhSelect) dbhSelect.value = String(clamped);
        if (dbhWheel && dbhWheel.getValue() !== String(clamped)) dbhWheel.setValue(String(clamped));
        checkAndSetLogsForDbh();
        updateBorderlineText();
    }
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
        const next = vals.some(v => v.value === cur) ? cur : (vals.length > 1 ? vals[1].value : vals[0].value);
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
            box.innerHTML = top.map(s => `<button type="button" class="sp-btn" data-species="${s.replace(/"/g, '&quot;')}" title="${s.replace(/"/g, '&quot;')}">${s}</button>`).join('')
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
        const has = !!String(currentProject?.areaNotes?.[areaLetters[currentAreaIndex]] || '').trim();
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
                    <td><input type="checkbox" data-id="${e.id}"></td>
                    <td>${e.plotNumber ?? '?'}</td>
                    <td>${e.areaLetter ?? '?'}</td>
                    <td colspan="5">Empty plot (no tally trees)</td>`;
                } else tr.innerHTML = `
                    <td><input type="checkbox" data-id="${e.id}"></td>
                    <td>${e.plotNumber ?? '?'}</td>
                    <td>${e.areaLetter ?? '?'}</td>
                    <td>${escHtml(e.species ?? 'N/A')}</td>
                    <td>${escHtml(e.dbh ?? '?')}</td>
                    <td>${escHtml(e.logs ?? '?')}</td>
                    <td>${e.cutStatus || 'No'}</td>
                    <td>${e.ugsStatus || 'No'}</td>`;
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

    function calculateAndDisplayNeededPlots() {
        if (!neededPlotsValue) return;
        const letter = areaLetters[currentAreaIndex];
        const areaData = collectedData.filter(e => e.areaLetter === letter);
        const plotCount = new Set(areaData.map(e => e.plotNumber).filter(p => p != null)).size;
        const stats = calculatePlotStats(areaData, currentBaf, currentLogRule, currentFormClass);

        if (stats && plotCount >= 2 && stats.cvV > 0) {
            const cv = stats.cvV, t = 2;
            // Freese formula: n = ceil((t*CV/E)^2). Show 0/✓ if already met.
            const needed = (E) => {
                const n = Math.ceil(Math.pow(t * cv / E, 2));
                return plotCount >= n ? 0 : n;
            };
            const n10 = needed(10), n20 = needed(20), n30 = needed(30);
            const fmt = (n, label) => n === 0
                ? `<span style="color:#28a745;font-weight:700;">${label}:✓</span>`
                : `${label}:${n}`;
            neededPlotsValue.innerHTML = `${fmt(n10,'10%')} ${fmt(n20,'20%')} ${fmt(n30,'30%')}`;
        } else if (areaData.length > 0 && plotCount < 2) {
            neededPlotsValue.textContent = 'Need ≥2 plots';
        } else {
            neededPlotsValue.textContent = '---';
        }
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
            div.innerHTML = `<h3>${species}</h3>`;
            const dbhKeys = Object.keys(tallyData[species]).sort((a,b) => Number(a)-Number(b));
            dbhKeys.forEach(dbh => {
                div.innerHTML += `<h4>DBH: ${dbh}"</h4>`;
                const logKeys = Object.keys(tallyData[species][dbh]).sort((a,b) => {
                    if (a==='Cull') return 1; if (b==='Cull') return -1;
                    const nA=parseFloat(a), nB=parseFloat(b);
                    return isNaN(nA)?1:isNaN(nB)?-1:nA-nB;
                });
                logKeys.forEach(logs => {
                    const counts = tallyData[species][dbh][logs];
                    const cut = counts['Yes'] || 0, notCut = counts['No'] || 0;
                    if (cut > 0) div.innerHTML += `<div class="tally-log-item"><span class="log-label">Logs: ${logs} (Cut)</span> — <span class="log-count">${cut}</span></div>`;
                    if (notCut > 0) div.innerHTML += `<div class="tally-log-item"><span class="log-label">Logs: ${logs} (Leave)</span> — <span class="log-count">${notCut}</span></div>`;
                });
            });
            tallyResults.appendChild(div);
        });
    }

    // ============================================================
    // STOCKING CHART (wrapper — rendering delegated to charts.js)
    // ============================================================
    function renderStockingChart() {
        const areaStats = calculateStandStocking(collectedData, currentBaf);
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
            let html = `<table><thead><tr><th>Area</th><th>Plots</th><th>TPA</th><th>BA/Ac</th><th>QMD</th><th>Stocking</th>${anyCut ? '<th>Cut TPA</th><th>Cut BA/Ac</th><th>Leave TPA</th><th>Leave BA/Ac</th><th>After Cut</th>' : ''}</tr></thead><tbody>`;
            areaStats.forEach(s => {
                html += `<tr>
                    <td><strong>${s.area}</strong></td>
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
                const report = calculateForestryReport(subset, currentBaf, currentLogRule, currentFormClass);
                const s = report.summary;
                tallySummaryCards.innerHTML = `
                    <div class="stat-card">
                        <span class="stat-value">${s.totalTreesPerAcre != null ? s.totalTreesPerAcre.toFixed(1) : '—'}</span>
                        <span class="stat-label">Trees/Acre</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${s.totalBaPerAcre != null ? s.totalBaPerAcre.toFixed(1) : '—'}</span>
                        <span class="stat-label">BA/Acre (sq ft)</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${s.avgTractDbh != null ? s.avgTractDbh.toFixed(1) + '"' : '—'}</span>
                        <span class="stat-label">Avg DBH (QMD)</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${s.totalVolPerAcre != null ? Math.round(s.totalVolPerAcre) : '—'}</span>
                        <span class="stat-label">Vol/Acre (BF)</span>
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

        // In-app charts — charts.js manages instances
        tallyChartInstances.forEach(c => { try { c.destroy(); } catch(e) {} });
        tallyChartInstances = renderTallyCharts(subset, currentBaf, currentLogRule, currentFormClass, tallyChartsContainer);
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
    function parseCsvAndLoadData(csvContent) {
        const lines = csvContent.split(/\r?\n/);
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
        const parsedData = [];
        for (let i = headerIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith('---') || line.startsWith(',')) continue;
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
            try {
                const plotNum = parseInt(values[idx.p], 10);
                if (isNaN(plotNum)) continue;
                const cutStr = (values[idx.c] || 'No').trim();
                const ugsStr = (idx.ugs > -1 && values[idx.ugs]) ? values[idx.ugs].trim() : 'No';
                const lat = idx.lat > -1 ? parseFloat(values[idx.lat]) : null;
                const lon = idx.lon > -1 ? parseFloat(values[idx.lon]) : null;
                if ((values[idx.sp] || '').trim().toUpperCase() === 'EMPTY PLOT') {
                    parsedData.push({ id: Date.now() + i, emptyPlot: true, plotNumber: plotNum, dbh: '', species: '', logs: '', cutStatus: 'No', ugsStatus: 'No', notes: '',
                        location: (lat!==null && lon!==null && !isNaN(lat) && !isNaN(lon)) ? {lat,lon} : null });
                    continue;
                }
                parsedData.push({
                    id: Date.now() + i, plotNumber: plotNum, dbh: values[idx.d], species: values[idx.sp],
                    logs: values[idx.l], cutStatus: cutStr.toLowerCase()==='yes'?'Yes':'No',
                    ugsStatus: ugsStr.toLowerCase()==='yes'?'Yes':'No',
                    notes: idx.n > -1 ? (values[idx.n]||'') : '',
                    location: (lat!==null && lon!==null && !isNaN(lat) && !isNaN(lon)) ? {lat,lon} : null
                });
            } catch(e) { continue; }
        }
        return parsedData;
    }

    // ============================================================
    // CSV FORMAT FOR EXPORT

    // ============================================================
    // CSV EXPORT
    // ============================================================
    async function generateAndDownloadCsv() {
        if (!collectedData.length) { showFeedback("No data to save.", true); return; }
        const selBaf = currentBaf, selRule = currentLogRule, selFc = currentFormClass;
        const graphsEnabled = currentGenerateGraphs === 'Yes';
        const zipMode       = currentZipExport === 'Yes';
        showFeedback(zipMode ? "Building ZIP..." : "Generating CSV(s)...", false, 10000);

        let zip = null;
        if (zipMode) {
            if (typeof JSZip === 'undefined') {
                showFeedback("JSZip not loaded. Check internet connection.", true, 5000);
                return;
            }
            zip = new JSZip();
        }

        function triggerDownload(url, filename) {
            const a = document.createElement('a');
            a.href = url; a.download = filename;
            a.style.visibility = 'hidden';
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
        }

        async function handleTextFile(content, filename) {
            if (zipMode) {
                zip.file(filename, content);
            } else {
                const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                triggerDownload(url, filename);
                URL.revokeObjectURL(url);
                await new Promise(r => setTimeout(r, 250));
            }
        }

        async function handleTxtFile(content, filename) {
            if (zipMode) {
                zip.file(filename, content);
            } else {
                const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                triggerDownload(url, filename);
                URL.revokeObjectURL(url);
            }
        }

        async function handleChartPng(genFn, reportDataArg, filename) {
            const c = document.createElement('canvas'); c.width=800; c.height=450;
            const inst = genFn(reportDataArg, c);
            if (!inst) return;
            await new Promise(r => setTimeout(r, 250));
            try {
                const dataUrl = c.toDataURL('image/png');
                if (zipMode) {
                    zip.file(filename, dataUrl.split(',')[1], { base64: true });
                } else {
                    triggerDownload(dataUrl, filename);
                    await new Promise(r => setTimeout(r, 250));
                }
            } catch(e) {}
            try { inst.destroy(); } catch(e) {}
        }

        async function handleCanvasPng(canvas, filename) {
            if (!canvas) return;
            await new Promise(r => setTimeout(r, 100));
            try {
                const dataUrl = canvas.toDataURL('image/png');
                if (zipMode) {
                    zip.file(filename, dataUrl.split(',')[1], { base64: true });
                } else {
                    triggerDownload(dataUrl, filename);
                    await new Promise(r => setTimeout(r, 250));
                }
            } catch(e) { console.error('Canvas PNG error:', e); }
        }

        try {
            const grouped = collectedData.reduce((acc, e) => {
                const area = e.areaLetter || 'Unknown';
                if (!acc[area]) acc[area] = [];
                acc[area].push(e); return acc;
            }, {});
            const sortedAreas = Object.keys(grouped).sort();
            if (!sortedAreas.length) { showFeedback("No areas found.", true); return; }
            const ts = new Date().toISOString().slice(0,19).replace(/[-T:]/g,"");
            const projBase = projectNameInput?.value.trim().replace(/[^a-z0-9_\-]/gi,'_') || 'TimberTally';

            for (const [i, areaLetter] of sortedAreas.entries()) {
                const areaData = grouped[areaLetter];
                showFeedback(`Generating Area ${areaLetter} (${i+1}/${sortedAreas.length})...`, false, 6000);
                let reportData = null, tallyData = null, plotStats = null;
                try { reportData = calculateForestryReport(areaData, selBaf, selRule, selFc); } catch(e) {}
                try { tallyData = generateTallyData(areaData); } catch(e) {}
                try { plotStats = calculatePlotStats(areaData, selBaf, selRule, selFc); } catch(e) {}

                const nameBase = `${projBase}_Area${areaLetter}_${ts}`;

                if (graphsEnabled && reportData?.summary?.numberOfPlots > 0) {
                    await handleChartPng(generateBaChartExport,          reportData, `${nameBase}_BA_Dist.png`);
                    await handleChartPng(generateTpaChartExport,         reportData, `${nameBase}_TPA_Dist.png`);
                    await handleChartPng(generateVolSpeciesChartExport,  reportData, `${nameBase}_Vol_Species.png`);
                    await handleChartPng(generateVolSawtimberChartExport,reportData, `${nameBase}_Vol_Sawtimber.png`);

                    try {
                        const allAreaStats = calculateStandStocking(collectedData, selBaf);
                        if (allAreaStats?.length) {
                            const gCanvas = await buildGingrichCanvas(allAreaStats);
                            await handleCanvasPng(gCanvas, `${nameBase}_Gingrich_Stocking.png`);
                        }
                    } catch(e) { console.error('Gingrich export error:', e); }

                    try {
                        const projName = projectNameInput?.value.trim() || 'Untitled';
                        const summaryCanvas = buildSummaryReportCanvas(reportData, plotStats, areaLetter, projName, selRule, selFc, selBaf);
                        await handleCanvasPng(summaryCanvas, `${nameBase}_Summary_Report.png`);
                    } catch(e) { console.error('Summary report export error:', e); }
                }

                // Build CSV
                let raw = "PlotNumber,Area,DBH,Species,Logs,Cut,UGS,Notes,Latitude,Longitude\n";
                areaData.forEach(e => {
                    if (!e) return;
                    if (e.emptyPlot) {
                        const loc = e.location || {};
                        raw += `${e.plotNumber},${e.areaLetter},0,"EMPTY PLOT",0,No,No,"No tally trees",${loc.lat||''},${loc.lon||''}\n`;
                        return;
                    }
                    const notes = `"${(e.notes||'').replace(/"/g,'""')}"`;
                    const loc = e.location || {};
                    raw += `${e.plotNumber??'?'},${e.areaLetter??'?'},${e.dbh??'?'},"${e.species??'N/A'}",${e.logs??'?'},${e.cutStatus||'No'},${e.ugsStatus||'No'},${notes},${loc.lat||''},${loc.lon||''}\n`;
                });

                let tallyCsv = "\n\n--- TALLY DATA ---\nSpecies,DBH,Logs,Cut Status,Count\n";
                if (tallyData) {
                    Object.keys(tallyData).sort().forEach(sp => {
                        Object.keys(tallyData[sp]).sort((a,b)=>Number(a)-Number(b)).forEach(dbh => {
                            Object.keys(tallyData[sp][dbh]).sort((a,b)=>{if(a==='Cull')return 1;if(b==='Cull')return -1;return (parseFloat(a)||0)-(parseFloat(b)||0);}).forEach(logs => {
                                const c = tallyData[sp][dbh][logs];
                                if (c['Yes']>0) tallyCsv+=`"${sp}",${dbh},${logs},"Yes",${c['Yes']}\n`;
                                if (c['No']>0)  tallyCsv+=`"${sp}",${dbh},${logs},"No",${c['No']}\n`;
                            });
                        });
                    });
                }

                let plotCsv = `\n\n--- PER-PLOT VOLUME & STATS (Rule:${selRule}${selRule==='Doyle'?' FC'+selFc:''}, BAF:${selBaf}) ---\n`;
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

                const ruleP = selRule.substring(0,4);
                const fcP = selRule==='Doyle' ? `FC${selFc}` : '';
                const csvFilename = `${projBase}_Area${areaLetter}_${ruleP}${fcP}_BAF${selBaf}_${ts}.csv`;
                await handleTextFile(raw + tallyCsv + plotCsv + reportCsv, csvFilename);
            }

            // Area notes
            const notesText = getAreaNotesText();
            if (notesText) {
                const header = `TimberTally Area Notes\nProject: ${projectNameInput?.value.trim() || 'Untitled'}\nExported: ${new Date().toLocaleString()}\n${'='.repeat(50)}\n\n`;
                await handleTxtFile(header + notesText, `${projBase}_AreaNotes_${ts}.txt`);
            }

            if (zipMode) {
                showFeedback("Compressing ZIP...", false, 8000);
                const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
                const zipUrl = URL.createObjectURL(zipBlob);
                triggerDownload(zipUrl, `${projBase}_${ts}.zip`);
                URL.revokeObjectURL(zipUrl);
                showFeedback(`ZIP saved: ${projBase}_${ts}.zip`, false, 4000);
            } else {
                const graphMsg = graphsEnabled ? ' & Graphs' : '';
                showFeedback(`CSV${graphMsg} saved for Area${sortedAreas.length>1?'s':''}: ${sortedAreas.join(', ')}`, false, 4000);
            }
        } catch(err) {
            console.error('Export error:', err);
            showFeedback(`Save Error: ${err.message||'Unknown'}`, true, 6000);
        }
    }
    // ============================================================
    // EVENT HANDLERS
    // ============================================================
    // Entries that stand for a plot with no tally trees (Record empty plot). They count
    // toward the number of plots (so per-acre values stay right) but hold no tree.
    const isEmptyPlot = e => !!e?.emptyPlot;
    const escHtml = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
        const next = vals.includes(current) ? current : keepLegacy && current ? current : (vals.length > 1 ? vals[1] : vals[0]);
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
    }

    // ============================================================
    // BORDERLINE TREES (prism): limiting distance for the DBH on the wheel
    // ============================================================
    const plotRadiusFactor = () => Math.sqrt(75.625 / (currentBaf || 10));
    const limitingDistanceFt = dbh => (dbh > 0 ? dbh * plotRadiusFactor() : null);
    function updateBorderlineText() {
        const el = document.getElementById('borderlineText');
        if (!el || !dbhSelect) return;
        const d = parseInt(dbhSelect.value, 10);
        el.textContent = `Borderline ${d}": in within ${limitingDistanceFt(d).toFixed(1)} ft (BAF ${currentBaf})`;
    }
    function renderBorderline() {
        const d = parseFloat($id('blDbh').value), face = parseFloat($id('blDist').value);
        const ld = limitingDistanceFt(d);
        $id('borderlineRule').textContent = `BAF ${currentBaf}: a tree is in when the distance from plot center to the tree's center is at most ${plotRadiusFactor().toFixed(3)} ft per inch of DBH.`;
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

    function handleDeleteSelected() {
        if (!entriesTableBody) return;
        const checks = entriesTableBody.querySelectorAll('input[type="checkbox"]:checked');
        if (!checks.length) { showFeedback("No entries selected.", true); return; }
        const ids = new Set(Array.from(checks).map(cb => parseInt(cb.getAttribute('data-id'),10)).filter(id => !isNaN(id)));
        if (!confirm(`Delete ${ids.size} selected ${ids.size===1?'entry':'entries'}?`)) return;
        if (!safetyCopy(`Before deleting ${ids.size} ${ids.size===1?'entry':'entries'}`)) return;
        collectedData = collectedData.filter(e => !(e?.id && ids.has(e.id)));
        renderEntries(); saveSessionData();
        showFeedback(`${ids.size} ${ids.size===1?'entry':'entries'} deleted.`);
    }

    function handleDeleteAll() {
        if (!collectedData.length) { showFeedback("No data to delete.", true); return; }
        if (!confirm(`Delete ALL ${collectedData.length} entries in "${currentProject?.name}"?\n\nA safety copy is kept for 7 days (Projects tab).`)) return;
        if (!safetyCopy('Delete All Data')) return;
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
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
            btn.setAttribute('aria-selected', String(btn.dataset.tab === tabId));
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

    if (toggleSettingsBtn) {
        toggleSettingsBtn.addEventListener('click', () => {
            if (!settingsSection) return;
            const isHidden = settingsSection.hidden;
            settingsSection.hidden = !isHidden;
            toggleSettingsBtn.setAttribute('aria-expanded', String(isHidden));
            toggleSettingsBtn.innerHTML = isHidden ? '&#10005; Settings' : '&#9881; Settings';
        });
    }

    if (bafSelect) bafSelect.addEventListener('change', e => { currentBaf = parseInt(e.target.value,10); saveSettings(); showSettingsFeedback(`BAF = ${currentBaf}`); calculateAndDisplayNeededPlots(); updateBorderlineText(); });
    if (logRuleSelect) logRuleSelect.addEventListener('change', e => { currentLogRule = e.target.value; saveSettings(); showSettingsFeedback(`Rule: ${currentLogRule}`); checkAndSetLogsForDbh(); calculateAndDisplayNeededPlots(); updateFormClassVisibility(); });
    if (formClassSelect) formClassSelect.addEventListener('change', e => { currentFormClass = parseInt(e.target.value,10); saveSettings(); showSettingsFeedback(`Doyle FC: ${currentFormClass}`); calculateAndDisplayNeededPlots(); });
    if (generateGraphsSelect) generateGraphsSelect.addEventListener('change', e => { currentGenerateGraphs = e.target.value; saveSettings(); showSettingsFeedback(`Graphs: ${currentGenerateGraphs}`); updateSaveBtnLabel(); });

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

    if (showInfoBtn) showInfoBtn.addEventListener('click', () => window.open('./README.md', '_blank', 'noopener'));
    if (zipExportSelect) zipExportSelect.addEventListener('change', e => { currentZipExport = e.target.value; saveSettings(); showSettingsFeedback(`ZIP export: ${currentZipExport}`); updateSaveBtnLabel(); });

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
            try {
                const parsed = parseCsvAndLoadData(e.target.result);
                if (!parsed.length) { showProjectFeedback("No valid data found in CSV.", true); if (csvFileInput) csvFileInput.value=null; return; }
                let chosenArea = null;
                do {
                    chosenArea = prompt(`Enter Area Letter (A-Z) for all ${parsed.length} entries from "${file.name}":`, areaLetters[currentAreaIndex]);
                    if (chosenArea === null) { showProjectFeedback("CSV load cancelled.", false); if (csvFileInput) csvFileInput.value=null; return; }
                    chosenArea = chosenArea.trim().toUpperCase();
                } while (!(chosenArea.length===1 && areaLetters.includes(chosenArea)) && (alert("Enter a single letter A-Z.") || true));

                const existing = collectedData.filter(e => e.areaLetter === chosenArea);
                const maxPlot = existing.reduce((max, e) => Math.max(max, parseInt(e.plotNumber,10)||0), 0);
                let nextPlot = maxPlot + 1;
                const origPlots = [...new Set(parsed.map(e => parseInt(e.plotNumber,10)).filter(n => !isNaN(n)))].sort((a,b)=>a-b);
                const plotMap = {};
                origPlots.forEach(op => {
                    if (maxPlot > 0) { plotMap[op] = Math.min(nextPlot++, MAX_PLOT_NUMBER); }
                    else plotMap[op] = op;
                });
                parsed.forEach(e => {
                    const op = parseInt(e.plotNumber,10);
                    if (!isNaN(op) && plotMap[op] !== undefined) e.plotNumber = plotMap[op];
                    e.areaLetter = chosenArea;
                });
                if (!safetyCopy(`Before adding ${file.name}`)) { if (csvFileInput) csvFileInput.value = null; return; }
                collectedData = collectedData.concat(parsed);
                renderEntries(); saveSessionData();
                showProjectFeedback(`Added ${parsed.length} entries to Area ${chosenArea}.${maxPlot>0?' Plots renumbered.':''}`, false, 4000);
                currentLocation = null;
                if (locationStatus) locationStatus.textContent = '';
                if (csvFileInput) csvFileInput.value = null;
            } catch(err) {
                showProjectFeedback(`CSV Error: ${err.message}`, true, 5000);
                if (csvFileInput) csvFileInput.value = null;
            }
        };
        reader.onerror = () => { showProjectFeedback("File read error.", true); if (csvFileInput) csvFileInput.value=null; };
        reader.readAsText(file);
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
        const withNotes = Object.keys(currentProject?.areaNotes || {}).filter(a => areaNotesOf(a).trim());
        return [...new Set([...window.ttGetDataAreas(), ...withNotes, areaLetters[currentAreaIndex]])].sort();
    }
    function showAreaNotesFor(letter) {
        flushNotes();
        notesArea = letter;
        if (areaNotesSelect) {
            areaNotesSelect.innerHTML = areaNotesOptions().map(a => `<option value="${a}">Area ${a}${areaNotesOf(a).trim() ? ' ✎' : ''}</option>`).join('');
            areaNotesSelect.value = letter;
        }
        if (areaNotesTextarea) areaNotesTextarea.value = areaNotesOf(letter);
        if (areaNotesSavedStatus) areaNotesSavedStatus.textContent = '';
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

    /** All Areas' notes as one text (for the .txt export). */
    function getAreaNotesText() {
        flushNotes();
        return Object.keys(currentProject?.areaNotes || {}).sort()
            .filter(a => areaNotesOf(a).trim())
            .map(a => `Area ${a}\n${'-'.repeat(20)}\n${areaNotesOf(a).trim()}`)
            .join('\n\n');
    }

    document.getElementById('areaNotesBtn')?.addEventListener('click', openAreaNotes);
    document.getElementById('areaNotesDoneBtn')?.addEventListener('click', closeAreaNotes);
    areaNotesModal?.addEventListener('click', e => { if (e.target === areaNotesModal) closeAreaNotes(); });
    areaNotesSelect?.addEventListener('change', e => showAreaNotesFor(e.target.value));
    areaNotesTextarea?.addEventListener('input', () => {
        notesDirty = true;
        clearTimeout(notesSaveTimeout);
        notesSaveTimeout = setTimeout(() => { notesDirty = false; saveAreaNotes(); }, 600);
        if (areaNotesSavedStatus) areaNotesSavedStatus.textContent = '';
    });
    document.getElementById('areaNotesClearBtn')?.addEventListener('click', () => {
        if (!notesArea || !areaNotesTextarea?.value.trim()) return;
        if (!confirm(`Clear the notes for Area ${notesArea}? A safety copy is kept for 7 days.`)) return;
        flushNotes();
        if (!safetyCopy(`Area ${notesArea} notes cleared`)) return;
        areaNotesTextarea.value = '';
        saveAreaNotes();
        showAreaNotesFor(notesArea);
    });

    // ============================================================
    // PLOTS (Data tab → Plots): go to a plot, or move / renumber it (its trees go with it)
    // ============================================================
    const plotsModal = document.getElementById('plotsModal');
    const plotsAreaSelect = document.getElementById('plotsAreaSelect');
    const movePlotModal = document.getElementById('movePlotModal');
    let plotsArea = null;
    let movingPlot = null; // { area, plot }

    /** Every plot in an Area with its tree count, BA/acre and GPS. */
    function plotRows(letter) {
        const entries = collectedData.filter(e => e.areaLetter === letter);
        const nums = [...new Set(entries.map(e => parseInt(e.plotNumber, 10)).filter(n => !isNaN(n)))].sort((a, b) => a - b);
        return nums.map(n => {
            const trees = entries.filter(e => parseInt(e.plotNumber, 10) === n && !isEmptyPlot(e));
            const all = entries.filter(e => parseInt(e.plotNumber, 10) === n);
            const ba = trees.filter(e => parseFloat(e.dbh) > 0).length * currentBaf;
            return { number: n, trees: trees.length, ba, hasGps: all.some(e => e.location?.lat != null) };
        });
    }

    function renderPlots() {
        const table = document.getElementById('plotsTable');
        if (!table || !plotsAreaSelect) return;
        const areas = [...new Set([...window.ttGetDataAreas(), areaLetters[currentAreaIndex]])].sort();
        if (!areas.includes(plotsArea)) plotsArea = areaLetters[currentAreaIndex];
        plotsAreaSelect.innerHTML = areas.map(a => `<option value="${a}">Area ${a}</option>`).join('');
        plotsAreaSelect.value = plotsArea;
        const rows = plotRows(plotsArea);
        if (!rows.length) { table.innerHTML = `<tbody><tr><td class="no-entries-msg">No plots in Area ${plotsArea} yet.</td></tr></tbody>`; return; }
        const cur = areaLetters[currentAreaIndex];
        table.innerHTML = '<thead><tr><th>Plot</th><th>Trees</th><th>BA/Ac</th><th>GPS</th><th></th></tr></thead><tbody>'
            + rows.map(r => {
                const isCur = plotsArea === cur && r.number === currentPlotNumber;
                return `<tr class="${isCur ? 'plot-current' : ''}">
                    <td>${r.number}${isCur ? ' <span class="plot-here">◀</span>' : ''}</td>
                    <td>${r.trees ? r.trees : '<em class="plot-empty">empty</em>'}</td>
                    <td>${r.ba.toFixed(0)}</td>
                    <td>${r.hasGps ? '✓' : '—'}</td>
                    <td class="plot-actions">
                        <button type="button" class="control-button btn-secondary plot-btn" data-go="${r.number}" ${isCur ? 'disabled' : ''} title="Enter trees in this plot">Go</button>
                        <button type="button" class="control-button btn-info plot-btn" data-move="${r.number}" title="Renumber or move to another Area">Move</button>
                        ${r.trees === 0 ? `<button type="button" class="control-button delete-button plot-btn" data-remove="${r.number}" title="Remove this empty plot">&#10005;</button>` : ''}
                    </td>
                </tr>`;
            }).join('') + '</tbody>';
    }
    function openPlots() {
        if (!plotsModal) return;
        plotsArea = areaLetters[currentAreaIndex];
        renderPlots();
        plotsModal.style.display = 'flex';
    }
    function closePlots() {
        if (movePlotModal) movePlotModal.style.display = 'none';
        if (plotsModal) plotsModal.style.display = 'none';
        movingPlot = null;
    }

    function goToPlot(letter, n) {
        currentAreaIndex = Math.max(0, areaLetters.indexOf(letter));
        currentPlotNumber = n;
        updatePlotDisplay(); updateAreaDisplay(); calculateAndDisplayNeededPlots();
        saveSessionData();
        closePlots();
        showFeedback(`Now entering Area ${letter}, Plot ${n}`);
    }

    function removeEmptyPlot(letter, n) {
        if (!confirm(`Remove empty Plot ${n} (Area ${letter})? It will no longer count in the per-acre averages.`)) return;
        collectedData = collectedData.filter(e => !(e.areaLetter === letter && parseInt(e.plotNumber, 10) === n && isEmptyPlot(e)));
        renderEntriesKeepingPosition();
        renderPlots();
        showFeedback(`Empty Plot ${n} removed.`);
    }

    const treesIn = (letter, n) => collectedData.filter(e => e.areaLetter === letter && parseInt(e.plotNumber, 10) === n && !isEmptyPlot(e)).length;

    function updateMoveWarning() {
        if (!movingPlot) return;
        const to = $id('movePlotArea').value, n = parseInt($id('movePlotNumber').value, 10);
        const same = to === movingPlot.area && n === movingPlot.plot;
        const there = n >= 1 && !same ? treesIn(to, n) : 0;
        const warn = $id('movePlotWarn');
        warn.hidden = !there;
        warn.textContent = there ? `Plot ${n} in Area ${to} already has ${plural(there, 'tree')} — the two plots will be combined.` : '';
        const ok = $id('movePlotOk');
        ok.textContent = there ? 'Combine' : 'Move';
        ok.disabled = !(n >= MIN_PLOT_NUMBER && n <= MAX_PLOT_NUMBER) || same;
    }
    function openMovePlot(letter, n) {
        movingPlot = { area: letter, plot: n };
        const count = treesIn(letter, n);
        $id('movePlotTitle').textContent = `Move Plot ${n}`;
        $id('movePlotInfo').textContent = `Area ${letter}, Plot ${n} — ${count ? plural(count, 'tree') : 'empty plot'}. Its trees and GPS points move with it.`;
        $id('movePlotArea').innerHTML = areaLetters.map(a => `<option value="${a}">${a}</option>`).join('');
        $id('movePlotArea').value = letter;
        $id('movePlotNumber').value = n;
        updateMoveWarning();
        movePlotModal.style.display = 'flex';
        setTimeout(() => $id('movePlotNumber').select(), 50);
    }
    function doMovePlot() {
        if (!movingPlot) return;
        const from = movingPlot;
        const to = $id('movePlotArea').value, n = parseInt($id('movePlotNumber').value, 10);
        if (!(n >= MIN_PLOT_NUMBER && n <= MAX_PLOT_NUMBER) || (to === from.area && n === from.plot)) return;
        if (!safetyCopy(`Before moving Area ${from.area} Plot ${from.plot} to Area ${to} Plot ${n}`)) return;
        const combined = treesIn(to, n) > 0;
        const inFrom = e => e.areaLetter === from.area && parseInt(e.plotNumber, 10) === from.plot;
        collectedData.forEach(e => { if (inFrom(e)) { e.areaLetter = to; e.plotNumber = n; } });
        // One plot now: keep a single empty-plot record only if it has no trees at all.
        const inTo = e => e.areaLetter === to && parseInt(e.plotNumber, 10) === n;
        const hasTrees = collectedData.some(e => inTo(e) && !isEmptyPlot(e));
        let keptEmpty = false;
        collectedData = collectedData.filter(e => {
            if (!inTo(e) || !isEmptyPlot(e)) return true;
            if (hasTrees || keptEmpty) return false;
            keptEmpty = true; return true;
        });
        // Entering trees in the plot that moved: follow it.
        if (areaLetters[currentAreaIndex] === from.area && currentPlotNumber === from.plot) {
            currentAreaIndex = areaLetters.indexOf(to);
            currentPlotNumber = n;
        }
        movePlotModal.style.display = 'none';
        movingPlot = null;
        renderEntriesKeepingPosition();
        plotsArea = from.area;
        renderPlots();
        window.TTRecs?.render();
        showFeedback(`✓ Plot ${from.plot} ${combined ? 'combined into' : 'moved to'} Area ${to}, Plot ${n}`, false, 3500);
    }

    document.getElementById('plotsBtn')?.addEventListener('click', openPlots);
    document.getElementById('plotsCloseBtn')?.addEventListener('click', closePlots);
    plotsModal?.addEventListener('click', e => { if (e.target === plotsModal) closePlots(); });
    plotsAreaSelect?.addEventListener('change', e => { plotsArea = e.target.value; renderPlots(); });
    document.getElementById('plotsTable')?.addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.dataset.go) goToPlot(plotsArea, parseInt(b.dataset.go, 10));
        else if (b.dataset.move) openMovePlot(plotsArea, parseInt(b.dataset.move, 10));
        else if (b.dataset.remove) removeEmptyPlot(plotsArea, parseInt(b.dataset.remove, 10));
    });
    $id('movePlotArea')?.addEventListener('change', updateMoveWarning);
    $id('movePlotNumber')?.addEventListener('input', updateMoveWarning);
    $id('movePlotCancel')?.addEventListener('click', () => { movePlotModal.style.display = 'none'; movingPlot = null; });
    $id('movePlotOk')?.addEventListener('click', doMovePlot);
    movePlotModal?.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !$id('movePlotOk').disabled) doMovePlot();
    });
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        if (movePlotModal?.style.display === 'flex') { movePlotModal.style.display = 'none'; movingPlot = null; }
        else if (plotsModal?.style.display === 'flex') closePlots();
        else if (areaNotesModal?.style.display === 'flex') closeAreaNotes();
    });

    // Screen lock, app switch or close: save anything still pending.
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { flushNotes(); saveSessionData(); } });
    window.addEventListener('pagehide', () => { flushNotes(); saveSessionData(); });

    // Recommendation Builder keeps its per-area lists in the open project.
    window.ttGetProjectRecs = () => (currentProject ? (currentProject.recs ||= {}) : {});
    window.ttSaveProjectRecs = () => saveSessionData();

        // ============================================================
    // INSTALL PROMPT (PWA)
    // ============================================================
    function showInstallUI(show) {
        if (installBanner) installBanner.style.display = show ? 'flex' : 'none';
        if (installAppBtn) installAppBtn.style.display = show ? 'inline-flex' : 'none';
    }

    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredInstallPrompt = e;
        // Only show banner if not dismissed this session
        if (!sessionStorage.getItem('installDismissed')) showInstallUI(true);
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        showInstallUI(false);
    });

    async function triggerInstall() {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') deferredInstallPrompt = null;
        showInstallUI(false);
    }

    if (installAcceptBtn) installAcceptBtn.addEventListener('click', triggerInstall);
    if (installAppBtn)    installAppBtn.addEventListener('click', triggerInstall);
    if (installDismissBtn) installDismissBtn.addEventListener('click', () => {
        showInstallUI(false);
        sessionStorage.setItem('installDismissed', '1');
    });

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function initializeApp() {
        console.log("TimberTally v7 initializing...");
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
            console.log("TimberTally v7 initialized.");
        } catch(err) {
            console.error("INIT ERROR:", err);
            if (document.body) {
                document.body.innerHTML = `<div style="padding:20px;color:red;"><h2>App Init Failed</h2><p>${err.message}</p>Check console.</div>`;
            }
        }
    }

    initializeApp();

}); // end DOMContentLoaded

// --- END OF script.js ---

// --- START OF FILE storage.js ---
// TimberTally 3 storage, modeled on ForestScribe's:
//   • Live projects — the open project IS the saved copy (no separate "temp session").
//   • Every write is checked; a failed save shows in the header instead of "✓ Saved".
//   • Safety snapshots — a full copy of a project taken right before anything destructive,
//     restorable for 7 days.
//   • Backup files — every project, species list and plan details in one .json that can be
//     emailed or kept in cloud storage. Restoring only adds; it never overwrites a project.
//   • Asks the browser to keep this site's storage (not clear it to free space).
//
// Keys live under "tt3." so TimberTally 3 never fights with TimberTally 2 on the shared
// timbertally.github.io origin. TimberTally 2's data is copied in once, on first run.

(function () {
    'use strict';

    const K = {
        index: 'tt3.index',
        project: id => `tt3.p.${id}`,
        snaps: 'tt3.snaps',
        snap: id => `tt3.snap.${id}`,
        settings: 'tt3.settings',
        species: 'tt3.species',
        recDetails: 'tt3.recDetails',
        migrated: 'tt3.migrated',
        backupSnooze: 'tt3.backupSnooze',
    };
    // TimberTally 2 (and the first TimberTally 3 build) keys, read once for migration.
    const LEGACY = {
        session: 'timberTallyTempSession',
        projects: 'timberTallyProjects',
        notes: 'timberTallyStandNotes',
        settings: 'timberTallySettings',
        species: 'timberTallyCustomSpecies',
        recs: 'timberTallyRecommendations',
    };

    const SNAPSHOT_DAYS = 7;
    const MAX_SNAPSHOTS = 15;
    const DAY = 86400000;
    const BACKUP_FORMAT = 'timbertally-backup';
    const BACKUP_VERSION = 1;

    // ============================================================
    // SAVE STATE (shown in the header)
    // ============================================================
    const saveState = { lastSavedAt: null, error: null };
    const listeners = new Set();
    const emit = () => listeners.forEach(fn => { try { fn({ ...saveState }); } catch (e) { console.error(e); } });

    function describeError(err) {
        const name = err?.name || '';
        if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || err?.code === 22) {
            return 'Device storage is full. Save a backup, then delete finished projects to free space.';
        }
        return err?.message ? `Could not save: ${err.message}` : 'Could not save your last change.';
    }

    function readJSON(key, fallback = null) {
        try {
            const json = localStorage.getItem(key);
            return json == null ? fallback : JSON.parse(json);
        } catch (e) {
            console.error('[Storage] Read error', key, e);
            return fallback;
        }
    }

    /** Writes and reports the result. Returns true on success. */
    function writeJSON(key, value, { quiet = false } = {}) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            if (!quiet) { saveState.lastSavedAt = Date.now(); saveState.error = null; emit(); }
            return true;
        } catch (e) {
            console.error('[Storage] Save failed', key, e);
            if (!quiet) { saveState.error = describeError(e); emit(); }
            return false;
        }
    }
    const remove = key => { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } };

    // ============================================================
    // PROJECTS
    // ============================================================
    const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const treeCount = p => (p.data || []).filter(e => e && !e.emptyPlot).length;

    function blankProject(name) {
        const t = Date.now();
        return { id: newId(), name: name || 'Untitled Cruise', createdAt: t, updatedAt: t, lastBackupAt: 0, data: [], plot: 1, areaIdx: 0, notes: '', areaNotes: {}, recs: {} };
    }

    function normalizeProject(p) {
        const t = Date.now();
        return {
            id: String(p.id || newId()),
            name: String(p.name || 'Untitled Cruise'),
            createdAt: Number(p.createdAt) || t,
            updatedAt: Number(p.updatedAt) || t,
            lastBackupAt: Number(p.lastBackupAt) || 0,
            data: Array.isArray(p.data) ? p.data.filter(e => e && typeof e === 'object') : [],
            plot: Math.max(1, Math.min(999, parseInt(p.plot, 10) || 1)),
            areaIdx: Math.max(0, Math.min(25, parseInt(p.areaIdx, 10) || 0)),
            notes: '',
            areaNotes: normalizeAreaNotes(p),
            recs: p.recs && typeof p.recs === 'object' ? p.recs : {},
        };
    }

    /**
     * Notes are kept per Area ({ A: '…', B: '…' }). Older projects had one Stand Notes box
     * for the whole project; that text moves into the first Area with data (or Area A).
     */
    function normalizeAreaNotes(p) {
        const out = {};
        if (p.areaNotes && typeof p.areaNotes === 'object') {
            for (const [k, v] of Object.entries(p.areaNotes)) if (/^[A-Z]$/.test(k) && typeof v === 'string' && v.trim()) out[k] = v;
        }
        const legacy = typeof p.notes === 'string' ? p.notes.trim() : '';
        if (legacy) {
            const areas = [...new Set((Array.isArray(p.data) ? p.data : []).map(e => e?.areaLetter).filter(a => /^[A-Z]$/.test(a || '')))].sort();
            const to = areas[0] || 'A';
            out[to] = out[to] ? `${out[to]}\n\n${legacy}` : legacy;
        }
        return out;
    }
    const hasAreaNotes = p => Object.values(p.areaNotes || {}).some(v => String(v || '').trim()) || !!String(p.notes || '').trim();

    const getIndex = () => {
        const idx = readJSON(K.index, null);
        return idx && typeof idx === 'object' && idx.projects ? idx : { currentId: null, projects: {} };
    };
    const indexEntry = p => ({ id: p.id, name: p.name, createdAt: p.createdAt, updatedAt: p.updatedAt, lastBackupAt: p.lastBackupAt || 0, treeCount: treeCount(p) });

    function listProjects() {
        return Object.values(getIndex().projects).sort((a, b) => b.updatedAt - a.updatedAt);
    }
    function getProject(id) {
        const p = readJSON(K.project(id), null);
        return p ? normalizeProject(p) : null;
    }
    /** Saves the project and its index line. `touch` marks it changed (for the backup reminder). */
    function saveProject(p, { touch = true } = {}) {
        if (touch) p.updatedAt = Date.now();
        if (!writeJSON(K.project(p.id), p)) return false;
        const idx = getIndex();
        idx.projects[p.id] = indexEntry(p);
        return writeJSON(K.index, idx);
    }
    function deleteProject(id) {
        const idx = getIndex();
        delete idx.projects[id];
        if (idx.currentId === id) idx.currentId = null;
        const ok = writeJSON(K.index, idx);
        if (ok) remove(K.project(id));
        return ok;
    }
    const getCurrentId = () => getIndex().currentId;
    function setCurrentId(id) {
        const idx = getIndex();
        idx.currentId = id;
        return writeJSON(K.index, idx, { quiet: true });
    }
    /** A project, added under a new id (restores and copies never replace anything). */
    function addProjectCopy(p, name) {
        const copy = normalizeProject({ ...JSON.parse(JSON.stringify(p)), id: newId(), name: name || p.name });
        return saveProject(copy, { touch: false }) ? copy : null;
    }

    // ============================================================
    // SAFETY SNAPSHOTS
    // ============================================================
    function listSnapshots() {
        const list = readJSON(K.snaps, []);
        return Array.isArray(list) ? list.sort((a, b) => b.createdAt - a.createdAt) : [];
    }
    function purgeSnapshots(now = Date.now(), keep = MAX_SNAPSHOTS) {
        let list = listSnapshots();
        const cutoff = now - SNAPSHOT_DAYS * DAY;
        const drop = list.filter((s, i) => s.createdAt < cutoff || i >= keep);
        if (!drop.length) return;
        drop.forEach(s => remove(K.snap(s.id)));
        list = list.filter(s => !drop.includes(s));
        writeJSON(K.snaps, list, { quiet: true });
    }
    /** Copies the project as it is now. Returns true when kept (or there was nothing worth keeping). */
    function snapshot(p, reason) {
        if (!p || (!p.data?.length && !hasAreaNotes(p) && !Object.values(p.recs || {}).some(r => r?.length))) return true;
        const meta = { id: newId(), projectId: p.id, name: p.name, reason, createdAt: Date.now(), treeCount: treeCount(p) };
        let ok = writeJSON(K.snap(meta.id), p, { quiet: true });
        // Storage full: make room by dropping the oldest copies, then try again.
        for (let keep = MAX_SNAPSHOTS - 5; !ok && keep >= 0; keep -= 5) {
            purgeSnapshots(Date.now(), keep);
            ok = writeJSON(K.snap(meta.id), p, { quiet: true });
        }
        if (!ok) return false;
        const list = listSnapshots();
        list.unshift(meta);
        writeJSON(K.snaps, list, { quiet: true });
        purgeSnapshots();
        return true;
    }
    const getSnapshot = id => { const p = readJSON(K.snap(id), null); return p ? normalizeProject(p) : null; };
    function deleteSnapshot(id) {
        remove(K.snap(id));
        writeJSON(K.snaps, listSnapshots().filter(s => s.id !== id), { quiet: true });
    }

    // ============================================================
    // BACKUP FILES
    // ============================================================
    function buildBackup() {
        const projects = listProjects().map(m => getProject(m.id)).filter(Boolean);
        return {
            format: BACKUP_FORMAT, version: BACKUP_VERSION,
            exportedAt: new Date().toISOString(), app: 'TimberTally 3',
            projects,
            species: readJSON(K.species, null),
            recDetails: readJSON(K.recDetails, null),
        };
    }
    function markAllBackedUp(t = Date.now()) {
        for (const m of listProjects()) {
            const p = getProject(m.id);
            if (!p) continue;
            p.lastBackupAt = t;
            saveProject(p, { touch: false });
        }
    }
    function parseBackup(text) {
        let b;
        try { b = JSON.parse(text); } catch (e) { throw new Error('This file is not a TimberTally backup (it is not valid JSON).'); }
        if (b?.format !== BACKUP_FORMAT || !Array.isArray(b.projects)) throw new Error('This file is not a TimberTally backup.');
        if ((b.version || 0) > BACKUP_VERSION) throw new Error('This backup was made by a newer TimberTally. Update the app and try again.');
        return b;
    }
    const contentKey = p => { const n = normalizeProject(p); return JSON.stringify([n.data, n.areaNotes, n.recs]); };
    /**
     * Adds the backup's projects. One already here with the same contents is skipped; one
     * that differs is added as a copy marked "(restored)". Nothing on this device is replaced.
     */
    function restoreBackup(b) {
        const result = { added: [], skipped: [], failed: [] };
        const existing = listProjects().map(m => getProject(m.id)).filter(Boolean);
        for (const raw of b.projects) {
            const p = normalizeProject(raw);
            const same = existing.find(x => contentKey(x) === contentKey(p));
            if (same) { result.skipped.push(p.name); continue; }
            const clash = existing.some(x => x.id === p.id);
            const stamp = new Date(b.exportedAt || Date.now()).toLocaleDateString();
            const copy = clash || existing.some(x => x.name === p.name)
                ? addProjectCopy(p, `${p.name} (restored ${stamp})`)
                : (saveProject(p, { touch: false }) ? p : null);
            if (copy) { result.added.push(copy.name); existing.push(copy); } else result.failed.push(p.name);
        }
        // Species: add any missing ones. Plan details: only if none are set here.
        if (Array.isArray(b.species)) {
            const mine = readJSON(K.species, []) || [];
            const merged = [...new Set([...mine, ...b.species.filter(s => typeof s === 'string')])];
            if (merged.length !== mine.length) writeJSON(K.species, merged);
        }
        if (b.recDetails && !readJSON(K.recDetails, null)) writeJSON(K.recDetails, b.recDetails);
        return result;
    }

    /** Phones: share sheet (Save to Files, email…). Computers: Save dialog, else a download. */
    async function saveFile(blob, filename) {
        const touch = window.matchMedia?.('(pointer: coarse)').matches;
        try {
            const file = new File([blob], filename, { type: blob.type });
            if (touch && navigator.canShare?.({ files: [file] })) {
                await navigator.share({ files: [file], title: filename });
                return 'shared';
            }
        } catch (e) {
            if (e?.name === 'AbortError') return 'cancelled';
        }
        if (!touch && window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({ suggestedName: filename, id: 'timbertally-backups', types: [{ description: 'TimberTally backup', accept: { 'application/json': ['.json'] } }] });
                const out = await handle.createWritable();
                await out.write(blob);
                await out.close();
                return 'saved';
            } catch (e) {
                if (e?.name === 'AbortError') return 'cancelled';
            }
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.style.display = 'none';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        return 'downloaded';
    }

    // ============================================================
    // MIGRATION FROM TIMBERTALLY 2 (once)
    // ============================================================
    function migrate() {
        if (readJSON(K.migrated, false)) return;
        const projects = [];
        const saved = readJSON(LEGACY.projects, {});
        if (saved && typeof saved === 'object') {
            for (const [name, data] of Object.entries(saved)) {
                if (Array.isArray(data)) projects.push(normalizeProject({ ...blankProject(name), data }));
            }
        }
        const session = readJSON(LEGACY.session, null);
        const notes = (() => { try { return localStorage.getItem(LEGACY.notes) || ''; } catch (e) { return ''; } })();
        const oldRecs = readJSON(LEGACY.recs, null);
        // The TimberTally 2 working session becomes the open project (unless it matches a saved one).
        let current = null;
        if (Array.isArray(session?.data) && session.data.length) {
            const key = JSON.stringify(session.data);
            current = projects.find(p => JSON.stringify(p.data) === key) || null;
            if (!current) {
                current = normalizeProject({ ...blankProject(`Working data (from TimberTally 2, ${new Date().toLocaleDateString()})`), data: session.data });
                projects.unshift(current);
            }
            current.plot = session.plot ?? current.plot;
            current.areaIdx = session.areaIdx ?? current.areaIdx;
        }
        if (!current) current = projects[0] || blankProject('Untitled Cruise');
        if (!projects.includes(current)) projects.unshift(current);
        if (notes.trim()) current.notes = notes;
        if (oldRecs?.areas) current.recs = oldRecs.areas;

        for (const p of projects) if (!saveProject(p, { touch: false })) return; // storage full: try again next start
        setCurrentId(current.id);
        const s = readJSON(LEGACY.settings, null);
        if (s && !readJSON(K.settings, null)) writeJSON(K.settings, s, { quiet: true });
        const sp = readJSON(LEGACY.species, null);
        if (Array.isArray(sp) && !readJSON(K.species, null)) writeJSON(K.species, sp, { quiet: true });
        if (oldRecs?.details && !readJSON(K.recDetails, null)) writeJSON(K.recDetails, oldRecs.details, { quiet: true });
        writeJSON(K.migrated, { at: Date.now(), projects: projects.length }, { quiet: true });
        // TimberTally 2's keys are left alone, so TimberTally 2 keeps working on this device.
    }

    // ============================================================
    // STARTUP / DEVICE STORAGE
    // ============================================================
    async function requestPersistentStorage() {
        try {
            if (!navigator.storage?.persist) return false;
            if (await navigator.storage.persisted()) return true;
            return await navigator.storage.persist();
        } catch (e) { return false; }
    }
    async function storageInfo() {
        const info = { persisted: null, usedKb: 0 };
        try { if (navigator.storage?.persisted) info.persisted = await navigator.storage.persisted(); } catch (e) { /* unsupported */ }
        try {
            let chars = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                chars += k.length + (localStorage.getItem(k) || '').length;
            }
            info.usedKb = Math.round((chars * 2) / 1024); // UTF-16
        } catch (e) { /* ignore */ }
        return info;
    }

    /** Opens storage: migrates once, clears old snapshots, returns the project to open. */
    function open() {
        migrate();
        purgeSnapshots();
        let id = getCurrentId();
        let p = id ? getProject(id) : null;
        if (!p) {
            const latest = listProjects()[0];
            p = latest ? getProject(latest.id) : null;
        }
        if (!p) { p = blankProject('Untitled Cruise'); saveProject(p, { touch: false }); }
        setCurrentId(p.id);
        requestPersistentStorage();
        return p;
    }

    window.TTStore = {
        K, open, readJSON, writeJSON,
        listProjects, getProject, saveProject, deleteProject, getCurrentId, setCurrentId, blankProject, addProjectCopy, treeCount,
        snapshot, listSnapshots, getSnapshot, deleteSnapshot, SNAPSHOT_DAYS,
        buildBackup, parseBackup, restoreBackup, markAllBackedUp, saveFile,
        storageInfo, requestPersistentStorage,
        onSaveState: fn => { listeners.add(fn); return () => listeners.delete(fn); },
        getSaveState: () => ({ ...saveState }),
    };
})();

// --- END OF FILE storage.js ---

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
        wording: 'tt3.wording',
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

    // ============================================================
    // BACKING STORE: IndexedDB (projects, index, safety copies), with localStorage fallback
    //
    // Projects and safety copies (tt3.index, tt3.p.*, tt3.snaps, tt3.snap.*) live in
    // IndexedDB ('timbertally3', store 'kv'), which has far more room than localStorage.
    // They are loaded into an in-memory cache before the app starts (TTStore.ready), so every
    // read stays synchronous. A write updates the cache at once and is saved to IndexedDB;
    // the header says "Saved" only after the IndexedDB transaction completes, and a failed
    // write shows the red "Not saved" bar. Small device settings (settings, species list,
    // plan details, backup snooze, TimberTally 2 migration flag) stay in localStorage.
    // If IndexedDB can't be opened (private mode, old Safari), everything uses localStorage
    // exactly as before.
    // ============================================================
    const IDB_NAME = 'timbertally3', IDB_STORE = 'kv', IDB_MIGRATED = '__idbMigratedFromLocalStorage';
    const LOCAL_ONLY = new Set([K.settings, K.species, K.recDetails, K.wording, K.backupSnooze, K.migrated, 'tt3.fallbackDirty', 'tt3.idbUsed', 'tt3.sync']);
    let db = null;                 // open IDBDatabase, or null = localStorage mode
    const cache = new Map();       // key -> JSON text (IndexedDB mode only)
    let pendingWrites = 0;
    const inIdb = key => !!db && key.startsWith('tt3.') && !LOCAL_ONLY.has(key);

    /** Opens the database at its current version (or creates it), making sure the store exists. */
    function idbOpen(version) {
        return new Promise((resolve, reject) => {
            if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
            let req;
            try { req = version ? indexedDB.open(IDB_NAME, version) : indexedDB.open(IDB_NAME); } catch (e) { reject(e); return; }
            req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE); };
            req.onsuccess = () => {
                const d = req.result;
                if (d.objectStoreNames.contains(IDB_STORE)) { resolve(d); return; }
                // The database exists without our store (made by something else): add it in a version bump.
                const next = d.version + 1;
                d.close();
                idbOpen(next).then(resolve, reject);
            };
            req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
            req.onblocked = () => reject(new Error('IndexedDB blocked'));
        });
    }
    function idbLoadAll(d) {
        return new Promise((resolve, reject) => {
            const out = new Map();
            const tx = d.transaction(IDB_STORE, 'readonly');
            const req = tx.objectStore(IDB_STORE).openCursor();
            req.onsuccess = () => { const c = req.result; if (c) { out.set(String(c.key), c.value); c.continue(); } };
            tx.oncomplete = () => resolve(out);
            tx.onerror = tx.onabort = () => reject(tx.error || new Error('IndexedDB read failed'));
        });
    }
    /** Puts (value = string) or deletes (value = null) keys in one transaction. */
    function idbWrite(entries) {
        // The connection is closed when another tab upgrades or deletes the database
        // (onversionchange below); open a fresh one instead of failing every save after that.
        if (dbClosed) {
            return idbOpen().then(d => {
                db = d; dbClosed = false;
                d.onversionchange = () => { try { d.close(); } catch (e) { /* ignore */ } dbClosed = true; };
                return idbWrite(entries);
            });
        }
        return new Promise((resolve, reject) => {
            let tx;
            try { tx = db.transaction(IDB_STORE, 'readwrite'); }
            catch (e) {
                if (e?.name === 'InvalidStateError') { dbClosed = true; idbWrite(entries).then(resolve, reject); return; }
                reject(e); return;
            }
            const st = tx.objectStore(IDB_STORE);
            for (const [k, v] of entries) { if (v == null) st.delete(k); else st.put(v, k); }
            tx.oncomplete = () => resolve();
            tx.onerror = tx.onabort = () => reject(tx.error || new Error('IndexedDB write failed'));
        });
    }

    /** Opens IndexedDB, copies localStorage's tt3.* records in once (leaving them in place), fills the cache. */
    async function init() {
        try {
            const d = await Promise.race([idbOpen(), new Promise((_, rej) => setTimeout(() => rej(new Error('IndexedDB open timed out')), 4000))]);
            let all = await idbLoadAll(d);
            if (!all.has(IDB_MIGRATED)) {
                const copy = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith('tt3.') && !LOCAL_ONLY.has(k) && !all.has(k)) copy.push([k, localStorage.getItem(k)]);
                }
                copy.push([IDB_MIGRATED, JSON.stringify({ at: Date.now(), keys: copy.length })]);
                db = d;
                await idbWrite(copy);   // localStorage copies are kept as a fallback
                all = await idbLoadAll(d);
            }
            db = d;
            for (const [k, v] of all) if (k !== IDB_MIGRATED && typeof v === 'string') cache.set(k, v);
            d.onversionchange = () => { try { d.close(); } catch (e) { /* ignore */ } dbClosed = true; };
            backend = 'indexeddb';
            try { localStorage.setItem(IDB_USED_FLAG, '1'); } catch (e2) { /* ignore */ }
            await recoverFallbackSession();
        } catch (e) {
            console.warn('[Storage] IndexedDB not available, using localStorage:', e?.message || e);
            db = null; cache.clear();
            backend = 'localStorage';
            // This device saved to IndexedDB before, so the localStorage copies may be out of date.
            // Say so rather than quietly showing older data.
            let usedBefore = false;
            try { usedBefore = localStorage.getItem(IDB_USED_FLAG) === '1'; } catch (e2) { /* ignore */ }
            if (usedBefore) setTimeout(() => alert('TimberTally could not open its main storage this time, so it is showing an older copy of your projects.\n\nAnything you enter now is kept, and is moved into main storage the next time it opens (the older copy is kept as a safety copy).\n\nClose the app fully and open it again. If this keeps happening, restore your latest backup file (Projects → Restore Backup) and contact timbertallyapp@gmail.com.'), 500);
        }
    }

    // ============================================================
    // WORK SAVED WHILE INDEXEDDB COULD NOT OPEN (fallback session)
    //
    // In localStorage mode every project / index / safety-copy write also sets tt3.fallbackDirty.
    // The next time IndexedDB opens, each project in localStorage that is newer (updatedAt, then
    // rev) than the IndexedDB copy is brought in, the older IndexedDB copy is kept as a safety
    // copy, projects created in the fallback session are added to the list, and the flag is cleared.
    // ============================================================
    const isFallbackKey = k => k === K.index || k === K.snaps || k.startsWith('tt3.p.') || k.startsWith('tt3.snap.');
    function markFallbackDirty() {
        try { if (!localStorage.getItem(FALLBACK_DIRTY)) localStorage.setItem(FALLBACK_DIRTY, JSON.stringify({ at: Date.now() })); } catch (e) { /* ignore */ }
    }
    /**
     * Pure: decides what to bring in from a fallback session.
     * @param {Map|Object} idb   key → JSON text, as stored in IndexedDB
     * @param {Map|Object} local key → JSON text, the tt3.* records in localStorage
     * @returns {{ writes: Array<[string,string]>, older: Array<Object>, brought: string[] }}
     *   writes: records to put in IndexedDB; older: the IndexedDB projects being replaced
     *   (to keep as safety copies); brought: ids of the projects brought in.
     */
    function mergeFallbackProjects(idb, local) {
        const get = (m, k) => (m instanceof Map ? m.get(k) : m[k]);
        const keys = m => (m instanceof Map ? [...m.keys()] : Object.keys(m));
        const parse = t => { try { return t == null ? null : JSON.parse(t); } catch (e) { return null; } };
        const writes = [], older = [], brought = [];
        const idx = parse(get(idb, K.index)) || { currentId: null, projects: {} };
        if (!idx.projects || typeof idx.projects !== 'object') idx.projects = {};
        const lIdx = parse(get(local, K.index));
        let idxChanged = false;
        for (const k of keys(local)) {
            if (!k.startsWith('tt3.p.')) continue;
            const lp = parse(get(local, k));
            if (!lp || typeof lp !== 'object' || !lp.id) continue;
            const ip = parse(get(idb, k));
            const lt = Number(lp.updatedAt) || 0, it = ip ? Number(ip.updatedAt) || 0 : -1;
            const newer = !ip || lt > it || (lt === it && (Number(lp.rev) || 0) > (Number(ip.rev) || 0) && get(local, k) !== get(idb, k));
            if (!newer) continue;
            if (ip) older.push(ip);
            writes.push([k, get(local, k)]);
            brought.push(String(lp.id));
            idx.projects[lp.id] = { id: lp.id, name: lp.name, createdAt: lp.createdAt, updatedAt: lp.updatedAt, lastBackupAt: lp.lastBackupAt || 0, treeCount: (lp.data || []).filter(e => e && !e.emptyPlot).length };
            idxChanged = true;
        }
        // Projects the fallback session listed (e.g. made there) that IndexedDB still lacks in its list.
        if (lIdx?.projects && typeof lIdx.projects === 'object') {
            for (const [id, m] of Object.entries(lIdx.projects)) {
                if (!idx.projects[id] && (get(idb, K.project(id)) != null || writes.some(w => w[0] === K.project(id)))) { idx.projects[id] = m; idxChanged = true; }
            }
        }
        if (idxChanged) writes.push([K.index, JSON.stringify(idx)]);
        // Safety copies taken during the fallback session.
        const iSnaps = parse(get(idb, K.snaps)), lSnaps = parse(get(local, K.snaps));
        if (Array.isArray(lSnaps) && lSnaps.length) {
            const have = new Set((Array.isArray(iSnaps) ? iSnaps : []).map(x => x.id));
            const add = lSnaps.filter(x => x && x.id && !have.has(x.id) && get(local, K.snap(x.id)) != null && get(idb, K.snap(x.id)) == null);
            if (add.length) {
                add.forEach(x => writes.push([K.snap(x.id), get(local, K.snap(x.id))]));
                writes.push([K.snaps, JSON.stringify([...(Array.isArray(iSnaps) ? iSnaps : []), ...add])]);
            }
        }
        return { writes, older, brought };
    }
    async function recoverFallbackSession() {
        let dirty = null;
        try { dirty = localStorage.getItem(FALLBACK_DIRTY); } catch (e) { return; }
        if (!dirty) return;
        const local = new Map();
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && isFallbackKey(k)) local.set(k, localStorage.getItem(k));
        }
        const { writes, older, brought } = mergeFallbackProjects(cache, local);
        if (writes.length) {
            await idbWrite(writes);
            for (const [k, v] of writes) cache.set(k, v);
            for (const p of older) await snapshot(normalizeProject(p), 'Older copy, replaced by work saved while main storage was unavailable');
            console.warn('[Storage] Brought in work saved while IndexedDB was unavailable:', brought);
        }
        try { localStorage.removeItem(FALLBACK_DIRTY); } catch (e) { /* ignore */ }
    }

    const FALLBACK_DIRTY = 'tt3.fallbackDirty';
    const IDB_USED_FLAG = 'tt3.idbUsed';
    let dbClosed = false;
    let backend = 'pending';
    const ready = init();

    function readJSON(key, fallback = null) {
        try {
            const json = inIdb(key) ? cache.get(key) : localStorage.getItem(key);
            return json == null ? fallback : JSON.parse(json);
        } catch (e) {
            console.error('[Storage] Read error', key, e);
            return fallback;
        }
    }

    /**
     * Writes and reports the result. Returns true when the write was accepted (in IndexedDB
     * mode the save finishes a moment later; a failure then shows the "Not saved" bar).
     */
    function writeJSON(key, value, opts) { return writeJSONDone(key, value, opts).sync; }
    /** Same as writeJSON, but also gives `done`: a promise of true once the write is really stored. */
    function writeJSONDone(key, value, { quiet = false } = {}) {
        let text;
        try { text = JSON.stringify(value); } catch (e) { if (!quiet) { saveState.error = describeError(e); emit(); } return { sync: false, done: Promise.resolve(false) }; }
        if (inIdb(key)) {
            cache.set(key, text);
            pendingWrites++;
            const done = idbWrite([[key, text]]).then(() => {
                if (!quiet) { saveState.lastSavedAt = Date.now(); saveState.error = null; emit(); }
                return true;
            }).catch(e => {
                console.error('[Storage] Save failed', key, e);
                saveState.error = describeError(e); emit();
                return false;
            }).finally(() => { pendingWrites--; });
            return { sync: true, done };
        }
        try {
            localStorage.setItem(key, text);
            if (!db && isFallbackKey(key)) markFallbackDirty();
            if (!quiet) { saveState.lastSavedAt = Date.now(); saveState.error = null; emit(); }
            return { sync: true, done: Promise.resolve(true) };
        } catch (e) {
            console.error('[Storage] Save failed', key, e);
            if (!quiet) { saveState.error = describeError(e); emit(); }
            return { sync: false, done: Promise.resolve(false) };
        }
    }
    const remove = key => {
        if (inIdb(key)) {
            cache.delete(key);
            idbWrite([[key, null]]).catch(e => console.error('[Storage] Delete failed', key, e));
            return;
        }
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    };

    // ============================================================
    // PROJECTS
    // ============================================================
    const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const treeCount = p => (p.data || []).filter(e => e && !e.emptyPlot).length;

    function blankProject(name) {
        const t = Date.now();
        return { id: newId(), name: name || 'Untitled Cruise', createdAt: t, updatedAt: t, lastBackupAt: 0, data: [], plot: 1, areaIdx: 0, notes: '', areaNotes: {}, areaRegen: {}, areaAcres: {}, recs: {} };
    }

    function normalizeProject(p) {
        const t = Date.now();
        return {
            id: String(p.id || newId()),
            name: String(p.name || 'Untitled Cruise'),
            createdAt: Number(p.createdAt) || t,
            updatedAt: Number(p.updatedAt) || t,
            lastBackupAt: Number(p.lastBackupAt) || 0,
            rev: Math.max(0, parseInt(p.rev, 10) || 0),
            data: Array.isArray(p.data) ? p.data.filter(e => e && typeof e === 'object' && !Array.isArray(e)).map(normalizeEntry) : [],
            plot: Math.max(1, Math.min(999, parseInt(p.plot, 10) || 1)),
            areaIdx: Math.max(0, Math.min(25, parseInt(p.areaIdx, 10) || 0)),
            notes: '',
            areaNotes: normalizeAreaNotes(p),
            areaRegen: normalizeAreaRegen(p.areaRegen),
            areaAcres: normalizeAreaAcres(p.areaAcres),
            recs: normalizeRecs(p.recs),
        };
    }

    /**
     * One tree (or empty-plot) record from storage, a backup, a CSV or a merge, with every field
     * the app shows coerced to its type: species / notes strings, DBH a number (kept as text, as
     * the Data tab saves it), logs a number or 'Cull', plot a whole number, Area a letter A–Z,
     * Cut / UGS 'Yes' or 'No', GPS { lat, lon } numbers or null. Old TimberTally data that kept
     * plot numbers as text ("3") becomes 3.
     */
    function normalizeEntry(e) {
        const str = v => (v == null ? '' : typeof v === 'string' ? v : (typeof v === 'number' || typeof v === 'boolean') ? String(v) : '');
        const numText = v => { const t = str(v).trim(); return t !== '' && Number.isFinite(Number(t)) ? t : ''; };
        const yn = v => (str(v).trim().toLowerCase() === 'yes' ? 'Yes' : 'No');
        const plot = parseInt(e.plotNumber, 10);
        const area = str(e.areaLetter).trim().toUpperCase();
        const logs = str(e.logs).trim();
        const l = e.location;
        const loc = l && typeof l === 'object' && l.lat != null && l.lon != null && Number.isFinite(Number(l.lat)) && Number.isFinite(Number(l.lon))
            ? { lat: Number(l.lat), lon: Number(l.lon), ...(l.acc != null && Number.isFinite(Number(l.acc)) ? { acc: Number(l.acc) } : {}) }
            : null;
        const out = {
            ...e,
            plotNumber: Number.isFinite(plot) && plot > 0 ? plot : 1,
            areaLetter: /^[A-Z]$/.test(area) ? area : 'A',
            species: str(e.species),
            dbh: numText(e.dbh),
            logs: logs.toLowerCase() === 'cull' ? 'Cull' : numText(logs),
            cutStatus: yn(e.cutStatus),
            ugsStatus: yn(e.ugsStatus),
            notes: str(e.notes),
            location: loc,
        };
        if (typeof out.id !== 'number' && typeof out.id !== 'string') delete out.id;
        if (e.emptyPlot) out.emptyPlot = true; else delete out.emptyPlot;
        return out;
    }
    /** Recommendations per Area: { A: [{ id, sourceId, title, text }] } with string fields. */
    function normalizeRecs(r) {
        const out = {};
        if (!r || typeof r !== 'object') return out;
        for (const [k, list] of Object.entries(r)) {
            if (!/^[A-Z]$/.test(k) || !Array.isArray(list)) continue;
            out[k] = list.filter(x => x && typeof x === 'object').map(x => ({
                ...x,
                id: typeof x.id === 'string' || typeof x.id === 'number' ? String(x.id) : newId(),
                ...(x.sourceId != null ? { sourceId: String(x.sourceId) } : {}),
                title: typeof x.title === 'string' ? x.title : '',
                text: typeof x.text === 'string' ? x.text : '',
            }));
        }
        return out;
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
    /** Acres per Area: { A: 12.5 } (optional; only positive numbers kept). */
    function normalizeAreaAcres(a) {
        const out = {};
        if (a && typeof a === 'object') for (const [k, v] of Object.entries(a)) if (/^[A-Z]$/.test(k) && Number(v) > 0) out[k] = Number(v);
        return out;
    }
    /** Regeneration notes per Area: { A: { density, browse, ground, invasives: [], species } }. */
    function normalizeAreaRegen(r) {
        const out = {};
        if (!r || typeof r !== 'object') return out;
        for (const [k, v] of Object.entries(r)) {
            if (!/^[A-Z]$/.test(k) || !v || typeof v !== 'object') continue;
            const e = {
                density: typeof v.density === 'string' ? v.density : '',
                browse: typeof v.browse === 'string' ? v.browse : '',
                ground: typeof v.ground === 'string' ? v.ground : '',
                invasives: Array.isArray(v.invasives) ? v.invasives.filter(x => typeof x === 'string') : [],
                species: typeof v.species === 'string' ? v.species : '',
            };
            if (e.density || e.browse || e.ground || e.invasives.length || e.species.trim()) out[k] = e;
        }
        return out;
    }
    const hasAreaNotes = p => Object.keys(p.areaRegen || {}).length > 0 || Object.values(p.areaNotes || {}).some(v => String(v || '').trim()) || !!String(p.notes || '').trim();

    const revOf = p => Math.max(0, parseInt(p?.rev, 10) || 0);
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
    /**
     * Saves the project and its index line. `touch` marks it changed (for the backup reminder).
     * Every save also counts up `rev` and tells other open windows (see CROSS-WINDOW below).
     */
    function saveProject(p, { touch = true, ifChanged = false } = {}) {
        // ifChanged: skip the write (and the message to other windows) when nothing changed.
        if (ifChanged && !touch) {
            const cur = inIdb(K.project(p.id)) ? cache.get(K.project(p.id)) : (() => { try { return localStorage.getItem(K.project(p.id)); } catch (e) { return null; } })();
            if (cur != null && cur === JSON.stringify(p)) return true;
        }
        if (touch) p.updatedAt = Date.now();
        const stored = readJSON(K.project(p.id), null);
        const base = stored ? revOf(stored) : 0;
        // Another window saved this project after this copy was loaded (its message has not
        // been handled yet): keep its entries too, so neither window's trees are lost.
        let combined = false;
        if (stored && base > revOf(p) && Array.isArray(stored.data)) {
            const ids = new Set((p.data || []).map(e => e && e.id).filter(id => id != null));
            const theirs = stored.data.filter(e => e && e.id != null && !ids.has(e.id));
            if (theirs.length) { p.data = [...(p.data || []), ...theirs]; combined = true; }
        }
        p.rev = Math.max(base, revOf(p)) + 1;
        if (!writeJSON(K.project(p.id), p)) return false;
        lastWritten.set(p.id, JSON.parse(JSON.stringify(p)));
        const idx = getIndex();
        idx.projects[p.id] = indexEntry(p);
        const ok = writeJSON(K.index, idx);
        announce({ type: 'saved', id: p.id, rev: p.rev, base, text: JSON.stringify(p) });
        if (combined) notifyRemote({ id: p.id, merged: true });
        return ok;
    }
    function deleteProject(id) {
        const idx = getIndex();
        delete idx.projects[id];
        if (idx.currentId === id) idx.currentId = null;
        const ok = writeJSON(K.index, idx);
        if (ok) { remove(K.project(id)); announce({ type: 'deleted', id }); }
        return ok;
    }

    // ============================================================
    // CROSS-WINDOW: two windows (installed app + browser tab) on one device share storage but
    // each keeps its own copy in memory. Every project save is announced on a BroadcastChannel
    // (or, without one, through a localStorage 'storage' event). A window that hears it updates
    // its copy before its next write:
    //   • nothing changed here since the version the other window started from → take theirs;
    //   • both windows saved from the same version → combine: their entries plus any entry only
    //     this window has (by entry id), so a tree entered in either window is never lost.
    // The app is told (onRemoteChange) so it can reload the open project and say so.
    // ============================================================
    const WINDOW_ID = newId();
    const remoteListeners = new Set();
    let channel = null;
    try { if (typeof BroadcastChannel !== 'undefined') channel = new BroadcastChannel('timbertally3-sync'); } catch (e) { channel = null; }
    function announce(msg) {
        msg.from = WINDOW_ID;
        try {
            if (channel) { channel.postMessage(msg); return; }
            // No BroadcastChannel: a small localStorage note fires 'storage' in the other windows.
            const note = { ...msg, t: Date.now() };
            delete note.text;
            localStorage.setItem('tt3.sync', JSON.stringify(note));
        } catch (e) { /* other windows will see it on their next start */ }
    }
    /**
     * Pure: combines this window's copy with another window's save of the same project.
     * @returns {{ project: Object, save: boolean }} the version to keep; `save` = it holds entries
     *   the other window lacks, so it must be written and announced.
     */
    function mergeConcurrent(local, remote, base) {
        if (!local) return { project: remote, save: false };
        const lrev = revOf(local), rrev = revOf(remote);
        // Nothing saved here since the version the other window started from: take theirs.
        if (lrev <= (Number(base) || 0)) return { project: remote, save: false };
        // Both saved: the later version wins, plus every entry only the other one has.
        const [win, other] = rrev >= lrev ? [remote, local] : [local, remote];
        const ids = new Set((win.data || []).map(e => e && e.id).filter(id => id != null));
        const extra = (other.data || []).filter(e => e && e.id != null && !ids.has(e.id));
        if (!extra.length) return { project: win, save: false };
        return {
            project: { ...win, data: [...(win.data || []), ...extra], rev: Math.max(lrev, rrev), updatedAt: Math.max(Number(local.updatedAt) || 0, Number(remote.updatedAt) || 0) },
            save: true,
        };
    }
    const notifyRemote = info => remoteListeners.forEach(fn => { try { fn(info); } catch (e) { console.error(e); } });
    async function onRemote(msg) {
        if (!msg || msg.from === WINDOW_ID) return;
        if (msg.type === 'deleted') {
            if (db) {
                cache.delete(K.project(msg.id));
                const idx = getIndex();
                if (idx.projects[msg.id]) { delete idx.projects[msg.id]; cache.set(K.index, JSON.stringify(idx)); }
            }
            notifyRemote({ id: msg.id, deleted: true });
            return;
        }
        if (msg.type !== 'saved') return;
        let text = msg.text;
        if (text == null) {
            // Storage-event note: read the saved copy itself.
            if (db) text = await new Promise(res => {
                try {
                    const r = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(K.project(msg.id));
                    r.onsuccess = () => res(typeof r.result === 'string' ? r.result : null); r.onerror = () => res(null);
                } catch (e) { res(null); }
            });
            else { try { text = localStorage.getItem(K.project(msg.id)); } catch (e) { text = null; } }
        }
        let remote;
        try { remote = JSON.parse(text); } catch (e) { return; }
        if (!remote || remote.id !== msg.id) return;
        // This window's copy: the IndexedDB cache, or (localStorage mode) the last version this window wrote.
        const local = db ? readJSON(K.project(msg.id), null) : lastWritten.get(msg.id) || null;
        const r = mergeConcurrent(local, remote, msg.base);
        if (db) {
            cache.set(K.project(msg.id), JSON.stringify(r.project));
            const idx = getIndex();
            idx.projects[msg.id] = indexEntry(r.project);
            cache.set(K.index, JSON.stringify(idx));
        }
        lastWritten.set(msg.id, r.project);
        if (r.save) saveProject(r.project, { touch: false });
        notifyRemote({ id: msg.id, merged: r.save });
    }
    /** localStorage mode: the copy each project had when this window last saved or heard of it. */
    const lastWritten = new Map();
    if (channel) channel.onmessage = ev => { onRemote(ev.data); };
    else if (typeof addEventListener === 'function') addEventListener('storage', ev => {
        if (ev.key !== 'tt3.sync' || !ev.newValue) return;
        try { onRemote(JSON.parse(ev.newValue)); } catch (e) { /* ignore */ }
    });
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
    /**
     * Copies the project as it is now. Resolves true once the copy is really stored (the
     * IndexedDB transaction completed), or there was nothing worth keeping; false when it
     * could not be saved, so the caller must not go on with the destructive action.
     */
    async function snapshot(p, reason) {
        if (!p || (!p.data?.length && !hasAreaNotes(p) && !Object.values(p.recs || {}).some(r => r?.length))) return true;
        const meta = { id: newId(), projectId: p.id, name: p.name, reason, createdAt: Date.now(), treeCount: treeCount(p) };
        const copy = JSON.parse(JSON.stringify(p));
        const put = () => { const w = writeJSONDone(K.snap(meta.id), copy, { quiet: true }); return w.sync ? w.done : Promise.resolve(false); };
        let ok = await put();
        // Storage full: make room by dropping the oldest copies, then try again.
        for (let keep = MAX_SNAPSHOTS - 5; !ok && keep >= 0; keep -= 5) {
            purgeSnapshots(Date.now(), keep);
            ok = await put();
        }
        if (!ok) { remove(K.snap(meta.id)); return false; }
        const list = listSnapshots();
        list.unshift(meta);
        const w = writeJSONDone(K.snaps, list, { quiet: true });
        if (!w.sync || !(await w.done)) { remove(K.snap(meta.id)); return false; }
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
            // Standard Wording edits (Menu → Standard Wording). Older backups have none.
            wording: readJSON(K.wording, null),
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
    const contentKey = p => { const n = normalizeProject(p); return JSON.stringify([n.data, n.areaNotes, n.areaRegen, n.areaAcres, n.recs]); };
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
        // Standard Wording: only adds. Items already changed here keep this device's wording;
        // the backup's own recommendations are added when this device doesn't have them.
        if (b.wording && typeof b.wording === 'object') {
            const mine = readJSON(K.wording, null) || {};
            const recs = { ...(b.wording.recs || {}), ...(mine.recs || {}) };
            const have = new Set((mine.added || []).map(a => a.id));
            const added = [...(mine.added || []), ...(Array.isArray(b.wording.added) ? b.wording.added : []).filter(a => a && a.id && !have.has(a.id))];
            writeJSON(K.wording, { recs, added });
        }
        return result;
    }

    /** Saves a file: share sheet on a phone, save dialog on a computer, else a download. `types` names the file type for the dialog. */
    async function saveFile(blob, filename, types = { description: 'TimberTally backup', accept: { 'application/json': ['.json'] } }) {
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
                const handle = await window.showSaveFilePicker({ suggestedName: filename, id: 'timbertally-backups', types: [types] });
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
        info.backend = backend;
        try {
            if (db && navigator.storage?.estimate) {
                const est = await navigator.storage.estimate();
                info.usedKb = Math.round((est.usage || 0) / 1024);
                if (est.quota) info.quotaKb = Math.round(est.quota / 1024);
                return info;
            }
        } catch (e) { /* fall through to the localStorage count */ }
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
        mergeFallbackProjects, mergeConcurrent,
        /** Another window saved (or deleted) a project: fn({ id, merged, deleted }). */
        onRemoteChange: fn => { remoteListeners.add(fn); return () => remoteListeners.delete(fn); },
        buildBackup, parseBackup, restoreBackup, markAllBackedUp, saveFile, normalizeProject,
        storageInfo, requestPersistentStorage,
        /** Resolves once saved projects are loaded (IndexedDB, or localStorage as a fallback). */
        ready,
        backend: () => backend,
        pendingWrites: () => pendingWrites,
        onSaveState: fn => { listeners.add(fn); return () => listeners.delete(fn); },
        getSaveState: () => ({ ...saveState }),
    };
})();

// --- END OF FILE storage.js ---

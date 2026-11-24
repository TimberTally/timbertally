// storage.js: the pure merge helpers and entry checks behind the audit 2026-11-24 fixes.
// storage.js is loaded with no IndexedDB (so it runs in its localStorage mode) and a working
// in-memory localStorage; the merge functions themselves take plain key → JSON maps.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers/load.cjs');

function memoryStorage({ failOn = null } = {}) {
    const m = new Map();
    return {
        _m: m,
        failOn,
        get length() { return m.size; },
        key: i => [...m.keys()][i] ?? null,
        getItem: k => (m.has(k) ? m.get(k) : null),
        setItem(k, v) {
            if (this.failOn && this.failOn(k)) { const e = new Error('full'); e.name = 'QuotaExceededError'; throw e; }
            m.set(k, String(v));
        },
        removeItem: k => { m.delete(k); },
    };
}
function storeEnv(ls = memoryStorage()) {
    const env = load(['storage.js'], { localStorage: ls, alert: () => {} });
    return { ...env, ls };
}
const S = storeEnv();
const callStore = (env, fn, ...args) => {
    env.ctx.__a = JSON.parse(JSON.stringify(args));
    return JSON.parse(env.ev(`JSON.stringify(TTStore.${fn}(...__a))`));
};
const proj = (id, updatedAt, data, extra = {}) => ({ id, name: `P ${id}`, createdAt: 1, updatedAt, lastBackupAt: 0, data, plot: 1, areaIdx: 0, areaNotes: {}, areaRegen: {}, areaAcres: {}, recs: {}, ...extra });
const t = (id, plot = 1, extra = {}) => ({ id, plotNumber: plot, areaLetter: 'A', species: 'White Oak', dbh: '16', logs: '2', cutStatus: 'No', ugsStatus: 'No', notes: '', location: null, ...extra });

// ---- Audit #2: work saved while IndexedDB could not open ----
test('fallback merge: a newer localStorage project wins, the older IndexedDB copy is kept', () => {
    const idbP = proj('p1', 1000, [t(1)], { rev: 4 });
    const lsP = proj('p1', 2000, [t(1), t(2), t(3)], { rev: 5 });
    const idb = { 'tt3.p.p1': JSON.stringify(idbP), 'tt3.index': JSON.stringify({ currentId: 'p1', projects: { p1: { id: 'p1', name: 'P p1', updatedAt: 1000, treeCount: 1 } } }) };
    const local = { 'tt3.p.p1': JSON.stringify(lsP), 'tt3.index': idb['tt3.index'] };
    const r = callStore(S, 'mergeFallbackProjects', idb, local);
    assert.deepEqual(r.brought, ['p1']);
    assert.equal(r.older.length, 1);
    assert.equal(r.older[0].data.length, 1, 'older copy kept for a safety snapshot');
    const w = Object.fromEntries(r.writes);
    assert.equal(JSON.parse(w['tt3.p.p1']).data.length, 3, 'the 2 trees entered in the fallback session are brought in');
    assert.equal(JSON.parse(w['tt3.index']).projects.p1.treeCount, 3);
});

test('fallback merge: an older or identical localStorage copy changes nothing', () => {
    const idbP = proj('p1', 3000, [t(1), t(2)]);
    const older = proj('p1', 2000, [t(1)]);
    assert.deepEqual(callStore(S, 'mergeFallbackProjects', { 'tt3.p.p1': JSON.stringify(idbP) }, { 'tt3.p.p1': JSON.stringify(older) }).writes, []);
    assert.deepEqual(callStore(S, 'mergeFallbackProjects', { 'tt3.p.p1': JSON.stringify(idbP) }, { 'tt3.p.p1': JSON.stringify(idbP) }).writes, []);
});

test('fallback merge: a project made in the fallback session is added with its index line; fallback safety copies kept', () => {
    const idb = { 'tt3.index': JSON.stringify({ currentId: 'a', projects: { a: { id: 'a' } } }), 'tt3.p.a': JSON.stringify(proj('a', 5, [])), 'tt3.snaps': JSON.stringify([{ id: 's1' }]), 'tt3.snap.s1': '{}' };
    const local = {
        'tt3.index': JSON.stringify({ currentId: 'b', projects: { a: { id: 'a' }, b: { id: 'b' } } }),
        'tt3.p.b': JSON.stringify(proj('b', 9, [t(1)])),
        'tt3.snaps': JSON.stringify([{ id: 's1' }, { id: 's2' }]), 'tt3.snap.s2': JSON.stringify(proj('a', 4, [t(7)])),
    };
    const r = callStore(S, 'mergeFallbackProjects', idb, local);
    const w = Object.fromEntries(r.writes);
    assert.deepEqual(r.brought, ['b']);
    assert.ok(JSON.parse(w['tt3.index']).projects.b, 'new project listed');
    assert.ok(JSON.parse(w['tt3.index']).projects.a, 'existing project still listed');
    assert.ok(w['tt3.snap.s2'], 'safety copy from the fallback session kept');
    assert.deepEqual(JSON.parse(w['tt3.snaps']).map(s => s.id), ['s1', 's2']);
});

test('fallback mode marks the session dirty when a project is saved', async () => {
    const env = storeEnv();
    await env.ev('TTStore.ready');
    assert.equal(env.ev('TTStore.backend()'), 'localStorage');
    env.ev('TTStore.saveProject(TTStore.blankProject("X"))');
    assert.ok(env.ls.getItem('tt3.fallbackDirty'), 'tt3.fallbackDirty set');
});

// ---- Audit #3: two windows ----
test('two windows: nothing changed here → take the other window\'s save', () => {
    const local = proj('p', 1, [t(1)], { rev: 3 });
    const remote = proj('p', 2, [t(1), t(2)], { rev: 4 });
    const r = callStore(S, 'mergeConcurrent', local, remote, 3);
    assert.equal(r.save, false);
    assert.deepEqual(r.project.data.map(e => e.id), [1, 2]);
});

test('two windows: both saved from the same version → every tree from both is kept, and the result converges', () => {
    const base = 3;
    const a = proj('p', 10, [t(1), t(2)], { rev: 4 });   // window A added tree 2
    const b = proj('p', 11, [t(1), t(3)], { rev: 4 });   // window B added tree 3
    const inA = callStore(S, 'mergeConcurrent', a, b, base);
    const inB = callStore(S, 'mergeConcurrent', b, a, base);
    for (const r of [inA, inB]) {
        assert.equal(r.save, true);
        assert.deepEqual(r.project.data.map(e => e.id).sort(), [1, 2, 3]);
    }
    // Each window then saves its combined copy (rev 5, base 4); hearing the other's combined copy changes nothing more.
    const again = callStore(S, 'mergeConcurrent', { ...inA.project, rev: 5 }, { ...inB.project, rev: 5 }, 4);
    assert.equal(again.save, false);
    assert.deepEqual(again.project.data.map(e => e.id).sort(), [1, 2, 3]);
});

test('saveProject: a stored copy saved by another window after this one loaded keeps its trees', async () => {
    const env = storeEnv();
    await env.ev('TTStore.ready');
    env.ev('globalThis.__p = TTStore.blankProject("W"); __p.data = [{ id: 1, plotNumber: 1, areaLetter: "A", species: "White Oak", dbh: "16", logs: "2" }]; TTStore.saveProject(__p)');
    // Window B loads it, adds tree 2 and saves (rev goes up).
    env.ev('globalThis.__b = TTStore.getProject(__p.id); __b.data.push({ id: 2, plotNumber: 1, areaLetter: "A", species: "Red Oak", dbh: "14", logs: "1" }); TTStore.saveProject(__b)');
    // Window A, still on the old copy, adds tree 3 and saves.
    env.ev('__p.data.push({ id: 3, plotNumber: 2, areaLetter: "A", species: "Hickory", dbh: "12", logs: "1" }); TTStore.saveProject(__p)');
    const ids = JSON.parse(env.ev('JSON.stringify(TTStore.getProject(__p.id).data.map(e => e.id))')).sort();
    assert.deepEqual(ids, [1, 2, 3]);
});

// ---- Audit #9 ----
test('saveProject({ touch: false, ifChanged: true }) leaves updatedAt alone and skips an unchanged project', async () => {
    const env = storeEnv();
    await env.ev('TTStore.ready');
    env.ev('globalThis.__p = TTStore.blankProject("H"); __p.updatedAt = 1000; TTStore.saveProject(__p, { touch: false })');
    const before = env.ls.getItem(`tt3.p.${env.ev('__p.id')}`);
    env.ev('TTStore.saveProject(__p, { touch: false, ifChanged: true })');
    assert.equal(env.ls.getItem(`tt3.p.${env.ev('__p.id')}`), before, 'nothing written');
    env.ev('__p.plot = 4; TTStore.saveProject(__p, { touch: false, ifChanged: true })');
    assert.equal(env.ev('TTStore.getProject(__p.id).updatedAt'), 1000, 'updatedAt not bumped');
    assert.equal(env.ev('TTStore.getProject(__p.id).plot'), 4);
});

// ---- Audit #8 ----
test('snapshot waits for the save and resolves false when the copy could not be stored', async () => {
    const ls = memoryStorage();
    const env = storeEnv(ls);
    await env.ev('TTStore.ready');
    env.ev('globalThis.__p = TTStore.blankProject("S"); __p.data = [{ id: 1, plotNumber: 1, areaLetter: "A", species: "White Oak", dbh: "16", logs: "2" }]');
    assert.equal(await env.ev('TTStore.snapshot(__p, "ok")'), true);
    assert.equal(env.ev('TTStore.listSnapshots().length'), 1);
    ls.failOn = k => k.startsWith('tt3.snap');
    const r = env.ev('TTStore.snapshot(__p, "full")');
    assert.equal(typeof r.then, 'function', 'snapshot returns a promise');
    assert.equal(await r, false);
});

// ---- Audit #5: entries from backups / CSV are coerced ----
test('normalizeProject coerces entry fields (species text, DBH number, logs number or Cull, plot number, Area A-Z)', () => {
    const p = callStore(S, 'normalizeProject', proj('n', 1, [
        { id: 1, plotNumber: '3', areaLetter: 'b', species: 42, dbh: '16', logs: 'cull', cutStatus: 'yes', ugsStatus: 'x', notes: null, location: { lat: '37.5', lon: '-84.2' } },
        { id: 2, plotNumber: '<img>', areaLetter: '<img src=x onerror=alert(1)>', species: '<b>', dbh: 'abc', logs: '<i>', cutStatus: '<s>', ugsStatus: 'No', notes: 'ok', location: { lat: 'x', lon: 1 } },
        { id: { evil: 1 }, plotNumber: 2, areaLetter: 'A', species: { a: 1 }, dbh: 14, logs: 2, emptyPlot: 0 },
        null, 'junk',
    ], { recs: { A: [{ id: 7, title: 5, text: null }], '<x>': [{ id: 'z' }] } }));
    const [a, b, c] = p.data;
    assert.equal(p.data.length, 3);
    assert.deepEqual([a.plotNumber, a.areaLetter, a.species, a.dbh, a.logs, a.cutStatus, a.ugsStatus, a.notes], [3, 'B', '42', '16', 'Cull', 'Yes', 'No', '']);
    assert.deepEqual(a.location, { lat: 37.5, lon: -84.2 });
    assert.deepEqual([b.plotNumber, b.areaLetter, b.species, b.dbh, b.logs, b.cutStatus], [1, 'A', '<b>', '', '', 'No']);
    assert.equal(b.location, null);
    assert.deepEqual([c.species, c.dbh, c.logs, 'id' in c, 'emptyPlot' in c], ['', '14', '2', false, false]);
    assert.deepEqual(Object.keys(p.recs), ['A']);
    assert.deepEqual(p.recs.A[0], { id: '7', title: '', text: '' });
});

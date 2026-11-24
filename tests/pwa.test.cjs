// PWA / release guards: everything the app loads exists and is precached by the service worker.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, read, indexRefs, swCacheList, cacheVersion } = require('./helpers/pwa.cjs');

const refs = indexRefs();
const cache = swCacheList();
const cached = new Set(cache.map(u => u.replace(/^\.\//, '')));
const exists = f => fs.existsSync(path.join(ROOT, f));

test('index.html references files that exist', () => {
    const all = [...refs.scripts, ...refs.styles, ...refs.links];
    assert.ok(refs.scripts.length > 10, 'found the script tags');
    const missing = all.filter(f => !exists(f));
    assert.deepEqual(missing, []);
});

test('every file in the service worker cache list exists', () => {
    const missing = cache.filter(u => u !== './').map(u => u.replace(/^\.\//, '')).filter(f => !exists(f));
    assert.deepEqual(missing, []);
});

test('the cache list has no duplicates', () => {
    assert.equal(new Set(cache).size, cache.length);
});

test('every local script, style, icon and the manifest in index.html is precached', () => {
    const notCached = [...refs.scripts, ...refs.styles, ...refs.links].filter(f => !cached.has(f));
    assert.deepEqual(notCached, [], 'add these to urlsToCache in service-worker.js');
    assert.ok(cached.has('index.html') && cache.includes('./'));
});

test('manifest icons exist and are precached', () => {
    const m = JSON.parse(read('manifest.json'));
    for (const i of m.icons || []) {
        assert.ok(exists(i.src), `${i.src} exists`);
        assert.ok(cached.has(i.src), `${i.src} precached`);
    }
});

test('the cache version string is present', () => {
    const v = cacheVersion();
    assert.ok(v, 'CACHE_NAME found');
    assert.match(v, /['"]v\d+['"]/, 'CACHE_NAME ends in a quoted version such as \'v18\'');
});

// Audit 2026-11-24 #7 / #10: a failed precache must fail the install (so the old cache stays),
// and the page must not reload on the first install.
test('service worker install re-throws a failed cache.addAll; first install does not reload', () => {
    const sw = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
    const install = sw.slice(sw.indexOf("addEventListener('install'"), sw.indexOf("addEventListener('activate'"));
    assert.match(install, /\.catch\(error => \{[^}]*throw error;/s);
    const app = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
    assert.match(app, /const hadController = !!navigator\.serviceWorker\.controller;/);
    assert.match(app, /if \(!hadController \|\| refreshing\) return;/);
    assert.match(app, /if \(!registration\) return;/);
});

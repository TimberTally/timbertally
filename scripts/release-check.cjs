#!/usr/bin/env node
// npm run release-check
// Fails when an app file (anything the service worker precaches) differs from
// origin/main but service-worker.js's CACHE_NAME is the same as on origin/main:
// installed phones would keep the old files until the version is bumped.
// Compares the working tree (uncommitted changes included). Run `git fetch` first.
'use strict';
const { execFileSync } = require('node:child_process');
const { ROOT, swCacheList, cacheVersion } = require('../tests/helpers/pwa.cjs');

const BASE = process.env.RELEASE_BASE || 'origin/main';
const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

let baseSw;
try { baseSw = git('show', `${BASE}:service-worker.js`); } catch (e) {
    console.error(`release-check: cannot read ${BASE}:service-worker.js (run git fetch?)\n${e.stderr || e.message}`);
    process.exit(2);
}
const files = [...new Set(['service-worker.js', ...swCacheList().filter(u => u !== './').map(u => u.replace(/^\.\//, ''))])];
const changed = git('diff', '--name-only', BASE, '--', ...files).split('\n').map(s => s.trim()).filter(Boolean)
    .filter(f => f !== 'service-worker.js' || git('diff', BASE, '--', f).replace(/CACHE_NAME[^\n]*/g, '').trim() !== '');
// Untracked files that the cache lists (new app files not yet committed).
const untracked = git('ls-files', '--others', '--exclude-standard', '--', ...files).split('\n').filter(Boolean);
const all = [...new Set([...changed, ...untracked])];

const now = cacheVersion(), before = cacheVersion(baseSw);
console.log(`CACHE_NAME here: ${now}   on ${BASE}: ${before}`);
if (!all.length) { console.log('release-check: no app files differ from', BASE); process.exit(0); }
console.log(`App files that differ from ${BASE} (${all.length}):\n  ${all.join('\n  ')}`);
if (now === before) {
    console.error(`\nrelease-check FAILED: app files changed but CACHE_NAME was not bumped. Edit service-worker.js (e.g. 'v18' → 'v19').`);
    process.exit(1);
}
console.log('release-check OK: CACHE_NAME was bumped.');

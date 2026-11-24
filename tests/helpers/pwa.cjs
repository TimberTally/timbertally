// Reads index.html and service-worker.js for the PWA guard tests and release check.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..', '..');

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

/** Local files index.html loads: scripts, styles, icons, manifest. */
function indexRefs(html = read('index.html')) {
    const refs = { scripts: [], styles: [], links: [] };
    for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)) refs.scripts.push(m[1]);
    for (const m of html.matchAll(/<link\b[^>]*>/g)) {
        const href = /\bhref="([^"]+)"/.exec(m[0])?.[1];
        if (!href) continue;
        if (/rel="stylesheet"/.test(m[0])) refs.styles.push(href); else refs.links.push(href);
    }
    const local = u => !/^(https?:)?\/\//.test(u) && !u.startsWith('data:') && !u.startsWith('mailto:');
    for (const k of Object.keys(refs)) refs[k] = refs[k].filter(local).map(u => u.replace(/^\.\//, '').split(/[?#]/)[0]);
    return refs;
}

/** The service worker's precache list (as written, e.g. './index.html'). */
function swCacheList(sw = read('service-worker.js')) {
    const m = /urlsToCache\s*=\s*\[([\s\S]*?)\]/.exec(sw) || /\[\s*(['"]\.\/['"][\s\S]*?)\]/.exec(sw);
    if (!m) throw new Error('Could not find the cache list in service-worker.js');
    return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]);
}

/** e.g. "v18" from `const CACHE_NAME = CACHE_PREFIX + 'v18'`. */
function cacheVersion(sw = read('service-worker.js')) {
    const m = /const\s+CACHE_NAME\s*=\s*([^;\n]+)/.exec(sw);
    return m ? m[1].trim() : null;
}

module.exports = { ROOT, read, indexRefs, swCacheList, cacheVersion };

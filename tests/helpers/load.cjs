// Loads TimberTally's plain browser scripts into a Node `vm` context, the way the
// browser does: each file runs as a classic script in one shared global scope, so
// top-level `const`/`function` from forestry-data.js are visible to forestry-calc.js.
// Scripts that touch the DOM only at start-up (IIFEs that wait for DOMContentLoaded)
// get a tiny stub `document`, so their pure functions can be tested without a browser.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..', '..');

const CALC = ['forestry-data.js', 'forestry-calc.js', 'property.js'];

function stubDocument() {
    const noop = () => {};
    return {
        readyState: 'loading', // IIFEs wait for DOMContentLoaded, which never fires here
        addEventListener: noop, removeEventListener: noop,
        getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
        createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop, addEventListener: noop, classList: { add: noop, remove: noop, toggle: noop } }),
        body: { appendChild: noop },
    };
}

/** A context with the given scripts loaded (`extra` adds or replaces globals). `ev(expr)` evaluates in that scope. */
function load(files = CALC, extra = {}) {
    const ctx = {
        console, Math, Date, JSON, Promise, setTimeout, clearTimeout,
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, key: () => null, length: 0 },
        navigator: {},
    };
    ctx.window = ctx;
    ctx.globalThis = ctx;
    ctx.document = stubDocument();
    ctx.addEventListener = () => {};
    Object.assign(ctx, extra); // e.g. a working localStorage for storage.js
    vm.createContext(ctx);
    for (const f of files) {
        vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
    }
    const ev = expr => vm.runInContext(expr, ctx);
    // Values from the vm have the vm's Object prototype; round-trip through JSON for deepStrictEqual.
    const evj = expr => JSON.parse(vm.runInContext(`JSON.stringify(${expr})`, ctx));
    return { ctx, ev, evj, ROOT };
}

/** Runs `fn` (source text) inside the context with `args` bound as JSON. */
function call(env, fnName, ...args) {
    env.ctx.__args = JSON.parse(JSON.stringify(args));
    return JSON.parse(vm.runInContext(`JSON.stringify(${fnName}(...__args))`, env.ctx));
}

module.exports = { load, call, ROOT, CALC };

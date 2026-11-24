#!/usr/bin/env node
// Tiny static server for the repo root (what GitHub Pages serves), used by the e2e tests.
//   node scripts/serve.cjs [port]      (default 8110, or $PORT)
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2] || process.env.PORT || 8110);
const TYPES = {
    '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || /[\\/](node_modules|\.git)([\\/]|$)/.test(file)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, buf) => {
        if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(buf);
    });
}).listen(PORT, '127.0.0.1', () => console.log(`TimberTally at http://127.0.0.1:${PORT}/`));

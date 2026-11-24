// --- START OF FILE info.js ---
// ☰ Menu → Info / Contact: a short in-app guide (works offline), the contact address,
// and links to the full README, Reference Guide and Privacy Policy.
// Replaces opening the raw README.md, which shows as plain markdown text on GitHub Pages.

(function () {
    'use strict';

    const CONTACT = 'timbertallyapp@gmail.com';
    const README = 'https://github.com/timbertally/timbertally#readme';

    const html = `
    <div class="modal-content tt-info-modal">
        <button type="button" class="modal-close-btn" data-close title="Close">&#215;</button>
        <h2>About TimberTally</h2>
        <p>A free, offline timber cruise app. Collect plots on your phone with no signal, then save one ZIP with
        CSVs, printable summary pages, charts and stocking for every Area.</p>

        <h3>Contact</h3>
        <p>Questions, problems or ideas: <a href="mailto:${CONTACT}?subject=TimberTally">${CONTACT}</a></p>

        <h3>Getting started</h3>
        <ol>
            <li><b>☰ Menu → Settings:</b> choose the cruise method (prism BAF or fixed plot), log rule and form class, and
                Scroll Wheel or Tap Grid entry.</li>
            <li><b>Data tab:</b> set the Area and Plot, pick the species, DBH and logs, mark Cut / UGS, then
                <b>Submit</b>. A plot with no trees: <b>Record empty plot</b>.</li>
            <li><b>Tally tab:</b> per-acre numbers, the Gingrich stocking chart and stand charts as you go.</li>
            <li><b>Recs tab:</b> build each Area's management recommendations from the library and copy them.
                <b>☰ Menu → Standard Wording</b> rewrites the library in your own words.</li>
            <li><b>💾 Save ZIP</b> (top right): everything for the project in one file.</li>
        </ol>
        <p>New here? The <b>?</b> at the top (Help &amp; Tours) has a tour of each tab and the printable Quick Start sheet, and <b>Projects → Try the Sample
        Project</b> adds a made-up property to explore. A small <b>ⓘ</b> beside a term explains it.</p>

        <h3>Keep your data safe</h3>
        <p>Everything stays on this device; nothing is sent anywhere. Use <b>Projects → Save Backup</b> regularly
        (to Files, email or a cloud drive). The app reminds you after 7 days without a backup, and keeps safety copies
        for 7 days before anything is deleted or moved.</p>

        <h3>More</h3>
        <ul>
            <li><a href="./TimberTally-Quick-Start.pdf" target="_blank" rel="noopener">Quick Start sheet</a> (2 printable pages)</li>
            <li><a href="${README}" target="_blank" rel="noopener">Full guide (README)</a></li>
            <li><a href="./timbertally_reference.html" target="_blank" rel="noopener">Reference Guide</a>: calculations, CSV output and proof of work</li>
            <li><a href="./privacy.html" target="_blank" rel="noopener">Privacy Policy</a></li>
        </ul>
        <p class="tt-info-version" data-version></p>
        <div class="modal-actions"><button type="button" class="control-button btn-secondary" data-close>Close</button></div>
    </div>`;

    function addStyle() {
        if (document.getElementById('ttInfoStyle')) return;
        const s = document.createElement('style');
        s.id = 'ttInfoStyle';
        s.textContent = `
            .tt-info-modal { max-width: 560px; text-align: left; line-height: 1.45; }
            .tt-info-modal h2 { margin-top: 0; }
            .tt-info-modal h3 { margin: 1em 0 .3em; font-size: 1.05em; }
            .tt-info-modal ol, .tt-info-modal ul { padding-left: 1.3em; margin: .3em 0; }
            .tt-info-modal li { margin: .25em 0; }
            .tt-info-modal a { color: inherit; text-decoration: underline; }
            .tt-info-version { opacity: .65; font-size: .85em; margin-top: 1em; }
            .tt-info-modal .modal-actions { text-align: right; margin-top: .8em; }`;
        document.head.appendChild(s);
    }

    async function versionText() {
        try {
            const keys = await caches.keys();
            const k = keys.find(n => n.startsWith('timber-tally3-cache-'));
            return k ? `TimberTally 3 · ${k.replace('timber-tally3-cache-', '')}` : 'TimberTally 3';
        } catch (e) { return 'TimberTally 3'; }
    }

    function open() {
        addStyle();
        let ov = document.getElementById('ttInfoModal');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'ttInfoModal';
            ov.className = 'modal-overlay';
            ov.setAttribute('role', 'dialog');
            ov.setAttribute('aria-label', 'About TimberTally');
            ov.innerHTML = html;
            ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-close]')) close(); });
            document.body.appendChild(ov);
        }
        ov.style.display = 'flex';
        versionText().then(t => { const v = ov.querySelector('[data-version]'); if (v) v.textContent = t; });
        document.addEventListener('keydown', onKey);
        ov.querySelector('.modal-close-btn')?.focus();
    }
    function close() {
        const ov = document.getElementById('ttInfoModal');
        if (ov) ov.style.display = 'none';
        document.removeEventListener('keydown', onKey);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    window.TTInfo = { open, close };
})();

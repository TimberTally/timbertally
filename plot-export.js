// --- START OF FILE plot-export.js ---
// Plot locations as KML / GPX / GeoJSON (from ForestScribe's plot export): one point per plot
// of the open project that has GPS — the plot's own point (an empty-plot record) or else its
// first located tree — named "Area A Plot 3", with trees and BA/acre in the description.
// Projects tab → Plot Locations. Saved with the same share/download helper as backups.
(function () {
    'use strict';

    const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const okLoc = l => l && Number.isFinite(+l.lat) && Number.isFinite(+l.lon);

    /** One point per plot with GPS, sorted by Area then plot. */
    function plotPoints() {
        const app = window.TTApp;
        const data = app?.data?.() || [];
        const st = app?.settings?.() || {};
        const cruise = st.cruise;
        const fixed = cruise && typeof cruise === 'object' && cruise.method === 'fixed' && cruise.plotAcres > 0;
        const baf = Number(st.baf) || 10;
        const spec = fixed ? cruise : baf;
        const plots = new Map();
        for (const e of data) {
            if (!e || !/^[A-Z]$/.test(e.areaLetter || '')) continue;
            const key = `${e.areaLetter}-${parseInt(e.plotNumber, 10)}`;
            if (!plots.has(key)) plots.set(key, { area: e.areaLetter, plot: parseInt(e.plotNumber, 10) || 0, trees: 0, ba: 0, own: null, first: null });
            const p = plots.get(key);
            if (e.emptyPlot) { if (okLoc(e.location)) p.own = e.location; continue; }
            p.trees++;
            // Same BA rule as the Tally tab (forestry-calc.js): trees without a DBH add no BA.
            const d = parseFloat(e.dbh);
            if (Number.isFinite(d) && d > 0) p.ba += treeBaPerAcre(d, spec);
            if (!p.first && okLoc(e.location)) p.first = e.location;
        }
        const out = [];
        for (const p of plots.values()) {
            const loc = p.own || p.first;
            if (!loc) continue;
            const ba = Math.round(p.ba * 10) / 10;
            const how = fixed ? `${cruise.plotAcres} ac plot` : `BAF ${baf}`;
            out.push({
                label: `Area ${p.area} Plot ${p.plot}`,
                lat: +loc.lat, lng: +loc.lon,
                desc: `${p.trees} tree${p.trees === 1 ? '' : 's'} · BA ${ba} ft²/ac (${how})`,
                props: { area: p.area, plot: p.plot, trees: p.trees, ba_per_acre: ba, cruise: how },
            });
        }
        return out.sort((x, y) => x.label.localeCompare(y.label, undefined, { numeric: true }));
    }

    function plotsKml(points, name) {
        const placemarks = points.map(p => `
      <Placemark>
        <name>${xmlEsc(p.label)}</name>
        <description>${xmlEsc(p.desc)}</description>
        <styleUrl>#plotPoint</styleUrl>
        <Point><coordinates>${p.lng},${p.lat},0</coordinates></Point>
      </Placemark>`).join('');
        return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${xmlEsc(name)} — TimberTally plots</name>
    <Style id="plotPoint"><IconStyle><color>ff1b4e1f</color><scale>1.0</scale></IconStyle></Style>${placemarks}
  </Document>
</kml>
`;
    }
    function plotsGpx(points) {
        const wpts = points.map(p => `  <wpt lat="${p.lat}" lon="${p.lng}"><name>${xmlEsc(p.label)}</name><desc>${xmlEsc(p.desc)}</desc></wpt>`).join('\n');
        return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TimberTally" xmlns="http://www.topografix.com/GPX/1/1">
${wpts}
</gpx>
`;
    }
    function plotsGeoJson(points) {
        return {
            type: 'FeatureCollection',
            features: points.map(p => ({
                type: 'Feature',
                properties: { name: p.label, description: p.desc, ...p.props },
                geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
            })),
        };
    }

    /** Small "Save these plot locations as:" dialog. Resolves 'kml' | 'gpx' | 'geojson' | null. */
    function choose() {
        return new Promise(resolve => {
            const m = document.createElement('div');
            m.className = 'modal-overlay';
            m.setAttribute('role', 'dialog');
            m.setAttribute('aria-label', 'Export Plots');
            m.innerHTML = `<div class="modal-content" style="max-width:380px;">
                <button type="button" class="modal-close-btn" data-v="" title="Close">&#215;</button>
                <h2>Export Plots</h2>
                <p class="notes-hint">Save these plot locations as:</p>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    <button type="button" class="control-button btn-success" data-v="kml">KML — Google Earth, onX</button>
                    <button type="button" class="control-button btn-info" data-v="gpx">GPX — GPS units, Avenza, Gaia</button>
                    <button type="button" class="control-button btn-info" data-v="geojson">GeoJSON — ArcGIS, QGIS, Field Maps</button>
                    <button type="button" class="control-button btn-secondary" data-v="">Cancel</button>
                </div></div>`;
            const done = v => { m.remove(); document.removeEventListener('keydown', onKey); resolve(v || null); };
            const onKey = e => { if (e.key === 'Escape') done(null); };
            m.addEventListener('click', e => {
                if (e.target === m) return done(null);
                const b = e.target.closest('[data-v]');
                if (b) done(b.dataset.v);
            });
            document.addEventListener('keydown', onKey);
            document.body.appendChild(m);
        });
    }

    const safeName = s => String(s || 'Project').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_') || 'Project';
    const stamp = () => { const d = new Date(), z = n => String(n).padStart(2, '0'); return `${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}`; };

    async function exportPlots() {
        const fb = document.getElementById('plotExportFeedback');
        let t = null;
        const say = (msg, err) => {
            if (!fb) return;
            clearTimeout(t);
            fb.textContent = msg; fb.className = 'feedback-message' + (err ? ' error' : ''); fb.style.display = 'block';
            void fb.offsetWidth; fb.style.opacity = 1;
            t = setTimeout(() => { fb.style.opacity = 0; setTimeout(() => { fb.style.display = 'none'; }, 500); }, 5000);
        };
        const points = plotPoints();
        if (!points.length) { say('No plots in this project have a GPS location yet. Use the GPS button on the Data tab.', true); return; }
        const fmt = await choose();
        if (!fmt) return;
        const name = window.TTApp?.project?.()?.name || 'Project';
        const base = `${safeName(name)}_Plots_${stamp()}`;
        let blob, file, types;
        if (fmt === 'kml') { blob = new Blob([plotsKml(points, name)], { type: 'application/vnd.google-earth.kml+xml' }); file = `${base}.kml`; types = { description: 'KML', accept: { 'application/vnd.google-earth.kml+xml': ['.kml'] } }; }
        else if (fmt === 'gpx') { blob = new Blob([plotsGpx(points)], { type: 'application/gpx+xml' }); file = `${base}.gpx`; types = { description: 'GPX', accept: { 'application/gpx+xml': ['.gpx'] } }; }
        else { blob = new Blob([JSON.stringify(plotsGeoJson(points), null, 2)], { type: 'application/geo+json' }); file = `${base}.geojson`; types = { description: 'GeoJSON', accept: { 'application/geo+json': ['.geojson'] } }; }
        try {
            const r = await window.TTStore.saveFile(blob, file, types);
            if (r !== 'cancelled') say(`Exported ${points.length} plot location${points.length === 1 ? '' : 's'} as ${fmt === 'geojson' ? 'GeoJSON' : fmt.toUpperCase()}.`);
        } catch (e) { say(`Could not save: ${e.message}`, true); }
    }

    function init() {
        const backup = document.getElementById('backupStatus')?.closest('.input-section');
        if (!backup || document.getElementById('plotExportBtn')) return;
        const sec = document.createElement('div');
        sec.className = 'input-section';
        sec.innerHTML = `<h2>Plot Locations</h2>
            <p class="notes-hint">Every plot of the open project that has GPS, as one point named "Area A Plot 3" (trees and BA/acre in the description). Open it in Google Earth, onX, Avenza, a GPS unit or ArcGIS.</p>
            <div class="project-actions">
                <button type="button" id="plotExportBtn" class="control-button btn-info">&#128205; Export Plot Locations</button>
            </div>
            <div id="plotExportFeedback" class="feedback-message" style="margin-top:8px;"></div>`;
        backup.after(sec);
        document.getElementById('plotExportBtn').addEventListener('click', exportPlots);
    }
    if (document.readyState === 'complete') init(); else document.addEventListener('DOMContentLoaded', init);

    window.TTPlotExport = { plotPoints, plotsKml, plotsGpx, plotsGeoJson, exportPlots };
})();
// --- END OF FILE plot-export.js ---

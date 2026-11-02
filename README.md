# TimberTally

![TimberTally Tree Icon](icon.png)

A Progressive Web App (PWA) designed for simple and efficient offline-first collection of timber inventory data. Record plot number, area letter, tree species, DBH, log count, cut/UGS status, optional notes, and GPS location directly in the field — then export comprehensive CSV reports and publication-quality graphs when you're back at the desk.

*Contact: timbertallyapp@gmail.com*

## Understanding the App

*   [TimberTally Reference Guide](https://timbertally.github.io/TimberTally/timbertally_reference.html) — Calculations explained, CSV output guide, and proof of work in one tabbed document.
*   [Privacy Policy](https://timbertally.github.io/TimberTally/privacy.html)

---

## Features

### Offline-First PWA
Uses a Service Worker to cache all application files after the first load, allowing the app to run fully without network access. Includes automatic update detection with a prompted in-app update notification.

### Data Entry (Data Tab)
The field entry form from ForestScribe, built for one-handed use:

*   **Area / Plot #** — joined -/+ steppers side by side (Area A–Z, Plot 1–999). Swipe left or right across them to change plots. The Plot # label shows how many trees are already in the current plot, and the Plots Needed estimate sits just below.
*   **Species** — the 8 species you use most appear as quick-pick buttons (2 rows of 4, refreshed every 10 entries; long names are shortened to fit, e.g. Northern Red Oak to N. Red Oak). Common hardwoods fill the first row until you have your own. The full list is in the dropdown below, which starts blank so a tree is never saved as the wrong species by accident.
*   **DBH / Logs** — scroll wheels (4 to 40 in. DBH; 0.5 to 6 logs or Cull). The wheel follows your finger, stops when your finger stops, and a flick coasts a short way; tap a row to pick it, or use a mouse wheel on a computer. Trees 10 in. and under are always 0 logs.
*   **Cut / UGS** — toggle chips (UGS = Unacceptable Growing Stock; default AGS).
*   **Tool buttons** — GPS (saves the location with the next tree), Compass, and Notes (opens a note box for this tree; a dot shows when a note is written).
*   **Submit Entry** — stays pinned to the bottom of the screen while you scroll.
*   **Record empty plot** — when the current plot has no trees, a link under Submit records it as an empty plot so it still counts toward the number of plots (otherwise per-acre values come out too high). Empty plots export as an EMPTY PLOT row in the CSV and load back the same way.
*   **Edit an entry** — tap any row in Recent Entries to change its area, plot, species, DBH, logs, Cut/UGS or notes, or delete it.
*   **Borderline trees** — the line under the wheels shows the limiting distance for the DBH on the wheel at the current BAF; tap it to check a measured distance (IN / OUT) and see a quick table.
*   **GPS** — the GPS button averages several readings for a steadier point, shows the accuracy as it improves, and warns when it is weak (worse than 15 m). If location access is already allowed, each plot's 3rd tree gets a location automatically.
*   **Field-proofing** — pinch and double-tap zoom are off, the installed app stays in portrait, and a double tap on Submit saves the tree only once.

### Plots Needed Display
Estimates plots required for the current Area to reach 10%, 20% and 30% precision, calculated from the Coefficient of Variation across plots within that Area (t=2). Shown under the Area / Plot counters on the Data tab. Requires at least 2 plots in the current Area.

### Saving, Backup & Safety Copies
TimberTally 3 saves like ForestScribe:

*   **Live projects** — the open project is the saved copy. Every tree, edit, plot move, stand note and recommendation is written to it immediately, and again when the screen locks or you switch apps. On restart the app opens the same project at the same plot and area. There is no "recover unsaved data?" prompt, and nothing is ever deleted at startup.
*   **Honest save status** — the header shows the time of the last save. If a save fails (for example, device storage is full) a red bar appears on every screen size explaining what to do, and the header shows "⚠ Not saved".
*   **Safety copies** — a full copy of the project is kept automatically before Delete All Data, deleting selected entries, deleting a project, clearing stand notes, or adding a CSV. Copies are listed on the Projects tab for 7 days, and restoring one adds it as a new project.
*   **Backup files** — **Save Backup** writes one `.json` file with every project, your species list and plan details (phones open the share sheet so it can go to Files, email or a cloud drive). **Restore Backup** only adds: projects already on the device are skipped, and a project that differs is added as a "(restored)" copy. Nothing on the device is replaced.
*   **Backup reminder** — a banner appears when changes have gone 7 days without a backup (tap Later to snooze for a day).
*   **Storage protection** — the app asks the browser to keep its storage rather than clear it to free space. The Projects tab shows whether that was granted and how much space is used.
*   **Separate from TimberTally 2** — TimberTally 3 keeps its own storage. On first run it copies in TimberTally 2's saved projects, working data (as the open project), stand notes, settings and species list. TimberTally 2's data is left in place.

### Forestry Settings
Accessed via the ⚙ Settings button in the header (collapses/expands; sticks to the top of the screen alongside the header). Settings are saved locally and persist between sessions:

*   **BAF** — Basal Area Factor (5, 10, 20, 30, 40).
*   **Log Rule** — Doyle, Scribner, or International ¼".
*   **Form Class** — Doyle only (70–86 in even steps; hidden for other rules).
*   **Export Graphs** — Enable or disable PNG graph generation on CSV export.
*   **Save as ZIP** — Bundle all CSVs, graphs, and stand notes into a single `.zip` download instead of individual files. Especially useful on iPhone where multiple file saves require individual confirmation.
*   **Dark Mode** — Off, On, or System (follows device preference).

Additional buttons in Settings: **Check Updates**, **Install App** (PWA install prompt, shown when available), **Tree ID Key**, and **ℹ Info** (opens the README).

### Dark Mode
Full dark mode with a forest-green palette. Toggled via Settings or automatically matched to system preference. All UI elements, tables, dropdowns, and backgrounds are fully themed — alternating table rows use distinct shades of dark green rather than white, keeping all text readable.

### Projects Tab
*   **Open Project** — the name of the project you are working in (edit it to rename). Below it: trees, plots and the last backup date.
*   **Switch to Another Project** — opens another project. The one you leave is already saved.
*   **+ New Project / Copy / Delete Project** — start a fresh cruise, save a copy of the open one, or delete it (a safety copy is kept for 7 days).
*   **Backup & Restore** and **Safety Copies** — see Saving, Backup & Safety Copies above.
*   **Import CSV** — choose or drag a `.csv` file to add its trees to the open project. Prompts for an Area Letter (A–Z) to assign to all imported entries. Plot numbers are renumbered if the chosen area already contains data.

### Species Tab
Manage the species list used across all dropdowns:

*   **Add Species** — Type a name and click "+ Add" to add a new species.
*   **Remove Species** — A scrollable multi-select list lets you select one or more species to remove.

### Notes Tab
Stand-level notes for the open project (observations, site conditions, ownership info, compass bearings, GPS waypoints). Notes save with the project as you type. On CSV export, notes are included as a separate `.txt` file alongside the CSV.

### Tally Tab
On-screen summary of all collected data, filterable by Area:

*   **Summary Cards** — Key metrics at a glance: Trees/Acre, BA/Acre, Avg DBH (QMD), Vol/Acre, number of plots, and total tree entries.
*   **Tree Tally** — Full breakdown by Species → DBH → Logs → Cut status.
*   **Stand Charts** — Three live Chart.js charts rendered in-app: Basal Area Distribution (by DBH class, cut/leave), Trees Per Acre Distribution (by DBH class, cut/leave), and Volume by Species (horizontal bar, board feet/acre).

### Stocking Tab
Plots stand data on the **Gingrich (1967) stocking chart** for upland hardwoods. Axes are Trees Per Acre (TPA) on the X-axis and Basal Area per Acre (sq ft) on the Y-axis, with interpolated A-line and B-line stocking curves. Each area is plotted as three points (Total, Cut, Leave) color-coded by area letter, with the area letter labeled inside each point. A stats table above the chart shows TPA and BA/Acre for Total, Cut, and Leave by area.

### Recs Tab (Recommendation Builder)
A simple way to write the management recommendations for each Area, using the standard recommendation library from ForestScribe (48 recommendations in 9 categories: TSI, harvest & regeneration, invasive species, wildlife, pests & storm damage, and more).

*   **Area** — recommendations are kept separately for each Area letter (defaults to the Area you are collecting on the Data tab).
*   **Library buttons** — tap a category to open it, then tap a recommendation to add it (tap again to remove). Hover a button to see its text. Some recommendations ask for a detail when added (e.g. which invasive species); anything left blank becomes a write-in line.
*   **Plan Details** — optional state, organization, county and phone numbers. These pick the right state wording (Kentucky vs. other states) and fill in names and numbers.
*   **Edit** — change any wording, reorder with ↑/↓, remove, or add your own custom recommendation. Markup: `**bold**`, `__underline__`, a line starting with `• ` is a bullet, blank line = new paragraph.
*   **Preview** — the finished, numbered recommendations. **Copy Recommendations** copies formatted text (bold, bullets and tables survive a paste into Word or Google Docs), with an option to include titles.

Recommendations are saved with the open project (and in backup files); they are not included in CSV exports.

---

## CSV Export & Graph Output

Click **💾 Save CSV** (or **💾 Save CSV & Graphs** / **💾 Save ZIP** depending on settings) to export. All calculations use the currently selected Settings (BAF, Log Rule, Form Class).

### Per-Area CSV Files
One CSV is generated per Area Letter present in the data, named:
```
ProjectName_AreaX_RuleFC_BAF_Timestamp.csv
```
Each CSV contains four sections:

1.  **Raw Data** — All entries for that area: Plot#, Area, DBH, Species, Logs, Cut, UGS, Notes, Latitude, Longitude.
2.  **Tally Summary** — Tree counts grouped by Species, DBH, Logs, and Cut status.
3.  **Per-Plot Volume & Statistics** — Volume (BF/Acre) per plot, plus Mean, Variance, Std Dev, and CV across plots within the area.
4.  **Forestry Report** — Full stand tables including overall summary (Vol/Acre, TPA, BA/Acre, QMD for Total/Cut/Leave), Stand Distribution by DBH size class, Species Composition by TPA percentage, and Volume by Species (Small/Medium/Large Sawtimber BF/Acre).

### Stand Notes Export
If any stand notes have been entered, they are exported as a separate `.txt` file alongside the CSV(s):
```
ProjectName_StandNotes_Timestamp.txt
```

### Optional Graph PNGs (when Export Graphs = Yes)
Six PNG files are generated per area export:

1.  **BA_Dist** — Basal Area Distribution by DBH class (Cut/Leave stacked bar).
2.  **TPA_Dist** — Trees Per Acre Distribution by DBH class (Cut/Leave stacked bar).
3.  **Vol_Species** — Volume by Species (horizontal bar, BF/Acre).
4.  **Vol_Sawtimber** — Sawtimber Volume by Species, broken down by Small/Medium/Large size class.
5.  **Gingrich_Stocking** — Gingrich stocking chart (1200×700px) plotting all areas on the TPA vs. BA/Acre chart with A-line and B-line curves.
6.  **Summary_Report** — A landscape one-page summary PNG (4200×2700px, ~300 DPI equivalent) containing all key stand metrics, distribution tables, species summaries, and plot statistics.

### ZIP Export (Save as ZIP = Yes)
When enabled, all CSVs, PNGs, and the stand notes `.txt` are bundled into a single `.zip` file named:
```
ProjectName_Timestamp.zip
```
This is the recommended mode for iPhone users, as iOS requires individual save confirmation for each file download.

---

## How to Use

1.  **Open the App** in a modern browser (Chrome, Firefox, Edge, Safari) on desktop or mobile. After the first load, the app works fully offline.
2.  **Install (Optional)** — On supported browsers, accept the install prompt or use the "Install App" button in Settings for a native-like home screen experience.
3.  **Recover Data (If Prompted)** — If unsaved data from a previous session is found, confirm to restore it.
4.  **Configure Settings** — Click ⚙ Settings to set BAF, Log Rule, Form Class, Graph export, ZIP export, and Dark Mode preferences. Collapse when done.
5.  **Set Plot # and Area** — Use the +/− buttons on the Data tab to set your current plot number and area letter. Reference the "Plots Needed" display beside the Notes field for sampling guidance.
6.  **Enter Tree Data** — Select Species, DBH, and Logs. Check Cut and/or UGS if applicable. Optionally tap GPS to record coordinates or add a per-tree note. Click **✔ Submit Entry**.
7.  **Manage Species** — Use the Species tab to add or remove species from the dropdown.
8.  **Manage Projects** — Use the Projects tab to save, load, or delete named projects. Load external CSV files via the file picker or by dragging and dropping a `.csv` directly onto the drop zone.
9.  **Add Stand Notes** — Use the Notes tab for cruise-level observations. Notes save automatically and export as a `.txt` file.
10. **Review Data** — Use the Tally tab to view summary cards, species/DBH breakdowns, and live charts. Use the Area dropdown to filter by area.
11. **Check Stocking** — Use the Stocking tab to plot your stand(s) on the Gingrich chart. Click "Calculate & Plot Stocking."
12. **Use the Compass** — Click 🧭 Compass (above the Recent Entries table on the Data tab) to open the on-screen compass. Grant orientation permission if prompted.
13. **Delete Entries** — Check entries in the Recent Entries table and click 🗑 Delete. Use ⚠ Delete All Data (with confirmation) to clear everything.
14. **Export** — Click **💾 Save CSV** to download output for all areas. With ZIP mode enabled, everything downloads as a single file.

---

## Technical Details

*   Built with vanilla HTML, CSS, and JavaScript — no frameworks or build tools.
*   **PWA** via Service Worker for full offline support and in-app update notifications.
*   **localStorage** keys used:
    *   `timberTallyTempSession` — autosave / session recovery.
    *   `timberTallyCustomSpecies` — custom species list.
    *   `timberTallyProjects` — named saved projects.
    *   `timberTallySettings` — BAF, log rule, form class, graph preference, ZIP preference, dark mode.
    *   `timberTallyStandNotes` — persistent stand-level notes.
*   **Chart.js** (`v4.4.1` via CDN) — used for in-app tally charts, the Gingrich stocking chart, and all export graph PNGs.
*   **JSZip** (`v3.10.1` via CDN) — used for ZIP bundle export when Save as ZIP is enabled.
*   **Volume calculations** — Doyle (FC70–86, scaled from embedded FC78 table), Scribner, and International ¼" log rules. Trees <10" DBH return 0 board feet (below sawtimber threshold).
*   **Gingrich stocking chart** — TPA (x-axis) vs. BA/Acre (y-axis) with A-line and B-line curves interpolated from published Gingrich (1967) data points. Area points plotted as circle (Total), triangle (Cut), and square (Leave) with area letters labeled inside.
*   **Summary Report PNG** — drawn entirely via the HTML5 Canvas 2D API (no Chart.js) at 3× logical resolution (4200×2700px physical) for print-quality output at 100% zoom.
*   **Device APIs used** — Geolocation API (GPS), Device Orientation API (compass), beforeinstallprompt (PWA install).
*   **Sticky header** — The app header and collapsible settings panel are wrapped in a single sticky block; the tab bar sticks directly below it with no gap. Height is measured dynamically via JavaScript on load, resize, and settings toggle.
*   **Pull-to-refresh suppressed** — `overscroll-behavior: none` is applied to both `html` and `body` to prevent the Android Chrome pull-to-refresh indicator from appearing during normal scrolling.

---

## Files

| File | Purpose |
|---|---|
| `index.html` | App structure and all UI markup |
| `style.css` | Stylesheet — light and dark mode, responsive layout |
| `script.js` | All app logic — data entry, settings, projects, export, compass, etc. |
| `forestry-calc.js` | Forestry calculation functions (TPA, BA, volume, stocking, tally) |
| `forestry-data.js` | Static lookup tables — Doyle/Scribner/International volume tables, Gingrich curves, default species list |
| `charts.js` | Chart.js chart builders — in-app tally charts, stocking chart, export graph generators, summary report canvas |
| `manifest.json` | Web App Manifest for PWA install and theming |
| `service-worker.js` | Caching and offline support |
| `icon.png` | App icon |
| `README.md` | This file |
| `timbertally_reference.html` | Reference guide — calculations, CSV output, and proof of work |
| `privacy.html` | Privacy policy |

---

## Notes

*   All data stored in `localStorage`. Clearing browser site data will erase saved projects, species, settings, and notes. Exporting CSV files is the primary way to permanently preserve collected data.
*   GPS accuracy depends on device hardware and environmental conditions.
*   Compass accuracy depends on device sensors and calibration. Keep the device away from metal objects. The heading source type (absolute, webkit, alpha) is indicated in the compass display.
*   Graph export and ZIP export both require CDN libraries (Chart.js and JSZip). Internet access may be needed on first use if these are not already cached by the service worker.
*   The Summary Report PNG is generated at 4200×2700px (3× scale) for crisp printing and screen viewing without zoom. File size is typically 4–6 MB.
*   iPhone users: enable **Save as ZIP** in Settings to receive all output files as a single download, avoiding the individual save confirmation prompt for each file.

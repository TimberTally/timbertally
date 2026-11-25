# Testing TimberTally

TimberTally has no build step: GitHub Pages serves the repo root as-is. `package.json` holds
development tools only (oxlint, Playwright); nothing in it ships with the app.

## Setup (once)

```
npm install
npx playwright install chromium webkit
git config core.hooksPath .githooks      # pre-push hook runs `npm run check`
```

Node 20 or newer.

## Commands

| Command | What it does |
|---|---|
| `npm run lint` | oxlint over the app scripts, tests and tools (`.oxlintrc.json`) |
| `npm test` | Unit tests with `node:test` (`tests/*.test.cjs`), well under a second |
| `npm run test:e2e` | Browser tests with Playwright (`e2e/*.spec.cjs`), about a minute |
| `npm run check` | All three: what the pre-push hook and CI run |
| `npm run release-check` | Fails if app files differ from `origin/main` but `CACHE_NAME` was not bumped (run `git fetch` first) |
| `npm run update-golden` | Rewrites the golden numbers (only for an intended calculation change, see below) |
| `npm run serve` | Serves the repo root at http://127.0.0.1:8110/ (`node scripts/serve.cjs 8123` for another port) |

Run one browser test: `npx playwright test -c playwright.config.cjs -g "Save ZIP" --project=chromium-phone`.
Failed tests keep a trace: `npx playwright show-trace test-results/<test>/trace.zip`.

## Lint

The app's scripts share one global scope across `<script>` tags (e.g. `calculateForestryReport` from
`forestry-calc.js` is used in `script.js` and `charts.js`; `TTStore`, `TTApp`, `Chart`, `JSZip`). Those
names are listed under `globals` in `.oxlintrc.json`, and `no-unused-vars` ignores them (they are
used from other files). If you add a new shared top-level function or `window.TTSomething`, add it to
`globals` and to the `varsIgnorePattern` list, or lint reports `no-undef`.

`no-undef`, unreachable code, duplicate keys/cases and the other correctness rules are errors;
unused variables are warnings.

## Unit tests (`tests/`)

The plain browser scripts are loaded into a Node `vm` context (`tests/helpers/load.cjs`), as the
browser would load them; IIFE modules get a stub `document` so their pure functions can be called.

| File | Covers |
|---|---|
| `calc.test.cjs` | All-Areas plots keyed by Area + plot number (report and plot stats); summary BA = Stand Distribution TOTALS with invalid trees; `plotsNeeded`; every DBH × offered logs choice has volume > 0 in all three rules; `csvCell`; Doyle / Scribner / International FC78 table values; half-log flooring; Cull and small trees = 0 BF; Doyle form class scaling (FC 80, 70, invalid → 78); BAF expansion of one 12" tree at BAF 10 (12.7328 TPA, 10 sq ft BA); 1/5-ac fixed plot (5 TPA per tree); empty plots counted as plots; mean / SD / CV / sampling error and plots needed for ±10/15/20 % against hand math; empty plots as 0-volume plots in the stats; Gingrich stocking of 100 TPA × 12" (65.5 %, fully stocked); stand & stock totals = area summary; property summary acre-weighting; stratified sampling error |
| `data-tools.test.cjs` | Check Data (beyond-the-table warning for Doyle, Scribner and International): gap in plot numbers, empty plots, duplicate within 3 s (and not at 5 s or < 300 ms), logs on a tree ≤ 10", logs beyond the table. CSV: quotes, commas and doubled quotes in notes, BOM, CRLF, line breaks in quotes, stop at `---`, column guessing, EMPTY PLOT rows, feet / half-log conversion. Species codes (802 / WO → White Oak, 693 → Black Gum). Glossary terms |
| `golden.test.cjs` | The full summary of the sample project (every Area and All Areas; Doyle 78, Doyle 74, Scribner, International; BAF 10 and 1/5-ac plots; plot stats, stand & stock totals, property summary, stocking) against `tests/fixtures/sample-golden.json`; and that `tour.js` still makes the same sample trees as `tests/fixtures/sample-entries.json` |
| `storage.test.cjs` | `storage.js` in its localStorage mode: work saved while IndexedDB couldn't open is brought in (newer wins, older kept for a safety copy, new projects and fallback safety copies added); two windows' concurrent saves keep every tree and converge; a save over a newer stored copy keeps the other window's trees; the hide save doesn't bump `updatedAt` or rewrite an unchanged project; `snapshot` resolves false when the copy can't be stored; `normalizeProject` coerces entry fields and recommendations |
| `pwa.test.cjs` | Every file index.html loads (scripts, styles, icons, manifest) and every file in the service worker's cache list exists; every local script / style / icon in index.html is precached; manifest icons precached; no duplicate cache entries; `CACHE_NAME` present; the install re-throws a failed precache; no reload on first install |

### Updating the golden numbers

A golden-test failure means a calculation result changed. If the change is **intended**:

1. `npm run update-golden` (add `-- --sample` if the sample project in `tour.js` changed on purpose).
2. Review `git diff tests/fixtures/sample-golden.json`: only the numbers you meant to change should move.
3. Commit the fixture with the calculation change, and say why in the commit message.

If the change was not intended, the diff shows which numbers moved; fix the code instead.

## Browser tests (`e2e/`)

`playwright.config.cjs` starts `scripts/serve.cjs` on port 8117 (`E2E_PORT` to change) and runs every
test in three projects: **chromium-phone** (375×812, touch), **chromium-desktop** (1280×900) and
**webkit-phone** (iPhones run WebKit). Each test has fresh storage, waits for `TTStore.ready`, and fails
on any console error or uncaught exception. The service worker is blocked in tests (it would cache
files between reloads), so its "SW registration failed" message is ignored and a test fetches the
service worker file instead.

| File | Covers |
|---|---|
| `app.spec.cjs` | Welcome card on first run (and not again); Try the Sample Project → 2 Areas; a tree added with the wheels and one with Tap Grid survive a reload (IndexedDB); tt3 data in localStorage is copied into IndexedDB on first load; the fixed-plot setting changes the Tally numbers; the Enough plots line opens and closes; Check Data finds an injected duplicate; every ☰ Menu item opens; service worker and manifest are fetchable |
| `audit.spec.cjs` | Fixes from `docs/AUDIT-2026-11-24.md`: hostile `<img onerror>` strings from a CSV import, Match Columns and a restored backup never run on any tab, Check Data, menu or Standard Wording; two windows on one project (BroadcastChannel, and the `storage`-event fallback) never lose a tree; Area CSV → Import / Match Columns / Merge round-trip with quotes, commas, line breaks, formula-looking text and GPS; logs choices per DBH (wheel and Tap Grid) and clamping; pagehide doesn't mark the project changed; the Merge summary shows in the Merge section ("plot 10"), with no alert box |
| `files.spec.cjs` | Save ZIP has exactly the expected files (per Area CSV, stand & stock CSV, Summary Report, Graphs; Property Summary, stocking chart, Area notes), read with the page's JSZip; Save Backup has every project and the Standard Wording; Restore Backup adds and skips identical projects; a Standard Wording edit is used by a newly added recommendation; each tour (Data, Projects, Tally, Recs, Settings) runs to Done, and every target its steps name is in the page |

`TTStore.saveFile` is stubbed in the file tests, so nothing is downloaded or shared.

## CI

`.github/workflows/check.yml` runs on every push and pull request: `npm ci`, lint, unit tests,
`npx playwright install --with-deps chromium webkit`, browser tests (report uploaded on failure).
On pull requests into `main` it also runs the release check.

## Release checklist

1. **Bump the cache version** in `service-worker.js`: `CACHE_NAME = CACHE_PREFIX + 'v19'` (one more than
   the last release). Without it, installed phones keep the old files.
2. New app file? Add it to `urlsToCache` in `service-worker.js` (the PWA test fails otherwise).
3. `git fetch && npm run release-check` and `npm run check`, both green.
4. Merge to `main` (GitHub Pages deploys in a minute or two).
5. **Phone tests** on a real iPhone (Safari) **and** an Android phone (Chrome), on the live site:
   1. **Install**: ☰ Menu → Install App (iPhone: Share → Add to Home Screen); open from the home-screen icon.
   2. **Existing projects first**: on a phone that already had TimberTally, open the app and check the
      update prompt appears and, after updating, every existing project is still there with its trees,
      Area notes and recommendations (Projects tab), before adding anything.
   3. **Offline**: turn on airplane mode, close the app fully and reopen it from the icon. It must
      open. Add a few trees (wheels and Tap Grid), record an empty plot, close and reopen: still there.
   4. **Save ZIP** (still offline is fine): the share sheet / save opens; the ZIP opens on a computer
      with the CSVs, Summary Report, Graphs, stocking chart and Area notes.
   5. **Backup / restore**: Save Backup to Files / Drive; on a second device (or after deleting a
      test project) Restore Backup adds the projects and the Standard Wording, replacing nothing.
   6. Help → each tour runs to the end; Tally tab numbers look right for the sample project.

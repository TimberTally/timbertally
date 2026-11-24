// --- START OF FILE glossary.js ---
// Plain-English meanings for the forestry terms on the screens, shown by the
// small ⓘ next to each one (ported from ForestScribe's src/lib/glossary.ts).
// Any <button class="term-info" data-term="key"> opens its meaning in a small
// popover; a tap outside it or Esc closes it. window.ttTermBtn(key) returns
// the button's HTML for screens drawn in script.js.

(function () {
    'use strict';

    const GLOSSARY = {
        dbh: ['DBH', 'Diameter at breast height: the trunk’s width in inches, measured 4.5 ft above the ground on the uphill side.'],
        logs: ['Logs', 'How many 16-ft logs of sawtimber the trunk holds, up to where it gets too small, forked or crooked to saw. Trees 10" and under are 0 logs.'],
        ugs: ['UGS', 'Unacceptable growing stock: a tree not worth keeping for timber (poor form, rot, damage or an undesirable species). Usually removed in a harvest. Trees not marked UGS count as AGS.'],
        ags: ['AGS', 'Acceptable growing stock: a healthy tree of a good species and form, worth keeping to grow into future timber.'],
        cut: ['Cut', 'A tree marked to be removed in the harvest. Reports show the stand before the cut, the cut trees, and the trees left after it.'],
        tpa: ['TPA', 'Trees per acre: about how many trees stand on each acre.'],
        ba: ['Basal area', 'BA/acre: the square feet of trunk cross-section per acre at breast height. The usual measure of how crowded a stand is; 60–120 sq ft is typical for hardwoods.'],
        qmd: ['QMD', 'Quadratic mean diameter: the DBH of the tree of average basal area. A slightly larger “average diameter” that foresters use.'],
        vol: ['Volume (BF)', 'Board feet per acre: the sawtimber volume. One board foot is a board 12" × 12" × 1" thick.'],
        baf: ['BAF', 'Basal area factor of the prism. Each tree that counts “in” through the prism stands for this many sq ft of basal area per acre.'],
        fixedPlot: ['Fixed plot', 'Instead of a prism, every tree within a set distance of plot center is tallied (for example 37.2 ft for a 1/10-acre plot). Each tree then stands for 1 ÷ plot acres trees per acre (10 on a 1/10-acre plot), whatever its size. Prism (BAF) is the usual choice for timber.'],
        formClass: ['Form class', 'How quickly the trunk tapers: the diameter inside the bark at the top of the first log as a percent of DBH. Higher means less taper and more volume.'],
        logRule: ['Log rule', 'The formula that turns log sizes into board feet. Doyle is common for hardwoods in the eastern US; Scribner and International ¼" give more for small logs.'],
        cv: ['CV%', 'Coefficient of variation: how much the plots differ from each other, as a percent of the average. Higher means a more uneven stand that needs more plots.'],
        se: ['SE', 'Standard error: how far the average volume could be off from the true average, in board feet per acre.'],
        ci: ['95% CI', 'Confidence interval: 95 times out of 100 the true average falls within this range.'],
        samplingError: ['Sampling error', 'The standard error as a percent of the average (here at 95% confidence, t = 2). Under 15% is the usual target for a cruise. The 95% CI is the range the true average falls in 95 times out of 100.'],
        stocking: ['Stocking', 'How fully the trees use the site. The A-line is fully stocked (overcrowded above it); the B-line is the least that still uses the site fully.'],
    };

    window.TT_GLOSSARY = GLOSSARY;
    window.ttTermBtn = key => (GLOSSARY[key]
        ? `<button type="button" class="term-info" data-term="${key}" aria-label="What is ${GLOSSARY[key][0]}?">&#9432;</button>`
        : '');

    let pop = null, openFor = null;

    function close() {
        if (!pop) return;
        pop.hidden = true;
        if (openFor) openFor.setAttribute('aria-expanded', 'false');
        openFor = null;
    }

    function open(btn) {
        const entry = GLOSSARY[btn.dataset.term];
        if (!entry) return;
        if (!pop) {
            pop = document.createElement('div');
            pop.className = 'term-popover';
            pop.setAttribute('role', 'tooltip');
            pop.id = 'termPopover';
            document.body.appendChild(pop);
        }
        pop.innerHTML = `<b>${entry[0]}</b> ${entry[1]}`;
        pop.hidden = false;
        openFor = btn;
        btn.setAttribute('aria-expanded', 'true');
        // Place under the button, kept inside the screen.
        const r = btn.getBoundingClientRect();
        const w = Math.min(300, window.innerWidth - 16);
        pop.style.width = `${w}px`;
        const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
        pop.style.left = `${left}px`;
        const h = pop.offsetHeight;
        const below = r.bottom + 6;
        pop.style.top = `${below + h > window.innerHeight - 8 && r.top - h - 6 > 8 ? r.top - h - 6 : below}px`;
    }

    // Capture phase, so a ⓘ inside a <label> never toggles the field it labels.
    document.addEventListener('click', e => {
        const btn = e.target.closest?.('.term-info');
        if (btn) {
            e.preventDefault();
            e.stopPropagation();
            if (openFor === btn) close(); else open(btn);
            return;
        }
        if (pop && !pop.hidden && !pop.contains(e.target)) close();
    }, true);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
})();

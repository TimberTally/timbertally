// --- START OF FILE scroll-wheel.js ---
// Scroll-wheel picker (DBH / Logs), ported from ForestScribe: a list with a
// highlighted center row. The spin is driven here instead of by the browser's
// momentum scrolling: the wheel follows the finger exactly, stops the moment
// the finger stops, highlights the row under the bar while it moves, and a
// flick coasts a short way. Tapping a spinning wheel stops it.
//
//   const wheel = createScrollWheel(el, { values: [{ value, label }], value, onChange, ariaLabel });
//   wheel.setValues(values, value)   wheel.setValue(value)   wheel.getValue()

(function () {
    'use strict';

    const ITEM_H = 40;
    /** Finger travel (px) before a touch counts as a drag rather than a tap. */
    const TAP_SLOP = 6;
    /** Only finger movement this recent (ms) counts toward flick speed. */
    const FLICK_WINDOW = 80;
    /** Release speeds below this (px/ms) just settle on the nearest row. */
    const MIN_FLICK = 0.15;
    const MAX_FLICK = 6;
    /** Deceleration after a flick (px/ms²); higher stops sooner. */
    const DECEL = 0.009;

    function createScrollWheel(mount, opts) {
        let values = opts.values;
        let value = opts.value;
        const onChange = opts.onChange || (() => {});

        mount.classList.add('scroll-wheel-wrapper');
        mount.innerHTML = '<div class="scroll-wheel-highlight"></div>';
        const el = document.createElement('div');
        el.className = 'scroll-wheel';
        el.setAttribute('role', 'listbox');
        if (opts.ariaLabel) el.setAttribute('aria-label', opts.ariaLabel);
        if (opts.id) el.id = opts.id;
        mount.appendChild(el);

        let raf = 0, animTarget = 0, drag = null, wheelAcc = 0;
        /** True while a finger is down or the wheel is coasting. */
        let busy = false;
        let liveIndex = null;

        const indexOf = v => Math.max(0, values.findIndex(x => x.value === v));
        const lastIndex = () => values.length - 1;
        const clampIndex = i => Math.max(0, Math.min(lastIndex(), i));
        const clampTop = y => Math.max(0, Math.min(lastIndex() * ITEM_H, y));
        const nearest = () => clampIndex(Math.round(el.scrollTop / ITEM_H));

        function renderItems() {
            el.innerHTML = values.map(v =>
                `<div class="scroll-wheel-item" role="option" data-value="${v.value}">${v.label}</div>`).join('');
            markSelected(indexOf(value));
        }
        function markSelected(i) {
            el.querySelectorAll('.scroll-wheel-item').forEach((item, j) => {
                item.classList.toggle('selected', j === i);
                item.setAttribute('aria-selected', String(j === i));
            });
        }
        /** At rest, keep the wheel on the current value (also after it was hidden, which resets scroll). */
        function sync() {
            if (busy) return;
            const target = indexOf(value) * ITEM_H;
            if (Math.abs(el.scrollTop - target) > 2) el.scrollTop = target;
            markSelected(indexOf(value));
        }

        const setTop = y => {
            el.scrollTop = y;
            const i = clampIndex(Math.round(y / ITEM_H));
            if (i !== liveIndex) { liveIndex = i; markSelected(i); }
        };
        const stopAnim = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
        const finish = () => {
            const i = nearest();
            el.scrollTop = i * ITEM_H;
            busy = false;
            liveIndex = null;
            markSelected(i);
            if (values[i] && values[i].value !== value) {
                value = values[i].value;
                onChange(value);
            }
        };
        /** Glide to a row, slowing evenly to a stop (quadratic ease-out). */
        const glideTo = (index, ms) => {
            stopAnim();
            busy = true;
            animTarget = clampIndex(index);
            const from = el.scrollTop;
            const to = animTarget * ITEM_H;
            if (Math.abs(to - from) < 0.5) return finish();
            const t0 = performance.now();
            const step = now => {
                const p = Math.min(1, (now - t0) / ms);
                setTop(from + (to - from) * (1 - (1 - p) * (1 - p)));
                if (p < 1) raf = requestAnimationFrame(step);
                else { raf = 0; finish(); }
            };
            raf = requestAnimationFrame(step);
        };

        el.addEventListener('pointerdown', e => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            const wasMoving = raf !== 0;
            stopAnim();
            busy = true;
            try { el.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
            const rect = el.getBoundingClientRect();
            // Rows start below the 40px top padding.
            const tapIndex = Math.floor((el.scrollTop + e.clientY - rect.top - ITEM_H) / ITEM_H);
            drag = { id: e.pointerId, startY: e.clientY, startTop: el.scrollTop, moved: false, wasMoving, tapIndex, samples: [{ t: e.timeStamp, y: e.clientY }] };
        });
        el.addEventListener('pointermove', e => {
            if (!drag || e.pointerId !== drag.id) return;
            const dy = e.clientY - drag.startY;
            if (!drag.moved && Math.abs(dy) < TAP_SLOP) return;
            drag.moved = true;
            setTop(clampTop(drag.startTop - dy));
            drag.samples.push({ t: e.timeStamp, y: e.clientY });
            while (drag.samples.length > 2 && e.timeStamp - drag.samples[0].t > FLICK_WINDOW) drag.samples.shift();
        });
        const onUp = e => {
            if (!drag || e.pointerId !== drag.id) return;
            const d = drag;
            drag = null;
            if (e.type === 'pointercancel') return glideTo(nearest(), 120);
            // A tap stops a spinning wheel where it is; otherwise it picks the row tapped.
            if (!d.moved) return glideTo(d.wasMoving ? nearest() : d.tapIndex, 160);
            // Flick speed from the last few ms of movement. A finger that stopped
            // before lifting has no recent movement, so the wheel stops right there.
            const recent = [...d.samples, { t: e.timeStamp, y: e.clientY }].filter(s => e.timeStamp - s.t <= FLICK_WINDOW);
            let v = 0;
            if (recent.length >= 2) {
                const a = recent[0], b = recent[recent.length - 1];
                if (b.t > a.t) v = -(b.y - a.y) / (b.t - a.t);
            }
            v = Math.max(-MAX_FLICK, Math.min(MAX_FLICK, v));
            if (Math.abs(v) < MIN_FLICK) return glideTo(nearest(), 120);
            const target = clampIndex(Math.round((el.scrollTop + (v * Math.abs(v)) / (2 * DECEL)) / ITEM_H));
            const dist = Math.abs(target * ITEM_H - el.scrollTop);
            // Duration that starts the glide at the finger's speed.
            glideTo(target, Math.max(100, Math.min(900, (2 * dist) / Math.abs(v))));
        };
        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);

        // Mouse wheel / trackpad (computer): one row per notch.
        el.addEventListener('wheel', e => {
            e.preventDefault();
            const dy = e.deltaMode === 1 ? e.deltaY * ITEM_H : e.deltaMode === 2 ? e.deltaY * el.clientHeight : e.deltaY;
            wheelAcc = Math.abs(dy) >= 50 ? Math.sign(dy) * 50 : wheelAcc + dy;
            if (Math.abs(wheelAcc) < 50) return;
            const steps = Math.trunc(wheelAcc / 50);
            wheelAcc -= steps * 50;
            glideTo((raf ? animTarget : nearest()) + steps, 120);
        }, { passive: false });
        // iPhone: keep the page itself from scrolling while spinning the wheel.
        el.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
        // Touching anything else (Submit, most often) while the wheel still coasts stops it on the row
        // shown, and that value is set before the tap takes effect, so the tree saves what's on screen.
        document.addEventListener('pointerdown', e => {
            if (!raf || el.contains(e.target)) return;
            stopAnim();
            finish();
        }, true);

        // Re-sync when the wheel becomes visible again (tab switches reset scrollTop).
        if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => sync()).observe(el);

        renderItems();
        requestAnimationFrame(sync);

        return {
            getValue: () => value,
            setValue(v) { value = v; sync(); },
            setValues(next, v) {
                stopAnim();
                busy = false;
                values = next;
                if (v !== undefined) value = v;
                if (!values.some(x => x.value === value)) value = values[0]?.value;
                renderItems();
                sync();
            },
        };
    }

    window.createScrollWheel = createScrollWheel;
})();

// --- END OF FILE scroll-wheel.js ---

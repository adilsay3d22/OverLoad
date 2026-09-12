import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useMeasure } from './charts.jsx';
import { cx } from './ui.jsx';

/**
 * A number strip that *is* the field — small enough to sit in a table cell where
 * an input would go, scrolled to the value you want.
 *
 * Scrolling is native, so momentum, keyboard arrows and accessibility come free,
 * but three things have to be handled around it:
 *
 *  - A mouse cannot swipe an overflow container, so pointer-drag and wheel are
 *    wired up for desktop. Dragging left reveals higher numbers, like a dial.
 *  - `scroll-snap-type: mandatory` re-snaps on every programmatic `scrollLeft`
 *    write, which turns a drag into a fight and drops stops. Snapping is relaxed
 *    while a pointer or wheel drives, then restored to settle on a stop.
 *  - Positioning the strip fires scroll events of its own; unguarded they read
 *    back as a swipe and overwrite the value being restored.
 *
 * Every stop crossed fires a short haptic, which is what makes it usable without
 * looking — the point, mid-set.
 */
const ITEM = 26;

export function RulerPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  /** Stops at multiples of this are numbered; the rest are bare ticks. */
  majorEvery = 1,
  label,
  disabled,
  className,
}) {
  const stops = useMemo(() => {
    const out = [];
    for (let v = min; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(2)));
    return out;
  }, [min, max, step]);

  const [ref, width] = useMeasure();
  const scroller = useRef(null);
  const indexRef = useRef(-1);
  const drag = useRef(null);
  const snapTimer = useRef(null);
  // Only a real gesture may change the value. A time-based guard is not enough:
  // scroll events from laying out and positioning the strip arrive a frame or
  // more later and get read back as a swipe, drifting the value off the plan.
  const gesturing = useRef(false);
  const idleTimer = useRef(null);

  const activeIndex = Math.max(0, stops.indexOf(Number(value)));

  useEffect(() => {
    if (!width || !scroller.current) return;
    if (activeIndex === indexRef.current) return;
    indexRef.current = activeIndex;
    const id = requestAnimationFrame(() => {
      scroller.current?.scrollTo({ left: activeIndex * ITEM, behavior: 'auto' });
    });
    return () => cancelAnimationFrame(id);
  }, [activeIndex, width]);

  useEffect(
    () => () => {
      clearTimeout(snapTimer.current);
      clearTimeout(idleTimer.current);
    },
    [],
  );

  /** Open the gate, and hold it open for as long as a fling keeps scrolling. */
  const markGesture = () => {
    gesturing.current = true;
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      gesturing.current = false;
    }, 700);
  };

  const readScroll = useCallback(() => {
    const el = scroller.current;
    if (!el || !gesturing.current) return;
    markGesture();
    const index = Math.min(stops.length - 1, Math.max(0, Math.round(el.scrollLeft / ITEM)));
    if (index === indexRef.current) return;
    indexRef.current = index;
    navigator.vibrate?.(8);
    onChange(stops[index]);
  }, [onChange, stops]);

  const relaxSnap = () => {
    const el = scroller.current;
    if (!el) return;
    el.style.scrollSnapType = 'none';
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      el.style.scrollSnapType = 'x mandatory';
      el.scrollTo({ left: indexRef.current * ITEM, behavior: 'smooth' });
    }, 170);
  };

  const jumpTo = (index) => {
    markGesture();
    const clamped = Math.min(stops.length - 1, Math.max(0, index));
    if (clamped === indexRef.current) return;
    indexRef.current = clamped;
    navigator.vibrate?.(8);
    onChange(stops[clamped]);
    scroller.current?.scrollTo({ left: clamped * ITEM, behavior: 'smooth' });
  };

  const onPointerDown = (e) => {
    if (disabled) return;
    markGesture();
    if (e.pointerType === 'touch') return;
    drag.current = { x: e.clientX, left: scroller.current.scrollLeft, moved: false };
    scroller.current.setPointerCapture?.(e.pointerId);
    relaxSnap();
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    if (Math.abs(dx) > 2) drag.current.moved = true;
    relaxSnap();
    scroller.current.scrollLeft = drag.current.left - dx;
    readScroll();
  };
  const onPointerUp = (e) => {
    if (!drag.current) return;
    const { moved } = drag.current;
    drag.current = null;
    scroller.current?.releasePointerCapture?.(e.pointerId);
    if (moved) {
      relaxSnap();
      return;
    }
    // A press that never moved is a tap on one of the numbers.
    const rect = scroller.current.getBoundingClientRect();
    jumpTo(indexRef.current + Math.round((e.clientX - (rect.left + rect.width / 2)) / ITEM));
  };

  const pad = width ? Math.max(0, width / 2 - ITEM / 2) : 0;

  return (
    <div
      ref={ref}
      className={cx(
        'relative h-[42px] overflow-hidden rounded-[12px] border border-line bg-bg',
        disabled && 'opacity-50',
        className,
      )}
    >
      <div
        ref={scroller}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Number(value)}
        onScroll={readScroll}
        onTouchStart={markGesture}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={(e) => {
          if (disabled) return;
          markGesture();
          relaxSnap();
          scroller.current.scrollLeft +=
            Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
          readScroll();
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); jumpTo(activeIndex - 1); }
          if (e.key === 'ArrowRight') { e.preventDefault(); jumpTo(activeIndex + 1); }
        }}
        className="no-scrollbar flex h-full cursor-ew-resize items-center overflow-x-auto overscroll-x-contain select-none focus:outline-none"
        style={{ scrollSnapType: 'x mandatory', paddingLeft: pad, paddingRight: pad }}
      >
        {width
          ? stops.map((stop, index) => {
              const major = Math.abs(stop % majorEvery) < 1e-9;
              const active = index === activeIndex;
              return (
                <div
                  key={stop}
                  className="flex shrink-0 flex-col items-center gap-[3px]"
                  style={{ width: ITEM, scrollSnapAlign: 'center' }}
                >
                  <span
                    aria-hidden
                    className="w-[2px] rounded-pill"
                    style={{
                      height: major ? 7 : 4,
                      background: active ? 'var(--color-accent-deep)' : 'var(--color-line-strong)',
                    }}
                  />
                  <span
                    className={cx(
                      'tabular leading-none',
                      active
                        ? 'text-[15px] font-bold text-ink'
                        : 'text-[11px] font-semibold text-ink-muted',
                    )}
                  >
                    {major ? stop : ''}
                  </span>
                </div>
              );
            })
          : null}
      </div>

      {/* Needle over the centre stop. */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-[6px] left-1/2 h-[9px] w-[3px] -translate-x-1/2 rounded-pill bg-accent-deep"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-4"
        style={{ background: 'linear-gradient(90deg, var(--color-bg), transparent)' }}
      />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-4"
        style={{ background: 'linear-gradient(270deg, var(--color-bg), transparent)' }}
      />
    </div>
  );
}

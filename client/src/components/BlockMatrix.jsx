import { useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cx } from './ui.jsx';
import { DAY_SHORT, dayAbbr, weekdayIndex } from '../lib/format.js';
import { EASE_OUT_QUINT } from '../lib/tokens.js';

/**
 * The whole training block as one object: weeks down, days across.
 *
 * This is the thing the Programs tab is named after and never used to show.
 * Every planned session is a cell, so a block's shape — which days you train,
 * how far in you are, where the gaps are — is legible in one look and sits in
 * the same place on every visit.
 *
 * State rides the ink-and-hairline ladder, never lime. An earlier pass filled
 * logged cells with accent and marked the resume-here session in ink, which
 * inverted two of DESIGN.md's rules at once: lime identified data, and the one
 * thing you are meant to tap was the only unlimed mark on the screen. Now the
 * ladder runs solid ink → heavy outline → faint outline → dot, and the single
 * lime cell is the session you would open.
 *
 * The vocabulary is deliberately not Home's hard square spine marks, which
 * DESIGN.md scopes to that route; these are rounded cells differing by fill.
 */

const CELL = 'mx-auto h-[25px] w-full max-w-[34px] rounded-[6px]';

/**
 * Exactly one fill per cell, resolved before it reaches the class string.
 * Overlapping branches let two background utilities land on one element, and
 * Tailwind then picks by stylesheet order rather than by the order written —
 * which is how the up-next cell ended up rendering as its own "Planned" state.
 */
const FILL = {
  next: 'bg-accent ring-2 ring-accent-deep ring-offset-2 ring-offset-bg',
  complete: 'bg-ink',
  active: 'border-2 border-ink bg-surface',
  planned: 'border border-line-strong bg-surface hover:border-ink',
};
const GRID = 'grid grid-cols-[28px_repeat(7,minmax(0,1fr))] gap-1.5';

function cellState(session) {
  if (!session) return 'rest';
  const p = session.progress;
  if (p?.complete) return 'complete';
  if (p?.started) return 'active';
  return 'planned';
}

function Cell({ session, weekIndex, day, isNext, onOpen, roving }) {
  const state = cellState(session);

  if (state === 'rest') {
    return (
      <span role="gridcell" className="flex h-[25px] items-center justify-center">
        <span aria-hidden className="size-[3px] rounded-full bg-line-strong" />
        <span className="sr-only">{`Week ${weekIndex + 1} ${dayAbbr(day)}, rest`}</span>
      </span>
    );
  }

  const status =
    state === 'complete'
      ? 'logged'
      : state === 'active'
        ? `${session.progress.loggedSets} of ${session.progress.plannedSets} sets logged`
        : 'planned, not started';

  return (
    <span role="gridcell" className="min-w-0">
      <button
        type="button"
        onClick={onOpen}
        tabIndex={roving ? 0 : -1}
        data-cell=""
        // Week and weekday are in the name because locating yourself in the
        // block is this grid's entire job, and a screen reader gets no row or
        // column from the layout.
        aria-label={`Week ${weekIndex + 1} ${dayAbbr(day)}, ${session.name}, ${status}${
          isNext ? ', up next' : ''
        }`}
        className={cx('press block', CELL, FILL[isNext ? 'next' : state])}
      />
    </span>
  );
}

const ROW = {
  hidden: { opacity: 0, y: -4 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT_QUINT } },
};

export function BlockMatrix({ weeks, currentWeek, nextSessionId, onOpenSession }) {
  const today = weekdayIndex();
  const reduced = useReducedMotion();
  const gridRef = useRef(null);
  // With no up-next session, the grid still needs exactly one tab stop.
  const firstDay = weeks[0]?.sessions?.length
    ? Math.min(...weeks[0].sessions.map((s) => s.day % 7))
    : -1;

  /**
   * Roving tabindex. Every cell used to be its own tab stop, so a keyboard user
   * reaching the content below an eight-week block tabbed through up to 56
   * buttons. The grid is one stop now and arrow keys move within it, which is
   * the standard pattern for role="grid".
   */
  const onGridKey = (e) => {
    const keys = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (!keys.includes(e.key)) return;
    const cells = [...(gridRef.current?.querySelectorAll('[data-cell]') || [])];
    const here = cells.indexOf(document.activeElement);
    if (here === -1) return;
    e.preventDefault();

    // Cells per row varies with how many days the block trains, so step by the
    // rendered row rather than by a fixed stride.
    const row = document.activeElement.closest('[role="row"]');
    const rows = [...(gridRef.current?.querySelectorAll('[role="row"]') || [])].filter((r) =>
      r.querySelector('[data-cell]'),
    );
    const rowIndex = rows.indexOf(row);
    const inRow = [...row.querySelectorAll('[data-cell]')];
    const col = inRow.indexOf(document.activeElement);

    let next;
    if (e.key === 'ArrowRight') next = inRow[col + 1] || inRow[0];
    else if (e.key === 'ArrowLeft') next = inRow[col - 1] || inRow[inRow.length - 1];
    else if (e.key === 'Home') next = inRow[0];
    else if (e.key === 'End') next = inRow[inRow.length - 1];
    else {
      const target = rows[rowIndex + (e.key === 'ArrowDown' ? 1 : -1)];
      const targetCells = target ? [...target.querySelectorAll('[data-cell]')] : [];
      next = targetCells[Math.min(col, targetCells.length - 1)];
    }
    next?.focus();
  };

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label="Training block by week and day. Use arrow keys to move between sessions."
      onKeyDown={onGridKey}
    >
      <div role="row" className={cx('mb-2', GRID)}>
        <span role="columnheader" />
        {DAY_SHORT.map((letter, day) => (
          <span
            key={day}
            role="columnheader"
            className={cx(
              'min-w-0 text-center text-[11px] leading-none font-semibold uppercase',
              day === today ? 'text-ink' : 'text-ink-muted',
            )}
            style={{ letterSpacing: '0.12em' }}
          >
            {letter}
          </span>
        ))}
      </div>

      <motion.div
        className="flex flex-col gap-1.5"
        initial={reduced ? false : 'hidden'}
        animate="shown"
        variants={{ shown: { transition: { staggerChildren: 0.045 } } }}
      >
        {weeks.map((week) => {
          const byDay = new Map(week.sessions.map((s) => [s.day % 7, s]));
          const isCurrent = week.index === currentWeek;
          return (
            <motion.div
              key={week.index}
              role="row"
              variants={ROW}
              className={cx('items-center', GRID)}
            >
              <span
                role="rowheader"
                className={cx(
                  'tabular text-[11px] leading-none font-semibold',
                  isCurrent ? 'text-ink' : 'text-ink-muted',
                )}
              >
                W{week.index + 1}
              </span>
              {DAY_SHORT.map((_, day) => {
                const session = byDay.get(day);
                return (
                  <Cell
                    key={day}
                    session={session}
                    weekIndex={week.index}
                    day={day}
                    isNext={Boolean(session && session.id === nextSessionId && isCurrent)}
                    roving={
                      Boolean(session && session.id === nextSessionId && isCurrent) ||
                      (!nextSessionId && week.index === 0 && day === firstDay)
                    }
                    onOpen={() => onOpenSession(week.index, session.id)}
                  />
                );
              })}
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

/**
 * Every mark on the grid, named. Three of five left the two ink-weight marks —
 * the ones carrying the locate-yourself job — as decoration a reader had to
 * guess at.
 */
export function BlockKey({ className }) {
  const items = [
    ['bg-accent', 'Up next'],
    ['bg-ink', 'Logged'],
    ['border-2 border-ink bg-surface', 'Started'],
    ['border border-line-strong bg-surface', 'Planned'],
  ];
  return (
    <div className={cx('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      {items.map(([style, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span aria-hidden className={cx('h-[12px] w-[17px] rounded-[6px]', style)} />
          <span
            className="text-[11px] leading-none font-semibold text-ink-muted uppercase"
            style={{ letterSpacing: '0.12em' }}
          >
            {label}
          </span>
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="flex h-[12px] w-[17px] items-center justify-center" aria-hidden>
          <span className="size-[3px] rounded-full bg-line-strong" />
        </span>
        <span
          className="text-[11px] leading-none font-semibold text-ink-muted uppercase"
          style={{ letterSpacing: '0.12em' }}
        >
          Rest
        </span>
      </span>
    </div>
  );
}

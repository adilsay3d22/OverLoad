import { cx } from './ui.jsx';
import { DAY_SHORT } from '../lib/format.js';

/**
 * Shared grammar for the Programs tab and everything under it.
 *
 * Before this, the seven screens hanging off /programs spoke four different
 * list vocabularies — bordered cards, cards with coloured left bars, a
 * two-column grid of progress rings, and plain rows — and every one of them
 * opened with a kicker above its heading. These are the pieces that make the
 * cluster one place: a label register that clears AA, hairline rules instead of
 * containers, a row that is a row, and one way to draw a week's shape.
 */

/** 11px / 0.12em caps at ink-muted (4.92:1). The `.caps` utility hardcodes
 *  ink-faint, which is 3.33:1 and below this product's stated AA bar. */
export function Label({ children, className, tone }) {
  return (
    <span
      className={cx(
        'block text-[11px] leading-none font-semibold uppercase',
        tone === 'ink' ? 'text-ink' : tone === 'accent' ? 'text-accent-deep' : 'text-ink-muted',
        className,
      )}
      style={{ letterSpacing: '0.12em' }}
    >
      {children}
    </span>
  );
}

export function Rule({ strong, className }) {
  return (
    <div
      aria-hidden
      className={cx('h-px w-full', strong ? 'bg-line-strong' : 'bg-line', className)}
    />
  );
}

/** A section opener: label, optional trailing action, and the strong rule. */
export function SectionRule({ children, action, className }) {
  return (
    <div className={className}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <Label tone="ink">{children}</Label>
        {action}
      </div>
      <Rule strong />
    </div>
  );
}

/** Breadcrumb for the header row, where wayfinding belongs — never stacked
 *  above the heading as an eyebrow. */
export function Crumb({ children, className }) {
  return (
    <span
      className={cx('truncate text-[11px] font-semibold text-ink-muted uppercase', className)}
      style={{ letterSpacing: '0.12em' }}
    >
      {children}
    </span>
  );
}

/**
 * A week's training rhythm as seven marks — the same reading as the block
 * matrix on the Programs tab, at row scale. It turns "4 days/week" from a
 * number you parse into a shape you recognise.
 */
export function ShapeStrip({
  days,
  done,
  size = 14,
  gap = 3,
  className,
  showLetters,
}) {
  const set = days instanceof Set ? days : new Set(days || []);
  const doneSet = done instanceof Set ? done : done ? new Set(done) : null;
  const radius = Math.max(3, Math.round(size / 4));

  return (
    <div className={cx('inline-flex flex-col gap-1', className)} aria-hidden>
      <div className="flex" style={{ gap }}>
        {DAY_SHORT.map((_, day) => {
          const training = set.has(day);
          // With no `done` set the strip is a plan, so every training day reads
          // solid; with one it is progress, and only logged days fill in. Same
          // ladder as the block matrix: solid ink, hollow, dot.
          const filled = training && (!doneSet || doneSet.has(day));
          const hollow = training && !filled;
          return (
            <span
              key={day}
              className={cx(!training && 'flex items-center justify-center')}
              style={{
                width: size,
                height: size,
                borderRadius: radius,
                background: filled ? 'var(--color-ink)' : 'transparent',
                border: hollow ? '1px solid var(--color-line-strong)' : 'none',
              }}
            >
              {!training ? (
                <span
                  className="rounded-full"
                  style={{ width: 3, height: 3, background: 'var(--color-line-strong)' }}
                />
              ) : null}
            </span>
          );
        })}
      </div>
      {showLetters ? (
        <div className="flex" style={{ gap }}>
          {DAY_SHORT.map((letter, day) => (
            <span
              key={day}
              className="text-center text-[9px] leading-none font-semibold text-ink-muted uppercase"
              style={{ width: size, letterSpacing: '0.06em' }}
            >
              {letter}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

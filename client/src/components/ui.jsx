import { forwardRef } from 'react';
import { motion } from 'motion/react';
import { CaretLeft } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { categoryColor, sessionTypeColor } from '../lib/tokens.js';

const cx = (...parts) => parts.filter(Boolean).join(' ');

/* -------------------------------------------------------------------------- */
/* Buttons                                                                     */
/* -------------------------------------------------------------------------- */

/** Full-width 58px pill. `accent` is the primary, `surface` the secondary. */
export const PillButton = forwardRef(function PillButton(
  { variant = 'accent', className, children, disabled, ...rest },
  ref,
) {
  const styles = {
    accent: 'bg-accent text-ink shadow-lime hover:bg-accent-hover',
    surface: 'bg-surface text-ink border border-line hover:bg-accent-wash',
    ink: 'bg-ink text-white hover:bg-dark-card-2',
    ghost: 'text-ink-muted hover:text-ink',
  }[variant];

  return (
    <button
      ref={ref}
      disabled={disabled}
      className={cx(
        'press flex h-[58px] w-full items-center justify-center gap-2 rounded-pill text-[16px] font-bold',
        styles,
        disabled && 'pointer-events-none opacity-45 shadow-none',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});

/** 36–44px circular icon button on a light surface. */
export function IconButton({ size = 36, label, className, children, ...rest }) {
  return (
    <button
      aria-label={label}
      style={{ width: size, height: size }}
      className={cx(
        'press flex shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-card hover:bg-accent-wash',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * Going back must never grow the history stack. Pushing the destination instead
 * of replacing turns any two screens that both link to each other into a loop:
 * A pushes B, B pops straight back to A, and the user can never leave.
 */
export function BackButton({ to, className }) {
  const navigate = useNavigate();
  return (
    <IconButton
      label="Go back"
      className={className}
      onClick={() => (to ? navigate(to, { replace: true }) : navigate(-1))}
    >
      <CaretLeft size={17} weight="bold" />
    </IconButton>
  );
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Bordered cards live in list contexts; shadowed cards stand alone. Never both
 * on the same card.
 */
export function Card({ as: As = 'div', tone = 'bordered', className, children, ...rest }) {
  const tones = {
    bordered: 'bg-surface border border-line',
    raised: 'bg-surface shadow-raised',
    flat: 'bg-surface shadow-card',
    dark: 'bg-ink text-white grid-texture',
  };
  return (
    <As className={cx('rounded-card', tones[tone], className)} {...rest}>
      {children}
    </As>
  );
}

/** 11px/600 uppercase label that sits above the card it names. */
export function SectionLabel({ children, action, className }) {
  return (
    <div className={cx('mb-3.5 flex items-end justify-between', className)}>
      <div className="caps">{children}</div>
      {action}
    </div>
  );
}

export function SectionHeading({ children, action, className }) {
  return (
    <div className={cx('mb-3 flex items-center justify-between', className)}>
      <h2 className="text-[20px] font-semibold tracking-[-0.02em]">{children}</h2>
      {action}
    </div>
  );
}

/** Small text link used for "See All" / "View all". */
export function TextLink({ className, children, ...rest }) {
  return (
    <button
      className={cx(
        'press text-[13px] font-semibold text-accent-deep hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Tags                                                                        */
/* -------------------------------------------------------------------------- */

const tagBase =
  'inline-flex items-center rounded-pill px-[11px] py-[5px] text-[9px] font-bold tracking-[0.08em] uppercase whitespace-nowrap';

export function CategoryTag({ category, className }) {
  const { bg, fg } = categoryColor(category);
  return (
    <span className={cx(tagBase, className)} style={{ background: bg, color: fg }}>
      {category}
    </span>
  );
}

export function SessionTag({ type, className }) {
  const { bg, fg } = sessionTypeColor(type);
  return (
    <span className={cx(tagBase, className)} style={{ background: bg, color: fg }}>
      {type}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Data display                                                                */
/* -------------------------------------------------------------------------- */

/** One cell of the 3-up stat row. */
export function StatBox({ value, label, tone = 'light', accentValue, className }) {
  const dark = tone === 'dark';
  return (
    <div
      className={cx(
        'flex-1 rounded-row px-3 py-3.5 text-center',
        dark ? 'bg-ink grid-texture text-white' : 'bg-surface border border-line',
        className,
      )}
    >
      <div
        className="tabular text-[26px] leading-[1.1] font-bold tracking-[-0.03em]"
        style={accentValue ? { color: 'var(--color-accent)' } : undefined}
      >
        {value}
      </div>
      <div className={cx('mt-0.5 text-[11px] font-medium', dark ? 'text-dark-muted' : 'text-ink-muted')}>
        {label}
      </div>
    </div>
  );
}

/** Row of small selectable pills — chart metrics, category filters. */
export function TogglePills({ options, value, onChange, scroll = false, className }) {
  return (
    <div
      className={cx(
        'flex gap-1.5',
        scroll && 'no-scrollbar -mx-[22px] overflow-x-auto px-[22px]',
        className,
      )}
      role="tablist"
    >
      {options.map((option) => {
        const key = typeof option === 'string' ? option : option.value;
        const label = typeof option === 'string' ? option : option.label;
        const selected = key === value;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(key)}
            className={cx(
              'press shrink-0 rounded-pill px-3.5 py-[7px] text-[12px] font-semibold',
              selected
                ? 'bg-accent text-ink'
                : 'border border-line bg-surface text-ink-muted hover:bg-accent-wash',
            )}
          >
            {typeof option === 'object' && option.dot ? (
              <span className="flex items-center gap-1.5">
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: option.dot }}
                  aria-hidden
                />
                {label}
              </span>
            ) : (
              label
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Circular −/+ stepper card used by Build Program and Add Exercise. */
export function Stepper({ label, value, onChange, min = 1, max = 10, step = 1, suffix }) {
  const clamp = (n) => Math.min(max, Math.max(min, Math.round(n / step) * step));
  const display = Number.isInteger(value) ? value : value.toFixed(1);
  return (
    <div className="flex items-center justify-between rounded-row border border-line bg-surface px-4 py-3.5">
      <div className="text-[13px] font-semibold text-ink-muted">{label}</div>
      <div className="flex items-center gap-3.5">
        <IconButton
          size={34}
          label={`Decrease ${label}`}
          disabled={value <= min}
          className={value <= min ? 'opacity-35' : ''}
          onClick={() => onChange(clamp(value - step))}
        >
          <span className="-mt-px text-[18px] leading-none font-semibold">−</span>
        </IconButton>
        <div className="tabular w-[54px] text-center text-[26px] leading-none font-bold tracking-[-0.03em]">
          {display}
          {suffix ? <span className="ml-0.5 text-[13px] text-ink-muted">{suffix}</span> : null}
        </div>
        <IconButton
          size={34}
          label={`Increase ${label}`}
          disabled={value >= max}
          className={value >= max ? 'opacity-35' : ''}
          onClick={() => onChange(clamp(value + step))}
        >
          <span className="-mt-px text-[18px] leading-none font-semibold">+</span>
        </IconButton>
      </div>
    </div>
  );
}

/** Thin accent-on-line progress bar. */
export function ProgressBar({ value, total, height = 6, className }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div
      className={cx('w-full overflow-hidden rounded-pill bg-line', className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-pill bg-accent"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* States                                                                      */
/* -------------------------------------------------------------------------- */

export function EmptyState({ icon, title, body, action, className }) {
  return (
    <div className={cx('flex flex-col items-center px-6 py-14 text-center', className)}>
      {icon ? (
        <div className="mb-5 flex size-[72px] items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-card">
          {icon}
        </div>
      ) : null}
      <h3 className="text-[20px] font-semibold tracking-[-0.02em]">{title}</h3>
      {body ? (
        <p className="mt-2 max-w-[280px] text-[15px] leading-[1.5] font-medium text-ink-muted">{body}</p>
      ) : null}
      {action ? <div className="mt-6 w-full max-w-[280px]">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className, radius = 22 }) {
  return <div className={cx('skeleton', className)} style={{ borderRadius: radius }} />;
}

/**
 * `onRetry` is the right offer when something failed and might not fail again.
 * It is the wrong offer when the thing is gone: retrying a deleted program
 * fails forever, and an error with no exit but the back button can strand
 * someone on a route that no longer resolves. `action` is that exit.
 */
export function ErrorNote({ children, onRetry, action, actionLabel = 'Go back' }) {
  if (!children) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-row border border-danger-line bg-danger-wash px-4 py-3.5"
    >
      <p className="text-[13px] font-medium text-danger">{children}</p>
      {onRetry || action ? (
        <div className="mt-2 flex flex-wrap items-center gap-4">
          {onRetry ? (
            <button
              onClick={onRetry}
              className="press text-[12px] font-bold text-danger underline underline-offset-2"
            >
              Try again
            </button>
          ) : null}
          {action ? (
            <button
              onClick={action}
              className="press text-[12px] font-bold text-danger underline underline-offset-2"
            >
              {actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Label-above-input form field. */
export function Field({ label, error, hint, className, inputRef, ...rest }) {
  return (
    <label className={cx('block', className)}>
      <div className="caps mb-1.5">{label}</div>
      <input
        ref={inputRef}
        aria-invalid={Boolean(error)}
        className={cx(
          'w-full rounded-row border bg-surface px-4 py-3.5 text-[15px] font-medium transition-colors placeholder:text-line-strong',
          error ? 'border-danger-line' : 'border-line',
          'focus:border-accent focus:outline-none focus-visible:ring-3 focus-visible:ring-accent/45',
        )}
        {...rest}
      />
      {error ? (
        <p role="alert" className="mt-1.5 text-[12px] font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] font-medium text-ink-muted">{hint}</p>
      ) : null}
    </label>
  );
}

export { cx };

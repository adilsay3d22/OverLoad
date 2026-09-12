import { memo } from 'react';
import { cx } from './ui.jsx';

/**
 * Countdown dial: a ring of 60 tick marks around seven-segment numerals.
 *
 * Ticks light clockwise from twelve o'clock and burn back down as the rest
 * runs out. The boundary tick is drawn at partial opacity for the fraction of
 * itself that is left, so on a three-minute rest — where a whole tick is three
 * seconds — something is still visibly moving every frame.
 */

const TICKS = 60;

export const TickDial = memo(function TickDial({
  /** 1 → full time left, 0 → done. */
  remainingFraction,
  size = 288,
  children,
  className,
}) {
  const lit = Math.max(0, Math.min(1, remainingFraction)) * TICKS;
  const centre = size / 2;
  const outer = centre - 6;
  const inner = outer - 26;

  return (
    <div className={cx('relative', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden>
        {Array.from({ length: TICKS }, (_, i) => {
          // 0 is straight up; ticks advance clockwise.
          const angle = (i * 360) / TICKS - 90;
          const radians = (angle * Math.PI) / 180;
          const cos = Math.cos(radians);
          const sin = Math.sin(radians);
          const opacity = i + 1 <= lit ? 1 : i < lit ? lit - i : 0;

          return (
            <line
              key={i}
              x1={centre + cos * inner}
              y1={centre + sin * inner}
              x2={centre + cos * outer}
              y2={centre + sin * outer}
              strokeWidth="4"
              strokeLinecap="round"
              stroke={opacity > 0 ? 'var(--color-accent)' : 'var(--color-dark-line-2)'}
              style={{ opacity: opacity > 0 ? Math.max(0.25, opacity) : 1 }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* Seven-segment numerals                                                      */
/* -------------------------------------------------------------------------- */

/** Which of the seven segments each character lights. */
const SEGMENTS = {
  0: 'abcdef',
  1: 'bc',
  2: 'abged',
  3: 'abgcd',
  4: 'fgbc',
  5: 'afgcd',
  6: 'afgedc',
  7: 'abc',
  8: 'abcdefg',
  9: 'abcdfg',
};

const W = 46;
const H = 82;
const T = 10;

/** Mitred hexagons, the way a real LCD segment is cut. */
const horizontal = (y) =>
  [
    [T / 2, y],
    [T, y - T / 2],
    [W - T, y - T / 2],
    [W - T / 2, y],
    [W - T, y + T / 2],
    [T, y + T / 2],
  ]
    .map((p) => p.join(','))
    .join(' ');

const vertical = (x, y0, y1) =>
  [
    [x, y0 + T / 2],
    [x + T / 2, y0 + T],
    [x + T / 2, y1 - T],
    [x, y1 - T / 2],
    [x - T / 2, y1 - T],
    [x - T / 2, y0 + T],
  ]
    .map((p) => p.join(','))
    .join(' ');

const SEGMENT_SHAPES = {
  a: horizontal(T / 2),
  g: horizontal(H / 2),
  d: horizontal(H - T / 2),
  f: vertical(T / 2, 0, H / 2),
  b: vertical(W - T / 2, 0, H / 2),
  e: vertical(T / 2, H / 2, H),
  c: vertical(W - T / 2, H / 2, H),
};

function Digit({ char, color, ghost }) {
  const on = SEGMENTS[char] || '';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} height="100%" style={{ width: 'auto' }} aria-hidden>
      {Object.entries(SEGMENT_SHAPES).map(([key, points]) => (
        <polygon
          key={key}
          points={points}
          fill={color}
          // Unlit segments stay faintly visible, like a real LCD.
          opacity={on.includes(key) ? 1 : ghost}
        />
      ))}
    </svg>
  );
}

function Colon({ color }) {
  return (
    <svg viewBox={`0 0 ${T + 4} ${H}`} height="100%" style={{ width: 'auto' }} aria-hidden>
      <rect x="2" y={H * 0.3} width={T} height={T} rx="2" fill={color} />
      <rect x="2" y={H * 0.68} width={T} height={T} rx="2" fill={color} />
    </svg>
  );
}

/**
 * Renders digits and colons at a fixed pixel height. `label` gives the readout
 * its accessible value, since the segments themselves are decorative shapes.
 */
export function SegmentReadout({
  value,
  height = 74,
  color = 'var(--color-surface)',
  ghost = 0.07,
  label,
  className,
}) {
  return (
    <div
      className={cx('flex items-stretch justify-center gap-1.5', className)}
      style={{ height }}
      role="timer"
      aria-label={label || value}
    >
      {String(value)
        .split('')
        .map((char, i) =>
          char === ':' ? (
            <Colon key={i} color={color} />
          ) : (
            <Digit key={i} char={char} color={color} ghost={ghost} />
          ),
        )}
    </div>
  );
}

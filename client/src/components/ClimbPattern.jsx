/**
 * The climbing field.
 *
 * Authored from the reference art the user supplied (`art2.jpg`): rounded-cap
 * strokes on a 45° rise, chevrons floating free of their lines, a few S-bends,
 * and hairline arrows threading between the heavy bars. Overlaps multiply, so
 * lime crossing ink lands as a darker olive rather than a flat stack.
 *
 * Two deliberate departures from the reference. Its rainbow palette is replaced
 * by this product's committed one, because DESIGN.md's world is binding and a
 * second palette on the entry screen would be the app introducing itself in
 * colours it never uses again. And every stroke rises left-to-right without
 * exception — the reference mixes climbing and falling arrows, which on a
 * progressive-overload app would be saying the opposite of the product.
 *
 * The layout is hand-placed rather than random: a seeded scatter re-rolls its
 * composition on every render and can always deal an ugly hand.
 */

const INK = 'var(--color-ink)';
const LIME = 'var(--color-accent)';
const DEEP = 'var(--color-accent-deep)';
const LINE = 'var(--color-line-strong)';
const WASH = 'var(--color-accent-mid)';

/** [x, y, length, width, colour] — every bar rises at 45°. */
const BARS = [
  [-30, 150, 150, 17, LINE],
  [10, 300, 190, 22, WASH],
  [70, 120, 90, 11, LIME],
  [120, 250, 130, 17, INK],
  [150, 60, 70, 9, LINE],
  [200, 330, 160, 22, LINE],
  [230, 170, 110, 14, LIME],
  [255, 95, 80, 11, WASH],
  [300, 265, 120, 17, INK],
  [330, 140, 90, 11, LINE],
  [355, 35, 60, 9, LIME],
  [60, 215, 70, 8, INK],
  [-10, 255, 95, 13, INK],
  [140, 345, 115, 15, LIME],
  [235, 205, 65, 9, LINE],
  [95, 320, 70, 10, WASH],
];

/** [x, y, length, width, colour] — thin arrows with a head. */
const ARROWS = [
  [40, 245, 110, 2.5, INK],
  [175, 205, 95, 2.5, DEEP],
  [265, 320, 120, 2.5, INK],
  [305, 200, 80, 2.5, DEEP],
  [120, 95, 70, 2.5, INK],
];

/** [x, y, size, width, colour] — free chevrons pointing up-right. */
const CHEVRONS = [
  [95, 175, 22, 11, INK],
  [185, 125, 18, 9, LIME],
  [280, 235, 24, 12, LIME],
  [345, 95, 18, 9, INK],
  [25, 95, 18, 9, LIME],
  [215, 285, 20, 10, INK],
  [45, 305, 19, 10, LIME],
  [160, 60, 16, 8, INK],
];

/** [x, y, size, colour] — the punctuation dots from the reference. */
const DOTS = [
  [150, 175, 5, DEEP],
  [250, 60, 4, DEEP],
  [90, 60, 4, LIME],
  [320, 320, 5, DEEP],
  [200, 230, 4, INK],
  [45, 195, 4, DEEP],
  [290, 140, 4, LIME],
];

const R = Math.SQRT1_2;

function Bar({ x, y, len, w, color, wave }) {
  const dx = len * R;
  const d = wave
    ? `M${x} ${y} C${x + dx * 0.45} ${y - dx * 0.25}, ${x + dx * 0.55} ${y - dx * 0.75}, ${x + dx} ${y - dx}`
    : `M${x} ${y} L${x + dx} ${y - dx}`;
  return <path d={d} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" />;
}

function Arrow({ x, y, len, w, color }) {
  const dx = len * R;
  const hx = x + dx;
  const hy = y - dx;
  const head = 9;
  return (
    <g stroke={color} strokeWidth={w} strokeLinecap="round" fill="none">
      <path d={`M${x} ${y} L${hx} ${hy}`} />
      <path d={`M${hx - head} ${hy} L${hx} ${hy} L${hx} ${hy + head}`} />
    </g>
  );
}

function Chevron({ x, y, size, w, color }) {
  return (
    <path
      d={`M${x} ${y} L${x + size} ${y - size} L${x + size} ${y}`}
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

export function ClimbPattern({ className }) {
  return (
    <svg
      viewBox="0 0 390 340"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <g style={{ mixBlendMode: 'multiply' }}>
        {BARS.map(([x, y, len, w, color], i) => (
          <Bar key={`b${i}`} x={x} y={y} len={len} w={w} color={color} wave={i % 4 === 1 && w <= 14} />
        ))}
        {ARROWS.map(([x, y, len, w, color], i) => (
          <Arrow key={`a${i}`} x={x} y={y} len={len} w={w} color={color} />
        ))}
        {CHEVRONS.map(([x, y, size, w, color], i) => (
          <Chevron key={`c${i}`} x={x} y={y} size={size} w={w} color={color} />
        ))}
        {DOTS.map(([x, y, r, color], i) => (
          <circle key={`d${i}`} cx={x} cy={y} r={r} fill={color} />
        ))}
      </g>
    </svg>
  );
}

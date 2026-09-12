import { memo } from 'react';
import { ACCENT } from '../lib/tokens.js';
import { cx } from './ui.jsx';

/**
 * Front/back muscle map.
 *
 * The figure is drawn as filled masses rather than an outline, so a highlighted
 * muscle reads as part of the body instead of a patch floating on a wireframe.
 * Every group is an anatomy-shaped path on its real landmark: pecs fan from the
 * sternum, lats taper from the armpit to the waist, quads split into the three
 * heads you can actually see, the gastrocnemius has two.
 *
 * PROPORTIONS — the eight-head canon, on a 200 x 430 grid. Head height is 50,
 * the body runs 12 to 412, and each landmark below is one half-head apart.
 * Getting these wrong is what makes a figure look off, so change them only
 * together:
 *
 *   crown      12     shoulders  96     waist     178     knee      312
 *   chin       62     nipples   112     hip       196     calf      350
 *   neck base  76     navel     162     crotch    214     sole      412
 *
 * The crotch sits at the midpoint of the body's height — legs are half of a
 * human, and any less reads instantly as stubby. Visible neck is a quarter of a
 * head, not two thirds.
 *
 * Highlights fill `accent` at three opacities: 1.0 primary, 0.45 secondary,
 * 0.16 tertiary.
 */

const SKIN = 'var(--color-body-fill)';
const SKIN_SHADE = 'var(--color-body-shade)';
const CONTOUR = 'var(--color-body-line)';
const OUTLINE = 'var(--color-ink)';

/** Reflect an absolute path across the body's midline (x = 100). */
function mirror(d) {
  let index = 0;
  return d.replace(/-?\d*\.?\d+/g, (n) => {
    const value = Number(n);
    const flipped = index % 2 === 0 ? 200 - value : value;
    index += 1;
    return String(Number(flipped.toFixed(2)));
  });
}

const pair = (d) => [d, mirror(d)];

/* -------------------------------------------------------------------------- */
/* Silhouette                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Neck and torso are one path on purpose: as two shapes the torso's top edge
 * strokes a hard seam straight across the upper chest.
 */
const TORSO =
  'M88,60 C88,68 86,72 80,76 C64,80 50,86 44,98 C41,108 43,118 47,128 ' +
  'C51,140 55,152 58,164 C61,174 63,182 64,192 C63,202 61,210 62,218 ' +
  'C70,226 84,230 100,230 C116,230 130,226 138,218 C139,210 137,202 136,192 ' +
  'C137,182 139,174 142,164 C145,152 149,140 153,128 C157,118 159,108 156,98 ' +
  'C150,86 136,80 120,76 C114,72 112,68 112,60 Z';

/**
 * Upper arm and forearm as one tapered mass, fingertips reaching mid-thigh. The
 * inner edge runs roughly parallel to the outer one and tucks into the armpit —
 * an inner edge drifting the other way slices across the chest.
 */
const ARM =
  'M56,86 C42,92 34,104 33,120 C33,138 36,154 39,170 C41,188 41,206 43,222 ' +
  'C45,238 48,250 52,258 C58,260 63,256 63,248 C62,232 60,216 59,200 ' +
  'C58,184 58,172 59,158 C61,140 62,126 63,114 C62,100 60,90 56,86 Z';

const LEG =
  'M60,206 C53,226 50,250 52,274 C54,292 59,304 63,316 C65,332 66,348 68,360 ' +
  'C69,380 68,396 70,412 L92,412 C93,396 92,380 93,360 C94,346 96,330 97,316 ' +
  'C98,296 99,272 99,248 C99,230 99,216 99,206 C88,216 72,216 60,206 Z';

/**
 * Order matters: limbs first, torso over them. Drawn the other way round, the
 * tops of the arms and legs stroke a hard band straight across the hips and
 * shoulders.
 */
const SILHOUETTE = [...pair(LEG), ...pair(ARM), TORSO];

/* -------------------------------------------------------------------------- */
/* Muscle groups                                                               */
/* -------------------------------------------------------------------------- */

const FRONT = {
  traps: ['M80,76 C88,71 112,71 120,76 C114,86 108,90 100,90 C92,90 86,86 80,76 Z'],

  delts_front: pair('M56,86 C43,92 35,104 36,120 C46,127 57,122 61,110 C63,98 60,90 56,86 Z'),
  delts_side: pair('M38,106 C32,115 30,129 33,141 C41,146 49,140 51,129 C51,118 45,110 38,106 Z'),

  chest: pair(
    'M97,86 C86,82 71,83 63,90 C57,99 59,112 66,121 C76,130 89,133 97,130 ' +
      'C98,115 98,98 97,86 Z',
  ),

  biceps: pair('M44,132 C37,139 35,154 38,169 C43,177 50,175 53,166 C54,152 51,138 48,132 Z'),

  forearms: pair('M40,182 C34,192 34,210 36,226 C39,238 46,239 49,230 C51,212 48,192 44,183 Z'),

  abs: [
    'M85,134 C81,142 80,154 80,166 C80,180 83,193 89,202 C95,208 105,208 111,202 ' +
      'C117,193 120,180 120,166 C120,154 119,142 115,134 C105,130 95,130 85,134 Z',
  ],

  obliques: pair('M76,142 C71,153 70,168 72,182 C74,193 78,199 80,195 C78,181 78,163 79,148 Z'),

  quads: [
    // The three heads you can actually see: lateralis, rectus femoris, medialis.
    ...pair('M57,220 C52,240 51,262 54,284 C59,291 65,287 66,274 C66,254 63,232 61,218 Z'),
    ...pair('M73,218 C69,238 68,260 71,280 C76,286 81,282 81,268 C81,248 79,228 77,218 Z'),
    ...pair('M85,260 C81,274 81,290 85,300 C91,305 96,298 95,287 C94,275 90,265 85,260 Z'),
  ],

  adductors: pair('M90,216 C86,230 85,248 87,264 C91,269 95,264 95,250 C95,234 94,220 93,216 Z'),

  calves: pair('M63,330 C59,346 59,366 62,382 C66,387 70,382 70,370 C70,354 67,338 65,330 Z'),
};

const BACK = {
  traps: [
    'M80,74 C88,69 112,69 120,74 C127,86 131,100 128,114 C119,125 110,130 100,132 ' +
      'C90,130 81,125 72,114 C69,100 73,86 80,74 Z',
  ],

  rhomboids: [
    'M74,116 C84,124 92,128 100,129 C108,128 116,124 126,116 C126,128 120,139 112,145 ' +
      'C104,149 96,149 88,145 C80,139 74,128 74,116 Z',
  ],

  delts_rear: pair('M56,86 C43,92 35,104 36,120 C46,127 57,122 61,110 C63,98 60,90 56,86 Z'),
  delts_side: pair('M38,106 C32,115 30,129 33,141 C41,146 49,140 51,129 C51,118 45,110 38,106 Z'),

  lats: pair(
    'M62,122 C56,136 58,156 66,174 C74,185 82,183 84,172 C84,155 80,137 74,126 ' +
      'C70,121 65,120 62,122 Z',
  ),

  erectors: pair('M92,144 C89,160 89,176 92,192 L99,192 L99,144 Z'),

  triceps: pair('M42,132 C35,139 33,155 36,170 C41,178 49,176 52,167 C53,153 49,139 46,132 Z'),

  forearms: pair('M40,182 C34,192 34,210 36,226 C39,238 46,239 49,230 C51,212 48,192 44,183 Z'),

  glutes: pair(
    'M68,190 C59,201 57,215 64,226 C75,234 90,230 95,219 C96,208 94,197 91,189 ' +
      'C83,185 74,186 68,190 Z',
  ),

  hamstrings: [
    ...pair('M60,242 C55,258 54,280 58,298 C64,304 71,300 73,288 C75,270 73,252 69,240 Z'),
    ...pair('M81,244 C78,260 78,280 81,296 C86,301 91,296 91,284 C91,268 88,252 85,244 Z'),
  ],

  calves: [
    // Gastrocnemius has two heads; the inner one sits lower.
    ...pair('M59,332 C55,348 55,370 59,386 C65,390 70,384 70,372 C70,354 66,338 63,330 Z'),
    ...pair('M74,336 C71,352 71,368 74,380 C78,383 82,378 81,364 C80,352 77,342 76,336 Z'),
  ],
};

/** The few lines that do the most work: sternum, ab rows, knees, spine. */
const FRONT_DETAIL = [
  'M100,86 L100,132',
  'M85,148 L115,148',
  'M84,164 L116,164',
  'M84,180 L116,180',
  'M100,134 L100,200',
  'M64,310 C72,314 84,314 92,310',
  'M136,310 C128,314 116,314 108,310',
];

const BACK_DETAIL = [
  'M100,74 L100,194',
  'M66,196 C78,206 90,210 100,210 C110,210 122,206 134,196',
  'M64,310 C72,314 84,314 92,310',
  'M136,310 C128,314 116,314 108,310',
];

const OPACITY = { primary: 1, secondary: 0.45, tertiary: 0.16 };

function tierMap(muscles) {
  const map = new Map();
  for (const tier of ['tertiary', 'secondary', 'primary']) {
    for (const key of muscles?.[tier] || []) map.set(key, tier);
  }
  return map;
}

function Figure({ view, tiers }) {
  const shapes = view === 'front' ? FRONT : BACK;
  const detail = view === 'front' ? FRONT_DETAIL : BACK_DETAIL;
  const allPaths = Object.values(shapes).flat();

  const body = (
    <>
      <ellipse cx="100" cy="37" rx="20" ry="25" />
      {SILHOUETTE.map((d) => (
        <path key={d} d={d} />
      ))}
    </>
  );

  return (
    <svg viewBox="0 0 200 430" width="100%" className="block" aria-hidden>
      <g fill={SKIN} stroke={OUTLINE} strokeWidth="2.6" strokeLinejoin="round">
        {body}
      </g>

      <g fill={SKIN_SHADE}>
        {allPaths.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </g>

      <g fill={ACCENT}>
        {Object.entries(shapes).map(([key, paths]) => {
          const tier = tiers.get(key);
          if (!tier) return null;
          return paths.map((d, i) => <path key={`${key}-${i}`} d={d} fillOpacity={OPACITY[tier]} />);
        })}
      </g>

      <g fill="none" stroke={CONTOUR} strokeWidth="1.1" strokeLinecap="round" opacity="0.6">
        {allPaths.map((d, i) => (
          <path key={`c-${i}`} d={d} />
        ))}
        {detail.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {/* Re-stroked in the same order, so muscle fills never wash out an edge.
          The seams this leaves at the shoulder and hip are real boundaries. */}
      <g fill="none" stroke={OUTLINE} strokeWidth="2.4" strokeLinejoin="round">
        {body}
      </g>
    </svg>
  );
}

function LegendDot({ opacity, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="size-[9px] rounded-full" style={{ background: ACCENT, opacity }} aria-hidden />
      <span className="text-[11px] font-medium text-ink-muted">{label}</span>
    </div>
  );
}

export const BodyDiagram = memo(function BodyDiagram({ muscles, caption, className }) {
  const tiers = tierMap(muscles);

  return (
    <div className={cx('text-ink', className)}>
      <div className="flex gap-3">
        {['front', 'back'].map((view) => (
          <div key={view} className="flex min-w-0 flex-1 flex-col">
            <div className="caps text-center">{view}</div>
            <div className="mt-2.5">
              <Figure view={view} tiers={tiers} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-center gap-[18px] border-t border-[var(--color-body-frame)] pt-3.5">
        <LegendDot opacity={1} label="Primary" />
        <LegendDot opacity={0.45} label="Secondary" />
        <LegendDot opacity={0.16} label="Tertiary" />
      </div>

      {caption ? (
        <p className="mt-2.5 text-center text-[11px] font-medium text-ink-muted">{caption}</p>
      ) : null}
    </div>
  );
});

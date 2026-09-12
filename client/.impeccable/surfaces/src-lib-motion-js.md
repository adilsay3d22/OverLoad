---
version: 1
slug: "src-lib-motion-js"
primary_target: "src/lib/motion.js"
related_targets: ["src/App.jsx","src/screens/LogExerciseFocus.jsx"]
---

# Motion

Scope: app-wide. `lib/motion.js` (new), `App.jsx`, `styles/index.css`, `LogExerciseFocus.jsx`,
and the easing call sites in `Screen.jsx`, `charts.jsx`, `AddExerciseFlow.jsx`, `Home.jsx`,
`lib/tokens.js`. Visitor mode: **Operate** everywhere.

Performance budget, inferred rather than asked: the stated operating context is a mid-range
phone held one-handed in a gym. So transform and opacity only — nothing animates blur, shadow,
filter or layout, and no effect loops while the user is reading.

## Motion thesis

FOCAL MOMENT: **the set lands.** Checking a set off is the single act this product exists for,
and it had no acknowledgement whatsoever — the circle simply became lime. The fill now arrives
first and the tick seats into it a beat later, 140ms then 200ms, scaling from 0.4 with the
quintic curve. Weight settling, never bouncing. Un-checking reverses at exit speed, because
taking a plate off should not feel ceremonial.

CONTINUITY: **direction carries hierarchy.** Every route used to arrive with the same 8px rise,
so going deeper and coming back were indistinguishable. Pushing now arrives from the right and
popping from the left, which makes block → week → session read as movement through a structure
rather than as four identical fades. There is still no exit animation: gating unmount on one
stalls redirect-only routes, which is a re-render loop rather than a transition.

FEEDBACK: the existing `.press` scale, the rejected-set shake, and the ruler picker's haptic
already did this job and are left alone. Surfaces that had earned an authored entrance keep
exactly one each — Welcome's headline loading from weight 300 to 800, Home's spine drawing
down, the block matrix resolving week by week.

BUDGET: one curve (`EASE`, mirroring `--ease-out-quint`), five named durations, transform and
opacity only. Exits are always faster than entrances.

## The defect this pass actually found

Reduced motion was inverted. A blanket `prefers-reduced-motion` rule set
`animation-duration: 0.001ms !important` on every element, which killed the CSS feedback —
including the shake that tells you a set was rejected — while leaving every Motion-driven
animation running at full strength, because a JS-driven transform is not a CSS transition and
that rule cannot touch it. Only two components in the app honoured the setting at all.

The app is now wrapped in `<MotionConfig reducedMotion="user">`, so every Motion component
drops transform and layout animation while keeping opacity and colour, and the blanket CSS rule
is replaced by targeted ones: the skeleton shimmer stops entirely, the shake and the press
scale lose their movement, and colour and opacity transitions are deliberately preserved —
they are how a control confirms it heard you.

Measured, not assumed. Sampling the route wrapper's computed transform across 400ms after a
navigation: **37 distinct transforms at `no-preference`, exactly 1 (`none`) at `reduce`**, both
resting at `none` with the screen fully rendered. The route offset is additionally never
applied under `reduce`, because leaving it in the initial state painted one frame at 14px — a
single-frame jump is precisely the flicker this setting exists to prevent.

## Also fixed

The quintic curve was retyped as a literal in seven files. It now lives in `lib/motion.js`;
`lib/tokens.js` re-exports it for callers that already imported it from there.

## Unresolved

- Motion was verified on the route transition and by build. The set-landing acknowledgement is
  verified in source and by build but was not captured mid-flight; it needs a live session to
  film.
- `Sheet`, `TabBar`, `RestTimer` and `SessionActionButton` motion was audited and left as-is —
  each already explains a state change — but none was re-timed against the new duration scale.

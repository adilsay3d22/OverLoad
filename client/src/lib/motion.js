/**
 * The app's motion vocabulary.
 *
 * Overload is an Operate product used one-handed, mid-set, on a phone. Motion
 * here explains feedback, state and continuity; it never asks the user to wait
 * through choreography. Three rules hold everywhere:
 *
 *  1. One curve. `EASE` is the quintic deceleration already in `@theme` as
 *     `--ease-out-quint`; it was retyped as a literal in seven files before
 *     this. Nothing bounces — a bar that bounces is a bar you dropped.
 *  2. Exits are faster than entrances. Leaving should never feel like waiting.
 *  3. Transform and opacity only. The target device is a mid-range phone in a
 *     gym, so nothing animates blur, shadow or layout.
 */

/** Mirrors `--ease-out-quint` in styles/index.css. */
export const EASE = [0.22, 1, 0.36, 1];

/**
 * Durations named for consequence rather than for length, so call sites read as
 * intent. Values sit inside the bands the craft floor sets for each job.
 */
export const DUR = {
  /** Immediate acknowledgement: a control reacting under the thumb. */
  feedback: 0.14,
  /** A routine state change: a value settling, a mark arriving. */
  state: 0.2,
  /** Moving between screens or opening a surface over one. */
  view: 0.24,
  /** Leaving. Always quicker than arriving. */
  exit: 0.16,
  /** An authored entrance a surface has earned. Used sparingly. */
  focal: 0.6,
};

export const t = (duration, extra) => ({ duration, ease: EASE, ...extra });

/**
 * Route transition. Direction carries hierarchy: pushing deeper arrives from
 * the right, popping back arrives from the left, so the block → week → session
 * path reads as movement rather than as four identical fades.
 *
 * There is deliberately no exit animation. Gating unmount on one stalls
 * redirect-only routes, which is a re-render loop rather than a transition.
 */
export const routeVariants = (back, reduced) => ({
  // Under reduced motion the offset is never applied at all. MotionConfig
  // already refuses to animate it, but leaving it in the initial state paints
  // one frame at 14px — a single-frame jump, which is precisely the flicker
  // this setting exists to avoid. The fade stays: it still says the view changed.
  initial: reduced ? { opacity: 0 } : { opacity: 0, x: back ? -14 : 14 },
  animate: reduced
    ? { opacity: 1, transition: t(DUR.state) }
    : { opacity: 1, x: 0, transition: t(DUR.view) },
});

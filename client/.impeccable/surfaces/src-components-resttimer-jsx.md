---
version: 1
slug: "src-components-resttimer-jsx"
primary_target: "src/components/RestTimer.jsx"
related_targets: ["src/state/RestTimerContext.jsx","src/lib/chime.js","src/screens/LogExerciseFocus.jsx"]
---

# Rest timer

Scope: `RestTakeover` and the collapsed `RestPill` in `components/RestTimer.jsx`, the state they
read from in `state/RestTimerContext.jsx`, and the completion sound in `lib/chime.js`. Visitor
mode: **Operate**.

Audience: a lifter who has just finished a set, is holding or standing next to a loaded bar,
and will look at this screen from roughly arm's length, possibly several times, for between one
and five minutes. Constraint: nothing here may invent data. The last set and the next target are
passed in by `LogExerciseFocus` from what was actually logged and what the template actually
prescribes; when either is absent the screen degrades to "Set logged" / no target line.

## Direction contract

THESIS: Rest is not dead time to be measured, so it should not be presented as a measuring
instrument. The previous version was a tick dial around a seven-segment readout with nine
controls beneath it — a clock, standing alone, that told you nothing you could not get from the
phone's own timer. Rest is programmed: the template prescribes it per exercise, it sits between
one set and the next, and it is the single moment in a session with nothing to do. So the
screen shows the set that just closed above, the set the plan asks for next below, and the
time between them — and the space between those two facts closes as the rest runs down. How
long is left is legible from the size of a gap, at arm's length, without reading a digit.

This is also the one place in the product where the claim becomes visible: what the set
actually felt like (`felt RPE 8`) sits directly above what the next one is asked to feel like
(`target RPE 7`). Nowhere else in the app are those two numbers adjacent.

OWN-WORLD: Overload's committed dark takeover surface — `dark-bg`, `grid-texture`, `dark-muted`
labels at 10–11px / 0.16em, `dark-line-2` hairlines. Numerals are Outfit tabular at display
scale. Exactly one lime element on the screen: "I am ready", the thing you are meant to tap.
The exercise name is a muted caps label, not lime — DESIGN.md reserves lime for the tap target,
and an exercise name is identifying data.

STORY: You rack the bar, the takeover appears, and the gap is wide. You glance at it across the
rack and the gap is narrower. You do not read the number. When the two facts are pressed
against the rules, you pick the bar up. The chime is the backstop, not the signal.

FIRST VIEWPORT: session label and Exit at the top. Then, vertically centred: last set at 22px
bold, a hairline, the countdown at 84px (104px once it drops under a minute to bare seconds),
a hairline, the next target. Then −15s / Hold / +15s, the lime pill, and a quiet
`3:00 rest · Change` chip that opens the preset sheet.

FORM: The gap is distributed free space, not a pixel padding — four flex spacers whose growth
factors are driven by `remainingFraction`, capped at 96px each. That means the gap takes its
height from whatever room the screen actually has, so a short phone starts with a smaller gap
instead of pushing the controls off the bottom, and the takeover never scrolls. The countdown
sits in a `1fr auto 1fr` grid so the numeral is on the centre line and the unit hangs off it;
centring the pair instead pushed every digit left of centre by half the width of the word.

FINISH: verified across 390×844, 375×667 and 320×700, at both full and near-zero remaining,
and by driving the real set-completion flow with the write intercepted.

## Direction seed

`concept-seed --scope surface --mode operate` → seed `98a54240`, dealt indices **5, 1, 7**
(index 5 leads). Built **index 1**. The two set aside, and why:

- **Index 7 (the tick dial).** This is what was already shipped and what the user had just
  rejected by name. Rebuilding it would have been the one outcome the instruction ruled out.
- **Index 5 (the session receipt).** It reframes rest as a running ledger of the session so
  far. It reads well, but it buries the number the surface exists to show under content you
  only want between exercises, not between sets.

The user's own pinned direction for this surface was the tick dial; they released it explicitly
("you can change the whole design at your will if you want even though this decision choice was
mine"), so the pin is treated as withdrawn rather than overridden.

## Fixed in the second round

- The countdown was centred as a pair with its unit, which pushed the digits ~38px left of the
  screen's centre line at 390 and further at 320. Now a three-column grid.
- `reps` was set at 22px bold beside the rep count, so the word outweighed the number. Dropped
  to 15px muted, matching the `felt RPE 8` grammar on the set above.
- The gap was a fixed `paddingBottom`/`paddingTop` of up to 92px, which on a 667-tall phone
  would have overflowed into a scrolling rest timer. Replaced with free-space distribution.

## Fixed in the third round (reported from the device)

- **The "next" block named the wrong thing on the last set of an exercise.** The label was
  `Next · Set ${Math.min(setIndex + 2, targetSets)} of ${targetSets}`, so closing set 3 of 3
  produced "Next · Set 3 of 3" — the set just finished — and the target line repeated the
  prescription for the exercise being left. On the last set it now reads
  `Next · Barbell Bench Press · Set 1 of 3` with that exercise's prescription, which is the one
  moment the name matters: the lifter is about to walk to a different rack. On the last set of
  the last exercise the label is "Last set of the session" and the target line reads "Nothing
  left to lift".
- **The rest-length sheet rendered as a blank white card.** `Sheet` set `bg-bg` but no
  foreground colour, so opening it inside the takeover — whose root sets `text-white` — left
  every label white on a light panel. `Sheet` now declares `text-ink` on its panel. This was a
  latent bug in a shared component, not in this surface: any sheet opened from a dark context
  would have done the same.

Verified by driving the real flow in a headless browser with the set-write `PUT` intercepted at
the Request stage and fulfilled with a synthetic 200, so the app took the production code path
and the user's store was never written to.

## Carried from the earlier pass

- `primeChime()` fires inside the tap that starts the timer and `playChime()` on completion:
  iOS Safari has no `navigator.vibrate`, so the one moment the timer exists for used to pass in
  silence on an iPhone.
- Escape collapses the takeover to the floating pill rather than cancelling the rest — losing
  the countdown is not what the key means here.
- `useFocusTrap` backs the `aria-modal="true"` declaration; a live-region `sr-only` status
  reads the real `m:ss` regardless of which readout form is on screen.

## Unresolved

- `src/components/TickDial.jsx` is now orphaned — nothing imports it. Left in place rather than
  deleted, because this working copy is not under version control.
- The `lb` unit path is unverified; `weightLabel` handles it, but it has not been rendered.
- The preset list is a fixed 1 / 1.5 / 2 / 3 min, but a template can prescribe something else
  (Back Squat asks for 3.5 min). Changing the length is currently a one-way door: nothing in
  the sheet offers the programmed value back. Reported, not repaired.

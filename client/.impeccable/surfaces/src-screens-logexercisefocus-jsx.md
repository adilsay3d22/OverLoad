---
version: 1
slug: "src-screens-logexercisefocus-jsx"
primary_target: "src/screens/LogExerciseFocus.jsx"
related_targets: ["src/components/SetRegister.jsx","src/components/programs.jsx"]
---

# Logging an exercise

Scope: `LogExerciseFocus` and the `SetRegister` that carries weight, reps and RPE entry.
Visitor mode: **Operate**.

Audience: a lifter mid-session, phone in one hand, between two working sets, under time
pressure and often on poor signal. Constraint: nothing here may invent data. Reps and RPE are
proposed from the template; weight is proposed only from a real logged set. A proposal is drawn
muted and is not a record until the circle is tapped.

## Direction contract

THESIS: The one thing this screen exists for is entering three numbers, and every version
before this put something between the lifter and those numbers. So: no control at all. Each
number is the field — bare, centred, tabular, with a hairline under it that goes to 2px of ink
when the caret lands. The phone's own numeric keypad does the rest, because it is the fastest
and most familiar input on the device and nothing custom had beaten it.

OWN-WORLD: Overload's committed palette and type, composed in the hairline-and-label grammar
that `components/programs.jsx` already gives the Programs and Progress clusters — `SectionRule`
openers, 11px / 0.12em caps, `Rule` dividers, no containers anywhere on the route. DESIGN.md
records that vocabulary as Home-scoped and says not to migrate other screens toward it without
a decision; the user took that decision for this screen, asking for minimalism explicitly.

STORY: You rack the bar, glance down, see your last set already written in and the next row
waiting with hairlines under it. You tap the weight, type, tap the circle. The rest timer takes
over.

FIRST VIEWPORT: breadcrumb, exercise name at 30px, the plan as one line, then `SETS` and the
three rows — nothing else above the fold. Cue, muscles and history are reference material
below.

FORM: One row per set: index, three fields, a 44px commit target drawn as a 23px circle. Only
the set you are about to do carries rules under its fields and a full-ink row number; logged
sets are plain ink text, later sets are empty. Field sizes are container-query clamps
(`8.4cqw`, `6.8cqw`) so weight stays the largest number on the row and the whole line still
fits at 320px.

FINISH: verified at 390×844 and 320×700, in the populated, first-time and focused states.

## Direction seed

`concept-seed --scope surface --mode operate` → seed `e99a4fd4`, dealt indices **5, 3, 7**
(index 5 leads). The three were served on the decision page as The Written Set, The Thumb Sheet
and One Bank of Increments. The user locked **One Bank of Increments**, saw it built, and
rejected it. The user then pinned the direction directly — "I want minimalism ui ux experience,
no slider, no big blob, nothing, simple easy to use, that also looks good" — which beats the
roll, and which rules out both the bank and the ruler.

Three versions of this input existed. Recording all three, because the failures are the
argument for what shipped:

1. **Text input plus two ruler strips** (the incumbent). The rulers were 78px and 66px wide and
   showed three stops each. Three stops is not a ruler, it is a sliver of one.
2. **One Bank of Increments.** Plain numerals over four increment keys. Built, captured,
   rejected: the selected cell was a lozenge that read as a badge, the rows read as a printed
   receipt rather than anything editable, and four grey blocks were the loudest thing on the
   card while being the least meaningful.
3. **The Written Set.** `100 kg × 5 · RPE 7` as a sentence, with a full-width ruler under the
   number you touched, marked with the plan's value and last time's. Built and captured; cut by
   the user's brief, which excluded sliders. Its marker idea — the plan and last session drawn
   on the control itself — is worth recovering somewhere that is not a slider.

## Fixed after the first device pass

- **The rest timer started whenever a field lost focus.** A logged set saves itself on blur so
  a correction never needs a second tap, and that write carries `complete: true` — which the
  screen was reading as "a set just ended". Editing a digit in set 1 therefore threw up the
  countdown. `onSave` now takes a `{ rest }` flag that only the tick sets, so finishing a set
  and editing one are distinguishable at the call site rather than inferred from the payload.
- **The muscle diagram is gone from this screen.** Which muscles a back squat works is not
  something you look up while standing under the bar, and it was the largest and loudest block
  on a screen that exists to record three numbers. `ExerciseDetail` and `TemplateDetail` still
  carry it, which is where someone choosing an exercise would go looking.

## The ghost

Every set you have not logged yet opens showing what that same set was last session, dimmed,
**inside the field**:

```
      WEIGHT KG   REPS   RPE
 1      100        5      7    ✓     logged, full ink
 2      97.5       5      8    ○     dimmed, and next: it carries the rules
 3      95         4      9    ○     dimmed
```

It is the number the decision actually turns on — you are not choosing a weight in the
abstract, you are choosing whether to repeat last week's or beat it — and until now it lived on
the Progress tab, two taps away, at the one moment you cannot go and look.

Dimmed is load-bearing, not decoration: a number stays muted until you touch it or commit it,
so a suggestion can never be read back as something you logged, and a ticked row resolves to
full ink. One line under the register names the convention, because without it the dimmed
numbers read as targets the app has set for you rather than as your own last session — a
different and much worse thing to be handed. With no history it says so and the dimmed values
are the plan instead.

Two earlier treatments were cut. A run-on `Last time 97.5kg × 5 @ 7 · ...` line under the
register was the same three numbers in a form you had to parse, detached from the rows they
belonged to. A dedicated `LAST` line under each row fixed the parsing but doubled the height of
the register and printed every number twice on the row that was already proposed. In the field
is the same information with none of the furniture — the user proposed it, and it is better
than both.

## What the screen lost

Five stacked cards became four ruled sections. The three-box `SESSION TARGET` card — 3 / 5 / 7
in bordered tiles — is one line of text under the exercise name, which is both smaller and
closer to the RPE it is meant to be compared against. The history chart's metric toggle moved
into the section rule's action slot instead of sitting on its own row.

## Notes on the build

- The field's rest, focus and proposal colours are set as real style properties rather than
  Tailwind `focus:` variants. Tailwind resolves competing utilities by stylesheet order rather
  than by class-string order, and the resting border colour was winning over the focus variant;
  this is the second time that ordering rule has cost this project a bug.
- The app's global lime `:focus-visible` ring is suppressed on these fields and replaced by the
  ink underline. A 2px bar the width of the field measures 17:1 against the ground, which
  clears the focus-appearance bar on its own, and a rounded outline around a bare number would
  put back the box this design exists to remove.
- `implausible()` and its two-tap confirmation, the named empty-weight rejection, and the
  offline write queue all moved across unchanged.

## Unresolved

- `src/components/RulerPicker.jsx` and `src/components/TickDial.jsx` are both orphaned now —
  nothing imports either. Left in place rather than deleted, because this working copy is not
  under version control.
- **`BodyDiagram` still encodes primary, secondary and tertiary muscles as one hue at three
  alphas.** No longer this screen's problem — it was removed here — but the same component and
  the same finding are still live on `ExerciseDetail` and `TemplateDetail`.
- The floating session button overlaps the muscle diagram at the bottom of the viewport. It
  predates this work and affects every long screen.
- The capture script for this surface (`scratchpad/reg.mjs`) originally rewrote only the
  session `GET` and let other methods through. Its URL pattern also matches set `PUT`s, so a
  focus/blur during an earlier capture run wrote real values into the test account's seeded
  history: Back Squat set 1 went from `45kg x 1` to `22.5kg x 2`. The script now fulfils every
  non-GET locally instead of continuing it. Re-running `node server/scripts/seed.js` restores
  the fixture.
- The `lb` unit path is unverified: `toStoredWeight` handles it and the header label follows
  `units`, but it has not been rendered.

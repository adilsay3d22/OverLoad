---
version: 1
slug: "src-screens-progress-jsx"
primary_target: "src/screens/Progress.jsx"
related_targets: ["src/screens/PRHistory.jsx","src/screens/ExerciseDetail.jsx"]
---

# Progress

Scope: `Progress`, `PRHistory`, `ExerciseDetail`, plus the `Sparkline` and `LineChart` colour
defaults in `components/charts.jsx`. Visitor mode: **Operate**.

Audience: a lifter between sessions asking one question — are the numbers moving? Constraint:
nothing is stubbed to look populated; every figure comes from real logs.

## Direction contract

THESIS: This tab answers whether you are getting stronger, and nothing else. It used to open
on a 168px ring showing how much of the current program was complete — a progress ring standing
in for content, the hero-metric template, and an answer to a question this tab is never asked.
Completion belongs to Programs, where the block matrix now carries it. Progress leads instead
with a wall of small multiples: one lift per row, its best set, its direction, and its last
eight sessions plotted at a size you can actually read.

OWN-WORLD: Overload's committed system, and the same list grammar as the Programs cluster —
hairline rules, 11px / 0.12em labels at `ink-muted`, sections opened and closed by
`line-strong`. Data is drawn in ink: sparklines, the detail chart and the trend figures all
moved off lime, because DESIGN.md reserves lime for the single thing you are meant to tap and
a chart is never that. Direction is carried by an arrow and by weight, not by hue, so it
survives colourblindness.

STORY: You scan a column of arrows, see which lifts climb, tap one, and read its whole history
as two plotted series and a ruled session log.

FIRST VIEWPORT: `Progress` at 30px with one caps line of scoped totals. `PROGRESSION` opened by
a strong rule, group filter pills, then the small-multiple rows. Below the fold: the best lift
at display scale, then muscle balance.

FORM: Small multiples — one shared shape repeated per lift so the comparison is the layout
rather than a thing the reader has to do. `ExerciseDetail`'s four headline figures sit on one
ruled row for the same reason: four bordered chips in a 2×2 made them hunt, one row lets them
be read against each other. Code-led, authored directly; the cluster inherits the vocabulary
the Programs surface round (`b375763a`) already settled.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Verified with a read-only fixture

The live store holds one logged exercise, so the populated state could not be judged from real
data and switching or seeding data would have written to the user's store. `/api/progress*`
responses were rewritten in flight with eight synthesized lifts to inspect the populated
screens; the sparse real state was captured separately and degrades correctly. None of the
fixture numbers touch the app's data.

## Fixed here

- `Sparkline` and `LineChart` default to ink. Lime no longer identifies data anywhere in this
  cluster.
- The `#DDEAB4` / `#F4F9E4` PR card is gone; it hardcoded two hexes outside the token system.
- The newest-PR badge is ink, not lime.
- The header totals are labelled "This program", because `overall` is program-scoped while the
  exercise list is all-time — unlabelled, the two contradicted each other on screen.

## Unresolved

- **The `BodyDiagram` legend still encodes primary/secondary/tertiary muscles in lime.** Same
  rule, same violation, but it is a shared component used across several screens and the user
  has an open question about that diagram's quality; reported, not repaired.
- `.caps` still hardcodes `ink-faint` at 3.33:1 app-wide.
- Inspected at 390 with one 320 capture. Other widths and the `lb` unit path are unverified.

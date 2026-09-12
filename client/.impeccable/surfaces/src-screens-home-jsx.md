---
version: 1
slug: "src-screens-home-jsx"
primary_target: "src/screens/Home.jsx"
related_targets: []
---

# Home

Scope: `client/src/screens/Home.jsx`, the app's landing route. Visitor mode: **Operate**.

Audience: a lifter opening the app on the gym floor, one hand, in a hurry. Job: know which
session is next and get into it. Secondary: see where in the block they are.

Constraints: the bottom tab bar and the session FAB stay on this screen (user requirement).
`/progress/home` is the data contract. Every number comes from real logs — nothing stubbed.

## Direction contract

THESIS: Home carries its hierarchy in scale alone. It refuses the fitness-app default this
screen currently ships — greeting, day strip, hero card, stat trio, two lists — and removes
the container entirely: no cards, no borders, no boxes, no shadows anywhere on the route.

OWN-WORLD: Overload's committed system, unchanged — `#fafaf7` ground, `#14150f` ink, Outfit,
lime `#c6f24a`. The specimen world's monospace label register is translated into Outfit at
10px uppercase with 0.14em tracking and tabular numerals, because the handoff is binding and
a second face is not mine to add; the translation is the concession, named here. Structure is
hairline `--color-line` rules and one vertical spine at a fixed left inset. Lime appears
exactly once per screen state, on the thing you are meant to touch.

STORY: In one glance the lifter reads which session is next, what its first working set asks
for, and where the week stands. One action starts it. Everything else is subordinate by size.

FIRST VIEWPORT: Wordmark and profile as a 10px tracked-caps row over a hairline. `WEEK 03 / 08`
left. The session name flush-left at 52px, tracking -0.04em. A tracked-caps line carries type,
exercise count, set count. Then the next exercise: its name at 22px, and its target set as
enormous tabular numerals — `4 × 8` and `RPE 7` at 64px, each captioned in 10px caps beneath.
The lime Start pill sits under a hairline. Below the fold: `THIS WEEK` and `RECENT`, rows on
the spine, separated by hairlines only.

FORM: Scale Alone, fused from catalog challenger `variable-font-specimen`, verdict competitive,
chosen by the user over the dealt hand (indices 6, 1, 7 of seven grounded structures; The Deck
led). Seed key `d0f7a17a`, scope surface, mode operate, code-led.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Raises carried in from declined challengers

- **Tensegrity column** — four session states get four visibly distinct treatments: untouched,
  in progress, complete, missed. The incumbent screen shows three near-identical circles.
- **Mesophotic dive profile** — one vertical spine rules every row, so the week reads as a
  single run rather than a stack of independent cards.
- **Generative parametric identity** — the session type's colour drives that row's spine
  marker. It never touches the primary action: lime stays reserved for what you tap.

## Unresolved

- The card's own stated risk: with no containers, loading, empty and error states have nothing
  to sit in. They are built as hairline-bounded bars at the real type metrics, never as
  rounded skeleton boxes. Verify at the finish review.
- Progress and Programs still ship the incumbent card composition. Home will read as the odd
  one out until they follow; that is a known, accepted inconsistency, not an oversight.

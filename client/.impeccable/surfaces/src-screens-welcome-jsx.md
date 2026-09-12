---
version: 1
slug: "src-screens-welcome-jsx"
primary_target: "src/screens/Welcome.jsx"
related_targets: []
---

# Welcome

Scope: `client/src/screens/Welcome.jsx`, the pre-auth entry route. Visitor mode: **Persuade**.

Audience: someone deciding whether to make an account. Job: understand the offer and act.
Both auth paths stay visible — create account and log in — per the user's explicit brief.

Constraints: PRODUCT.md forbids testimonials, ratings, usage numbers, pricing and any claim
that Jeff Nippard endorses this app. The only usable proof is what is really in the box.
The handoff mockups (`screens/Overload Welcome v3.dc.html`, `Overload Welcome Sketch.dc.html`)
are references the user has explicitly released as non-binding for this screen.

## Direction contract

THESIS: The headline *is* the demonstration. "Lift more than last week." physically gains
weight as you watch — Outfit's variable axis driven 300 → 800 — so the screen performs
progressive overload in the first second instead of describing it. It refuses the category's
centred-illustration-in-a-circle welcome, and it refuses two things the incumbent shipped: a
fabricated "+7.5kg" result and three dots promising a carousel that does not exist.

OWN-WORLD: Overload's committed system, unchanged — `#fafaf7` ground, `#14150f` ink, Outfit,
one lime `#c6f24a` spent only on Create account. Outfit is reloaded as a true variable face
(`wght@100..900`) so weight becomes an animatable channel rather than five fixed stops. The
supplied `lifter.png` brush silhouette runs full-bleed and is deliberately cut by both screen
edges so it reads as a loaded bar too wide for the frame, and it sits on a hairline like an
object on a shelf. One dark `grid-texture` band carries the three true counts.

STORY: The visitor watches the claim get heavier, reads one sentence saying what the app does,
sees three verifiable facts about what is inside, and creates an account. Returning users see
Log in without hunting for it.

FIRST VIEWPORT: Wordmark flush-left over a hairline. The headline at 54px across three lines,
animating from weight 300 to 800 with tracking tightening as it thickens. One sentence of body
beneath. Then the lifter silhouette full-bleed, plates cut by both edges, standing on a rule
that runs the full width. Under the rule a dark grid-textured band: 160 / EXERCISES, 3 /
PROGRAMS, 8 / WEEKS EACH in tabular numerals. Then the lime Create account pill at 999px, then
"I already have an account. Log in."

FORM: Authored directly. The roll for this surface (seed `0dc239ed`, scope surface, mode
persuade, indices 4, 7, 2) was presented and the user withdrew from it, then briefed the
conventional entry-screen structure — hero, illustration, both auth paths — and asked for
something better than the references, so the dealt hand does not bind. One thing is carried
forward from that round: the declined chromatophore challenger's donation, type weight as a
data channel. That is also the exact ceiling the Home finish review named as never reached.
Code-led.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Rejected on purpose

- **The charcoal `sketch-dumbbells.png` wash.** The user offered it and left it optional. Two
  illustration styles on one screen compete, and the handoff's own Sketch mockup shows the
  drawing washing out to near-invisibility behind the type. One image, at full strength.
- **The progress ring and lime disc from v3.** The ring implies progress a brand-new visitor
  has not made, and the circle crops the brush artwork's best quality, which is its width.

## Unresolved

- PRODUCT.md records "onboarding that explains RPE" as a known gap. Removing the fake carousel
  dots does not close it; it stops lying about it. The gap stays open and stays recorded.

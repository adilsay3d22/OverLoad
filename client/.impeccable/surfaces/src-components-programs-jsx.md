---
version: 1
slug: "src-components-programs-jsx"
primary_target: "src/components/programs.jsx"
related_targets: ["src/screens/TemplateLibrary.jsx","src/screens/TemplateDetail.jsx","src/screens/BuildProgram.jsx","src/screens/ProgramLibrary.jsx","src/screens/WeeksGrid.jsx","src/screens/WeekEditor.jsx","src/screens/SessionEditor.jsx"]
---

# Programs sub-screens

Scope: the seven routes under the Programs tab — `TemplateLibrary`, `TemplateDetail`,
`BuildProgram`, `ProgramLibrary`, `WeeksGrid`, `WeekEditor`, `SessionEditor` — plus the shared
kit at `components/programs.jsx`. Visitor mode: **Operate** on all seven.

Audience: someone choosing, building, editing or switching a training block. Constraint: every
existing behaviour is preserved — sheets, long-press, drag-reorder, duplicate, clear, delete,
activate, rename — this was a presentation change, not a behaviour change.

## Direction contract

THESIS: One tab, one grammar. The seven screens spoke four different list vocabularies —
bordered cards, cards with 6px coloured left bars, a two-column grid of progress rings, and
plain rows — and every single one opened with a kicker above its heading, which the craft floor
bans without exception. The cluster now shares the grammar the Programs tab established: rows
separated by hairlines, one label register, and one way to draw a week.

OWN-WORLD: Overload's committed system. Labels are the shared 11px / 0.12em caps at
`ink-muted`, never the `.caps` utility, which hardcodes `ink-faint` at 3.33:1 and fails the AA
bar this product commits to. Structure is `line` between rows and `line-strong` opening and
closing a section. Category and session-type colour ride a 3px tick, never a 6px side border.
State uses the block matrix's ink ladder — solid, hollow, dot — so a week row on one screen
reads the same as a matrix row on another. Lime stays on the single action.

STORY: A block is something you can see the shape of at every scale: seven marks for one week
in a template row, seven marks per week in the weeks list, the whole 8×7 grid on the tab
itself. The same reading at three zoom levels.

FIRST VIEWPORT: Every screen opens Back (plus a breadcrumb in that row where one is needed),
then the heading with nothing above it, then one caps line of facts, then a `SectionRule` and
rows.

FORM: `ShapeStrip` is the cluster's own device and the reason it hangs together — it turns
"4 days/week" from a number into a rhythm, and it is the same object in the template library,
the build preview, the template detail and the weeks list. Code-led, authored directly; no
concept roll was run for the sub-screens because they inherit a surface whose roll (`b375763a`)
already resolved the vocabulary.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Encoding rules fixed here

- **A data colour never becomes a control surface.** `WeekEditor`'s weekday strip painted its
  buttons in session-type colour; it now uses the ink ladder, and the type colour appears on
  the session row where it identifies rather than acts.
- **Lime never identifies data.** `ProgramLibrary` and the Programs-tab spine now mark "Active"
  in ink, not accent.
- **No coloured side border above 1px.** Three screens carried 6px bars; all are 3px ticks.
- **Four inline actions per item became one overflow.** `ProgramLibrary` and `WeekEditor` now
  route management through a sheet, matching `WeeksGrid`'s existing long-press pattern.

## Server

`GET /catalog/templates` now returns `days` — the weekdays the block's first week trains —
so the library can draw each template's rhythm instead of printing a count.

## Unresolved

- `.caps` still hardcodes `ink-faint` app-wide. Every screen in this cluster now avoids it, but
  Progress, Profile and the logging screens still ship label text at 3.33:1. Reported, not
  repaired: it is a one-line change the user should own.
- The cluster was inspected at 390 only. 320 and the populated/empty variants of each screen
  have not been captured.

---
version: 1
slug: "src-screens-profile-jsx"
primary_target: "src/screens/Profile.jsx"
related_targets: []
---

# Profile

Scope: `client/src/screens/Profile.jsx`, plus the destructive colour tokens added to
`styles/index.css` and converted across five files. Visitor mode: **Operate**.

Audience: someone changing a preference, exporting their data, or leaving. Constraint: the
reset action is irreversible and must stay unmistakable without being decorated.

## Direction contract

THESIS: Settings are a list, not a stack of boxes. Every preference sat in its own bordered
card containing another control, so three preferences read as three containers before they read
as three settings. They are now rows on the same hairline grammar as the rest of the app, and
the account figures sit on one ruled row rather than three stat boxes.

OWN-WORLD: Overload's committed system. The destructive palette finally has names —
`--color-danger`, `-hover`, `-wash`, `-line` — because it already existed as four hex literals
repeated across five files while DESIGN.md's own Do list says every colour comes from `@theme`.
The values are unchanged, so nothing outside this screen shifts. The danger zone is marked by
its own rules and its label rather than by a tinted panel: a red box around a paragraph is
decoration, a red rule and a red button are the warning.

STORY: Find the setting, change it in place, and if you are here to wipe the account, read
exactly what goes and what stays before the button will let you.

FIRST VIEWPORT: Avatar, name, email. Three figures on a ruled row — sessions, weeks, records.
`PREFERENCES` and its three settings, each a label, a sentence, and its control.

FORM: Authored directly, inheriting the list grammar the Programs and Progress clusters already
settled. Code-led.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Removed

- **A note shipped to users** reading "Profile had no design pass in the last session, so this
  is built from the app's existing patterns rather than invented." That is a message to the
  team, rendered on the account screen of a product.
- Four hardcoded hexes in the danger zone, and eight more of the same values across
  `AddExerciseFlow`, `DeleteButton`, `Sheet`, `ui.jsx` and `LogExerciseFocus`.
- The bespoke rest-preset buttons, which duplicated `TogglePills` with slightly different
  padding and states; they are `TogglePills` now.
- Lime initials in the avatar. The user's initials are not an action.

## Unresolved

- **DESIGN.md does not yet record the `danger` tokens.** They are a genuine system addition,
  not drift, and the next `document` run should capture them.
- Dark mode and notification settings remain unbuilt and unpromised, as before.
- `.caps` still hardcodes `ink-faint` at 3.33:1 app-wide.

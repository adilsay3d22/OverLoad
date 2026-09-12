# Overload — implementation notes

A working React + Express build of the Overload design handoff. `docs/design-handoff.md` is the
design specification; this file covers how the app runs, how it is put together,
and which open questions from `requirements.md` were resolved and how.

---

## Running it

```bash
npm install
```

```bash
npm run dev
```

The Vite client serves on **5173** and proxies `/api` to the Express API on **4000**.

Ports come from `OVERLOAD_PORT` (API) — deliberately not `PORT`, because dev
launchers inject that for the web server and the API would silently fight Vite
for the same port.

Production:

```bash
npm run build && npm start
```

Express serves `client/dist` and hands every non-API path to the router.

### Demo data for development

```bash
node server/scripts/seed.js
```

Seeds one account — `dessa@ironwork.dev` / `deadlift842` — on the Upper/Lower
program with three weeks of back-dated sets, so Progress, PR History and Exercise
Detail have real history to work against. Run it with the API stopped: it writes
the store directly, and a running server would flush its own in-memory state over
the top.

It is a developer tool, not shipped content. Nothing invokes it automatically —
`npm run dev` and `npm start` only launch the server — and `server/data/` is
gitignored, so a fresh clone has no accounts, no programs and no logs. **A user
signing up for the first time must see the real empty states**: "No program yet"
on Home, the two-tile chooser on Programs, "Nothing to chart yet" on Progress, a
zeroed stat row on Profile. Keep it that way; seed your own machine, never a
build you are handing to someone.

---

## Shape of the code

```
server/
  src/lib/catalog.js    exercises.json + templates.json, normalised
  src/lib/muscles.js    the muscle-map dataset (requirements §4.4)
  src/lib/progress.js   every derived aggregate (§4.6)
  src/lib/db.js         JSON store, debounced atomic writes
  src/routes/           auth · catalog · programs · logs · progress
  scripts/seed.js       demo data
client/
  src/styles/index.css  the design tokens, as Tailwind v4 @theme
  src/components/       ui primitives, charts, body diagram, rest timer
  src/state/            auth, active program, rest timer
  src/screens/          one file per screen
```

Stack: React 19, React Router 7, Tailwind v4, Motion 12, Phosphor icons,
Express 4, bcrypt + JWT. Persistence is a single JSON file (`server/data/`) —
swap `db.js` for a real database without touching anything else.

### Data flow

`exercises.json` and `templates.json` are read once at boot and normalised.
Starting a program deep-copies the template into a user-owned document with
fresh ids, so editing your program never mutates the template.

---

## Data-model decisions

**`repsMin`/`repsMax` → `reps` + `rpe` (§4.1).** Done once, at import, in
`normalizeExerciseEntry`. Nothing downstream ever sees a rep range, so there is
no half-migrated state to trip over. Templates that shipped `repsMin: 5,
repsMax: 5` collapse to `reps: 5`.

**Actual RPE per logged set (§4.2).** `sets[].actualRpe`, stored beside weight
and reps and kept distinct from the plan's target `rpe`. The focused logging
screen says so in plain text under the table.

**Program identity on log entries (§4.3).** Every log document records
`programId`, `programName`, `weekIndex`, `sessionId` and `entryId`. Week-1-Monday
of a finished program can no longer collide with Week-1-Monday of the next one,
which is what all-time progress needed.

**Body diagram (§3.6).** The handoff called this the most ambitious illustration
in the design session and told whoever built it to expect iteration; that was
accurate. `client/src/components/BodyDiagram.jsx` draws the figure on a
200 x 420 grid as filled masses — torso, arms, legs, head — rather than an
outline, so a highlighted muscle reads as part of the body instead of a patch
floating on a wireframe. Landmarks are documented at the top of the file
(shoulders 112, navel 190, hip 250, knee 330) so anything added later lands in
the right place.

Three things that took iterating to get right, and will bite again if the
geometry is touched: neck and torso must be **one** path, because as two shapes
the torso's top edge strokes a hard seam across the upper chest; the arm's inner
edge has to run roughly parallel to its outer edge and tuck into the armpit,
because an inner edge drifting the other way slices through the pec; and the
torso has to stop around y=270, or the legs come out stubby.

**Muscle map (§4.4).** `server/src/lib/muscles.js` maps anatomical muscle names
to the diagram's region keys, with a per-category fallback for exercises the
library does not cover. Template exercises ship `exerciseId: null`, so they are
matched back to the library by name inside their own category — 43 of the 49
distinct template exercises resolve. A cross-category fuzzy hit still links for
display but is *not* trusted for anatomy, so "Cable Tricep Kickback" never
borrows the glute kickback's muscles. Tertiary highlights are derived: compound
lifts brace the trunk, pulls work grip, squats and hinges load calves and glutes.

**Units (§4.5).** A real preference on the account. Weights are always stored in
kilograms; `lb` only changes what you type and read. The toggle lives on Profile.

**Derived aggregates (§4.6).** All computed in `progress.js` from the log, none
stubbed: sessions completed, sets logged, best PR (weight × reps), day streak,
percent complete, muscle-group balance, per-exercise history and Epley 1RM.

A session counts as complete when every planned exercise has all its target sets
checked. "Next session" is the first started-but-unfinished session, else the
first unstarted one — the same value drives the Continue Training card, the
floating action button and Home's hero.

---

## Open questions from the handoff, and what was decided

**Rest timer, banner vs full-screen (§3.7).** Resolved as one timer with two
presentations, and **full screen is the default** — the deliberate moment between
sets. Exiting it does not stop the clock: the timer collapses into a mini pill
that floats at the top of every screen, so you can browse the app while resting,
and tapping the pill goes back to full screen. That replaces the old inline
banner, which only existed on the focused logging screen.

The takeover carries one-tap rest presets (1 / 1.5 / 2 / 3 min) alongside ±15s,
pause and skip. `+15s` raises the total so the progress display never overflows;
`−15s` only takes time off the clock. The deadline is an absolute timestamp
mirrored into `localStorage`, so the countdown stays accurate across navigation,
remounts and reloads.

The display is `client/src/components/TickDial.jsx`: a ring of 60 tick marks
around seven-segment numerals. Ticks light clockwise from twelve o'clock and burn
back down; the boundary tick is drawn at partial opacity for the fraction of
itself that is left, so on a three-minute rest — where one tick is three seconds —
something still moves every frame. Under a minute the readout drops to a bare
seconds count labelled SEC, which is the stretch you actually watch.

The numerals are drawn as real seven-segment polygons (mitred hexagons, unlit
segments left faintly visible the way an LCD does) rather than set in a font,
because no segmented face ships on Google Fonts and the segment shapes are the
whole character of the design.

Profile still lets you choose which presentation a checkmark opens (Full screen /
Floating pill). Accounts created before the pill existed stored `banner`, which
the API maps to `mini` on read.

**Welcome screen (§3.12).** The charcoal-sketch direction was never resolved, so
this uses the earlier fully-resolved flat illustration — progress ring, barbell,
connector line to a stat badge, aligned sparkles — as the handoff itself
recommends. The `sketch-dumbbells.png` asset is copied into `client/public/assets`
and unused, ready if that direction is revived.

**Profile (§3.13).** No design existed, so it is assembled from patterns already
in the app rather than invented: avatar header, the 3-up stat row, and settings
rows. The screen says so on itself. Dark mode and notifications are still open.

**Per-week progress rings (§3.3).** The handoff kept these honestly stubbed at 0%
because progress tracking did not exist. It does now, so they show real
completion.

**Session types.** `templates.json` carries no session type, so it is derived
from each session's exercise mix (Upper / Lower / Core / Full Body) and
re-derived whenever you add or remove an exercise.

**Exercise tiers.** `tierRank` is a quality score, not a position — S+ sits at
7–8 and F at 2 — so the search list sorts it descending, and picking a C, D or F
exercise shows a short warning rather than blocking it.

Explicitly **not** built, per §5: the isometric dot-matrix Training Volume chart,
the Program Overview week-pill row, the unfiltered Exercise Progress list, the
Average RPE trend, the 2×2 overview grid, and Total Volume as the third program
stat.

**Template preview.** Tapping a card in the template library opens
`/programs/templates/:id` rather than starting the program on the spot: every
week's sessions, each session's exercises with its sets, reps, target RPE and
rest, and a sheet per exercise carrying the coaching cue and the muscle map.
`GET /api/catalog/templates/:id` already returned the whole normalised program,
so this needed no server work. "Use this program" lives on that screen now, and
warns which program it is replacing when one is already active.

**Saved programs.** `/programs/library` lists every program the account has
started — active one first — with its completion, what is up next, and the
ability to switch between them, rename one, or delete it. Reached from the
Programs tab in both its active and empty states.

Deleting removes the plan, not the history: log entries carry their own
`programId`, so sets logged against a deleted program still count towards
all-time PRs and Exercise Progress. Deleting the *active* program promotes the
next most recently created one, so you are never left with saved programs and
nothing active. Confirmation reuses the expand-to-confirm `DeleteButton`.

**Copying.** Three levels, all sharing one rule — a copy gets fresh ids the whole
way down, never shares an id with its source, and carries the plan only:

- **Program** — `POST /programs/:id/duplicate`, from the Duplicate button on
  each card in `/programs/library`. The copy starts inactive with a clean
  slate (no logged sets), because logs stay bound to the program they were
  logged against.
- **Session** — `POST /programs/:id/weeks/:w/sessions/:sid/duplicate`, from the
  copy icon on each row in the Week Editor. A two-step sheet: pick the target
  week, then pick the day it lands on — days that already hold a session are
  greyed and named, so you can see what is in the way. Landing in its own week
  the copy takes a "(copy)" name; sent to another week it keeps its own, because
  there it is that week's version of the same session. The body's `day` is
  validated server-side as well as in the UI, so a stale view cannot double-book
  a day; omitting `day` still falls back to the first free one.
- **Week** — the long-press Clone action on the Weeks Grid, which predates these.

**Resizing a program.** `totalWeeks` is no longer fixed at creation. The Weeks
Grid has an "Add week" tile (`POST /programs/:id/weeks`, capped at 16), and the
long-press sheet offers "Remove week N" — but **only on the last week**
(`DELETE /programs/:id/weeks/:week`). Dropping a week from the middle would
renumber every week after it, and logged sets record the week index they were
logged in, so they would all start pointing at the wrong week. Appending and
popping never shift an existing index. Removing a week keeps its logged sets,
the same as deleting a session or a program.

Copy names never stack suffixes: duplicating a "(copy)" yields "(copy 2)", not
"(copy) (copy)".

---

## Logging reps and RPE

Reps and RPE are not inputs — they *are* sliders. `RulerPicker` renders a
number strip inside the table cell where a field would go, centre value bold
under a needle, neighbours faded. Reps run 1–30 in whole numbers; RPE runs 1–10
in halves, because the plans themselves prescribe halves (RPE 7.5 targets are
common) and integers could not record what was felt. Every stop crossed fires a
short `navigator.vibrate(8)`, which is what makes them usable without looking.

Both open on the planned value, so hitting your target means typing a weight and
tapping the check. Only weight has to be entered; the sliders always hold a
value. Weight stays a keypad — it is unbounded and moves in finer steps than a
ruler could show.

Scrolling is native, so momentum, keyboard arrows and accessibility come free.
Three things had to be handled around that, and all three caused real bugs:

- **A mouse cannot swipe an overflow container.** Pointer-drag and wheel
  handlers cover desktop; dragging left reveals higher numbers, like a dial.
- **`scroll-snap-type: mandatory` re-snaps on every programmatic `scrollLeft`
  write**, turning a drag into a fight and dropping stops — a four-stop drag
  moved three the wrong way. Snapping is relaxed while a pointer or wheel
  drives, then restored to settle on the nearest stop.
- **Positioning the strip fires scroll events of its own.** A time-based guard
  is not enough: those events arrive a frame or more later, get read back as a
  swipe, and drift every slider off the planned value on load. Only a real
  gesture may emit a change — `gesturing` opens on pointer/touch/wheel and is
  held open while a fling keeps scrolling.

---

## The action button

`client/src/components/SessionActionButton.jsx`, driven by
`client/src/state/ActiveSessionContext.jsx`:

- **Idle** — the dumbbell glyph. Tapping goes *straight into logging* the first
  unfinished exercise (`sessionProgress().nextExerciseIndex`), not the plan
  screen, which was a step in the way.
- **Training** — the elapsed clock with a pulsing ring. Tapping returns you to
  the exercise you left, which the context remembers as you move through the
  session.
- **Held** — a long press (550ms, with a ring that fills over the hold so the
  gesture shows itself) pauses and resumes, with a haptic and a spring pop.

Elapsed time is `accumulated + (now - runningSince)`, not `now - startedAt`, so
pausing banks the time so far and resuming continues from there instead of
jumping forward by however long you were paused.

A session starts when you enter its logging flow and stops the moment every
planned set is checked, so the clock is derived from real progress rather than
something you have to remember to stop. Both logging screens set it, because the
focused screen can be reloaded directly without the summary ever mounting, and
`start()` is idempotent — re-entering the same session keeps its original start
time instead of restarting from zero. The start timestamp is absolute and
mirrored into localStorage, so elapsed time survives navigation and reloads, and
a session left open longer than six hours is treated as abandoned.

Minutes keep counting past 60 rather than rolling into hours: "72:15" cannot be
misread the way "1:12" can in a control that also shows rest countdowns.

> Consume `start`/`end` from the context, never the whole object — it changes
> every second as the clock ticks, so an effect depending on it runs once a
> second.

---

## Resetting an account

Profile's danger zone has a **Reset Everything** button that clears every program
and logged set on the account — progress, PRs and streaks with them. The login
and its preferences survive; Export data is the way to keep a copy first.

`DELETE /api/auth/me/data` does the work. The button is
`client/src/components/DeleteButton.jsx`, a port of the shadcn `NativeDelete`
component: same expand-to-confirm interaction and spring motion, rebuilt on this
app's primitives. This is not a shadcn/TypeScript project — no `cn`, CVA, Radix
Slot or lucide — so the port uses `cx`, Phosphor icons and the palette's own
`#B8401F` rather than a `bg-destructive` token that does not exist here. It also
accepts a promise from `onDelete` and holds its expanded state until the request
settles, which the original had no need for.

## Things worth knowing before extending it

- **Back must replace, never push.** `BackButton`'s `to` uses
  `navigate(to, { replace: true })`. Pushing the destination instead turns any
  two screens that link to each other into a loop — the template library popped
  with `navigate(-1)` while the template detail pushed the library back on, so
  back bounced between them forever with no way out to the tab bar. Every screen
  reached from a tab now unwinds to that tab in a fixed number of taps.
- **Guard mutations with a ref, not `useState`.** Several taps land in one tick
  before React flushes, so every one of them reads the same stale `busy === false`
  and fires. This shipped as a real bug: three taps on "Delete session" sent three
  DELETEs, the two 404s threw inside an un-caught async `onClick`, and the sheet
  stuck open forever. `inFlight = useRef(false)` updates synchronously and closes
  the hole; the `useState` flag stays, but only to drive the label and disabled
  state.
- **Don't await `refreshActive()` before closing a sheet.** It only feeds the tab
  bar's action target and swallows its own errors, so awaiting it just adds a
  second round trip during which the sheet sits there looking broken.

- **Layout.** Mobile-first: the app owns the viewport below 1024px. Above it, the
  phone column sits beside a quiet brand panel rather than floating alone.
- **The tab bar is app chrome, not a layout route.** It renders once in the
  shell, outside the animated routes, so navigating never unmounts it and the
  active indicator slides between tabs instead of re-entering. Every signed-in
  screen has it; only `/welcome`, `/login` and `/signup` go without. `Screen`
  therefore defaults to `tabBar: true` and reserves 108px at the bottom — any
  new screen clears the bar without doing anything. `ProgramProvider` sits above
  the router so the bar can read the action target, and sits out fetching until
  there is a session.
- **`sets` means two things.** On a plan entry it is the numeric target; on the
  logging endpoint it is the array of logged rows and the target moves to
  `targetSets`. `prescription()` and `targetSetCount()` accept both shapes.
- **Route guards.** `Navigate` re-runs its effect on every render, so never pass
  it a freshly built `state` object — that pushes a new location each pass and
  never settles.
- **Utility naming.** The uppercase section label is `.caps`, not `.overline` —
  Tailwind ships an `overline` text-decoration utility that wins the cascade.
- **Offline.** Sets persist one at a time as they are checked, which is the right
  granularity for a queue, but the offline write queue described in the handoff
  is not implemented — a failed save surfaces inline and the set stays unchecked.

## Home, and why it looks unlike the rest of the app

Home was redesigned away from the composition every other screen still uses —
greeting, coverflow day strip, hero card, stat trio, two lists. That arrangement
is what this whole product category ships, and it made the app's most-visited
screen its least distinctive. The replacement carries hierarchy in **scale
alone**: there is no card, border, box or shadow anywhere on the route.
Structure is hairline rules plus one vertical spine, and the 6.4:1 jump from the
target numerals (64px) to the labels naming them (10px) does the work a
container used to do. The hero display is 52px.

The pieces that matter if you touch it:

- **One spine, one inset.** Every row hangs off a single vertical rule at
  `SPINE_INSET` from the content edge, and the state markers are centred on the
  rule itself. That is what makes the week read as one continuous run instead of
  a stack of independent rows. The spine fades out over its last 56px — on a
  short state (no program yet) a hard terminal reads as a truncated element.
- **Lime appears exactly once per state.** It is reserved for the one thing you
  are meant to tap. Session-type colour rides the spine markers instead, so the
  week keeps its variety without a second element competing for the tap. This
  rule is easy to break by accident: an earlier pass painted the in-progress
  row's hairline lime, which put the loudest rule on the screen under something
  that was not the primary action.
- **Only section headings get `line-strong`.** Rows use the default `line`. When
  a row's own rule was also strengthened, the heavier hairlines above and below
  it enclosed the row — a container rebuilt out of rules, which is exactly what
  this composition exists to avoid.
- **One authored motion moment.** The spine draws down and nothing else on the
  route animates. Six identical section fades were tried first; an identical
  entrance on every section is a waterfall, not an authored moment, and it
  diluted the one gesture that carries the idea.
- **No kicker above any heading, in any state.** Including the loading state —
  `HomePending` shipped one after the loaded view had lost it.
- **Four session states, four different marks.** Filled lime square is complete,
  a rotated filled square in the session-type colour is in progress, a hollow
  square is upcoming, a dash is missed. They differ in *shape*, not only tint:
  two filled squares in different colours are indistinguishable at arm's length,
  which is the only distance that matters here.
- **Missed is derived, not stored.** A planned session whose weekday has passed
  with nothing logged. `sessionState()` owns that rule.
- **The week is always seven rows.** Rest days occupy their line, so the week
  reads as a week rather than as three sessions floating in space.
- **Loading and empty have no skeleton boxes.** With no containers there is
  nothing for a rounded grey box to be, so the labels and rules that are already
  known render immediately and only the unknown values are bars set at the real
  type metrics they will be replaced by.

### Contrast: `ink-faint` does not clear AA

`--color-ink-faint` (#8a8a82) measures **3.33:1** against the #fafaf7 ground.
PRODUCT.md commits the product to WCAG 2.2 AA, which wants 4.5:1 for text this
size. `--color-ink-muted` (#6e6e66) measures 4.92:1 and does clear it.

Home no longer uses `ink-faint` anywhere. **The rest of the app still does**,
mostly through the shared `.caps` utility, which hard-codes `ink-faint` as its
colour. That is a real, open accessibility bug across every other screen, left
unrepaired here on purpose rather than swept into an unrelated redesign. Fixing
`.caps` to `ink-muted` is a one-line change that would move the whole app onto
the right side of the line.

### Server

`GET /progress/home` now returns `hero.next` — the exercise logging would resume
on, with its name, category, sets, reps, RPE and rest — plus `hero.exercisesDone`.
Home leads with the exact set you are about to do, so it needs the exercise, not
just the session containing it. It reads `sessionProgress().nextExerciseIndex`,
which already existed for the action button.

### Design record

The direction contract for this screen lives at
`client/.impeccable/surfaces/src-screens-home-jsx.md`. It records what the
composition refuses and why, and two accepted risks: that Progress and Programs
still ship the old card composition and Home will read as the odd one out until
they follow, and that container-less states had to be solved rather than assumed.

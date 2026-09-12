# Overload — Design Update & Claude Code Handoff (Design Session 2)

> This document captures a Claude Design exploration session that happened
> **after** the app was already functionally built (see the original
> `Overload-Requirements-and-Prompts.md`). It is **not** a clean, fully
> reconciled spec — several pieces below are explicitly flagged as
> unresolved, conflicting, or dropped mid-iteration. Read the whole thing
> before generating any code from it, and follow §6's staged order rather
> than attempting all of this in one pass.
>
> The short version: this is a real rebrand (color, type, navigation model)
> plus several genuinely new screens and a couple of real data-model
> changes — some of which are prerequisites for other parts of this to
> even work correctly. Treat it that way.

---

## 1. The visual identity shift

- **Accent color**: coral (`#FF4E1A`) → **lime-green**. No exact hex was
  locked in during this session — sample it directly from the design
  mockups rather than guessing, and pick one canonical value before
  touching any code.
- **Display font**: the heavy **condensed uppercase** display font used
  everywhere in the built app → a bold, **rounded** (not condensed)
  display font in the new mockups. This is a real typographic shift, not
  a weight/size tweak.
- Everything else — warm off-white background, rounded cards, soft
  shadows, colored category tags — is consistent with what's already
  built. Good continuity there; this is not a full teardown.

**Decision needed before building anything**: are we fully switching the
live app's design tokens to this new identity, or maintaining both as
parallel explorations for a while? This document assumes the former (full
switch), since that's what "handing everything to Claude Code" implies,
but confirm that's actually the intent first.

---

## 2. The navigation model changes entirely

The built app currently has **no persistent navigation** — it's
screen-to-screen with a back arrow only (`TopBar`'s `back` prop). This
session designed a full **bottom tab bar**, present on every primary
screen:

**Home / Programs / [floating center action button] / Progress / Profile**

- The floating center button is a raised, circular, lime-green button
  sitting above the tab bar — its job is "jump straight into the current
  session's plan" (confirmed: it opens the session's **plan** screen, not
  logging directly — matches the "View Session" behavior on the Programs
  tab's Continue Training card).
- This means **Home's role changes**. Today, `Home.jsx` *is* the whole
  "here's your program" experience. In the new model, Home becomes a
  lighter **digest** screen (day-strip preview, one hero session card,
  a few stats, this week's sessions), while the **Programs tab** becomes
  where you browse the full program structure (this maps closely to the
  existing `Program.jsx` → `WeeksGrid.jsx` → `WeekEditor.jsx` flow, just
  now reached via a tab instead of a dashboard button).
- **Profile tab was explicitly dropped** for this round — see §4.12. It's
  still one of the four tabs conceptually, but has no design behind it yet.

---

## 3. Screen inventory — what's designed, and what it actually implies

### 3.1 Home tab (new design, replaces today's `Home.jsx` logged-in view)

- A **swipeable day-strip carousel** at the top: pill-shaped day cards
  with a coverflow-style size hierarchy (selected day is visibly larger
  than its neighbors, which shrink and fade further out). Days with a
  scheduled session get a thin ring colored by session type (reusing the
  existing `sessionTypeColor()` system); rest days stay plain.
- Swiping the strip updates a small, secondary preview line below it
  (session name + type tag, or "Rest day").
- **Separate from that**, a static, more prominent hero card — "This
  Week" / current session name + type tag + a **sets-logged slider**
  ("8 Sets Logged" / "10 Remaining"). This card always reflects the
  actual current session, independent of whatever day is selected in the
  strip above it. (Confirmed explicitly: the day-strip does **not**
  replace this card.)
- A row of 3 small stat cards: current week number, sessions completed
  this week, day streak.
- A "This Week's Sessions" list (name, type tag, exercise/set count,
  checkmark or empty state).

**Data this needs that doesn't exist yet**: "sessions completed this
week," "day streak," and per-day completion status for the day-strip
rings all require real progress computation from `overload.log`, which
isn't built (see the original requirements doc, §3.1/3.2). None of this
screen can show real numbers until that exists — this is design ahead of
the build, same as before.

### 3.2 Programs tab (new design, maps onto existing `CreateProgram.jsx` / `Program.jsx`)

**Empty state** (no active program): two equally-weighted tiles —
"Choose from Template" and "Build Custom Program" — stacked, neither
visually dominant over the other (confirmed explicitly).

**Active state**:
- Program name, type (Template/Custom), and stat chips (total weeks,
  weeks built so far)
- A **"Continue Training"** card — the visual focal point of the screen —
  showing the next/current session with a **"View Session"** button
  (confirmed: opens the session's plan screen, not logging directly)
- A **"View All Weeks"** button below it
- A de-emphasized **"Start a new program instead"** text link near the
  bottom (confirmed: intentionally low visual weight — switching programs
  is rare, continuing one is common)
- A **"Program Stats"** row: **Sessions Completed**, **Sets Logged**, and
  a **Best PR** trophy card (exercise name + "weight × reps" as the
  headline stat, e.g. "50kg × 20", formula is weight×reps — confirmed
  explicitly this is the *right* card, not Total Volume)

**Rejected during iteration, do not build**: a "Program Overview" section
showing a horizontal row of small week-number pills (built/empty/current
states) — this was proposed to fill empty space on the screen and
explicitly rejected as redundant with the Weeks Grid it links to.

**Data this needs**: Best PR requires scanning all logged sets for this
program and finding the max weight×reps value, with the specific
exercise/weight/reps that produced it. Sessions Completed / Sets Logged
need aggregation from `overload.log`. None of this exists yet.

### 3.3 Weeks Grid (existing screen, `WeeksGrid.jsx` — re-skin only)

Visual states (empty/current/built) and the long-press → Clone/Clear
action sheet already exist and work in the real app — this session just
gave them the new color/font treatment. No logic changes implied here.
The per-week progress ring stays honestly stubbed at 0% in both the real
app and these mockups — that's intentional, not an oversight (see the
original requirements doc §4.3).

### 3.4 Week Editor (existing screen, `WeekEditor.jsx` — re-skin only)

Day-toggle row (M–S) + "Choose Your Session" list, colored by session
type. Matches existing built behavior exactly. Re-skin only.

### 3.5 Session Editor / Add Exercise flow — **contains a real breaking data change**

The overall screen (editable name, exercise list with colored
muscle-category borders, Edit/Done gating, "Start Session" button) is a
re-skin of the existing `SessionEditor.jsx`.

**But the "Add Exercise" sets/reps form changed**:
- **Before**: Sets / Min Reps / Max Reps (a rep range)
- **Now**: Sets / Reps / **RPE** (confirmed explicitly: RPE *replaces*
  Max Reps, the rep-range concept is dropped entirely for exercises added
  through the custom builder)

This is a genuine schema change, not a label swap:
- `repsMin`/`repsMax` → a single `reps` field, plus a new `rpe` field
- This actually makes custom-builder exercises **more consistent** with
  how template-authored (Nippard) exercises already work — those already
  use a single fixed rep target + separate RPE, not a range. Worth
  framing to whoever builds this as a consistency fix, not just a UI
  change.
- **Every screen currently reading `repsMin`/`repsMax` needs updating**:
  Session Editor's plan display, Log Session's target display, any
  summary/preview text elsewhere. Do this as one coordinated change, not
  screen-by-screen — a half-migrated schema will break things silently.

The muscle-group picker → search → tier-warning flow (3 states designed:
group grid, search results with tier badges, exercise-picked confirmation)
matches the existing `ExercisePicker.jsx` behavior. Re-skin only, no logic
changes beyond the Sets/Reps/RPE form fix above.

### 3.6 Log Session — **significantly redesigned, not a re-skin**

**What's built today**: one long scrolling page, every exercise's sets
expanded and visible at once, weight + reps + checkmark per set.

**What's designed now**: a two-screen flow.

1. **Summary list** — compact rows (exercise name, category tag, target,
   a completion indicator: checkmark / "2/3" / empty). Tapping a row
   opens the focused view below. This is the new entry point for "Start
   Session."

2. **Focused single-exercise overlay** — "Exercise 1 of 9" position
   indicator, exercise name + category tag, a **front/back body diagram**
   highlighting primary/secondary/tertiary muscles worked, a "Session
   Target" stat row (Sets/Reps/RPE — the *recommended* RPE), a "Coaching
   Cue" card (maps directly to the existing `note` field — no new data
   needed here), a "Log Sets" table with **weight, reps, and actual RPE**
   per set (confirmed: this is the RPE *felt*, distinct from the
   recommended RPE shown above) plus a checkmark, a "Progress History"
   mini-chart (Wt/Reps/Vol toggle — same visual language as the Exercise
   Detail screen, §3.9), and a "Next Exercise" / "Finish Session" button.

**New data this needs, none of which exists yet**:
- `overload.log` needs a new **actual RPE** field per logged set
  (separate from the plan's target RPE, which already exists on the
  exercise entry).
- A **muscle map per exercise** (which muscles, classified
  primary/secondary/tertiary) for the body diagram — this does not exist
  in `exercises.json` today. The library has `primaryMuscle` and
  `secondaryMuscles`, which is a start, but there's no "tertiary" concept
  and no mapping for template-authored (Nippard) exercises at all, since
  those aren't linked to the library (`exerciseId: null`). This needs to
  be authored, not derived automatically.

**Two things flagged repeatedly during design that are worth taking
seriously**:
- The **body diagram** was explicitly called the most ambitious custom
  illustration attempted in this whole process, and needed several
  iterations to get from "bulky mannequin with rounded-rectangle patches"
  to something that reads as clean muscle highlighting. Treat this as its
  own R&D spike, not a quick add. Building it as a real *interactive*
  component (different highlighted regions per exercise) is meaningfully
  harder than a static illustration.
- **Live countdown timers that persist correctly across navigation**
  (pause/resume, survive leaving and returning to the screen) are real
  engineering, not just a styled card. Don't underestimate this because
  the mockup is static.

### 3.7 Rest timer — **two unreconciled designs exist, pick one before building**

Two versions were designed and never explicitly reconciled against each
other:

1. **Floating banner** — appears near the top of the focused exercise
   screen when a set's checkmark is tapped: countdown, "Resting" label,
   −15s/+15s buttons, Skip. Content stays visible, doesn't take over the
   screen.
2. **Full-screen dark takeover** — near-black background with a subtle
   grid texture (same treatment as the Training Volume card that was
   later cut, see §3.8), a large circular progress ring with a glowing
   countdown, exercise name, "Next: Set 2 of 3" tag, −15s/Pause/+15s
   controls, "Skip Rest" link.

**This needs a decision before it's built**: does tapping the checkmark
always go full-screen? Is the banner a "minimized" state you can expand?
Or did the full-screen version simply supersede the banner entirely? The
conversation never settled this — don't guess, ask.

### 3.8 Progress tab — **redesigned multiple times; only the final structure below is current**

This section went through several full restructures. **Only build the
final agreed structure** — everything else in this subsection is listed
so you know what was tried and explicitly rejected, not as alternatives
to pick from.

**Final structure, top to bottom**:
1. **Overall Progress** — ring showing % complete, scoped to the
   **current program only** (confirmed: this doesn't make sense as an
   all-time number, since you can't average "% complete" across a
   finished program and a new one)
2. **Recent PRs** — a single compact, celebratory card (not a list),
   with a "See All" link → PR History screen (§3.10)
3. **Exercise Progress** — filterable by muscle category (pill row: All/
   Chest/Back/Shoulders/Arms/Legs/Glutes/Core), list with sparklines,
   "See All" link, tappable into Exercise Detail (§3.9)
4. **Muscle Group Balance** — % of sets per muscle group this month, as
   colored horizontal bars (color per category, reusing the existing
   system)

**Scope decision, with a real prerequisite**: PRs, Exercise Progress, and
Muscle Group Balance are **all-time**, spanning every program ever used —
not just the current one (confirmed explicitly). This is the right
product call, but:

> ⚠️ **`overload.log` currently has no concept of which program a logged
> entry belongs to** — entries are keyed only by week-number + day. If you
> finish one program and start another, the new program's "Week 1,
> Monday" would collide with the old program's data in that same slot.
> Before "all-time" progress tracking can work correctly, log entries need
> to record which program (and which was active at the time) they
> belonged to. **This is a data-model prerequisite, not a UI task** — flag
> it as its own piece of work, not a side effect of building the Progress
> tab.

**Explicitly dropped during iteration — do not build these**:
- The dark isometric "Training Volume" dot-matrix chart (day-by-day
  volume as a 3D dot skyline). Went through several polish rounds and was
  explicitly cut for being too complex for this reset. If revisited later,
  treat it as a separate, standalone feature decision — not part of this
  handoff.
- A flat "Exercise Progress" list without category filtering (superseded
  by the filterable version above).
- An "Average RPE" trend section and a 2×2 "Overview" stat grid (Total
  Sets / Sessions Done / Total kg Lifted / Best Streak) — both were
  proposed, then superseded by the simpler final structure. Don't build
  either.

### 3.9 Exercise Detail screen (new)

Reached by tapping an exercise from Exercise Progress or PR History. Stat
chips (Current Best, Est. 1RM, Total Sets, Last Trained), a Week/Month/
All Time toggle, then two matched line charts — Weight Over Time and Reps
Over Time — with gradient fill, data points, and a highlighted-point
callout bubble on the most recent value.

### 3.10 PR History screen (new)

Reached via "See All" on the Recent PRs card. **Grouped by exercise**
(confirmed explicitly, not a chronological feed) — one row per exercise
showing only its current all-time best, with a category filter row
matching Exercise Progress's. Each row tappable into Exercise Detail.

### 3.11 Template Library (existing screen, `TemplateLibrary.jsx` — re-skin only)

Structure unchanged — template cards with name, session count/duration,
and tagline. Just needs the new color/font treatment.

### 3.12 Welcome/onboarding screen — **unresolved, do not build from the last screenshot**

This went through the most iteration of anything in this session and is
**not finished**:
- Started as a clean flat illustration (barbell, water bottle, shoe) —
  this version was fully resolved and polished across several rounds
  (progress-ring motif, connector line to a stat badge, motion lines,
  aligned sparkles).
- Then shifted to a rough hand-drawn charcoal-sketch illustration style
  as a **deliberate broader exploration** (confirmed: not just for this
  screen, but a possible direction for the app's illustration style
  generally — though nothing else was actually redone in this style, so
  treat that as an open question, not a decision).
- The sketch went through several fixes (removing green bleed from the
  linework, reducing line density, fixing composition).
- Then the layout shifted again: illustration made smaller and pushed
  behind the text as a dimmed background layer, with the headline/CTA as
  the foreground focus.
- The **last state shown** had the illustration dimmed to the point of
  being barely visible, with too much empty space above the headline —
  both flagged as needing fixes, and **no corrected version was reviewed
  before this handoff was written**.

**Do not treat the last screenshot as final.** This needs at least one
more iteration round before it's build-ready. If Claude Code needs a
placeholder in the meantime, the earlier fully-resolved flat-illustration
version (progress-ring + barbell, described above) is the safer fallback.

### 3.13 Profile tab — not designed

Discussed conceptually (units kg/lb toggle, Log Out, Reset Data, a
personal stats snapshot, dark mode) but explicitly dropped for this round
("we will drop the profile for now"). No screens exist. Build it
functionally/minimally using existing patterns from other screens, or
schedule a proper design pass later — don't invent a design for it from
this document.

---

## 4. Consolidated list of real data-model changes required

Gathering everything flagged above in one place, since these cut across
multiple screens:

1. **`repsMin`/`repsMax` → `reps` + `rpe`** for exercises added through
   the custom builder. Breaking change — coordinate across every screen
   that reads this shape (§3.5).
2. **Actual RPE per logged set** — new field needed in `overload.log`,
   distinct from the existing planned/target `rpe` on the exercise (§3.6).
3. **Program identity on log entries** — `overload.log` entries need to
   record which program they belonged to. Prerequisite for all-time
   Progress tracking (§3.8). Do this before building the Progress tab, not
   after.
4. **Muscle map dataset for the body diagram** (primary/secondary/
   tertiary per exercise) — doesn't exist, needs to be authored, and
   needs to cover both library exercises and template-authored ones
   (§3.6).
5. **Units preference (kg/lb)** — implied by the Log Session mockups
   (which show "kg"), but never actually decided as a real toggle since
   Profile was dropped. Needs an explicit decision, not just a hardcoded
   unit.
6. **New computed aggregates**, none of which exist yet: sessions
   completed (per week / per program), sets logged (per program), best PR
   (weight × reps, with the specific exercise/values), day streak, %
   program complete, muscle-group balance percentages. All of these
   require the progress-tracking work that was already flagged as
   outstanding in the original requirements doc — this session just added
   more specific UI that depends on it.

---

## 5. Things this session explicitly rejected — don't resurrect them

For clarity, since some of these were designed, shown, and then cut — if
you see them in earlier screenshots, they are **not** part of the current
target:

- The dark isometric dot-matrix "Training Volume" chart (§3.8)
- The "Program Overview" week-pill row on the Programs tab (§3.2)
- Flat, non-filterable "Exercise Progress" list (§3.8)
- "Average RPE" trend section and the 2×2 Overview stat grid on Progress
  (§3.8)
- Total Volume as the third Program Stats card (replaced by Best PR)

---

## 6. Recommended build order

Given the scope, this should **not** be handed to Claude Code as "build
all of this." Suggested staging, each step small enough to verify before
moving on (same rhythm as the original requirements doc):

1. **Lock the design tokens** — confirm the exact lime-green hex and the
   new rounded display font, update `src/index.css`'s `@theme`. Mechanical,
   low risk, affects everything downstream.
2. **Add the bottom tab bar + floating action button as a real navigation
   shell** — this is structural and touches every primary screen. Do this
   before re-skinning individual pages, or you'll redo work.
3. **Re-skin the screens with no logic changes**: Weeks Grid, Week Editor,
   Template Library. Pure visual updates.
4. **Make the RPE/reps schema change deliberately** (§3.5, §4.1) — do
   this *before* re-skinning Session Editor's add-exercise form, so you're
   not re-skinning something about to be replaced.
5. **Rebuild Log Session's core flow** — summary list + focused overlay —
   *without* the body diagram and *without* a decided rest-timer version
   yet. Get weight/reps/actual-RPE logging working first.
6. **Resolve and build the rest timer** (§3.7) — pick banner or full-
   screen (or clarify the relationship) before writing any code for it.
7. **Body diagram** — treat as its own spike. Expect iteration.
8. **Program-identity tagging on `overload.log`** (§4.3) — do this before
   step 9.
9. **Progress tab rebuild**, PR History, Exercise Detail — now that the
   prerequisite from step 8 is in place.
10. **Welcome screen** — only once the illustration direction is actually
    finalized (§3.12). Not ready yet.
11. **Profile** — lowest priority, no design exists; build minimally with
    existing patterns.

Each step should be built, run, and confirmed working before moving to the
next — this is a lot of surface area to cover in one pass, and several of
these steps (schema change, timer decision, body diagram, log-program
tagging) have real failure modes if rushed or combined.

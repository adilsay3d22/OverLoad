# Handoff: Overload — Workout Tracking App UI

## Overview

Overload is a mobile strength-training app. Users pick or build a training program, log each set (weight / reps / RPE), rest between sets on a guided timer, and track progress per exercise over time. This bundle contains the complete UI design for the app: 23 screens covering onboarding, program building, session logging, rest timing, progress analytics, and profile/settings.

## About the Design Files

The files in `screens/` are **design references created in HTML** — prototypes that show intended look and behavior. They are **not production code to copy directly**.

The task is to **recreate these designs in the target codebase's existing environment** (React Native, SwiftUI, Flutter, React web, etc.) using its established component patterns, styling system, and navigation library. If no environment exists yet, choose the framework that fits the project (for a mobile-first app like this: React Native or SwiftUI) and implement the designs there.

Each `.dc.html` file is a self-contained page that renders one screen inside a simulated iPhone frame (`ios-frame.jsx`). Open any of them in a browser to see the live design. Ignore the frame, the `<x-dc>` wrapper, and `support.js` — they are prototyping scaffolding. What matters is the markup and inline styles inside the frame's child `<div>`, which is the screen itself.

## Fidelity

**High-fidelity (hifi).** Final colors, typography, spacing, radii, shadows, and interaction states. Recreate the UI faithfully: exact hex values, type sizes, and spacing are documented below and present in the HTML. Reproduce it pixel-accurately using the codebase's own primitives.

Reference frame: **390 × 844 pt** (iPhone 14/15 logical size). All pixel values below are at 1× and map 1:1 to points. Screens are vertically scrolling unless noted.

---

## Design Tokens

### Colors

| Token | Hex | Use |
|---|---|---|
| `bg` | `#FAFAF7` | Warm off-white app background |
| `surface` | `#FFFFFF` | Cards, inputs, list rows |
| `ink` | `#14150F` | Primary text, icons, dark buttons |
| `ink-muted` | `#6E6E66` | Secondary body text |
| `ink-faint` | `#8A8A82` | Uppercase section labels, meta text |
| `line` | `#EFEFE9` | Card borders, hairline dividers |
| `line-strong` | `#DCDCD2` | Inactive dots, input borders |
| `accent` | `#C6F24A` | Lime primary — buttons, active states, chart lines |
| `accent-hover` | `#B7E634` | Lime hover/press |
| `accent-deep` | `#4E6011` | Text on lime surfaces (labels, links) |
| `accent-glow` | `rgba(150,196,40,0.42)` | Lime button shadow |

### Dark surfaces (Training Volume card, Rest Timer takeover)

| Token | Hex | Use |
|---|---|---|
| `dark-bg` | `#0D0E09` | Rest Timer full-screen background |
| `dark-card` | `#14150F` → `#1B1D14` | Dark card surfaces |
| `dark-line` | `#22241A` / `#262920` / `#2A2D22` | Ring track, borders on dark |
| `dark-text` | `#FFFFFF` | Countdown numerals |
| `dark-muted` | `#9DA189` | Labels on dark |
| `dark-faint` | `#7C8069` | De-emphasized text on dark |
| `dark-ink-on-lime` | `#14150F` | Text/icons on lime buttons |

Grid texture (used on dark surfaces):
```css
background-image:
  linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px),
  linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px);
background-size: 26px 26px;
background-position: -1px -1px;
```

### Session type badges (pill, 9px/700, letter-spacing 0.08em)

| Type | Background | Text |
|---|---|---|
| Upper | `#FBEBE6` | `#B8401F` |
| Lower | `#E6F0FB` | `#1F5C9E` |
| Core | `#F5EBFB` | `#7A2FA8` |
| Full Body | `#EAF6E8` | `#2E7A2B` |

### Muscle category tags (same pill spec)

| Muscle | Background | Text |
|---|---|---|
| Chest | `#FBEBE6` | `#B8401F` |
| Back | `#E6F0FB` | `#1F5C9E` |
| Shoulders | `#FDF3E0` | `#9A6410` |
| Arms | `#F5EBFB` | `#7A2FA8` |
| Legs | `#EAF6E8` | `#2E7A2B` |
| Glutes | `#FBEAF2` | `#A82C63` |
| Core | `#EDEEF6` | `#464C8A` |

### Typography

Family: **Outfit** (Google Fonts, weights 400/500/600/700). Rounded geometric sans — substitute the codebase's nearest rounded display face if Outfit isn't available.

| Role | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|
| Hero headline | 38px | 700 | −0.035em | 1.05 |
| Screen title | 30px | 700 | −0.03em | 1.1 |
| Countdown numerals | 66px | 700 | −0.045em | 1 | 
| Card stat value | 26–28px | 700 | −0.03em | 1.1 |
| Section heading | 20px | 600 | −0.02em | 1.2 |
| Body | 15px | 500 | 0 | 1.5 |
| Row label / input text | 13–14px | 500–600 | 0 | 1.4 |
| Uppercase section label | 11px | 600 | 0.12em | 1 |
| Tag / badge | 9px | 700 | 0.08em | 1 |
| Overline on dark | 11px | 600 | 0.16em | 1 |

Numeric displays (timers, weights, stat values) use `font-variant-numeric: tabular-nums`.

### Spacing

Screen horizontal padding: **22px** (26px on onboarding screens). Top safe padding: **56–58px**. Bottom padding: **40px** (above tab bar: 100px).

Scale: 4 / 6 / 10 / 14 / 18 / 22 / 26 / 34 / 44px. Card-to-card gap: 14px. Intra-card gap: 10px.

### Radii

| Element | Radius |
|---|---|
| Pill button / tag / toggle | `999px` |
| Large card | `26px` |
| List row / input card | `22px` |
| Small input | `14px` |
| Circular icon button | `50%` |

### Shadows

```
card:        0 2px 8px rgba(20,21,15,0.05)
card-raised: 0 6px 18px rgba(20,21,15,0.07)
lime-button: 0 10px 24px rgba(150,196,40,0.42)
lime-float:  0 16px 34px rgba(20,21,15,0.20), 0 4px 12px rgba(150,196,40,0.45)
lime-glow:   0 14px 34px rgba(198,242,74,0.34)   (on dark)
```

### Motion

All state transitions: **140–160ms ease** on `background`, `color`, `border-color`, `transform`. Hover on lime = `#B7E634`. Hover on white card = `#F2F7E0`. Press = `scale(0.98)`.

---

## Component Patterns

Build these once and reuse across screens.

**Pill button (primary).** Full-width, height 58px, radius 29px, `accent` background, `ink` text 16px/700, `lime-button` shadow. Used at the bottom of nearly every screen.

**Pill button (secondary).** Same geometry, `surface` background, 1px `line` border, `ink` text.

**Circular icon button.** 36–44px diameter, `surface` background, 1px `line` border, `card` shadow, icon in `ink`. Back arrow uses 36px; timer adjust buttons use 44px (light) / 62px (dark).

**Card.** `surface` background, radius 22–26px, 1px `line` border or `card` shadow (not both on the same card — bordered cards are used in list contexts, shadowed cards standalone), padding 18px.

**Uppercase section label.** 11px/600, `0.12em` tracking, `ink-faint`, sitting 14px above its card. Never inside the card it labels.

**Stat box.** Compact box in a 3-up flex row, `gap: 10px`, each `flex: 1`: bold value 26px/700 `ink`, then 11px/500 `ink-muted` label beneath. White card, radius 22px, padding 14px, centered.

**Toggle pill row.** Row of small pills, `gap: 6px`, each padding `7px 14px`, radius 999px, 12px/600 text. Selected: `accent` background, `ink` text. Unselected: `surface`, `ink-muted` text, 1px `line` border.

**Segmented tab bar (bottom nav).** Fixed to bottom, height 84px including safe area, `surface` background, top 1px `line` border. 4 items (Home / Programs / Progress / Profile), each icon 22px + 10px/600 label. Active item: `ink`; inactive: `ink-faint`.

**Chart (line).** SVG, `accent` 2.5px stroke, gradient fill beneath the line from `rgba(198,242,74,0.28)` to transparent. Data points are hollow circles (r=4, `surface` fill, `accent` 2px stroke). Latest point is filled `accent` with a vertical dashed `line-strong` guide down to the axis and a callout bubble (`ink` background, white 11px/700 text, radius 10px) above it. Axis labels 10px/500 `ink-faint`.

**Chart (isometric dot matrix).** Used on the Progress tab's Training Volume card only. Dark grid-textured card; each day is a column of small lime dots whose count encodes volume; tapping a column shows a tooltip connected by a dashed line.

**Body diagram.** Two front/back silhouettes side by side, thin `ink` linework at 1.4px stroke on a 100×192 viewBox, no fill. Muscle highlights are anatomy-shaped paths filled `accent` at three opacities: **1.0 primary**, **0.45 secondary**, **0.16 tertiary**. Legend beneath: three 9px dots at the same opacities labeled Primary / Secondary / Tertiary. See `Overload Log Exercise Focus.dc.html` for the exact path data — reuse those paths.

---

## Screens

Grouped by flow. Each entry names the file, what the user does, and the layout specifics beyond the shared patterns above.

### Onboarding

**Welcome** — `Overload Welcome Sketch.dc.html` (current) / `Overload Welcome v3.dc.html` (earlier variant)
First launch. Wordmark (dumbbell glyph + "Overload", 18px/600) at top-left, 58px from top. A hand-drawn dumbbell illustration (`assets/sketch-dumbbells.png`) sits as a **background watermark**: 300×300px, centered at 55% of screen height, `opacity: 0.44`, with a lime `mix-blend-mode: color` layer at 0.5 opacity and a radial fade to `bg` at its edges. A radial off-white wash (`radial-gradient(52% 42% at 50% 50%, rgba(250,250,247,0.9), transparent)`) sits over the artwork behind the text only, preserving legibility. Foreground, vertically centered with a slight downward bias: headline "Lift More Than Last Week" (38px/700, centered), body "Log your reps and RPE, follow a program, and let Overload push your next load." (15px/500 `#5C5C55`, max-width 300px, centered), pagination dots (3, first is a 22×7 `ink` capsule, others 7px `line-strong` circles). Then the "Create Account" pill button and, 18px below, "I already have an account. **Log in**" (13px/500 `ink-muted`, link 700 `ink`).

**Signup** — `Overload Signup.dc.html`
Name / email / password fields as white cards (radius 22px, padding 18px, 15px/500 text, 11px/600 `ink-faint` floating label). Primary "Create Account" pill at bottom.

**Login** — `Overload Login.dc.html`
Email / password fields, "Forgot password?" text link in `accent-deep`, "Log in" pill.

### Home

**Home** — `Overload Home.dc.html` (`Overload Home v1.dc.html` is an earlier variant)
Landing screen. Greeting header ("Wednesday" overline + "Ready to lift?" 30px/700). Today's session card: dark `ink` surface with grid texture, session name, session-type badge, exercise count, and a lime "Start Session" pill inside. Below: this week's progress strip (7 day dots, completed ones filled `accent`), then a recent-PR list. Bottom tab bar with Home active.

### Programs

**Programs (list)** — `Overload Programs.dc.html`
Program cards: name 20px/600, meta line ("8 weeks · 4 days/week", 13px/500 `ink-muted`), session-type badges in a wrapping row. "Create Program" pill at bottom.

**Programs (active)** — `Overload Programs Active.dc.html`
Same list with one card promoted: `accent`-tinted border, "ACTIVE" badge, progress bar (`accent` fill on `line` track, height 6px, radius 999px) and "Week 3 of 8" label.

**Programs (empty)** — see `Overload Progress Empty.dc.html` for the empty-state pattern
Centered illustration, 20px/600 headline, `ink-muted` body, primary pill.

**Build Custom Program** — `Overload Build Custom Program.dc.html`
Program name text input, week-count stepper (circular −/+ buttons flanking a bold numeral), days-per-week stepper, and a session-type chip picker. "Continue" pill.

**Weeks Grid** — `Overload Weeks Grid.dc.html`
Grid of week tiles (2 columns, `gap: 10px`), each a white card showing "Week N", session count, and a completion state (`accent` check when done). Tapping a tile opens the Week Editor.

**Week Editor** — `Overload Week Editor.dc.html`
Ordered list of that week's sessions as rows: session name, type badge, exercise count, chevron. "Add Session" secondary pill.

**Session Editor** — `Overload Session Editor.dc.html`
Ordered list of exercises in a session: drag handle, exercise name, muscle tag, "3 × 5 @ RPE 7" prescription line. "Add Exercise" pill opens the add flow.

### Add Exercise flow (3 steps)

**Step 1 — Muscle Group** — `Overload Add Exercise Muscle Group.dc.html`
2-column grid of muscle-group tiles, each using its category color as a tinted background with the muscle name in that category's text color.

**Step 2 — Search** — `Overload Add Exercise Search.dc.html`
Search input (white card, radius 999px, magnifier icon) filtering a list of exercises within the chosen muscle group. Rows show exercise name + equipment meta.

**Step 3 — Sets** — `Overload Add Exercise Sets.dc.html`
Three steppers for Sets / Reps / RPE, each a white card with circular −/+ buttons and a large bold numeral. "Add to Session" pill.

### Logging flow

**Log Session Summary** — `Overload Log Session Summary.dc.html`
The session in progress. Header: "WEEK 3 · LOGGING" overline, "Upper Body #1" (30px/700) with an UPPER badge inline. Below: a list of the session's 9 exercises as tappable rows — exercise name, muscle tag, prescription, and a completion indicator (circular check, `accent` when all sets are logged). Tapping a row opens the focused logging screen.

**Log Exercise Focus** — `Overload Log Exercise Focus.dc.html`
The core logging screen; a **full standalone screen**, not a sheet. Top to bottom:
- Top bar: 36px circular back button (top-left), centered "Exercise 1 of 9" (12px/500 `ink-faint`).
- Exercise name "Barbell Bench Press" (30px/700), CHEST tag beneath.
- **Rest timer banner** (conditional, see Interactions): floats absolutely over the content below the tag, left/right inset 18px, `top: 198px`, radius 36px, `accent` background, `lime-float` shadow, padding `14px 16px`. Contents in a `gap: 12px` row: 44px white circular "−15s" button (11px/700 `ink`, `0 2px 6px rgba(20,21,15,0.12)` shadow), centered countdown (28px/700 `ink`, tabular) with "RESTING" beneath (9px/700, 0.14em, `accent-deep`), 44px white "+15s" button, a 1px × 24px `rgba(20,21,15,0.16)` divider, then a "Skip" text button (12px/700 `accent-deep`). When the banner is visible a 56px spacer is inserted at the top of the scroll content so nothing is occluded.
- **Body diagram card**: FRONT / BACK labels above two silhouettes, highlights per the Body diagram pattern, legend row beneath.
- **Session Target** card: 3 stat boxes — Sets 3, Reps 5, RPE 7 (target/recommended RPE).
- **Coaching Cue** card (rendered only when a cue exists): uppercase label + "Tuck elbows 45°, squeeze shoulder blades, stay firm on bench" (14px/500).
- **Log Sets** card: header row with column labels "WEIGHT KG", "REPS", "RPE" (9px/600 `ink-faint`), then one row per set. Each row: "S1"/"S2"/"S3" label, weight input, reps input, small RPE input (this is the **actual** RPE felt, distinct from the target above), and a 32px circular check button on the right — unfilled (1px `line-strong` border) when incomplete, solid `accent` with a white check when done. Ship state: sets 1 and 2 logged and checked, set 3 empty.
- **Progress History** card: toggle pills "Wt" / "Reps" / "Vol" (Wt selected), a line chart per the chart pattern, and a summary line "Best: 5.5kg · Est. 1RM: ~6kg" (12px/500 `ink-muted`).
- Bottom: full-width `accent` pill reading "Next Exercise", or "Finish Session" on the last exercise.

**Rest Timer (full-screen)** — `Overload Rest Timer.dc.html`
Deliberate takeover moment shown between sets. `dark-bg` with the 26px grid texture plus a radial lime bloom (`radial-gradient(120% 70% at 50% 38%, rgba(198,242,74,0.10), transparent 62%)`). Top: "UPPER BODY #1 · WEEK 3" overline (11px/600, 0.16em, `dark-muted`). Center: a 262px progress ring — SVG, r=112, 17px stroke, track `#22241A`, arc `accent` with round caps, rotated −90° so it starts at 12 o'clock, `stroke-dasharray` driven by remaining/total. Outside the ring, a 226px `rgba(198,242,74,0.42)` circle at `blur(38px)` supplies the glow; a 196px dark circle at `blur(18px)` keeps the center clean. Inside: countdown "2:59" (66px/700 white, tabular) and "REST" beneath (11px/600, 0.28em, `#7C8069`). Below the ring: exercise name "Barbell Bench Press" (20px/500 `accent`, centered), then a "NEXT · SET 2 OF 3" pill (`#1B1D14` background, 1px `#262920` border, 11px/600 `dark-muted`). Controls row (`gap: 20px`): 62px dark circular "−15s" (rewind icon + label), a 66px-tall lime pill "Pause" with a pause glyph and `lime-glow` shadow, then a matching "+15s". At the very bottom: "SKIP REST" (11px/600, 0.2em, `dark-faint`), clearly de-emphasized, tap target padded to `12px 22px`.

### Progress

**Progress** — `Overload Progress Focused.dc.html`
Analytics tab. Header, then a **Training Volume** card: dark grid-textured surface with the isometric dot-matrix chart (columns = days, dot count = volume), a trend badge ("+12% vs last week", `accent` text on dark), and an interactive tooltip with a dashed connector. Below: a 2-up row of stat cards (sessions, total volume), then a per-exercise list linking to Exercise Detail.

**Progress (empty)** — `Overload Progress Empty.dc.html`
Pre-data state: centered message and a "Log your first session" pill.

**Exercise Detail** — `Overload Exercise Detail.dc.html`
One exercise's history. Name + muscle tag, Wt/Reps/Vol toggle pills, the line chart with the latest-point callout, PR summary line, and a reverse-chronological session log list (date, top set, volume).

**PR History** — `Overload PR History.dc.html`
All-time personal records list grouped by exercise: exercise name, PR weight (26px/700), date, and a lime "PR" badge on the most recent.

### Profile

**Profile** — `Overload Profile.dc.html`
Avatar + name header, a 3-up stat row (sessions, weeks, PRs), then grouped settings rows (Units, Rest defaults, Notifications, Export data, Log out) as white cards with chevrons, 14px/500 labels, and 12px/500 `ink-muted` value text on the right.

---

## Interactions & Behavior

**Navigation.** Stack-based. Tab bar switches the four roots (Home / Programs / Progress / Profile). Program building pushes: Programs → Build Custom Program → Weeks Grid → Week Editor → Session Editor → Add Exercise (3 modal steps, dismissed back to Session Editor). Logging pushes: Home or Programs → Log Session Summary → Log Exercise Focus. Back buttons pop one level.

**Set completion.** Tapping a set's check button on Log Exercise Focus marks the set complete (button fills `accent`, white check) and **starts the rest timer**. Two presentations exist for the same timer state — the inline floating banner on Log Exercise Focus (for users who want to keep reviewing their numbers) and the full-screen Rest Timer takeover. Decide with the product owner which is default; the design supports the banner as the passive state and the takeover as an escalation. Both share one timer model.

**Rest timer behavior.** Counts down once per second from the exercise's target rest (default 180s; the inline banner ships mid-countdown at 92s / 1:32). "−15s" clamps at 0. "+15s" adds 15s and raises the total so the ring never exceeds full. "Pause" toggles to "Resume" (glyph swaps from two bars to a triangle). "Skip" / "SKIP REST" dismisses immediately and returns to logging. When the countdown hits 0 the timer stops and dismisses (add a haptic + sound on native).

**Progress chart toggles.** Wt / Reps / Vol swap the charted series in place; the selected pill is `accent`. The latest data point keeps its callout bubble across all three series with the unit changing (kg / reps / kg·reps).

**Steppers.** −/+ buttons on the Add Exercise Sets and Build Custom Program screens increment by 1 (RPE by 0.5), clamped to sensible bounds (sets 1–10, reps 1–30, RPE 5–10, weeks 1–16, days 1–7).

**Inputs.** Weight/reps/RPE inputs are numeric keypads on native. Empty inputs show a `line-strong` placeholder dash. A set cannot be checked complete until weight and reps are filled — validate on tap and shake the row if empty.

**Hover/press.** Web hover states are documented in Motion above; on native use press opacity 0.85 plus `scale(0.98)` on pill buttons.

**Responsive.** Designed for 390pt width. Scale horizontal padding but keep card radii and type sizes fixed; on wider phones let cards grow, don't add columns. The body diagram SVG scales to its container width.

---

## State Management

Per-session logging state:
- `session`: `{ id, name, type, weekIndex, exercises: [...] }`
- `exercises[i]`: `{ id, name, muscle, primary/secondary/tertiary highlight keys, targetSets, targetReps, targetRPE, restSeconds, coachingCue?, sets: [...] }`
- `sets[j]`: `{ weight, reps, actualRPE, complete }`
- `currentExerciseIndex` — drives "Exercise 1 of 9" and the Next Exercise / Finish Session button label.
- `restTimer`: `{ visible, presentation: 'banner' | 'fullscreen', remaining, total, running }`

History/analytics state: per-exercise session log (date, sets), derived `best` and `est1RM` (Epley: `weight × (1 + reps/30)`), and the selected chart metric (`wt | reps | vol`).

Program building state: draft program (name, weeks, days/week) with nested sessions and exercises, committed on save.

Data needs: fetch programs and exercise library on launch; persist each set as it's checked (offline-first — a gym has bad signal, so queue writes locally and sync).

## Assets

- `screens/assets/sketch-dumbbells.png` — hand-drawn charcoal dumbbell illustration, user-supplied, 1152×2048. Used as the Welcome screen watermark. Ship at 2×/3× as needed.
- `screens/assets/lifter.png` — user-supplied illustration used in an earlier Home variant.
- Icons are inline SVG in the HTML (dumbbell wordmark glyph, back chevron, check, rewind/forward, pause/play, tab bar icons). Replace with the codebase's icon set, matching stroke weight (1.4–1.6px at 20px) and `ink` color.
- Font: Outfit from Google Fonts, weights 400/500/600/700.

## Files

All in `screens/`:

Onboarding — `Overload Welcome Sketch.dc.html`, `Overload Welcome v3.dc.html`, `Overload Signup.dc.html`, `Overload Login.dc.html`
Home — `Overload Home.dc.html`, `Overload Home v1.dc.html`
Programs — `Overload Programs.dc.html`, `Overload Programs Active.dc.html`, `Overload Build Custom Program.dc.html`, `Overload Weeks Grid.dc.html`, `Overload Week Editor.dc.html`, `Overload Session Editor.dc.html`
Add Exercise — `Overload Add Exercise Muscle Group.dc.html`, `Overload Add Exercise Search.dc.html`, `Overload Add Exercise Sets.dc.html`
Logging — `Overload Log Session Summary.dc.html`, `Overload Log Exercise Focus.dc.html`, `Overload Rest Timer.dc.html`
Progress — `Overload Progress Focused.dc.html`, `Overload Progress Empty.dc.html`, `Overload Exercise Detail.dc.html`, `Overload PR History.dc.html`
Profile — `Overload Profile.dc.html`

Scaffolding (do not port): `ios-frame.jsx` (device bezel), `support.js` (prototype runtime).

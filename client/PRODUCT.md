# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone who lifts — a broad consumer audience rather than a niche of coached or
advanced lifters. The primary situation is mid-session on the gym floor: phone in
one hand, a rest timer running, somewhere between two working sets, under time
pressure and often on poor signal. The job is to record the set just finished and
know what the next one asks for, in as few taps as possible.

A second, quieter situation is at home between sessions: choosing or building a
program, and looking back at whether the numbers are moving.

## Product Purpose

Overload turns a written training block into something you actually execute. A
user picks a template program or builds their own, fills weeks with sessions and
sessions with exercises, then logs every set — weight, reps, and the RPE it
actually felt like — against the plan that prescribed it. Progress, personal
records and per-exercise history are derived from those logs.

Success is a user finishing a block having logged it honestly, and being able to
see that their working weights moved.

## Positioning

Two claims are core, confirmed with the user:

- **RPE-first logging.** What a set actually felt like is a first-class field on
  every logged set, recorded beside the RPE the plan prescribed. Competing
  loggers treat RPE as an optional afterthought or omit it; here the gap between
  target and actual is the point.
- **Program-native, not free-log.** Training happens inside a real block, week by
  week. The plan is the spine and logging fills it in, rather than the app being
  an empty ledger you freestyle into.

Two further capabilities exist and are genuine strengths, but the user did *not*
name them as core positioning, so future work should not lead with them: coaching
cues and the muscle map inside the logging screen, and progress that spans every
program ever run.

## Operating Context

- **Gym floor, mid-set.** One-handed reach, sweaty hands, arm's-length
  glanceability, bright or uneven light, and a rest countdown competing for
  attention. Interactions must survive being done badly and quickly.
- **Poor connectivity.** Gyms have bad signal. Every logged set is a write that
  may fail.
- **Rest between sets is the working window.** The user is idle for 60–210
  seconds and may leave the logging screen to look at something else, then come
  back mid-rest.
- **Sessions span weeks.** A block runs 4–16 weeks; a user returns to the same
  session slot repeatedly and compares against last time.

## Capabilities and Constraints

Built and confirmed:

- Accounts with email/password; JWT held client-side.
- Programs from three bundled templates or built custom; weeks can be added and
  the last week removed; weeks, sessions and whole programs can be duplicated,
  renamed, activated and deleted. Multiple saved programs coexist; one is active.
- Sessions hold ordered exercises drawn from a 160-exercise library, each with
  sets, reps, target RPE, rest and an optional coaching cue.
- Logging records weight, reps, actual RPE and completion per set, saved the
  moment a set is checked.
- A rest timer with presets and ±15s that survives navigation and reload, and a
  session clock that can be paused.
- Progress: percent complete, sets logged, day streak, muscle-group balance,
  personal records by weight × reps, per-exercise history and Epley 1RM.

Constraints that future work must preserve:

- **Weights are stored in kilograms.** Pounds is a display preference only.
- **Every logged set records the program it belonged to.** This is what lets
  history survive a program being deleted and lets progress span programs.
  Nothing may key logs on week + day alone.
- **A week's index is part of its logged history.** Weeks may be appended and the
  last one removed; renumbering a week from the middle would strand its logs.
- **Deleting a plan never deletes history.** Sessions, weeks and programs can go;
  their logged sets remain.
- Persistence is a single JSON file behind a small data layer, intended to be
  swapped for a real database without touching the rest.

Explicitly undecided:

- **RPE literacy and improvised sessions.** A broad audience will include lifters
  who do not rate effort and sessions that were not planned. Whether Overload
  teaches RPE, allows skipping it, or admits one-off sessions outside a program
  is open and deliberately not settled. It is the sharpest unresolved tension in
  the product: the positioning above is narrow, the audience is not.

Known gaps against the launch intent below, none of which may be described as
working until built: offline queueing of set writes, password reset, any
onboarding that explains RPE or the program model, and internationalisation.

## Brand Commitments

- The product is named **Overload**.
- A high-fidelity design handoff exists at `docs/design-handoff.md` (with the
  follow-up design session in `requirements.md`) and 23 screen prototypes in
  `screens/`. The user supplied these as the binding visual specification; they
  are design authority, not suggestions. Their contents belong in DESIGN.md and
  are deliberately not restated here.
- `screens/assets/` holds user-supplied illustration assets.

## Evidence on Hand

Real, in the repository:

- `exercises.json` — 160 exercises with category, primary and secondary muscles,
  equipment, movement pattern, difficulty and a quality tier.
- `templates.json` — three complete 8-week Jeff Nippard programs (Full Body,
  Upper/Lower, Body Part Split) with per-exercise sets, reps, RPE, rest and form
  cues.
- `screens/` — 23 prototype screens; `docs/design-handoff.md` and
  `requirements.md` — the design handoff; `APP.md` — how the implementation
  resolved it.
- `server/scripts/seed.js` — a developer-only fixture. It exists so the analytics
  screens can be worked on; it is never shipped, and a first-time user must see
  genuine empty states.

Absent, and not to be fabricated: real users, testimonials, reviews, usage
numbers, pricing, licensing terms, App Store presence, deployment, or any claim
about Jeff Nippard endorsing or being affiliated with this app.

## Product Principles

1. **The program is the spine.** Every logged set belongs to a planned one.
   Features that make sense only for freestyle logging are out of character until
   the open question above is settled.
2. **Effort is data.** What a set felt like is recorded next to what was asked
   for. Anywhere the two can be compared, they should be.
3. **Design for the worst moment, not the best.** Two sets in, out of breath,
   one hand, bad signal. If an interaction only works calm and seated, it does
   not work.
4. **History outlives the plan.** Users restructure, duplicate and abandon
   programs constantly. Logged work is never collateral damage.
5. **Never show a number the data does not support.** Empty states are honest,
   aggregates are computed from real logs, and nothing is stubbed to look
   populated.

## Accessibility & Inclusion

WCAG 2.2 AA is the committed bar for launch. The gym context in Operating Context
raises the practical floor above it in places — target size, contrast in bright
light and one-handed reach matter more here than the standard's minimums require.

---
version: 1
slug: "src-screens-programs-jsx"
primary_target: "src/screens/Programs.jsx"
related_targets: ["src/components/BlockMatrix.jsx"]
---

# Programs

Scope: `client/src/screens/Programs.jsx` and `client/src/components/BlockMatrix.jsx`.
Visitor mode: **Operate**.

Audience: someone who already has a block running and wants to see where they are in it, or
who is between blocks and wants to pick a different one. Job: locate yourself in the program
and reach any session in it.

Constraints: the tab bar and session FAB stay. `/programs` and `/programs/active` are the data
contract. Nothing is stubbed to look populated.

## Direction contract

THESIS: The Programs tab shows the program. The incumbent led with an "Up next" card — Home's
job, performed a second time — while the block itself was invisible behind a name, two chips
and three stats. The whole 8×7 grid now leads, so the shape of a block, the distance travelled
and the gaps are one object rather than a paragraph.

OWN-WORLD: Overload's committed system, unchanged. Cells are rounded 6px and differ by fill —
solid lime logged, lime wash inside a lime border started, hollow line-strong planned, a
hairline dot where no session exists. This vocabulary is deliberately not Home's hard square
spine marks, which DESIGN.md scopes to that route. The ink ring on the resume-here session is
the grid's only ink-weight mark, so it is where the eye lands. Labels use the shared 11px /
0.12em register at `ink-muted` rather than the `.caps` utility, which hardcodes `ink-faint` and
fails AA.

STORY: You open the tab, see the whole block at once, find yourself in it, and either open the
session you are on or step sideways into another saved program.

FIRST VIEWPORT: Wordmark row. The program name at 30px with no kicker above it, then one caps
line carrying source, week count and days per week. Then THE BLOCK with a sessions-done count
right-aligned, the day-letter header, eight week rows, and a named key beneath — without the
key the grid is a pattern, not a chart. Below the fold: the current week expanded to real
session rows, then saved programs as a horizontal shelf of spines, then a dashed New program
tile.

FORM: The block matrix, index 1 of seven grounded structures. The roll (seed `b375763a`, scope
surface, mode operate) dealt 7, 2, 1 with index 7 leading — a swipe-through stack of week
cards. That lead was set aside on named product-clarity grounds, not taste: it shows one week
at a time on the one screen whose entire job is showing the whole block. Index 1 was also in
the dealt hand, so the build is a card from the roll rather than a refusal of it. Dealt index 2
(week rail) survives as the expanded current-week section. Code-led.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the
verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Raise carried in

- **Sneaker-box stacks** (challenger, competitive) — saved programs render as spines on a
  shelf: an end label carrying the name over a fixed grid of facts, browsable along the stack
  without opening anything.

## Deliberately absent

- **No "Up next" card.** Home owns the next action and the tab bar carries a live session
  button on every route. A third instance would make two tabs compete for one tap.
- **No program stats trio.** Sessions completed and sets logged are Progress's job, and the
  old Best PR card hardcoded `#DDEAB4` and `#F4F9E4`, two hexes outside the token system.

## Unresolved

- The contract was written after the build on this surface rather than before it, which is out
  of order for this flow; it describes what shipped rather than what was planned.
- A three-day program leaves four of seven columns as rest dots. That is the block's true
  shape and is kept on purpose, but it should be checked against a five-day program before the
  grid is called settled.

## Added later: getting a program back out again

The shelf could accumulate near-identical programs with no visible way to remove one. Renaming,
duplicating and deleting had always lived on `/programs/library`, but nothing on this tab said
so, so the feature may as well not have existed. The `Your programs` label now carries a quiet
`Manage` action pointing at it.

Deleting was also a worse decision than it needed to be: the plan took weeks to build and went
with the program, even though the logs survived. So a program can now be **saved as a
template** — the structure only, with no logged set anywhere near it — and saved plans appear
above the bundled ones on the template library under `Saved by you`, where they can be started
again or deleted.

New server surface, all declared before `/:id` so `saved-templates` is never read as a program
id: `GET /programs/saved-templates`, `POST /programs/:id/save-as-template`,
`POST /programs/saved-templates/:id/start`, `DELETE /programs/saved-templates/:id`. The store
gained a `templates` collection alongside `users`, `programs` and `logs`.

## What deleting a program used to leave behind

Deleting is now reachable from this tab, which surfaced three defects in state that had been
latent because nobody could easily delete anything.

- **The session clock outlived its program.** `overload.activeSession` is pure localStorage
  keyed to a `programId` and `sessionId`, and nothing ever checked those still existed. Delete
  the program mid-session and the action button kept counting — 19:50 LIVE against a route that
  404s — with no escape but the six-hour staleness cutoff. The provider now asks the server
  whether the program and that session are still there and ends the session when they are not.
  Only a 404 ends it: a dropped connection must never wipe a real clock, which is the whole
  point of persisting it.

  The first attempt at this fix did not work, and the reason is worth keeping. The check hung
  off `[status, active, programId, weekIndex, sessionId]` — and **none of those change when a
  program is deleted**. The session is still active and still points at the same ids; only the
  world it refers to moved. So the effect ran once on mount, passed while the program still
  existed, and never ran again. It verified against a seeded orphan (which mounts with the
  program already gone) and failed against the real flow (delete it while the clock is running),
  which is exactly the gap between reproducing a symptom and reproducing the path that causes
  it. `ProgramContext` now counts its refreshes as a `version`, every mutating screen already
  calls that refresh, and the check depends on the count. It also re-runs when the window
  regains focus, for a deletion made on another device, and `ProgramLibrary` ends the session
  outright at the moment of deletion so the clock stops in the same frame as the tap.
- **The session also outlived the account.** Logging out cleared the token and nothing else, and
  the record carried no owner, so the next person to sign in on that device inherited a
  stranger's running session pointing at a program they cannot open. Sessions now carry a
  `userId`, clear when authentication drops, and are discarded when they belong to someone else.
  The rest timer had the same hole and got the same treatment.
- **A dead route offered only "Try again".** Retrying a deleted program fails forever, so the
  back button was the only exit — and back is often another dead route. `ErrorNote` takes an
  `action` now, and the three screens reachable for a missing program name what happened and
  offer "Back to programs".

Checked and *not* a defect: no tab root renders blank with zero programs. Home, Programs,
Progress, Profile, the library and the PR list were all inspected in that state.

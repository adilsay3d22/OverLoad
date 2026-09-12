import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CaretRight, Copy, DotsThree, Plus, Trash } from '@phosphor-icons/react';

import { Screen } from '../components/Screen.jsx';
import {
  BackButton, Card, ErrorNote, Field, PillButton, SessionTag, Skeleton, cx,
} from '../components/ui.jsx';
import { Sheet, SheetAction } from '../components/Sheet.jsx';
import { Crumb, Label, Rule, SectionRule } from '../components/programs.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { useProgram } from '../state/ProgramContext.jsx';
import { DAY_SHORT, dayName, pluralize } from '../lib/format.js';
import { sessionTypeColor } from '../lib/tokens.js';

/**
 * One week's sessions.
 *
 * Two encoding problems were fixed here. Sessions were cards with a 6px
 * session-type bar down the left edge, which the craft floor refuses above 1px;
 * and the weekday strip painted its buttons in session-type colour, which makes
 * a data colour a control surface — DESIGN.md's Data-Never-Acts rule. The strip
 * now uses the block matrix's own ladder, solid ink for a day that has a
 * session and hollow for a free one, and the type colour rides a 3px tick on
 * the row where it identifies rather than acts.
 *
 * Per-row duplicate and delete moved behind one overflow control, matching how
 * the program library and the weeks list already work.
 */

const TYPES = ['Upper', 'Lower', 'Core', 'Full Body'];

/** Weekday chips. Ink means occupied, hollow means free — never type colour,
 *  which belongs to the data and not to a button. */
function DayPicker({ value, onChange, taken, disabledTaken = true, size = 'h-12' }) {
  return (
    <div className="flex gap-1.5">
      {DAY_SHORT.map((letter, index) => {
        const occupied = taken.get ? taken.get(index) : taken.includes(index);
        const selected = value === index;
        return (
          <button
            key={index}
            type="button"
            disabled={disabledTaken && Boolean(occupied)}
            onClick={() => onChange(index)}
            aria-label={
              occupied && occupied.name
                ? `${dayName(index)} — taken by ${occupied.name}`
                : dayName(index)
            }
            className={cx(
              'press flex-1 rounded-[6px] text-[13px] font-semibold',
              size,
              selected
                ? 'bg-ink text-white'
                : occupied
                  ? 'border border-line bg-bg text-line-strong'
                  : 'border border-line-strong bg-surface text-ink-muted hover:border-ink hover:text-ink',
            )}
          >
            {letter}
          </button>
        );
      })}
    </div>
  );
}

function AddSessionSheet({ open, onClose, defaultDay, takenDays, onSubmit }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('Upper');
  const [day, setDay] = useState(defaultDay ?? 0);
  const [busy, setBusy] = useState(false);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add a session"
      subtitle="Name it, pick a day and a type."
    >
      <form
        className="flex flex-col gap-5 pb-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await onSubmit({ name: name.trim() || `${type} Day`, type, day });
          setBusy(false);
          setName('');
        }}
      >
        <Field
          label="Session name"
          placeholder="Upper Body #1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
        />

        <div>
          <Label className="mb-2.5">Day</Label>
          <DayPicker value={day} onChange={setDay} taken={takenDays} size="h-11" />
        </div>

        <div>
          <Label className="mb-2.5">Type</Label>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((option) => {
              const { bg, fg } = sessionTypeColor(option);
              const selected = type === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  aria-pressed={selected}
                  className="press rounded-pill px-4 py-2 text-[13px] font-semibold"
                  // The chip keeps its own family colour because that colour is
                  // the content; selection is carried by an ink ring so a data
                  // colour never becomes the control state.
                  style={{
                    background: bg,
                    color: fg,
                    boxShadow: selected
                      ? 'inset 0 0 0 2px var(--color-ink)'
                      : 'inset 0 0 0 1px var(--color-line)',
                  }}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 text-[12px] font-medium text-ink-muted">
            The type re-derives itself from the exercises you add.
          </p>
        </div>

        <PillButton type="submit" disabled={busy}>
          {busy ? 'Adding…' : 'Add session'}
        </PillButton>
      </form>
    </Sheet>
  );
}

/** Pick the day the copy lands on; days already holding a session are out. */
function CopyDayPicker({ week, busy, onPick, onBack }) {
  const [day, setDay] = useState(null);
  const taken = new Map((week?.sessions || []).map((s) => [s.day % 7, s]));

  return (
    <>
      <DayPicker value={day} onChange={setDay} taken={taken} />

      <p className="text-[12px] leading-[1.45] font-medium text-ink-muted">
        {taken.size
          ? `Greyed days already have a session: ${[...taken.entries()]
              .sort((a, b) => a[0] - b[0])
              .map(([d, s]) => `${dayName(d).slice(0, 3)} ${s.name}`)
              .join(', ')}.`
          : 'Every day of this week is free.'}
      </p>

      <PillButton disabled={day == null || busy} onClick={() => onPick(day)}>
        {busy ? 'Copying…' : day == null ? 'Pick a day' : `Copy to ${dayName(day)}`}
      </PillButton>
      <PillButton variant="surface" disabled={busy} onClick={onBack}>
        Choose a different week
      </PillButton>
    </>
  );
}

export default function WeekEditor() {
  const { programId, week } = useParams();
  const weekIndex = Number(week);
  const navigate = useNavigate();
  const { refresh: refreshActive } = useProgram();
  const { data, loading, error, refresh, setData } = useApi(`/programs/${programId}`);
  const [adding, setAdding] = useState(false);
  const [addDay, setAddDay] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [copying, setCopying] = useState(null);
  // null until a target week is chosen; then the sheet asks which day.
  const [copyWeek, setCopyWeek] = useState(null);
  const [copyError, setCopyError] = useState(null);
  const [menu, setMenu] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  // A useState flag cannot guard re-entry: several taps in one tick all read the
  // same stale `false` before React flushes. A ref updates synchronously.
  const inFlight = useRef(false);

  const program = data?.program;
  const weekData = program?.weeks.find((w) => w.index === weekIndex);
  const sessions = weekData?.sessions || [];
  const takenDays = sessions.map((s) => s.day % 7);
  const byDay = new Map(sessions.map((s) => [s.day % 7, s]));

  async function mutate(action) {
    const result = await action();
    setData(result);
    // Only feeds the tab bar's action target, and it swallows its own errors —
    // so don't make the user wait on a second round trip before the sheet closes.
    refreshActive();
    return result;
  }

  function closeCopy() {
    setCopying(null);
    setCopyWeek(null);
    setCopyError(null);
  }

  async function copySession(session, toWeek, day) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setCopyError(null);
    try {
      await mutate(() =>
        api.post(`/programs/${programId}/weeks/${weekIndex}/sessions/${session.id}/duplicate`, {
          toWeek,
          day,
        }),
      );
      closeCopy();
    } catch (err) {
      setCopyError(err.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  /**
   * Guarded against a second tap: without it, tapping twice fires a delete for
   * an already-deleted session, and the 404 leaves the sheet stuck open.
   */
  async function deleteSession() {
    if (inFlight.current || !confirmDelete) return;
    inFlight.current = true;
    setBusy(true);
    setDeleteError(null);
    try {
      await mutate(() =>
        api.del(`/programs/${programId}/weeks/${weekIndex}/sessions/${confirmDelete.id}`),
      );
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  return (
    <Screen>
      <div className="flex items-center gap-3">
        <BackButton to={`/programs/${programId}/weeks`} />
        {program ? <Crumb className="min-w-0 flex-1">{program.name}</Crumb> : null}
      </div>

      {loading ? (
        <div className="mt-7 flex flex-col gap-4">
          <Skeleton className="h-9 w-40" radius={12} />
          <Skeleton className="h-12 w-full" radius={12} />
          <Skeleton className="h-16 w-full" radius={12} />
          <Skeleton className="h-16 w-full" radius={12} />
        </div>
      ) : error || !weekData ? (
        <div className="mt-7">
          <ErrorNote onRetry={refresh}>{error?.message || 'That week does not exist.'}</ErrorNote>
        </div>
      ) : (
        <>
          <h1 className="mt-7 text-[30px] leading-[1.1] font-bold tracking-[-0.03em]">
            Week {weekIndex + 1}
          </h1>
          <Label className="mt-2.5">
            {sessions.length ? pluralize(sessions.length, 'session') : 'Nothing built yet'} ·{' '}
            {7 - sessions.length} free days
          </Label>

          {/* Tap a filled day to open it, an empty one to add a session there. */}
          <div className="mt-6">
            <div className="flex gap-1.5">
              {DAY_SHORT.map((letter, index) => {
                const session = byDay.get(index);
                return (
                  <button
                    key={index}
                    type="button"
                    aria-label={
                      session
                        ? `${dayName(index)}: ${session.name}`
                        : `Add a session on ${dayName(index)}`
                    }
                    onClick={() => {
                      if (session) {
                        navigate(
                          `/programs/${programId}/weeks/${weekIndex}/sessions/${session.id}`,
                        );
                      } else {
                        setAddDay(index);
                        setAdding(true);
                      }
                    }}
                    className={cx(
                      'press h-12 flex-1 rounded-[6px] text-[13px] font-bold',
                      session
                        ? 'bg-ink text-white'
                        : 'border border-line-strong bg-surface text-ink-muted hover:border-ink hover:text-ink',
                    )}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </div>

          <SectionRule className="mt-8">Sessions</SectionRule>

          {sessions.length ? (
            <div>
              {sessions.map((session, index) => {
                const { fg } = sessionTypeColor(session.type);
                return (
                  <div key={session.id}>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/programs/${programId}/weeks/${weekIndex}/sessions/${session.id}`,
                          )
                        }
                        className="press flex min-w-0 flex-1 items-center gap-3 py-3.5 text-left"
                      >
                        <span
                          aria-hidden
                          className="h-[26px] w-[3px] shrink-0 rounded-pill"
                          style={{ background: fg }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[15px] leading-none font-semibold">
                              {session.name}
                            </span>
                            <SessionTag type={session.type} />
                          </span>
                          <Label className="mt-1.5">
                            {dayName(session.day)} ·{' '}
                            {pluralize(session.exercises.length, 'exercise')}
                          </Label>
                        </span>
                        <CaretRight size={15} weight="bold" className="shrink-0 text-ink-muted" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMenu(session)}
                        aria-label={`Actions for ${session.name}`}
                        className="press flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-accent-wash hover:text-ink"
                      >
                        <DotsThree size={22} weight="bold" />
                      </button>
                    </div>
                    {index === sessions.length - 1 ? null : <Rule />}
                  </div>
                );
              })}
              <Rule strong />
            </div>
          ) : (
            <Card className="mt-4 p-5 text-center">
              <p className="text-[15px] font-semibold">This week is empty</p>
              <p className="mt-1.5 text-[13px] font-medium text-ink-muted">
                Add a session, or clone a week you have already built from the weeks list.
              </p>
            </Card>
          )}

          <PillButton
            variant="surface"
            className="mt-6"
            onClick={() => {
              const free = [0, 1, 2, 3, 4, 5, 6].find((d) => !takenDays.includes(d)) ?? 0;
              setAddDay(free);
              setAdding(true);
            }}
          >
            <Plus size={17} weight="bold" />
            Add session
          </PillButton>
        </>
      )}

      <Sheet
        open={Boolean(menu)}
        onClose={() => setMenu(null)}
        title={menu?.name}
        subtitle={menu ? dayName(menu.day) : ''}
      >
        <div className="flex flex-col gap-2.5 pb-2">
          <SheetAction
            icon={<Copy size={20} />}
            label="Duplicate"
            description="Copies the whole session — its exercises, sets, reps and RPE targets."
            onClick={() => {
              setCopying(menu);
              setCopyWeek(null);
              setCopyError(null);
              setMenu(null);
            }}
          />
          <SheetAction
            icon={<Trash size={20} />}
            label="Delete"
            description="Sets you already logged for it stay in your history."
            tone="danger"
            onClick={() => {
              setConfirmDelete(menu);
              setMenu(null);
            }}
          />
        </div>
      </Sheet>

      <AddSessionSheet
        key={addDay}
        open={adding}
        defaultDay={addDay}
        takenDays={takenDays}
        onClose={() => setAdding(false)}
        onSubmit={async (body) => {
          await mutate(() => api.post(`/programs/${programId}/weeks/${weekIndex}/sessions`, body));
          setAdding(false);
        }}
      />

      <Sheet
        open={Boolean(copying)}
        onClose={() => {
          if (busy) return;
          closeCopy();
        }}
        title={copying ? `Duplicate ${copying.name}` : ''}
        subtitle={
          copyWeek == null
            ? 'Copy the whole session — its exercises, sets, reps and RPE targets.'
            : `Which day of week ${copyWeek + 1}?`
        }
      >
        <div className="flex flex-col gap-2.5 pb-4">
          {copyError ? <ErrorNote>{copyError}</ErrorNote> : null}

          {copyWeek == null ? (
            (program?.weeks || []).map((w) => {
              const full = w.sessions.length >= 7;
              const here = w.index === weekIndex;
              return (
                <SheetAction
                  key={w.index}
                  icon={here ? <Copy size={20} /> : null}
                  label={here ? `This week (week ${w.index + 1})` : `Week ${w.index + 1}`}
                  description={
                    full
                      ? 'A session every day already'
                      : w.sessions.length
                        ? `${pluralize(w.sessions.length, 'session')} · ${7 - w.sessions.length} free days`
                        : 'Empty'
                  }
                  disabled={full || busy}
                  onClick={() => setCopyWeek(w.index)}
                />
              );
            })
          ) : (
            <CopyDayPicker
              week={(program?.weeks || []).find((w) => w.index === copyWeek)}
              busy={busy}
              onPick={(day) => copySession(copying, copyWeek, day)}
              onBack={() => {
                setCopyWeek(null);
                setCopyError(null);
              }}
            />
          )}
        </div>
      </Sheet>

      <Sheet
        open={Boolean(confirmDelete)}
        onClose={() => {
          if (busy) return;
          setConfirmDelete(null);
          setDeleteError(null);
        }}
        title="Delete this session?"
        subtitle={confirmDelete ? `${confirmDelete.name} and its exercises.` : ''}
      >
        <div className="flex flex-col gap-2.5 pb-4">
          {deleteError ? <ErrorNote>{deleteError}</ErrorNote> : null}
          <SheetAction
            tone="danger"
            icon={<Trash size={20} />}
            label={busy ? 'Deleting…' : 'Delete session'}
            description="Sets you already logged for it stay in your history."
            disabled={busy}
            onClick={deleteSession}
          />
          <PillButton
            variant="surface"
            disabled={busy}
            onClick={() => {
              setConfirmDelete(null);
              setDeleteError(null);
            }}
          >
            Keep it
          </PillButton>
        </div>
      </Sheet>
    </Screen>
  );
}

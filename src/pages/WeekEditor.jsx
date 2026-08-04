import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Modal from '../components/Modal';
import EXERCISES from '../data/exercises.json';
import { sessionTypeColor } from '../lib/categoryColors';
import { useLongPress } from '../lib/useLongPress';
import { cloneSessionInto } from '../lib/cloneUtils';

const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
const DAY_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function classifySession(exercises) {
  let hasUpper = false, hasLower = false, hasCore = false;
  for (const ex of exercises) {
    const meta = ex.exerciseId != null ? EXERCISE_BY_ID.get(ex.exerciseId) : null;
    if (!meta) continue;
    if (meta.bodyRegion === 'Upper Body') hasUpper = true;
    else if (meta.bodyRegion === 'Lower Body') hasLower = true;
    else if (meta.bodyRegion === 'Core') hasCore = true;
  }
  if (hasUpper && hasLower) return 'Full Body';
  if (hasUpper) return 'Upper';
  if (hasLower) return 'Lower';
  if (hasCore) return 'Core';
  return null;
}

function loadProgram() {
  try {
    const raw = localStorage.getItem('overload.activeProgram');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveProgram(program) {
  localStorage.setItem('overload.activeProgram', JSON.stringify(program));
}

// "Choose Your Session" for one week. The M/T/W/T/F/S/S row still controls
// which days exist. Long-press an existing session to clone it onto
// another day in this same week, or clear it — deleting via the day row
// still works too, this is just a more convenient entry point.
export default function WeekEditor() {
  const { weekNumber } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(undefined);
  // sheet: null | {type:'menu', day} | {type:'pickTarget', source} |
  //        {type:'confirmOverwrite', source, target} | {type:'confirmDelete', day}
  const [sheet, setSheet] = useState(null);

  useEffect(() => {
    setProgram(loadProgram());
  }, []);

  if (program === undefined) return null;

  const weekIndex = weekNumber ? Number(weekNumber) - 1 : 0;
  const isOngoing = program && !program.totalWeeks;
  const backHref = isOngoing ? '/program' : '/program/weeks';

  if (!program || !program.weeks || !program.weeks[weekIndex]) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar back={backHref} />
        <div className="flex-1 px-5 pt-4 max-w-[480px] w-full mx-auto">
          <p className="text-text-2 text-sm">Couldn't find that week.</p>
        </div>
      </div>
    );
  }

  const week = program.weeks[weekIndex];
  const sortedSessions = [...week.sessions].sort((a, b) => a.day - b.day);
  const selectedDays = new Set(week.sessions.map((s) => s.day));

  function applyWeek(updater) {
    setProgram((prev) => {
      const next = {
        ...prev,
        weeks: prev.weeks.map((w, i) => (i === weekIndex ? updater(w) : w)),
      };
      saveProgram(next);
      return next;
    });
  }

  function toggleDay(dayIndex) {
    const exists = week.sessions.find((s) => s.day === dayIndex);
    applyWeek((w) => {
      if (exists) {
        return { ...w, sessions: w.sessions.filter((s) => s.day !== dayIndex) };
      }
      return {
        ...w,
        sessions: [...w.sessions, { id: crypto.randomUUID(), day: dayIndex, name: DAY_FULL[dayIndex], exercises: [] }],
      };
    });
  }

  function findSession(dayIndex) {
    return week.sessions.find((s) => s.day === dayIndex);
  }

  function cloneOnto(sourceDay, targetDay) {
    const source = findSession(sourceDay);
    applyWeek((w) => {
      const withoutTarget = w.sessions.filter((s) => s.day !== targetDay);
      return { ...w, sessions: [...withoutTarget, cloneSessionInto(source, targetDay)] };
    });
    setSheet(null);
  }

  function clearSession(dayIndex) {
    applyWeek((w) => ({ ...w, sessions: w.sessions.filter((s) => s.day !== dayIndex) }));
    setSheet(null);
  }

  function requestClone(targetDay) {
    const target = findSession(targetDay);
    if (target && target.exercises.length > 0) {
      setSheet({ type: 'confirmOverwrite', source: sheet.source, target: targetDay });
    } else {
      cloneOnto(sheet.source, targetDay);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar back={backHref} />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
        <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
          {isOngoing ? 'Sessions' : `Week ${weekNumber}`}
        </p>
        <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mt-1 mb-6">
          {isOngoing ? program.name : `Week ${weekNumber}`}
        </h1>

        <div className="flex justify-between gap-1.5 mb-2">
          {DAY_SHORT.map((label, i) => (
            <button
              key={i}
              onClick={() => toggleDay(i)}
              aria-pressed={selectedDays.has(i)}
              aria-label={DAY_FULL[i]}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-display
                          text-sm font-bold transition-colors shrink-0
                          ${selectedDays.has(i) ? 'bg-accent text-white' : 'bg-surface-2 text-text-3'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-center text-xs text-text-2 mb-7">
          {sortedSessions.length > 0
            ? <>Training: <span className="text-text font-medium">{sortedSessions.map((s) => DAY_FULL[s.day].slice(0, 3)).join(', ')}</span></>
            : 'Tap the days you plan to train this week'}
        </p>

        {sortedSessions.length > 0 && (
          <>
            <h2 className="font-display text-2xl font-black uppercase tracking-[-0.3px] mb-3">
              Choose Your Session
            </h2>
            <div className="flex flex-col gap-3">
              {sortedSessions.map((s) => (
                <SessionCard
                  key={s.day}
                  session={s}
                  weekNumber={weekNumber}
                  onLongPress={() => setSheet({ type: 'menu', day: s.day })}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {sheet?.type === 'menu' && (
        <Modal onClose={() => setSheet(null)} labelledBy="session-menu-title">
          <h2 id="session-menu-title" className="font-display text-2xl font-extrabold uppercase mb-4">
            {findSession(sheet.day)?.name}
          </h2>
          <div className="flex flex-col gap-2.5">
            {findSession(sheet.day)?.exercises.length > 0 && (
              <button
                className="btn btn-secondary"
                onClick={() => setSheet({ type: 'pickTarget', source: sheet.day })}
              >
                Clone this session
              </button>
            )}
            <button
              className="btn btn-ghost-danger border-[1.5px] border-danger/30"
              onClick={() => {
                const target = findSession(sheet.day);
                if (target && target.exercises.length > 0) {
                  setSheet({ type: 'confirmDelete', day: sheet.day });
                } else {
                  clearSession(sheet.day);
                }
              }}
            >
              Delete this session
            </button>
          </div>
        </Modal>
      )}

      {sheet?.type === 'pickTarget' && (
        <Modal onClose={() => setSheet(null)} labelledBy="pick-day-title">
          <h2 id="pick-day-title" className="font-display text-2xl font-extrabold uppercase mb-1.5">
            Clone onto which day?
          </h2>
          <p className="text-[13px] text-text-2 mb-4">
            Copying {findSession(sheet.source)?.name} — pick a destination day in Week {weekNumber}.
          </p>
          <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto">
            {DAY_FULL.map((label, i) => {
              if (i === sheet.source) return null;
              const existing = findSession(i);
              return (
                <button
                  key={i}
                  onClick={() => requestClone(i)}
                  className="w-full flex items-center justify-between bg-surface border border-border
                             rounded-card px-4 py-3 text-left active:bg-bg-2"
                >
                  <span className="font-display text-base font-bold uppercase">{label}</span>
                  <span className="font-mono text-[11px] text-text-3">
                    {existing
                      ? existing.exercises.length > 0
                        ? 'Has content — will overwrite'
                        : 'Selected, empty'
                      : 'Not selected yet'}
                  </span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {sheet?.type === 'confirmOverwrite' && (
        <Modal onClose={() => setSheet(null)} labelledBy="confirm-overwrite-session-title">
          <h2 id="confirm-overwrite-session-title" className="font-display text-2xl font-extrabold uppercase mb-1.5">
            Overwrite {DAY_FULL[sheet.target]}?
          </h2>
          <p className="text-[13px] text-text-2 mb-5">
            It already has exercises — cloning {findSession(sheet.source)?.name} onto it replaces everything there. This can't be undone.
          </p>
          <div className="flex gap-2.5">
            <button className="btn btn-secondary" onClick={() => setSheet({ type: 'pickTarget', source: sheet.source })}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => cloneOnto(sheet.source, sheet.target)}>
              Overwrite
            </button>
          </div>
        </Modal>
      )}

      {sheet?.type === 'confirmDelete' && (
        <Modal onClose={() => setSheet(null)} labelledBy="confirm-delete-session-title">
          <h2 id="confirm-delete-session-title" className="font-display text-2xl font-extrabold uppercase mb-1.5">
            Delete {findSession(sheet.day)?.name}?
          </h2>
          <p className="text-[13px] text-text-2 mb-5">
            This removes the day and every exercise in it. This can't be undone.
          </p>
          <div className="flex gap-2.5">
            <button className="btn btn-secondary" onClick={() => setSheet(null)}>Cancel</button>
            <button className="btn btn-primary bg-danger" onClick={() => clearSession(sheet.day)}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SessionCard({ session, weekNumber, onLongPress }) {
  const navigate = useNavigate();
  const type = classifySession(session.exercises);
  const color = sessionTypeColor(type);
  const totalSets = session.exercises.reduce((sum, e) => sum + (e.sets || 0), 0);
  const press = useLongPress(onLongPress, () => navigate(`/program/week/${weekNumber}/session/${session.day}`));

  return (
    <button
      {...press}
      style={{ borderLeftColor: color.border }}
      className="text-left bg-surface border border-border border-l-[5px] rounded-card
                 p-4 active:scale-[0.98] transition-transform select-none"
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="font-display text-lg font-extrabold uppercase">{session.name}</span>
        {type && (
          <span
            className="font-mono text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ background: color.chipBg, color: color.chipText }}
          >
            {type}
          </span>
        )}
      </div>
      <span className="font-mono text-[11px] text-text-3">
        {session.exercises.length} exercises &middot; {totalSets} sets
      </span>
    </button>
  );
}

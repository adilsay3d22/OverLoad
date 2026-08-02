import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import ExercisePicker from '../components/ExercisePicker';
import EXERCISES from '../data/exercises.json';

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

// Live, auto-saving editor for a single week. The M/T/W/T/F/S/S row
// controls which days have a session at all — tapping a day on creates
// its session, tapping it off removes it (and its exercises) immediately.
// The tab row below only ever shows days that are currently selected, and
// switches which one you're editing; it never adds or removes anything.
export default function WeekEditor() {
  const { weekNumber } = useParams();
  const navigate = useNavigate();
  const [program, setProgram] = useState(undefined);
  const [activeDay, setActiveDay] = useState(null);
  const [openDay, setOpenDay] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [sets, setSets] = useState('3');
  const [repsMin, setRepsMin] = useState('8');
  const [repsMax, setRepsMax] = useState('12');
  const [showSaved, setShowSaved] = useState(false);
  const savedTimeout = useRef(null);

  const weekIndex = weekNumber ? Number(weekNumber) - 1 : 0;
  const isOngoing = program && !program.totalWeeks;

  useEffect(() => {
    const p = loadProgram();
    setProgram(p);
    const week = p?.weeks?.[weekIndex];
    if (week && week.sessions.length > 0) {
      const first = [...week.sessions].sort((a, b) => a.day - b.day)[0];
      setActiveDay(first.day);
      setOpenDay(first.exercises.length === 0 ? first.day : null);
    }
  }, [weekIndex]);

  if (program === undefined) return null;

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
  const activeSession = sortedSessions.find((s) => s.day === activeDay) || sortedSessions[0];
  const selectedDays = new Set(week.sessions.map((s) => s.day));

  function mutateWeek(updater) {
    setProgram((prev) => {
      const next = {
        ...prev,
        weeks: prev.weeks.map((w, i) => (i === weekIndex ? updater(w) : w)),
      };
      saveProgram(next);
      return next;
    });
    setShowSaved(true);
    clearTimeout(savedTimeout.current);
    savedTimeout.current = setTimeout(() => setShowSaved(false), 1500);
  }

  function toggleDay(dayIndex) {
    mutateWeek((w) => {
      const exists = w.sessions.find((s) => s.day === dayIndex);
      if (exists) {
        const remaining = w.sessions.filter((s) => s.day !== dayIndex);
        if (activeDay === dayIndex) {
          const next = remaining.sort((a, b) => a.day - b.day)[0];
          setActiveDay(next ? next.day : null);
          setOpenDay(next && next.exercises.length === 0 ? next.day : null);
        }
        return { ...w, sessions: remaining };
      }
      setActiveDay(dayIndex);
      setOpenDay(dayIndex);
      setChosen(null);
      return {
        ...w,
        sessions: [...w.sessions, { id: crypto.randomUUID(), day: dayIndex, name: DAY_FULL[dayIndex], exercises: [] }],
      };
    });
  }

  function renameSession(dayIndex, name) {
    mutateWeek((w) => ({
      ...w,
      sessions: w.sessions.map((s) => (s.day === dayIndex ? { ...s, name } : s)),
    }));
  }

  function addExercise(dayIndex, exercise) {
    mutateWeek((w) => ({
      ...w,
      sessions: w.sessions.map((s) =>
        s.day === dayIndex
          ? { ...s, exercises: [...s.exercises, { id: crypto.randomUUID(), ...exercise }] }
          : s
      ),
    }));
  }

  function removeExercise(dayIndex, exerciseId) {
    mutateWeek((w) => ({
      ...w,
      sessions: w.sessions.map((s) =>
        s.day === dayIndex
          ? { ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId) }
          : s
      ),
    }));
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!chosen || !activeSession) return;
    addExercise(activeSession.day, {
      name: chosen.name,
      exerciseId: chosen.exerciseId,
      sets: Number(sets) || 1,
      repsMin: Number(repsMin) || 1,
      repsMax: Number(repsMax) || Number(repsMin) || 1,
    });
    setChosen(null);
    setSets('3'); setRepsMin('8'); setRepsMax('12');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar back={backHref} />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
        <div className="flex items-center justify-between mb-1">
          <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
            {isOngoing ? 'Sessions' : `Week ${weekNumber}`}
          </p>
          <span className={`font-mono text-[10px] font-semibold uppercase tracking-wide text-text-3
                             transition-opacity duration-300 ${showSaved ? 'opacity-100' : 'opacity-0'}`}>
            ✓ Saved
          </span>
        </div>
        <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mb-6">
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
        <p className="text-center text-xs text-text-2 mb-6">
          {sortedSessions.length > 0
            ? <>Training: <span className="text-text font-medium">{sortedSessions.map((s) => DAY_FULL[s.day].slice(0, 3)).join(', ')}</span></>
            : 'Tap the days you plan to train this week'}
        </p>

        {activeSession && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-5 px-5">
              {sortedSessions.map((s) => (
                <button
                  key={s.day}
                  onClick={() => {
                    setActiveDay(s.day);
                    setOpenDay(s.exercises.length === 0 ? s.day : null);
                    setChosen(null);
                  }}
                  className={`shrink-0 h-9 px-4 rounded-full font-display text-sm font-bold uppercase
                              border-[1.5px] transition-colors
                              ${activeDay === s.day
                                ? 'bg-accent text-white border-accent'
                                : 'bg-surface text-text-2 border-border'}`}
                >
                  {s.name}
                  {s.exercises.length > 0 && <span className="ml-1.5 opacity-70">({s.exercises.length})</span>}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2.5 mb-2">
              <input
                className="flex-1 h-10 rounded-field border-[1.5px] border-border-2 bg-surface px-3
                           text-sm font-medium text-text focus:border-accent focus:outline-none"
                value={activeSession.name}
                onChange={(e) => renameSession(activeSession.day, e.target.value)}
              />
              {classifySession(activeSession.exercises) && (
                <span className="font-mono text-[10px] font-semibold uppercase tracking-wide
                                  text-accent bg-accent-dim px-1.5 py-0.5 rounded shrink-0">
                  {classifySession(activeSession.exercises)}
                </span>
              )}
            </div>

            {activeSession.exercises.length > 0 && (
              <div className="flex flex-col gap-2 mb-5 mt-3">
                {activeSession.exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between bg-surface border border-border rounded-card px-4 py-3"
                  >
                    <div>
                      <div className="font-display text-base font-bold uppercase">{ex.name}</div>
                      <div className="font-mono text-[11px] text-text-3 mt-0.5">
                        {ex.sets} sets &middot; {ex.repsMin}-{ex.repsMax} reps
                      </div>
                    </div>
                    <button
                      className="w-7 h-7 rounded-full bg-bg-2 text-text-2 text-sm flex items-center justify-center"
                      onClick={() => removeExercise(activeSession.day, ex.id)}
                      aria-label={`Remove ${ex.name}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeSession.exercises.length > 0 && openDay !== activeSession.day && (
              <button
                className="btn btn-secondary"
                onClick={() => setOpenDay(activeSession.day)}
              >
                Edit exercises
              </button>
            )}

            {openDay === activeSession.day && (
              <div className="bg-surface-2 border border-border rounded-card p-4 mt-3">
                <p className="font-mono text-[10px] font-semibold tracking-[2px] uppercase text-text-3 mb-3">
                  Add an exercise
                </p>

                {!chosen ? (
                  <ExercisePicker
                    onSelect={setChosen}
                    excludeIds={activeSession.exercises.map((e) => e.exerciseId).filter(Boolean)}
                  />
                ) : (
                  <form onSubmit={handleAdd}>
                    <div className="flex items-center justify-between bg-surface border border-border-2 rounded-field px-3.5 h-11 mb-3.5">
                      <span className="text-sm text-text font-medium truncate">{chosen.name}</span>
                      <button type="button" className="text-xs font-medium text-accent shrink-0 ml-2" onClick={() => setChosen(null)}>
                        Change
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3.5">
                      <MiniField label="Sets" value={sets} onChange={setSets} />
                      <MiniField label="Min reps" value={repsMin} onChange={setRepsMin} />
                      <MiniField label="Max reps" value={repsMax} onChange={setRepsMax} />
                    </div>
                    <button type="submit" className="btn btn-secondary">Add exercise</button>
                  </form>
                )}

                {activeSession.exercises.length > 0 && (
                  <button
                    className="btn btn-primary mt-3"
                    onClick={() => { setOpenDay(null); setChosen(null); }}
                  >
                    Done
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MiniField({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-wide text-text-3 mb-1.5 text-center">
        {label}
      </span>
      <input
        type="number" min="1" value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-11 rounded-field border-[1.5px] border-border-2 bg-surface px-2
                   text-sm text-center text-text focus:border-accent focus:outline-none"
      />
    </label>
  );
}

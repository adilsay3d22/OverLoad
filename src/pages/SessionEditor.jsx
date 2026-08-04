import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import ExercisePicker from '../components/ExercisePicker';
import EXERCISES from '../data/exercises.json';
import { sessionTypeColor, categoryColor } from '../lib/categoryColors';

const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
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

// Dedicated full-screen editor for exactly one session. Slides in from the
// right on entry and slides back out on exit — a deliberate "you have
// pushed into a specific place" cue, so switching between sessions can
// never be mistaken for still being on a different one.
export default function SessionEditor() {
  const { weekNumber, day } = useParams();
  const navigate = useNavigate();
  const dayIndex = Number(day);
  const weekIndex = weekNumber ? Number(weekNumber) - 1 : 0;

  const [program, setProgram] = useState(undefined);
  const [leaving, setLeaving] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [chosen, setChosen] = useState(null);
  const [sets, setSets] = useState('3');
  const [repsMin, setRepsMin] = useState('8');
  const [repsMax, setRepsMax] = useState('12');
  const [showSaved, setShowSaved] = useState(false);
  const savedTimeout = useRef(null);

  useEffect(() => {
    const p = loadProgram();
    setProgram(p);
    const week = p?.weeks?.[weekIndex];
    const session = week?.sessions?.find((s) => s.day === dayIndex);
    setOpenAdd(session ? session.exercises.length === 0 : false);
  }, [weekIndex, dayIndex]);

  if (program === undefined) return null;

  const isOngoing = program && !program.totalWeeks;
  const listHref = isOngoing ? `/program/week/1` : `/program/week/${weekNumber}`;

  function goBack() {
    setLeaving(true);
    setTimeout(() => navigate(listHref), 180);
  }

  if (!program || !program.weeks || !program.weeks[weekIndex]) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar back={listHref} />
        <div className="flex-1 px-5 pt-4 max-w-[480px] w-full mx-auto">
          <p className="text-text-2 text-sm">Couldn't find that week.</p>
        </div>
      </div>
    );
  }

  const week = program.weeks[weekIndex];
  const session = week.sessions.find((s) => s.day === dayIndex);

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar back={listHref} />
        <div className="flex-1 px-5 pt-4 max-w-[480px] w-full mx-auto">
          <p className="text-text-2 text-sm">Couldn't find that session.</p>
        </div>
      </div>
    );
  }

  const type = classifySession(session.exercises);
  const typeColor = sessionTypeColor(type);

  function mutate(updater) {
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

  function renameSession(name) {
    mutate((w) => ({
      ...w,
      sessions: w.sessions.map((s) => (s.day === dayIndex ? { ...s, name } : s)),
    }));
  }

  function addExercise(exercise) {
    mutate((w) => ({
      ...w,
      sessions: w.sessions.map((s) =>
        s.day === dayIndex
          ? { ...s, exercises: [...s.exercises, { id: crypto.randomUUID(), ...exercise }] }
          : s
      ),
    }));
  }

  function removeExercise(exerciseId) {
    mutate((w) => ({
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
    if (!chosen) return;
    addExercise({
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
    <div
      className={`min-h-screen flex flex-col bg-bg ${
        leaving
          ? '[animation:slideOutRight_0.18s_ease-in_both]'
          : '[animation:slideInRight_0.22s_cubic-bezier(0.16,1,0.3,1)_both]'
      }`}
    >
      <TopBar back={listHref} onBack={goBack} />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
        <div className="flex items-center justify-between mb-1">
          <p className="font-mono text-[10px] font-semibold tracking-[2px] uppercase text-text-3">
            {isOngoing ? session.name : `Week ${weekNumber} · ${session.name}`}
          </p>
          <span className={`font-mono text-[10px] font-semibold uppercase tracking-wide text-text-3
                             transition-opacity duration-300 ${showSaved ? 'opacity-100' : 'opacity-0'}`}>
            ✓ Saved
          </span>
        </div>

        <div className="flex items-center gap-2.5 mb-2">
          <input
            className="flex-1 h-[46px] rounded-field border-[1.5px] border-border-2 bg-bg-2 px-3.5
                       font-display text-2xl font-black uppercase tracking-[-0.3px] text-text
                       focus:border-accent focus:outline-none"
            value={session.name}
            onChange={(e) => renameSession(e.target.value)}
          />
        </div>
        {type && (
          <span
            className="inline-block font-mono text-[10px] font-semibold uppercase tracking-wide
                       px-2 py-0.5 rounded mb-6"
            style={{ background: typeColor.chipBg, color: typeColor.chipText }}
          >
            {type}
          </span>
        )}
        {!type && <div className="mb-6" />}

        {session.exercises.length > 0 && (
          <div className="flex flex-col gap-2.5 mb-5">
            {session.exercises.map((ex, i) => {
              const meta = ex.exerciseId != null ? EXERCISE_BY_ID.get(ex.exerciseId) : null;
              const color = meta ? categoryColor(meta.category) : null;
              return (
                <div
                  key={ex.id}
                  style={color ? { borderLeftColor: color.border } : undefined}
                  className={`flex items-start gap-3 bg-surface border border-border rounded-card p-4
                              ${color ? 'border-l-[5px]' : ''}`}
                >
                  <span className="w-7 h-7 rounded-full bg-bg-2 text-text-2 font-mono text-xs font-semibold
                                    flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-base font-bold uppercase truncate">{ex.name}</span>
                      {meta?.category && color && (
                        <span
                          className="font-mono text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                          style={{ background: color.chipBg, color: color.chipText }}
                        >
                          {meta.category}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[12px] text-text-3 mt-1">
                      {ex.sets}&times;{ex.repsMin}-{ex.repsMax} reps
                    </p>
                  </div>
                  <button
                    className="w-7 h-7 rounded-full bg-bg-2 text-text-2 text-sm flex items-center justify-center shrink-0"
                    onClick={() => removeExercise(ex.id)}
                    aria-label={`Remove ${ex.name}`}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {session.exercises.length > 0 && !openAdd && (
          <button className="btn btn-secondary" onClick={() => setOpenAdd(true)}>
            Edit {session.name}
          </button>
        )}

        {openAdd && (
          <div className="bg-surface-2 border border-border rounded-card p-4">
            <p className="font-mono text-[10px] font-semibold tracking-[2px] uppercase text-text-3 mb-3">
              Add to {session.name}
            </p>

            {!chosen ? (
              <ExercisePicker
                onSelect={setChosen}
                excludeIds={session.exercises.map((e) => e.exerciseId).filter(Boolean)}
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

            {session.exercises.length > 0 && (
              <button
                className="btn btn-primary mt-3"
                onClick={() => { setOpenAdd(false); setChosen(null); }}
              >
                Done
              </button>
            )}
          </div>
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

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import RingProgress from '../components/RingProgress';
import { sessionTypeColor, categoryColor } from '../lib/categoryColors';
import EXERCISES from '../data/exercises.json';

const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

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

function loadLog() {
  try {
    return JSON.parse(localStorage.getItem('overload.log')) || {};
  } catch {
    return {};
  }
}

function saveLog(log) {
  localStorage.setItem('overload.log', JSON.stringify(log));
}

function logKey(weekNumber, day) {
  return `${weekNumber || 'ongoing'}-${day}`;
}

// Builds/repairs the logged-sets shape for a session: one row per planned
// set, per exercise. Keeps any values already logged; pads or trims if the
// plan's set count changed since the last time this session was logged.
function ensureShape(existingEntry, session) {
  const exercises = {};
  for (const ex of session.exercises) {
    const prevSets = existingEntry?.exercises?.[ex.id]?.sets || [];
    exercises[ex.id] = {
      sets: Array.from({ length: ex.sets }, (_, i) => prevSets[i] || { weight: '', reps: '', done: false }),
    };
  }
  return { sessionName: session.name, exercises };
}

// Logging is deliberately separate from planning (SessionEditor): editing
// what a session *should* contain and recording what you *actually* did
// are different modes, with different data — the plan lives on the
// program itself, logged performance lives in its own store keyed by
// week+day so redoing a session later doesn't touch the plan.
export default function LogSession() {
  const { weekNumber, day } = useParams();
  const navigate = useNavigate();
  const dayIndex = Number(day);
  const weekIndex = weekNumber ? Number(weekNumber) - 1 : 0;

  const [program, setProgram] = useState(undefined);
  const [entry, setEntry] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const savedTimeout = useRef(null);

  useEffect(() => {
    const p = loadProgram();
    setProgram(p);
    const week = p?.weeks?.[weekIndex];
    const session = week?.sessions?.find((s) => s.day === dayIndex);
    if (session) {
      const log = loadLog();
      const key = logKey(weekNumber, dayIndex);
      setEntry(ensureShape(log[key], session));
    }
  }, [weekIndex, dayIndex, weekNumber]);

  if (program === undefined || (program && !entry)) return null;

  const isOngoing = program && !program.totalWeeks;
  const planHref = `/program/week/${weekNumber || 1}/session/${dayIndex}`;

  function goBack() {
    setLeaving(true);
    setTimeout(() => navigate(planHref), 180);
  }

  if (!program || !program.weeks || !program.weeks[weekIndex]) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar back={planHref} />
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
        <TopBar back={planHref} />
        <div className="flex-1 px-5 pt-4 max-w-[480px] w-full mx-auto">
          <p className="text-text-2 text-sm">Couldn't find that session.</p>
        </div>
      </div>
    );
  }

  const type = classifySession(session.exercises);
  const typeColor = sessionTypeColor(type);

  function updateSet(exerciseId, setIndex, patch) {
    setEntry((prev) => {
      const next = {
        ...prev,
        exercises: {
          ...prev.exercises,
          [exerciseId]: {
            sets: prev.exercises[exerciseId].sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s)),
          },
        },
      };
      const log = loadLog();
      log[logKey(weekNumber, dayIndex)] = next;
      saveLog(log);
      setShowSaved(true);
      clearTimeout(savedTimeout.current);
      savedTimeout.current = setTimeout(() => setShowSaved(false), 1200);
      return next;
    });
  }

  const allSets = session.exercises.flatMap((ex) => entry.exercises[ex.id]?.sets || []);
  const doneCount = allSets.filter((s) => s.done).length;
  const totalCount = allSets.length;
  const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div
      className={`min-h-screen flex flex-col bg-bg ${
        leaving
          ? '[animation:slideOutRight_0.18s_ease-in_both]'
          : '[animation:slideInRight_0.22s_cubic-bezier(0.16,1,0.3,1)_both]'
      }`}
    >
      <TopBar back={planHref} onBack={goBack} />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
        <div className="flex items-center justify-between mb-1">
          <p className="font-mono text-[10px] font-semibold tracking-[2px] uppercase text-text-3">
            {isOngoing ? 'Logging' : `Week ${weekNumber} · Logging`}
          </p>
          <span className={`font-mono text-[10px] font-semibold uppercase tracking-wide text-text-3
                             transition-opacity duration-300 ${showSaved ? 'opacity-100' : 'opacity-0'}`}>
            ✓ Saved
          </span>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none">
            {session.name}
          </h1>
          {type && (
            <span
              className="font-mono text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0"
              style={{ background: typeColor.chipBg, color: typeColor.chipText }}
            >
              {type}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mb-6 mt-4">
          <RingProgress percent={percent} size={36} stroke={4} />
          <div>
            <div className="font-display text-lg font-extrabold uppercase leading-none">
              {doneCount}/{totalCount} sets
            </div>
            <div className="font-mono text-[10px] text-text-3 uppercase tracking-wide mt-0.5">
              {percent}% done
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {session.exercises.map((ex) => {
            const meta = ex.exerciseId != null ? EXERCISE_BY_ID.get(ex.exerciseId) : null;
            const category = meta?.category || ex.category || null;
            const color = category ? categoryColor(category) : null;
            const sets = entry.exercises[ex.id]?.sets || [];

            return (
              <div
                key={ex.id}
                style={color ? { borderLeftColor: color.border } : undefined}
                className={`bg-surface border border-border rounded-card p-4 ${color ? 'border-l-[5px]' : ''}`}
              >
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span className="font-display text-base font-bold uppercase">{ex.name}</span>
                  {category && color && (
                    <span
                      className="font-mono text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                      style={{ background: color.chipBg, color: color.chipText }}
                    >
                      {category}
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-text-3">
                    Target: {ex.repsMin === ex.repsMax ? ex.repsMin : `${ex.repsMin}-${ex.repsMax}`} {ex.repsUnit === 'sec' ? 'sec' : 'reps'}
                    {ex.rpe != null && ` · RPE ${ex.rpe}`}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {sets.map((s, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-text-3 w-11 shrink-0">Set {i + 1}</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="Weight"
                        value={s.weight}
                        onChange={(e) => updateSet(ex.id, i, { weight: e.target.value })}
                        className="w-0 flex-1 h-10 rounded-field border-[1.5px] border-border-2 bg-bg-2 px-2.5
                                   text-sm text-center text-text focus:border-accent focus:outline-none"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Reps"
                        value={s.reps}
                        onChange={(e) => updateSet(ex.id, i, { reps: e.target.value })}
                        className="w-0 flex-1 h-10 rounded-field border-[1.5px] border-border-2 bg-bg-2 px-2.5
                                   text-sm text-center text-text focus:border-accent focus:outline-none"
                      />
                      <button
                        onClick={() => updateSet(ex.id, i, { done: !s.done })}
                        aria-pressed={s.done}
                        aria-label={`Mark set ${i + 1} ${s.done ? 'incomplete' : 'complete'}`}
                        className={`w-10 h-10 rounded-field flex items-center justify-center shrink-0 font-bold
                                    transition-colors border-[1.5px]
                                    ${s.done
                                      ? 'bg-accent border-accent text-white'
                                      : 'bg-surface border-border-2 text-text-3'}`}
                      >
                        ✓
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

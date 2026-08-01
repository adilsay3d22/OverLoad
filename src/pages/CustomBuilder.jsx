import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import ExercisePicker from '../components/ExercisePicker';
import EXERCISES from '../data/exercises.json';

const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

// Looks at the bodyRegion (Upper Body / Lower Body / Core) of whatever's
// been added to a session and infers a label for it. Custom-typed exercises
// (no exerciseId) have no region data, so they're skipped rather than
// guessed at. Core alone doesn't force "Full Body" — it's common accessory
// work on either an Upper or a Lower session.
function classifySession(exercises) {
  let hasUpper = false;
  let hasLower = false;
  let hasCore = false;

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

function newSession(n) {
  return { id: crypto.randomUUID(), name: `Session ${n}`, exercises: [] };
}

export default function CustomBuilder() {
  const navigate = useNavigate();

  // 'duration' -> 'phaseMode' -> ('phaseLengths' if multiple) -> 'buildPhase' (loop) -> 'final'
  const [step, setStep] = useState('duration');
  const [totalWeeks, setTotalWeeks] = useState('');
  const [phaseLengths, setPhaseLengths] = useState(['', '']);
  const [phases, setPhases] = useState([]); // [{ weekStart, weekEnd, sessions: [...] }]
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [programName, setProgramName] = useState('');

  function startSinglePhase(weekStart, weekEnd) {
    setPhases([{ weekStart, weekEnd, sessions: [newSession(1)] }]);
    setPhaseIndex(0);
    setStep('buildPhase');
  }

  function handleDurationContinue() {
    if (!totalWeeks.trim()) {
      startSinglePhase(null, null); // ongoing, no week structure
    } else {
      setStep('phaseMode');
    }
  }

  function choosePhaseMode(mode) {
    if (mode === 'single') {
      startSinglePhase(1, Number(totalWeeks));
    } else {
      setPhaseLengths(['', '']);
      setStep('phaseLengths');
    }
  }

  function confirmPhaseLengths() {
    let weekStart = 1;
    const built = phaseLengths.map((lenStr) => {
      const len = Number(lenStr);
      const weekEnd = weekStart + len - 1;
      const phase = { weekStart, weekEnd, sessions: [newSession(1)] };
      weekStart = weekEnd + 1;
      return phase;
    });
    setPhases(built);
    setPhaseIndex(0);
    setStep('buildPhase');
  }

  function updatePhase(index, updater) {
    setPhases((prev) => prev.map((p, i) => (i === index ? updater(p) : p)));
  }

  function addSession(index) {
    updatePhase(index, (p) => ({
      ...p,
      sessions: [...p.sessions, newSession(p.sessions.length + 1)],
    }));
  }

  function removeSession(index, sessionId) {
    updatePhase(index, (p) => ({
      ...p,
      sessions: p.sessions.filter((s) => s.id !== sessionId),
    }));
  }

  function renameSession(index, sessionId, name) {
    updatePhase(index, (p) => ({
      ...p,
      sessions: p.sessions.map((s) => (s.id === sessionId ? { ...s, name } : s)),
    }));
  }

  function addExercise(index, sessionId, exercise) {
    updatePhase(index, (p) => ({
      ...p,
      sessions: p.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, exercises: [...s.exercises, { id: crypto.randomUUID(), ...exercise }] }
          : s
      ),
    }));
  }

  function removeExercise(index, sessionId, exerciseId) {
    updatePhase(index, (p) => ({
      ...p,
      sessions: p.sessions.map((s) =>
        s.id === sessionId
          ? { ...s, exercises: s.exercises.filter((e) => e.id !== exerciseId) }
          : s
      ),
    }));
  }

  function phaseContinue() {
    if (phaseIndex < phases.length - 1) {
      setPhaseIndex(phaseIndex + 1);
    } else {
      setStep('final');
    }
  }

  function phaseBack() {
    if (phaseIndex > 0) {
      setPhaseIndex(phaseIndex - 1);
    } else if (phases.length > 1) {
      setStep('phaseLengths');
    } else if (totalWeeks.trim()) {
      setStep('phaseMode');
    } else {
      setStep('duration');
    }
  }

  function finish() {
    const program = {
      type: 'custom',
      name: programName.trim() || 'Custom Program',
      totalWeeks: totalWeeks.trim() ? Number(totalWeeks) : null,
      phases: phases.map((p, i) => ({
        label: phases.length > 1 ? `Phase ${i + 1}` : null,
        weekStart: p.weekStart,
        weekEnd: p.weekEnd,
        sessions: p.sessions.map((s) => ({
          name: s.name,
          sessionType: classifySession(s.exercises),
          exercises: s.exercises.map(({ id, ...rest }) => rest),
        })),
      })),
    };
    localStorage.setItem('overload.activeProgram', JSON.stringify(program));
    localStorage.setItem('overload.currentWeek', '1');
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar back="/create-program" />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
        {step === 'duration' && (
          <DurationStep
            totalWeeks={totalWeeks}
            setTotalWeeks={setTotalWeeks}
            onContinue={handleDurationContinue}
          />
        )}

        {step === 'phaseMode' && (
          <PhaseModeStep
            totalWeeks={totalWeeks}
            onChoose={choosePhaseMode}
            onBack={() => setStep('duration')}
          />
        )}

        {step === 'phaseLengths' && (
          <PhaseLengthsStep
            totalWeeks={Number(totalWeeks)}
            phaseLengths={phaseLengths}
            setPhaseLengths={setPhaseLengths}
            onBack={() => setStep('phaseMode')}
            onContinue={confirmPhaseLengths}
          />
        )}

        {step === 'buildPhase' && (
          <BuildPhaseStep
            key={phaseIndex}
            phase={phases[phaseIndex]}
            phaseNumber={phaseIndex + 1}
            totalPhases={phases.length}
            addSession={() => addSession(phaseIndex)}
            removeSession={(sid) => removeSession(phaseIndex, sid)}
            renameSession={(sid, name) => renameSession(phaseIndex, sid, name)}
            addExercise={(sid, ex) => addExercise(phaseIndex, sid, ex)}
            removeExercise={(sid, eid) => removeExercise(phaseIndex, sid, eid)}
            onBack={phaseBack}
            onContinue={phaseContinue}
          />
        )}

        {step === 'final' && (
          <FinalStep
            programName={programName}
            setProgramName={setProgramName}
            phases={phases}
            onBack={() => setStep('buildPhase')}
            onFinish={finish}
          />
        )}
      </div>
    </div>
  );
}

function StepHeader({ eyebrow, title, subtitle }) {
  return (
    <>
      <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
        {eyebrow}
      </p>
      <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mt-1">
        {title}
      </h1>
      {subtitle && <p className="text-text-2 text-sm mt-2 mb-7">{subtitle}</p>}
    </>
  );
}

function DurationStep({ totalWeeks, setTotalWeeks, onContinue }) {
  return (
    <>
      <StepHeader
        eyebrow="Step 1"
        title="Program length"
        subtitle="How many weeks does this program run? Leave it blank if it's ongoing with no fixed end."
      />
      <input
        type="number"
        min="1"
        className="w-full h-[54px] rounded-field border-[1.5px] border-border-2 bg-bg-2
                   px-4 text-base text-text mb-8 focus:border-accent focus:outline-none"
        placeholder="e.g. 8 — or leave blank"
        value={totalWeeks}
        onChange={(e) => setTotalWeeks(e.target.value)}
        autoFocus
      />
      <button className="btn btn-primary" onClick={onContinue}>Continue</button>
    </>
  );
}

function PhaseModeStep({ totalWeeks, onChoose, onBack }) {
  return (
    <>
      <StepHeader
        eyebrow="Step 2"
        title="Does it change?"
        subtitle={`Over ${totalWeeks} weeks, does the routine stay the same the whole time, or change partway through?`}
      />
      <div className="flex flex-col gap-3">
        <button
          className="w-full text-left bg-surface border-[1.5px] border-border rounded-card p-4 active:scale-[0.98]"
          onClick={() => onChoose('single')}
        >
          <div className="font-display text-lg font-extrabold uppercase">Stays the same</div>
          <p className="text-[13px] text-text-2 mt-1">One set of sessions, repeated every week.</p>
        </button>
        <button
          className="w-full text-left bg-surface border-[1.5px] border-border rounded-card p-4 active:scale-[0.98]"
          onClick={() => onChoose('multiple')}
        >
          <div className="font-display text-lg font-extrabold uppercase">Changes partway through</div>
          <p className="text-[13px] text-text-2 mt-1">
            Split into phases (e.g. weeks 1–4, then 5–8) with different sessions per phase.
          </p>
        </button>
      </div>
      <button className="btn btn-secondary mt-6" onClick={onBack}>Back</button>
    </>
  );
}

function PhaseLengthsStep({ totalWeeks, phaseLengths, setPhaseLengths, onBack, onContinue }) {
  const assigned = phaseLengths.reduce((sum, v) => sum + (Number(v) || 0), 0);
  const remaining = totalWeeks - assigned;
  const valid = remaining === 0 && phaseLengths.every((v) => Number(v) > 0);

  function updateLength(i, value) {
    setPhaseLengths((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }

  function addPhase() {
    setPhaseLengths((prev) => [...prev, '']);
  }

  function removePhase(i) {
    setPhaseLengths((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <>
      <StepHeader
        eyebrow="Step 2"
        title="Phase lengths"
        subtitle={`How many weeks does each phase last? Needs to add up to ${totalWeeks}.`}
      />
      <div className="flex flex-col gap-2.5 mb-3">
        {phaseLengths.map((v, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="font-display text-sm font-bold uppercase w-16 shrink-0">
              Phase {i + 1}
            </span>
            <input
              type="number"
              min="1"
              className="flex-1 h-11 rounded-field border-[1.5px] border-border-2 bg-bg-2
                         px-3.5 text-sm text-text focus:border-accent focus:outline-none"
              placeholder="weeks"
              value={v}
              onChange={(e) => updateLength(i, e.target.value)}
            />
            {phaseLengths.length > 2 && (
              <button
                className="w-8 h-8 rounded-full bg-bg-2 text-text-2 text-sm shrink-0"
                onClick={() => removePhase(i)}
                aria-label={`Remove phase ${i + 1}`}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <button className="text-sm font-medium text-accent mb-6" onClick={addPhase}>
        + Add another phase
      </button>

      <p className={`text-[12px] mb-6 ${remaining === 0 ? 'text-text-3' : 'text-accent'}`}>
        {remaining === 0
          ? `All ${totalWeeks} weeks assigned.`
          : remaining > 0
            ? `${remaining} week${remaining === 1 ? '' : 's'} left to assign.`
            : `${Math.abs(remaining)} week${Math.abs(remaining) === 1 ? '' : 's'} over ${totalWeeks} — reduce a phase.`}
      </p>

      <div className="flex gap-3">
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        <button className="btn btn-primary" disabled={!valid} onClick={onContinue}>Continue</button>
      </div>
    </>
  );
}

function BuildPhaseStep({
  phase, phaseNumber, totalPhases, addSession, removeSession,
  renameSession, addExercise, removeExercise, onBack, onContinue,
}) {
  const [activeSessionId, setActiveSessionId] = useState(phase.sessions[0].id);
  const [chosen, setChosen] = useState(null);
  const [sets, setSets] = useState('3');
  const [repsMin, setRepsMin] = useState('8');
  const [repsMax, setRepsMax] = useState('12');

  const activeSession = phase.sessions.find((s) => s.id === activeSessionId) || phase.sessions[0];
  const allSessionsHaveExercise = phase.sessions.every((s) => s.exercises.length > 0);

  function handleAddSession() {
    addSession();
  }

  function handleAdd(e) {
    e.preventDefault();
    if (!chosen) return;
    addExercise(activeSession.id, {
      name: chosen.name,
      exerciseId: chosen.exerciseId,
      sets: Number(sets) || 1,
      repsMin: Number(repsMin) || 1,
      repsMax: Number(repsMax) || Number(repsMin) || 1,
    });
    setChosen(null);
    setSets('3'); setRepsMin('8'); setRepsMax('12');
  }

  const weekLabel = phase.weekStart
    ? `Weeks ${phase.weekStart}–${phase.weekEnd}`
    : 'Ongoing';

  return (
    <>
      <StepHeader
        eyebrow={totalPhases > 1 ? `Step 3 · Phase ${phaseNumber} of ${totalPhases}` : 'Step 3'}
        title={totalPhases > 1 ? `Phase ${phaseNumber}` : 'Build your sessions'}
        subtitle={`${weekLabel} · add sessions and their exercises.`}
      />

      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-5 px-5">
        {phase.sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSessionId(s.id)}
            className={`shrink-0 h-9 px-4 rounded-full font-display text-sm font-bold uppercase
                        border-[1.5px] transition-colors
                        ${activeSessionId === s.id
                          ? 'bg-accent text-white border-accent'
                          : 'bg-surface text-text-2 border-border'}`}
          >
            {s.name}
            {s.exercises.length > 0 && <span className="ml-1.5 opacity-70">({s.exercises.length})</span>}
          </button>
        ))}
        <button
          onClick={handleAddSession}
          className="shrink-0 h-9 px-4 rounded-full font-display text-sm font-bold uppercase
                     border-[1.5px] border-dashed border-border-2 text-text-3"
        >
          + Session
        </button>
      </div>

      <div className="flex items-center gap-2.5 mb-5">
        <input
          className="flex-1 h-10 rounded-field border-[1.5px] border-border-2 bg-surface px-3
                     text-sm font-medium text-text focus:border-accent focus:outline-none"
          value={activeSession.name}
          onChange={(e) => renameSession(activeSession.id, e.target.value)}
        />
        {phase.sessions.length > 1 && (
          <button
            className="w-9 h-9 rounded-full bg-bg-2 text-text-2 text-sm shrink-0"
            onClick={() => {
              removeSession(activeSession.id);
              const remaining = phase.sessions.filter((s) => s.id !== activeSession.id);
              if (remaining.length > 0) setActiveSessionId(remaining[0].id);
            }}
            aria-label={`Remove ${activeSession.name}`}
          >
            ✕
          </button>
        )}
      </div>

      {activeSession.exercises.length > 0 && (
        <div className="flex flex-col gap-2 mb-5">
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
                onClick={() => removeExercise(activeSession.id, ex.id)}
                aria-label={`Remove ${ex.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="bg-surface-2 border border-border rounded-card p-4">
        <p className="font-mono text-[10px] font-semibold tracking-[2px] uppercase text-text-3 mb-3">
          Add an exercise
        </p>

        {!chosen ? (
          <ExercisePicker onSelect={setChosen} excludeIds={activeSession.exercises.map((e) => e.exerciseId).filter(Boolean)} />
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
      </div>

      {!allSessionsHaveExercise && (
        <p className="text-[12px] text-text-3 mt-4 text-center">
          Add at least one exercise to each session to continue.
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        <button className="btn btn-primary" disabled={!allSessionsHaveExercise} onClick={onContinue}>
          Continue
        </button>
      </div>
    </>
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

function FinalStep({ programName, setProgramName, phases, onBack, onFinish }) {
  return (
    <>
      <StepHeader
        eyebrow="Step 4"
        title="Name it"
        subtitle="Give the whole program a name."
      />

      <input
        className="w-full h-[54px] rounded-field border-[1.5px] border-border-2 bg-bg-2
                   px-4 text-base text-text mb-7 focus:border-accent focus:outline-none"
        placeholder="e.g. My Push Pull Split"
        value={programName}
        onChange={(e) => setProgramName(e.target.value)}
        autoFocus
      />

      <div className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-text-3 mb-2.5">
        Summary
      </div>
      <div className="flex flex-col gap-4 mb-8">
        {phases.map((p, i) => (
          <div key={i}>
            {phases.length > 1 && (
              <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-accent mb-1.5">
                Phase {i + 1} · {p.weekStart ? `Weeks ${p.weekStart}–${p.weekEnd}` : 'Ongoing'}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {p.sessions.map((s) => {
                const type = classifySession(s.exercises);
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between bg-surface border border-border rounded-card px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-bold uppercase">{s.name}</span>
                      {type && (
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-wide
                                          text-accent bg-accent-dim px-1.5 py-0.5 rounded">
                          {type}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-text-3">
                      {s.exercises.length} exercises
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        <button className="btn btn-primary" onClick={onFinish}>Create Program</button>
      </div>
    </>
  );
}

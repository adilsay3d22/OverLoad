import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import DayPicker from '../components/DayPicker';
import ExercisePicker from '../components/ExercisePicker';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function CustomBuilder() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [exercisesByDay, setExercisesByDay] = useState({});
  const [activeDay, setActiveDay] = useState(null);
  const [programName, setProgramName] = useState('');

  const orderedSelectedDays = [...selectedDays].sort((a, b) => a - b);

  function toggleDay(i) {
    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function goToStep2() {
    const first = orderedSelectedDays[0];
    setActiveDay((cur) => (cur !== null && selectedDays.has(cur) ? cur : first));
    setStep(2);
  }

  function addExercise(dayIndex, exercise) {
    setExercisesByDay((prev) => ({
      ...prev,
      [dayIndex]: [...(prev[dayIndex] || []), { id: crypto.randomUUID(), ...exercise }],
    }));
  }

  function removeExercise(dayIndex, exerciseId) {
    setExercisesByDay((prev) => ({
      ...prev,
      [dayIndex]: (prev[dayIndex] || []).filter((e) => e.id !== exerciseId),
    }));
  }

  const allDaysHaveExercise = orderedSelectedDays.every(
    (d) => (exercisesByDay[d] || []).length > 0
  );

  function finish() {
    const program = {
      type: 'custom',
      name: programName.trim() || 'Custom Program',
      days: orderedSelectedDays.map((d) => ({
        day: DAY_LABELS[d],
        exercises: (exercisesByDay[d] || []).map(({ id, ...rest }) => rest),
      })),
    };
    localStorage.setItem('overload.activeProgram', JSON.stringify(program));
    navigate('/');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar back="/create-program" />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
        {step === 1 && (
          <Step1
            selectedDays={selectedDays}
            onToggle={toggleDay}
            onContinue={goToStep2}
          />
        )}

        {step === 2 && (
          <Step2
            orderedSelectedDays={orderedSelectedDays}
            activeDay={activeDay}
            setActiveDay={setActiveDay}
            exercisesByDay={exercisesByDay}
            addExercise={addExercise}
            removeExercise={removeExercise}
            allDaysHaveExercise={allDaysHaveExercise}
            onBack={() => setStep(1)}
            onContinue={() => setStep(3)}
          />
        )}

        {step === 3 && (
          <Step3
            programName={programName}
            setProgramName={setProgramName}
            orderedSelectedDays={orderedSelectedDays}
            exercisesByDay={exercisesByDay}
            onBack={() => setStep(2)}
            onFinish={finish}
          />
        )}
      </div>
    </div>
  );
}

function Step1({ selectedDays, onToggle, onContinue }) {
  return (
    <>
      <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
        Step 1
      </p>
      <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mt-1">
        Pick your days
      </h1>
      <p className="text-text-2 text-sm mt-2 mb-8">
        How many days a week do you want to train? Tap each day you plan to show up.
      </p>

      <DayPicker selected={selectedDays} onToggle={onToggle} />

      <button
        className="btn btn-primary mt-10"
        disabled={selectedDays.size === 0}
        onClick={onContinue}
      >
        Continue
      </button>
    </>
  );
}

function Step2({
  orderedSelectedDays, activeDay, setActiveDay, exercisesByDay,
  addExercise, removeExercise, allDaysHaveExercise, onBack, onContinue,
}) {
  const [chosen, setChosen] = useState(null); // { name, exerciseId }
  const [sets, setSets] = useState('3');
  const [repsMin, setRepsMin] = useState('8');
  const [repsMax, setRepsMax] = useState('12');

  const dayExercises = exercisesByDay[activeDay] || [];

  function handleAdd(e) {
    e.preventDefault();
    if (!chosen) return;
    addExercise(activeDay, {
      name: chosen.name,
      exerciseId: chosen.exerciseId,
      sets: Number(sets) || 1,
      repsMin: Number(repsMin) || 1,
      repsMax: Number(repsMax) || Number(repsMin) || 1,
    });
    setChosen(null);
    setSets('3');
    setRepsMin('8');
    setRepsMax('12');
  }

  return (
    <>
      <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
        Step 2
      </p>
      <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mt-1">
        Add exercises
      </h1>
      <p className="text-text-2 text-sm mt-2 mb-5">
        Pick a day below, then add exercises with sets and a rep range.
      </p>

      <div className="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-5 px-5">
        {orderedSelectedDays.map((d) => (
          <button
            key={d}
            onClick={() => setActiveDay(d)}
            className={`shrink-0 h-9 px-4 rounded-full font-display text-sm font-bold uppercase
                        border-[1.5px] transition-colors
                        ${activeDay === d
                          ? 'bg-accent text-white border-accent'
                          : 'bg-surface text-text-2 border-border'}`}
          >
            {DAY_SHORT(d)}
            {(exercisesByDay[d] || []).length > 0 && (
              <span className="ml-1.5 opacity-70">({exercisesByDay[d].length})</span>
            )}
          </button>
        ))}
      </div>

      {dayExercises.length > 0 && (
        <div className="flex flex-col gap-2 mb-5">
          {dayExercises.map((ex) => (
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
                onClick={() => removeExercise(activeDay, ex.id)}
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
          <ExercisePicker
            onSelect={setChosen}
            excludeIds={dayExercises.map((e) => e.exerciseId).filter(Boolean)}
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
              <Field label="Sets">
                <input
                  type="number" min="1" value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  className="w-full h-11 rounded-field border-[1.5px] border-border-2 bg-surface px-2
                             text-sm text-center text-text focus:border-accent focus:outline-none"
                />
              </Field>
              <Field label="Min reps">
                <input
                  type="number" min="1" value={repsMin}
                  onChange={(e) => setRepsMin(e.target.value)}
                  className="w-full h-11 rounded-field border-[1.5px] border-border-2 bg-surface px-2
                             text-sm text-center text-text focus:border-accent focus:outline-none"
                />
              </Field>
              <Field label="Max reps">
                <input
                  type="number" min="1" value={repsMax}
                  onChange={(e) => setRepsMax(e.target.value)}
                  className="w-full h-11 rounded-field border-[1.5px] border-border-2 bg-surface px-2
                             text-sm text-center text-text focus:border-accent focus:outline-none"
                />
              </Field>
            </div>
            <button type="submit" className="btn btn-secondary">
              Add exercise
            </button>
          </form>
        )}
      </div>

      {!allDaysHaveExercise && (
        <p className="text-[12px] text-text-3 mt-4 text-center">
          Add at least one exercise to each day to continue.
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button className="btn btn-secondary" onClick={onBack}>Back</button>
        <button className="btn btn-primary" disabled={!allDaysHaveExercise} onClick={onContinue}>
          Continue
        </button>
      </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-mono uppercase tracking-wide text-text-3 mb-1.5 text-center">
        {label}
      </span>
      {children}
    </label>
  );
}

function DAY_SHORT(i) {
  return DAY_LABELS[i];
}

function Step3({ programName, setProgramName, orderedSelectedDays, exercisesByDay, onBack, onFinish }) {
  return (
    <>
      <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
        Step 3
      </p>
      <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mt-1">
        Name your split
      </h1>
      <p className="text-text-2 text-sm mt-2 mb-6">
        Give your program a name you'll recognize.
      </p>

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
      <div className="flex flex-col gap-2 mb-8">
        {orderedSelectedDays.map((d) => (
          <div
            key={d}
            className="flex items-center justify-between bg-surface border border-border rounded-card px-4 py-3"
          >
            <span className="font-display text-base font-bold uppercase">{DAY_SHORT(d)}</span>
            <span className="font-mono text-[11px] text-text-3">
              {(exercisesByDay[d] || []).length} exercises
            </span>
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

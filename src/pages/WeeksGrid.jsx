import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Modal from '../components/Modal';
import RingProgress from '../components/RingProgress';
import { useLongPress } from '../lib/useLongPress';
import { cloneWeekSessions } from '../lib/cloneUtils';

function weekHasContent(week) {
  return week.sessions.some((s) => s.exercises.length > 0);
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

// The weeks grid. Long-press a week with content to clone or clear it;
// empty weeks just navigate straight to editing (nothing to act on yet).
export default function WeeksGrid() {
  const navigate = useNavigate();
  const [program, setProgram] = useState(undefined);
  const [currentWeek, setCurrentWeek] = useState(1);
  // sheet: null | {type:'menu', week} | {type:'pickTarget', source} |
  //        {type:'confirmOverwrite', source, target} | {type:'confirmDelete', week}
  const [sheet, setSheet] = useState(null);

  useEffect(() => {
    setProgram(loadProgram());
    setCurrentWeek(Number(localStorage.getItem('overload.currentWeek')) || 1);
  }, []);

  if (program === undefined) return null;

  if (!program || !program.weeks || !program.totalWeeks) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar back="/program" />
        <div className="flex-1 px-5 pt-4 max-w-[480px] w-full mx-auto">
          <p className="text-text-2 text-sm">This program doesn't have a week-by-week structure.</p>
        </div>
      </div>
    );
  }

  function applyWeeks(updater) {
    setProgram((prev) => {
      const next = { ...prev, weeks: updater(prev.weeks) };
      saveProgram(next);
      return next;
    });
  }

  function cloneInto(sourceIdx, targetIdx) {
    applyWeeks((weeks) =>
      weeks.map((w, i) => (i === targetIdx ? { sessions: cloneWeekSessions(weeks[sourceIdx]) } : w))
    );
    setSheet(null);
  }

  function cloneAsNewWeek(sourceIdx) {
    setProgram((prev) => {
      const newWeek = { sessions: cloneWeekSessions(prev.weeks[sourceIdx]) };
      const next = {
        ...prev,
        totalWeeks: prev.totalWeeks + 1,
        weeks: [...prev.weeks, newWeek],
      };
      saveProgram(next);
      return next;
    });
    setSheet(null);
  }

  function clearWeek(weekIdx) {
    applyWeeks((weeks) => weeks.map((w, i) => (i === weekIdx ? { sessions: [] } : w)));
    setSheet(null);
  }

  function requestClone(targetIdx) {
    const target = program.weeks[targetIdx];
    if (weekHasContent(target)) {
      setSheet({ type: 'confirmOverwrite', source: sheet.source, target: targetIdx });
    } else {
      cloneInto(sheet.source, targetIdx);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar back="/program" />

      <div className="flex items-center justify-between px-5 mb-3 max-w-[520px] w-full mx-auto">
        <span className="font-mono text-xs font-semibold uppercase tracking-widest text-text-3">
          All Weeks
        </span>
        <button
          className="h-8 px-3 rounded-lg bg-surface border border-border text-[11px]
                     font-bold uppercase tracking-wide text-text-3 opacity-60"
          disabled
        >
          History
        </button>
      </div>

      <div className="flex-1 px-5 pb-8 max-w-[520px] w-full mx-auto">
        <div className="grid grid-cols-2 gap-3">
          {program.weeks.map((week, i) => (
            <WeekCard
              key={i}
              week={week}
              weekNum={i + 1}
              isCurrent={i + 1 === currentWeek}
              onOpen={() => navigate(`/program/week/${i + 1}`)}
              onLongPress={() => weekHasContent(week) && setSheet({ type: 'menu', week: i })}
            />
          ))}
        </div>
      </div>

      {sheet?.type === 'menu' && (
        <Modal onClose={() => setSheet(null)} labelledBy="week-menu-title">
          <h2 id="week-menu-title" className="font-display text-2xl font-extrabold uppercase mb-4">
            Week {sheet.week + 1}
          </h2>
          <div className="flex flex-col gap-2.5">
            <button
              className="btn btn-secondary"
              onClick={() => setSheet({ type: 'pickTarget', source: sheet.week })}
            >
              Clone this week
            </button>
            <button
              className="btn btn-ghost-danger border-[1.5px] border-danger/30"
              onClick={() => setSheet({ type: 'confirmDelete', week: sheet.week })}
            >
              Clear this week
            </button>
          </div>
        </Modal>
      )}

      {sheet?.type === 'pickTarget' && (
        <Modal onClose={() => setSheet(null)} labelledBy="pick-target-title">
          <h2 id="pick-target-title" className="font-display text-2xl font-extrabold uppercase mb-1.5">
            Clone into which week?
          </h2>
          <p className="text-[13px] text-text-2 mb-4">
            Copying Week {sheet.source + 1} — pick a destination.
          </p>

          <button
            onClick={() => cloneAsNewWeek(sheet.source)}
            className="w-full flex items-center justify-between bg-accent-dim border-[1.5px]
                       border-dashed border-accent-bd rounded-card px-4 py-3 text-left mb-3"
          >
            <span className="font-display text-base font-bold uppercase text-accent">
              + Add as new Week {program.weeks.length + 1}
            </span>
            <span className="font-mono text-[11px] text-accent">Grows the program</span>
          </button>

          <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto">
            {program.weeks.map((w, i) => {
              if (i === sheet.source) return null;
              const has = weekHasContent(w);
              return (
                <button
                  key={i}
                  onClick={() => requestClone(i)}
                  className="w-full flex items-center justify-between bg-surface border border-border
                             rounded-card px-4 py-3 text-left active:bg-bg-2"
                >
                  <span className="font-display text-base font-bold uppercase">Week {i + 1}</span>
                  <span className="font-mono text-[11px] text-text-3">
                    {has ? 'Has content — will overwrite' : 'Empty'}
                  </span>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {sheet?.type === 'confirmOverwrite' && (
        <Modal onClose={() => setSheet(null)} labelledBy="confirm-overwrite-title">
          <h2 id="confirm-overwrite-title" className="font-display text-2xl font-extrabold uppercase mb-1.5">
            Overwrite Week {sheet.target + 1}?
          </h2>
          <p className="text-[13px] text-text-2 mb-5">
            It already has content — cloning Week {sheet.source + 1} into it replaces everything there. This can't be undone.
          </p>
          <div className="flex gap-2.5">
            <button className="btn btn-secondary" onClick={() => setSheet({ type: 'pickTarget', source: sheet.source })}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={() => cloneInto(sheet.source, sheet.target)}>
              Overwrite
            </button>
          </div>
        </Modal>
      )}

      {sheet?.type === 'confirmDelete' && (
        <Modal onClose={() => setSheet(null)} labelledBy="confirm-delete-title">
          <h2 id="confirm-delete-title" className="font-display text-2xl font-extrabold uppercase mb-1.5">
            Clear Week {sheet.week + 1}?
          </h2>
          <p className="text-[13px] text-text-2 mb-5">
            This removes every session and exercise in this week. This can't be undone.
          </p>
          <div className="flex gap-2.5">
            <button className="btn btn-secondary" onClick={() => setSheet(null)}>Cancel</button>
            <button className="btn btn-primary bg-danger" onClick={() => clearWeek(sheet.week)}>Clear</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function WeekCard({ week, weekNum, isCurrent, onOpen, onLongPress }) {
  const hasContent = weekHasContent(week);
  const press = useLongPress(onLongPress, onOpen);

  if (!hasContent) {
    return (
      <button
        {...press}
        className="text-left rounded-card p-4 border-[1.5px] border-dashed border-accent-bd
                   bg-accent-dim active:scale-[0.98] transition-transform select-none"
      >
        <div className="font-display text-xl font-extrabold uppercase text-text">Week {weekNum}</div>
        {isCurrent && (
          <div className="font-mono text-[10px] uppercase tracking-wide text-accent mt-0.5">Current</div>
        )}
        <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-accent mt-2.5">
          + Add workouts
        </div>
      </button>
    );
  }

  return (
    <button
      {...press}
      className={`text-left rounded-card p-4 border-[1.5px] transition-colors active:scale-[0.98] select-none
                  ${isCurrent ? 'bg-accent border-accent' : 'bg-surface border-border'}`}
    >
      <div className="flex items-start justify-between">
        <div className={`font-display text-xl font-extrabold uppercase ${isCurrent ? 'text-white' : 'text-text'}`}>
          Week {weekNum}
        </div>
        <RingProgress percent={0} light={isCurrent} />
      </div>
      <div className={`font-mono text-[10px] uppercase tracking-wide mt-2.5 ${isCurrent ? 'text-white/80' : 'text-text-3'}`}>
        {isCurrent ? 'Current' : 'Not started'}
      </div>
    </button>
  );
}

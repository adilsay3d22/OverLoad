import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import TopBar from '../components/TopBar';
import EXERCISES from '../data/exercises.json';

const EXERCISE_BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

// The actual workout for one session — exercises, sets, rep range. No RPE
// or rest time shown since the builder doesn't capture those for custom
// programs yet; showing fabricated numbers would be worse than omitting them.
export default function SessionDetail() {
  const { phaseIndex, sessionIndex } = useParams();
  const [searchParams] = useSearchParams();
  const week = searchParams.get('week');
  const [program, setProgram] = useState(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('overload.activeProgram');
      setProgram(raw ? JSON.parse(raw) : null);
    } catch {
      setProgram(null);
    }
  }, []);

  if (program === undefined) return null;

  const backHref = week ? `/program/week/${week}` : '/program/sessions';

  const phase = program?.phases?.[Number(phaseIndex)];
  const session = phase?.sessions?.[Number(sessionIndex)];

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar back={backHref} />
        <div className="flex-1 px-5 pt-4 max-w-[480px] w-full mx-auto">
          <p className="text-text-2 text-sm">Couldn't find that session.</p>
        </div>
      </div>
    );
  }

  const totalSets = session.exercises.reduce((sum, e) => sum + (e.sets || 0), 0);

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar back={backHref} />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
        <p className="font-mono text-[10px] font-semibold tracking-[2px] uppercase text-text-3 mb-1">
          {week ? `Week ${week} · ` : ''}{session.name}
        </p>
        <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mb-3">
          {session.name}
        </h1>

        <div className="flex flex-wrap gap-2 mb-6">
          {week && <MetaChip>Week {week}</MetaChip>}
          {phase?.label && <MetaChip>{phase.label}</MetaChip>}
          <MetaChip>{session.exercises.length} exercises</MetaChip>
          <MetaChip>{totalSets} sets</MetaChip>
        </div>

        <div className="flex flex-col gap-2.5">
          {session.exercises.map((ex, i) => {
            const meta = ex.exerciseId != null ? EXERCISE_BY_ID.get(ex.exerciseId) : null;
            return (
              <div
                key={i}
                className="bg-surface border border-border rounded-card p-4 flex items-start gap-3"
              >
                <span className="w-7 h-7 rounded-full bg-bg-2 text-text-2 font-mono text-xs font-semibold
                                  flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display text-base font-bold uppercase truncate">{ex.name}</span>
                    {meta?.category && (
                      <span className="font-mono text-[10px] font-semibold uppercase tracking-wide
                                        text-text-2 bg-surface-2 border border-border-2 px-1.5 py-0.5 rounded">
                        {meta.category}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-[12px] text-text-3 mt-1">
                    {ex.sets}&times;{ex.repsMin}-{ex.repsMax} reps
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MetaChip({ children }) {
  return (
    <span className="font-mono text-[10px] font-semibold uppercase tracking-wide
                      text-text-2 bg-surface-2 border border-border-2 px-2.5 py-1 rounded-full">
      {children}
    </span>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TopBar from '../components/TopBar';

// "Choose Your Session" — reached either from a specific week (fixed-length
// programs, /program/week/:weekNumber) or directly (ongoing programs,
// /program/sessions, always phase 0 since ongoing programs are single-phase).
export default function SessionsForWeek() {
  const navigate = useNavigate();
  const { weekNumber } = useParams();
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
  if (!program || !program.phases) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar back="/program" />
        <div className="flex-1 px-5 pt-4 max-w-[480px] w-full mx-auto">
          <p className="text-text-2 text-sm">
            {program ? "This program doesn't have session data yet." : 'No active program found.'}
          </p>
        </div>
      </div>
    );
  }

  const week = weekNumber ? Number(weekNumber) : null;
  const phaseIndex = week
    ? program.phases.findIndex((p) => p.weekStart != null && week >= p.weekStart && week <= p.weekEnd)
    : 0;
  const phase = program.phases[phaseIndex];
  const backHref = week ? '/program/weeks' : '/program';

  if (!phase) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar back={backHref} />
        <div className="flex-1 px-5 pt-4 max-w-[480px] w-full mx-auto">
          <p className="text-text-2 text-sm">Couldn't find that week's phase.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar back={backHref} />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
        {week && (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold
                            uppercase tracking-wide text-accent bg-accent-dim px-2.5 py-1 rounded-full mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            Week {week}
          </span>
        )}

        <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none">
          Choose Your Session
        </h1>
        {phase.label && (
          <p className="text-text-2 text-sm mt-2 mb-7">
            {phase.label} {phase.weekStart != null && `· Weeks ${phase.weekStart}–${phase.weekEnd}`}
          </p>
        )}
        {!phase.label && <div className="mb-7" />}

        <div className="flex flex-col gap-2.5">
          {phase.sessions.map((s, i) => {
            const totalSets = s.exercises.reduce((sum, e) => sum + (e.sets || 0), 0);
            return (
              <button
                key={i}
                onClick={() => navigate(`/program/session/${phaseIndex}/${i}${week ? `?week=${week}` : ''}`)}
                className="text-left bg-surface border-[1.5px] border-border rounded-card p-4
                           active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-display text-lg font-extrabold uppercase">{s.name}</span>
                  {s.sessionType && (
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wide
                                      text-accent bg-accent-dim px-1.5 py-0.5 rounded">
                      {s.sessionType}
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-text-3">
                  {s.exercises.length} exercises &middot; {totalSets} sets
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

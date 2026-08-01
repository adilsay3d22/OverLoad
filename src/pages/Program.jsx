import { useEffect, useState } from 'react';
import TopBar from '../components/TopBar';

// Where "View Program" leads for now. The week-by-week / choose-your-session
// / session-detail screens are the next build — this confirms what's saved
// and shows its shape (phases, sessions, exercise counts) in the meantime.
export default function Program() {
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

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar back="/" />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
        {!program ? (
          <>
            <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
              No active program
            </p>
            <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mt-1">
              Nothing to view
            </h1>
            <p className="text-text-2 text-sm mt-2">
              Create a program from the home screen first.
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
              {program.type === 'template' ? 'Template' : 'Custom program'}
            </p>
            <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mt-1">
              {program.name}
            </h1>
            <p className="text-text-2 text-sm mt-2 mb-7">
              {program.totalWeeks
                ? `${program.totalWeeks}-week program`
                : program.durationWeeks
                  ? `${program.durationWeeks}-week program`
                  : 'Ongoing, no fixed end date'}
            </p>

            {program.phases && (
              <div className="flex flex-col gap-5 mb-7">
                {program.phases.map((p, i) => (
                  <div key={i}>
                    {p.label && (
                      <p className="font-mono text-[10px] font-semibold uppercase tracking-wide text-text-3 mb-1.5">
                        {p.label} · {p.weekStart ? `Weeks ${p.weekStart}–${p.weekEnd}` : 'Ongoing'}
                      </p>
                    )}
                    <div className="flex flex-col gap-2">
                      {p.sessions.map((s, j) => (
                        <div
                          key={j}
                          className="flex items-center justify-between bg-surface border border-border rounded-card px-4 py-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-display text-base font-bold uppercase">{s.name}</span>
                            {s.sessionType && (
                              <span className="font-mono text-[10px] font-semibold uppercase tracking-wide
                                                text-accent bg-accent-dim px-1.5 py-0.5 rounded">
                                {s.sessionType}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[11px] text-text-3">
                            {s.exercises.length} exercises
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={() => navigate(program.totalWeeks ? '/program/weeks' : '/program/sessions')}
            >
              {program.totalWeeks ? 'View All Weeks' : 'View Sessions'}
            </button>

            <p className="text-[12px] text-text-3 mt-5">
              Day-by-day logging — sets, reps, rest timers, ghost data — is coming up next.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

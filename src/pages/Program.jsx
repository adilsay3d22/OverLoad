import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';

// Where "View Program" leads. Confirms what's saved and gives a way into
// the weeks grid (or straight into the single week, for ongoing programs).
export default function Program() {
  const navigate = useNavigate();
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

  if (!program) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar back="/" />
        <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
          <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
            No active program
          </p>
          <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mt-1">
            Nothing to view
          </h1>
          <p className="text-text-2 text-sm mt-2">
            Create a program from the home screen first.
          </p>
        </div>
      </div>
    );
  }

  const weeksBuilt = program.weeks
    ? program.weeks.filter((w) => w.sessions.some((s) => s.exercises.length > 0)).length
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar back="/" />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
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
          {program.totalWeeks && weeksBuilt !== null && ` · ${weeksBuilt} of ${program.totalWeeks} weeks built`}
        </p>

        {program.weeks ? (
          <button
            className="btn btn-primary"
            onClick={() => navigate(program.totalWeeks ? '/program/weeks' : '/program/week/1')}
          >
            {program.totalWeeks ? 'View All Weeks' : 'View Sessions'}
          </button>
        ) : (
          <p className="text-[12px] text-text-3">
            This program doesn't have session data yet.
          </p>
        )}

        <p className="text-[12px] text-text-3 mt-5">
          Day-by-day logging — sets, reps, rest timers, ghost data — is coming up next.
        </p>
      </div>
    </div>
  );
}

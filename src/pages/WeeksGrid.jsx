import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import RingProgress from '../components/RingProgress';

function weekHasContent(week) {
  return week.sessions.some((s) => s.exercises.length > 0);
}

// The weeks grid — every week is independently editable. Empty weeks get an
// obvious "add workouts" prompt instead of blending in as a normal card;
// weeks with content show a completion ring (0% until logging exists, but
// wired to real percent whenever it does).
export default function WeeksGrid() {
  const navigate = useNavigate();
  const [program, setProgram] = useState(undefined);
  const [currentWeek, setCurrentWeek] = useState(1);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('overload.activeProgram');
      setProgram(raw ? JSON.parse(raw) : null);
    } catch {
      setProgram(null);
    }
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
          {program.weeks.map((week, i) => {
            const weekNum = i + 1;
            const isCurrent = weekNum === currentWeek;
            const hasContent = weekHasContent(week);

            if (!hasContent) {
              return (
                <button
                  key={weekNum}
                  onClick={() => navigate(`/program/week/${weekNum}`)}
                  className="text-left rounded-card p-4 border-[1.5px] border-dashed border-accent-bd
                             bg-accent-dim active:scale-[0.98] transition-transform"
                >
                  <div className="font-display text-xl font-extrabold uppercase text-text">
                    Week {weekNum}
                  </div>
                  {isCurrent && (
                    <div className="font-mono text-[10px] uppercase tracking-wide text-accent mt-0.5">
                      Current
                    </div>
                  )}
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-wide text-accent mt-2.5">
                    + Add workouts
                  </div>
                </button>
              );
            }

            return (
              <button
                key={weekNum}
                onClick={() => navigate(`/program/week/${weekNum}`)}
                className={`text-left rounded-card p-4 border-[1.5px] transition-colors active:scale-[0.98]
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
          })}
        </div>
      </div>
    </div>
  );
}

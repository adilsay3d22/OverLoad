import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';

function phaseForWeek(program, week) {
  return program.phases.find((p) => p.weekStart != null && week >= p.weekStart && week <= p.weekEnd);
}

// The weeks grid — only reachable for programs with a fixed length.
// "Current" is tracked separately from "last viewed"; since there's no
// logging yet, every week honestly shows 0% / Not Started except whichever
// week is marked current.
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

  if (!program || !program.totalWeeks) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar back="/program" />
        <div className="flex-1 px-5 pt-4 max-w-[480px] w-full mx-auto">
          <p className="text-text-2 text-sm">This program doesn't have a week-by-week structure.</p>
        </div>
      </div>
    );
  }

  const weeks = Array.from({ length: program.totalWeeks }, (_, i) => i + 1);

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
          {weeks.map((w) => {
            const phase = phaseForWeek(program, w);
            const isCurrent = w === currentWeek;
            return (
              <button
                key={w}
                onClick={() => navigate(`/program/week/${w}`)}
                className={`text-left rounded-card p-4 border-[1.5px] transition-colors active:scale-[0.98]
                            ${isCurrent ? 'bg-accent border-accent' : 'bg-surface border-border'}`}
              >
                <div className={`font-display text-xl font-extrabold uppercase ${isCurrent ? 'text-white' : 'text-text'}`}>
                  Week {w}
                </div>
                {phase?.label && (
                  <div className={`font-mono text-[10px] uppercase tracking-wide mt-0.5 ${isCurrent ? 'text-white/70' : 'text-text-3'}`}>
                    {phase.label}
                  </div>
                )}
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

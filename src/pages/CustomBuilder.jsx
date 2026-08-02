import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';

// Creating a program is now just: name it, say how many weeks (or leave
// blank for ongoing), and save immediately. Every week starts empty —
// exercises get added per-week, live, from the weeks grid. No upfront
// "does the routine change" planning step; if weeks repeat, that's what
// Clone Week (coming soon) is for.
export default function CustomBuilder() {
  const navigate = useNavigate();
  const [programName, setProgramName] = useState('');
  const [totalWeeks, setTotalWeeks] = useState('');

  function create() {
    const weeks = Number(totalWeeks) > 0
      ? Array.from({ length: Number(totalWeeks) }, () => ({ sessions: [] }))
      : [{ sessions: [] }]; // ongoing programs still get one editable week, just unnumbered

    const program = {
      type: 'custom',
      name: programName.trim() || 'Custom Program',
      totalWeeks: Number(totalWeeks) > 0 ? Number(totalWeeks) : null,
      weeks,
    };

    localStorage.setItem('overload.activeProgram', JSON.stringify(program));
    localStorage.setItem('overload.currentWeek', '1');
    navigate(program.totalWeeks ? '/program/weeks' : '/program/week/1');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar back="/create-program" />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
        <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
          New program
        </p>
        <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mt-1">
          Set it up
        </h1>
        <p className="text-text-2 text-sm mt-2 mb-7">
          Name it and say how long it runs. You'll add exercises to each week next — and
          you can keep editing anytime after.
        </p>

        <label className="block mb-4">
          <span className="block font-mono text-[10px] font-semibold uppercase tracking-wide text-text-3 mb-1.5">
            Program name
          </span>
          <input
            className="w-full h-[54px] rounded-field border-[1.5px] border-border-2 bg-bg-2
                       px-4 text-base text-text focus:border-accent focus:outline-none"
            placeholder="e.g. My Push Pull Split"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            autoFocus
          />
        </label>

        <label className="block mb-8">
          <span className="block font-mono text-[10px] font-semibold uppercase tracking-wide text-text-3 mb-1.5">
            Weeks — optional
          </span>
          <input
            type="number"
            min="1"
            className="w-full h-[54px] rounded-field border-[1.5px] border-border-2 bg-bg-2
                       px-4 text-base text-text focus:border-accent focus:outline-none"
            placeholder="e.g. 8 — leave blank if it's ongoing"
            value={totalWeeks}
            onChange={(e) => setTotalWeeks(e.target.value)}
          />
        </label>

        <button className="btn btn-primary" onClick={create}>
          Create Program
        </button>
      </div>
    </div>
  );
}

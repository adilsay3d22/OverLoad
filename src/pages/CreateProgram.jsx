import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';

const TEMPLATES = [
  {
    id: 'upper-lower',
    name: 'Upper / Lower Split',
    meta: '4 days / week · 8 weeks',
    blurb: 'Alternating upper and lower body days, twice through each per week. A solid default if you\'re not sure where to start.',
  },
];

export default function CreateProgram() {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(null);

  function selectTemplate(t) {
    localStorage.setItem(
      'overload.activeProgram',
      JSON.stringify({ type: 'template', id: t.id, name: t.name })
    );
    setConfirmed(t.name);
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex flex-col">
        <TopBar back="/" />
        <div className="flex-1 flex flex-col justify-center px-5 pb-8 max-w-[480px] w-full mx-auto">
          <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
            Program set
          </p>
          <h1 className="font-display text-[34px] font-black uppercase tracking-[-0.5px] leading-[1.05] mt-1 mb-3.5">
            {confirmed}
          </h1>
          <p className="text-sm text-text-2 leading-relaxed mb-7">
            This is set as your active program. Day-by-day logging, the exercise library,
            and full week/day editing are next — this screen is just the starting point.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar back="/" />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
        <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
          Step 1
        </p>
        <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mt-1">
          Create a program
        </h1>
        <p className="text-text-2 text-sm mt-2 mb-7">
          Start from a template, or build your own from scratch.
        </p>

        <div className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-text-3 mb-2.5 mt-[22px]">
          Templates
        </div>
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            className="block w-full text-left bg-surface border-[1.5px] border-border rounded-card p-[18px]
                       transition-colors active:scale-[0.98] hover:border-accent-bd"
            onClick={() => selectTemplate(t)}
          >
            <div className="font-display text-xl font-extrabold uppercase tracking-[-0.2px]">
              {t.name}
            </div>
            <div className="font-mono text-[11px] text-text-3 mt-1 tracking-[0.3px]">
              {t.meta}
            </div>
            <p className="text-[13px] text-text-2 mt-2.5 leading-relaxed">
              {t.blurb}
            </p>
          </button>
        ))}

        <div className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-text-3 mb-2.5 mt-[22px]">
          Or
        </div>
        <button
          className="block w-full text-left bg-surface border-[1.5px] border-border rounded-card p-[18px]
                     transition-colors active:scale-[0.98] hover:border-accent-bd"
          onClick={() => navigate('/create-program/custom')}
        >
          <div className="font-display text-xl font-extrabold uppercase tracking-[-0.2px]">
            Build a custom program
          </div>
          <p className="text-[13px] text-text-2 mt-2.5 leading-relaxed">
            Pick your training days and add your own exercises, sets, and rep ranges.
          </p>
        </button>
      </div>
    </div>
  );
}

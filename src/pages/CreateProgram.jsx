import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import TemplatesIcon from '../components/TemplatesIcon';

export default function CreateProgram() {
  const navigate = useNavigate();

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

        <button
          onClick={() => navigate('/create-program/templates')}
          className="w-full text-left bg-surface border-[1.5px] border-border rounded-card p-6
                     transition-colors active:scale-[0.98] hover:border-accent-bd flex items-center gap-4"
        >
          <TemplatesIcon />
          <div>
            <div className="font-display text-2xl font-extrabold uppercase tracking-[-0.2px]">
              Templates
            </div>
            <p className="text-[13px] text-text-2 mt-1 leading-relaxed">
              Browse pre-built splits — Jeff Nippard's Fundamentals programs, ready to go.
            </p>
          </div>
        </button>

        <div className="font-mono text-[10px] font-bold tracking-[2px] uppercase text-text-3 mb-2.5 mt-6">
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

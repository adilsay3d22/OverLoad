import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import { cloneWeekSessions } from '../lib/cloneUtils';

// Selecting a template deep-clones its data into activeProgram — same
// weeks/sessions/exercises shape as a custom program, so it's immediately
// editable, clonable, and deletable exactly like anything built by hand.
// Cloning here (not just copying the reference) matters for the same
// reason it matters between weeks: picking the same template twice must
// never let edits to one bleed into the other.
//
// templates.json is fetched from /public rather than bundled — it's large
// enough (a few hundred KB, several full 8-week programs) that inlining it
// into the JS chunk was bloating the app's load size for a screen most
// people only visit once.
export default function TemplateLibrary() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState(undefined);

  useEffect(() => {
    fetch('/data/templates.json')
      .then((r) => r.json())
      .then(setTemplates)
      .catch(() => setTemplates(null));
  }, []);

  function selectTemplate(t) {
    const program = {
      type: 'template',
      id: t.id,
      name: t.name,
      totalWeeks: t.totalWeeks,
      weeks: t.weeks.map((w) => ({ sessions: cloneWeekSessions(w) })),
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
          Templates
        </p>
        <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mt-1 mb-2">
          Choose a Split
        </h1>
        <p className="text-text-2 text-sm mb-7">
          Pick one to start from — you can rename, edit, add, or remove anything afterward.
        </p>

        {templates === undefined && (
          <p className="text-text-3 text-sm">Loading templates…</p>
        )}
        {templates === null && (
          <p className="text-text-3 text-sm">Couldn't load templates right now.</p>
        )}

        {templates && (
          <div className="flex flex-col gap-3">
            {templates.map((t) => {
              const sessionCount = t.weeks[0].sessions.length;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className="text-left bg-surface border-[1.5px] border-border rounded-card p-4
                             active:scale-[0.98] transition-transform hover:border-accent-bd"
                >
                  <div className="font-display text-xl font-extrabold uppercase tracking-[-0.2px]">
                    {t.name}
                  </div>
                  <div className="font-mono text-[11px] text-text-3 mt-1">
                    {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}/week
                    {t.totalWeeks ? ` · ${t.totalWeeks} weeks` : ' · Ongoing'}
                  </div>
                  <p className="text-[13px] text-text-2 mt-2.5 leading-relaxed">
                    {t.tagline}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

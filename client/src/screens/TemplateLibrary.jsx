import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CaretRight, Trash } from '@phosphor-icons/react';

import { Screen } from '../components/Screen.jsx';
import { BackButton, ErrorNote, PillButton, SessionTag, Skeleton } from '../components/ui.jsx';
import { Sheet, SheetAction } from '../components/Sheet.jsx';
import { Label, Rule, SectionRule, ShapeStrip } from '../components/programs.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { useProgram } from '../state/ProgramContext.jsx';
import { pluralize, relativeDay } from '../lib/format.js';

/**
 * The template library.
 *
 * Three templates do not need three shadowed cards each carrying its own lime
 * CTA — that was the category's default page scaffold and it made the one
 * genuine difference between the blocks, their weekly rhythm, the thing you
 * could not see. Each template is now a row that draws its own shape: which
 * weekdays it trains, straight from the block's real first week.
 *
 * Plans the user saved themselves sit above the bundled ones. They are the
 * reason deleting a duplicate program is safe: the structure survives the
 * program it came from, and starting from it again is one tap.
 */
export default function TemplateLibrary() {
  const navigate = useNavigate();
  const { refresh: refreshActive } = useProgram();
  const { data, loading, error, refresh: retry } = useApi('/catalog/templates');
  const { data: saved, refresh: refreshSaved } = useApi('/programs/saved-templates');
  const mine = saved?.templates || [];
  const [menu, setMenu] = useState(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);

  async function run(action) {
    setBusy(true);
    setFailure(null);
    try {
      await action();
    } catch (err) {
      setFailure(err.message);
    } finally {
      setBusy(false);
      setMenu(null);
      await Promise.all([refreshSaved(), refreshActive()]);
    }
  }

  return (
    <Screen>
      <BackButton to="/programs" />

      <h1 className="mt-7 text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
        Proven blocks
      </h1>
      <p className="mt-2.5 text-[15px] leading-[1.5] font-medium text-ink-muted">
        {mine.length
          ? 'Your own saved plans first, then three blocks that arrive fully built — every week, session, rep target, RPE and coaching cue.'
          : 'Each one arrives fully built — every week, session, rep target, RPE and coaching cue.'}
      </p>

      {failure ? (
        <div className="mt-7">
          <ErrorNote>{failure}</ErrorNote>
        </div>
      ) : null}

      {mine.length ? (
        <div className="mt-9">
          <SectionRule className="mb-0">Saved by you</SectionRule>
          {mine.map((template, index) => (
            <div key={template.id}>
              <button
                type="button"
                onClick={() => setMenu(template)}
                className="press flex w-full items-center gap-4 py-5 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] leading-[1.25] font-semibold tracking-[-0.01em]">
                    {template.name}
                  </span>
                  <Label className="mt-2">
                    {pluralize(template.totalWeeks, 'week')} · {template.sessionCount} sessions ·
                    saved {relativeDay(template.createdAt)}
                  </Label>
                </span>
                <CaretRight size={16} weight="bold" className="shrink-0 text-ink-muted" />
              </button>
              {index === mine.length - 1 ? null : <Rule />}
            </div>
          ))}
          <Rule strong />
        </div>
      ) : null}

      {loading ? (
        <div className="mt-9 flex flex-col gap-6">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[96px] w-full" radius={12} />
          ))}
        </div>
      ) : error ? (
        <div className="mt-8">
          <ErrorNote onRetry={retry}>{error.message}</ErrorNote>
        </div>
      ) : (
        <>
          <div className="mt-9">
            {mine.length ? <SectionRule className="mb-0">Proven blocks</SectionRule> : <Rule strong />}
            {data.templates.map((template, index) => (
              <div key={template.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/programs/templates/${template.id}`)}
                  className="press flex w-full items-start gap-4 py-5 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] leading-[1.25] font-semibold tracking-[-0.01em] text-balance">
                      {template.name}
                    </span>
                    <Label className="mt-2">
                      {pluralize(template.totalWeeks, 'week')} · {template.daysPerWeek} days ·{' '}
                      {template.exerciseCount} exercises a week
                    </Label>
                    <span className="mt-3 flex flex-wrap gap-1.5">
                      {template.sessionTypes.map((type) => (
                        <SessionTag key={type} type={type} />
                      ))}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-2 pt-0.5">
                    <ShapeStrip days={template.days || []} size={13} showLetters />
                    <CaretRight size={16} weight="bold" className="mt-1 text-ink-muted" />
                  </span>
                </button>
                {index === data.templates.length - 1 ? null : <Rule />}
              </div>
            ))}
            <Rule strong />
          </div>

          <PillButton
            variant="surface"
            className="mt-8"
            onClick={() => navigate('/programs/new')}
          >
            Build a custom program instead
          </PillButton>
        </>
      )}

      <Sheet
        open={Boolean(menu)}
        onClose={() => {
          if (!busy) setMenu(null);
        }}
        title={menu?.name}
        subtitle={
          menu ? `${pluralize(menu.totalWeeks, 'week')} · ${menu.exerciseCount} exercises` : ''
        }
      >
        <div className="flex flex-col gap-2.5 pb-4">
          <SheetAction
            icon={<ArrowRight size={20} />}
            label={busy ? 'Starting…' : 'Start this program'}
            description="Copies the plan into a new program and makes it active."
            disabled={busy}
            onClick={() =>
              run(async () => {
                const { program } = await api.post(`/programs/saved-templates/${menu.id}/start`);
                navigate(`/programs/${program.id}/weeks`);
              })
            }
          />
          <SheetAction
            icon={<Trash size={20} />}
            label="Delete template"
            description="Only the saved plan goes. Programs already started from it are untouched."
            tone="danger"
            disabled={busy}
            onClick={() => run(() => api.del(`/programs/saved-templates/${menu.id}`))}
          />
        </div>
      </Sheet>
    </Screen>
  );
}

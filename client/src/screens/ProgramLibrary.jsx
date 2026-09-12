import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BookmarkSimple, Copy, DotsThree, PencilSimple, Stack, Trash,
} from '@phosphor-icons/react';

import { Screen } from '../components/Screen.jsx';
import {
  BackButton, EmptyState, ErrorNote, Field, PillButton, Skeleton,
} from '../components/ui.jsx';
import { Sheet, SheetAction } from '../components/Sheet.jsx';
import { Label, Rule, SectionRule } from '../components/programs.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { useProgram } from '../state/ProgramContext.jsx';
import { useActiveSession } from '../state/ActiveSessionContext.jsx';
import { pluralize, relativeDay } from '../lib/format.js';

/**
 * Every saved program.
 *
 * Each program used to carry four controls inline — open or activate, rename,
 * duplicate, delete — so a list of three programs presented twelve buttons and
 * no hierarchy. A program is now a row you tap to open, with the management
 * actions behind one overflow control and a sheet, matching how weeks already
 * work one screen over.
 *
 * "Active" is marked in ink, not lime: it is a fact about the data, and
 * DESIGN.md reserves lime for the thing you are meant to tap.
 */

function ProgramRow({ program, onOpen, onMenu, last }) {
  const stats = program.stats;
  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="press flex min-w-0 flex-1 items-center gap-3 py-4 text-left"
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="truncate text-[15px] leading-none font-semibold">
                {program.name}
              </span>
              {program.isActive ? (
                <span
                  className="rounded-pill bg-ink px-2 py-1 text-[9px] font-bold text-white uppercase"
                  style={{ letterSpacing: '0.08em' }}
                >
                  Active
                </span>
              ) : null}
            </span>
            <Label className="mt-2">
              {program.source === 'template' ? 'Template' : 'Custom'} ·{' '}
              {pluralize(program.totalWeeks, 'week')} · started {relativeDay(program.createdAt)}
            </Label>
            <Label className="mt-1.5 tabular">
              {stats.totalSessions
                ? `${stats.sessionsCompleted}/${stats.totalSessions} sessions · ${stats.setsLogged} sets logged`
                : 'Nothing built yet'}
            </Label>
          </span>
        </button>
        <button
          type="button"
          onClick={onMenu}
          aria-label={`Actions for ${program.name}`}
          className="press flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-accent-wash hover:text-ink"
        >
          <DotsThree size={22} weight="bold" />
        </button>
      </div>
      {last ? null : <Rule />}
    </>
  );
}

export default function ProgramLibrary() {
  const navigate = useNavigate();
  const { refresh: refreshActive } = useProgram();
  const training = useActiveSession();
  const { data, loading, error, refresh } = useApi('/programs');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [failure, setFailure] = useState(null);
  const [menu, setMenu] = useState(null);
  const [renaming, setRenaming] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [name, setName] = useState('');

  const programs = [...(data?.programs || [])].sort(
    (a, b) =>
      Number(b.isActive) - Number(a.isActive) || new Date(b.createdAt) - new Date(a.createdAt),
  );

  async function run(action) {
    setBusy(true);
    setFailure(null);
    try {
      return await action();
    } catch (err) {
      setFailure(err.message);
      return undefined;
    } finally {
      setBusy(false);
      setMenu(null);
      setRenaming(null);
      setConfirmDelete(null);
      await Promise.all([refresh(), refreshActive()]);
    }
  }

  return (
    <Screen>
      <BackButton to="/programs" />

      <h1 className="mt-7 text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
        Your programs
      </h1>
      <p className="mt-2.5 text-[15px] leading-[1.5] font-medium text-ink-muted">
        Every program you have started stays here. Switch between them freely — logged sets belong
        to the program they were logged against, so nothing gets mixed up.
      </p>

      {loading ? (
        <div className="mt-8 flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-[86px] w-full" radius={12} />
          ))}
        </div>
      ) : error ? (
        <div className="mt-8">
          <ErrorNote onRetry={refresh}>{error.message}</ErrorNote>
        </div>
      ) : !programs.length ? (
        <EmptyState
          className="mt-6"
          icon={<Stack size={28} />}
          title="No programs yet"
          body="Pick a template or build your own, and it will be saved here."
          action={<PillButton onClick={() => navigate('/programs')}>Start a program</PillButton>}
        />
      ) : (
        <>
          {notice ? (
            <p
              role="status"
              aria-live="polite"
              className="mt-6 rounded-row border border-line bg-accent-wash px-4 py-3 text-[13px] leading-[1.45] font-medium text-accent-deep"
            >
              {notice}
            </p>
          ) : null}

          {failure ? (
            <div className="mt-6">
              <ErrorNote>{failure}</ErrorNote>
            </div>
          ) : null}

          <SectionRule className="mt-8">{pluralize(programs.length, 'program')}</SectionRule>
          <div>
            {programs.map((program, index) => (
              <ProgramRow
                key={program.id}
                program={program}
                onOpen={() => navigate(`/programs/${program.id}/weeks`)}
                onMenu={() => {
                  setMenu(program);
                  setName(program.name);
                }}
                last={index === programs.length - 1}
              />
            ))}
          </div>
          <Rule strong />

          <p className="mt-3.5 text-[12px] leading-[1.45] font-medium text-ink-muted">
            Duplicating copies the plan with a clean slate, and saving as a template keeps it to
            start again later. Deleting removes the plan, not your history — sets you logged
            against a program stay in Progress and PRs.
          </p>

          <PillButton
            variant="surface"
            className="mt-7"
            onClick={() => navigate('/programs/templates')}
          >
            Start another program
          </PillButton>
        </>
      )}

      <Sheet
        open={Boolean(menu) && !renaming && !confirmDelete}
        onClose={() => setMenu(null)}
        title={menu?.name}
        subtitle={menu?.isActive ? 'Your active program' : 'Saved'}
      >
        <div className="flex flex-col gap-2.5 pb-2">
          {menu && !menu.isActive ? (
            <SheetAction
              icon={<ArrowRight size={20} />}
              label="Make active"
              description="Home and the session button switch to this program."
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api.post(`/programs/${menu.id}/activate`);
                  setNotice(`${menu.name} is now your active program.`);
                })
              }
            />
          ) : null}
          <SheetAction
            icon={<PencilSimple size={20} />}
            label="Rename"
            description="Only the name changes; every logged set stays attached."
            disabled={busy}
            onClick={() => setRenaming(menu)}
          />
          <SheetAction
            icon={<Copy size={20} />}
            label="Duplicate"
            description="Copies the plan with a clean slate — none of the logged sets."
            disabled={busy}
            onClick={() =>
              run(async () => {
                const { program: copy } = await api.post(`/programs/${menu.id}/duplicate`);
                setNotice(
                  `Saved as ${copy.name} — the plan only, with none of the logged sets. ` +
                    'Make it active when you want to run it.',
                );
              })
            }
          />
          <SheetAction
            icon={<BookmarkSimple size={20} />}
            label="Save as template"
            description="Keeps the plan to start again later. None of the logged sets come with it."
            disabled={busy}
            onClick={() =>
              run(async () => {
                const { template } = await api.post(`/programs/${menu.id}/save-as-template`);
                setNotice(
                  `${template.name} saved as a template. You will find it under Start a program.`,
                );
              })
            }
          />
          <SheetAction
            icon={<Trash size={20} />}
            label="Delete"
            description="Removes the plan. Sets you logged against it stay in Progress and PRs."
            tone="danger"
            disabled={busy}
            onClick={() => setConfirmDelete(menu)}
          />
        </div>
      </Sheet>

      <Sheet
        open={Boolean(confirmDelete)}
        onClose={() => {
          if (busy) return;
          setConfirmDelete(null);
        }}
        title="Delete this program?"
        subtitle={confirmDelete ? `${confirmDelete.name} and all ${confirmDelete.totalWeeks} weeks of its plan.` : ''}
      >
        <div className="flex flex-col gap-2.5 pb-4">
          <SheetAction
            icon={<Trash size={20} />}
            label={busy ? 'Deleting…' : 'Delete program'}
            description="The plan goes. Every set you logged against it stays in Progress and PRs."
            tone="danger"
            disabled={busy}
            onClick={() =>
              run(async () => {
                // Stop the clock here as well as letting the background check
                // catch it: the button is on screen while this runs, and a
                // countdown that keeps ticking for a second after you delete
                // the thing it is counting reads as a bug either way.
                if (training.active && training.programId === confirmDelete.id) training.end();
                const { activated } = await api.del(`/programs/${confirmDelete.id}`);
                setNotice(
                  activated
                    ? `${confirmDelete.name} deleted. ${activated.name} is now active.`
                    : `${confirmDelete.name} deleted. Your logged sets are still on the Progress tab.`,
                );
              })
            }
          />
          <PillButton variant="surface" disabled={busy} onClick={() => setConfirmDelete(null)}>
            Keep it
          </PillButton>
        </div>
      </Sheet>

      <Sheet
        open={Boolean(renaming)}
        onClose={() => setRenaming(null)}
        title="Rename program"
        subtitle={renaming?.name}
      >
        <div className="pb-2">
          <Field
            label="Program name"
            value={name}
            maxLength={48}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
          <div className="mt-4 flex gap-2.5">
            <PillButton
              className="h-12 flex-1 text-[14px]"
              disabled={busy || name.trim().length < 2}
              onClick={() =>
                run(async () => {
                  await api.patch(`/programs/${renaming.id}`, { name: name.trim() });
                  setNotice('Program renamed.');
                })
              }
            >
              Save name
            </PillButton>
            <PillButton
              variant="surface"
              className="h-12 flex-1 text-[14px]"
              onClick={() => setRenaming(null)}
            >
              Cancel
            </PillButton>
          </div>
        </div>
      </Sheet>
    </Screen>
  );
}

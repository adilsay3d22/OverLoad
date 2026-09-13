import { useNavigate } from 'react-router-dom';
import { Stack, PencilSimpleLine, CaretRight, User, Plus } from '@phosphor-icons/react';

import { Screen } from '../components/Screen.jsx';
import { Wordmark } from '../components/Brand.jsx';
import { BlockMatrix, BlockKey } from '../components/BlockMatrix.jsx';
import { Card, IconButton, PillButton, Skeleton, cx } from '../components/ui.jsx';
import { useProgram } from '../state/ProgramContext.jsx';
import { useApi } from '../hooks/useApi.js';
import { pluralize } from '../lib/format.js';

/**
 * The Programs tab.
 *
 * It used to show a name, two chips and an "Up next" card — which is Home's
 * job, done a second time — while the block itself, the thing this tab is
 * named after, was invisible. The whole 8-week grid now leads: you can see
 * which days you train, how far in you are and where the gaps are, in one look
 * and in the same place every visit.
 *
 * The current week expands beneath the grid, because a cell tells you a session
 * exists and its state but not what it is. Everything below that is management:
 * other saved programs as spines on a shelf, then the two ways to start a new
 * one.
 *
 * No "Up next" card here on purpose. Home owns the next action and the tab bar
 * carries a live session button on every route; repeating it a third time would
 * make two tabs compete for the same tap.
 */

/** 11px/0.12em caps — the shared label register, at a colour that clears AA. */
function Label({ children, className }) {
  return (
    <span
      className={cx(
        'block text-[11px] leading-none font-semibold text-ink-muted uppercase',
        className,
      )}
      style={{ letterSpacing: '0.12em' }}
    >
      {children}
    </span>
  );
}

/** A row in the expanded current week. */
function SessionRow({ session, weekIndex, programId, last }) {
  const navigate = useNavigate();
  const { progress } = session;
  const done = progress.complete;

  return (
    <>
      <button
        type="button"
        onClick={() => navigate(`/programs/${programId}/weeks/${weekIndex}/sessions/${session.id}`)}
        className="press flex w-full items-center gap-3 py-3.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] leading-none font-semibold">
            {session.name}
          </span>
          <Label className="mt-1.5">
            {session.type} · {pluralize(session.exercises.length, 'exercise')}
          </Label>
        </span>
        <span className="tabular shrink-0 text-[13px] font-bold">
          {done ? (
            <span className="text-accent-deep">Done</span>
          ) : (
            <span className={progress.started ? 'text-accent-deep' : 'text-ink-muted'}>
              {progress.loggedSets}/{progress.plannedSets}
            </span>
          )}
        </span>
        <CaretRight size={15} weight="bold" className="shrink-0 text-ink-muted" />
      </button>
      {last ? null : <div aria-hidden className="h-px bg-line" />}
    </>
  );
}

/**
 * Saved programs as spines on a shelf — pulled from the sneaker-box challenger
 * in this surface's round: an end label carrying name over a fixed grid of
 * facts, browsable along the stack without opening anything.
 */
function ProgramSpine({ program, active, onClick }) {
  const sessions = program.weeks.reduce((n, w) => n + w.sessions.length, 0);
  const done = program.weeks.reduce(
    (n, w) => n + w.sessions.filter((x) => x.progress?.complete).length,
    0,
  );
  const facts = [
    `${program.totalWeeks} weeks`,
    `${program.daysPerWeek || 0}/week`,
    `${done}/${sessions} done`,
  ];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        'press flex h-[118px] w-[148px] shrink-0 flex-col justify-between rounded-row border p-3.5 text-left',
        active
          ? 'border-dark-line bg-dark-bg grid-texture'
          : 'border-line bg-surface hover:border-line-strong',
      )}
    >
      <span
        className={cx(
          'line-clamp-2 text-[13px] leading-[1.25] font-semibold',
          active ? 'text-white' : 'text-ink',
        )}
      >
        {program.name}
      </span>
      {/* A fixed grid of facts, the way an end label carries its size run —
          the same three lines in the same order on every spine. */}
      <span className="flex flex-col gap-1">
        {active ? (
          <span
            className="text-[10px] leading-none font-bold text-white uppercase"
            style={{ letterSpacing: '0.14em' }}
          >
            Active
          </span>
        ) : null}
        {facts.map((fact) => (
          <span
            key={fact}
            className={cx(
              'tabular text-[10px] leading-none font-semibold',
              active ? 'text-dark-muted' : 'text-ink-muted',
            )}
          >
            {fact}
          </span>
        ))}
      </span>
    </button>
  );
}

function ChooseTile({ icon, title, body, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press flex w-full items-center gap-4 rounded-card border border-line bg-surface p-[22px] text-left hover:bg-accent-wash"
    >
      <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-accent text-ink">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[17px] font-semibold tracking-[-0.01em]">{title}</span>
        <span className="mt-1 block text-[13px] leading-[1.45] font-medium text-ink-muted">
          {body}
        </span>
      </span>
      <CaretRight size={17} weight="bold" className="shrink-0 text-ink-muted" />
    </button>
  );
}

function Header() {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-between">
      <Wordmark />
      <IconButton size={38} label="Profile" onClick={() => navigate('/profile')}>
        <User size={19} />
      </IconButton>
    </div>
  );
}

export default function Programs() {
  const navigate = useNavigate();
  const { program, loading } = useProgram();
  const { data: allPrograms } = useApi('/programs');
  const programs = allPrograms?.programs || [];

  if (loading) {
    return (
      <Screen tabBar>
        <Header />
        <div className="mt-8">
          <Skeleton className="h-8 w-52" radius={12} />
          <div className="mt-6 flex flex-col gap-1.5">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-[25px] w-full" radius={6} />
            ))}
          </div>
        </div>
      </Screen>
    );
  }

  if (!program) {
    return (
      <Screen tabBar>
        <Header />
        <h1 className="mt-8 text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
          Start a program
        </h1>
        <p className="mt-2.5 max-w-[300px] text-[15px] leading-[1.5] font-medium text-ink-muted">
          Follow a proven block, or lay out your own weeks and sessions from scratch.
        </p>
        <div className="mt-8 flex flex-col gap-3.5">
          <ChooseTile
            icon={<Stack size={24} weight="fill" />}
            title="Choose from template"
            body="Four programs, 8 weeks each, with RPE targets and coaching cues."
            onClick={() => navigate('/programs/templates')}
          />
          <ChooseTile
            icon={<PencilSimpleLine size={24} weight="fill" />}
            title="Build custom program"
            body="Set your own week count and training days, then fill each session yourself."
            onClick={() => navigate('/programs/new')}
          />
        </div>
        {programs.length ? (
          <PillButton
            variant="surface"
            className="mt-3.5"
            onClick={() => navigate(`/programs/${p.id}/weeks`)}
          >
            <Stack size={17} weight="bold" />
            Your saved programs ({programs.length})
          </PillButton>
        ) : null}
      </Screen>
    );
  }

  const currentWeek = program.next?.weekIndex ?? 0;
  const week = program.weeks.find((w) => w.index === currentWeek);
  const sessions = [...(week?.sessions || [])].sort((a, b) => a.day - b.day);
  const totalSessions = program.weeks.reduce((n, w) => n + w.sessions.length, 0);
  const doneSessions = program.weeks.reduce(
    (n, w) => n + w.sessions.filter((s) => s.progress?.complete).length,
    0,
  );

  return (
    <Screen tabBar>
      <Header />

      <h1 className="mt-7 text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
        {program.name}
      </h1>
      <Label className="mt-2.5">
        {program.source === 'template' ? 'Template' : 'Custom'} · {program.totalWeeks} weeks ·{' '}
        {pluralize(program.daysPerWeek || sessions.length, 'day')} a week
      </Label>

      {/* The block. Its rows resolve top to bottom on entry — the one authored
          moment on this route; the stagger itself lives in BlockMatrix. */}
      <section className="mt-8">
        <div className="mb-3.5 flex items-end justify-between">
          <Label className="text-ink">The block</Label>
          <span className="tabular text-[13px] font-bold">
            {doneSessions}
            <span className="font-semibold text-ink-muted">/{totalSessions} sessions</span>
          </span>
        </div>
        <div aria-hidden className="mb-4 h-px w-full bg-line-strong" />
        <BlockMatrix
          weeks={program.weeks}
          currentWeek={currentWeek}
          nextSessionId={program.next?.sessionId}
          onOpenSession={(weekIndex, sessionId) =>
            navigate(`/programs/${program.id}/weeks/${weekIndex}/sessions/${sessionId}`)
          }
        />
        <BlockKey className="mt-4" />
      </section>

      <section className="mt-9">
        <div className="mb-1 flex items-end justify-between">
          <Label className="text-ink">Week {currentWeek + 1}</Label>
          <button
            type="button"
            onClick={() => navigate(`/programs/${program.id}/weeks`)}
            className="press text-[12px] font-semibold text-ink-muted hover:text-ink"
          >
            All weeks
          </button>
        </div>
        <div aria-hidden className="h-px bg-line-strong" />
        {sessions.length ? (
          sessions.map((session, index) => (
            <SessionRow
              key={session.id}
              session={session}
              weekIndex={currentWeek}
              programId={program.id}
              last={index === sessions.length - 1}
            />
          ))
        ) : (
          <Card className="mt-3.5 p-[18px]">
            <p className="text-[14px] font-medium text-ink-muted">
              Week {currentWeek + 1} has no sessions yet.
            </p>
          </Card>
        )}
      </section>

      <section className="mt-9">
        {/* Renaming, duplicating, saving as a template and deleting all live on
            the library screen and always have; nothing on this tab said so, so
            a shelf of near-identical programs had no visible way out. */}
        <div className="mb-3.5 flex items-end justify-between gap-3">
          <Label className="text-ink">Your programs</Label>
          <button
            type="button"
            onClick={() => navigate('/programs/library')}
            className="press -my-1 rounded-pill px-2 py-1 text-[12px] font-semibold text-ink-muted hover:bg-accent-wash hover:text-ink"
          >
            Manage
          </button>
        </div>
        <div className="no-scrollbar -mx-[22px] flex gap-2.5 overflow-x-auto px-[22px] pb-1">
          {programs.map((p) => (
            <ProgramSpine
              key={p.id}
              program={p}
              active={p.id === program.id}
              onClick={() => navigate(`/programs/${p.id}/weeks`)}
            />
          ))}
          <button
            type="button"
            onClick={() => navigate('/programs/templates')}
            className="press flex h-[104px] w-[132px] shrink-0 flex-col justify-between rounded-row border border-dashed border-line-strong p-3.5 text-left hover:border-ink"
          >
            <Plus size={20} weight="bold" className="text-ink-muted" />
            <span className="text-[13px] leading-[1.25] font-semibold text-ink">New program</span>
          </button>
        </div>
      </section>
    </Screen>
  );
}

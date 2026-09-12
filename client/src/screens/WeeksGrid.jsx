import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CaretRight, Copy, Eraser, Plus, Trash } from '@phosphor-icons/react';

import { Screen } from '../components/Screen.jsx';
import { BackButton, ErrorNote, Skeleton } from '../components/ui.jsx';
import { Sheet, SheetAction } from '../components/Sheet.jsx';
import { Label, Rule, SectionRule, ShapeStrip } from '../components/programs.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { useProgram } from '../state/ProgramContext.jsx';
import { pluralize } from '../lib/format.js';

/**
 * Every week in a program.
 *
 * This was a two-column grid of eight near-identical cards, each carrying a
 * progress ring — the category's default page scaffold, and a ring standing in
 * for content. Weeks are now rows, and each row draws its own week the way the
 * block matrix draws the whole program: solid for logged, hollow for planned,
 * a dot for rest. A week you have never built reads as seven dots, which is
 * the honest picture of it.
 *
 * Press and hold is unchanged — it is the only route to clone, clear and
 * remove, and moving it would strand those actions.
 */

const stateOf = (week, currentWeekIndex) => {
  if (!week.sessions.length) return 'empty';
  if (week.sessions.every((s) => s.progress.complete)) return 'done';
  if (week.index === currentWeekIndex) return 'current';
  return 'built';
};

function WeekRow({ week, state, onOpen, onLongPress, last }) {
  const timer = useRef(null);
  const held = useRef(false);

  const start = () => {
    held.current = false;
    timer.current = setTimeout(() => {
      held.current = true;
      navigator.vibrate?.(12);
      onLongPress();
    }, 480);
  };
  const end = () => clearTimeout(timer.current);

  const days = week.sessions.map((s) => s.day % 7);
  const done = week.sessions.filter((s) => s.progress.complete).map((s) => s.day % 7);

  const trailing =
    state === 'empty' ? (
      <Label tone="accent">Build</Label>
    ) : state === 'done' ? (
      <Label tone="accent">Done</Label>
    ) : (
      <span className="tabular text-[13px] font-bold text-ink-muted">
        {done.length}/{week.sessions.length}
      </span>
    );

  return (
    <>
      <button
        type="button"
        onPointerDown={start}
        onPointerUp={end}
        onPointerLeave={end}
        onContextMenu={(e) => {
          e.preventDefault();
          onLongPress();
        }}
        onClick={() => (held.current ? null : onOpen())}
        className="press flex w-full items-center gap-4 py-3.5 text-left"
      >
        <span className="w-[54px] shrink-0">
          <span
            className={`block text-[15px] leading-none font-semibold ${
              state === 'current' ? 'text-ink' : 'text-ink-muted'
            }`}
          >
            Week {week.index + 1}
          </span>
        </span>
        <ShapeStrip days={days} done={done} size={15} gap={3} className="shrink-0" />
        <span className="flex flex-1 items-center justify-end gap-3">
          {trailing}
          <CaretRight size={15} weight="bold" className="shrink-0 text-ink-muted" />
        </span>
      </button>
      {last ? null : <Rule />}
    </>
  );
}

export default function WeeksGrid() {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { refresh: refreshActive } = useProgram();
  const { data, loading, error, refresh, setData } = useApi(`/programs/${programId}`);
  const [menuWeek, setMenuWeek] = useState(null);
  const [cloneFrom, setCloneFrom] = useState(null);
  const [busy, setBusy] = useState(false);

  const program = data?.program;
  const currentWeekIndex = program?.next?.weekIndex ?? 0;

  const [actionError, setActionError] = useState(null);
  const inFlight = useRef(false);

  async function run(action) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setActionError(null);
    try {
      const result = await action();
      setData(result);
      refreshActive();
      setMenuWeek(null);
      setCloneFrom(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  const builtWeeks = program?.weeks.filter((w) => w.sessions.length) || [];
  // Only the last week can go, so the weeks after it keep their numbers.
  const isLastWeek = menuWeek != null && menuWeek.index === (program?.weeks.length ?? 0) - 1;

  return (
    <Screen>
      <BackButton to="/programs" />

      {loading ? (
        <div className="mt-7">
          <Skeleton className="h-9 w-52" radius={12} />
          <div className="mt-8 flex flex-col gap-2">
            {Array.from({ length: 8 }, (_, i) => (
              <Skeleton key={i} className="h-[46px] w-full" radius={12} />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="mt-7">
          {/* A 404 here means the program is gone, so retrying is a dead end
              and the only offer worth making is a way out. */}
          <ErrorNote
            onRetry={error.status === 404 ? undefined : refresh}
            action={() => navigate('/programs')}
            actionLabel="Back to programs"
          >
            {error.status === 404 ? 'This program no longer exists. It may have been deleted from another device.' : error.message}
          </ErrorNote>
        </div>
      ) : (
        <>
          <h1 className="mt-7 text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
            {program.name}
          </h1>
          <Label className="mt-2.5">
            {program.source === 'template' ? 'Template' : 'Custom'} · {program.weeksBuilt} of{' '}
            {program.totalWeeks} weeks built
          </Label>

          <SectionRule className="mt-8">Weeks</SectionRule>
          <div>
            {program.weeks.map((week, index) => (
              <WeekRow
                key={week.index}
                week={week}
                state={stateOf(week, currentWeekIndex)}
                onOpen={() => navigate(`/programs/${programId}/weeks/${week.index}`)}
                onLongPress={() => setMenuWeek(week)}
                last={index === program.weeks.length - 1}
              />
            ))}
          </div>
          <Rule strong />

          <p className="mt-3.5 text-[12px] leading-[1.45] font-medium text-ink-muted">
            Press and hold a week to clone, clear or remove it.
          </p>

          {program.weeks.length < 16 ? (
            <button
              type="button"
              onClick={() => run(() => api.post(`/programs/${programId}/weeks`))}
              disabled={busy}
              className="press mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-pill border border-line-strong bg-surface text-[15px] font-bold hover:border-ink disabled:opacity-50"
            >
              <Plus size={17} weight="bold" />
              Add week {program.weeks.length + 1}
            </button>
          ) : (
            <p className="mt-6 text-center text-[12px] font-medium text-ink-muted">
              Sixteen weeks is the maximum for one program.
            </p>
          )}
        </>
      )}

      <Sheet
        open={Boolean(menuWeek) && !cloneFrom}
        onClose={() => setMenuWeek(null)}
        title={menuWeek ? `Week ${menuWeek.index + 1}` : ''}
        subtitle={
          menuWeek?.sessions.length
            ? pluralize(menuWeek.sessions.length, 'session')
            : 'Nothing built yet'
        }
      >
        <div className="flex flex-col gap-2.5 pb-2">
          {actionError ? <ErrorNote>{actionError}</ErrorNote> : null}
          <SheetAction
            icon={<Copy size={20} />}
            label="Clone another week into this one"
            description="Copies that week's sessions and exercises. Replaces what is here."
            disabled={!builtWeeks.length || busy}
            onClick={() => setCloneFrom(menuWeek)}
          />
          <SheetAction
            icon={<Eraser size={20} />}
            label="Clear this week"
            description="Removes every session from the week. Logged sets are kept."
            tone="danger"
            disabled={!menuWeek?.sessions.length || busy}
            onClick={() =>
              run(() => api.post(`/programs/${programId}/weeks/${menuWeek.index}/clear`))
            }
          />
          {isLastWeek && program.weeks.length > 1 ? (
            <SheetAction
              icon={<Trash size={20} />}
              label={`Remove week ${menuWeek.index + 1}`}
              description="Shortens the program by one week. Logged sets are kept."
              tone="danger"
              disabled={busy}
              onClick={() => run(() => api.del(`/programs/${programId}/weeks/${menuWeek.index}`))}
            />
          ) : null}
        </div>
      </Sheet>

      <Sheet
        open={Boolean(cloneFrom)}
        onClose={() => setCloneFrom(null)}
        title="Clone from"
        subtitle={cloneFrom ? `Into week ${cloneFrom.index + 1}` : ''}
      >
        <div className="flex flex-col gap-2 pb-2">
          {builtWeeks
            .filter((w) => w.index !== cloneFrom?.index)
            .map((week) => (
              <SheetAction
                key={week.index}
                label={`Week ${week.index + 1}`}
                description={pluralize(week.sessions.length, 'session')}
                disabled={busy}
                onClick={() =>
                  run(() =>
                    api.post(`/programs/${programId}/weeks/${cloneFrom.index}/clone`, {
                      from: week.index,
                    }),
                  )
                }
              />
            ))}
        </div>
      </Sheet>
    </Screen>
  );
}

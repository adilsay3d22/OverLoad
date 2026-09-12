import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Reorder, useDragControls } from 'motion/react';
import { DotsSixVertical, Plus, Trash, PencilSimple, Check } from '@phosphor-icons/react';

import { Screen } from '../components/Screen.jsx';
import {
  BackButton, Card, CategoryTag, ErrorNote, PillButton, SessionTag, Skeleton, cx,
} from '../components/ui.jsx';
import { AddExerciseFlow } from '../components/AddExerciseFlow.jsx';
import { Crumb, Label, Rule, SectionRule } from '../components/programs.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { useProgram } from '../state/ProgramContext.jsx';
import { categoryColor } from '../lib/tokens.js';
import { prescription, restLabel } from '../lib/format.js';

/**
 * One session's plan: the exercises, their prescriptions, and their order.
 *
 * Exercises were bordered cards with a 6px muscle-group bar down the left edge.
 * The craft floor refuses a coloured side border above 1px, and the group was
 * already named by the tag beside the exercise. They are now hairline rows with
 * a 3px tick, which also lets the drag handle sit inside the row instead of
 * splitting the card into three panels.
 *
 * Where the session sits — week and program — moved into the header row beside
 * Back, which is where wayfinding belongs; it was previously an eyebrow stacked
 * above the heading.
 */

function ExerciseRow({ entry, editing, onDelete, last }) {
  const controls = useDragControls();
  const { fg } = categoryColor(entry.category);

  const body = (
    <div className="flex items-center gap-3 py-3.5">
      {editing ? (
        <button
          type="button"
          onPointerDown={(e) => controls.start(e)}
          aria-label={`Reorder ${entry.name}`}
          className="-ml-1.5 flex shrink-0 cursor-grab touch-none items-center text-line-strong active:cursor-grabbing"
        >
          <DotsSixVertical size={20} weight="bold" />
        </button>
      ) : null}
      <span aria-hidden className="h-[26px] w-[3px] shrink-0 rounded-pill" style={{ background: fg }} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[15px] leading-none font-semibold">{entry.name}</span>
          <CategoryTag category={entry.category} />
        </div>
        <Label className="tabular mt-1.5">
          {prescription(entry)} · {restLabel(entry.restSeconds)} rest
        </Label>
      </div>
      {editing ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Remove ${entry.name}`}
          className="press shrink-0 px-2 text-ink-muted hover:text-danger"
        >
          <Trash size={17} />
        </button>
      ) : null}
    </div>
  );

  const withRule = (
    <>
      {body}
      {last ? null : <Rule />}
    </>
  );

  if (!editing) return withRule;

  return (
    <Reorder.Item value={entry} dragListener={false} dragControls={controls} className="list-none">
      {withRule}
    </Reorder.Item>
  );
}

export default function SessionEditor() {
  const { programId, week, sessionId } = useParams();
  const weekIndex = Number(week);
  const navigate = useNavigate();
  const { refresh: refreshActive } = useProgram();
  const { data, loading, error, refresh, setData } = useApi(`/programs/${programId}`);

  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [order, setOrder] = useState([]);

  const program = data?.program;
  const session = program?.weeks
    .find((w) => w.index === weekIndex)
    ?.sessions.find((s) => s.id === sessionId);

  useEffect(() => {
    if (session) {
      setName(session.name);
      setOrder(session.exercises);
    }
  }, [session]);

  const base = `/programs/${programId}/weeks/${weekIndex}/sessions/${sessionId}`;

  async function mutate(action) {
    const result = await action();
    setData(result);
    await refreshActive();
    return result;
  }

  async function commitEdits() {
    if (name.trim() && name.trim() !== session.name) {
      await mutate(() => api.patch(base, { name: name.trim() }));
    }
    const ids = order.map((e) => e.id);
    if (ids.join() !== session.exercises.map((e) => e.id).join()) {
      await mutate(() => api.put(`${base}/exercises`, { order: ids }));
    }
    setEditing(false);
  }

  if (loading) {
    return (
      <Screen>
        <BackButton />
        <div className="mt-7 flex flex-col gap-3.5">
          <Skeleton className="h-10 w-56" radius={12} />
          <Skeleton className="h-[64px] w-full" radius={12} />
          <Skeleton className="h-[64px] w-full" radius={12} />
          <Skeleton className="h-[64px] w-full" radius={12} />
        </div>
      </Screen>
    );
  }

  if (error || !session) {
    return (
      <Screen>
        <BackButton />
        <div className="mt-7">
          <ErrorNote onRetry={refresh}>
            {error?.message || 'That session no longer exists.'}
          </ErrorNote>
        </div>
      </Screen>
    );
  }

  const totalSets = session.exercises.reduce((n, e) => n + e.sets, 0);

  return (
    <Screen>
      <div className="flex items-center gap-3">
        <BackButton to={`/programs/${programId}/weeks/${weekIndex}`} />
        <Crumb className="min-w-0 flex-1">
          Week {weekIndex + 1} · {program.name}
        </Crumb>
        <button
          type="button"
          onClick={() => (editing ? commitEdits() : setEditing(true))}
          className={cx(
            'press flex h-9 shrink-0 items-center gap-1.5 rounded-pill px-4 text-[13px] font-bold',
            editing ? 'bg-accent text-ink shadow-lime' : 'border border-line bg-surface text-ink',
          )}
        >
          {editing ? <Check size={14} weight="bold" /> : <PencilSimple size={14} weight="bold" />}
          {editing ? 'Done' : 'Edit'}
        </button>
      </div>

      <div className="mt-7">
        {editing ? (
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            aria-label="Session name"
            className="w-full rounded-input border border-line bg-surface px-3.5 py-2 text-[26px] font-bold tracking-[-0.03em] focus:border-accent focus:outline-none focus-visible:ring-3 focus-visible:ring-accent/45"
          />
        ) : (
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.03em]">
              {session.name}
            </h1>
            <SessionTag type={session.type} />
          </div>
        )}
        <Label className="mt-2.5">
          {session.exercises.length} exercises · {totalSets} sets planned
        </Label>
      </div>

      <SectionRule className="mt-8">Plan</SectionRule>

      {session.exercises.length === 0 ? (
        <Card className="mt-4 p-5 text-center">
          <p className="text-[15px] font-semibold">No exercises yet</p>
          <p className="mt-1.5 text-[13px] font-medium text-ink-muted">
            Add your first movement and set its sets, reps and target RPE.
          </p>
        </Card>
      ) : editing ? (
        <Reorder.Group axis="y" values={order} onReorder={setOrder} className="m-0 list-none p-0">
          {order.map((entry, index) => (
            <ExerciseRow
              key={entry.id}
              entry={entry}
              editing
              last={index === order.length - 1}
              onDelete={() => mutate(() => api.del(`${base}/exercises/${entry.id}`))}
            />
          ))}
        </Reorder.Group>
      ) : (
        <div>
          {session.exercises.map((entry, index) => (
            <ExerciseRow
              key={entry.id}
              entry={entry}
              editing={false}
              last={index === session.exercises.length - 1}
            />
          ))}
        </div>
      )}
      {session.exercises.length ? <Rule strong /> : null}

      <PillButton variant="surface" className="mt-6" onClick={() => setAdding(true)}>
        <Plus size={17} weight="bold" />
        Add exercise
      </PillButton>

      {session.exercises.length ? (
        <div className="mt-3.5">
          <PillButton onClick={() => navigate(`/log/${programId}/${weekIndex}/${sessionId}`)}>
            {session.progress?.started ? 'Continue session' : 'Start session'}
          </PillButton>
        </div>
      ) : null}

      <AddExerciseFlow
        open={adding}
        onClose={() => setAdding(false)}
        onAdd={(body) => mutate(() => api.post(`${base}/exercises`, body))}
      />
    </Screen>
  );
}

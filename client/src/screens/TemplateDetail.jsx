import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { CaretDown, CaretRight, Info } from '@phosphor-icons/react';

import { Screen } from '../components/Screen.jsx';
import {
  BackButton, Card, CategoryTag, ErrorNote, PillButton, SessionTag, Skeleton, TogglePills,
} from '../components/ui.jsx';
import { Sheet } from '../components/Sheet.jsx';
import { BodyDiagram } from '../components/BodyDiagram.jsx';
import { Label, Rule, SectionRule, ShapeStrip } from '../components/programs.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { useProgram } from '../state/ProgramContext.jsx';
import { dayName, prescription, pluralize, restLabel } from '../lib/format.js';
import { sessionTypeColor } from '../lib/tokens.js';
import { EASE_OUT_QUINT } from '../lib/tokens.js';

/**
 * Inspect a template before committing to it.
 *
 * Sessions were cards with a 6px coloured bar down the left edge — the craft
 * floor refuses a coloured side border above 1px, and the colour was already
 * carried by the type tag beside the name. Sessions are now hairline rows that
 * expand in place, and the type colour rides a 3px tick.
 */

function ExerciseRow({ entry, onOpen, last }) {
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="press flex w-full items-start gap-3 py-3 text-left"
        aria-label={`${entry.name} details`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold">{entry.name}</span>
            <CategoryTag category={entry.category} />
          </span>
          <span className="tabular mt-1 block text-[13px] font-medium text-ink-muted">
            {prescription(entry)} · {restLabel(entry.restSeconds)} rest
          </span>
        </span>
        <Info size={16} className="mt-0.5 shrink-0 text-ink-muted" />
      </button>
      {last ? null : <Rule />}
    </>
  );
}

function SessionBlock({ session, open, onToggle, onOpenExercise, last }) {
  const { fg } = sessionTypeColor(session.type);
  const setCount = session.exercises.reduce((n, e) => n + e.sets, 0);

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="press flex w-full items-center gap-3 py-3.5 text-left"
      >
        <span aria-hidden className="h-[26px] w-[3px] shrink-0 rounded-pill" style={{ background: fg }} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] leading-none font-semibold">{session.name}</span>
            <SessionTag type={session.type} />
          </span>
          <Label className="mt-1.5">
            {dayName(session.day)} · {pluralize(session.exercises.length, 'exercise')} · {setCount}{' '}
            sets
          </Label>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.24, ease: EASE_OUT_QUINT }}
          className="shrink-0 text-ink-muted"
        >
          <CaretDown size={16} weight="bold" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE_OUT_QUINT }}
            className="overflow-hidden"
          >
            <div className="pb-1 pl-[15px]">
              <Rule />
              {session.exercises.map((entry, i) => (
                <ExerciseRow
                  key={entry.id}
                  entry={entry}
                  onOpen={() => onOpenExercise(entry)}
                  last={i === session.exercises.length - 1}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      {last ? null : <Rule />}
    </>
  );
}

export default function TemplateDetail() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { program: activeProgram, refresh } = useProgram();
  const { data, loading, error, refresh: retry } = useApi(`/catalog/templates/${templateId}`);

  const [weekIndex, setWeekIndex] = useState(0);
  const [openSession, setOpenSession] = useState(0);
  const [detail, setDetail] = useState(null);
  const [starting, setStarting] = useState(false);
  const [failure, setFailure] = useState(null);

  const template = data?.template;
  const week = template?.weeks[weekIndex];

  const totals = useMemo(() => {
    if (!template) return null;
    let sessions = 0;
    let sets = 0;
    for (const w of template.weeks) {
      sessions += w.sessions.length;
      for (const s of w.sessions) for (const e of s.exercises) sets += e.sets;
    }
    return { sessions, sets };
  }, [template]);

  const days = useMemo(
    () => (template ? template.weeks[0].sessions.map((s) => s.day % 7) : []),
    [template],
  );

  async function start() {
    setStarting(true);
    setFailure(null);
    try {
      const { program } = await api.post(`/programs/template/${templateId}`);
      await refresh();
      navigate(`/programs/${program.id}/weeks`, { replace: true });
    } catch (err) {
      setFailure(err.message);
      setStarting(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <BackButton to="/programs/templates" />
        <div className="mt-7 flex flex-col gap-4">
          <Skeleton className="h-10 w-64" radius={12} />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-11 w-full" radius={999} />
          <Skeleton className="h-[92px] w-full" />
        </div>
      </Screen>
    );
  }

  if (error || !template) {
    return (
      <Screen>
        <BackButton to="/programs/templates" />
        <div className="mt-7">
          <ErrorNote onRetry={retry}>{error?.message || 'That template does not exist.'}</ErrorNote>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <BackButton to="/programs/templates" />

      <h1 className="mt-7 text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
        {template.name}
      </h1>
      <p className="mt-2.5 text-[14px] leading-[1.5] font-medium text-ink-muted">
        {template.tagline}
      </p>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <Label>The week</Label>
          <ShapeStrip days={days} size={18} gap={4} showLetters className="mt-2.5" />
        </div>
        <Label className="text-right leading-[1.7]">
          {pluralize(template.totalWeeks, 'week')}
          <br />
          {totals.sessions} sessions · {totals.sets} sets
        </Label>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {template.sessionTypes.map((type) => (
          <SessionTag key={type} type={type} />
        ))}
      </div>

      <SectionRule className="mt-8">Every week, session by session</SectionRule>

      <TogglePills
        scroll
        className="mt-4 mb-1"
        options={template.weeks.map((w) => ({ value: w.index, label: `Week ${w.index + 1}` }))}
        value={weekIndex}
        onChange={(next) => {
          setWeekIndex(next);
          setOpenSession(0);
        }}
      />

      <div>
        {week.sessions.map((session, index) => (
          <SessionBlock
            key={session.id}
            session={session}
            open={openSession === index}
            onToggle={() => setOpenSession(openSession === index ? -1 : index)}
            onOpenExercise={setDetail}
            last={index === week.sessions.length - 1}
          />
        ))}
      </div>
      <Rule strong />

      <div className="mt-8">
        {activeProgram ? (
          <p className="mb-3.5 text-center text-[12px] leading-[1.45] font-medium text-ink-muted">
            This becomes your active program. {activeProgram.name} stays saved along with
            everything you logged against it.
          </p>
        ) : null}

        {failure ? (
          <div className="mb-3.5">
            <ErrorNote>{failure}</ErrorNote>
          </div>
        ) : null}

        <PillButton onClick={start} disabled={starting}>
          {starting ? 'Setting up…' : 'Use this program'}
          {starting ? null : <CaretRight size={16} weight="bold" />}
        </PillButton>
      </div>

      <Sheet
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.name}
        subtitle={detail ? `${prescription(detail)} · ${restLabel(detail.restSeconds)} rest` : ''}
      >
        {detail ? (
          <div className="flex flex-col gap-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryTag category={detail.category} />
              {detail.muscleNames ? (
                <span className="text-[12px] font-medium text-ink-muted">
                  {detail.muscleNames.primary}
                </span>
              ) : null}
            </div>

            {detail.note ? (
              <Card className="p-[18px]">
                <Label>Coaching cue</Label>
                <p className="mt-2 text-[14px] leading-[1.5] font-medium">{detail.note}</p>
              </Card>
            ) : null}

            <Card tone="raised" className="px-[18px] pt-[18px] pb-4">
              <BodyDiagram
                muscles={detail.muscles}
                caption={
                  detail.muscleNames?.secondary?.length
                    ? `Also works ${detail.muscleNames.secondary.join(', ')}`
                    : null
                }
              />
            </Card>
          </div>
        ) : null}
      </Sheet>
    </Screen>
  );
}

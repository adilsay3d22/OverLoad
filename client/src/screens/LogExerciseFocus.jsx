import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Screen } from '../components/Screen.jsx';
import { BackButton, ErrorNote, PillButton, Skeleton, TogglePills } from '../components/ui.jsx';
import { Crumb, Label, Rule, SectionRule } from '../components/programs.jsx';
import { LineChart } from '../components/charts.jsx';
import { SetRegister } from '../components/SetRegister.jsx';
import { useApi } from '../hooks/useApi.js';
import { api } from '../lib/api.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useRestTimer } from '../state/RestTimerContext.jsx';
import { useActiveSession } from '../state/ActiveSessionContext.jsx';
import { round1, toDisplayWeight, weightLabel, restLabel } from '../lib/format.js';
import { queueSetWrite, startWriteQueueSync } from '../lib/writeQueue.js';

/**
 * Logging an exercise, with nothing in the way.
 *
 * This screen used to be five stacked cards — target, sets, cue, muscles,
 * history — each the same size and the same weight, so the one thing you came
 * here to do had no more presence than the muscle diagram. It is now built the
 * way the rest of the app's list screens are: hairline rules instead of
 * containers, a caps label opening each section, and hierarchy carried by scale.
 * The sets sit first and largest, and everything else is reference material
 * underneath them.
 *
 * The muscle diagram is gone entirely. Which muscles a back squat works is not
 * something you look up while you are standing under the bar, and it was the
 * largest and loudest block on a screen that exists to record three numbers.
 * `ExerciseDetail` and `TemplateDetail` still carry it, which is where someone
 * choosing an exercise would actually go looking.
 */

const METRICS = [
  { value: 'wt', label: 'Wt' },
  { value: 'reps', label: 'Reps' },
  { value: 'vol', label: 'Vol' },
];

export default function LogExerciseFocus() {
  const { programId, week, sessionId, index } = useParams();
  const position = Number(index);
  const navigate = useNavigate();
  const { units, user } = useAuth();
  const timer = useRestTimer();
  const { start: startSession, end: endSession, setExerciseIndex } = useActiveSession();
  const scrollRef = useRef(null);

  const { data, loading, error, refresh, setData } = useApi(
    `/logs/session/${programId}/${week}/${sessionId}`,
  );
  const [metric, setMetric] = useState('wt');
  const [saveError, setSaveError] = useState(null);

  // Replay anything stranded by a dropped connection as soon as the phone has
  // one again — on reconnect, and on returning to the tab.
  useEffect(
    () =>
      startWriteQueueSync((sent) =>
        setSaveError(`${sent} set${sent === 1 ? '' : 's'} synced.`),
      ),
    [],
  );

  const exercise = data?.exercises?.[position];
  const total = data?.exercises?.length || 0;
  const isLast = position >= total - 1;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setMetric('wt');
  }, [position]);

  // Reloading straight onto this screen skips the summary, so keep the clock
  // honest from here too.
  const sessionComplete = data?.progress?.complete;
  const sessionName = data?.session?.name;
  useEffect(() => {
    if (!data) return;
    if (sessionComplete) endSession();
    else {
      startSession({
        programId, weekIndex: Number(week), sessionId, name: sessionName, exerciseIndex: position,
      });
      setExerciseIndex(position);
    }
  }, [
    data, sessionComplete, sessionName, programId, week, sessionId, position,
    startSession, endSession, setExerciseIndex,
  ]);

  /**
   * `rest` is what separates finishing a set from editing one. Both write
   * `complete: true`, but only the first should take over the screen with a
   * countdown — otherwise correcting a typo in set 1 starts a rest you are not
   * taking.
   */
  async function saveSet(setIndex, body, { rest = false } = {}) {
    setSaveError(null);
    const path = `/logs/session/${programId}/${week}/${sessionId}/${exercise.id}/sets/${setIndex}`;
    try {
      const { set } = await api.put(path, body);
      setData((prev) => {
        const next = structuredClone(prev);
        const target = next.exercises[position];
        target.sets[setIndex] = set;
        target.completedSets = target.sets.filter((s) => s.complete).length;
        next.progress.loggedSets = next.exercises.reduce(
          (n, e) => n + e.sets.filter((s) => s.complete).length,
          0,
        );
        return next;
      });

      if (body.complete && rest) {
        // What comes after this rest. On any set but the last it is another set
        // of the same exercise; on the last set it is the next exercise, which
        // is the one moment the lifter needs its name — they are about to walk
        // to a different rack.
        const wasLastSet = setIndex + 2 > exercise.targetSets;
        const upcoming = wasLastSet ? data.exercises[position + 1] : exercise;
        timer.start({
          total: exercise.restSeconds,
          exerciseName: exercise.name,
          setLabel: wasLastSet
            ? upcoming
              ? `Next · ${upcoming.name} · Set 1 of ${upcoming.targetSets}`
              : 'Last set of the session'
            : `Next · Set ${setIndex + 2} of ${exercise.targetSets}`,
          sessionLabel: `${data.session.name} · Week ${data.weekIndex + 1}`,
          presentation: user?.restPresentation || 'fullscreen',
          // The set that just closed, and what the plan asks for next.
          lastSet: { weight: body.weight, reps: body.reps, rpe: body.actualRpe },
          nextTarget: upcoming ? { reps: upcoming.reps, rpe: upcoming.rpe } : null,
        });
      }
    } catch (err) {
      // Keep the work rather than the error: the set is queued and replayed when
      // the connection comes back, so a dropped write in a basement gym is a
      // delay rather than a lost set.
      queueSetWrite(path, body);
      setSaveError(
        `${err.message} — saved on this phone and will sync when you are back online.`,
      );
    }
  }

  const chart = useMemo(() => {
    if (!exercise?.history?.length) return null;
    const points = exercise.history.map((p) =>
      metric === 'wt'
        ? round1(toDisplayWeight(p.weight, units))
        : metric === 'reps'
          ? p.reps
          : round1(toDisplayWeight(p.volume, units)),
    );
    return {
      points,
      labels: exercise.history.map((p) => `W${p.weekIndex + 1}`),
      unit: metric === 'reps' ? '' : units,
    };
  }, [exercise, metric, units]);

  const best = useMemo(() => {
    if (!exercise?.history?.length) return null;
    return exercise.history.reduce((a, p) => (p.weight * p.reps > a.weight * a.reps ? p : a));
  }, [exercise]);

  // The most recent session of this exercise, which is what the open row is
  // proposed from. `history` already excludes the log being written right now.
  const lastSession = exercise?.history?.length
    ? exercise.history[exercise.history.length - 1]
    : null;

  if (loading) {
    return (
      <Screen>
        <BackButton />
        <div className="mt-7 flex flex-col gap-5">
          <Skeleton className="h-9 w-56" radius={8} />
          <Skeleton className="h-4 w-44" radius={4} />
          <Skeleton className="h-[190px] w-full" radius={8} />
          <Skeleton className="h-[120px] w-full" radius={8} />
        </div>
      </Screen>
    );
  }

  if (error || !exercise) {
    return (
      <Screen>
        <BackButton />
        <div className="mt-7">
          {/* A 404 here means the program was deleted, so retrying is a dead
              end and the only offer worth making is a way out. */}
          <ErrorNote
            onRetry={error?.status === 404 ? undefined : refresh}
            action={() => navigate('/programs')}
            actionLabel="Back to programs"
          >
            {error?.status === 404
              ? 'This session no longer exists — the program it belonged to was deleted.'
              : error?.message || 'That exercise is not part of this session.'}
          </ErrorNote>
        </div>
      </Screen>
    );
  }

  const summaryPath = `/log/${programId}/${week}/${sessionId}`;
  const repsWord = exercise.repsUnit === 'sec' ? 'sec' : 'reps';

  return (
    <Screen scrollRef={scrollRef}>
      <div className="flex items-center gap-3">
        <BackButton to={summaryPath} />
        <Crumb>
          {exercise.category} · Exercise {position + 1} of {total}
        </Crumb>
      </div>

      <h1 className="mt-6 text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
        {exercise.name}
      </h1>
      {/* The plan, as one line. It is a caption for the sets below it, and it
          has to stay close enough to compare against: target RPE beside what
          the set actually felt like is the whole point of this screen. */}
      <p className="tabular mt-2 text-[14px] font-medium text-ink-muted">
        {exercise.targetSets} × {exercise.reps} {repsWord} at RPE {exercise.rpe} ·{' '}
        {restLabel(exercise.restSeconds)} rest
      </p>

      <div className="mt-9" style={{ containerType: 'inline-size' }}>
        <SectionRule className="mb-3.5">Sets</SectionRule>

        {saveError ? (
          <p
            role="status"
            aria-live="polite"
            className="mb-3 text-[12px] leading-[1.45] font-semibold text-danger"
          >
            {saveError}
          </p>
        ) : null}

        <SetRegister
          exercise={exercise}
          units={units}
          lastSession={lastSession}
          bestWeight={best?.weight}
          onSave={saveSet}
        />

        {/* The dimmed numbers need naming once. Without this they read as
            targets the app has set for you rather than as your own last
            session, which is a different and much worse thing to be handed. */}
        <p className="mt-3.5 text-[12px] leading-[1.5] font-medium text-ink-muted">
          {lastSession
            ? 'Dimmed numbers are what you did last time. '
            : 'First time logging this one, so the dimmed numbers are the plan. '}
          RPE is what the set actually felt like — the plan asked for {exercise.rpe}.
        </p>
      </div>

      {exercise.note ? (
        <div className="mt-10">
          <SectionRule className="mb-3.5">Cue</SectionRule>
          <p className="text-[15px] leading-[1.5] font-medium">{exercise.note}</p>
        </div>
      ) : null}

      <div className="mt-10">
        <SectionRule
          className="mb-4"
          action={<TogglePills options={METRICS} value={metric} onChange={setMetric} />}
        >
          History
        </SectionRule>
        {chart ? (
          <>
            <LineChart
              points={chart.points}
              labels={chart.labels}
              unit={chart.unit}
              formatValue={(v) => `${v}${chart.unit}`}
            />
            {best ? (
              <>
                <Rule className="mt-4" />
                <div className="flex items-baseline justify-between gap-3 pt-3">
                  <Label>Best set</Label>
                  <span className="tabular text-[13px] font-semibold">
                    {weightLabel(best.weight, units)} × {best.reps} · ~
                    {weightLabel(best.weight * (1 + best.reps / 30), units, { decimals: 0 })} 1RM
                  </span>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <p className="text-[13px] leading-[1.5] font-medium text-ink-muted">
            No history yet. Log this exercise once and the trend starts here.
          </p>
        )}
      </div>

      <PillButton
        className="mt-11"
        onClick={() =>
          isLast ? navigate(summaryPath) : navigate(`${summaryPath}/${position + 1}`)
        }
      >
        {isLast ? 'Finish session' : 'Next exercise'}
      </PillButton>
    </Screen>
  );
}

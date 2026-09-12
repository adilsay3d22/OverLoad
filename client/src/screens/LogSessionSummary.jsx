import { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check } from '@phosphor-icons/react';

import { Screen, Stagger, StaggerItem } from '../components/Screen.jsx';
import {
  BackButton, CategoryTag, ErrorNote, PillButton, ProgressBar, SectionLabel, SessionTag, Skeleton,
} from '../components/ui.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useActiveSession } from '../state/ActiveSessionContext.jsx';
import { prescription, targetSetCount, weightLabel } from '../lib/format.js';

/** Tonnes past a thousand kilos, the way lifters actually say it. */
const volumeLabel = (kg, units) => {
  if (!kg) return units === 'lb' ? '0 lb' : '0 kg';
  if (units === 'lb') return `${Math.round(kg / 0.45359237).toLocaleString()} lb`;
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`;
};

function CompletionMark({ done, total }) {
  if (done >= total && total > 0) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent">
        <Check size={16} weight="bold" className="text-ink" />
      </span>
    );
  }
  if (done > 0) {
    return (
      <span className="tabular flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-accent text-[11px] font-bold text-accent-deep">
        {done}/{total}
      </span>
    );
  }
  return <span className="size-8 shrink-0 rounded-full border border-line-strong" aria-hidden />;
}

export default function LogSessionSummary() {
  const { programId, week, sessionId } = useParams();
  const navigate = useNavigate();
  const { units } = useAuth();
  // Pull the callbacks out: the context object itself changes every second as
  // the clock ticks, and depending on it would re-run this effect that often.
  const { start: startSession, end: endSession } = useActiveSession();
  const { data, loading, error, refresh } = useApi(
    `/logs/session/${programId}/${week}/${sessionId}`,
  );

  // This screen sees the whole session, so it owns the clock: running while
  // anything is outstanding, stopped the moment everything is logged.
  const complete = data?.progress?.complete;
  const sessionName = data?.session?.name;
  useEffect(() => {
    if (!data) return;
    if (complete) endSession();
    else startSession({ programId, weekIndex: Number(week), sessionId, name: sessionName });
  }, [data, complete, sessionName, programId, week, sessionId, startSession, endSession]);

  const base = `/log/${programId}/${week}/${sessionId}`;
  // What the session actually amounted to. Both figures come from logged sets;
  // nothing here is estimated, and an empty session shows zero rather than a
  // flattering blank.
  const sessionVolume = useMemo(
    () =>
      (data?.exercises || []).reduce(
        (total, ex) =>
          total +
          (ex.sets || [])
            .filter((set) => set.complete)
            .reduce((n, set) => n + (set.weight || 0) * (set.reps || 0), 0),
        0,
      ),
    [data],
  );

  // "Heavier than last time" compares each lift's best logged set today against
  // the previous entry in its own history.
  const beatenCount = useMemo(
    () =>
      (data?.exercises || []).filter((ex) => {
        const today = Math.max(0, ...(ex.sets || []).filter((x) => x.complete).map((x) => x.weight || 0));
        const previous = ex.history?.[ex.history.length - 1]?.weight;
        return today > 0 && previous > 0 && today > previous;
      }).length,
    [data],
  );

  const firstIncomplete =
    data?.exercises.findIndex((e) => e.completedSets < targetSetCount(e)) ?? -1;

  return (
    <Screen>
      <BackButton to={`/programs/${programId}/weeks/${week}/sessions/${sessionId}`} />

      {loading ? (
        <div className="mt-7 flex flex-col gap-3.5">
          <Skeleton className="h-10 w-52" radius={12} />
          <Skeleton className="h-2 w-full" radius={999} />
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[76px] w-full" />
          ))}
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
            {error.status === 404 ? 'This session no longer exists — the program it belonged to was deleted.' : error.message}
          </ErrorNote>
        </div>
      ) : (
        <>
          <div className="mt-7">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.03em]">
                {data.session.name}
              </h1>
              <SessionTag type={data.session.type} />
            </div>
            <p
              className="mt-2.5 text-[11px] leading-none font-semibold text-ink-muted uppercase"
              style={{ letterSpacing: '0.12em' }}
            >
              Week {data.weekIndex + 1} · {data.exercises.length} exercises
            </p>
          </div>

          <div className="mt-5">
            <ProgressBar value={data.progress.loggedSets} total={data.progress.plannedSets} />
            <p className="tabular mt-2.5 text-[13px] font-medium text-ink-muted">
              {data.progress.loggedSets} of {data.progress.plannedSets} sets logged
            </p>
          </div>

          <div className="mt-7">
            <SectionLabel>Exercises</SectionLabel>
            <Stagger gap={10}>
              {data.exercises.map((exercise, index) => {
                const last = exercise.history[exercise.history.length - 1];
                return (
                  <StaggerItem key={exercise.id}>
                    <button
                      onClick={() => navigate(`${base}/${index}`)}
                      className="press flex w-full items-center gap-3 rounded-row border border-line bg-surface p-[18px] text-left hover:bg-accent-wash"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[15px] font-semibold">{exercise.name}</span>
                          <CategoryTag category={exercise.category} />
                        </span>
                        <span className="tabular mt-1 block text-[13px] font-medium text-ink-muted">
                          {prescription(exercise)}
                          {last
                            ? ` · last ${weightLabel(last.weight, units)} × ${last.reps}`
                            : ''}
                        </span>
                      </span>
                      <CompletionMark done={exercise.completedSets} total={targetSetCount(exercise)} />
                    </button>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </div>

          <div className="mt-8">
            {data.progress.complete ? (
              <>
                <div className="rounded-card bg-dark-bg grid-texture p-[22px] text-white">
                  <p
                    className="text-[11px] leading-none font-bold text-accent uppercase"
                    style={{ letterSpacing: '0.14em' }}
                  >
                    Session complete
                  </p>
                  <div className="mt-4 flex items-end gap-8">
                    <div>
                      <div className="tabular text-[34px] leading-none font-extrabold tracking-[-0.035em]">
                        {data.progress.loggedSets}
                      </div>
                      <div className="mt-2 text-[11px] leading-none font-semibold text-dark-muted uppercase" style={{ letterSpacing: '0.12em' }}>
                        Sets logged
                      </div>
                    </div>
                    <div>
                      <div className="tabular text-[34px] leading-none font-extrabold tracking-[-0.035em]">
                        {volumeLabel(sessionVolume, units)}
                      </div>
                      <div className="mt-2 text-[11px] leading-none font-semibold text-dark-muted uppercase" style={{ letterSpacing: '0.12em' }}>
                        Moved
                      </div>
                    </div>
                  </div>
                  {beatenCount ? (
                    <p className="mt-4 text-[13px] leading-[1.45] font-medium text-white">
                      {beatenCount === 1
                        ? 'One lift went heavier than last time.'
                        : `${beatenCount} lifts went heavier than last time.`}
                    </p>
                  ) : null}
                </div>
                <PillButton
                  className="mt-3.5"
                  onClick={() => {
                    endSession();
                    navigate('/home');
                  }}
                >
                  Done — back to Home
                </PillButton>
              </>
            ) : (
              <PillButton onClick={() => navigate(`${base}/${Math.max(0, firstIncomplete)}`)}>
                {data.progress.started ? 'Continue logging' : 'Start with exercise 1'}
              </PillButton>
            )}
          </div>
        </>
      )}
    </Screen>
  );
}

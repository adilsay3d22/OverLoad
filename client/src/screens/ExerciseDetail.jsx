import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Screen } from '../components/Screen.jsx';
import { BackButton, CategoryTag, ErrorNote, Skeleton, TogglePills } from '../components/ui.jsx';
import { LineChart } from '../components/charts.jsx';
import { BodyDiagram } from '../components/BodyDiagram.jsx';
import { Label, Rule, SectionRule } from '../components/programs.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../state/AuthContext.jsx';
import { relativeDay, round1, shortDate, toDisplayWeight, weightLabel } from '../lib/format.js';

/**
 * One exercise, over time.
 *
 * The four headline numbers were four bordered chips in a 2×2 block — same-size
 * boxes as page structure. They are now one ruled row of four figures, which is
 * how a record sheet states its facts and which fits the numbers side by side
 * where they can be compared. Charts and the session log lost their card shells
 * for the same reason: on a screen that is entirely data, a container around
 * every reading is noise.
 */

const RANGES = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All time' },
];

const WINDOW_DAYS = { week: 7, month: 30, all: Infinity };

function Figure({ label, value, className }) {
  return (
    <div className={className}>
      <div className="tabular text-[20px] leading-none font-bold tracking-[-0.02em]">{value}</div>
      <Label className="mt-2">{label}</Label>
    </div>
  );
}

export default function ExerciseDetail() {
  const { key } = useParams();
  const { units } = useAuth();
  const { data, loading, error, refresh } = useApi(`/progress/exercise/${key}`);
  const [range, setRange] = useState('all');

  const history = useMemo(() => {
    if (!data) return [];
    const days = WINDOW_DAYS[range];
    if (days === Infinity) return data.history;
    const since = Date.now() - days * 86400000;
    const inRange = data.history.filter((p) => new Date(p.date).getTime() >= since);
    return inRange.length >= 2 ? inRange : data.history.slice(-2);
  }, [data, range]);

  const labels = history.map((p) => shortDate(p.date));

  return (
    <Screen>
      <BackButton />

      {loading ? (
        <div className="mt-7 flex flex-col gap-4">
          <Skeleton className="h-10 w-56" radius={12} />
          <Skeleton className="h-[60px] w-full" radius={12} />
          <Skeleton className="h-[190px] w-full" radius={12} />
        </div>
      ) : error ? (
        <div className="mt-7">
          <ErrorNote onRetry={refresh}>{error.message}</ErrorNote>
        </div>
      ) : (
        <>
          <h1 className="mt-7 text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
            {data.exercise.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <CategoryTag category={data.exercise.category} />
            {data.exercise.equipment?.length ? (
              <span className="text-[12px] font-medium text-ink-muted">
                {data.exercise.equipment.join(' · ')}
              </span>
            ) : null}
          </div>

          {/* Four figures on one ruled row, so they can be read against each
              other rather than hunted across four boxes. */}
          <div className="mt-7">
            <Rule strong />
            <div className="grid grid-cols-2 gap-y-5 py-5 sm:grid-cols-4">
              <Figure
                label="Current best"
                value={`${weightLabel(data.stats.best.weight, units)} × ${data.stats.best.reps}`}
              />
              <Figure
                label="Est. 1RM"
                value={weightLabel(data.stats.est1RM, units, { decimals: 0 })}
              />
              <Figure label="Total sets" value={data.stats.totalSets} />
              <Figure label="Last trained" value={relativeDay(data.stats.lastTrained)} />
            </div>
            <Rule strong />
          </div>

          <TogglePills className="mt-7" options={RANGES} value={range} onChange={setRange} />

          <SectionRule className="mt-7">Weight over time</SectionRule>
          <div className="pt-4">
            <LineChart
              points={history.map((p) => round1(toDisplayWeight(p.weight, units)))}
              labels={labels}
              unit={units}
            />
          </div>

          <SectionRule className="mt-9">Reps over time</SectionRule>
          <div className="pt-4">
            <LineChart
              points={history.map((p) => p.reps)}
              labels={labels}
              formatValue={(v) => `${v} reps`}
            />
          </div>

          {data.exercise.muscles ? (
            <>
              <SectionRule className="mt-9">Muscles worked</SectionRule>
              <div className="pt-4">
                <BodyDiagram muscles={data.exercise.muscles} />
              </div>
            </>
          ) : null}

          <SectionRule className="mt-9">Session log</SectionRule>
          <div>
            {[...data.history].reverse().map((point, index, arr) => (
              <div key={point.logId}>
                <div className="flex items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <div className="text-[14px] leading-none font-semibold">
                      {shortDate(point.date)}
                    </div>
                    <Label className="mt-1.5 truncate">
                      {point.sessionName} · Week {point.weekIndex + 1}
                      {point.avgRpe ? ` · RPE ${point.avgRpe}` : ''}
                    </Label>
                  </div>
                  <div className="tabular shrink-0 text-right">
                    <div className="text-[15px] leading-none font-bold">
                      {weightLabel(point.weight, units)}
                      <span className="px-[3px] text-ink-muted">×</span>
                      {point.reps}
                    </div>
                    <Label className="mt-1.5">
                      {weightLabel(point.volume, units, { decimals: 0 })} volume
                    </Label>
                  </div>
                </div>
                {index === arr.length - 1 ? null : <Rule />}
              </div>
            ))}
          </div>
          <Rule strong />
        </>
      )}
    </Screen>
  );
}

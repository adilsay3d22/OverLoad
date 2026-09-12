import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, CaretRight, ChartLineUp } from '@phosphor-icons/react';

import { Screen } from '../components/Screen.jsx';
import {
  CategoryTag, EmptyState, ErrorNote, PillButton, Skeleton, TextLink, TogglePills, cx,
} from '../components/ui.jsx';
import { BalanceBar, Sparkline } from '../components/charts.jsx';
// The shared list grammar lives in components/programs.jsx — labels that clear
// AA, hairline rules, section openers. It is used across both tabs now.
import { Label, Rule, SectionRule } from '../components/programs.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../state/AuthContext.jsx';
import { GROUP_BAR } from '../lib/tokens.js';
import { relativeDay, weightLabel, pluralize } from '../lib/format.js';

/**
 * The Progress tab.
 *
 * It used to open on a 168px progress ring showing how much of the current
 * program was complete — a progress ring standing in for content, and an answer
 * to a question this tab is not asked. Completion is the Programs tab's job and
 * the block matrix now carries it. This tab is asked one thing: are the numbers
 * moving?
 *
 * So it leads with a wall of small multiples, one lift per row, each showing its
 * best set, its direction and its last eight sessions on a shared shape. You
 * scan the column of arrows and see which lifts are climbing before you read a
 * single number.
 */

/** Direction of travel over the charted window, as a signed percentage. */
function Trend({ value }) {
  if (!value) {
    return (
      <span className="tabular text-[13px] font-bold text-ink-muted" title="No change yet">
        —
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className={cx(
        'tabular flex items-center gap-0.5 text-[13px]',
        up ? 'font-bold text-ink' : 'font-semibold text-ink-muted',
      )}
    >
      {up ? <ArrowUp size={12} weight="bold" /> : <ArrowDown size={12} weight="bold" />}
      {Math.abs(value)}%
    </span>
  );
}

function ExerciseRow({ exercise, units, onOpen, last }) {
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="press flex w-full items-center gap-3 py-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate text-[15px] leading-none font-semibold">{exercise.name}</span>
            <CategoryTag category={exercise.category} />
          </span>
          <span className="tabular mt-2 block text-[17px] leading-none font-bold tracking-[-0.02em]">
            {weightLabel(exercise.best.weight, units)}
            <span className="px-[3px] text-ink-muted">×</span>
            {exercise.best.reps}
          </span>
          <Label className="mt-2">
            {pluralize(exercise.totalSets, 'set')} · {relativeDay(exercise.lastTrained)}
          </Label>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-2">
          <Trend value={exercise.trend} />
          <Sparkline values={exercise.spark} width={104} height={30} />
        </span>
        <CaretRight size={15} weight="bold" className="shrink-0 text-ink-muted" />
      </button>
      {last ? null : <Rule />}
    </>
  );
}

/** Kilograms read badly past a few thousand; tonnes is how lifters say it. */
function volumeLabel(kg, units) {
  if (!kg) return units === 'lb' ? '0 lb' : '0 kg';
  if (units === 'lb') return `${Math.round(kg / 0.45359237).toLocaleString()} lb`;
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`;
}

export default function Progress() {
  const navigate = useNavigate();
  const { units } = useAuth();
  const { data, loading, error, refresh } = useApi('/progress');
  const [group, setGroup] = useState('All');
  const [showAll, setShowAll] = useState(false);

  const filtered = useMemo(() => {
    const list = data?.exercises || [];
    return group === 'All' ? list : list.filter((e) => e.group === group);
  }, [data, group]);

  const visible = showAll ? filtered : filtered.slice(0, 5);
  const topPR = data?.recentPRs?.[0];

  if (loading) {
    return (
      <Screen tabBar>
        <Skeleton className="h-9 w-40" radius={12} />
        <div className="mt-8 flex flex-col gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[86px] w-full" radius={12} />
          ))}
        </div>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen tabBar>
        <div className="mt-6">
          <ErrorNote onRetry={refresh}>{error.message}</ErrorNote>
        </div>
      </Screen>
    );
  }

  if (!data.hasData) {
    return (
      <Screen tabBar>
        <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.03em]">Progress</h1>
        <EmptyState
          className="mt-4"
          icon={<ChartLineUp size={28} />}
          title="Nothing to chart yet"
          body="Log a session and your weights, reps and muscle balance start showing up here."
          action={<PillButton onClick={() => navigate('/home')}>Log your first session</PillButton>}
        />
      </Screen>
    );
  }

  const o = data.overall;

  return (
    <Screen tabBar>
      <h1 className="text-[30px] leading-[1.1] font-bold tracking-[-0.03em]">Progress</h1>
      {o ? (
        <Label className="mt-2.5">
          This program · {o.setsLogged} sets · {o.sessionsCompleted} sessions ·{' '}
          {volumeLabel(o.totalVolume, units)} moved
        </Label>
      ) : null}

      <SectionRule
        className="mt-8"
        action={
          filtered.length > 5 ? (
            <TextLink onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show less' : `All ${filtered.length}`}
            </TextLink>
          ) : null
        }
      >
        Progression
      </SectionRule>

      <TogglePills
        scroll
        className="mt-4 mb-1"
        options={data.groups}
        value={group}
        onChange={(next) => {
          setGroup(next);
          setShowAll(false);
        }}
      />

      {visible.length ? (
        <>
          <div>
            {visible.map((exercise, index) => (
              <ExerciseRow
                key={exercise.key}
                exercise={exercise}
                units={units}
                onOpen={() => navigate(`/progress/exercise/${exercise.key}`)}
                last={index === visible.length - 1}
              />
            ))}
          </div>
          <Rule strong />
        </>
      ) : (
        <p className="py-5 text-[14px] font-medium text-ink-muted">
          Nothing logged for {group.toLowerCase()} yet.
        </p>
      )}

      {topPR ? (
        <>
          <SectionRule
            className="mt-9"
            action={<TextLink onClick={() => navigate('/progress/prs')}>See all</TextLink>}
          >
            Best lift
          </SectionRule>
          <button
            type="button"
            onClick={() => navigate(`/progress/exercise/${topPR.key}`)}
            className="press flex w-full items-end justify-between gap-4 py-4 text-left"
          >
            <span className="min-w-0">
              <span className="block truncate text-[15px] leading-none font-semibold">
                {topPR.name}
              </span>
              <span className="tabular mt-2.5 block text-[34px] leading-none font-extrabold tracking-[-0.035em]">
                {weightLabel(topPR.weight, units)}
                <span className="px-1 text-ink-muted">×</span>
                {topPR.reps}
              </span>
              <Label className="mt-2.5">
                Est. 1RM ~{weightLabel(topPR.est1RM, units, { decimals: 0 })} ·{' '}
                {relativeDay(topPR.date)}
              </Label>
            </span>
            <Label className="shrink-0 text-right">
              {pluralize(data.prCount, 'record')}
              <br />
              in total
            </Label>
          </button>
          <Rule strong />
        </>
      ) : null}

      {data.balance.length ? (
        <>
          <SectionRule className="mt-9">Muscle balance</SectionRule>
          <Label className="mt-3.5">Share of sets over the last 30 days</Label>
          <div className="mt-4 flex flex-col gap-3.5">
            {data.balance.map((row, i) => (
              <div key={row.group} className="flex items-center gap-3">
                <span className="w-[70px] shrink-0 text-[12px] font-semibold">{row.group}</span>
                <BalanceBar
                  percent={row.percent}
                  color={GROUP_BAR[row.group] || 'var(--color-ink)'}
                  delay={i * 0.06}
                />
                <span className="tabular w-9 shrink-0 text-right text-[12px] font-semibold text-ink-muted">
                  {row.percent}%
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Screen>
  );
}

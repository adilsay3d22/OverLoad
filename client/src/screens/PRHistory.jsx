import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CaretRight } from '@phosphor-icons/react';

import { Screen } from '../components/Screen.jsx';
import {
  BackButton, CategoryTag, EmptyState, ErrorNote, Skeleton, TogglePills,
} from '../components/ui.jsx';
import { Label, Rule, SectionRule } from '../components/programs.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../state/AuthContext.jsx';
import { relativeDay, weightLabel, pluralize } from '../lib/format.js';

/**
 * Every personal record, across every program.
 *
 * Rows on hairlines rather than bordered cards, so the numbers — which are the
 * point — carry the rhythm instead of the containers. The newest record is
 * badged in ink: it is a fact about the data, and DESIGN.md reserves lime for
 * the thing you are meant to tap.
 */
export default function PRHistory() {
  const navigate = useNavigate();
  const { units } = useAuth();
  const { data, loading, error, refresh } = useApi('/progress/prs');
  const [group, setGroup] = useState('All');

  const rows = useMemo(() => {
    const list = data?.prs || [];
    const filtered = group === 'All' ? list : list.filter((p) => p.group === group);
    // Grouped by exercise, one row each showing its current all-time best.
    return [...filtered].sort((a, b) => b.score - a.score);
  }, [data, group]);

  const newest = data?.prs?.[0]?.key;

  return (
    <Screen>
      <BackButton to="/progress" />

      <h1 className="mt-7 text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
        Personal records
      </h1>
      <p className="mt-2.5 text-[15px] leading-[1.5] font-medium text-ink-muted">
        Your best set for every exercise you have logged, across every program.
      </p>

      {loading ? (
        <div className="mt-8 flex flex-col gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[76px] w-full" radius={12} />
          ))}
        </div>
      ) : error ? (
        <div className="mt-8">
          <ErrorNote onRetry={refresh}>{error.message}</ErrorNote>
        </div>
      ) : !data.prs.length ? (
        <EmptyState
          className="mt-6"
          title="No records yet"
          body="Check off a set with weight and reps and it becomes your first PR."
        />
      ) : (
        <>
          <SectionRule className="mt-8">{pluralize(rows.length, 'record')}</SectionRule>

          <TogglePills
            scroll
            className="mt-4 mb-1"
            options={data.groups}
            value={group}
            onChange={setGroup}
          />

          <div>
            {rows.map((pr, index) => (
              <div key={pr.key}>
                <button
                  type="button"
                  onClick={() => navigate(`/progress/exercise/${pr.key}`)}
                  className="press flex w-full items-center gap-3 py-4 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] leading-none font-semibold">
                        {pr.name}
                      </span>
                      <CategoryTag category={pr.category} />
                      {pr.key === newest ? (
                        <span
                          className="rounded-pill bg-ink px-2 py-[3px] text-[9px] font-bold text-white uppercase"
                          style={{ letterSpacing: '0.08em' }}
                        >
                          Newest
                        </span>
                      ) : null}
                    </span>
                    <span className="tabular mt-2.5 block text-[26px] leading-none font-bold tracking-[-0.03em]">
                      {weightLabel(pr.weight, units)}
                      <span className="px-1 text-ink-muted">×</span>
                      {pr.reps}
                    </span>
                    <Label className="mt-2.5">
                      {relativeDay(pr.date)} · Est. 1RM ~
                      {weightLabel(pr.est1RM, units, { decimals: 0 })}
                    </Label>
                  </span>
                  <CaretRight size={15} weight="bold" className="shrink-0 text-ink-muted" />
                </button>
                {index === rows.length - 1 ? null : <Rule />}
              </div>
            ))}
          </div>
          <Rule strong />
        </>
      )}
    </Screen>
  );
}

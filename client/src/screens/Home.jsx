import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, User } from '@phosphor-icons/react';

import { Screen } from '../components/Screen.jsx';
import { DumbbellGlyph } from '../components/Brand.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../state/AuthContext.jsx';
import { dayAbbr, weekdayIndex, weightLabel } from '../lib/format.js';
import { sessionTypeColor } from '../lib/tokens.js';
import { cx } from '../components/ui.jsx';
import { EASE } from '../lib/motion.js';

/**
 * Home carries its hierarchy in scale alone.
 *
 * There is no card, border, box or shadow on this route — the composition is
 * hairline rules, one vertical spine, and a 6.4:1 scale jump between the target
 * numerals (64px) and the labels that name them (10px). Everything that would
 * have been a container is a rule instead.
 *
 * Three rules the rest of the screen depends on:
 *
 *  - Lime appears exactly once per state, on the thing you are meant to touch.
 *    Session-type colour rides the spine markers so the week still has variety
 *    without a second thing competing for the tap.
 *  - Every row hangs off the spine at SPINE_INSET. Markers are centred on the
 *    rule itself, which is what makes the week read as one run.
 *  - Loading and empty states are built from the same rules and labels as the
 *    loaded screen, never from grey rounded skeletons: with no containers there
 *    is nothing for a skeleton box to be, so the labels ship immediately and
 *    only the values are pending.
 */

/** Content hangs this far right of the spine. */
const SPINE_INSET = 18;

/* -------------------------------------------------------------------------- */

/** 10px tracked caps — this world's label register, set in the committed face. */
function Label({ children, className, tone = 'faint' }) {
  return (
    <span
      className={cx(
        'block text-[10px] leading-none font-semibold uppercase',
        tone === 'faint' ? 'text-ink-muted' : tone === 'ink' ? 'text-ink' : 'text-accent-deep',
        className,
      )}
      style={{ letterSpacing: '0.14em' }}
    >
      {children}
    </span>
  );
}

function Rule({ className, tone }) {
  return (
    <div
      aria-hidden
      className={cx('h-px w-full', className)}
      style={{ background: tone || 'var(--color-line)' }}
    />
  );
}

/**
 * The spine: one vertical rule the whole screen hangs off. It is the only
 * element that animates on entry — it draws down from the top, and the rows
 * resolve along it.
 */
function Spine({ children, draw }) {
  return (
    <div className="relative" style={{ paddingLeft: SPINE_INSET }}>
      <motion.div
        aria-hidden
        className="absolute top-0 bottom-0 left-0 w-px origin-top"
        // Fades out rather than stopping dead: on a short screen (no program
        // yet) a hard terminal reads as a truncated element, not a spine.
        style={{
          background:
            'linear-gradient(var(--color-line-strong) 0%, var(--color-line-strong) calc(100% - 56px), transparent 100%)',
        }}
        initial={draw ? { scaleY: 0 } : false}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.62, ease: EASE }}
      />
      {children}
    </div>
  );
}

/**
 * The four session states, as four visibly different marks on the spine —
 * not three variants of the same circle. Rest days carry no mark at all, so
 * the spine runs clean through them.
 */
function Marker({ state, type }) {
  const tint = sessionTypeColor(type).fg;
  const base = 'absolute -translate-x-1/2';

  if (state === 'rest') return null;

  // Four marks that differ in shape, not only in colour: a 10px square reading
  // as filled-vs-hollow-vs-rotated survives a glance at arm's length, where two
  // filled squares in different tints do not.
  if (state === 'complete') {
    return (
      <span
        aria-hidden
        className={cx(base, 'top-[14px] size-[10px]')}
        style={{ left: -SPINE_INSET, background: 'var(--color-accent)' }}
      />
    );
  }
  if (state === 'active') {
    return (
      <span
        aria-hidden
        className={cx(base, 'top-[14px] size-[10px] rotate-45')}
        style={{ left: -SPINE_INSET, background: tint }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={cx(base, 'top-[14px] size-[10px]')}
      style={{
        left: -SPINE_INSET,
        border: `1.5px solid ${tint}`,
        background: 'var(--color-bg)',
      }}
    />
  );
}

/** Which state a planned session is in. Deliberately no "missed": the data
 *  model records no calendar commitment, so the app has nothing to judge. */
function sessionState(session) {
  if (session.progress.complete) return 'complete';
  if (session.progress.started) return 'active';
  return 'upcoming';
}

function SessionRow({ session, programId, weekIndex, last }) {
  const state = sessionState(session);
  const { progress } = session;

  const trailing =
    state === 'complete' ? (
      <Label tone="accent">Done</Label>
    ) : state === 'active' ? (
      <span className="tabular text-[13px] font-bold text-accent-deep">
        {progress.loggedSets}/{progress.plannedSets}
      </span>
    ) : (
      <span className="tabular text-[13px] font-medium text-ink-muted">{session.setCount}</span>
    );

  return (
    <>
      <Link
        to={`/log/${programId}/${weekIndex}/${session.id}`}
        className="press relative flex items-start gap-3 py-3.5 hover:text-accent-deep"
      >
        <Marker state={state} type={session.type} />
        <span className="w-[30px] shrink-0 pt-px">
          <Label tone={state === 'upcoming' || state === 'active' ? 'ink' : 'faint'}>
            {dayAbbr(session.day % 7)}
          </Label>
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cx(
              'block truncate text-[15px] leading-none font-semibold',
              state === 'complete' ? 'text-ink-muted' : 'text-ink',
            )}
          >
            {session.name}
          </span>
          <Label className="mt-1.5">
            {session.type} · {session.exerciseCount} exercises
          </Label>
        </span>
        <span className="shrink-0 pt-px">{trailing}</span>
      </Link>
      {last ? null : <Rule />}
    </>
  );
}

/** A rest day still occupies its line, so the week reads as seven, not four. */
function RestRow({ day, last }) {
  return (
    <>
      <div className="flex items-start gap-3 py-3.5">
        <span className="w-[30px] shrink-0 pt-px">
          <Label>{dayAbbr(day)}</Label>
        </span>
        <span className="flex-1 text-[15px] leading-none font-medium text-ink-muted">Rest</span>
      </div>
      {last ? null : <Rule />}
    </>
  );
}

/**
 * The screen's loudest element: the set the lifter is about to do. The rule
 * above this block is what separates it — it carries no label of its own.
 */
function TargetBlock({ next }) {
  if (!next) return null;
  const repsLabel = next.repsUnit === 'sec' ? 'Sets × secs' : 'Sets × reps';
  return (
    <div className="pt-6">
      <div className="text-[22px] leading-tight font-bold tracking-[-0.02em]">{next.name}</div>

      <div className="mt-4 flex items-end gap-9">
        <div>
          <div className="tabular text-[64px] leading-[0.82] font-extrabold tracking-[-0.045em]">
            {next.sets}
            <span className="px-[3px] text-ink-muted">×</span>
            {next.reps}
          </div>
          <Label className="mt-2.5">{repsLabel}</Label>
        </div>
        <div>
          <div className="tabular text-[64px] leading-[0.82] font-extrabold tracking-[-0.045em]">
            {next.rpe}
          </div>
          <Label className="mt-2.5">Target RPE</Label>
        </div>
      </div>

      {next.rest ? <Label className="mt-4">Rest {next.rest}</Label> : null}
    </div>
  );
}

/** The one lime element on the screen. */
function StartAction({ to, onClick, children }) {
  const inner = (
    <>
      <span>{children}</span>
      <ArrowRight size={17} weight="bold" />
    </>
  );
  const className =
    'press flex h-[54px] w-full items-center justify-center gap-2 bg-accent text-[15px] font-bold tracking-[-0.01em] text-ink hover:bg-accent-hover';
  return to ? (
    <Link to={to} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

/**
 * Pending values, in this world's own grammar: the labels and rules that are
 * already known ship immediately, and only the unknown values are bars set at
 * the real type metrics they will be replaced by.
 */
function PendingBar({ w, h }) {
  return <div aria-hidden className="bg-line" style={{ width: w, height: h }} />;
}

function HomePending() {
  return (
    <div aria-busy="true" aria-label="Loading your week">
      <div className="pt-7">
        <PendingBar w="72%" h={48} />
        <div className="mt-3.5">
          <PendingBar w="46%" h={10} />
        </div>
      </div>
      <div className="mt-7">
        <Rule />
      </div>
      <div className="pt-6">
        <PendingBar w="54%" h={20} />
        <div className="mt-4 flex items-end gap-9">
          <div>
            <PendingBar w={130} h={52} />
            <Label className="mt-2.5">Sets × reps</Label>
          </div>
          <div>
            <PendingBar w={48} h={52} />
            <Label className="mt-2.5">Target RPE</Label>
          </div>
        </div>
      </div>
      <div className="mt-7">
        <Rule />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

export default function Home() {
  const { user, units } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refresh } = useApi('/progress/home');
  const reduced = useReducedMotion();

  const today = weekdayIndex();
  const sessions = data?.sessions || [];

  /** Seven lines, one per weekday, so the week reads as a week. */
  const week = useMemo(() => {
    const byDay = new Map(sessions.map((s) => [s.day % 7, s]));
    return Array.from({ length: 7 }, (_, day) => ({ day, session: byDay.get(day) || null }));
  }, [sessions]);

  const hero = data?.hero;
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <Screen tabBar>
      {/* Chrome. The week index lives here, as an index — never as a kicker
          sitting above the session name. */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-[7px] text-ink">
          <DumbbellGlyph size={18} />
          <span className="text-[16px] font-semibold tracking-[-0.01em]">Overload</span>
        </div>
        <div className="flex-1" />
        {data?.program ? (
          <span className="tabular text-[10px] font-semibold uppercase text-ink-muted" style={{ letterSpacing: '0.14em' }}>
            Week {String(data.stats.week).padStart(2, '0')} / {String(data.program.totalWeeks).padStart(2, '0')}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => navigate('/profile')}
          aria-label="Profile"
          className="press -mr-1 flex size-8 items-center justify-center text-ink-muted hover:text-ink"
        >
          <User size={19} />
        </button>
      </div>
      <div className="mt-3.5">
        <Rule />
      </div>

      <Spine draw={!reduced}>
        {loading ? (
          <HomePending />
        ) : error ? (
          <div className="pt-7">
            <div className="text-[26px] leading-[1.05] font-extrabold tracking-[-0.03em]">
              Could not load your week.
            </div>
            <Label className="mt-3">{error.message}</Label>
            <div className="mt-6">
              <Rule />
            </div>
            <div className="mt-6">
              <StartAction onClick={refresh}>Try again</StartAction>
            </div>
          </div>
        ) : !data?.program ? (
          <div className="pt-7">
            <h1 className="text-[52px] leading-[0.92] font-extrabold tracking-[-0.04em] text-balance">
              No program yet, {firstName}.
            </h1>
            <Label className="mt-4">Pick a template or build your own week by week</Label>
            <div className="mt-7">
              <Rule />
            </div>
            <div className="mt-7">
              <StartAction onClick={() => navigate('/programs')}>Choose a program</StartAction>
            </div>
          </div>
        ) : (
          <div>
            {hero ? (
              <>
                <div className="pt-7">
                  <h1 className="text-[52px] leading-[0.92] font-extrabold tracking-[-0.04em] text-balance">
                    {hero.name}
                  </h1>
                  <Label className="mt-3.5">
                    {hero.type} · {hero.exerciseCount} exercises · {hero.setsPlanned} sets
                    {hero.setsLogged ? ` · ${hero.setsLogged} logged` : ''}
                  </Label>
                </div>

                <div className="mt-7">
                  <Rule />
                  <TargetBlock next={hero.next} />
                </div>

                <div className="mt-7">
                  <Rule />
                  <div className="pt-7">
                    <StartAction to={`/log/${data.program.id}/${hero.weekIndex}/${hero.sessionId}`}>
                      {hero.setsLogged ? 'Continue session' : 'Start session'}
                    </StartAction>
                  </div>
                </div>
              </>
            ) : (
              <div className="pt-7">
                <h1 className="text-[52px] leading-[0.92] font-extrabold tracking-[-0.04em]">
                  Block
                  <br />
                  complete.
                </h1>
                <Label className="mt-4">Every session in {data.program.name} is logged</Label>
                <div className="mt-7">
                  <Rule />
                </div>
                <div className="mt-7">
                  <StartAction onClick={() => navigate('/programs')}>Start a new block</StartAction>
                </div>
              </div>
            )}

            <div className="mt-10">
              <div className="flex items-baseline justify-between pb-3.5">
                <Label tone="ink">This week</Label>
                <button
                  type="button"
                  onClick={() => navigate(`/programs/${data.program.id}/weeks`)}
                  className="press text-[12px] font-semibold text-ink-muted hover:text-ink"
                >
                  All weeks
                </button>
              </div>
              <Rule tone="var(--color-line-strong)" />
              {week.map(({ day, session }, index) =>
                session ? (
                  <SessionRow
                    key={day}
                    session={session}
                    programId={data.program.id}
                    weekIndex={data.weekIndex}
                    last={index === 6}
                  />
                ) : (
                  <RestRow key={day} day={day} last={index === 6} />
                ),
              )}
            </div>

            <div className="mt-10">
              <div className="pb-3.5">
                <Label tone="ink">Consistency</Label>
              </div>
              <Rule tone="var(--color-line-strong)" />
              <div className="flex items-baseline justify-between py-3.5">
                <Label>Day streak</Label>
                <span className="tabular text-[13px] font-bold">
                  {data.stats.streak} {data.stats.streak === 1 ? 'day' : 'days'}
                </span>
              </div>
              <Rule />
              <div className="flex items-baseline justify-between py-3.5">
                <Label>Completed this week</Label>
                <span className="tabular text-[13px] font-bold">{data.stats.sessionsThisWeek}</span>
              </div>
            </div>

            {data.recentPRs?.length ? (
              <div className="mt-10">
                <div className="flex items-baseline justify-between pb-3.5">
                  <Label tone="ink">Recent records</Label>
                  <button
                    type="button"
                    onClick={() => navigate('/progress/prs')}
                    className="press text-[12px] font-semibold text-ink-muted hover:text-ink"
                  >
                    See all
                  </button>
                </div>
                <Rule tone="var(--color-line-strong)" />
                {data.recentPRs.map((pr, index) => (
                  <div key={pr.key}>
                    <div className="flex items-baseline justify-between gap-3 py-3.5">
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] leading-none font-semibold">
                          {pr.name}
                        </span>
                        <Label className="mt-1.5">{pr.category}</Label>
                      </span>
                      <span className="tabular shrink-0 text-[17px] leading-none font-bold tracking-[-0.02em]">
                        {weightLabel(pr.weight, units)}
                        <span className="px-[3px] text-ink-muted">×</span>
                        {pr.reps}
                      </span>
                    </div>
                    {index === data.recentPRs.length - 1 ? null : <Rule />}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </Spine>
    </Screen>
  );
}

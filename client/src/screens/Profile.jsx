import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Barbell, DownloadSimple, SignOut, Trash, Warning } from '@phosphor-icons/react';

import { Screen } from '../components/Screen.jsx';
import { CategoryTag, PillButton, Skeleton, TogglePills } from '../components/ui.jsx';
import { Sheet, SheetAction } from '../components/Sheet.jsx';
import { DeleteButton } from '../components/DeleteButton.jsx';
import { Label, Rule, SectionRule } from '../components/programs.jsx';
import { useApi } from '../hooks/useApi.js';
import { useAuth } from '../state/AuthContext.jsx';
import { useProgram } from '../state/ProgramContext.jsx';
import { useRestTimer } from '../state/RestTimerContext.jsx';
import { api } from '../lib/api.js';
import { restLabel } from '../lib/format.js';

/**
 * Account and preferences.
 *
 * Every setting used to sit in its own bordered card, so a list of three
 * preferences read as three boxes rather than three settings, and the danger
 * zone carried four hex literals that existed nowhere in the token system.
 * Settings are now rows on the same hairline grammar the rest of the app uses,
 * and the destructive palette has real tokens.
 *
 * The screen also used to end with a note explaining that Profile had never had
 * a design pass. That was a message to the team shipped to the user; it is gone.
 */

const REST_PRESETS = [90, 120, 150, 180, 240, 300];

/** A setting: what it is on the left, what it does underneath. */
function Setting({ label, description, children, last }) {
  return (
    <>
      <div className="py-4">
        <div className="text-[14px] leading-none font-semibold">{label}</div>
        {description ? (
          <p className="mt-2 text-[12px] leading-[1.45] font-medium text-ink-muted">
            {description}
          </p>
        ) : null}
        <div className="mt-3.5">{children}</div>
      </div>
      {last ? null : <Rule />}
    </>
  );
}

function ActionRow({ icon, label, description, onClick, disabled, last }) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="press flex w-full items-center gap-3.5 py-4 text-left disabled:opacity-50"
      >
        <span className="shrink-0 text-ink-muted">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] leading-none font-semibold">{label}</span>
          {description ? (
            <span className="mt-1.5 block text-[12px] leading-[1.45] font-medium text-ink-muted">
              {description}
            </span>
          ) : null}
        </span>
      </button>
      {last ? null : <Rule />}
    </>
  );
}

function Figure({ value, label }) {
  return (
    <div>
      <div className="tabular text-[22px] leading-none font-bold tracking-[-0.03em]">{value}</div>
      <Label className="mt-2">{label}</Label>
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { user, logout, updateProfile } = useAuth();
  const { program, refresh: refreshProgram } = useProgram();
  const timer = useRestTimer();
  const { data, loading, refresh: refreshStats } = useApi('/progress');
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [managingExercises, setManagingExercises] = useState(false);
  const { data: custom, refresh: refreshCustom } = useApi('/catalog/custom');
  const customExercises = custom?.exercises || [];
  const [exporting, setExporting] = useState(false);
  const [resetError, setResetError] = useState(null);

  const initials = (user?.name || '?')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  async function exportData() {
    setExporting(true);
    try {
      const payload = await api.get('/logs/export');
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `overload-export-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  /** Clears every program and logged set on the account. There is no undo. */
  async function resetEverything() {
    setResetError(null);
    try {
      await api.del('/auth/me/data');
      timer.dismiss();
      await Promise.all([refreshProgram(), refreshStats()]);
      navigate('/programs', { replace: true });
    } catch (err) {
      setResetError(err.message);
    }
  }

  return (
    <Screen tabBar>
      <div className="flex items-center gap-4">
        <div className="flex size-[62px] shrink-0 items-center justify-center rounded-full bg-ink text-[20px] font-bold text-white">
          {initials}
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-[24px] leading-[1.15] font-bold tracking-[-0.03em]">
            {user?.name}
          </h1>
          <p className="truncate text-[13px] font-medium text-ink-muted">{user?.email}</p>
        </div>
      </div>

      {/* Three figures on one ruled row rather than three boxes. */}
      <div className="mt-7">
        <Rule strong />
        <div className="grid grid-cols-3 py-5">
          {loading ? (
            <>
              <Skeleton className="h-[44px] w-16" radius={6} />
              <Skeleton className="h-[44px] w-16" radius={6} />
              <Skeleton className="h-[44px] w-16" radius={6} />
            </>
          ) : (
            <>
              <Figure value={data?.overall?.sessionsCompleted ?? 0} label="Sessions" />
              <Figure value={program?.totalWeeks ?? 0} label="Weeks" />
              <Figure value={data?.prCount ?? 0} label="Records" />
            </>
          )}
        </div>
        <Rule strong />
      </div>

      <SectionRule className="mt-9">Preferences</SectionRule>
      <div>
        <Setting
          label="Units"
          description="Weights are stored in kilograms; this only changes what you type and read."
        >
          <TogglePills
            options={[
              { value: 'kg', label: 'Kilograms' },
              { value: 'lb', label: 'Pounds' },
            ]}
            value={user?.units || 'kg'}
            onChange={(units) => updateProfile({ units })}
          />
        </Setting>

        <Setting
          label="Rest starts as"
          description="Either way you can exit the countdown and it keeps running as a floating pill; tapping that pill goes back to full screen."
        >
          <TogglePills
            options={[
              { value: 'fullscreen', label: 'Full screen' },
              { value: 'mini', label: 'Floating pill' },
            ]}
            value={user?.restPresentation || 'fullscreen'}
            onChange={(restPresentation) => updateProfile({ restPresentation })}
          />
        </Setting>

        <Setting
          label="Default rest"
          description="Used when an exercise has no rest of its own."
          last
        >
          <TogglePills
            scroll
            options={REST_PRESETS.map((seconds) => ({
              value: seconds,
              label: restLabel(seconds),
            }))}
            value={user?.restDefaultSeconds ?? 180}
            onChange={(restDefaultSeconds) => updateProfile({ restDefaultSeconds })}
          />
        </Setting>
      </div>
      <Rule strong />

      <SectionRule className="mt-9">Account</SectionRule>
      <div>
        <ActionRow
          icon={<Barbell size={18} />}
          label="Your exercises"
          description={
            customExercises.length
              ? `${customExercises.length} you added yourself`
              : 'Exercises you add appear here'
          }
          onClick={() => setManagingExercises(true)}
        />
        <ActionRow
          icon={<DownloadSimple size={18} />}
          label={exporting ? 'Preparing…' : 'Export data'}
          description="Every program and logged set as JSON"
          onClick={exportData}
          disabled={exporting}
        />
        <ActionRow
          icon={<SignOut size={18} />}
          label="Log out"
          description="Your programs and logged sets stay on the server"
          onClick={() => setConfirmLogout(true)}
          last
        />
      </div>
      <Rule strong />

      <div className="mt-9">
        <div className="mb-3 flex items-center gap-2">
          <Warning size={15} weight="fill" className="text-danger" />
          <span
            className="text-[11px] leading-none font-semibold text-danger uppercase"
            style={{ letterSpacing: '0.12em' }}
          >
            Danger zone
          </span>
        </div>
        <div className="h-px w-full bg-danger-line" aria-hidden />

        <div className="py-4">
          <div className="text-[14px] leading-none font-semibold">Reset all data</div>
          <p className="mt-2 text-[12px] leading-[1.45] font-medium text-ink-muted">
            Deletes every program, session and logged set on this account — progress, records and
            streaks included. Your login and preferences stay. This cannot be undone, so export
            your data first if you want a copy.
          </p>
          <div className="mt-4">
            <DeleteButton
              size="lg"
              buttonText="Reset everything"
              confirmText="Yes, delete it all"
              pendingText="Resetting…"
              onDelete={resetEverything}
            />
          </div>
          {resetError ? (
            <p role="alert" className="mt-3 text-[12px] font-semibold text-danger">
              {resetError}
            </p>
          ) : null}
        </div>
        <div className="h-px w-full bg-danger-line" aria-hidden />
      </div>

      <Sheet
        open={managingExercises}
        onClose={() => setManagingExercises(false)}
        title="Your exercises"
        subtitle={
          customExercises.length
            ? 'Removing one takes it out of search. Plans and logged sets keep it.'
            : undefined
        }
      >
        <div className="pb-4">
          {customExercises.length ? (
            <>
              {customExercises.map((exercise, index) => (
                <div key={exercise.id}>
                  {index ? <Rule /> : null}
                  <div className="flex items-center gap-3 py-3.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">
                        {exercise.name}
                      </span>
                      <Label className="mt-1.5">
                        {exercise.equipment.join(' · ') || 'Bodyweight'}
                      </Label>
                    </span>
                    <CategoryTag category={exercise.category} />
                    <button
                      type="button"
                      aria-label={`Remove ${exercise.name}`}
                      onClick={async () => {
                        await api.del(`/catalog/custom/${exercise.id}`);
                        refreshCustom();
                      }}
                      className="press flex size-10 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-danger-wash hover:text-danger"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </div>
              ))}
              <Rule strong className="mt-1" />
              <p className="mt-3.5 text-[12px] leading-[1.5] font-medium text-ink-muted">
                Removing one only takes it out of search. Sessions already using it keep
                it, and every set you logged against it stays in Progress and PRs — the
                same rule as deleting a program.
              </p>
            </>
          ) : (
            <p className="py-2 text-[14px] leading-[1.5] font-medium text-ink-muted">
              None yet. When the 160-exercise library does not have what your gym does,
              add it from the search step of any session editor and it will live here.
            </p>
          )}
        </div>
      </Sheet>

      <Sheet
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="Log out?"
        subtitle="Your programs and logged sets stay on the server."
      >
        <div className="flex flex-col gap-2.5 pb-4">
          <SheetAction
            tone="danger"
            icon={<SignOut size={20} />}
            label="Log out"
            onClick={() => {
              logout();
              navigate('/welcome', { replace: true });
            }}
          />
          <PillButton variant="surface" onClick={() => setConfirmLogout(false)}>
            Stay signed in
          </PillButton>
        </div>
      </Sheet>
    </Screen>
  );
}

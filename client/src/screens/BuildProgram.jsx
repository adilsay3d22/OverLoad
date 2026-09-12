import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Screen } from '../components/Screen.jsx';
import { BackButton, ErrorNote, Field, PillButton, Stepper } from '../components/ui.jsx';
import { Label, SectionRule, ShapeStrip } from '../components/programs.jsx';
import { api } from '../lib/api.js';
import { useProgram } from '../state/ProgramContext.jsx';

/**
 * Build a custom program.
 *
 * The two steppers were already the right controls; what was missing was any
 * sense of what they were building. The shape you are dialling in is now drawn
 * as you change it — the same weekday strip the template library uses — so
 * "5 training days" is a rhythm you can see rather than a number you have to
 * picture.
 */

/** Spread N training days across the week the way a coach would: never more
 *  than two in a row until there is no other way to fit them. */
function spread(count) {
  const orders = {
    1: [0],
    2: [0, 3],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 3, 4, 5],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return orders[count] || [];
}

export default function BuildProgram() {
  const navigate = useNavigate();
  const { refresh } = useProgram();
  const [name, setName] = useState('');
  const [totalWeeks, setTotalWeeks] = useState(8);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState(null);
  const [busy, setBusy] = useState(false);

  const days = useMemo(() => spread(daysPerWeek), [daysPerWeek]);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setFailure(null);
    try {
      const { program } = await api.post('/programs/custom', { name, totalWeeks, daysPerWeek });
      await refresh();
      navigate(`/programs/${program.id}/weeks`, { replace: true });
    } catch (err) {
      setErrors(err.errors || {});
      if (!err.errors) setFailure(err.message);
      setBusy(false);
    }
  }

  return (
    <Screen contentClassName="flex flex-col">
      <BackButton />

      <h1 className="mt-7 text-[30px] leading-[1.1] font-bold tracking-[-0.03em] text-balance">
        Build your program
      </h1>
      <p className="mt-2.5 text-[15px] leading-[1.5] font-medium text-ink-muted">
        Set the shape now — you fill each week&rsquo;s sessions afterwards, and can clone a week
        once you like it.
      </p>

      <form onSubmit={submit} className="mt-8 flex min-h-0 flex-1 flex-col">
        <Field
          label="Program name"
          placeholder="Winter Strength Block"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          maxLength={48}
        />

        <SectionRule className="mt-8">Shape</SectionRule>

        <div className="mt-4 flex flex-col gap-2.5">
          <Stepper label="Weeks" value={totalWeeks} onChange={setTotalWeeks} min={1} max={16} />
          <Stepper
            label="Training days / week"
            value={daysPerWeek}
            onChange={setDaysPerWeek}
            min={1}
            max={7}
          />
        </div>

        {/* What the numbers actually make. */}
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <Label>Your week</Label>
            <ShapeStrip days={days} size={20} gap={4} showLetters className="mt-2.5" />
          </div>
          <div className="text-right">
            <div className="tabular text-[26px] leading-none font-bold tracking-[-0.03em]">
              {totalWeeks * daysPerWeek}
            </div>
            <Label className="mt-1.5">Sessions total</Label>
          </div>
        </div>

        {failure ? (
          <div className="mt-6">
            <ErrorNote>{failure}</ErrorNote>
          </div>
        ) : null}

        <div className="mt-auto pt-10">
          <PillButton type="submit" disabled={busy}>
            {busy ? 'Creating…' : 'Continue'}
          </PillButton>
        </div>
      </form>
    </Screen>
  );
}

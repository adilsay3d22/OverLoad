import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';
import { BackButton, PillButton, Field, ErrorNote } from '../components/ui.jsx';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);
  const fields = { name: useRef(null), email: useRef(null), password: useRef(null) };

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      await signup(form);
      navigate('/programs', { replace: true });
    } catch (err) {
      const fieldErrors = err.errors || {};
      setErrors(fieldErrors);
      if (!Object.keys(fieldErrors).length) setMessage(err.message);
      // Send the cursor to the first thing that needs fixing.
      const firstBad = ['name', 'email', 'password'].find((key) => fieldErrors[key]);
      if (firstBad) fields[firstBad].current?.focus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-bg px-[22px] pt-[calc(56px+env(safe-area-inset-top))] pb-10">
      <BackButton to="/welcome" />

      <h1 className="mt-7 text-[30px] leading-[1.1] font-bold tracking-[-0.03em]">
        Start your first block
      </h1>
      <p className="mt-2 text-[15px] leading-[1.5] font-medium text-ink-muted">
        Your program, sets and PRs stay tied to this account.
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-1 flex-col">
        <div className="flex flex-col gap-4">
          <Field
            label="Name"
            placeholder="Marisol Trebek"
            autoComplete="name"
            value={form.name}
            onChange={set('name')}
            error={errors.name}
            inputRef={fields.name}
          />
          <Field
            label="Email"
            type="email"
            inputMode="email"
            spellCheck={false}
            placeholder="you@example.com"
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            error={errors.email}
            inputRef={fields.email}
          />
          <Field
            label="Password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            error={errors.password}
            inputRef={fields.password}
            hint="Eight characters or more."
          />
        </div>

        {message ? <div className="mt-5"><ErrorNote>{message}</ErrorNote></div> : null}

        <div className="mt-auto pt-8">
          <PillButton type="submit" disabled={busy}>
            {busy ? 'Creating account…' : 'Create account'}
          </PillButton>
          <p className="mt-[18px] text-center text-[13px] font-medium text-ink-muted">
            Already have an account?{' '}
            <Link to="/login" className="font-bold text-ink underline-offset-2 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext.jsx';
import { BackButton, PillButton, Field, ErrorNote, TextLink } from '../components/ui.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [message, setMessage] = useState(null);
  const [hint, setHint] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await login(form);
      navigate('/home', { replace: true });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-bg px-[22px] pt-[calc(56px+env(safe-area-inset-top))] pb-10">
      <BackButton to="/welcome" />

      <h1 className="mt-7 text-[30px] leading-[1.1] font-bold tracking-[-0.03em]">Welcome back</h1>
      <p className="mt-2 text-[15px] leading-[1.5] font-medium text-ink-muted">
        Pick up where your last session left off.
      </p>

      <form onSubmit={submit} className="mt-8 flex flex-1 flex-col">
        <div className="flex flex-col gap-4">
          <Field
            label="Email"
            type="email"
            inputMode="email"
            spellCheck={false}
            placeholder="you@example.com"
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
          />
          <Field
            label="Password"
            type="password"
            placeholder="Your password"
            autoComplete="current-password"
            value={form.password}
            onChange={set('password')}
          />
        </div>

        <div className="mt-3.5">
          <TextLink
            type="button"
            onClick={() =>
              setHint('Password reset is not wired up yet — create a new account for now.')
            }
          >
            Forgot password?
          </TextLink>
        </div>

        {hint ? (
          <p className="mt-2 text-[12px] font-medium text-ink-muted">{hint}</p>
        ) : null}

        {message ? <div className="mt-5"><ErrorNote>{message}</ErrorNote></div> : null}

        <div className="mt-auto pt-8">
          <PillButton type="submit" disabled={busy}>
            {busy ? 'Logging in…' : 'Log in'}
          </PillButton>
          <p className="mt-[18px] text-center text-[13px] font-medium text-ink-muted">
            New here?{' '}
            <Link to="/signup" className="font-bold text-ink underline-offset-2 hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

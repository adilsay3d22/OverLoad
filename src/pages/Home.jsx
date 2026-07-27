import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import HeroIllustration from '../components/HeroIllustration';
import TopBar from '../components/TopBar';
import Modal from '../components/Modal';

export default function Home() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <LoggedOutHero />;
}

function LoggedOutHero() {
  const { login } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [name, setName] = useState('');

  function submit(e) {
    e.preventDefault();
    login(name);
    setShowLogin(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-bg">
      <div className="flex flex-col items-center text-center gap-1 w-full max-w-[360px]">
        <span className="font-display text-sm font-bold tracking-[3px] uppercase text-text-3">
          Overload
        </span>

        <div className="mt-4">
          <HeroIllustration />
        </div>

        <h1 className="font-display text-[34px] font-black uppercase tracking-[-0.5px] leading-[1.02] mt-4">
          Lift More Than Last Time
        </h1>
        <p className="text-sm text-text-2 leading-relaxed mt-3 max-w-[300px]">
          Build a program, log every set, and watch the numbers climb week over week.
        </p>

        <button
          className="btn btn-primary !rounded-full mt-8"
          onClick={() => setShowLogin(true)}
        >
          Get Started
        </button>
      </div>

      {showLogin && (
        <Modal onClose={() => setShowLogin(false)} labelledBy="login-title">
          <h2 id="login-title" className="font-display text-[26px] font-extrabold tracking-[-0.3px] uppercase mb-1.5">
            Get started
          </h2>
          <p className="text-[13px] text-text-2 mb-4.5 leading-relaxed">
            Enter a name to continue — real accounts come later.
          </p>
          <form onSubmit={submit}>
            <input
              className="w-full h-[50px] rounded-field border-[1.5px] border-border-2 bg-bg-2
                         px-3.5 text-[15px] text-text mb-3.5 focus:border-accent focus:outline-none"
              autoFocus
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="flex gap-2.5">
              <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
                Continue
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [showReset, setShowReset] = useState(false);

  function confirmReset() {
    localStorage.removeItem('overload.activeProgram');
    localStorage.removeItem('overload.log');
    setShowReset(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar />

      <div className="flex-1 flex flex-col justify-center p-6 max-w-[420px] w-full mx-auto">
        <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-text-3">
          Ready when you are
        </p>
        <h1 className="font-display text-[44px] font-black uppercase tracking-[-1px] leading-[0.95] mt-1.5 mb-8">
          Let's train
        </h1>

        <div className="flex flex-col gap-3">
          <button className="btn btn-primary" onClick={() => navigate('/create-program')}>
            Create Program
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/progress')}>
            Progress
          </button>
          <button className="btn btn-ghost-danger" onClick={() => setShowReset(true)}>
            Reset Data
          </button>
        </div>
      </div>

      {showReset && (
        <Modal onClose={() => setShowReset(false)} labelledBy="reset-title">
          <h2 id="reset-title" className="font-display text-[26px] font-extrabold tracking-[-0.3px] uppercase mb-1.5">
            Reset data?
          </h2>
          <p className="text-[13px] text-text-2 mb-4.5 leading-relaxed">
            This clears your active program and logged sessions on this device. It can't be undone.
          </p>
          <div className="flex gap-2.5">
            <button className="btn btn-secondary" onClick={() => setShowReset(false)}>
              Cancel
            </button>
            <button className="btn btn-primary bg-danger active:bg-danger" onClick={confirmReset}>
              Reset
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

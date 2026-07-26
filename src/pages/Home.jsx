import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import OverloadMeter from '../components/OverloadMeter';
import TopBar from '../components/TopBar';
import Modal from '../components/Modal';
import '../components/buttons.css';
import './Home.css';

export default function Home() {
  const { user, login } = useAuth();
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
    <div className="hero">
      <div className="hero-center">
        <OverloadMeter />
        <h1 className="hero-title">Overload</h1>
        <p className="hero-tagline">Progressive overload, tracked.</p>
        <button className="btn btn-primary hero-cta" onClick={() => setShowLogin(true)}>
          Log In
        </button>
      </div>

      {showLogin && (
        <Modal onClose={() => setShowLogin(false)} labelledBy="login-title">
          <h2 id="login-title" className="modal-title">Log in</h2>
          <p className="modal-sub">
            Placeholder login for now — enter a name to continue. Real accounts come later.
          </p>
          <form onSubmit={submit}>
            <input
              className="modal-input"
              autoFocus
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="modal-actions">
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
    <div className="app-shell">
      <TopBar />

      <div className="dash">
        <p className="dash-eyebrow">Ready when you are</p>
        <h1 className="dash-title">Let's train</h1>

        <div className="dash-actions">
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
          <h2 id="reset-title" className="modal-title">Reset data?</h2>
          <p className="modal-sub">
            This clears your active program and logged sessions on this device. It can't be undone.
          </p>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowReset(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" style={{ background: 'var(--danger)' }} onClick={confirmReset}>
              Reset
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

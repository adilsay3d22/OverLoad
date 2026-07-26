import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/TopBar';
import './CreateProgram.css';

const TEMPLATES = [
  {
    id: 'upper-lower',
    name: 'Upper / Lower Split',
    meta: '4 days / week · 8 weeks',
    blurb: 'Alternating upper and lower body days, twice through each per week. A solid default if you\'re not sure where to start.',
  },
];

export default function CreateProgram() {
  const navigate = useNavigate();
  const [confirmed, setConfirmed] = useState(null);

  function selectTemplate(t) {
    localStorage.setItem(
      'overload.activeProgram',
      JSON.stringify({ type: 'template', id: t.id, name: t.name })
    );
    setConfirmed(t.name);
  }

  if (confirmed) {
    return (
      <div className="app-shell">
        <TopBar back="/" />
        <div className="cp-confirm">
          <p className="cp-eyebrow">Program set</p>
          <h1 className="cp-confirm-title">{confirmed}</h1>
          <p className="cp-confirm-sub">
            This is set as your active program. Day-by-day logging, the exercise library,
            and full week/day editing are next — this screen is just the starting point.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar back="/" />
      <div className="cp">
        <p className="cp-eyebrow">Step 1</p>
        <h1 className="cp-title">Create a program</h1>
        <p className="cp-sub">Start from a template, or build your own from scratch.</p>

        <div className="cp-section-label">Templates</div>
        {TEMPLATES.map((t) => (
          <button key={t.id} className="cp-card" onClick={() => selectTemplate(t)}>
            <div className="cp-card-name">{t.name}</div>
            <div className="cp-card-meta">{t.meta}</div>
            <p className="cp-card-blurb">{t.blurb}</p>
          </button>
        ))}

        <div className="cp-section-label">Or</div>
        <button className="cp-card cp-card-custom" disabled>
          <div className="cp-card-name">Build a custom program</div>
          <p className="cp-card-blurb">
            Pick your own exercises from the library and set your own weeks and days.
            Coming up next.
          </p>
        </button>
      </div>
    </div>
  );
}

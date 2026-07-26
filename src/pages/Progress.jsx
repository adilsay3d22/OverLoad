import TopBar from '../components/TopBar';
import './CreateProgram.css';

export default function Progress() {
  return (
    <div className="app-shell">
      <TopBar back="/" />
      <div className="cp">
        <p className="cp-eyebrow">Coming up</p>
        <h1 className="cp-title">Progress</h1>
        <p className="cp-sub">
          PRs, per-exercise charts, the progress bar, and a calendar view land here
          once logging is wired up.
        </p>
      </div>
    </div>
  );
}

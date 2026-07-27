import TopBar from '../components/TopBar';

export default function Progress() {
  return (
    <div className="min-h-screen flex flex-col">
      <TopBar back="/" />
      <div className="flex-1 px-5 pb-8 pt-2 max-w-[480px] w-full mx-auto">
        <p className="font-mono text-[10px] font-semibold tracking-[3px] uppercase text-accent">
          Coming up
        </p>
        <h1 className="font-display text-4xl font-black uppercase tracking-[-0.5px] leading-none mt-1">
          Progress
        </h1>
        <p className="text-text-2 text-sm mt-2 mb-7">
          PRs, per-exercise charts, the progress bar, and a calendar view land here
          once logging is wired up.
        </p>
      </div>
    </div>
  );
}

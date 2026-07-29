const DAYS = [
  { i: 0, short: 'M', label: 'Mon' },
  { i: 1, short: 'T', label: 'Tue' },
  { i: 2, short: 'W', label: 'Wed' },
  { i: 3, short: 'T', label: 'Thu' },
  { i: 4, short: 'F', label: 'Fri' },
  { i: 5, short: 'S', label: 'Sat' },
  { i: 6, short: 'S', label: 'Sun' },
];

export default function DayPicker({ selected, onToggle }) {
  const selectedLabels = DAYS.filter((d) => selected.has(d.i)).map((d) => d.label);

  return (
    <div>
      <div className="flex justify-between gap-1.5">
        {DAYS.map((d) => {
          const isOn = selected.has(d.i);
          return (
            <button
              key={d.i}
              onClick={() => onToggle(d.i)}
              aria-pressed={isOn}
              aria-label={d.label}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-display
                          text-sm font-bold transition-colors shrink-0
                          ${isOn ? 'bg-accent text-white' : 'bg-surface-2 text-text-3'}`}
            >
              {d.short}
            </button>
          );
        })}
      </div>
      <p className="text-center text-xs text-text-2 mt-4">
        {selectedLabels.length > 0
          ? <>Selected Days: <span className="text-text font-medium">{selectedLabels.join(', ')}</span></>
          : 'Tap the days you plan to train'}
      </p>
    </div>
  );
}

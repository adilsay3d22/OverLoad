// Small circular progress indicator. Currently only ever fed 0 (no logging
// system exists yet to compute real completion), but built to actually
// respond to a real percent once that exists — not a static decoration.
export default function RingProgress({ percent = 0, size = 24, stroke = 3, light = false }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(Math.max(percent, 0), 100) / 100);
  const trackColor = light ? 'rgba(255,255,255,0.35)' : 'var(--color-border-2)';
  const fillColor = light ? '#ffffff' : 'var(--color-accent)';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={trackColor} strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={fillColor} strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

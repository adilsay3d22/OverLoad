/** The dumbbell glyph from the wordmark. Sized by `size`, coloured by `currentColor`. */
export function DumbbellGlyph({ size = 20, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect x="0.5" y="7" width="2.5" height="6" rx="1" fill="currentColor" />
      <rect x="4" y="4.5" width="4" height="11" rx="1.5" fill="currentColor" />
      <rect x="8.5" y="8.6" width="3" height="2.8" rx="1.4" fill="currentColor" />
      <rect x="12" y="4.5" width="4" height="11" rx="1.5" fill="currentColor" />
      <rect x="17" y="7" width="2.5" height="6" rx="1" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }) {
  return (
    <div className={`flex items-center gap-[7px] text-ink ${className || ''}`}>
      <DumbbellGlyph />
      <span className="text-[18px] font-semibold tracking-[-0.01em]">Overload</span>
    </div>
  );
}

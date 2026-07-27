// Original illustration, not a reproduction of any reference/template art —
// flat gym-equipment icons (dumbbell, bottle, shoe) over a soft blob,
// drawn in our own coral/black palette.
export default function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 360 300"
      className="w-full max-w-[280px] h-auto"
      role="presentation"
      aria-hidden="true"
    >
      {/* soft blob background */}
      <path
        d="M180,32 C246,32 308,64 314,138 C320,214 258,268 180,268
           C102,268 42,212 46,138 C50,66 114,32 180,32 Z"
        fill="var(--color-accent)"
        opacity="0.1"
      />

      {/* sparkles */}
      <g fill="var(--color-accent)">
        <path d="M64,56 l4,10 10,4 -10,4 -4,10 -4,-10 -10,-4 10,-4 Z" />
        <path d="M300,72 l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3 Z" />
        <path d="M296,196 l3,7 7,3 -7,3 -3,7 -3,-7 -7,-3 7,-3 Z" />
      </g>
      <path d="M92,232 l2.5,6 6,2.5 -6,2.5 -2.5,6 -2.5,-6 -6,-2.5 6,-2.5 Z" fill="var(--color-text)" />

      {/* dumbbell, tilted top-left */}
      <g transform="translate(60,88) rotate(-18)">
        <rect x="0" y="14" width="88" height="10" rx="5" fill="var(--color-text)" />
        <circle cx="10" cy="19" r="22" fill="none" stroke="var(--color-text)" strokeWidth="7" />
        <circle cx="78" cy="19" r="22" fill="none" stroke="var(--color-text)" strokeWidth="7" />
        <circle cx="10" cy="19" r="9" fill="var(--color-accent)" />
        <circle cx="78" cy="19" r="9" fill="var(--color-accent)" />
      </g>

      {/* water bottle, center */}
      <g transform="translate(158,96)">
        <rect x="10" y="0" width="24" height="12" rx="3" fill="var(--color-text)" />
        <rect x="0" y="14" width="44" height="86" rx="14" fill="var(--color-text)" />
        <rect x="0" y="46" width="44" height="16" fill="var(--color-accent)" />
        <rect x="8" y="70" width="28" height="6" rx="3" fill="var(--color-bg)" opacity="0.6" />
      </g>

      {/* shoe, bottom right */}
      <g transform="translate(214,190) rotate(6)">
        <path
          d="M0,40 C0,24 14,14 30,12 L74,6 C86,4 96,10 100,22
             L104,34 C106,40 102,46 96,46 L8,46 C3,46 0,44 0,40 Z"
          fill="var(--color-text)"
        />
        <rect x="4" y="38" width="98" height="10" rx="5" fill="var(--color-accent)" />
        <path
          d="M30,12 L38,26 M46,10 L54,24 M62,8 L70,22"
          stroke="var(--color-bg)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

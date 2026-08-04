// Color mapping for session types (Upper/Lower/Full Body/Core) and the 14
// muscle categories from the exercise library. Each entry gives a border
// color (solid, used for the card's left edge) and a chip color pair
// (light background + readable text) for the small tag badges.

export const SESSION_TYPE_COLORS = {
  Upper: { border: '#FF4E1A', chipBg: 'rgba(255,78,26,0.12)', chipText: '#C23D14' },
  Lower: { border: '#14B8A6', chipBg: 'rgba(20,184,166,0.12)', chipText: '#0F8F81' },
  'Full Body': { border: '#8B5CF6', chipBg: 'rgba(139,92,246,0.12)', chipText: '#6D3FD1' },
  Core: { border: '#F59E0B', chipBg: 'rgba(245,158,11,0.14)', chipText: '#B4750A' },
};

const NEUTRAL = { border: '#D8D8D6', chipBg: 'rgba(153,153,151,0.12)', chipText: '#77766F' };

export function sessionTypeColor(type) {
  return SESSION_TYPE_COLORS[type] || NEUTRAL;
}

// 14 evenly-spaced hues across the muscle categories, fixed saturation/
// lightness so they read as one consistent family rather than random colors.
const MUSCLE_CATEGORIES = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Quads',
  'Hamstrings', 'Glutes', 'Calves', 'Abs', 'Traps', 'Forearms',
  'Adductors', 'Abductors',
];

const CATEGORY_COLORS = Object.fromEntries(
  MUSCLE_CATEGORIES.map((name, i) => {
    const hue = Math.round((360 / MUSCLE_CATEGORIES.length) * i);
    return [
      name,
      {
        border: `hsl(${hue}, 65%, 50%)`,
        chipBg: `hsla(${hue}, 65%, 50%, 0.12)`,
        chipText: `hsl(${hue}, 60%, 36%)`,
      },
    ];
  })
);

export function categoryColor(category) {
  return CATEGORY_COLORS[category] || NEUTRAL;
}

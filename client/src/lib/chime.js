/**
 * The sound a rest timer makes when it ends.
 *
 * The timer used to signal completion with `navigator.vibrate` alone, which
 * does not exist in iOS Safari — so on an iPhone the one moment a rest timer
 * exists for passed in complete silence, with the phone in a pocket.
 *
 * Two short tones through WebAudio rather than an audio file: no asset to load
 * on a gym connection, and no autoplay-policy problem, because this only ever
 * fires after the user started a timer by tapping.
 */

let ctx = null;

const context = () => {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
};

/**
 * Prime the audio context from inside a user gesture. iOS starts every context
 * suspended and will not resume one outside a tap, so this is called when a
 * timer is started — not when it ends.
 */
export function primeChime() {
  const audio = context();
  if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
}

/** Two rising notes, short and quiet enough to sit under gym noise without startling. */
export function playChime() {
  const audio = context();
  if (!audio) return;
  if (audio.state === 'suspended') audio.resume().catch(() => {});

  const now = audio.currentTime;
  [
    { at: 0, freq: 660 },
    { at: 0.16, freq: 880 },
  ].forEach(({ at, freq }) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    // Shaped rather than switched: a raw start/stop on a sine clicks.
    gain.gain.setValueAtTime(0, now + at);
    gain.gain.linearRampToValueAtTime(0.18, now + at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.32);
    osc.connect(gain).connect(audio.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.34);
  });
}

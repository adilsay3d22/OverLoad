// Deep-clone helpers for weeks/sessions. Every cloned exercise and session
// gets a brand-new id and a fresh object — never the same array/object
// reference as the source. This is deliberate: the reference app's PRD
// specifically flagged a "clone-day bug" caused by sharing references
// across weeks, where editing a clone silently mutated the original.

export function cloneExercise(ex) {
  return { ...ex, id: crypto.randomUUID() };
}

export function cloneSessionInto(sourceSession, targetDay) {
  return {
    id: crypto.randomUUID(),
    day: targetDay,
    name: sourceSession.name,
    exercises: sourceSession.exercises.map(cloneExercise),
  };
}

export function cloneWeekSessions(sourceWeek) {
  return sourceWeek.sessions.map((s) => cloneSessionInto(s, s.day));
}

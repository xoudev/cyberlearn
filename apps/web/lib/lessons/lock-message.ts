/**
 * What a learner is told when they try to record progress on a lesson still
 * locked in its path. A quiz answer and a completion refuse it in the same
 * words, wherever they come from (the site or the app).
 */
export function lockedLessonError(pathTitle: string): string {
  return `Cette leçon est verrouillée : termine d'abord la précédente du parcours « ${pathTitle} ».`;
}

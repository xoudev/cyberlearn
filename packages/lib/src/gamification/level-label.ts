/**
 * "Niv. 7": the one way a level is written next to a name, on the site and
 * in the app. It used to be "LVL·7" in a lesson's questions and in the
 * classes, "NIV·7" among the friends and "Niv. 7" on the profile.
 */
export function levelLabel(level: number): string {
  return `Niv. ${String(level)}`;
}

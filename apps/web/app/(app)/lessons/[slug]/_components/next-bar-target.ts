/**
 * What the bar under a lesson says and where its button goes.
 *
 * Three cases. A next lesson in the same path: that lesson. The lesson that
 * closes its path: back to the path. A lesson in no path at all: back to the
 * catalogue. The third case used to borrow the second's words ("Dernière
 * leçon du parcours", "Parcours terminé") and sent its button to `/paths/`,
 * for a lesson that belongs to no path.
 */

export interface NextBarTarget {
  /** The small line above the title. */
  eyebrow: string;
  title: string;
  href: string;
  action: string;
}

export function nextBarTarget(
  next: { slug: string; title: string } | null,
  placement: { path: { slug: string; title: string } } | null,
): NextBarTarget {
  if (next !== null) {
    return {
      eyebrow: "Prochaine leçon",
      title: next.title,
      href: `/lessons/${next.slug}`,
      action: "Leçon suivante",
    };
  }
  if (placement !== null) {
    return {
      eyebrow: "Dernière leçon du parcours",
      title: placement.path.title,
      href: `/paths/${placement.path.slug}`,
      action: "Retour au parcours",
    };
  }
  return {
    eyebrow: "Et ensuite",
    title: "Choisis ta prochaine leçon dans le catalogue",
    href: "/lessons",
    action: "Retour aux leçons",
  };
}

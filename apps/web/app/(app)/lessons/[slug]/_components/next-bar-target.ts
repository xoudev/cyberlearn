/**
 * What the bar under a lesson says and where its button goes.
 *
 * Three cases. A next lesson in the same path: that lesson. The lesson that
 * closes its path: back to the path. A lesson in no path at all: back to the
 * catalogue. The third case used to borrow the second's words ("Dernière
 * leçon du parcours", "Parcours terminé") and sent its button to `/paths/`,
 * for a lesson that belongs to no path.
 *
 * A next lesson still locked (this one is not finished) leads nowhere yet,
 * and says why. Its button used to lead there anyway, and the lesson page
 * sent the reader back to the path map without a word: the button looked
 * broken.
 */

export interface NextBarTarget {
  /** The small line above the title. */
  eyebrow: string;
  title: string;
  /** Null while the next lesson is locked: there is nowhere to go yet. */
  href: string | null;
  action: string;
  /** Why the button leads nowhere yet; null when it leads somewhere. */
  hint: string | null;
}

/**
 * The bar's id: the recap of a finished lesson (lesson-complete-modal.tsx)
 * goes on to it, focus and all. Here rather than in either component, so the
 * server's bar and the client's recap read the same string.
 */
export const LESSON_NEXT_ID = "lesson-next";

/** What the bar says while the next lesson waits for this one. */
export const NEXT_LOCKED_HINT = "Termine cette leçon pour ouvrir la suivante.";

export function nextBarTarget(
  next: { slug: string; title: string } | null,
  placement: { path: { slug: string; title: string } } | null,
  nextLocked = false,
): NextBarTarget {
  if (next !== null) {
    return {
      eyebrow: "Prochaine leçon",
      title: next.title,
      href: nextLocked ? null : `/lessons/${next.slug}`,
      action: "Leçon suivante",
      hint: nextLocked ? NEXT_LOCKED_HINT : null,
    };
  }
  if (placement !== null) {
    return {
      eyebrow: "Dernière leçon du parcours",
      title: placement.path.title,
      href: `/paths/${placement.path.slug}`,
      action: "Retour au parcours",
      hint: null,
    };
  }
  return {
    eyebrow: "Et ensuite",
    title: "Choisis ta prochaine leçon dans le catalogue",
    href: "/lessons",
    action: "Retour aux leçons",
    hint: null,
  };
}

/**
 * What the second-factor screen says to somebody who cannot produce a code.
 *
 * Supabase keeps no backup codes. A phone lost, wiped or replaced leaves the
 * session waiting for a code that cannot come, and the only way back is the
 * team removing the factor from the console, once it has checked that the
 * request is the owner's. That path exists (the console's "Réinitialiser la
 * double authentification"), but the screen that people reach it from used to
 * offer two buttons, "Valider" and "Annuler et se déconnecter", and nothing to
 * say the team can help: somebody without the phone had to guess.
 *
 * The site's challenge and the app's say it with the same words and the same
 * address, kept here so they cannot drift apart.
 */

/** The question the link answers, as the screen asks it. */
export const MFA_RECOURSE_PROMPT = "Tu n’as plus accès à ton application d’authentification ?";

/** What the team does about it, said before the person writes. */
export const MFA_RECOURSE_HINT =
  "Écris-nous : une fois ta demande vérifiée, le support retire ce facteur et tu te reconnectes sans code.";

/** The subject the contact form opens with: the theme alone would leave it empty. */
export const MFA_RECOURSE_SUBJECT = "Je n’ai plus accès à ma double authentification";

/**
 * The site's contact form, on the security theme and with the subject filled
 * in. A path, so the site links to it as it is and the app puts its own origin
 * in front. The form works with a session that has not typed its code yet (the
 * middleware keeps /contact outside the second-factor gate), and signed out.
 */
export const MFA_RECOURSE_PATH = `/contact?${new URLSearchParams({
  theme: "SECURITY",
  subject: MFA_RECOURSE_SUBJECT,
}).toString()}`;

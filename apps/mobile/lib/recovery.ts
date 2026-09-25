/**
 * Choosing a new password in the app, with the code the recovery e-mail
 * carries ("Ou entre ce code dans l'app mobile"). Verifying the code opens a
 * session; the server then accepts a new password without the old one for
 * 15 minutes in that session only (bearerHasRecoveryGrant), as the site does
 * after its link.
 *
 * Between the code and the new password, the app's gates would send a fresh
 * session home, or to onboarding. This flag, set just before the code is
 * verified, sends it to /reset-password instead, after the MFA step when the
 * account has one.
 */

let pending = false;

export function markRecoveryPending(): void {
  pending = true;
}

export function clearRecoveryPending(): void {
  pending = false;
}

export function isRecoveryPending(): boolean {
  return pending;
}

/** Where a session goes once it is fully signed in: the reset screen during a recovery. */
export function signedInRoute(): "/reset-password" | "/home" {
  return pending ? "/reset-password" : "/home";
}

/** The code as typed: digits only, at most ten (Supabase codes are six to ten long). */
export function recoveryCodeInput(text: string): string {
  return text.replace(/\D/g, "").slice(0, 10);
}

export function isRecoveryCode(code: string): boolean {
  return /^\d{6,10}$/.test(code);
}

export const RECOVERY_COPY = {
  requestDescription:
    "Tu recevras un e-mail avec un code à entrer ici, et un lien à ouvrir sur cyberlearn.fr si tu préfères.",
  sent: "Si un compte correspond à cette adresse, un e-mail vient d’être envoyé avec un code et un lien.",
  codeLabel: "Code reçu par e-mail",
  verify: "Valider le code",
  badCode: "Code incorrect ou expiré. Vérifie le dernier e-mail reçu, ou demande un nouveau code.",
  resetTitle: "Nouveau mot de passe.",
  resetDescription:
    "Choisis le mot de passe que tu utiliseras désormais, sur le site comme dans l’app.",
  rules:
    "Utilise au moins 12 caractères avec une lettre et un chiffre, puis confirme le mot de passe.",
  expired: "Le délai de 15 minutes est passé. Redemande un code depuis « Mot de passe oublié ».",
  saved: "Mot de passe enregistré.",
} as const;

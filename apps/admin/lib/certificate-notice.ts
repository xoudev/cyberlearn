import type { CertificateNotice } from "@cyberlearn/db";

/**
 * What the holder of a certificate reads when the console revokes it or puts
 * it back, in the bell on the site and in the app's inbox.
 *
 * Both lead to the page that lists their certificates: on the site it shows a
 * revoked one with its reason, and the app opens its Certificats tab for the
 * same address (apps/mobile/lib/notification-links.ts). The title names the
 * path: a learner with three certificates has to know which one it is about
 * without opening anything.
 */

/** Where both notices lead, on the site and in the app. */
export const CERTIFICATES_PAGE = "/certificates";

/** The notification columns' widths (schema.prisma, model Notification). */
const TITLE_MAX = 200;
const BODY_MAX = 1000;

/** Cut to fit a column, with an ellipsis rather than a word broken in silence. */
export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

export function revokedNotice(pathTitle: string, reason: string): CertificateNotice {
  return {
    title: clip(`Certificat révoqué : ${pathTitle}`, TITLE_MAX),
    body: clip(
      `Ton certificat du parcours « ${pathTitle} » n'est plus valide. Motif : ${reason}`,
      BODY_MAX,
    ),
    actionUrl: CERTIFICATES_PAGE,
  };
}

export function reinstatedNotice(pathTitle: string): CertificateNotice {
  return {
    title: clip(`Certificat rétabli : ${pathTitle}`, TITLE_MAX),
    body: clip(
      `Ton certificat du parcours « ${pathTitle} » est de nouveau valide, sous le même numéro.`,
      BODY_MAX,
    ),
    actionUrl: CERTIFICATES_PAGE,
  };
}

/** What the console asks before revoking: which certificate, whose, and what follows. */
export function revocationQuestion(code: string, holder: string, pathTitle: string): string {
  return (
    `Révoquer le certificat ${code} de ${holder} (« ${pathTitle} ») ? ` +
    "La page de vérification le dira à tous, avec le motif, et le PDF ne sera plus téléchargeable. " +
    "Le titulaire est prévenu."
  );
}

/** What the console asks before putting a revoked certificate back. */
export function reinstatementQuestion(code: string, holder: string, pathTitle: string): string {
  return (
    `Rétablir le certificat ${code} de ${holder} (« ${pathTitle} ») ? ` +
    "Il redevient valide sous le même numéro, avec le même PDF. Le titulaire est prévenu."
  );
}

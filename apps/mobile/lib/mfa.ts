import {
  readTotpFactors,
  type ListFactorsAnswer,
  type TotpFactorsState,
} from "@cyberlearn/lib/auth/mfa-factors";
import { MFA_RECOURSE_PATH } from "@cyberlearn/lib/auth/mfa-recourse";

const SVG_DATA_URI_PREFIX = "data:image/svg+xml";

/** Converts Supabase's TOTP QR data URI back to XML for react-native-svg. */
export function readTotpQrSvg(qrCode: string): string | null {
  if (qrCode.trimStart().startsWith("<svg")) return qrCode;
  if (!qrCode.startsWith(SVG_DATA_URI_PREFIX)) return null;

  const separatorIndex = qrCode.indexOf(",");
  if (separatorIndex === -1) return null;

  const payload = qrCode.slice(separatorIndex + 1);
  let xml = payload;
  try {
    xml = decodeURIComponent(payload);
  } catch {
    // Supabase currently returns raw XML after the data URI prefix.
  }

  return xml.trimStart().startsWith("<svg") ? xml : null;
}

/** What the security screen knows of the second factor. */
export interface TotpPanelState {
  factors: TotpFactorsState;
  /**
   * Whether "Désactiver le MFA" is offered: never to an administrator, whose
   * factor only the break-glass procedure of docs/authentication.md removes.
   */
  canDisable: boolean;
}

/**
 * Reads the factors and, when there is one to remove, whether this account
 * may remove it (the server's answer: the app cannot read the role).
 *
 * The second question only matters with a factor, so an account without one
 * can enrol even when the site does not answer. When it does not answer for a
 * protected account, the screen says "unknown" with "Réessayer", as for a
 * failed read of the factors: the removal is never offered on a guess.
 */
export async function loadTotpPanel(deps: {
  listFactors: () => Promise<ListFactorsAnswer>;
  fetchCanDisable: () => Promise<boolean>;
}): Promise<TotpPanelState> {
  let factors: TotpFactorsState;
  try {
    factors = readTotpFactors(await deps.listFactors());
  } catch {
    return { factors: { status: "error" }, canDisable: false };
  }
  if (factors.status !== "ready" || factors.factors.length === 0) {
    return { factors, canDisable: false };
  }
  try {
    return { factors, canDisable: await deps.fetchCanDisable() };
  } catch {
    return { factors: { status: "error" }, canDisable: false };
  }
}

/** What /api/mobile/mfa-removal answered: the flag, or null for anything else. */
export function readMfaRemovalAnswer(body: unknown): boolean | null {
  if (typeof body !== "object" || body === null) return null;
  if (!("ok" in body) || body.ok !== true) return null;
  if (!("canDisable" in body) || typeof body.canDisable !== "boolean") return null;
  return body.canDisable;
}

/**
 * The site's contact form for somebody without the phone that makes their
 * codes, opened in the browser from the code screen: the same address as the
 * site's own link (@cyberlearn/lib/auth/mfa-recourse), behind the site's origin.
 * The form is open to a visitor, which is what the browser is.
 */
export function mfaRecourseUrl(siteUrl: string): string {
  return `${siteUrl.replace(/\/+$/u, "")}${MFA_RECOURSE_PATH}`;
}

/** The part of `supabase.auth` that the code screen signs out with. */
export interface SignOutClient {
  signOut: () => Promise<{ error: unknown }>;
}

export const SIGN_OUT_FAILED = "Déconnexion impossible. Vérifie ta connexion, puis réessaie.";

/**
 * Signs out from the code screen ("Utiliser un autre compte"): null once the
 * session is gone, or the line to show when it is not.
 *
 * supabase-js removes the stored session only when the sign-out request
 * succeeds, or fails with 401, 403 or 404, whatever the scope. A network
 * error or a 5xx answer leaves the session in place, and the gate keeps a
 * session that owes its code on this screen. A second, "local" sign-out
 * failed the same way, so the tap did nothing and said nothing.
 */
export async function leaveMfaChallenge(client: SignOutClient): Promise<string | null> {
  try {
    const { error } = await client.signOut();
    if (!error) return null;
  } catch {
    // A sign-out that throws has failed like one that answers an error.
  }
  return SIGN_OUT_FAILED;
}

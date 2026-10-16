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

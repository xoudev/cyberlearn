import { z } from "zod";

const jwtPayloadSchema = z.object({
  aal: z.enum(["aal1", "aal2"]).optional(),
});

const amrSchema = z.object({
  amr: z.array(z.object({ method: z.string(), timestamp: z.number() }).passthrough()).optional(),
});

function readPayload(token: string): unknown {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export interface AuthFactorSummary {
  status: string;
}

export function readAuthenticatorAssuranceLevel(token: string): "aal1" | "aal2" | null {
  const result = jwtPayloadSchema.safeParse(readPayload(token));
  return result.success ? (result.data.aal ?? null) : null;
}

/**
 * Whether the session was opened by a password-recovery code, recently: the
 * app's equivalent of the cookie /auth/confirm drops on the site. Supabase
 * records how a session was authenticated in the token's `amr` claim; a
 * session opened with the emailed recovery code carries `recovery`, with the
 * time it happened. Past `maxAgeSeconds` it no longer counts, as the site's
 * cookie expires.
 *
 * Only meaningful on a token already verified (userFromBearer): this reads
 * claims, it does not check signatures.
 */
export function hasRecentRecovery(
  token: string,
  nowSeconds: number,
  maxAgeSeconds: number,
): boolean {
  const result = amrSchema.safeParse(readPayload(token));
  if (!result.success) return false;
  return (result.data.amr ?? []).some(
    (entry) =>
      entry.method === "recovery" &&
      entry.timestamp <= nowSeconds &&
      nowSeconds - entry.timestamp <= maxAgeSeconds,
  );
}

export function sessionMeetsMfaRequirement(
  token: string,
  factors: readonly AuthFactorSummary[] | undefined,
): boolean {
  const hasVerifiedFactor = factors?.some((factor) => factor.status === "verified") ?? false;
  return !hasVerifiedFactor || readAuthenticatorAssuranceLevel(token) === "aal2";
}

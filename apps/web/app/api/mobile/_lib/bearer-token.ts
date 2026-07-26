import { z } from "zod";

const jwtPayloadSchema = z.object({
  aal: z.enum(["aal1", "aal2"]).optional(),
});

export interface AuthFactorSummary {
  status: string;
}

export function readAuthenticatorAssuranceLevel(token: string): "aal1" | "aal2" | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const result = jwtPayloadSchema.safeParse(parsed);
    return result.success ? (result.data.aal ?? null) : null;
  } catch {
    return null;
  }
}

export function sessionMeetsMfaRequirement(
  token: string,
  factors: readonly AuthFactorSummary[] | undefined,
): boolean {
  const hasVerifiedFactor = factors?.some((factor) => factor.status === "verified") ?? false;
  return !hasVerifiedFactor || readAuthenticatorAssuranceLevel(token) === "aal2";
}

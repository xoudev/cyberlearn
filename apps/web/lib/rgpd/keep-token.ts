import crypto from "node:crypto";
import { z } from "zod";

/**
 * The "keep my account" link of an inactivity notice: 32 random bytes in
 * base64url, sent once in the e-mail and stored only as its SHA-256.
 */
export const keepTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/u);

export function newKeepToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashKeepToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

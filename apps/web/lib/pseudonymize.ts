import crypto from "node:crypto";

export function getSalt(): string {
  const salt = process.env.IP_SALT;
  if (!salt || salt.length < 32) {
    throw new Error(
      "[pseudonymize] IP_SALT must be set (>= 32 chars). Generate with: openssl rand -hex 32",
    );
  }
  return salt;
}

export function pseudonymize(value: string): string {
  return crypto.createHmac("sha256", getSalt()).update(value).digest("hex");
}

const INVALID_REFRESH_CODES = new Set([
  "refresh_token_not_found",
  "refresh_token_already_used",
  "refresh_token_reuse_detected",
]);

function readStringProperty(value: unknown, property: string): string | null {
  if (typeof value !== "object" || value === null || !(property in value)) return null;
  const propertyValue = Reflect.get(value, property);
  return typeof propertyValue === "string" ? propertyValue : null;
}

/** Identifies revoked or missing refresh credentials without treating outages as sign-outs. */
export function isInvalidRefreshTokenError(error: unknown): boolean {
  const code = readStringProperty(error, "code")?.toLowerCase();
  if (code && INVALID_REFRESH_CODES.has(code)) return true;

  const message = readStringProperty(error, "message")?.toLowerCase();
  return Boolean(
    message &&
      (message.includes("invalid refresh token") ||
        message.includes("refresh token not found") ||
        message.includes("refresh token has already been used")),
  );
}

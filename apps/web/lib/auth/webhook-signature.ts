/**
 * Checks a Standard Webhooks signature (what Supabase's auth hooks send).
 *
 * The comparison is crypto.subtle.verify's, not a string `===`: verify runs in
 * constant time, where comparing two strings stops at the first byte that
 * differs and so tells a patient caller how much of a forged signature is
 * already right.
 */
export async function verifyWebhookSignature({
  rawBody,
  webhookId,
  webhookTimestamp,
  webhookSignature,
  secret,
  nowSeconds = Date.now() / 1000,
}: {
  rawBody: string;
  webhookId: string;
  webhookTimestamp: string;
  webhookSignature: string;
  secret: string;
  nowSeconds?: number;
}): Promise<boolean> {
  // Reject stale webhooks (>5 minutes old)
  const ts = parseInt(webhookTimestamp, 10);
  if (Number.isNaN(ts) || Math.abs(nowSeconds - ts) > 300) {
    return false;
  }

  // Secret may be stored as "v1,whsec_<base64>", "whsec_<base64>", or plain base64
  const secretBase64 = secret.replace(/^v1,whsec_/, "").replace(/^whsec_/, "");
  const keyBytes = decodeBase64(secretBase64);
  if (!keyBytes) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signedContent = new TextEncoder().encode(`${webhookId}.${webhookTimestamp}.${rawBody}`);

  // webhook-signature may contain multiple space-separated "v1,<sig>" values
  for (const candidate of webhookSignature.split(" ")) {
    const [version, sig] = candidate.split(",");
    if (version !== "v1" || !sig) continue;
    const sigBytes = decodeBase64(sig);
    if (!sigBytes) continue;
    if (await crypto.subtle.verify("HMAC", key, sigBytes, signedContent)) return true;
  }
  return false;
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

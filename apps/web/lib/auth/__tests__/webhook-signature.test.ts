import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "../webhook-signature";

const KEY = Buffer.from("a-test-secret-for-the-auth-hook!!");
const SECRET = `v1,whsec_${KEY.toString("base64")}`;
const NOW = 1_790_000_000;
const ID = "msg_2Kq";
const BODY = JSON.stringify({ user: { email: "a@example.com" } });

function sign(body: string, timestamp: number, key: Buffer = KEY): string {
  return createHmac("sha256", key)
    .update(`${ID}.${String(timestamp)}.${body}`)
    .digest("base64");
}

function check(signature: string, timestamp = NOW, body = BODY): Promise<boolean> {
  return verifyWebhookSignature({
    rawBody: body,
    webhookId: ID,
    webhookTimestamp: String(timestamp),
    webhookSignature: signature,
    secret: SECRET,
    nowSeconds: NOW,
  });
}

describe("verifyWebhookSignature", () => {
  it("accepts what Supabase signs", async () => {
    expect(await check(`v1,${sign(BODY, NOW)}`)).toBe(true);
  });

  it("finds the right signature among several", async () => {
    const other = sign(BODY, NOW, Buffer.from("an-older-rotated-secret"));
    expect(await check(`v1,${other} v1,${sign(BODY, NOW)}`)).toBe(true);
  });

  it("refuses a body that was changed after signing", async () => {
    expect(await check(`v1,${sign(BODY, NOW)}`, NOW, BODY.replace("a@", "b@"))).toBe(false);
  });

  it("refuses a signature made with another secret", async () => {
    expect(await check(`v1,${sign(BODY, NOW, Buffer.from("not-the-secret"))}`)).toBe(false);
  });

  it("refuses a stale timestamp, even correctly signed", async () => {
    const old = NOW - 301;
    expect(await check(`v1,${sign(BODY, old)}`, old)).toBe(false);
  });

  it("refuses malformed or unversioned signatures without throwing", async () => {
    expect(await check("")).toBe(false);
    expect(await check("v1,***not-base64***")).toBe(false);
    expect(await check(sign(BODY, NOW))).toBe(false);
    expect(await check(`v2,${sign(BODY, NOW)}`)).toBe(false);
  });
});

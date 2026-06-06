// Synthetic tests for the Standard Webhooks verification used by the
// custom-access-token hook. Signs payloads with the SAME library GoTrue uses,
// so "valid signature accepted" proves we won't reject genuine GoTrue calls.
//
// Run: deno test --allow-net supabase/functions/custom-access-token/verify.test.ts

import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { evaluateSignature, SignatureError, verifyHookSignature } from "./verify.ts";

// Bare base64 secret (what standardwebhooks/GoTrue use)...
const SECRET_B64 = "dGVzdHNlY3JldGtleWZvcnVuaXR0ZXN0aW5nMTIzNDU2";
// ...and the "v1,whsec_<base64>" form Supabase/config.toml store. Our verifier
// must strip the prefix and still match a signature made with the bare secret.
const FULL_SECRET = `v1,whsec_${SECRET_B64}`;

const BODY = JSON.stringify({ user_id: "11111111-1111-1111-1111-111111111111", claims: {} });

/** Produce real Standard Webhooks headers, optionally with an aged timestamp. */
function sign(body: string, opts: { id?: string; ageSeconds?: number } = {}) {
  const id = opts.id ?? "msg_2v8aBcD";
  const date = new Date(Date.now() - (opts.ageSeconds ?? 0) * 1000);
  const wh = new Webhook(SECRET_B64);
  const signature = wh.sign(id, date, body); // -> "v1,<base64sig>"
  return { id, timestamp: String(Math.floor(date.getTime() / 1000)), signature };
}

Deno.test("valid signature is accepted (and v1,whsec_ prefix is stripped)", () => {
  verifyHookSignature(FULL_SECRET, BODY, sign(BODY)); // must NOT throw
});

Deno.test("invalid signature -> 401 (SignatureError)", () => {
  const h = sign(BODY);
  h.signature = "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  assertThrows(() => verifyHookSignature(FULL_SECRET, BODY, h), SignatureError);
});

Deno.test("absent signature headers -> 401 (SignatureError)", () => {
  assertThrows(
    () => verifyHookSignature(FULL_SECRET, BODY, { id: "", timestamp: "", signature: "" }),
    SignatureError,
  );
});

Deno.test("expired timestamp -> 401 (replay defense via webhook-timestamp)", () => {
  // 1h old, well beyond the standardwebhooks 5-minute tolerance.
  const h = sign(BODY, { ageSeconds: 3600 });
  assertThrows(() => verifyHookSignature(FULL_SECRET, BODY, h), SignatureError);
});

Deno.test("tampered body -> 401 (signature no longer matches)", () => {
  const h = sign(BODY);
  const tampered = JSON.stringify({
    user_id: "x",
    claims: { app_metadata: { user_role: "ADMIN" } },
  });
  assertThrows(() => verifyHookSignature(FULL_SECRET, tampered, h), SignatureError);
});

// ── evaluateSignature (non-throwing wrapper used by both modes) ───────────────

Deno.test("evaluateSignature: valid -> { ok: true }", () => {
  assertEquals(evaluateSignature(FULL_SECRET, BODY, sign(BODY)), { ok: true });
});

Deno.test("evaluateSignature: invalid -> reason 'signature'", () => {
  const h = sign(BODY);
  h.signature = "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  const out = evaluateSignature(FULL_SECRET, BODY, h);
  assertEquals(out.ok, false);
  if (!out.ok) assertEquals(out.reason, "signature");
});

Deno.test("evaluateSignature: missing secret -> reason 'missing-secret'", () => {
  const out = evaluateSignature("", BODY, sign(BODY));
  assertEquals(out.ok, false);
  if (!out.ok) assertEquals(out.reason, "missing-secret");
});

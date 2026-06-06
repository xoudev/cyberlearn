// Tests both rollout modes of the auth hook handler:
//   monitor (HOOK_VERIFY_ENFORCE=false) -> never 401/500, always returns claims
//   enforce (HOOK_VERIFY_ENFORCE=true)  -> 401 invalid/expired, 500 missing secret
// Deps (env + role lookup) are injected, so no network and no real DB.
//
// Run: deno test --allow-net supabase/functions/custom-access-token/

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { type HookDeps, handleHookRequest } from "./handler.ts";

const SECRET_B64 = "dGVzdHNlY3JldGtleWZvcnVuaXR0ZXN0aW5nMTIzNDU2";
const FULL_SECRET = `v1,whsec_${SECRET_B64}`;
const BODY = JSON.stringify({ user_id: "11111111-1111-1111-1111-111111111111", claims: {} });

function headers(body: string, opts: { valid?: boolean; ageSeconds?: number } = {}): Headers {
  const id = "msg_test";
  const date = new Date(Date.now() - (opts.ageSeconds ?? 0) * 1000);
  let signature = new Webhook(SECRET_B64).sign(id, date, body);
  if (opts.valid === false) signature = "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
  return new Headers({
    "webhook-id": id,
    "webhook-timestamp": String(Math.floor(date.getTime() / 1000)),
    "webhook-signature": signature,
  });
}

function request(body: string, h: Headers): Request {
  return new Request("http://localhost/custom-access-token", { method: "POST", body, headers: h });
}

function deps(env: Record<string, string | undefined>, role: string | null = "STUDENT"): HookDeps {
  return { getEnv: (k) => env[k], lookupRole: () => Promise.resolve(role) };
}

async function userRole(res: Response): Promise<unknown> {
  const json = (await res.json()) as { claims?: { app_metadata?: Record<string, unknown> } };
  return json.claims?.app_metadata?.user_role;
}

// ── MONITOR (default): zero issuance impact, whatever the signature ──────────

Deno.test("monitor: invalid signature -> 200, warns, claims still enriched", async () => {
  const warnings: string[] = [];
  const orig = console.warn;
  console.warn = (...a: unknown[]) => warnings.push(a.join(" "));
  try {
    const res = await handleHookRequest(
      request(BODY, headers(BODY, { valid: false })),
      deps({ HOOK_VERIFY_ENFORCE: "false", CUSTOM_ACCESS_TOKEN_SECRET: FULL_SECRET }),
    );
    assertEquals(res.status, 200);
    assertEquals(await userRole(res), "STUDENT");
  } finally {
    console.warn = orig;
  }
  assert(
    warnings.some((w) => w.includes("monitor")),
    "expected a monitor-mode warning log",
  );
});

Deno.test("monitor: missing secret -> 200 (never 500)", async () => {
  const res = await handleHookRequest(
    request(BODY, headers(BODY)),
    deps({ HOOK_VERIFY_ENFORCE: "false", CUSTOM_ACCESS_TOKEN_SECRET: "" }),
  );
  assertEquals(res.status, 200);
  assertEquals(await userRole(res), "STUDENT");
});

Deno.test("monitor is the default when HOOK_VERIFY_ENFORCE is unset", async () => {
  const res = await handleHookRequest(
    request(BODY, headers(BODY, { valid: false })),
    deps({ CUSTOM_ACCESS_TOKEN_SECRET: FULL_SECRET }),
  );
  assertEquals(res.status, 200);
});

// ── ENFORCE: blocks bad calls before the role lookup ────────────────────────

Deno.test("enforce: valid signature -> 200, claims enriched", async () => {
  const res = await handleHookRequest(
    request(BODY, headers(BODY)),
    deps({ HOOK_VERIFY_ENFORCE: "true", CUSTOM_ACCESS_TOKEN_SECRET: FULL_SECRET }),
  );
  assertEquals(res.status, 200);
  assertEquals(await userRole(res), "STUDENT");
});

Deno.test("enforce: invalid signature -> 401", async () => {
  const res = await handleHookRequest(
    request(BODY, headers(BODY, { valid: false })),
    deps({ HOOK_VERIFY_ENFORCE: "true", CUSTOM_ACCESS_TOKEN_SECRET: FULL_SECRET }),
  );
  assertEquals(res.status, 401);
});

Deno.test("enforce: expired timestamp -> 401", async () => {
  const res = await handleHookRequest(
    request(BODY, headers(BODY, { ageSeconds: 3600 })),
    deps({ HOOK_VERIFY_ENFORCE: "true", CUSTOM_ACCESS_TOKEN_SECRET: FULL_SECRET }),
  );
  assertEquals(res.status, 401);
});

Deno.test("enforce: missing secret -> 500 (fail closed)", async () => {
  const res = await handleHookRequest(
    request(BODY, headers(BODY)),
    deps({ HOOK_VERIFY_ENFORCE: "true", CUSTOM_ACCESS_TOKEN_SECRET: "" }),
  );
  assertEquals(res.status, 500);
});

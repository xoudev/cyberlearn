// Request handler for the custom-access-token auth hook. Kept separate from
// index.ts (which calls Deno.serve) so it can be unit-tested without binding a
// port. Dependencies (env reader + role lookup) are injectable for tests.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evaluateSignature } from "./verify.ts";

interface WebhookPayload {
  user_id: string;
  claims: Record<string, unknown>;
}

export interface HookDeps {
  /** Reads an environment variable (injected so tests don't mutate Deno.env). */
  getEnv: (key: string) => string | undefined;
  /** Returns the user's role from the DB, or null if unknown. */
  lookupRole: (userId: string) => Promise<string | null>;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

export const defaultDeps: HookDeps = {
  getEnv: (key) => Deno.env.get(key),
  lookupRole: async (userId) => {
    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single<{ role: string }>();
    return error || !data ? null : data.role;
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Authenticate the GoTrue call (Standard Webhooks signature) and enrich the
 * access-token claims with the DB-derived `user_role`.
 *
 * HOOK_VERIFY_ENFORCE (default "false"):
 *   - "false" (MONITOR): verify if a secret is present, LOG the outcome, but
 *     ALWAYS return claims — never 401/500. Zero impact on token issuance,
 *     whatever the signature result. Use this to validate the secret against
 *     real GoTrue traffic before enforcing.
 *   - "true"  (ENFORCE): 401 on missing/invalid/expired signature (before the
 *     role lookup), 500 (fail closed) if the secret is unconfigured.
 *
 * Role derivation (DB lookup on user_id) is identical in both modes.
 */
export async function handleHookRequest(
  req: Request,
  deps: HookDeps = defaultDeps,
): Promise<Response> {
  let claims: Record<string, unknown> = {};

  try {
    const body = await req.text();

    const enforce = (deps.getEnv("HOOK_VERIFY_ENFORCE") ?? "false").toLowerCase() === "true";
    const secret = deps.getEnv("CUSTOM_ACCESS_TOKEN_SECRET") ?? "";

    const outcome = evaluateSignature(secret, body, {
      id: req.headers.get("webhook-id") ?? "",
      timestamp: req.headers.get("webhook-timestamp") ?? "",
      signature: req.headers.get("webhook-signature") ?? "",
    });

    // Always log the verification result (this is the whole point in monitor mode).
    if (outcome.ok) {
      console.log(`[custom-access-token] signature OK (enforce=${enforce})`);
    } else {
      const action = enforce ? "REJECTED" : "monitor: allowed";
      console.warn(
        `[custom-access-token] signature ${outcome.reason} [${outcome.detail}] (enforce=${enforce}, ${action})`,
      );
    }

    // Only enforce mode acts on a bad outcome; monitor mode falls through.
    if (enforce) {
      if (outcome.reason === "missing-secret")
        return jsonResponse({ error: "hook not configured" }, 500);
      if (!outcome.ok) return jsonResponse({ error: "invalid signature" }, 401);
    }

    // ── Enrich claims with the DB-derived role (unchanged) ───────────────────
    const payload = JSON.parse(body) as WebhookPayload;
    claims = payload.claims ?? {};

    const userId = payload.user_id;
    if (!userId) return jsonResponse({ claims });

    const role = await deps.lookupRole(userId);
    if (!role) return jsonResponse({ claims });

    return jsonResponse({
      claims: {
        ...claims,
        app_metadata: {
          ...(claims["app_metadata"] as Record<string, unknown> | undefined),
          user_role: role,
        },
      },
    });
  } catch (err) {
    console.error("[custom-access-token] unhandled error:", err);
    return jsonResponse({ claims });
  }
}

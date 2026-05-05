/**
 * Supabase Auth Hook — Custom Access Token
 *
 * Injects the user's role from public.users into the JWT access token
 * as `user_role`. This enables role-based access control in:
 * - RLS policies (via current_user_role() SQL function)
 * - Server-side middleware and guards (via user.app_metadata.user_role)
 *
 * Setup:
 * 1. Deploy this function: `supabase functions deploy custom-access-token`
 * 2. In Supabase dashboard → Authentication → Hooks:
 *    Enable "Customize Access Token (JWT)" → HTTPS → point to this function.
 * 3. Copy the signing secret Supabase shows and set it as:
 *    Edge Functions → custom-access-token → Secrets → CUSTOM_ACCESS_TOKEN_SECRET
 *
 * Docs: https://supabase.com/docs/guides/auth/auth-hooks#custom-access-token-hook
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WebhookPayload {
  user_id: string;
  claims: Record<string, unknown>;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

Deno.serve(async (req: Request) => {
  let claims: Record<string, unknown> = {};

  try {
    const body = await req.text();
    console.log("[custom-access-token] raw payload:", body.slice(0, 500));

    const payload = JSON.parse(body) as WebhookPayload;
    claims = payload.claims ?? {};

    const userId = payload.user_id;
    if (!userId) {
      console.error("[custom-access-token] missing user_id in payload");
      return new Response(JSON.stringify({ claims }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch the user's role from public.users
    const { data: user, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", userId)
      .single<{ role: string }>();

    if (error || !user) {
      // User row may not exist yet (first login before /auth/callback creates it)
      console.log(
        "[custom-access-token] user not found, returning original claims:",
        error?.message,
      );
      return new Response(JSON.stringify({ claims }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const enrichedClaims = {
      ...claims,
      app_metadata: {
        ...(claims["app_metadata"] as Record<string, unknown> | undefined),
        user_role: user.role,
      },
    };

    return new Response(JSON.stringify({ claims: enrichedClaims }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[custom-access-token] unhandled error:", err);
    // Always return claims — even empty — so GoTrue doesn't reject with "output claims field is missing"
    return new Response(JSON.stringify({ claims }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});

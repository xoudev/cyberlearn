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
 *    Enable "Customize Access Token (JWT)" and point it to this function.
 * 3. Set the hook secret as an environment variable: CUSTOM_ACCESS_TOKEN_SECRET
 *
 * Docs: https://supabase.com/docs/guides/auth/auth-hooks#custom-access-token-hook
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WebhookPayload {
  event: string;
  user_id: string;
  claims: Record<string, unknown>;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  // Use service role key to bypass RLS when reading user roles
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { persistSession: false } },
);

Deno.serve(async (req: Request) => {
  // Verify the request is from Supabase (hook secret validation)
  const hookSecret = Deno.env.get("CUSTOM_ACCESS_TOKEN_SECRET");
  if (hookSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${hookSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const payload = (await req.json()) as WebhookPayload;
  const { user_id: userId, claims } = payload;

  // Fetch the user's role from public.users
  const { data: user, error } = await supabase
    .from("users")
    .select("role")
    .eq("id", userId)
    .single<{ role: string }>();

  if (error || !user) {
    // User row may not exist yet (first-time OAuth before callback creates it)
    // Return the original claims unmodified — the row will be created in /auth/callback
    return new Response(JSON.stringify({ claims }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  // Inject the role into app_metadata so it's available in the JWT
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
});

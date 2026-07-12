// Thin client for the web app's mobile API routes (apps/web/app/api/mobile/*).
// Overridable via EXPO_PUBLIC_SITE_URL for local dev against localhost:3000.
// NB: use the www host - the apex 307-redirects and some fetch stacks drop the
// POST body when following it.
const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || "https://www.cyberlearn.fr";

interface SendOtpResponse {
  ok: boolean;
  error?: string;
}

/**
 * Ask the server to email a 6-digit login code. Goes through the web app (not
 * supabase.auth.signInWithOtp) because Supabase's built-in email only carries a
 * magic link; the server flow sends our Resend template which includes the code.
 */
export async function requestLoginCode(email: string): Promise<SendOtpResponse> {
  try {
    const res = await fetch(`${SITE_URL}/api/mobile/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = (await res.json()) as SendOtpResponse;
    return { ok: body.ok === true, ...(body.error ? { error: body.error } : {}) };
  } catch {
    return { ok: false, error: "Connexion au serveur impossible." };
  }
}

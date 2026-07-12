import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
import { sendMagicLinkEmail } from "@cyberlearn/email";
import { env } from "@/lib/env";
import { checkMagicLinkPerEmail, checkMagicLinkPerIp } from "@/lib/rate-limit";

// Mobile login email. The Supabase "signInWithOtp" default email only carries a
// magic link (rendered by Supabase's built-in SMTP), which a native app cannot
// use. This endpoint mirrors the web login action: admin.generateLink() gives us
// BOTH the action link and the 6-digit OTP, and we send our own Resend template
// that shows the code. The mobile app then calls supabase.auth.verifyOtp().

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Adresse email invalide." }, { status: 400 });
  }
  const { email } = parsed.data;

  const rawIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const [emailLimit, ipLimit] = await Promise.all([
    checkMagicLinkPerEmail(email),
    checkMagicLinkPerIp(rawIp),
  ]);
  if (!emailLimit.success || !ipLimit.success) {
    const retry = Math.max(emailLimit.retryAfterSeconds, ipLimit.retryAfterSeconds);
    return NextResponse.json(
      { ok: false, error: `Trop de demandes. Réessaie dans ${String(retry)} secondes.` },
      { status: 429 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${env.NEXT_PUBLIC_SITE_URL}/auth/confirm` },
  });

  // Same generic error as the web login action (no account enumeration beyond
  // the existing web behavior).
  if (error ?? !data.properties.email_otp) {
    console.error("[mobile/send-otp] generateLink error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "Une erreur s'est produite. Vérifie ton adresse ou inscris-toi sur cyberlearn.fr.",
      },
      { status: 400 },
    );
  }

  try {
    await sendMagicLinkEmail({
      apiKey: env.RESEND_API_KEY,
      from: env.RESEND_FROM_EMAIL,
      to: email,
      magicLink: data.properties.action_link,
      type: "magiclink",
      code: data.properties.email_otp,
    });
  } catch (err) {
    console.error(
      "[mobile/send-otp] Resend error:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json(
      { ok: false, error: "Erreur lors de l'envoi. Réessaie." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

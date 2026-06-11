"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createSupabaseAdminClient } from "@cyberlearn/db/supabase/admin";
import { sendMagicLinkEmail } from "@cyberlearn/email";
import { prisma } from "@cyberlearn/db";
import { env } from "@/lib/env";
import { checkAuthRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
});

export async function sendAdminMagicLink(
  _prev: { error: string | null },
  formData: FormData,
): Promise<{ error: string | null }> {
  const headersList = await headers();
  const allowed = await checkAuthRateLimit({ headers: headersList });
  if (!allowed) {
    return { error: "Trop de tentatives. Réessaye dans 15 minutes." };
  }

  try {
    const parsed = schema.safeParse({ email: formData.get("email") });

    if (!parsed.success) {
      return { error: "Adresse email invalide." };
    }

    const { email } = parsed.data;

    // Verify the user has ADMIN role before sending the link (security gate)
    const dbUser = await prisma.user.findUnique({ where: { email }, select: { role: true } });
    if (dbUser?.role !== "ADMIN") {
      // Return generic error to avoid leaking whether the account exists
      return { error: "Accès refusé." };
    }

    const callbackUrl = `${env.NEXT_PUBLIC_ADMIN_URL}/auth/confirm`;

    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: callbackUrl },
    });

    if (error ?? !data.properties.action_link) {
      console.error("[sendAdminMagicLink] generateLink error:", error);
      return { error: "Une erreur s'est produite. Veuillez réessayer." };
    }

    try {
      await sendMagicLinkEmail({
        apiKey: env.RESEND_API_KEY,
        from: env.RESEND_FROM_EMAIL,
        to: email,
        magicLink: data.properties.action_link,
        type: "magiclink",
      });
    } catch (err) {
      console.error("[sendAdminMagicLink] Resend error:", err);
      return { error: "Erreur lors de l'envoi. Veuillez réessayer." };
    }

    return { error: null };
  } catch (err) {
    console.error("[sendAdminMagicLink] Unexpected error:", err);
    return { error: "Une erreur inattendue s'est produite. Veuillez réessayer." };
  }
}

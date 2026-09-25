import { passwordUpdateSchema } from "@cyberlearn/types";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyCurrentPassword } from "@/lib/auth/verify-password";
import { checkPasswordChange } from "@/lib/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { bearerHasRecoveryGrant, userFromBearer } from "../_lib/auth";

const schema = passwordUpdateSchema.and(
  z.object({
    currentPassword: z.string().min(1).max(128).optional(),
  }),
);

/**
 * Changes the caller's password, with the site's rule (updatePassword): the
 * current password is required, except in a session opened by the emailed
 * recovery code in the last 15 minutes, which is how the app lets somebody who
 * forgot it choose a new one. A stolen session alone never skips it. The MFA
 * requirement is userFromBearer's: an account with TOTP needs an AAL2 session.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const limit = await checkPasswordChange(user.id);
  if (!limit.success) {
    return NextResponse.json(
      { ok: false, error: "Trop de tentatives. Réessaie plus tard." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const { currentPassword } = parsed.data;
  if (currentPassword === undefined) {
    if (!bearerHasRecoveryGrant(request)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Saisis ton mot de passe actuel pour confirmer le changement.",
          // The app's reset screen reads it as "the recovery window has closed".
          needsCurrentPassword: true,
        },
        { status: 400 },
      );
    }
  } else if (!(await verifyCurrentPassword(user.email, currentPassword))) {
    return NextResponse.json(
      { ok: false, error: "Le mot de passe actuel est incorrect." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.password,
  });
  if (error) {
    return NextResponse.json(
      { ok: false, error: "Impossible de modifier le mot de passe." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

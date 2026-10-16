import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { type NextRequest, NextResponse } from "next/server";
import { canDisableOwnMfa } from "@/lib/auth/mfa-removal";
import { userFromBearer } from "../_lib/auth";

/**
 * Whether the app's security screen offers to remove the caller's second
 * factor, `{ ok, canDisable }`: false for an administrator, as on the site.
 * The app cannot read the role itself (the column is not granted to its
 * client), so it gets the consequence, decided on the server from
 * public.users. No input: the caller is the bearer token's.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  try {
    return NextResponse.json(
      { ok: true, canDisable: await canDisableOwnMfa(user.id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (err) {
    logger.error({ scope: "mfa-removal", err: errorMessage(err) }, "mfa removal policy failed");
    return NextResponse.json(
      { ok: false, error: "Vérification impossible pour le moment." },
      { status: 500 },
    );
  }
}

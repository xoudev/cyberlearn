import { type NextRequest, NextResponse } from "next/server";
import { challengeCatalogueFor } from "@/lib/challenges/catalogue";
import { userFromBearer } from "../_lib/auth";

/**
 * The active challenges with where the caller stands, and the challenge of the
 * week, as the site's /challenges lists them (lib/challenges/catalogue.ts). A
 * route rather than a read under RLS: the challenges table has no policy,
 * since it holds the flags.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  const { items, weekly } = await challengeCatalogueFor(user.id);
  return NextResponse.json({ ok: true, items, weekly });
}

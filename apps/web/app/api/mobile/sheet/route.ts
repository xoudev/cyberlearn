import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadSheet } from "@/lib/sheets/load";
import { userFromBearer } from "../_lib/auth";

/**
 * GET /api/mobile/sheet?path=SLUG&module=N: the revision sheet of a module,
 * as the site builds it for its PDF, for the app to show on screen. The app
 * has no PDF viewer of its own and no file store; the words are what matter,
 * and they are the same.
 */

const query = z.object({
  path: z.string().trim().min(1).max(120),
  module: z.coerce.number().int().min(1).max(99),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  const parsed = query.safeParse({
    path: request.nextUrl.searchParams.get("path"),
    module: request.nextUrl.searchParams.get("module"),
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Paramètres invalides." }, { status: 400 });
  }
  const sheet = await loadSheet(parsed.data.path, user.id, parsed.data.module);
  if (!sheet) {
    return NextResponse.json({ ok: false, error: "Fiche introuvable." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, sheet });
}

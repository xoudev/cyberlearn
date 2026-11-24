import { type NextRequest, NextResponse } from "next/server";
import { searchFor } from "@/lib/search/run";
import { userFromBearer } from "../_lib/auth";

/**
 * The site's navbar search, for the app's search screen: parcours, then
 * lessons, then the caller's own notes, scoped to the caller by the same
 * service. Each result carries `ref`, what the app opens it by.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  // The app opens a note by its lesson and has no screen yet for a note on
  // none (docs/MOBILE_PARITY.md): those stay on the site.
  const groups = (await searchFor(user.id, request.nextUrl.searchParams.get("q")))
    .map((group) => ({ ...group, results: group.results.filter((r) => r.ref !== "") }))
    .filter((group) => group.results.length > 0);
  return NextResponse.json({ ok: true, groups });
}

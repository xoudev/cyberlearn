import { NextResponse } from "next/server";
import { errorMessage } from "@cyberlearn/lib/logger";
import { visiblePathCovers } from "@/lib/paths/cover";
import { requestLogger } from "@/lib/request-logger";
import { userFromBearer } from "../_lib/auth";

/**
 * GET /api/mobile/path-covers: the covers of the paths this reader may open,
 * for the app's catalogue and path screens. The app reads the paths from the
 * database itself, but an image sent from the console sits in a private
 * bucket the app has no key to: it is signed here, for an hour, as the site
 * signs it. The illustration is a site path the app loads from the site.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }
  try {
    const covers = await visiblePathCovers(user.id);
    return NextResponse.json({ ok: true, covers });
  } catch (err) {
    const log = await requestLogger();
    log.error({ scope: "mobile/path-covers", err: errorMessage(err) }, "error");
    return NextResponse.json({ ok: false, error: "Chargement impossible." }, { status: 500 });
  }
}

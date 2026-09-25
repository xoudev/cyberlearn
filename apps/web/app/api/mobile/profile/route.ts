import { type NextRequest, NextResponse } from "next/server";
import { mobileProfileView } from "@/lib/profile/mobile-profile";
import { userFromBearer } from "../_lib/auth";

/**
 * Somebody's profile page, `?username=`: the same people let in as on
 * /u/[username], and the same "not found" for a closed profile as for a
 * handle that does not exist.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const result = await mobileProfileView(user.id, request.nextUrl.searchParams.get("username"));
  return NextResponse.json(result, { status: result.ok ? 200 : 404 });
}

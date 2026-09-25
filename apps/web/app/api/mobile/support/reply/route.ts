import { type NextRequest, NextResponse } from "next/server";
import { replyAsRequester } from "@/lib/tickets/requester";
import { userFromBearer } from "../../_lib/auth";

/**
 * The mobile user's reply on one of their own requests, through the site's
 * service. A resolved or closed request refuses it: the refusal comes from the
 * repository, in the words the site uses.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const result = await replyAsRequester(user.id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}

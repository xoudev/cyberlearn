import { NextResponse } from "next/server";

/** The request's JSON body, or the 400 to answer when it is not JSON. */
export async function readJson(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, body: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 }),
    };
  }
}

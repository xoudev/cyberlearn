import { getRequestUser } from "@/lib/auth";
import { searchFor } from "@/lib/search/run";

/**
 * What the search box in the navbar calls on every keystroke (debounced).
 *
 * Signed-in only, and scoped to the caller through the service the app uses
 * too (@/lib/search/run). There is nothing to rate-limit beyond that - the
 * queries are two indexed reads and a bounded scan - and the term is capped.
 */
export async function GET(request: Request): Promise<Response> {
  const user = await getRequestUser();
  if (!user) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const groups = await searchFor(user.id, new URL(request.url).searchParams.get("q"));
  return Response.json({ groups });
}

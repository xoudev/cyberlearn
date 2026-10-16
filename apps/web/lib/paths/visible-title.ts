import { pathRepository } from "@cyberlearn/db";
import { getRequestUser } from "@/lib/auth";

/**
 * A path's title for the browser tab, when the reader may open the path; null
 * otherwise, and the page falls back to a neutral word.
 *
 * Read through the reader's visibility, as the page itself is: a lookup by
 * slug alone put the title of a class's path, or of a draft, in the tab of the
 * 404 shown to whoever guessed its address. getRequestUser is cached for the
 * request, so this costs the page no second session read.
 */
export async function visiblePathTitle(slug: string): Promise<string | null> {
  const user = await getRequestUser();
  if (!user) return null;
  const path = await pathRepository.findBySlug(slug, user.id);
  return path?.title ?? null;
}

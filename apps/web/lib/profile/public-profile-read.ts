import { cache } from "react";
import { userRepository } from "@cyberlearn/db";
import { getActiveBan, getRequestUser } from "@/lib/auth";

/**
 * Who is reading /u/<username>, as far as the page is concerned: the
 * signed-in account, or null for a stranger.
 *
 * A banned account reads it as a stranger does. The app the shell leads into
 * is closed to it, and so is every button the page would offer - adding a
 * friend, a duel, editing one's own profile all go through requireRequestUser
 * and land on /banned. A button that cannot work is worse than no button.
 *
 * Cached for the request: the layout, generateMetadata and the page all ask.
 */
export const profileReaderId = cache(async (): Promise<string | null> => {
  const viewer = await getRequestUser();
  if (viewer === null) return null;
  return (await getActiveBan()) === null ? viewer.id : null;
});

/**
 * The profile behind /u/<username> as its reader may see it, or null when
 * there is no such account or it is closed to them - the two are not told
 * apart, on purpose (findPublicProfile).
 *
 * Cached for the request so the segment's layout can ask before anything is
 * streamed - which is what turns a missing profile into a real 404 rather
 * than a 200 carrying the not-found page - without the page asking twice.
 */
export const findProfileFor = cache(async (username: string) =>
  userRepository.findPublicProfile(username, await profileReaderId()),
);

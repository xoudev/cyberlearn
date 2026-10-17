import { cache } from "react";
import { userRepository, type ProfileAccess } from "@cyberlearn/db";
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
 * How /u/<username> opens for its reader: "closed" when there is no such
 * account or it is closed to them - the two are not told apart, on purpose
 * (findPublicProfile) - otherwise "public", or "private" for a profile its
 * owner closed that the reader was let into (their own, or a friend's).
 *
 * The light check (profileAccess), not the profile: the layout asks it before
 * anything is streamed and generateMetadata asks it too, for the 404 and for
 * whether search engines may index the page. Cached for the request.
 */
export const profileAccessFor = cache(
  async (username: string): Promise<ProfileAccess> =>
    userRepository.profileAccess(username, await profileReaderId()),
);

/**
 * Whether /u/<username> opens for its reader (profileAccessFor, not closed).
 *
 * The segment's layout asks it before anything is streamed, which is what
 * turns a missing profile into a real 404 rather than a 200 carrying the
 * not-found page. It is the light check, not the profile: the layout sits
 * above the skeleton, so it is what a prefetched profile link runs, and a
 * leaderboard prefetches fifty of them.
 */
export const profileOpensFor = cache(
  async (username: string): Promise<boolean> => (await profileAccessFor(username)) !== "closed",
);

/**
 * The profile behind /u/<username> as its reader may see it, or null when
 * there is no such account or it is closed to them. The page's read, behind
 * the skeleton; null there still means the 404, should the profile have
 * closed between the layout's check and this read.
 */
export const findProfileFor = cache(async (username: string) =>
  userRepository.findPublicProfile(username, await profileReaderId()),
);

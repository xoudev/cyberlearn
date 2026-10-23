import { z } from "zod";

// ─── /api/mobile/friends/activity: "Tes amis" on the app's home ─────────────
//
// What the route answers, as the app reads it. The site's service writes it
// (friendsActivityFor of apps/web/lib/friends/friends-activity.ts) and the
// route's own test parses a reply with these schemas, so the two cannot drift
// apart unnoticed. The app never trusts a reply's shape: a body these refuse
// is a failed load, never a home tab drawn from half a reply.

/** What a friend did, as @cyberlearn/lib/social/friend-activity words it. */
export const friendActivityKindSchema = z.enum([
  "lesson",
  "badge",
  "certificate",
  "challenge",
  "duel",
]);

/** One moment: who, what, when. */
export const friendActivityItemSchema = z.object({
  /** Unique across the list, for a list key. */
  key: z.string().min(1),
  kind: friendActivityKindSchema,
  /** ISO date. */
  at: z.string().min(1),
  title: z.string(),
  friend: z.object({
    id: z.string().min(1),
    name: z.string(),
    username: z.string().nullable(),
    /** Ready to draw: a signed URL, a built-in path, a glyph marker, or null. */
    avatarSrc: z.string().nullable(),
    /** Whether the name may open their profile. */
    profileOpen: z.boolean(),
    /** A duel still open between the reader and this friend. */
    duelOpen: z.boolean(),
  }),
});

/** GET: the friends' recent moments, or why there are none to show. */
export const friendsActivityReplySchema = z.discriminatedUnion("ok", [
  z.object({
    ok: z.literal(true),
    /** False: the reader has no friend, and the home tab draws no section. */
    hasFriends: z.boolean(),
    items: z.array(friendActivityItemSchema),
  }),
  z.object({ ok: z.literal(false), error: z.string().optional() }),
]);

export type FriendsActivityReply = z.infer<typeof friendsActivityReplySchema>;

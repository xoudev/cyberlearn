import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../prisma.js";

/**
 * The drafts the lesson editor sends the site to render.
 *
 * The editor runs on the console as well as on the site, and the console has
 * no session on the site: an iframe it opens there arrives signed out. So the
 * preview's address carries its own credential, a token of 256 random bits,
 * and the page serves the draft behind it to whoever holds it, for half an
 * hour past the last refresh. Only the hash is stored: the database does not
 * know the addresses, as with the deletion tokens.
 *
 * A token is refreshed by its author alone, which is what makes it theirs:
 * refresh() matches the row on the token and on the user, and an editor whose
 * token no longer matches (purged, or somebody else's) is issued a new one.
 */

export const LESSON_PREVIEW_TTL_MS = 30 * 60 * 1000;

/** 32 random bytes in base64url: 43 characters, no padding. */
export const LESSON_PREVIEW_TOKEN = /^[A-Za-z0-9_-]{43}$/;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function expiry(now: Date): Date {
  return new Date(now.getTime() + LESSON_PREVIEW_TTL_MS);
}

export const lessonPreviewRepository = {
  /** Stores `contentMdx` under a new token, and returns that token: the only time it is in clear. */
  async issue(userId: string, contentMdx: string, now: Date): Promise<string> {
    const token = randomBytes(32).toString("base64url");
    await prisma.lessonPreview.create({
      data: { userId, tokenHash: hashToken(token), contentMdx, expiresAt: expiry(now) },
    });
    return token;
  },

  /**
   * Replaces the draft behind `token` and gives it another half hour, when the
   * token is `userId`'s. False otherwise: the editor then asks for a new one.
   */
  async refresh(userId: string, token: string, contentMdx: string, now: Date): Promise<boolean> {
    if (!LESSON_PREVIEW_TOKEN.test(token)) return false;
    const { count } = await prisma.lessonPreview.updateMany({
      where: { tokenHash: hashToken(token), userId },
      data: { contentMdx, expiresAt: expiry(now) },
    });
    return count === 1;
  },

  /** The draft behind `token`, or null once it has expired or never existed. */
  async findLive(token: string, now: Date): Promise<{ contentMdx: string } | null> {
    if (!LESSON_PREVIEW_TOKEN.test(token)) return null;
    return prisma.lessonPreview.findFirst({
      where: { tokenHash: hashToken(token), expiresAt: { gt: now } },
      select: { contentMdx: true },
    });
  },
};

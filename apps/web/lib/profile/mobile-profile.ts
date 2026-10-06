import { z } from "zod";
import { friendshipRepository, userRepository } from "@cyberlearn/db";
import { computeLevel, friendshipView, type FriendshipView } from "@cyberlearn/lib";
import { difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import {
  certificateVerifyUrl,
  linkedInCertificateUrl,
  type SkillLine,
  skillLines,
} from "@cyberlearn/lib/social/portfolio";
import { resolveAvatarSrc } from "@/lib/avatar/storage";

/**
 * Somebody's profile page, as the app receives it (/api/mobile/profile).
 *
 * The same page as /u/[username] on the site, read through the same
 * repository call, so the same people are let in: anybody when the profile is
 * public, only the owner and their accepted friends when it is not. Everybody
 * else gets the same "not found" as a handle that does not exist, which is
 * what the site's 404 says too.
 *
 * The repository returns the whole user row. Only what the site's page shows
 * leaves this function: no e-mail, no role, no stored avatar key.
 */

export interface MobileProfileBadge {
  id: string;
  name: string;
  rarity: string;
  iconUrl: string | null;
}

export interface MobileProfileLesson {
  title: string;
  slug: string;
  category: string;
  completedAt: string | null;
}

export interface MobileProfileCertificate {
  publicId: string;
  pathTitle: string;
  category: string;
  issuedAt: string;
  score: number | null;
  /** The public page that proves it. */
  verifyUrl: string;
  /** The link that adds it to a LinkedIn profile: on the holder's own page only. */
  linkedInUrl: string | null;
}

export interface MobileProfileChallenge {
  title: string;
  slug: string;
  category: string;
  difficulty: string;
  /** "Débutant", as the site's chip says it. */
  difficultyLabel: string;
  difficultyColor: string;
  completedAt: string | null;
}

export interface MobileProfile {
  id: string;
  username: string;
  displayName: string;
  bio: string | null;
  /** Ready to draw: a glyph, a preset path, a signed URL, or null. */
  avatar: string | null;
  joinedAt: string;
  xpTotal: number;
  streakDays: number;
  level: { level: number; current: number; needed: number };
  /** Closed to strangers; the reader got in as the owner or a friend. */
  isPrivate: boolean;
  isSelf: boolean;
  /** Where the reader stands with this person: which button to show. */
  friendship: FriendshipView;
  badges: MobileProfileBadge[];
  recentLessons: MobileProfileLesson[];
  /** The portfolio: skills read off what is finished, certificates, challenges solved. */
  skills: SkillLine[];
  certificates: MobileProfileCertificate[];
  challenges: MobileProfileChallenge[];
}

export type MobileProfileResult =
  | { ok: true; profile: MobileProfile }
  | { ok: false; error: string };

const usernameSchema = z.string().trim().min(1).max(64);
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cyberlearn.fr";
const NOT_FOUND = "Profil introuvable.";

export async function mobileProfileView(
  viewerId: string,
  username: unknown,
): Promise<MobileProfileResult> {
  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) return { ok: false, error: NOT_FOUND };

  const user = await userRepository.findPublicProfile(parsed.data, viewerId);
  if (!user?.username) return { ok: false, error: NOT_FOUND };

  const isSelf = user.id === viewerId;
  const friendship = isSelf
    ? "none"
    : friendshipView(await friendshipRepository.between(viewerId, user.id), viewerId);

  return {
    ok: true,
    profile: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatar: await resolveAvatarSrc(user.avatarUrl),
      joinedAt: user.createdAt.toISOString(),
      xpTotal: user.xpTotal,
      streakDays: user.streakDays,
      level: computeLevel(user.xpTotal),
      isPrivate: user.preferences?.publicProfile === false,
      isSelf,
      friendship,
      badges: user.badges.map((ub) => ({
        id: ub.id,
        name: ub.badge.name,
        rarity: ub.badge.rarity,
        iconUrl: ub.badge.iconUrl,
      })),
      recentLessons: user.lessonProgress.map((lp) => ({
        title: lp.lesson.title,
        slug: lp.lesson.slug,
        category: lp.lesson.category,
        completedAt: lp.completedAt?.toISOString() ?? null,
      })),
      skills: skillLines(
        user.lessonsByCategory,
        user.pathProgress.map((pp) => ({ title: pp.path.title, category: pp.path.category })),
      ),
      certificates: user.certificates.map((cert) => {
        const verifyUrl = certificateVerifyUrl(SITE_URL, cert.publicId);
        return {
          publicId: cert.publicId,
          pathTitle: cert.path.title,
          category: cert.path.category,
          issuedAt: cert.issuedAt.toISOString(),
          score: cert.score,
          verifyUrl,
          linkedInUrl: isSelf
            ? linkedInCertificateUrl({
                name: cert.path.title,
                issuedAt: cert.issuedAt,
                publicId: cert.publicId,
                verifyUrl,
              })
            : null,
        };
      }),
      challenges: user.challengeProgress.map((cp) => {
        const difficulty = difficultyMeta(cp.challenge.difficulty);
        return {
          title: cp.challenge.title,
          slug: cp.challenge.slug,
          category: cp.challenge.category,
          difficulty: cp.challenge.difficulty,
          difficultyLabel: difficulty.label,
          difficultyColor: difficulty.color,
          completedAt: cp.completedAt?.toISOString() ?? null,
        };
      }),
    },
  };
}

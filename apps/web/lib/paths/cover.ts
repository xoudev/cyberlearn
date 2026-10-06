import { pathsVisibleTo, prisma } from "@cyberlearn/db";
import { isUploadedCover } from "@cyberlearn/types";
import { resolveLessonCoverSrcMany } from "@/lib/lesson-cover/storage";

/**
 * A path's cover, as the site shows it.
 *
 * An image uploaded from the console (a `__cover:` marker in coverImageUrl,
 * stored in the private bucket the lesson covers use) wins, as a short-lived
 * signed URL. Without one, the path's own illustration, shipped with the site
 * under /covers/paths, or its category's. A URL pasted in the console before
 * uploads existed is not shown: the page's CSP only lets images come from the
 * site and from Supabase.
 */

/** The paths that have an illustration of their own, by slug. */
const ILLUSTRATED = new Set([
  "admin-systeme-linux",
  "assembleur-x86",
  "blue-team-soc",
  "c-programmation",
  "cloud",
  "cryptographie",
  "cyber-fondamentaux",
  "cyber-web-owasp",
  "fondamentaux-informatique",
  "git-docker-cicd",
  "grc",
  "javascript-moderne",
  "linux",
  "linux-terminal",
  "osint",
  "pentest",
  "python-bases-pratique",
  "reseaux",
  "reseaux-tcp-ip",
]);

const CATEGORY_COVER: Record<string, string> = {
  DEV: "category-dev",
  CYBERSEC: "category-cybersec",
  NETWORK: "category-network",
};

/** The illustration shipped with the site for a path: its own, else its category's. */
export function builtInPathCover(path: { slug: string; category: string }): string {
  const name = ILLUSTRATED.has(path.slug)
    ? path.slug
    : (CATEGORY_COVER[path.category] ?? "category-dev");
  return `/covers/paths/${name}.svg`;
}

export interface PathCoverInput {
  slug: string;
  category: string;
  coverImageUrl: string | null;
}

/** A path's two covers: the uploaded image, if any, and its illustration. */
export interface PathCover {
  slug: string;
  /** The image sent from the console, as a signed URL valid one hour; null without one. */
  image: string | null;
  /** The illustration shipped with the site, a site path under /covers/paths. */
  illustration: string;
}

/** Every path's covers in one go, uploads signed in a single round trip, order kept. */
export async function pathCovers(paths: readonly PathCoverInput[]): Promise<PathCover[]> {
  const signed = await resolveLessonCoverSrcMany(
    paths.map((path) => (isUploadedCover(path.coverImageUrl) ? path.coverImageUrl : null)),
  );
  return paths.map((path, i) => ({
    slug: path.slug,
    image: signed[i] ?? null,
    illustration: builtInPathCover(path),
  }));
}

/** The one cover the site shows for each path: the upload, else the illustration. */
export async function resolvePathCovers(paths: readonly PathCoverInput[]): Promise<string[]> {
  return (await pathCovers(paths)).map((cover) => cover.image ?? cover.illustration);
}

/** The covers of the paths this reader may open: the catalogue and their classes'. */
export async function visiblePathCovers(userId: string): Promise<PathCover[]> {
  const paths = await prisma.path.findMany({
    where: pathsVisibleTo(userId),
    select: { slug: true, category: true, coverImageUrl: true },
    orderBy: { slug: "asc" },
  });
  return pathCovers(paths);
}

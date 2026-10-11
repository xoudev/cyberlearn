import type { ForumAuthor } from "@cyberlearn/db";

/**
 * A name that is never empty, whoever is left after an anonymisation. Shared by
 * the site's forum and what the app receives, so a post is signed the same way
 * on both.
 */
export function forumAuthorName(
  author: Pick<ForumAuthor, "displayName" | "username"> | null,
): string {
  if (!author) return "Compte supprimé";
  return author.displayName.trim() !== "" ? author.displayName : (author.username ?? "Sans nom");
}

/**
 * The handle the author's name opens a profile with, or null when there is no
 * handle or the reader would not be let in (`open` comes from
 * userRepository.profilesOpenTo). Shared by the site's thread and what the
 * app receives, so a name is a link in the same cases on both.
 */
export function forumAuthorHandle(
  author: Pick<ForumAuthor, "id" | "username"> | null,
  open: ReadonlySet<string>,
): string | null {
  const handle = author?.username ?? null;
  if (author === null || handle === null) return null;
  return open.has(author.id) ? handle : null;
}

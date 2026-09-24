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

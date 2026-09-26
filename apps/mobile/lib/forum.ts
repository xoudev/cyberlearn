/**
 * The forum, as the app receives it from /api/mobile/forum/* (see
 * apps/web/lib/forum/mobile-view.ts). Who may read, write, edit or take down
 * is decided there; these helpers only shape what the screens show and check
 * a draft before it is sent, with the server's limits and words.
 */

export interface ForumAuthor {
  id: string;
  name: string;
  level: number;
  role: string;
}

export interface ForumCategory {
  slug: string;
  name: string;
  description: string;
  accent: string;
  topicCount: number;
  lastPostAt: string | null;
}

export interface ForumTopicSummary {
  id: string;
  slug: string;
  title: string;
  pinned: boolean;
  locked: boolean;
  replyCount: number;
  createdAt: string;
  lastPostAt: string;
  categorySlug: string;
  categoryName: string;
  categoryAccent: string;
  author: ForumAuthor | null;
  preview: string;
}

export interface ForumPost {
  id: string;
  content: string;
  createdAt: string;
  editedAt: string | null;
  /** Taken down; only ever sent to its own author. */
  hidden: boolean;
  /** Written by the reader. */
  mine: boolean;
  author: ForumAuthor | null;
  /** Ready to draw: a glyph, a preset path, a signed URL, or null. */
  avatar: string | null;
}

/** The server's limits (lib/forum/forum-service.ts). */
const TITLE_MIN = 8;
export const TITLE_MAX = 160;
const BODY_MIN = 10;
export const BODY_MAX = 10_000;

/** What is wrong with a new thread before it is sent, or null. */
export function topicDraftProblem(title: string, content: string): string | null {
  const t = title.trim().length;
  const c = content.trim().length;
  if (t < TITLE_MIN || c < BODY_MIN) {
    return "Un titre de 8 caractères et un message de 10, au minimum.";
  }
  if (t > TITLE_MAX) return "160 caractères au plus pour le titre.";
  if (c > BODY_MAX) return "10 000 caractères au plus pour le message.";
  return null;
}

/** What is wrong with a reply or an edit before it is sent, or null. */
export function postDraftProblem(content: string): string | null {
  const c = content.trim().length;
  if (c < BODY_MIN) return "Message trop court.";
  if (c > BODY_MAX) return "10 000 caractères au plus pour le message.";
  return null;
}

/** The author may edit a post that is still up; nobody else may. */
export function canEditPost(post: ForumPost): boolean {
  return post.mine && !post.hidden;
}

/** Its author may take a post down, and so may an administrator. */
export function canRemovePost(post: ForumPost, viewerIsAdmin: boolean): boolean {
  return !post.hidden && (post.mine || viewerIsAdmin);
}

/** The label next to a name in a thread, as on the site. */
export function roleLabel(role: string): string | null {
  if (role === "TEACHER") return "Professeur";
  if (role === "ADMIN") return "Équipe";
  return null;
}

export function replyCountLabel(count: number): string {
  return `${String(count)} réponse${count > 1 ? "s" : ""}`;
}

export function topicCountLabel(count: number): string {
  return `${String(count)} sujet${count > 1 ? "s" : ""}`;
}

/** A thread's address from the site's link to it: "/forum/<section>/<thread>". */
export function threadFromHref(href: string): { category: string; slug: string } | null {
  const match = /^\/forum\/([a-z0-9-]+)\/([a-z0-9-]+)\/?(?:[?#].*)?$/u.exec(href);
  if (!match?.[1] || !match[2]) return null;
  return { category: match[1], slug: match[2] };
}

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** A date as the site's forum writes it. */
export function forumDate(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}

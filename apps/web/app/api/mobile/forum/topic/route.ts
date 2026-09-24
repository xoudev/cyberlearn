import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { POSTS_PER_PAGE, forumRepository } from "@cyberlearn/db";
import { resolveAvatarSrcMany } from "@/lib/avatar/storage";
import { createForumTopic, isForumAdmin } from "@/lib/forum/forum-service";
import { pageParam, toMobilePost, toMobileTopicSummary } from "@/lib/forum/mobile-view";
import { userFromBearer } from "../../_lib/auth";

const slugSchema = z.string().min(1).max(80);

/**
 * One thread, a page of its posts at a time. The authors' avatars on that
 * page are signed here, as the site's thread page does: an uploaded one lives
 * in a private bucket and signing needs the service_role key. Only the authors
 * on the page, so this is no way to list the bucket.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const category = slugSchema.safeParse(params.get("category"));
  const slug = slugSchema.safeParse(params.get("slug"));
  if (!category.success || !slug.success) {
    return NextResponse.json({ ok: false, error: "Sujet invalide." }, { status: 400 });
  }
  const page = pageParam(params.get("page"));

  const [view, isAdmin] = await Promise.all([
    forumRepository.findTopic(category.data, slug.data, user.id, page),
    isForumAdmin(user.id),
  ]);
  if (!view) {
    return NextResponse.json({ ok: false, error: "Sujet introuvable." }, { status: 404 });
  }

  const avatars = await resolveAvatarSrcMany(view.posts.map((p) => p.author?.avatarUrl ?? null));
  return NextResponse.json({
    ok: true,
    // An administrator may take down anybody's post, as on the site.
    viewer: { isAdmin },
    topic: toMobileTopicSummary(view),
    posts: view.posts.map((post, i) => toMobilePost(post, user.id, avatars[i] ?? null)),
    page,
    pages: Math.max(1, Math.ceil(view.postCount / POSTS_PER_PAGE)),
  });
}

/**
 * Opens a thread through the site's service: same rate limit, same screen,
 * held for review when flagged, and the author told so.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  }

  const result = await createForumTopic(user.id, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}

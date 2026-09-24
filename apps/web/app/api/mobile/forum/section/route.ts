import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TOPICS_PER_PAGE, forumRepository } from "@cyberlearn/db";
import { pageParam, toMobileTopicSummary } from "@/lib/forum/mobile-view";
import { userFromBearer } from "../../_lib/auth";

const slugSchema = z.string().min(1).max(80);

/** One section's threads, a page at a time: pinned first, then the busiest. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const slug = slugSchema.safeParse(params.get("slug"));
  if (!slug.success) {
    return NextResponse.json({ ok: false, error: "Section invalide." }, { status: 400 });
  }
  const page = pageParam(params.get("page"));

  const section = await forumRepository.listTopics(slug.data, user.id, page);
  if (!section) {
    return NextResponse.json({ ok: false, error: "Section introuvable." }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    category: {
      slug: section.category.slug,
      name: section.category.name,
      description: section.category.description,
      accent: section.category.accent,
      topicCount: section.total,
    },
    topics: section.topics.map(toMobileTopicSummary),
    page,
    pages: Math.max(1, Math.ceil(section.total / TOPICS_PER_PAGE)),
  });
}

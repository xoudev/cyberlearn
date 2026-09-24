import { type NextRequest, NextResponse } from "next/server";
import { forumRepository } from "@cyberlearn/db";
import { toMobileCategory, toMobileTopicSummary } from "@/lib/forum/mobile-view";
import { userFromBearer } from "../_lib/auth";

/**
 * The forum's front page for the app: every section with how busy it is, and
 * the latest threads across all of them. Through the repository rather than
 * reads under RLS: what a reader sees (everything visible, plus their own
 * hidden threads) is written there once, for the site and the app.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await userFromBearer(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: "Non authentifié." }, { status: 401 });
  }

  const [categories, recent] = await Promise.all([
    forumRepository.listCategories(user.id),
    forumRepository.listRecentTopics(user.id),
  ]);
  return NextResponse.json({
    ok: true,
    categories: categories.map(toMobileCategory),
    recent: recent.map(toMobileTopicSummary),
  });
}

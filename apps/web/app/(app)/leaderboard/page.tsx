import { redirect } from "next/navigation";

/**
 * Legacy route. The canonical leaderboard is now /classement (the v2 design
 * linked from the sidebar). This redirect keeps old links/bookmarks working
 * and avoids maintaining two divergent leaderboard pages.
 */
export default function LeaderboardPage(): never {
  redirect("/classement");
}

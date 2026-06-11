import { redirect } from "next/navigation";

/**
 * Legacy route. The SM-2 grading flow now lives on /revisions (the v2 design
 * linked from the sidebar), which gained the in-place quality buttons. This
 * redirect keeps old links and bookmarks working, same pattern as
 * /leaderboard -> /classement.
 */
export default function ReviewPage(): never {
  redirect("/revisions");
}

import React from "react";
import { SidebarWrapper } from "@/components/sidebar-wrapper";
import { SidebarNav } from "@/components/sidebar-nav";
import { computeLevel } from "@cyberlearn/lib";
import { rankName } from "@cyberlearn/lib/dashboard/rank-name";
import { LIVE_CLASS_FILTER, prisma } from "@cyberlearn/db";
import { getRequestUser, getSharedUserProfile } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { revisionsEnabled } from "@/lib/lessons/revisions-enabled";

export async function AppSidebar(): Promise<React.ReactElement> {
  let level = 1;
  let dueReviews = 0;
  let hasClasses = false;
  let showRevisions = true;
  let displayName = "Opérateur";
  let avatarSrc: string | null = null;

  try {
    const [authUser, dbUser] = await Promise.all([getRequestUser(), getSharedUserProfile()]);

    if (authUser) {
      const wantsRevisions = await revisionsEnabled(authUser.id);
      showRevisions = wantsRevisions;
      // The one count the sidebar shows: revisions due now. A count of lessons
      // in progress said nothing anybody could act on from the sidebar.
      if (wantsRevisions) {
        dueReviews = await prisma.reviewSchedule.count({
          where: { userId: authUser.id, nextReviewAt: { lte: new Date() } },
        });
      }

      // The entry follows the classes, not the role. Teaching one and being in
      // one both count: a student put in a class had nowhere to see their
      // classmates except their own profile, while the page listing them
      // existed and was closed to them.
      //
      // Archived classes are excluded here for the same reason the pages
      // exclude them - a count that did not would put back the door with an
      // empty room behind it. LIVE_CLASS_FILTER is the repository's own rule,
      // imported rather than restated, because this count and
      // findForTeacher/findForMember disagreeing is exactly how that bug happens.
      hasClasses =
        (await prisma.class.count({
          where: {
            ...LIVE_CLASS_FILTER,
            OR: [
              { teachers: { some: { teacherId: authUser.id } } },
              { members: { some: { userId: authUser.id } } },
            ],
          },
        })) > 0;
    }

    level = computeLevel(dbUser?.xpTotal ?? 0).level;
    if (dbUser?.displayName) displayName = dbUser.displayName;
    // The signed URL is cached per key, so the navbar and the sidebar asking
    // for the same avatar costs one signature.
    avatarSrc = await resolveAvatarSrc(dbUser?.avatarUrl ?? null);
  } catch {
    // Unauthenticated edge case - sidebar renders with fallback values
  }

  return (
    <SidebarWrapper>
      <SidebarNav
        hasClasses={hasClasses}
        showRevisions={showRevisions}
        dueReviews={dueReviews}
        level={level}
        rankName={rankName(level)}
        displayName={displayName}
        avatarSrc={avatarSrc}
      />
    </SidebarWrapper>
  );
}

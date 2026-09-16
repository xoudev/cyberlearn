import React from "react";
import { SidebarWrapper } from "@/components/sidebar-wrapper";
import { SidebarNav } from "@/components/sidebar-nav";
import { computeLevel } from "@cyberlearn/lib";
import { prisma } from "@cyberlearn/db";
import { getRequestUser, getSharedUserProfile } from "@/lib/auth";

export async function AppSidebar(): Promise<React.ReactElement> {
  let level = 1;
  let xpCurrent = 0;
  let xpNeeded = 100;
  let xpPercent = 0;
  let inProgressCount = 0;
  let hasClasses = false;

  try {
    const [authUser, dbUser] = await Promise.all([getRequestUser(), getSharedUserProfile()]);

    if (authUser) {
      const ipCount = await prisma.userLessonProgress.count({
        where: { userId: authUser.id, status: "IN_PROGRESS" },
      });
      inProgressCount = ipCount;
    }

    // The entry follows the classes, not the role: a teacher with none assigned
    // was shown a door to a page that existed only to say it had nothing behind
    // it. The count runs for teachers only, so a learner pays nothing for it.
    // Read from the database rather than the session claim, so a removed role
    // closes the door on the next request instead of at token expiry.
    // Archived classes are excluded here for the same reason the page excludes
    // them: classRepository.findForTeacher filters on archivedAt, so a teacher
    // whose only class had been archived saw the entry and got a 404 behind it
    // - the door and the empty room again, by a different route.
    if (authUser && (dbUser?.role === "TEACHER" || dbUser?.role === "ADMIN")) {
      hasClasses =
        (await prisma.classTeacher.count({
          where: {
            teacherId: authUser.id,
            class: { archivedAt: null, promotion: { archivedAt: null } },
          },
        })) > 0;
    }

    const computed = computeLevel(dbUser?.xpTotal ?? 0);
    level = computed.level;
    xpCurrent = computed.current;
    xpNeeded = computed.needed;
    xpPercent = computed.needed > 0 ? Math.min((computed.current / computed.needed) * 100, 100) : 0;
  } catch {
    // Unauthenticated edge case - sidebar renders with fallback zeros
  }

  return (
    <SidebarWrapper>
      <SidebarNav
        hasClasses={hasClasses}
        inProgressCount={inProgressCount}
        level={level}
        xpCurrent={xpCurrent}
        xpNeeded={xpNeeded}
        xpPercent={xpPercent}
      />
    </SidebarWrapper>
  );
}

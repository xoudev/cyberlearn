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

    // The entry follows the classes, not the role. Teaching one and being in one
    // both count: a student put in a class had nowhere to see their classmates
    // except their own profile, while the page listing them existed and was
    // closed to them.
    //
    // Archived classes are excluded here for the same reason the page excludes
    // them - findForTeacher and findForMember both filter on archivedAt, and a
    // count that did not would put back the door with an empty room behind it.
    if (authUser) {
      hasClasses =
        (await prisma.class.count({
          where: {
            archivedAt: null,
            promotion: { archivedAt: null },
            OR: [
              { teachers: { some: { teacherId: authUser.id } } },
              { members: { some: { userId: authUser.id } } },
            ],
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

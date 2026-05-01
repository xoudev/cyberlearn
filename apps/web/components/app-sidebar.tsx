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

  try {
    const [authUser, dbUser] = await Promise.all([getRequestUser(), getSharedUserProfile()]);

    if (authUser) {
      const ipCount = await prisma.userLessonProgress.count({
        where: { userId: authUser.id, status: "IN_PROGRESS" },
      });
      inProgressCount = ipCount;
    }

    const computed = computeLevel(dbUser?.xpTotal ?? 0);
    level = computed.level;
    xpCurrent = computed.current;
    xpNeeded = computed.needed;
    xpPercent = computed.needed > 0 ? Math.min((computed.current / computed.needed) * 100, 100) : 0;
  } catch {
    // Unauthenticated edge case — sidebar renders with fallback zeros
  }

  return (
    <SidebarWrapper>
      <SidebarNav
        inProgressCount={inProgressCount}
        level={level}
        xpCurrent={xpCurrent}
        xpNeeded={xpNeeded}
        xpPercent={xpPercent}
      />
    </SidebarWrapper>
  );
}

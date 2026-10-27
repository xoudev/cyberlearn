import React from "react";
import { SidebarWrapper } from "@/components/sidebar-wrapper";
import { SidebarNav } from "@/components/sidebar-nav";
import { computeLevel } from "@cyberlearn/lib";
import { rankName } from "@cyberlearn/lib/dashboard/rank-name";
import { classRepository, duelRepository } from "@cyberlearn/db";
import { getRequestUser, getSharedUserProfile } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar/storage";

export async function AppSidebar(): Promise<React.ReactElement> {
  let level = 1;
  let hasClasses = false;
  let duelInvitations = 0;
  let displayName = "Opérateur";
  let avatarSrc: string | null = null;

  try {
    const [authUser, dbUser] = await Promise.all([getRequestUser(), getSharedUserProfile()]);

    if (authUser) {
      // "Mes classes" follows the classes, not the role: teaching one or being
      // in one, archived ones left out (classRepository.hasLiveClass). "Duels"
      // counts the invitations a friend is waiting on an answer to. The day's
      // recall is no page: its button is in the navbar (components/navbar.tsx).
      [hasClasses, duelInvitations] = await Promise.all([
        classRepository.hasLiveClass(authUser.id),
        duelRepository.countInvitations(authUser.id, new Date()),
      ]);
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
        duelInvitations={duelInvitations}
        level={level}
        rankName={rankName(level)}
        displayName={displayName}
        avatarSrc={avatarSrc}
      />
    </SidebarWrapper>
  );
}

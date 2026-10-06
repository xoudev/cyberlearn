import React from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NAVBAR_HEIGHT } from "@/lib/chrome";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";
import { wrappedWindow } from "@cyberlearn/lib";
import { getRequestUser, getSharedUserProfile } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { friendshipRepository, notificationRepository } from "@cyberlearn/db";
import { AvatarView } from "./avatar-view";
import { FriendsPanel } from "./friends-panel";
import { GlobalSearch } from "./global-search";
import { NewsButton } from "./news-button";
import { NotificationPanel } from "./notification-panel";
import { WrappedChip } from "./wrapped-chip";

export async function Navbar(): Promise<React.ReactElement> {
  let displayName = "";
  let avatarUrl: string | null = null;
  let unreadCount = 0;
  let friendRequestCount = 0;
  let userId = "";

  try {
    const [authUser, dbUser] = await Promise.all([getRequestUser(), getSharedUserProfile()]);

    userId = authUser?.id ?? "";
    // Resolve "__upload:" markers to short-lived signed URLs before the value
    // reaches the render branch. Built-ins, "__glyph:" markers and null pass
    // through unchanged, so the rendering logic below is untouched.
    avatarUrl = await resolveAvatarSrc(dbUser?.avatarUrl ?? null);

    displayName = dbUser?.displayName ?? "";

    if (userId) {
      // Two counts, one round trip each, on the one component every signed-in
      // page already renders. The lists themselves are read when the panel is
      // opened - nobody pays for friends they are not looking at.
      [unreadCount, friendRequestCount] = await Promise.all([
        notificationRepository.findUnreadCount(userId),
        friendshipRepository.countIncoming(userId),
      ]);
    }
  } catch {
    // Unauthenticated or DB error - render with fallback values
  }

  // A date, not a query: the chip is only drawn during the window, and deciding
  // that costs nothing on a component every signed-in page renders. What the
  // recap actually contains is read when somebody opens it.
  const wrapped = wrappedWindow(new Date());

  return (
    <header
      className="shrink-0 navbar-header"
      style={{
        display: "flex",
        alignItems: "center",
        height: NAVBAR_HEIGHT,
        background: "rgba(3,2,25,0.85)",
        backdropFilter: "blur(24px) saturate(140%)",
        WebkitBackdropFilter: "blur(24px) saturate(140%)",
        borderBottom: "1px solid var(--color-border-default)",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* ── Sidebar trigger (hamburger). The wordmark is the sidebar's: written
          here too, the name of the site stood twice on the same screen. ── */}
      <SidebarTrigger style={{ width: 26, height: 26, flexShrink: 0 }} />

      {/* ── Search (hidden on mobile) ───────────────────────────────────── */}
      <GlobalSearch />

      {/* ── Mobile spacer: push actions to the right ────────────────────── */}
      <div className="flex-1 md:hidden" />

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {/* Wrapped turns up here in December and is gone again in January. */}
        {userId && wrapped.open && <WrappedChip periodKey={wrapped.periodKey} />}
        {/* The release notes: news, announced where the other news arrives. */}
        <NewsButton />
        {userId && <FriendsPanel initialRequestCount={friendRequestCount} />}
        {/* Notification panel (client component with Realtime subscription) */}
        {userId && <NotificationPanel initialUnreadCount={unreadCount} userId={userId} />}
        {/* The settings, behind their icon: a section's address, which opens
            as a drawer over the page from inside the site (see @panel). */}
        <Link
          href="/settings/profile"
          className="navbar-icon-link"
          title="Paramètres"
          aria-label="Paramètres"
        >
          <Settings size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>

        {/* The avatar, a link to the profile. The level is no longer written
            here: the sidebar's account block already says it on every page. */}
        <Link href="/profile" className="navbar-me" title="Mon profil" aria-label="Mon profil">
          {/* The equipped hexagon glow and frame are a filter on the frame, as
              in the sidebar: AvatarView draws, this span frames. */}
          <span
            className="navbar-avatar-frame"
            style={cosmeticAvatarFilter(0.4)}
            aria-hidden="true"
          >
            <AvatarView
              src={avatarUrl}
              name={displayName}
              className="navbar-avatar"
              glyphSize={16}
            />
          </span>
        </Link>
      </div>
    </header>
  );
}

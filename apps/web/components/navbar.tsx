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
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { revisionsEnabled } from "@/lib/lessons/revisions-enabled";
import { dailyRecallState } from "@/lib/revisions/daily-recall";
import { AvatarView } from "./avatar-view";
import { FriendsPanel } from "./friends-panel";
import { GlobalSearch } from "./global-search";
import { NewsButton } from "./news-button";
import { NotificationPanel } from "./notification-panel";
import { RevisionsButton } from "./revisions-button";
import { WrappedChip } from "./wrapped-chip";
import { NavigationLocation } from "./navigation-location";
import { BastionLogo } from "./bastion-logo";

const headerStyle: React.CSSProperties & { "--chrome-panel-top": string } = {
  height: NAVBAR_HEIGHT,
  "--chrome-panel-top": `${String(NAVBAR_HEIGHT + 8)}px`,
};

/**
 * The day's recall as the navbar offers it: null while spaced repetition is
 * switched off in the settings (no button then),
 * else whether it waits, as the window will find it (dailyRecallState draws the
 * day on its first read with a card due, once, as the dashboard does). Never a
 * count. A failure to read it costs the mark, not the navbar.
 */
async function recallEntry(userId: string): Promise<{ waiting: boolean } | null> {
  if (!(await revisionsEnabled(userId))) return null;
  try {
    return { waiting: (await dailyRecallState(userId)) === "todo" };
  } catch (err) {
    logger.warn({ scope: "navbar.recall", err: errorMessage(err) }, "day's recall unreadable");
    return { waiting: false };
  }
}

export async function Navbar(): Promise<React.ReactElement> {
  let displayName = "";
  let avatarUrl: string | null = null;
  let unreadCount = 0;
  let friendRequestCount = 0;
  let recall: { waiting: boolean } | null = null;
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
      // opened - nobody pays for friends they are not looking at. The day's
      // recall reads its stored session (drawn once a day).
      [unreadCount, friendRequestCount, recall] = await Promise.all([
        notificationRepository.findUnreadCount(userId),
        friendshipRepository.countIncoming(userId),
        recallEntry(userId),
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
    <header className="shrink-0 navbar-header" style={headerStyle}>
      {/* ── Sidebar trigger (hamburger). The wordmark is the sidebar's: written
          here too, the name of the site stood twice on the same screen. ── */}
      <SidebarTrigger style={{ width: 44, height: 44, flexShrink: 0 }} />
      <Link
        className="chrome-mobile-brand"
        href="/dashboard"
        aria-label="CyberLearn, tableau de bord"
      >
        <BastionLogo size={25} />
      </Link>
      <NavigationLocation />

      {/* ── Search (hidden on mobile) ───────────────────────────────────── */}
      <GlobalSearch />

      {/* ── Mobile spacer: push actions to the right ────────────────────── */}
      <div className="chrome-mobile-spacer" />

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="chrome-actions">
        {/* Wrapped turns up here in December and is gone again in January. */}
        {userId && wrapped.open && <WrappedChip periodKey={wrapped.periodKey} />}
        {/* The release notes: news, announced where the other news arrives. */}
        <NewsButton />
        {userId && <FriendsPanel initialRequestCount={friendRequestCount} />}
        {/* The day's recall, a window over the page: not a page of the sidebar. */}
        {userId && recall !== null && <RevisionsButton waiting={recall.waiting} />}
        {/* Notification panel (client component with Realtime subscription) */}
        {userId && <NotificationPanel initialUnreadCount={unreadCount} userId={userId} />}
        {/* The settings, behind their icon: a section's address, which the
            settings drawer opens over the page instead of following it (see
            settings/_components/SettingsDrawer). Not prefetched: the page is
            never navigated to from here, the drawer loads its own data. */}
        <Link
          href="/settings/profile"
          prefetch={false}
          className="navbar-icon-link"
          title="Paramètres"
          aria-label="Paramètres"
          aria-haspopup="dialog"
        >
          <Settings size={16} strokeWidth={1.75} aria-hidden="true" />
        </Link>

        {/* The avatar, a link to the profile. The level is no longer written
            here: the sidebar's account block already says it on every page. */}
        <Link href="/profile" className="navbar-me" title="Mon profil" aria-label="Mon profil">
          <span className="chrome-profile-name">{displayName || "Mon profil"}</span>
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

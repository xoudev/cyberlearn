import React from "react";
import Image from "next/image";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NAVBAR_HEIGHT } from "@/lib/chrome";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";
import { computeLevel, wrappedWindow } from "@cyberlearn/lib";
import { getRequestUser, getSharedUserProfile } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { glyphPath } from "@/lib/avatar/glyphs";
import { friendshipRepository, notificationRepository } from "@cyberlearn/db";
import { FriendsPanel } from "./friends-panel";
import { GlobalSearch } from "./global-search";
import { NotificationPanel } from "./notification-panel";
import { WrappedChip } from "./wrapped-chip";

// ── Glyph avatar helper ────────────────────────────────────────────────────────
// avatarUrl stored as "__glyph:{name}" - never pass to next/image. The paths
// themselves live in lib/avatar/glyphs, which is the one copy of them.

function GlyphAvatar({ name, size }: { name: string; size: number }): React.ReactElement {
  const d = glyphPath(name);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--cosmetic-accent)"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d !== null ? <path d={d} /> : <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}

export async function Navbar(): Promise<React.ReactElement> {
  let level = 1;
  let initials = "??";
  let avatarUrl: string | null = null;
  let unreadCount = 0;
  let friendRequestCount = 0;
  let userId = "";

  try {
    const [authUser, dbUser] = await Promise.all([getRequestUser(), getSharedUserProfile()]);

    userId = authUser?.id ?? "";
    level = computeLevel(dbUser?.xpTotal ?? 0).level;
    // Resolve "__upload:" markers to short-lived signed URLs before the value
    // reaches the render branch. Built-ins, "__glyph:" markers and null pass
    // through unchanged, so the rendering logic below is untouched.
    avatarUrl = await resolveAvatarSrc(dbUser?.avatarUrl ?? null);

    const name = dbUser?.displayName ?? "";
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const p0 = parts[0];
    const p1 = parts[1];
    if (p0 && p1) {
      initials = (p0.charAt(0) + p1.charAt(0)).toUpperCase();
    } else if (p0) {
      initials = p0.slice(0, 2).toUpperCase();
    }

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
        borderBottom: "1px solid #2A2560",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      {/* ── Sidebar trigger (hamburger) ─────────────────────────────────── */}
      <SidebarTrigger style={{ width: 26, height: 26, flexShrink: 0 }} />

      {/* ── Mobile logo - only shown when sidebar is hidden in drawer ────── */}

      {/* ── Search (hidden on mobile) ───────────────────────────────────── */}
      <GlobalSearch />

      {/* ── Mobile spacer: push actions to the right ────────────────────── */}
      <div className="flex-1 md:hidden" />

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {/* Wrapped turns up here in December and is gone again in January. */}
        {userId && wrapped.open && <WrappedChip periodKey={wrapped.periodKey} />}
        {userId && <FriendsPanel initialRequestCount={friendRequestCount} />}
        {/* Notification panel (client component with Realtime subscription) */}
        {userId && <NotificationPanel initialUnreadCount={unreadCount} userId={userId} />}

        {/* Level pill → links to profile */}
        <Link
          href="/profile"
          className="navbar-level-link"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 12px 0 4px",
            height: 34,
            border: "1px solid #2A2560",
            borderRadius: 2,
            background: "color-mix(in srgb, var(--cosmetic-accent) 3%, transparent)",
          }}
        >
          {/* Hexagon avatar */}
          {(() => {
            const glyphName = avatarUrl?.startsWith("__glyph:") ? avatarUrl.slice(8) : null;
            const isRealUrl = avatarUrl && !avatarUrl.startsWith("__glyph:");
            return (
              <div
                style={{
                  width: 26,
                  height: 26,
                  clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)",
                  flexShrink: 0,
                  overflow: "hidden",
                  background: glyphName
                    ? "color-mix(in srgb, var(--cosmetic-accent) 8%, transparent)"
                    : isRealUrl
                      ? "transparent"
                      : "linear-gradient(135deg, #0024FF, var(--cosmetic-accent))",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 11,
                  color: "#030219",
                  // equipped hexagon glow + frame on the user's own avatar
                  ...cosmeticAvatarFilter(0.4),
                }}
                aria-hidden="true"
              >
                {glyphName ? (
                  <GlyphAvatar name={glyphName} size={16} />
                ) : isRealUrl && avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt=""
                    width={26}
                    height={26}
                    style={{ objectFit: "cover", width: "100%", height: "100%" }}
                  />
                ) : (
                  initials
                )}
              </div>
            );
          })()}

          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--cosmetic-accent)",
              letterSpacing: "0.04em",
            }}
          >
            LVL·{level}
          </span>
        </Link>
      </div>
    </header>
  );
}

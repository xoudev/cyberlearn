import React from "react";
import Image from "next/image";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";
import { computeLevel } from "@cyberlearn/lib";
import { getRequestUser, getSharedUserProfile } from "@/lib/auth";
import { resolveAvatarSrc } from "@/lib/avatar/storage";
import { notificationRepository } from "@cyberlearn/db";
import { NotificationPanel } from "./notification-panel";

// ── Glyph avatar helper ────────────────────────────────────────────────────────
// avatarUrl stored as "__glyph:{name}" - never pass to next/image

const GLYPH_PATHS: Record<string, string> = {
  skull:
    "M12 4a6 6 0 0 0-6 6c0 2.1 1 4 2.6 5.2V17h6.8v-1.8A6 6 0 0 0 12 4zm-1.5 13v1.5a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5V17h-3zM9 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zm4 0a1 1 0 1 1 2 0 1 1 0 0 1-2 0z",
  ghost:
    "M12 3a7 7 0 0 0-7 7v9l2-2 2 2 2-2 2 2 2-2 2 2v-9a7 7 0 0 0-7-7zm-2 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm4 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z",
  matrix:
    "M4 4h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2zM4 8h2v2H4zm8 0h2v2h-2zM4 12h2v2H4zm4 0h2v2H8zm4 0h2v2h-2zM8 16h2v2H8zm4 0h2v2h-2zm4 0h2v2h-2z",
  circuit:
    "M2 12h3M19 12h3M12 2v3M12 19v3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  bug: "M9 3h6l-1 3H10zm3 4a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0v-1a5 5 0 0 0-5-5zM4 10H2m20 0h-2M4 7l2 2m12-2-2 2M4 17l2-2m12 2-2-2",
  key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
  shield:
    "M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6l-8-4zm0 4l5 2.5v4.5c0 3-2 5.8-5 6.75-3-.95-5-3.75-5-6.75V8.5L12 6z",
  wire: "M4 12h4l3-8 4 16 3-8h2",
};

function GlyphAvatar({ name, size }: { name: string; size: number }): React.ReactElement {
  const d = GLYPH_PATHS[name];
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
      {d ? <path d={d} /> : <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}

export async function Navbar(): Promise<React.ReactElement> {
  let level = 1;
  let initials = "??";
  let avatarUrl: string | null = null;
  let unreadCount = 0;
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
      unreadCount = await notificationRepository.findUnreadCount(userId);
    }
  } catch {
    // Unauthenticated or DB error - render with fallback values
  }

  return (
    <header
      className="shrink-0 navbar-header"
      style={{
        display: "flex",
        alignItems: "center",
        height: 56,
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
      <form
        method="get"
        action="/lessons"
        className="hidden md:block"
        style={{ flex: 1, maxWidth: 480, margin: "0 auto", position: "relative" }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="none"
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#6F6B99",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        <input
          type="search"
          name="q"
          placeholder="/ search lessons, paths, badges"
          className="navbar-search-input"
          style={{
            width: "100%",
            height: 34,
            padding: "0 42px 0 36px",
            background: "rgba(5,4,26,0.8)",
            border: "1px solid #2A2560",
            borderRadius: 2,
            color: "#F5F5FA",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
            outline: "none",
          }}
          aria-label="Rechercher"
        />

        <span
          style={{
            position: "absolute",
            right: 8,
            top: "50%",
            transform: "translateY(-50%)",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#6F6B99",
            border: "1px solid #2A2560",
            padding: "1px 5px",
            borderRadius: 2,
            pointerEvents: "none",
          }}
        >
          ⌘K
        </span>
      </form>

      {/* ── Mobile spacer: push actions to the right ────────────────────── */}
      <div className="flex-1 md:hidden" />

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
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

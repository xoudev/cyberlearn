"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { AvatarView } from "@/components/avatar-view";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { useQueryDialog } from "@/hooks/use-query-dialog";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";
import {
  isActiveHref,
  sidebarGroups,
  type SidebarIcon,
  type SidebarItem,
} from "@/lib/sidebar/items";

interface SidebarNavProps {
  /** Shown only when there is at least one class to follow - not merely a role. */
  hasClasses: boolean;
  /** False once someone has switched spaced repetition off in their settings. */
  showRevisions: boolean;
  /** Duel invitations waiting on the reader's answer, counted beside « Duels ». */
  duelInvitations: number;
  level: number;
  rankName: string;
  displayName: string;
  /** Already resolved: a signed URL, a built-in path, a glyph marker, or null. */
  avatarSrc: string | null;
}

// ── Icons: one stroke, 16px ───────────────────────────────────────────────────

const STROKE = {
  viewBox: "0 0 16 16",
  width: 16,
  height: 16,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

function NavIcon({ name }: { name: SidebarIcon }): React.ReactElement {
  switch (name) {
    case "dashboard":
      return (
        <svg {...STROKE}>
          <rect x="2" y="2" width="5" height="5" />
          <rect x="9" y="2" width="5" height="5" />
          <rect x="2" y="9" width="5" height="5" />
          <rect x="9" y="9" width="5" height="5" />
        </svg>
      );
    case "route":
      return (
        <svg {...STROKE}>
          <circle cx="4" cy="3.5" r="1.6" />
          <circle cx="12" cy="12.5" r="1.6" />
          <path d="M4 5.2V8c0 2 2 2 4 2s4 0 4 1.5" />
        </svg>
      );
    case "book":
      return (
        <svg {...STROKE}>
          <path d="M2.5 3H8v10H3.5c-.5 0-1 .5-1 1V3z" />
          <path d="M13.5 3H8v10h4.5c.5 0 1 .5 1 1V3z" />
        </svg>
      );
    case "review":
      return (
        <svg {...STROKE}>
          <path d="M13.5 2.5C11.5 1 9 .5 6.5 1.5 3 3 1.5 7 3 10.5 4.5 14 8.5 15.5 12 14" />
          <path d="M11 11l3 3v-4" />
        </svg>
      );
    case "flash":
      return (
        <svg {...STROKE}>
          <path d="M9 1.5L4 9h4l-1 5.5L12 7H8z" />
        </svg>
      );
    case "note":
      return (
        <svg {...STROKE}>
          <path d="M3.5 2h6l3 3v9h-9z" />
          <path d="M6 6.5h4M6 9.5h4" />
        </svg>
      );
    case "glossary":
      // A page of words under a magnifier: the definitions to look up.
      return (
        <svg {...STROKE}>
          <path d="M3 2h7l2 2v4.5" />
          <path d="M3 2v12h5" />
          <path d="M5.5 5.5h4M5.5 8h2.5" />
          <circle cx="11" cy="11.5" r="2.2" />
          <path d="M12.6 13.1l1.6 1.6" />
        </svg>
      );
    case "profile":
      // Somebody's head and shoulders: their own page.
      return (
        <svg {...STROKE}>
          <circle cx="8" cy="5.5" r="2.8" />
          <path d="M2.5 14.5c0-3 2.4-4.8 5.5-4.8s5.5 1.8 5.5 4.8" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...STROKE}>
          <path d="M5 2h6v6c0 2.2-1.8 4-3 4S5 10.2 5 8V2z" />
          <path d="M5 4H3.5c0 2 1 3 1.5 3M11 4h1.5c0 2-1 3-1.5 3M8 12v2M6 14h4" />
        </svg>
      );
    case "forum":
      return (
        <svg {...STROKE}>
          <path d="M1.5 3.5H11V10H5l-2.5 2.2V10h-1z" />
          <path d="M13 6h1.5v6.5h-1v1.7l-2-1.7H7" />
        </svg>
      );
    case "duel":
      // Two crossed blades: a match between two people.
      return (
        <svg {...STROKE}>
          <path d="M2.5 2.5l8 8M13.5 2.5l-8 8" />
          <path d="M9 12.5l3.5-3.5M7 12.5L3.5 9M11.5 13.5l2-2M4.5 13.5l-2-2" />
        </svg>
      );
    case "classes":
      return (
        <svg {...STROKE}>
          <circle cx="6" cy="5" r="2.2" />
          <path d="M1.5 13.5c0-2.6 1.8-4 4.5-4s4.5 1.4 4.5 4" />
          <circle cx="11.5" cy="5.5" r="1.8" />
          <path d="M12 9.6c1.8.3 2.8 1.6 2.8 3.4" />
        </svg>
      );
    case "locker":
      return (
        <svg {...STROKE}>
          <path d="M8 1.5L14 5v6l-6 3.5L2 11V5z" />
          <circle cx="8" cy="8" r="2" />
        </svg>
      );
    case "support":
      // A life-buoy: help, rather than a speech bubble that would read as the forum.
      return (
        <svg {...STROKE}>
          <circle cx="8" cy="8" r="6.2" />
          <circle cx="8" cy="8" r="2.4" />
          <path d="M3.7 3.7l2.6 2.6M9.7 9.7l2.6 2.6M12.3 3.7L9.7 6.3M6.3 9.7l-2.6 2.6" />
        </svg>
      );
  }
}

function SignOutButton({ onClick }: { onClick: () => void }): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sidebar-icon-btn sidebar-signout"
      title="Déconnexion"
      aria-label="Déconnexion"
    >
      <svg {...STROKE}>
        <path d="M6 3H3v10h3" />
        <path d="M10 5l3 3-3 3" />
        <path d="M13 8H6" />
      </svg>
    </button>
  );
}

/** What an entry shows: its icon, its label, and its count when it has one. */
function NavItemInside({ item }: { item: SidebarItem }): React.ReactElement {
  return (
    <>
      <span className="sidebar-nav-icon">
        <NavIcon name={item.icon} />
      </span>
      <span className="sidebar-label sidebar-nav-text">{item.label}</span>
      {item.count !== null && (
        <span
          className="sidebar-label sidebar-nav-count"
          aria-label={item.countLabel ?? `${String(item.count)} à faire`}
        >
          {item.count}
        </span>
      )}
    </>
  );
}

/**
 * An entry that opens a window over the page rather than leading to one: the
 * day's recall, under "Révisions". A button, since nothing is navigated to;
 * on a phone the drawer closes so the window is not drawn behind it.
 */
function DialogNavItem({
  item,
  opens,
  collapsed,
  active,
}: {
  item: SidebarItem;
  opens: { query: string; value: string };
  collapsed: boolean;
  active: boolean;
}): React.ReactElement {
  const dialog = useQueryDialog(opens.query);
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <button
      type="button"
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className="sidebar-nav-item"
      onClick={() => {
        if (isMobile) setOpenMobile(false);
        dialog.open(opens.value);
      }}
    >
      <NavItemInside item={item} />
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * The sidebar: the pages of the site in four groups under the dashboard
 * (lib/sidebar/items.ts), and the account block.
 *
 * Folded, it keeps the icons and loses the words; on a phone it is the drawer
 * the navbar's button opens, always unfolded. It counts one thing, the duel
 * invitations waiting on the reader; "Révisions" opens the day's recall
 * without saying how much waits behind it.
 *
 * The account block is who is signed in, a link to their profile and the way
 * out. The small links it used to carry are gone: news and settings are in
 * the navbar, the locker is listed with the rewards, help with the community.
 */
export function SidebarNav({
  hasClasses,
  showRevisions,
  duelInvitations,
  level,
  rankName,
  displayName,
  avatarSrc,
}: SidebarNavProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { state, isMobile } = useSidebar();
  // On mobile the sidebar is always shown expanded inside the drawer.
  const collapsed = !isMobile && state === "collapsed";

  async function handleSignOut(): Promise<void> {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }
  const signOut = (): void => {
    void handleSignOut();
  };

  const groups = sidebarGroups({ hasClasses, showRevisions, duelInvitations });

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Link href="/dashboard" aria-label="CyberLearn · accueil" className="sidebar-logo">
        <Image src="/icon_app.png" alt="" width={26} height={26} priority />
        <span className="sidebar-label sidebar-wordmark">
          cyber<em>learn</em>
        </span>
      </Link>

      <div className="sidebar-scroll">
        {groups.map((group) => (
          <nav
            key={group.key}
            className="sidebar-group"
            aria-label={group.label ?? "Tableau de bord"}
          >
            {group.label !== null && (
              <span className="sidebar-label sidebar-group-label">{group.label}</span>
            )}
            {group.items.map((item) => {
              const active = isActiveHref(pathname, item.href);
              if (item.opens !== undefined) {
                return (
                  <DialogNavItem
                    key={item.href}
                    item={item}
                    opens={item.opens}
                    collapsed={collapsed}
                    active={active}
                  />
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className="sidebar-nav-item"
                >
                  <NavItemInside item={item} />
                </Link>
              );
            })}
          </nav>
        ))}
      </div>

      {/* ── Account block ─────────────────────────────────────────────────── */}
      <div className="sidebar-account">
        <div className="sidebar-account-row">
          <Link href="/profile" className="sidebar-account-user" title="Mon profil">
            {/* The equipped hexagon glow is a filter on the frame, so the whole
                hexagon carries it: the AvatarView draws, this span frames. */}
            <span className="sidebar-avatar-frame" style={cosmeticAvatarFilter(0.35)}>
              <AvatarView
                src={avatarSrc}
                name={displayName}
                className="sidebar-avatar"
                glyphSize={16}
              />
            </span>
            <span className="sidebar-label sidebar-account-text">
              <b>{displayName}</b>
              <span>
                Niveau {level} · {rankName}
              </span>
            </span>
          </Link>
          {!collapsed && <SignOutButton onClick={signOut} />}
        </div>
        {/* Folded, the row has room for the avatar alone: the way out goes under it. */}
        {collapsed && (
          <div className="sidebar-account-rail">
            <SignOutButton onClick={signOut} />
          </div>
        )}
      </div>
    </div>
  );
}

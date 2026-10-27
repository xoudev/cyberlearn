"use client";

// Client boundary: active routes, account controls and the responsive drawer follow navigation state.

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { useMediaQuery } from "@/hooks/use-media-query";
import { AvatarView } from "@/components/avatar-view";
import { BastionLogo } from "@/components/bastion-logo";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
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
  /** Duel invitations waiting on the reader's answer, counted beside « Duels ». */
  duelInvitations: number;
  level: number;
  rankName: string;
  displayName: string;
  /** Already resolved: a signed URL, a built-in path, a glyph marker, or null. */
  avatarSrc: string | null;
}

// Angular strokes follow the Bastion mark; each glyph still describes its destination.

const STROKE: React.SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "square",
  strokeLinejoin: "miter",
  "aria-hidden": true,
};

function NavIcon({ name }: { name: SidebarIcon }): React.ReactElement {
  switch (name) {
    case "dashboard":
      return (
        <svg {...STROKE}>
          <rect x="3" y="3" width="7.5" height="7.5" />
          <rect x="13.5" y="3" width="7.5" height="7.5" />
          <rect x="3" y="13.5" width="7.5" height="7.5" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" />
        </svg>
      );
    case "route":
      return (
        <svg {...STROKE}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="18" r="3" />
          <path d="M8.5 7.5C12 9.5 12 14.5 15.5 16.5" />
          <circle cx="18" cy="6" r="2" />
        </svg>
      );
    case "book":
      return (
        <svg {...STROKE}>
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z" />
          <path d="M8 7h8M8 11h5" />
        </svg>
      );
    case "flash":
      return (
        <svg {...STROKE}>
          <path d="M13 2L4 14h7l-1 8 10-12h-7l0-8Z" />
        </svg>
      );
    case "note":
      return (
        <svg {...STROKE}>
          <path d="M6 3h8l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
          <path d="M14 3v5h5M8.5 12h7M8.5 16h5" />
        </svg>
      );
    case "glossary":
      // A page of words under a magnifier: the definitions to look up.
      return (
        <svg {...STROKE}>
          <path d="M12 2.5l7.5 4.3v8.4L12 19.5l-7.5-4.3V6.8L12 2.5Z" />
          <circle cx="12" cy="11" r="3" />
        </svg>
      );
    case "profile":
      // Somebody's head and shoulders: their own page.
      return (
        <svg {...STROKE}>
          <rect x="3" y="4" width="18" height="12" />
          <circle cx="12" cy="10" r="2.5" />
          <path d="M9.5 16L8 21l4-2 4 2-1.5-5" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...STROKE}>
          <path d="M7 3h10v6a5 5 0 0 1-10 0V3Z" />
          <path d="M7 5H4.5a2.5 2.5 0 0 0 0 5H7M17 5h2.5a2.5 2.5 0 0 1 0 5H17M12 14v5M8 19h8" />
        </svg>
      );
    case "forum":
      return (
        <svg {...STROKE}>
          <path d="M4 5h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8l-4 3V7a2 2 0 0 1 2-2Z" />
          <path d="M8 9.5h8M8 12.5h5" />
        </svg>
      );
    case "duel":
      return (
        <svg {...STROKE}>
          <path d="M4 4l11 11M20 4L9 15" />
          <path d="M13 17l4-4M11 17l-4-4M16 19l3-3M8 19l-3-3" />
        </svg>
      );
    case "classes":
      return (
        <svg {...STROKE}>
          <circle cx="9" cy="7.5" r="3.2" />
          <path d="M3 19.5c0-3.3 2.5-5.5 6-5.5s6 2.2 6 5.5" />
          <circle cx="16.5" cy="8.5" r="2.5" />
          <path d="M17.5 14.2c2.2.4 3.5 2 3.5 4.8" />
        </svg>
      );
    case "locker":
      return (
        <svg {...STROKE}>
          <path d="M12 2.5L20 7v10l-8 4.5L4 17V7l8-4.5Z" />
          <circle cx="12" cy="12" r="2.8" />
        </svg>
      );
    case "support":
      return (
        <svg {...STROKE}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3.5" />
          <path d="M5.6 5.6l3.9 3.9M14.5 14.5l3.9 3.9M18.4 5.6l-3.9 3.9M9.5 14.5l-3.9 3.9" />
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
        <path d="M9 4H5v16h4" />
        <path d="M15 8l4 4-4 4" />
        <path d="M19 12H9" />
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

// ── Main component ────────────────────────────────────────────────────────────

export function SidebarNav({
  hasClasses,
  duelInvitations,
  level,
  rankName,
  displayName,
  avatarSrc,
}: SidebarNavProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { state, setOpenMobile } = useSidebar();
  // Match this streamed component's server snapshot even when the provider hydrated first.
  const isMobile = useMediaQuery("(max-width: 1023px)");
  const [accountOpen, setAccountOpen] = useState(false);
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

  const groups = sidebarGroups({ hasClasses, duelInvitations });
  const accountIdentity = (
    <>
      <span className="sidebar-avatar-frame" style={cosmeticAvatarFilter(0.35)}>
        <AvatarView src={avatarSrc} name={displayName} className="sidebar-avatar" glyphSize={16} />
      </span>
      <span className="sidebar-label sidebar-account-text">
        <b>{displayName}</b>
        <span>
          Niveau {level} · {rankName}
        </span>
      </span>
    </>
  );

  return (
    <div
      className="chrome-sidebar flex flex-col flex-1 overflow-hidden"
      onKeyDown={(event) => {
        if (event.key === "Escape") setAccountOpen(false);
      }}
    >
      <Link
        href="/dashboard"
        aria-label="CyberLearn · accueil"
        className="sidebar-logo"
        onClick={() => {
          if (isMobile) setOpenMobile(false);
        }}
      >
        <BastionLogo size={32} />
        <span className="sidebar-label sidebar-wordmark">
          CYBERLEARN<em>.</em>
        </span>
      </Link>
      {isMobile && (
        <button
          type="button"
          className="sidebar-mobile-close"
          aria-label="Fermer le menu"
          onClick={() => {
            setOpenMobile(false);
          }}
        >
          <svg {...STROKE}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}

      <div className="sidebar-scroll">
        {groups.map((group, groupIndex) => (
          <nav
            key={group.key}
            className="sidebar-group"
            aria-label={group.label ?? "Tableau de bord"}
          >
            {group.label !== null && (
              <span className="sidebar-label sidebar-group-label">
                <span aria-hidden="true">{String(groupIndex).padStart(2, "0")}</span>
                {group.label}
              </span>
            )}
            {group.items.map((item) => {
              const active = isActiveHref(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className="sidebar-nav-item"
                  onClick={() => {
                    if (isMobile) setOpenMobile(false);
                  }}
                >
                  <NavItemInside item={item} />
                </Link>
              );
            })}
          </nav>
        ))}
      </div>

      {/* ── Account block (layered profile card + Support / Déconnexion tray) ── */}
      <div className="sidebar-account">
        {!collapsed && accountOpen && (
          <div
            id="sidebar-account-actions"
            className="sidebar-account-tray"
            role="group"
            aria-label="Actions du compte"
          >
            <Link
              href="/profile"
              className="sidebar-account-tray-btn"
              onClick={() => {
                setAccountOpen(false);
                if (isMobile) setOpenMobile(false);
              }}
            >
              Mon profil
            </Link>
            <Link
              href="/support"
              className="sidebar-account-tray-btn"
              onClick={() => {
                setAccountOpen(false);
                if (isMobile) setOpenMobile(false);
              }}
            >
              Support
            </Link>
          </div>
        )}
        <div className="sidebar-account-row">
          {collapsed ? (
            <Link href="/profile" className="sidebar-account-user" title="Mon profil">
              {accountIdentity}
            </Link>
          ) : (
            <button
              type="button"
              className="sidebar-account-user"
              aria-expanded={accountOpen}
              aria-controls={accountOpen ? "sidebar-account-actions" : undefined}
              aria-label={`Compte de ${displayName}`}
              onClick={() => {
                setAccountOpen((previous) => !previous);
              }}
            >
              {accountIdentity}
              <span className="sidebar-account-toggle" aria-hidden="true">
                {accountOpen ? "−" : "+"}
              </span>
            </button>
          )}
          {!collapsed && <SignOutButton onClick={signOut} />}
        </div>
        {collapsed && (
          <div className="sidebar-account-rail">
            <SignOutButton onClick={signOut} />
          </div>
        )}
      </div>
    </div>
  );
}

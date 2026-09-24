"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";
import { CHANGELOG_SEEN_KEY, LATEST_VERSION } from "@/lib/changelog/entries";
import { formatNumberFr } from "@cyberlearn/lib";

interface SidebarNavProps {
  /** Shown only when there is at least one class to follow - not merely a role. */
  hasClasses?: boolean;
  /** False once someone has switched spaced repetition off in their settings. */
  showRevisions?: boolean;
  inProgressCount?: number;
  level?: number;
  xpCurrent?: number;
  xpNeeded?: number;
  xpPercent?: number;
}

// ── Custom SVG icons (per reference DashV2Shell.jsx) ──────────────────────────

function IconDashboard() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="5" height="5" />
      <rect x="9" y="2" width="5" height="5" />
      <rect x="2" y="9" width="5" height="5" />
      <rect x="9" y="9" width="5" height="5" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 3 H8 V13 H3.5 C3 13 2.5 13.5 2.5 14 V3 Z" />
      <path d="M13.5 3 H8 V13 H12.5 C13 13 13.5 13.5 13.5 14 V3 Z" />
    </svg>
  );
}
function IconRoute() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="4" cy="3" r="1.5" />
      <circle cx="12" cy="13" r="1.5" />
      <path d="M4 4.5 V8 C4 10 6 10 8 10 C10 10 12 10 12 11.5" />
    </svg>
  );
}
function IconBadge() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.5 L10 3 L12.5 2.7 L13 5.2 L14.5 7 L13 8.8 L12.5 11.3 L10 11 L8 12.5 L6 11 L3.5 11.3 L3 8.8 L1.5 7 L3 5.2 L3.5 2.7 L6 3 Z" />
      <circle cx="8" cy="7" r="2" />
    </svg>
  );
}
function IconCert() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="12" height="8" />
      <path d="M5 13.5 L6.5 11.5" />
      <path d="M11 13.5 L9.5 11.5" />
      <circle cx="8" cy="7" r="1.5" />
    </svg>
  );
}
function IconReview() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13.5 2.5 C11.5 1 9 0.5 6.5 1.5 C3 3 1.5 7 3 10.5 C4.5 14 8.5 15.5 12 14" />
      <polyline points="11,11 14,14 14,10" />
    </svg>
  );
}
function IconUser() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="5" r="2.5" />
      <path d="M2.5 14 C2.5 11 4.5 10 8 10 C11.5 10 13.5 11 13.5 14" />
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 2 H11 V8 C11 10.2 9.2 12 7 12 C4.8 12 3 10.2 3 8 V2" />
      <path d="M3 4 H1.5 C1.5 6 2.5 7 3 7" />
      <path d="M11 4 H12.5 C12.5 6 11.5 7 11 7" />
      <path d="M7 12 V14 M5 14 H9" />
    </svg>
  );
}
function IconFlash() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 2 L4 9 H8 L7 14 L12 7 H8 Z" />
    </svg>
  );
}

function IconLocker() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.5 14 5v6L8 14.5 2 11V5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function IconNote() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 2h6l3 3v9h-9z" />
      <path d="M6 6.5h4M6 9.5h4" />
    </svg>
  );
}

function IconForum() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1.5 3.5 H11 V10 H5 L2.5 12.2 V10 H1.5 Z" />
      <path d="M13 6 H14.5 V12.5 H13.5 V14.2 L11.5 12.5 H7" />
    </svg>
  );
}

/* A life-buoy: help, rather than a speech bubble that would read as the forum. */
function IconSupport() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="8" cy="8" r="6.2" />
      <circle cx="8" cy="8" r="2.4" />
      <line x1="3.7" y1="3.7" x2="6.3" y2="6.3" />
      <line x1="9.7" y1="9.7" x2="12.3" y2="12.3" />
      <line x1="12.3" y1="3.7" x2="9.7" y2="6.3" />
      <line x1="6.3" y1="9.7" x2="3.7" y2="12.3" />
    </svg>
  );
}

function IconNews() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 6.5 L9 4 V12 L2.5 9.5 Z" />
      <path d="M9 4 L13 2.5 V13.5 L9 12" />
      <path d="M4 9.5 V12.5 H6" />
    </svg>
  );
}

// ── Nav sections ──────────────────────────────────────────────────────────────

/**
 * The learning section, in order, including the one entry that can be switched
 * off.
 *
 * Revisions used to be rendered separately, above this list, because they are
 * conditional. The order then lived in two places - a constant and a branch -
 * and the branch took the first slot: somebody with revisions on opened the
 * site to a sidebar whose first entry was not the dashboard. `optional` keeps
 * the whole order here, where it can be read in one go.
 */
const LEARN_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard, badgeKey: null, optional: false },
  { href: "/lessons", label: "Leçons", Icon: IconBook, badgeKey: "lessons", optional: false },
  // Next to the lessons, because that is what they revise.
  { href: "/revisions", label: "Révisions", Icon: IconReview, badgeKey: null, optional: true },
  { href: "/notes", label: "Bloc-notes", Icon: IconNote, badgeKey: null, optional: false },
  { href: "/paths", label: "Parcours", Icon: IconRoute, badgeKey: null, optional: false },
  { href: "/badges", label: "Badges", Icon: IconBadge, badgeKey: null, optional: false },
  {
    href: "/certificates",
    label: "Certificats",
    Icon: IconCert,
    badgeKey: null,
    optional: false,
  },
] as const;

const ACTIVITY_ITEMS = [
  { href: "/forum", label: "Forum", Icon: IconForum, count: null, tag: undefined },
  { href: "/leaderboard", label: "Classement", Icon: IconTrophy, count: null, tag: undefined },
  // WIP tag: the challenges catalog is being rebuilt (content reboot). Drop
  // the tag when the first active challenges ship again.
  { href: "/challenges", label: "Défis", Icon: IconFlash, count: null, tag: "WIP" },
  { href: "/profile", label: "Profil", Icon: IconUser, count: null, tag: undefined },
  { href: "/locker", label: "Casier", Icon: IconLocker, count: null, tag: undefined },
  { href: "/changelog", label: "Nouveautés", Icon: IconNews, count: null, tag: undefined },
  // Filing a ticket used to live at the bottom of the footer, which is where
  // someone looks last and only if they think to look at all. A person with a
  // problem is the least patient reader on the site.
  { href: "/support", label: "Aide & demandes", Icon: IconSupport, count: null, tag: undefined },
] as const;

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-mono)",
        fontWeight: 500,
        fontSize: 10,
        letterSpacing: "0.14em",
        textTransform: "uppercase" as const,
        color: "#6F6B99",
        padding: "0 24px",
        marginBottom: 10,
      }}
    >
      {/* Decorative left line */}
      <span
        style={{ width: 8, height: 1, background: "#44406B", flexShrink: 0 }}
        aria-hidden="true"
      />
      {text}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SidebarNav({
  hasClasses = false,
  showRevisions = true,
  inProgressCount = 0,
  level = 1,
  xpCurrent = 0,
  xpNeeded = 100,
  xpPercent = 0,
}: SidebarNavProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const { state, isMobile } = useSidebar();
  // On mobile the sidebar is always shown expanded inside the Sheet drawer
  const collapsed = !isMobile && state === "collapsed";

  // "New" dot on the changelog item: shown until the user has read the latest
  // release. The custom event lets the dot clear the moment /changelog mounts.
  const [hasUnseenChangelog, setHasUnseenChangelog] = useState(false);
  useEffect(() => {
    const check = (): void => {
      try {
        setHasUnseenChangelog(localStorage.getItem(CHANGELOG_SEEN_KEY) !== LATEST_VERSION);
      } catch {
        setHasUnseenChangelog(false);
      }
    };
    check();
    const clear = (): void => {
      setHasUnseenChangelog(false);
    };
    window.addEventListener("cl-changelog-seen", clear);
    window.addEventListener("storage", check);
    return () => {
      window.removeEventListener("cl-changelog-seen", clear);
      window.removeEventListener("storage", check);
    };
  }, []);
  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  const badgeCounts: Record<string, number> = { lessons: inProgressCount };

  function NavItem({
    href,
    label,
    Icon,
    count,
    tag,
    dot,
  }: {
    href: string;
    label: string;
    Icon: React.ComponentType;
    count?: number | null | undefined;
    tag?: string | undefined;
    dot?: boolean | undefined;
  }) {
    const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        aria-current={isActive ? "page" : undefined}
        className="sidebar-nav-item"
      >
        <span className="sidebar-nav-icon" aria-hidden="true">
          <Icon />
        </span>

        <span
          className="sidebar-label"
          style={{
            flex: 1,
            fontFamily: "var(--font-body)",
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {label}
        </span>

        {count != null && count > 0 && (
          <span className="sidebar-label sidebar-nav-badge">{count}</span>
        )}

        {dot && (
          <span
            className="sidebar-label"
            aria-label="Nouveautés non lues"
            style={{
              marginLeft: "auto",
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: "var(--cosmetic-accent)",
              boxShadow: "0 0 6px var(--cosmetic-accent)",
              flexShrink: 0,
            }}
          />
        )}

        {tag !== undefined && (
          <span
            className="sidebar-label"
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 8.5,
              letterSpacing: "0.12em",
              padding: "2px 6px",
              color: "#FFB020",
              border: "1px solid rgba(255,176,32,0.35)",
              background: "rgba(255,176,32,0.06)",
              flexShrink: 0,
            }}
          >
            {tag}
          </span>
        )}
      </Link>
    );
  }

  const xpNeededToNext = Math.max(xpNeeded - xpCurrent, 0);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Logo area ─────────────────────────────────────────────────────── */}
      <Link
        href="/dashboard"
        aria-label="CyberLearn · accueil"
        className="sidebar-logo-link"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "flex-start",
          gap: 10,
          height: 56,
          padding: collapsed ? 0 : "0 20px",
          borderBottom: "1px solid #1F1B47",
          textDecoration: "none",
          flexShrink: 0,
          marginBottom: 20,
        }}
      >
        <Image
          src="/icon_app.png"
          alt="CyberLearn"
          width={collapsed ? 32 : 28}
          height={collapsed ? 32 : 28}
          priority
          style={{ flexShrink: 0 }}
        />
        {!collapsed && (
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: "-0.01em",
              color: "#F5F5FA",
              whiteSpace: "nowrap",
            }}
          >
            cyber<span style={{ color: "#0AFFD4" }}>learn</span>
          </span>
        )}
      </Link>

      {/* ── Apprendre section ─────────────────────────────────────────────── */}
      {!collapsed && <SectionLabel text="Apprendre" />}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          padding: "0 12px",
          marginBottom: 28,
        }}
        aria-label="Navigation Apprendre"
      >
        {LEARN_ITEMS.filter((item) => !item.optional || showRevisions).map(
          ({ href, label, Icon, badgeKey }) => (
            <NavItem
              key={href}
              href={href}
              label={label}
              Icon={Icon}
              count={badgeKey ? (badgeCounts[badgeKey] ?? 0) : undefined}
            />
          ),
        )}
      </nav>

      {/* ── Activité section ──────────────────────────────────────────────── */}
      {!collapsed && <SectionLabel text="Activité" />}
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          padding: "0 12px",
          marginBottom: 28,
        }}
        aria-label="Navigation Activité"
      >
        {/* Keyed on having a class, not on the role: an entry that leads to a
            page saying "rien ici" is worse than no entry. */}
        {hasClasses && (
          <NavItem
            href="/my-class"
            label="Mes classes"
            Icon={IconUser}
            count={null}
            tag={undefined}
          />
        )}
        {ACTIVITY_ITEMS.map(({ href, label, Icon, count, tag }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            Icon={Icon}
            count={count}
            tag={tag}
            dot={href === "/changelog" && hasUnseenChangelog}
          />
        ))}
      </nav>

      {/* ── XP mini footer ────────────────────────────────────────────────── */}
      <div
        className="sidebar-label mt-auto"
        style={{
          padding: "16px 20px 0",
          borderTop: "1px solid #2A2560",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 10,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 13,
              color: "#F5F5FA",
            }}
          >
            LVL · {level}
          </span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "#6F6B99" }}>
            {formatNumberFr(xpCurrent)}/{formatNumberFr(xpNeeded)}
          </span>
        </div>

        <div
          style={{
            height: 4,
            background: "rgba(5,4,26,0.9)",
            border: "1px solid #2A2560",
            overflow: "hidden",
            position: "relative",
            borderRadius: 1,
          }}
          role="progressbar"
          aria-valuenow={Math.round(xpPercent)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            style={{
              height: "100%",
              width: `${xpPercent.toFixed(1)}%`,
              background: "linear-gradient(90deg, #0024FF, var(--cosmetic-accent))",
              boxShadow: "0 0 10px color-mix(in srgb, var(--cosmetic-accent) 50%, transparent)",
              transition: "width 700ms ease-out",
            }}
          />
        </div>

        <div
          style={{
            marginTop: 10,
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#6F6B99",
            letterSpacing: "0.04em",
          }}
        >
          <b style={{ color: "var(--cosmetic-accent)", fontWeight: 600 }}>
            +{formatNumberFr(xpNeededToNext)} XP
          </b>
          {" → LVL·"}
          {level + 1}
        </div>

        {/* ── Sign out + settings ────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: collapsed ? "column" : "row",
            alignItems: "center",
            gap: collapsed ? 2 : 8,
            marginTop: 12,
          }}
        >
          <button
            type="button"
            onClick={() => {
              void handleSignOut();
            }}
            title={collapsed ? "Déconnexion" : undefined}
            className="sidebar-signout"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 10,
              flex: collapsed ? undefined : 1,
              width: collapsed ? "100%" : undefined,
              padding: collapsed ? "8px 0" : "8px 8px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <path d="M6 3 H3 V13 H6" />
              <path d="M10 5 L13 8 L10 11" />
              <path d="M13 8 H6" />
            </svg>
            {!collapsed && <span>Déconnexion</span>}
          </button>
          <Link
            href="/settings"
            title="Paramètres"
            aria-label="Paramètres"
            className="sidebar-settings"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 8,
              flexShrink: 0,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

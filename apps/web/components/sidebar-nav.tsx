"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSidebar } from "@/components/ui/sidebar";
import { createSupabaseBrowserClient } from "@cyberlearn/db/supabase/client";

interface SidebarNavProps {
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

// ── Nav sections ──────────────────────────────────────────────────────────────

const LEARN_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: IconDashboard, badgeKey: null },
  { href: "/lessons", label: "Leçons", Icon: IconBook, badgeKey: "lessons" },
  { href: "/revisions", label: "Révisions", Icon: IconReview, badgeKey: null },
  { href: "/paths", label: "Parcours", Icon: IconRoute, badgeKey: null },
  { href: "/badges", label: "Badges", Icon: IconBadge, badgeKey: null },
  { href: "/certifs", label: "Certificats", Icon: IconCert, badgeKey: null },
] as const;

const ACTIVITY_ITEMS = [
  { href: "/profile", label: "Profil", Icon: IconUser, count: null },
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
  const supabase = createSupabaseBrowserClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const badgeCounts: Record<string, number> = { lessons: inProgressCount };

  function NavItem({
    href,
    label,
    Icon,
    count,
  }: {
    href: string;
    label: string;
    Icon: React.ComponentType;
    count?: number | null | undefined;
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
      </Link>
    );
  }

  const xpNeededToNext = Math.max(xpNeeded - xpCurrent, 0);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* ── Logo area ─────────────────────────────────────────────────────── */}
      <Link
        href="/dashboard"
        aria-label="CyberLearn — accueil"
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
        {LEARN_ITEMS.map(({ href, label, Icon, badgeKey }) => (
          <NavItem
            key={href}
            href={href}
            label={label}
            Icon={Icon}
            count={badgeKey ? (badgeCounts[badgeKey] ?? 0) : undefined}
          />
        ))}
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
        {ACTIVITY_ITEMS.map(({ href, label, Icon, count }) => (
          <NavItem key={href} href={href} label={label} Icon={Icon} count={count} />
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
            {xpCurrent.toLocaleString("fr-FR")}/{xpNeeded.toLocaleString("fr-FR")}
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
              background: "linear-gradient(90deg, #0024FF, #0AFFD4)",
              boxShadow: "0 0 10px rgba(10,255,212,0.5)",
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
          <b style={{ color: "#0AFFD4", fontWeight: 600 }}>
            +{xpNeededToNext.toLocaleString("fr-FR")} XP
          </b>
          {" → LVL·"}
          {level + 1}
        </div>

        {/* ── Sign out ───────────────────────────────────────────────── */}
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
            width: "100%",
            marginTop: 12,
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
      </div>
    </div>
  );
}

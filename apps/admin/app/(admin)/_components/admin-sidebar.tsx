"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "../_actions/signout";
import { useAdminMobileSidebar } from "./admin-shell-client";

interface SidebarCounts {
  lessons: number;
  paths: number;
  badges: number;
  challenges: number;
  users: number;
  tickets: number;
}

interface AdminSidebarProps {
  initials: string;
  handle: string;
  email: string;
  counts: SidebarCounts;
}

const BORDER = "#1F1B47";
const MUTED = "#6B6890";
const TURQUOISE = "#0AFFD4";

function NavIcon({ name }: { name: string }): React.ReactElement | null {
  const s: React.SVGProps<SVGSVGElement> = {
    width: 15,
    height: 15,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "dash":
      return (
        <svg viewBox="0 0 16 16" {...s}>
          <rect x="2" y="2" width="5" height="5" />
          <rect x="9" y="2" width="5" height="5" />
          <rect x="2" y="9" width="5" height="5" />
          <rect x="9" y="9" width="5" height="5" />
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 16 16" {...s}>
          <path d="M2.5 3 H8 V13 H3.5 C3 13 2.5 13.5 2.5 14 V3 Z" />
          <path d="M13.5 3 H8 V13 H12.5 C13 13 13.5 13.5 13.5 14 V3 Z" />
        </svg>
      );
    case "route":
      return (
        <svg viewBox="0 0 16 16" {...s}>
          <circle cx="4" cy="3" r="1.5" />
          <circle cx="12" cy="13" r="1.5" />
          <path d="M4 4.5 V8 C4 10 6 10 8 10 C10 10 12 10 12 11.5" />
        </svg>
      );
    case "badge":
      return (
        <svg viewBox="0 0 16 16" {...s}>
          <path d="M8 1.5 L10 3 L12.5 2.7 L13 5.2 L14.5 7 L13 8.8 L12.5 11.3 L10 11 L8 12.5 L6 11 L3.5 11.3 L3 8.8 L1.5 7 L3 5.2 L3.5 2.7 L6 3 Z" />
          <circle cx="8" cy="7" r="2" />
        </svg>
      );
    case "target":
      return (
        <svg viewBox="0 0 16 16" {...s}>
          <circle cx="8" cy="8" r="5.5" />
          <circle cx="8" cy="8" r="2.5" />
          <path d="M8 1 V3.5 M8 12.5 V15 M1 8 H3.5 M12.5 8 H15" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 16 16" {...s}>
          <circle cx="6" cy="6" r="2.5" />
          <path d="M2 14 C2 11.5 4 10 6 10 C8 10 10 11.5 10 14" />
          <circle cx="11.5" cy="6.5" r="2" />
          <path d="M14.5 13 C14.5 11 12.5 10.5 11.5 10.5" />
        </svg>
      );
    case "ticket":
      return (
        <svg viewBox="0 0 16 16" {...s}>
          <path d="M2 5 V7 C2.8 7 3.5 7.7 3.5 8.5 C3.5 9.3 2.8 10 2 10 V12 H14 V10 C13.2 10 12.5 9.3 12.5 8.5 C12.5 7.7 13.2 7 14 7 V5 Z" />
          <path d="M6 5 V12 M10 5 V12" strokeDasharray="1.5 1.5" />
        </svg>
      );
    case "shield":
      return (
        <svg viewBox="0 0 16 16" {...s}>
          <path d="M8 1.5 L13.5 3.5 V8 C13.5 11 11 13.5 8 14.5 C5 13.5 2.5 11 2.5 8 V3.5 Z" />
          <path d="M5.8 8 L7.4 9.6 L10.4 6.4" />
        </svg>
      );
    case "log":
      return (
        <svg viewBox="0 0 16 16" {...s}>
          <rect x="2.5" y="2" width="11" height="12" />
          <path d="M5 5 H11 M5 8 H11 M5 11 H8.5" />
        </svg>
      );
    case "cog":
      return (
        <svg viewBox="0 0 16 16" {...s}>
          <circle cx="8" cy="8" r="2" />
          <path d="M8 1.5 V3 M8 13 V14.5 M14.5 8 H13 M3 8 H1.5 M12.6 3.4 L11.5 4.5 M4.5 11.5 L3.4 12.6 M12.6 12.6 L11.5 11.5 M4.5 4.5 L3.4 3.4" />
        </svg>
      );
    default:
      return null;
  }
}

function SectionLabel({ text }: { text: string }): React.ReactElement {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 18px",
        marginBottom: 8,
        fontFamily: "var(--font-mono)",
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: MUTED,
      }}
    >
      <span
        style={{ width: 8, height: 1, background: "#44406B", flexShrink: 0 }}
        aria-hidden="true"
      />
      {text}
    </div>
  );
}

export function AdminSidebar({
  initials,
  handle,
  email,
  counts,
}: AdminSidebarProps): React.ReactElement {
  const pathname = usePathname();
  const { open, close } = useAdminMobileSidebar();

  const mainItems = [
    { label: "Aperçu", href: "/dashboard", icon: "dash", count: null as number | null },
    { label: "Leçons", href: "/lessons", icon: "book", count: counts.lessons },
    { label: "Parcours", href: "/paths", icon: "route", count: counts.paths },
    { label: "Badges", href: "/badges", icon: "badge", count: counts.badges },
    { label: "Classes", href: "/classes", icon: "users" },
    { label: "Challenges", href: "/challenges", icon: "target", count: counts.challenges },
    { label: "Utilisateurs", href: "/users", icon: "users", count: counts.users },
    { label: "Tickets", href: "/tickets", icon: "ticket", count: counts.tickets },
    { label: "Modération", href: "/moderation", icon: "shield" },
  ];

  const sysItems = [
    { label: "Audit log", href: "/audit", icon: "log" },
    { label: "Paramètres", href: "/settings", icon: "cog" },
  ];

  const renderItem = (item: {
    label: string;
    href: string;
    icon: string;
    count?: number | null;
  }): React.ReactElement => {
    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
    const isAlert = item.href === "/tickets" && (item.count ?? 0) > 0;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={close}
        className="a-side-item"
        data-active={isActive}
        aria-current={isActive ? "page" : undefined}
      >
        <span className="a-side-icon">
          <NavIcon name={item.icon} />
        </span>
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.count !== null && item.count !== undefined && (
          <span className="a-side-count" data-alert={isAlert}>
            {item.count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`admin-sidebar-fixed${open ? " sidebar-mobile-open" : ""}`}
      style={{
        position: "fixed",
        top: 58,
        left: 0,
        bottom: 0,
        width: 240,
        zIndex: 30,
        background: "#030219",
        borderRight: `1px solid ${BORDER}`,
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <div style={{ padding: "20px 0 0" }}>
        <SectionLabel text="Gestion" />
        <nav style={{ display: "grid", gap: 1 }}>{mainItems.map(renderItem)}</nav>
      </div>

      <div style={{ padding: "22px 0 0" }}>
        <SectionLabel text="Système" />
        <nav style={{ display: "grid", gap: 1 }}>{sysItems.map(renderItem)}</nav>
      </div>

      <div style={{ flex: 1 }} />

      {/* Identity + sign out */}
      <div style={{ padding: "16px 14px", borderTop: `1px solid ${BORDER}` }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "30px minmax(0, 1fr) auto",
            gap: 10,
            alignItems: "center",
            padding: "10px 11px",
            background: "#0A0826",
            border: `1px solid ${BORDER}`,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              background: "#110F33",
              border: "1px solid #2A2560",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 10.5,
              color: "#B8B5D1",
            }}
          >
            {initials}
          </span>
          <span style={{ minWidth: 0 }}>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 11.5,
                color: "#F5F5FA",
              }}
            >
              {handle}
            </span>
            <span
              style={{
                display: "block",
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                color: MUTED,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {email}
            </span>
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 8.5,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: TURQUOISE,
              border: "1px solid color-mix(in srgb, #0AFFD4 40%, transparent)",
              padding: "2px 6px",
            }}
          >
            Admin
          </span>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="admin-signout"
            style={{
              width: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 9,
              padding: "9px 12px",
              background: "transparent",
              border: `1px solid ${BORDER}`,
              color: MUTED,
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 3 H4 V13 H9" />
              <path d="M11 5 L14 8 L11 11 M14 8 H7" />
            </svg>
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}

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

const DANGER = "#FF4D6D";

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

export function AdminSidebar({
  initials,
  handle,
  email,
  counts,
}: AdminSidebarProps): React.ReactElement {
  const pathname = usePathname();
  const { open, close } = useAdminMobileSidebar();

  const mainItems = [
    {
      label: "Aperçu",
      href: "/dashboard",
      icon: "dash",
      count: null as number | null,
      danger: false,
    },
    { label: "Leçons", href: "/lessons", icon: "book", count: counts.lessons, danger: false },
    { label: "Parcours", href: "/paths", icon: "route", count: counts.paths, danger: false },
    { label: "Badges", href: "/badges", icon: "badge", count: counts.badges, danger: false },
    {
      label: "Challenges",
      href: "/challenges",
      icon: "target",
      count: counts.challenges,
      danger: false,
    },
    { label: "Utilisateurs", href: "/users", icon: "users", count: counts.users, danger: false },
    { label: "Tickets", href: "/tickets", icon: "ticket", count: counts.tickets, danger: true },
  ];

  const sysItems = [
    { label: "Audit Log", href: "/audit", icon: "log" },
    { label: "Paramètres", href: "/settings", icon: "cog" },
  ];

  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: DANGER,
    padding: "0 18px 10px",
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
        borderRight: "1px solid rgba(255,77,109,0.15)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      {/* Main nav */}
      <div style={{ padding: "18px 0 0" }}>
        <div style={sectionLabel}>{"// ADMIN"}</div>
        <nav>
          {mainItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const accentColor = item.danger ? DANGER : "#0AFFD4";
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 14px 9px 18px",
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? accentColor : "#6B6890",
                  background: isActive
                    ? item.danger
                      ? "rgba(255,77,109,0.08)"
                      : "rgba(10,255,212,0.06)"
                    : "transparent",
                  borderLeft: isActive ? `3px solid ${accentColor}` : "3px solid transparent",
                  transition: "all 150ms ease",
                }}
              >
                <NavIcon name={item.icon} />
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.count !== null && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      background: item.danger && item.count > 0 ? DANGER : "rgba(42,37,96,0.6)",
                      color: item.danger && item.count > 0 ? "#fff" : "#6B6890",
                      boxShadow:
                        item.danger && item.count > 0 ? "0 0 8px rgba(255,77,109,0.4)" : "none",
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* System nav */}
      <div style={{ padding: "18px 0 0" }}>
        <div style={sectionLabel}>{"// SYSTÈME"}</div>
        <nav>
          {sysItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 14px 9px 18px",
                  fontSize: 13,
                  color: isActive ? "#0AFFD4" : "#6B6890",
                  background: isActive ? "rgba(10,255,212,0.06)" : "transparent",
                  borderLeft: isActive ? "3px solid #0AFFD4" : "3px solid transparent",
                  transition: "all 150ms ease",
                }}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div style={{ flex: 1 }} />

      {/* Footer */}
      <div
        style={{
          padding: "18px 14px 16px",
          borderTop: "1px solid rgba(255,77,109,0.15)",
        }}
      >
        {/* Admin identity card */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "32px minmax(0, 1fr) auto",
            gap: 10,
            alignItems: "center",
            padding: "10px 12px",
            background: "rgba(255,77,109,0.05)",
            border: "1px solid rgba(255,77,109,0.2)",
            marginBottom: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              background: `linear-gradient(135deg, ${DANGER}, #8B1A2E)`,
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              color: "#fff",
            }}
          >
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 12,
                color: "#F5F5FA",
                letterSpacing: "0.02em",
              }}
            >
              {handle}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 9.5,
                color: "#6B6890",
                letterSpacing: "0.02em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {email}
            </div>
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 9,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#fff",
              background: DANGER,
              padding: "3px 7px",
              boxShadow: "0 0 8px rgba(255,77,109,0.4)",
            }}
          >
            ADMIN
          </span>
        </div>

        {/* Logout */}
        <form action={signOut}>
          <button
            type="submit"
            style={{
              width: "100%",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "9px 12px",
              background: "transparent",
              border: "1px solid #2A2560",
              color: "#6B6890",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 150ms ease",
            }}
          >
            <svg
              width="11"
              height="11"
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

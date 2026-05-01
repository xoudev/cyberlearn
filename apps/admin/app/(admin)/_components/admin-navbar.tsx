"use client";

import React from "react";
import Image from "next/image";
import { useAdminMobileSidebar } from "./admin-shell-client";

interface AdminNavbarProps {
  initials: string;
  handle: string;
}

const DANGER = "#FF4D6D";
const BORDER = "#2A2560";

export function AdminNavbar({ initials, handle }: AdminNavbarProps): React.ReactElement {
  const { toggle } = useAdminMobileSidebar();

  return (
    <header
      style={{
        position: "fixed",
        top: 2,
        left: 0,
        right: 0,
        height: 56,
        zIndex: 40,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 12px",
        background: "#05041A",
        borderBottom: "1px solid rgba(255,77,109,0.25)",
      }}
    >
      {/* Hamburger — mobile only */}
      <button type="button" aria-label="Menu" onClick={toggle} className="admin-hamburger">
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          <path d="M2 4h12M2 8h12M2 12h12" />
        </svg>
      </button>

      {/* Logo + brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <Image
          src="/Admin_logo.png"
          alt="CyberLearn Admin"
          width={140}
          height={32}
          style={{ width: "auto", height: 32, objectFit: "contain" }}
          priority
        />

        <div
          className="admin-navbar-brand-tag"
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.2em",
            color: DANGER,
            border: "1px solid rgba(255,77,109,0.4)",
            background: "rgba(255,77,109,0.08)",
            padding: "4px 10px",
            marginLeft: 4,
            textTransform: "uppercase",
          }}
        >
          {"// ADMIN PANEL"}
        </div>

        <div
          className="admin-navbar-status-badge"
          style={{
            marginLeft: 8,
            alignItems: "center",
            gap: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#6B6890",
            border: "1px solid rgba(255,77,109,0.25)",
            padding: "3px 10px",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: DANGER,
              boxShadow: `0 0 6px ${DANGER}`,
              animation: "pulse 1.5s ease-in-out infinite",
              display: "inline-block",
            }}
          />
          admin.cyberlearn.app
        </div>
      </div>

      {/* Search — hidden on mobile */}
      <div className="admin-navbar-search">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            height: 32,
            padding: "0 12px",
            background: "#0A0826",
            border: `1px solid ${BORDER}`,
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
            style={{ color: "#6B6890", flexShrink: 0 }}
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="/ search users, lessons, audit log..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#B8B5D1",
            }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#3F3D5C",
              border: "1px solid #1F1B47",
              padding: "2px 5px",
              letterSpacing: "0.04em",
            }}
          >
            ⌘K
          </span>
        </div>
      </div>

      {/* Actions */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginLeft: "auto",
          flexShrink: 0,
        }}
      >
        {/* Bell */}
        <button
          type="button"
          aria-label="Notifications"
          style={{
            width: 32,
            height: 32,
            display: "grid",
            placeItems: "center",
            border: `1px solid ${BORDER}`,
            background: "#0A0826",
            position: "relative",
            color: "#6B6890",
            cursor: "pointer",
          }}
        >
          <svg width="15" height="15" viewBox="0 0 17 17" fill="none">
            <path
              d="M8.5 2 C6 2 4.5 3.8 4.5 6.2 V8.5 L3 10.5 V11.5 H14 V10.5 L12.5 8.5 V6.2 C12.5 3.8 11 2 8.5 2 Z"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M7 13 C7 14 7.7 14.5 8.5 14.5 C9.3 14.5 10 14 10 13"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: DANGER,
              boxShadow: `0 0 6px ${DANGER}`,
            }}
          />
        </button>

        {/* Admin pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            height: 32,
            padding: "0 4px",
            border: `1px solid ${BORDER}`,
            background: "#05041A",
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              background: `linear-gradient(135deg, ${DANGER}, #8B1A2E)`,
              display: "grid",
              placeItems: "center",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 10,
              color: "#fff",
            }}
          >
            {initials}
          </div>
          <span
            className="admin-navbar-handle"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#B8B5D1",
              letterSpacing: "0.04em",
            }}
          >
            {handle}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 9.5,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#fff",
              background: DANGER,
              padding: "3px 8px",
              marginRight: 4,
              boxShadow: "0 0 10px rgba(255,77,109,0.4)",
            }}
          >
            ADMIN
          </span>
        </div>
      </div>
    </header>
  );
}

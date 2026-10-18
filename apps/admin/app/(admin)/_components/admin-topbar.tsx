"use client";

import React from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { breadcrumbOf } from "@/lib/console-nav";
import { useAdminMobileSidebar } from "./admin-shell-client";
import { QuickSearch } from "./quick-search";

interface AdminTopbarProps {
  initials: string;
  handle: string;
}

/**
 * The bar across the top of the console: the menu button on a phone, the
 * logo, where one is (the breadcrumb, named from lib/console-nav.ts like the
 * sidebar and the quick search), the quick search, and who is signed in.
 */
export function AdminTopbar({ initials, handle }: AdminTopbarProps): React.ReactElement {
  const { toggle } = useAdminMobileSidebar();
  const pathname = usePathname();
  const crumbs = breadcrumbOf(pathname);

  return (
    <header className="a-topbar">
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

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <Image
          src="/Admin_logo.png"
          alt="CyberLearn Admin"
          width={140}
          height={30}
          style={{ width: "auto", height: 30, objectFit: "contain" }}
          priority
        />
      </div>

      <nav className="a-topbar-crumbs" aria-label="Fil d'Ariane">
        <span className="a-topbar-sep">/</span>
        {crumbs.length === 0 ? (
          <b>Console</b>
        ) : (
          crumbs.map((crumb, index) => (
            <React.Fragment key={`${crumb}-${String(index)}`}>
              {index > 0 && <span className="a-topbar-sep">/</span>}
              {index === crumbs.length - 1 ? <b>{crumb}</b> : <span>{crumb}</span>}
            </React.Fragment>
          ))
        )}
      </nav>

      <QuickSearch />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginLeft: "auto",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            height: 34,
            padding: "0 5px",
            border: "1px solid var(--a-border)",
            background: "var(--a-surface-2)",
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              display: "grid",
              placeItems: "center",
              background: "var(--a-overlay)",
              border: "1px solid var(--a-border-2)",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 10,
              color: "var(--a-fg-2)",
            }}
          >
            {initials}
          </span>
          <span
            className="admin-navbar-handle"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: "var(--a-fg-2)",
              letterSpacing: "0.03em",
            }}
          >
            {handle}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--a-accent)",
              border: "1px solid color-mix(in srgb, var(--a-accent) 40%, transparent)",
              background: "color-mix(in srgb, var(--a-accent) 8%, transparent)",
              padding: "3px 8px",
              marginRight: 3,
            }}
          >
            Admin
          </span>
        </span>
      </div>
    </header>
  );
}

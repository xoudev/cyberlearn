"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { breadcrumbOf } from "@/lib/console-nav";
import { useAdminMobileSidebar } from "./admin-shell-client";
import { QuickSearch } from "./quick-search";

interface AdminTopbarProps {
  initials: string;
  handle: string;
  siteUrl: string;
}

/**
 * The bar across the top of the console: the menu button on a phone, the
 * logo, where one is (the breadcrumb, named from lib/console-nav.ts like the
 * sidebar and the quick search), the quick search, and who is signed in.
 */
export function AdminTopbar({ initials, handle, siteUrl }: AdminTopbarProps): React.ReactElement {
  const { open: sidebarOpen, toggle } = useAdminMobileSidebar();
  const pathname = usePathname();
  const crumbs = breadcrumbOf(pathname);

  return (
    <header className="a-topbar">
      <button
        id="admin-menu-toggle"
        type="button"
        aria-label="Ouvrir le menu d’administration"
        aria-expanded={sidebarOpen}
        aria-controls="admin-navigation"
        onClick={toggle}
        className="admin-hamburger"
      >
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

      <div className="a-console-identity">
        <span className="a-console-identity-full">Console d’administration</span>
        <span className="a-console-identity-short">ADMIN</span>
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

      <div className="a-topbar-actions">
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="a-site-link"
          aria-label="Ouvrir le site apprenant (nouvel onglet)"
        >
          <span>Ouvrir le site apprenant</span>
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M14 4h6v6M20 4l-9 9M10 4H4v16h16v-6" />
          </svg>
        </a>
        <Link
          href="/account"
          className="a-topbar-account"
          aria-label={`Mon compte : ${handle}`}
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
        </Link>
      </div>
    </header>
  );
}

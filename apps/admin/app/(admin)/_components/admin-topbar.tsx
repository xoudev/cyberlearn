"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { breadcrumbOf } from "@/lib/console-nav";
import { useAdminMobileSidebar } from "./admin-shell-client";
import { QuickSearch } from "./quick-search";
import { UserAvatar } from "./admin-ui";

interface AdminTopbarProps {
  /** The signed-in admin's picture, resolved on the server (lib/avatar.ts). */
  avatarSrc: string | null;
  /** The name the initials come from when there is no picture. */
  name: string;
  handle: string;
  siteUrl: string;
}

/**
 * The bar across the top of the console: the menu button on a phone, the
 * logo, where one is (the breadcrumb, named from lib/console-nav.ts like the
 * sidebar and the quick search), the quick search, and who is signed in.
 */
export function AdminTopbar({
  avatarSrc,
  name,
  handle,
  siteUrl,
}: AdminTopbarProps): React.ReactElement {
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
        <Link href="/account" className="a-topbar-account" aria-label={`Mon compte : ${handle}`}>
          <UserAvatar src={avatarSrc} name={name} size={30} />
          <span className="admin-navbar-handle">{handle}</span>
          <span className="a-admin-mark">Admin</span>
        </Link>
      </div>
    </header>
  );
}

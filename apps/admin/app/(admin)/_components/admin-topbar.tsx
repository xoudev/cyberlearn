"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAdminMobileSidebar } from "./admin-shell-client";

interface AdminTopbarProps {
  initials: string;
  handle: string;
  siteUrl: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Aperçu",
  lessons: "Leçons",
  paths: "Parcours",
  badges: "Badges",
  challenges: "Challenges",
  classes: "Classes",
  tournaments: "Tournois",
  moderation: "Modération",
  reports: "Signalements",
  sync: "Synchronisation",
  structure: "Structure",
  users: "Utilisateurs",
  pending: "Inscriptions en attente",
  archives: "Archives",
  certificates: "Certificats",
  tickets: "Tickets",
  lab: "Banc d'essai",
  audit: "Audit log",
  settings: "Paramètres",
  new: "Nouveau",
  edit: "Édition",
  import: "Import MDX",
  quiz: "Quiz",
};

interface Destination {
  label: string;
  href: string;
  hint: string;
}

const DESTINATIONS: Destination[] = [
  { label: "Aperçu", href: "/dashboard", hint: "page" },
  { label: "Leçons", href: "/lessons", hint: "page" },
  { label: "Parcours", href: "/paths", hint: "page" },
  { label: "Badges", href: "/badges", hint: "page" },
  { label: "Classes", href: "/classes", hint: "page" },
  { label: "Tournois", href: "/tournaments", hint: "page" },
  { label: "Challenges", href: "/challenges", hint: "page" },
  { label: "Utilisateurs", href: "/users", hint: "page" },
  { label: "Inscriptions en attente", href: "/users/pending", hint: "page" },
  { label: "Certificats", href: "/certificates", hint: "page" },
  { label: "Tickets", href: "/tickets", hint: "page" },
  { label: "Modération", href: "/moderation", hint: "page" },
  { label: "Banc d'essai", href: "/lab", hint: "page" },
  { label: "Audit log", href: "/audit", hint: "page" },
  { label: "Paramètres", href: "/settings", hint: "page" },
  { label: "Nouvelle leçon", href: "/lessons/new", hint: "action" },
  { label: "Importer des leçons MDX", href: "/lessons/import", hint: "action" },
  { label: "Nouveau parcours", href: "/paths/new", hint: "action" },
  { label: "Nouveau badge", href: "/badges/new", hint: "action" },
  { label: "Nouveau challenge", href: "/challenges/new", hint: "action" },
];

function normalize(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function AdminTopbar({ initials, handle, siteUrl }: AdminTopbarProps): React.ReactElement {
  const { open: sidebarOpen, toggle } = useAdminMobileSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [cursor, setCursor] = useState(0);

  const crumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => SEGMENT_LABELS[segment] ?? null)
    .filter((s): s is string => s !== null);

  const matches = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return DESTINATIONS;
    return DESTINATIONS.filter((d) => normalize(d.label).includes(q));
  }, [query]);

  // ⌘K / Ctrl+K focuses the quick-jump input from anywhere in the console.
  useEffect(() => {
    function onKey(event: KeyboardEvent): void {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchVisible(true);
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (searchVisible) inputRef.current?.focus();
  }, [searchVisible]);

  function go(href: string): void {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(href);
  }

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

      <button
        type="button"
        className="a-quick-trigger"
        aria-label="Rechercher une page d’administration"
        aria-expanded={searchVisible}
        aria-controls="admin-quick-search"
        onClick={() => {
          setSearchVisible((value) => !value);
        }}
      >
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        >
          <circle cx="10" cy="10" r="6" />
          <path d="m15 15 6 6" />
        </svg>
      </button>
      <div
        id="admin-quick-search"
        className="a-topbar-search"
        data-open={searchVisible}
        style={{ position: "relative" }}
      >
        <div className="a-topbar-search-box">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11 L14 14" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-label="Navigation rapide de la console"
            aria-expanded={open && matches.length > 0}
            aria-controls="admin-quick-jump"
            aria-activedescendant={
              open && matches[cursor] ? `admin-destination-${String(cursor)}` : undefined
            }
            placeholder="Aller à une page ou une action…"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
              setOpen(true);
            }}
            onFocus={() => {
              setOpen(true);
            }}
            onBlur={() => {
              // Delay so option clicks land before the list unmounts.
              setTimeout(() => {
                setOpen(false);
                setSearchVisible(false);
              }, 120);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCursor((c) => Math.min(c + 1, matches.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (event.key === "Enter") {
                const target = matches[cursor];
                if (target) go(target.href);
              } else if (event.key === "Escape") {
                setOpen(false);
                setSearchVisible(false);
                inputRef.current?.blur();
              }
            }}
          />
          <span className="a-kbd">⌘K</span>
        </div>

        {open && matches.length > 0 && (
          <div
            id="admin-quick-jump"
            role="listbox"
            aria-label="Pages et actions d’administration"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              zIndex: 60,
              maxHeight: 320,
              overflowY: "auto",
              background: "var(--a-surface)",
              border: "1px solid var(--a-border-2)",
              boxShadow: "0 16px 40px color-mix(in srgb, var(--a-bg) 60%, transparent)",
            }}
          >
            {matches.map((destination, index) => (
              <button
                key={destination.href + destination.label}
                id={`admin-destination-${String(index)}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={index === cursor}
                onMouseEnter={() => {
                  setCursor(index);
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                  go(destination.href);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  width: "100%",
                  padding: "10px 14px",
                  background: index === cursor ? "var(--a-hover)" : "transparent",
                  border: "none",
                  borderBottom: "1px solid var(--a-border)",
                  color: index === cursor ? "var(--a-fg)" : "var(--a-fg-2)",
                  fontFamily: "var(--font-sans)",
                  fontSize: 13,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                {destination.label}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: destination.hint === "action" ? "var(--a-accent)" : "var(--a-muted)",
                  }}
                >
                  {destination.hint}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className="a-topbar-actions"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginLeft: "auto",
          flexShrink: 0,
        }}
      >
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
        <span
          className="a-topbar-account"
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

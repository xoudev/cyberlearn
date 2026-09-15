"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAdminMobileSidebar } from "./admin-shell-client";

interface AdminTopbarProps {
  initials: string;
  handle: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Aperçu",
  lessons: "Leçons",
  paths: "Parcours",
  badges: "Badges",
  challenges: "Challenges",
  users: "Utilisateurs",
  tickets: "Tickets",
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
  { label: "Challenges", href: "/challenges", hint: "page" },
  { label: "Utilisateurs", href: "/users", hint: "page" },
  { label: "Tickets", href: "/tickets", hint: "page" },
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

export function AdminTopbar({ initials, handle }: AdminTopbarProps): React.ReactElement {
  const { toggle } = useAdminMobileSidebar();
  const pathname = usePathname();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
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
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function go(href: string): void {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    router.push(href);
  }

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

      <div className="a-topbar-search" style={{ position: "relative" }}>
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
                inputRef.current?.blur();
              }
            }}
          />
          <span className="a-kbd">⌘K</span>
        </div>

        {open && matches.length > 0 && (
          <div
            role="listbox"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              right: 0,
              zIndex: 60,
              maxHeight: 320,
              overflowY: "auto",
              background: "#0A0826",
              border: "1px solid #2A2560",
              boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
            }}
          >
            {matches.map((destination, index) => (
              <button
                key={destination.href + destination.label}
                type="button"
                role="option"
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
                  background: index === cursor ? "#0E0B2E" : "transparent",
                  border: "none",
                  borderBottom: "1px solid #1F1B47",
                  color: index === cursor ? "#F5F5FA" : "#B8B5D1",
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
                    color: destination.hint === "action" ? "#0AFFD4" : "#6B6890",
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
            border: "1px solid #1F1B47",
            background: "#05041A",
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              display: "grid",
              placeItems: "center",
              background: "#110F33",
              border: "1px solid #2A2560",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 10,
              color: "#B8B5D1",
            }}
          >
            {initials}
          </span>
          <span
            className="admin-navbar-handle"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              color: "#B8B5D1",
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
              color: "#0AFFD4",
              border: "1px solid color-mix(in srgb, #0AFFD4 40%, transparent)",
              background: "color-mix(in srgb, #0AFFD4 8%, transparent)",
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

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_SECTIONS, settingsHref } from "./sections";
import { EASE, MONO, S } from "./tokens";

/**
 * The sections, one under the other. On the settings page it sticks beside
 * the content; in the drawer it replaces the history entry rather than adding
 * one, so that closing the drawer goes back to the page it opened over.
 */
export function SettingsNav({
  replace = false,
  sticky = true,
}: {
  replace?: boolean;
  sticky?: boolean;
} = {}): React.JSX.Element {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);
  const sections = SETTINGS_SECTIONS.map((section) => ({
    ...section,
    href: settingsHref(section.key),
  }));

  return (
    <nav
      className="settings-nav"
      style={{
        position: sticky ? "sticky" : "static",
        top: 80,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontWeight: 500,
          fontSize: 10,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: S.muted,
          padding: "0 12px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span aria-hidden="true" style={{ color: S.disabled }}>
          {"//"}
        </span>
        Sections
      </div>

      {sections.map((s, i) => {
        const active = pathname === s.href;
        const isHover = hovered === s.href && !active;
        const accent = s.danger ? S.danger : S.turq;
        const activeBg = s.danger
          ? "rgba(255,77,109,0.12)"
          : "color-mix(in srgb, var(--cosmetic-accent) 10%, transparent)";
        const activeShadow = s.danger
          ? "rgba(255,77,109,0.25)"
          : "color-mix(in srgb, var(--cosmetic-accent) 25%, transparent)";

        return (
          <Link
            key={s.href}
            href={s.href}
            replace={replace}
            aria-current={active ? "page" : undefined}
            onMouseEnter={() => {
              setHovered(s.href);
            }}
            onMouseLeave={() => {
              setHovered(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              height: 38,
              padding: "0 12px",
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: active || isHover ? S.fg : S.fg2,
              background: active
                ? `linear-gradient(90deg, ${activeBg}, transparent)`
                : isHover
                  ? "color-mix(in srgb, var(--cosmetic-accent) 4%, transparent)"
                  : "transparent",
              borderLeft: `2px solid ${active ? accent : "transparent"}`,
              marginLeft: -2,
              boxShadow: active ? `-2px 0 12px ${activeShadow}` : "none",
              textDecoration: "none",
              transition: `all 200ms ${EASE}`,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 10, color: active ? accent : S.disabled }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}

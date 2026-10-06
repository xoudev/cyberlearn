"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SETTINGS_SECTIONS, settingsHref, type SettingsSectionKey } from "./sections";
import { EASE, MONO, S } from "./tokens";

/**
 * The sections, one under the other. On the settings page they are links and
 * the nav sticks beside the content. In the drawer they are buttons: a section
 * is picked there without a navigation, from data the drawer already holds.
 */
export function SettingsNav({
  sticky = true,
  current,
  onSelect,
}: {
  sticky?: boolean;
  /** The drawer's section, when the nav is the drawer's (with onSelect). */
  current?: SettingsSectionKey;
  /** Given, the sections are buttons that call it instead of links. */
  onSelect?: (key: SettingsSectionKey) => void;
} = {}): React.JSX.Element {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<SettingsSectionKey | null>(null);
  const sections = SETTINGS_SECTIONS.map((section) => ({
    ...section,
    href: settingsHref(section.key),
  }));

  return (
    <nav
      className="settings-nav"
      aria-label="Sections des paramètres"
      // The direction is the stylesheet's (.settings-nav), so the drawer can
      // lay the sections in a row on a narrow screen.
      style={{ position: sticky ? "sticky" : "static", top: 80 }}
    >
      <div
        className="settings-nav__label"
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
        const active = onSelect ? current === s.key : pathname === s.href;
        const isHover = hovered === s.key && !active;
        const accent = s.danger ? S.danger : S.turq;
        const activeBg = s.danger
          ? "rgba(255,77,109,0.12)"
          : "color-mix(in srgb, var(--cosmetic-accent) 10%, transparent)";
        const activeShadow = s.danger
          ? "rgba(255,77,109,0.25)"
          : "color-mix(in srgb, var(--cosmetic-accent) 25%, transparent)";

        const style: React.CSSProperties = {
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
        };

        if (onSelect) {
          return (
            <button
              key={s.key}
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => {
                onSelect(s.key);
              }}
              onMouseEnter={() => {
                setHovered(s.key);
              }}
              onMouseLeave={() => {
                setHovered(null);
              }}
              style={{
                ...style,
                borderTop: "none",
                borderRight: "none",
                borderBottom: "none",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 10, color: active ? accent : S.disabled }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              {s.label}
            </button>
          );
        }

        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? "page" : undefined}
            onMouseEnter={() => {
              setHovered(s.key);
            }}
            onMouseLeave={() => {
              setHovered(null);
            }}
            style={style}
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

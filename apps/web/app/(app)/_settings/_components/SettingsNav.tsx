"use client";

import React, { useState } from "react";
import { SETTINGS_SECTIONS, type SettingsSectionKey } from "./sections";
import { EASE, MONO, S } from "./tokens";

/**
 * The drawer's sections, one under the other (in a row on a narrow screen).
 * Buttons, not links: a section is picked without a navigation, from data
 * the drawer already holds.
 */
export function SettingsNav({
  current,
  onSelect,
}: {
  current: SettingsSectionKey;
  onSelect: (key: SettingsSectionKey) => void;
}): React.JSX.Element {
  const [hovered, setHovered] = useState<SettingsSectionKey | null>(null);

  // No inline direction: the stylesheet's (.settings-nav) lays the sections
  // in a row on a narrow screen.
  return (
    <nav className="settings-nav" aria-label="Sections des paramètres">
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

      {SETTINGS_SECTIONS.map((s, i) => {
        const active = current === s.key;
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
          // Longhands only: React warns when a shorthand sits beside a
          // longhand that changes between renders.
          borderTop: "none",
          borderRight: "none",
          borderBottom: "none",
          borderLeft: `2px solid ${active ? accent : "transparent"}`,
          marginLeft: -2,
          boxShadow: active ? `-2px 0 12px ${activeShadow}` : "none",
          textAlign: "left",
          cursor: "pointer",
          transition: `all 200ms ${EASE}`,
        };

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
            style={style}
          >
            <span style={{ fontFamily: MONO, fontSize: 10, color: active ? accent : S.disabled }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            {s.label}
          </button>
        );
      })}
    </nav>
  );
}

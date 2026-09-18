"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { EASE, MONO, S } from "./tokens";

interface NavSection {
  href: string;
  label: string;
  danger?: boolean;
}

const SECTIONS: NavSection[] = [
  { href: "/settings/profile", label: "Profil" },
  { href: "/settings/privacy", label: "Confidentialité" },
  { href: "/settings/preferences", label: "Préférences" },
  { href: "/settings/notifications", label: "Notifications" },
  { href: "/settings/moderation", label: "Modération" },
  { href: "/settings/account", label: "Compte" },
  { href: "/settings/data", label: "Données", danger: true },
];

export function SettingsNav(): React.JSX.Element {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <nav style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 2 }}>
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

      {SECTIONS.map((s, i) => {
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

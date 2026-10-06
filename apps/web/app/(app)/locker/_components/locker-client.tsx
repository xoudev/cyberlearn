"use client";

import { Tabs } from "@/components/tabs";
import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { equipCosmeticAction } from "../_actions/cosmetic-actions";
import { useCosmetics } from "@/components/cosmetics-provider";
import type { CosmeticAttrs } from "@/lib/cosmetics/attrs";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";
import { StatTile } from "@/components/stat-tile";
import { BADGE_RARITY_VAR, toBadgeRarity } from "@cyberlearn/ui";
import { ProgressBar } from "@/components/progress-bar";
import "./locker.css";

export type CosmeticType = "TERMINAL_THEME" | "HEXAGON_STYLE" | "PROFILE_FRAME" | "ACCENT_COLOR";

export interface LockerItem {
  id: string;
  code: string;
  type: CosmeticType;
  label: string;
  description: string | null;
  rarity: string;
  unlocked: boolean;
  equipped: boolean;
  condition: string;
  progressDone: number;
  progressTotal: number;
}

export interface LockerProfile {
  username: string | null;
  displayName: string;
  initial: string;
  level: number;
  badgesCount: number;
  streakDays: number;
}

const SLOTS: { type: CosmeticType; label: string }[] = [
  { type: "TERMINAL_THEME", label: "Thèmes" },
  { type: "HEXAGON_STYLE", label: "Hexagones" },
  { type: "PROFILE_FRAME", label: "Cadres" },
  { type: "ACCENT_COLOR", label: "Accents" },
];

const SLOT_ATTR: Record<CosmeticType, keyof CosmeticAttrs> = {
  TERMINAL_THEME: "data-terminal",
  HEXAGON_STYLE: "data-hex",
  PROFILE_FRAME: "data-frame",
  ACCENT_COLOR: "data-accent",
};

const SLOT_LABEL: Record<CosmeticType, string> = {
  TERMINAL_THEME: "Thème",
  HEXAGON_STYLE: "Hexagone",
  PROFILE_FRAME: "Cadre",
  ACCENT_COLOR: "Accent",
};

function initialEquipped(items: LockerItem[]): Record<CosmeticType, string | null> {
  const eq: Record<CosmeticType, string | null> = {
    TERMINAL_THEME: null,
    HEXAGON_STYLE: null,
    PROFILE_FRAME: null,
    ACCENT_COLOR: null,
  };
  for (const i of items) if (i.equipped) eq[i.type] = i.code;
  return eq;
}

/**
 * The equipped hexagon, drawn as itself.
 *
 * It used to be a clip-path over a coloured box. A clip-path has no stroke, so
 * every style came out as the same solid shape and only the glow told them
 * apart - which at swatch size told nobody anything. As an outline, Contour is
 * hollow, Circuit and Glitch are broken lines and Prisme is thick and bright.
 *
 * The values are read from the --cosmetic-hex-* custom properties, so this
 * follows whichever hexagon is scoped above it: the loadout on the app shell,
 * or one card's own data-hex in the locker.
 */
function CosmeticHexagon({
  width,
  height,
  glowPx,
}: {
  width: number;
  height: number;
  /** Blur radius at full glow, tuned to the size it is drawn at. */
  glowPx: number;
}): React.ReactElement {
  return (
    <svg
      viewBox="-5 -5 110 110"
      width={width}
      height={height}
      aria-hidden="true"
      style={{
        filter: `drop-shadow(0 0 calc(var(--cosmetic-hex-glow) * ${String(glowPx)}px) color-mix(in srgb, var(--cosmetic-hex-accent, var(--cosmetic-accent)) 70%, transparent))`,
      }}
    >
      <polygon
        points="50,0 100,25 100,75 50,100 0,75 0,25"
        style={{
          fill: "var(--cosmetic-hex-accent, var(--cosmetic-accent))",
          fillOpacity: "var(--cosmetic-hex-fill)",
          stroke: "var(--cosmetic-hex-accent, var(--cosmetic-accent))",
          strokeWidth: "var(--cosmetic-hex-stroke)",
          strokeDasharray: "var(--cosmetic-hex-dash)",
          strokeLinejoin: "round",
        }}
      />
    </svg>
  );
}

/** Mini preview of a single cosmetic, scoped with its own data-attribute so the
 *  swatch shows that cosmetic's look regardless of what is equipped. */
function Swatch({ type, code }: { type: CosmeticType; code: string }): React.ReactElement {
  const wrap: Record<string, string> = { [SLOT_ATTR[type]]: code };
  return (
    <div
      className="card card--sunken"
      {...wrap}
      style={{
        height: 56,
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      {type === "ACCENT_COLOR" && (
        <div
          style={{
            width: "70%",
            height: 8,
            background: "var(--cosmetic-accent)",
            boxShadow: "0 0 10px color-mix(in srgb, var(--cosmetic-accent) 60%, transparent)",
          }}
        />
      )}
      {type === "TERMINAL_THEME" && (
        <div
          style={{
            width: "78%",
            height: 38,
            background: "var(--cosmetic-terminal-bg)",
            padding: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            color: "var(--cosmetic-terminal-fg)",
          }}
        >
          $ ./run
          <br />
          <span style={{ opacity: 0.7 }}>ok ✓</span>
        </div>
      )}
      {type === "HEXAGON_STYLE" && <CosmeticHexagon width={32} height={36} glowPx={12} />}
      {type === "PROFILE_FRAME" && (
        <div
          style={{
            width: 34,
            height: 34,
            border: "2px solid var(--cosmetic-frame-accent)",
            boxShadow:
              "0 0 14px color-mix(in srgb, var(--cosmetic-frame-accent) calc(var(--cosmetic-frame-glow) * 100%), transparent)",
          }}
        />
      )}
    </div>
  );
}

function Card({
  item,
  onEquip,
  busy,
}: {
  item: LockerItem;
  onEquip: (i: LockerItem) => void;
  busy: boolean;
}): React.ReactElement {
  const rarityColor = BADGE_RARITY_VAR[toBadgeRarity(item.rarity)];
  const pct =
    item.progressTotal > 0
      ? Math.min(100, Math.round((item.progressDone / item.progressTotal) * 100))
      : 0;
  return (
    <div
      style={{
        border: `1px solid ${item.equipped ? "var(--cosmetic-accent)" : "var(--color-border-subtle)"}`,
        background: "rgba(5,4,26,0.5)",
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        opacity: item.unlocked ? 1 : 0.7,
      }}
    >
      <div style={{ position: "relative" }}>
        <Swatch type={item.type} code={item.code} />
        {!item.unlocked && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              background: "rgba(3,2,25,0.6)",
              color: "var(--color-text-muted)",
              fontSize: 18,
            }}
            aria-hidden="true"
          >
            🔒
          </div>
        )}
      </div>

      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
      >
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 14,
            color: "var(--color-text-primary)",
          }}
        >
          {item.label}
        </span>
        <span
          className="mono-label mono-label--xs"
          style={{
            color: rarityColor,
          }}
        >
          {item.rarity}
        </span>
      </div>

      {item.equipped ? (
        <span
          className="mono-label"
          style={{
            color: "var(--cosmetic-accent)",
            textAlign: "center",
            padding: "8px 0",
            border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 40%, transparent)",
          }}
        >
          ✓ Équipé
        </span>
      ) : item.unlocked ? (
        <button
          className="mono-label"
          type="button"
          disabled={busy}
          onClick={() => {
            onEquip(item);
          }}
          style={{
            fontWeight: 700,
            color: "var(--color-text-primary)",
            background: "var(--color-bg-elevated)",
            border: "1px solid var(--color-border-default)",
            padding: "8px 0",
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.6 : 1,
          }}
        >
          Équiper
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span
            className="mono-label mono-label--xs"
            style={{
              color: "var(--cosmetic-accent)",
            }}
          >
            🔒 Comment débloquer
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11.5,
              letterSpacing: "0.02em",
              color: "var(--color-text-secondary)",
              lineHeight: 1.45,
            }}
          >
            {item.condition}
          </span>
          {item.progressTotal > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ProgressBar value={pct} style={{ flex: 1 }} label={item.condition} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "var(--color-text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {item.progressDone}/{item.progressTotal}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LockerClient({
  items,
  profile,
}: {
  items: LockerItem[];
  profile: LockerProfile;
}): React.ReactElement {
  const router = useRouter();
  const { setCosmetic } = useCosmetics();
  const [busy, start] = useTransition();
  const [activeTab, setActiveTab] = useState<CosmeticType>("TERMINAL_THEME");
  const [equipped, setEquipped] = useState<Record<CosmeticType, string | null>>(() =>
    initialEquipped(items),
  );

  function equip(item: LockerItem): void {
    if (!item.unlocked || busy || equipped[item.type] === item.code) return;
    const previous = equipped[item.type];
    // Optimistic: local state drives this page's cards + preview, and setCosmetic
    // applies the equipped look to the whole app shell instantly (no reload).
    setEquipped((e) => ({ ...e, [item.type]: item.code }));
    setCosmetic(SLOT_ATTR[item.type], item.code);
    start(async () => {
      const res = await equipCosmeticAction(item.code);
      if (res.ok) {
        router.refresh();
      } else {
        setEquipped((e) => ({ ...e, [item.type]: previous }));
        setCosmetic(SLOT_ATTR[item.type], previous);
        toast.error(res.error ?? "Équipement impossible.");
      }
    });
  }

  // Reflect local equipment in the list (so the active card shows ✓ Équipé live).
  const liveItems = items.map((i) => ({ ...i, equipped: equipped[i.type] === i.code }));
  const tabItems = liveItems.filter((i) => i.type === activeTab);

  const previewAttrs: Record<string, string> = {};
  for (const slot of SLOTS) {
    const code = equipped[slot.type];
    if (code) previewAttrs[SLOT_ATTR[slot.type]] = code;
  }
  const equippedLabel = (type: CosmeticType): string => {
    const code = equipped[type];
    const found = items.find((i) => i.code === code);
    return found?.label ?? "Défaut";
  };

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "40px clamp(16px,4vw,48px)" }}>
      <div
        className="mono-label"
        style={{
          color: "var(--cosmetic-accent)",
          marginBottom: 10,
        }}
      >
        Cyber Learn · Personnalisation
      </div>
      <h1
        style={{
          fontFamily: "var(--font-sans)",
          fontWeight: 800,
          fontSize: "clamp(34px,5vw,52px)",
          letterSpacing: "-0.03em",
          color: "var(--color-text-primary)",
          margin: "0 0 10px",
        }}
      >
        Casier <span style={{ color: "var(--cosmetic-accent)" }}>cosmétiques</span>
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 14,
          color: "var(--color-text-secondary)",
          maxWidth: 560,
          margin: "0 0 28px",
        }}
      >
        Débloque par niveau et par succès, zéro pay-to-win. Équipe thèmes, hexagones, cadres et
        accents : ta carte de profil change en direct.
      </p>

      <div className="casier-layout">
        {/* Left: tabs + grid */}
        <div>
          <Tabs
            label="Emplacements du casier"
            items={SLOTS.map((slot) => {
              const all = liveItems.filter((i) => i.type === slot.type);
              const unlocked = all.filter((i) => i.unlocked).length;
              return {
                key: slot.type,
                label: slot.label,
                count: `${String(unlocked)}/${String(all.length)}`,
              };
            })}
            value={activeTab}
            onChange={setActiveTab}
          />

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 14,
            }}
          >
            {tabItems.map((item) => (
              <Card key={item.id} item={item} onEquip={equip} busy={busy} />
            ))}
          </div>
        </div>

        {/* Right: live preview */}
        <div
          {...previewAttrs}
          className="casier-preview card"
          style={{
            padding: 24,
          }}
        >
          <div
            className="mono-label"
            style={{
              color: "var(--color-text-muted)",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Aperçu en direct</span>
            <span style={{ color: "var(--cosmetic-accent)" }}>● live</span>
          </div>

          <div style={{ display: "grid", placeItems: "center", gap: 12, marginBottom: 18 }}>
            <span
              style={{
                position: "relative",
                width: 84,
                height: 94,
                display: "grid",
                placeItems: "center",
                // layered hexagon + profile-frame aura, so equipping a frame is visible here too
                ...cosmeticAvatarFilter(1),
              }}
            >
              <span aria-hidden="true" style={{ position: "absolute", inset: 0 }}>
                <CosmeticHexagon width={84} height={94} glowPx={26} />
              </span>
              <span
                style={{
                  position: "relative",
                  fontFamily: "var(--font-sans)",
                  fontWeight: 800,
                  fontSize: 28,
                  color: "var(--cosmetic-accent)",
                }}
              >
                {profile.initial}
              </span>
            </span>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--font-sans)",
                  fontWeight: 700,
                  fontSize: 18,
                  color: "var(--color-text-primary)",
                }}
              >
                {profile.username ? `@${profile.username}` : profile.displayName}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            {[
              { label: "Niveau", value: profile.level },
              { label: "Badges", value: profile.badgesCount },
              { label: "Série", value: profile.streakDays },
            ].map((s) => (
              <StatTile
                key={s.label}
                size="sm"
                align="center"
                label={s.label}
                value={s.value}
                style={{ flex: 1 }}
              />
            ))}
          </div>

          {/* Mini terminal, so the equipped terminal-theme reads at a glance */}
          <div
            style={{
              border: "1px solid var(--color-border-subtle)",
              background: "var(--cosmetic-terminal-bg)",
              color: "var(--cosmetic-terminal-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              lineHeight: 1.6,
              padding: "10px 12px",
              marginBottom: 18,
              overflow: "hidden",
            }}
          >
            <div>
              <span style={{ color: "var(--cosmetic-accent)" }}>$</span> whoami
            </div>
            <div style={{ opacity: 0.85 }}>
              {profile.username ? `@${profile.username}` : profile.displayName}
            </div>
            <div>
              <span style={{ color: "var(--cosmetic-accent)" }}>$</span> level --show{" "}
              <span style={{ opacity: 0.6 }}>›</span> {profile.level} ✓
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SLOTS.map((slot) => (
              <div
                key={slot.type}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  padding: "7px 0",
                  borderTop: "1px solid var(--color-border-subtle)",
                }}
              >
                <span
                  style={{
                    color: "var(--color-text-muted)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  {SLOT_LABEL[slot.type]}
                </span>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {equippedLabel(slot.type)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

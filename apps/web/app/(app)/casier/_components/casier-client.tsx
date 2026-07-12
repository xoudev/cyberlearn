"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { equipCosmeticAction } from "../_actions/cosmetic-actions";
import { useCosmetics } from "@/components/cosmetics-provider";
import type { CosmeticAttrs } from "@/lib/cosmetics/attrs";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";

export type CosmeticType = "TERMINAL_THEME" | "HEXAGON_STYLE" | "PROFILE_FRAME" | "ACCENT_COLOR";

export interface CasierItem {
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

export interface CasierProfile {
  username: string | null;
  displayName: string;
  initial: string;
  level: number;
  badgesCount: number;
  streakDays: number;
}

const HEX = "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)";

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

const RARITY_COLOR: Record<string, string> = {
  COMMON: "#B8B5D1",
  RARE: "#6E8BFF",
  EPIC: "#B14DFF",
  LEGENDARY: "#FFB547",
};

function initialEquipped(items: CasierItem[]): Record<CosmeticType, string | null> {
  const eq: Record<CosmeticType, string | null> = {
    TERMINAL_THEME: null,
    HEXAGON_STYLE: null,
    PROFILE_FRAME: null,
    ACCENT_COLOR: null,
  };
  for (const i of items) if (i.equipped) eq[i.type] = i.code;
  return eq;
}

/** Mini preview of a single cosmetic, scoped with its own data-attribute so the
 *  swatch shows that cosmetic's look regardless of what is equipped. */
function Swatch({ type, code }: { type: CosmeticType; code: string }): React.ReactElement {
  const wrap: Record<string, string> = { [SLOT_ATTR[type]]: code };
  return (
    <div
      {...wrap}
      style={{
        height: 56,
        borderRadius: 6,
        border: "1px solid #1F1B47",
        background: "#05041A",
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
            borderRadius: 4,
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
            borderRadius: 4,
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
      {type === "HEXAGON_STYLE" && (
        <span
          style={{
            width: 30,
            height: 34,
            clipPath: HEX,
            background: "var(--cosmetic-hex-accent)",
            boxShadow:
              "0 0 14px color-mix(in srgb, var(--cosmetic-hex-accent) calc(var(--cosmetic-hex-glow) * 100%), transparent)",
          }}
        />
      )}
      {type === "PROFILE_FRAME" && (
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 4,
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
  item: CasierItem;
  onEquip: (i: CasierItem) => void;
  busy: boolean;
}): React.ReactElement {
  const rarityColor = RARITY_COLOR[item.rarity] ?? "#B8B5D1";
  const pct =
    item.progressTotal > 0
      ? Math.min(100, Math.round((item.progressDone / item.progressTotal) * 100))
      : 0;
  return (
    <div
      style={{
        border: `1px solid ${item.equipped ? "var(--cosmetic-accent)" : "#1F1B47"}`,
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
              borderRadius: 6,
              color: "#6F6B99",
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
            color: "#F5F5FA",
          }}
        >
          {item.label}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 9,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: rarityColor,
          }}
        >
          {item.rarity}
        </span>
      </div>

      {item.equipped ? (
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
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
          type="button"
          disabled={busy}
          onClick={() => {
            onEquip(item);
          }}
          style={{
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#F5F5FA",
            background: "#0A0826",
            border: "1px solid #2A2560",
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
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
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
              color: "#B8B5D1",
              lineHeight: 1.45,
            }}
          >
            {item.condition}
          </span>
          {item.progressTotal > 0 && (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  position: "relative",
                  flex: 1,
                  height: 4,
                  background: "#05041A",
                  border: "1px solid #1F1B47",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${String(pct)}%`,
                    background: "linear-gradient(90deg, #0024FF, var(--cosmetic-accent))",
                  }}
                />
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#6F6B99",
                  whiteSpace: "nowrap",
                }}
              >
                {item.progressDone}/{item.progressTotal}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function CasierClient({
  items,
  profile,
}: {
  items: CasierItem[];
  profile: CasierProfile;
}): React.ReactElement {
  const router = useRouter();
  const { setCosmetic } = useCosmetics();
  const [busy, start] = useTransition();
  const [activeTab, setActiveTab] = useState<CosmeticType>("TERMINAL_THEME");
  const [equipped, setEquipped] = useState<Record<CosmeticType, string | null>>(() =>
    initialEquipped(items),
  );

  function equip(item: CasierItem): void {
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
      {/* Responsive layout: two columns on wide screens, single stacked column
          below 1024px (where the app sidebar becomes an off-canvas drawer and the
          content area is too narrow for the content grid + 320px preview side by
          side). Media queries live here because inline styles cannot be overridden
          by a class breakpoint. */}
      <style>{`
        .casier-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 28px;
          align-items: start;
        }
        .casier-preview {
          position: sticky;
          top: 24px;
        }
        @media (max-width: 1024px) {
          .casier-layout {
            grid-template-columns: minmax(0, 1fr);
          }
          .casier-preview {
            position: static;
            top: auto;
          }
        }
      `}</style>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
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
          color: "#F5F5FA",
          margin: "0 0 10px",
        }}
      >
        Casier <span style={{ color: "var(--cosmetic-accent)" }}>cosmétiques</span>
      </h1>
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 14,
          color: "#B8B5D1",
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
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {SLOTS.map((slot) => {
              const all = liveItems.filter((i) => i.type === slot.type);
              const unlocked = all.filter((i) => i.unlocked).length;
              const active = activeTab === slot.type;
              return (
                <button
                  key={slot.type}
                  type="button"
                  onClick={() => {
                    setActiveTab(slot.type);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: active ? "#05041A" : "#B8B5D1",
                    background: active ? "var(--cosmetic-accent)" : "transparent",
                    border: `1px solid ${active ? "var(--cosmetic-accent)" : "#2A2560"}`,
                    padding: "8px 14px",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  {slot.label}
                  <span style={{ opacity: 0.7 }}>
                    {unlocked}/{all.length}
                  </span>
                </button>
              );
            })}
          </div>

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
          className="casier-preview"
          style={{
            border: "1px solid #2A2560",
            background: "rgba(10,8,38,0.5)",
            padding: 24,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#6F6B99",
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
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  inset: 0,
                  clipPath: HEX,
                  background: "var(--cosmetic-hex-accent)",
                  opacity: 0.9,
                }}
              />
              <span
                aria-hidden="true"
                style={{ position: "absolute", inset: 3, clipPath: HEX, background: "#05041A" }}
              />
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
                  color: "#F5F5FA",
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
              <div
                key={s.label}
                style={{
                  flex: 1,
                  textAlign: "center",
                  border: "1px solid #1F1B47",
                  padding: "10px 4px",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontWeight: 800,
                    fontSize: 18,
                    color: "#F5F5FA",
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#6F6B99",
                    marginTop: 2,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Mini terminal, so the equipped terminal-theme reads at a glance */}
          <div
            style={{
              borderRadius: 6,
              border: "1px solid #1F1B47",
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
                  borderTop: "1px solid #1F1B47",
                }}
              >
                <span
                  style={{ color: "#6F6B99", letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  {SLOT_LABEL[slot.type]}
                </span>
                <span style={{ color: "#B8B5D1" }}>{equippedLabel(slot.type)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

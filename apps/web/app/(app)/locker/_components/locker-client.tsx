"use client";

// Client boundary: equipment previews update optimistically before the server action returns.

import { Tabs } from "@/components/tabs";
import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Check, LayoutGrid, Lock, Route } from "lucide-react";
import { equipCosmeticAction } from "../_actions/cosmetic-actions";
import { useCosmetics } from "@/components/cosmetics-provider";
import type { CosmeticAttrs } from "@/lib/cosmetics/attrs";
import { cosmeticAvatarFilter } from "@/lib/cosmetics/style";
import { AvatarView } from "@/components/avatar-view";
import { BastionLogo } from "@/components/bastion-logo";
import { StatTile } from "@/components/stat-tile";
import { BADGE_RARITY_LABELS, BADGE_RARITY_VAR, toBadgeRarity } from "@cyberlearn/ui";
import { ProgressBar } from "@/components/progress-bar";
import { StickyRail } from "@/components/sticky-rail";
import { CodeBlock } from "../../lessons/[slug]/_components/code-block";
import "./locker.css";
import { ProgressionHeading } from "@/components/progression-heading";

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
  /** Already resolved (signed URL, built-in path, glyph marker), or null. */
  avatarSrc: string | null;
  level: number;
  badgesCount: number;
  streakDays: number;
}

/**
 * The four slots. HEXAGON_STYLE keeps its stored name, but the site no longer
 * draws a hexagon: the style is the contour of the square avatar (weight,
 * line, tint, glow), so that is what the locker calls it.
 */
const SLOTS: { type: CosmeticType; label: string }[] = [
  { type: "ACCENT_COLOR", label: "Accents" },
  { type: "HEXAGON_STYLE", label: "Contours" },
  { type: "PROFILE_FRAME", label: "Cadres" },
  { type: "TERMINAL_THEME", label: "Terminaux" },
];

const SLOT_ATTR: Record<CosmeticType, keyof CosmeticAttrs> = {
  TERMINAL_THEME: "data-terminal",
  HEXAGON_STYLE: "data-hex",
  PROFILE_FRAME: "data-frame",
  ACCENT_COLOR: "data-accent",
};

const SLOT_LABEL: Record<CosmeticType, string> = {
  ACCENT_COLOR: "Accent",
  HEXAGON_STYLE: "Contour d’avatar",
  PROFILE_FRAME: "Cadre d’avatar",
  TERMINAL_THEME: "Thème du terminal",
};

/** Where each slot shows on the site, said under the slot's tabs. */
const SLOT_HINT: Record<CosmeticType, string> = {
  ACCENT_COLOR:
    "L’accent remplace le cuivre partout : logo, page active, boutons, progression et repères.",
  HEXAGON_STYLE: "Le contour habille ton avatar : barre latérale, barre du haut, profil et forum.",
  PROFILE_FRAME: "Le cadre entoure ton avatar d’un second liseré, sur les mêmes surfaces.",
  TERMINAL_THEME: "Le thème colore les blocs de code et les terminaux des leçons.",
};

/**
 * What a slot wears when the learner never chose: the catalogue's first,
 * level-1 cosmetic of each slot, which tokens.css draws as the default. Shown
 * as equipped, so the card of the look on screen says so.
 */
const DEFAULT_CODE: Record<CosmeticType, string> = {
  ACCENT_COLOR: "accent-turquoise",
  HEXAGON_STYLE: "hex-solid",
  PROFILE_FRAME: "frame-standard",
  TERMINAL_THEME: "theme-midnight-ops",
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
 * A cosmetic shown as itself, on the surface it changes: scoped with its own
 * data-attribute, so the swatch draws that cosmetic whatever is equipped.
 */
function Swatch({
  type,
  code,
  initial,
}: {
  type: CosmeticType;
  code: string;
  initial: string;
}): React.ReactElement {
  const scope: Record<string, string> = { [SLOT_ATTR[type]]: code };
  return (
    <div className="locker-swatch" data-slot={type} {...scope} aria-hidden="true">
      {type === "ACCENT_COLOR" && (
        <>
          <BastionLogo size={40} className="locker-swatch__logo" />
          <span className="locker-swatch__accent" />
        </>
      )}
      {type === "TERMINAL_THEME" && (
        <span className="locker-swatch__terminal">
          <span>$ ./run</span>
          <span>ok ✓</span>
        </span>
      )}
      {(type === "HEXAGON_STYLE" || type === "PROFILE_FRAME") && (
        <span className="cl-avatar-frame locker-swatch__avatar" style={cosmeticAvatarFilter(0.4)}>
          <span>{initial}</span>
        </span>
      )}
    </div>
  );
}

function Card({
  item,
  initial,
  onEquip,
  busy,
}: {
  item: LockerItem;
  initial: string;
  onEquip: (i: LockerItem) => void;
  busy: boolean;
}): React.ReactElement {
  const rarity = toBadgeRarity(item.rarity);
  // A custom property is a valid inline style that CSSProperties does not list.
  const rarityStyle: React.CSSProperties & { "--rarity": string } = {
    "--rarity": BADGE_RARITY_VAR[rarity],
  };
  const pct =
    item.progressTotal > 0
      ? Math.min(100, Math.round((item.progressDone / item.progressTotal) * 100))
      : 0;
  return (
    <article
      className="locker-card"
      data-equipped={item.equipped}
      data-locked={!item.unlocked}
      aria-label={item.label}
    >
      <div className="locker-card__swatch">
        <Swatch type={item.type} code={item.code} initial={initial} />
        {!item.unlocked && (
          <span className="locker-card__lock" aria-hidden="true">
            <Lock size={18} strokeWidth={1.75} />
          </span>
        )}
      </div>

      <div className="locker-card__head">
        <h3>{item.label}</h3>
        <span className="locker-card__rarity" style={rarityStyle}>
          {BADGE_RARITY_LABELS[rarity]}
        </span>
      </div>
      {item.description !== null && item.description !== "" && (
        <p className="locker-card__description">{item.description}</p>
      )}

      {item.equipped ? (
        <span className="locker-card__equipped" role="status">
          <Check size={16} strokeWidth={2.25} aria-hidden="true" />
          Équipé
        </span>
      ) : item.unlocked ? (
        <button
          className="btn btn--ghost locker-card__equip"
          type="button"
          disabled={busy}
          onClick={() => {
            onEquip(item);
          }}
        >
          Équiper
        </button>
      ) : (
        <div className="locker-card__locked">
          <span>À débloquer · {item.condition}</span>
          {item.progressTotal > 0 && (
            <div className="locker-card__progress">
              <ProgressBar value={pct} style={{ flex: 1 }} label={item.condition} />
              <span>
                {item.progressDone}/{item.progressTotal}
              </span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * The live preview: the site's own pieces, not a drawing of them. The logo,
 * the active page, the accent button and the progress bar read the accent;
 * the avatar wears the contour and the frame; the lesson code block wears the
 * terminal theme. The attributes are set on the rail, so it shows what this
 * page has equipped even before the server has answered.
 */
function LivePreview({
  attrs,
  profile,
  equippedLabel,
}: {
  attrs: Record<string, string>;
  profile: LockerProfile;
  equippedLabel: (type: CosmeticType) => string;
}): React.ReactElement {
  const name = profile.username ? `@${profile.username}` : profile.displayName;
  return (
    <StickyRail as="aside" {...attrs} className="locker-preview" aria-label="Aperçu sur le site">
      <header className="locker-preview__head">
        <span>Aperçu sur le site</span>
        <span>En direct</span>
      </header>

      <figure className="locker-specimen">
        <figcaption>Navigation</figcaption>
        <div className="locker-nav">
          <div className="locker-nav__brand">
            <BastionLogo size={26} />
            <b>
              CYBERLEARN<span>.</span>
            </b>
          </div>
          <span className="locker-nav__item locker-nav__item--active">
            <LayoutGrid size={15} aria-hidden="true" />
            Tableau de bord
          </span>
          <span className="locker-nav__item">
            <Route size={15} aria-hidden="true" />
            Parcours
          </span>
          <div className="locker-nav__account">
            <span className="cl-avatar-frame locker-nav__avatar" style={cosmeticAvatarFilter(0.35)}>
              <AvatarView src={profile.avatarSrc} name={profile.displayName} glyphSize={16} />
            </span>
            <span>
              <b>{profile.displayName || name}</b>
              <small>Niveau {profile.level}</small>
            </span>
          </div>
        </div>
      </figure>

      <figure className="locker-specimen">
        <figcaption>Leçon</figcaption>
        <div className="locker-mission">
          <span className="locker-mission__kicker">Prochaine mission</span>
          <strong>Le terminal, pas à pas</strong>
          <ProgressBar value={60} label="Progression de l’exemple" />
          <span className="btn btn--accent btn--sm locker-mission__cta" aria-hidden="true">
            Reprendre la leçon
          </span>
        </div>
        <div className="locker-code">
          <CodeBlock filename="~/casier.sh">
            <code>{`$ whoami\n${name}\n$ level --show\n${String(profile.level)} ✓`}</code>
          </CodeBlock>
        </div>
      </figure>

      <figure className="locker-specimen">
        <figcaption>Profil</figcaption>
        <div className="locker-profile">
          <span
            className="cl-avatar-frame locker-profile__avatar"
            style={cosmeticAvatarFilter(0.8)}
          >
            <AvatarView src={profile.avatarSrc} name={profile.displayName} glyphSize={36} />
          </span>
          <b>{name}</b>
        </div>
        <div className="locker-profile__stats">
          {[
            { label: "Niveau", value: profile.level },
            { label: "Badges", value: profile.badgesCount },
            { label: "Série", value: profile.streakDays },
          ].map((s) => (
            <StatTile key={s.label} size="sm" align="center" label={s.label} value={s.value} />
          ))}
        </div>
      </figure>

      <dl className="locker-preview__loadout">
        {SLOTS.map((slot) => (
          <div key={slot.type}>
            <dt>{SLOT_LABEL[slot.type]}</dt>
            <dd>{equippedLabel(slot.type)}</dd>
          </div>
        ))}
      </dl>
    </StickyRail>
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
  const [activeTab, setActiveTab] = useState<CosmeticType>("ACCENT_COLOR");
  const [equipped, setEquipped] = useState<Record<CosmeticType, string | null>>(() =>
    initialEquipped(items),
  );

  const wearing = (type: CosmeticType): string => equipped[type] ?? DEFAULT_CODE[type];

  function equip(item: LockerItem): void {
    if (!item.unlocked || busy || wearing(item.type) === item.code) return;
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

  // Reflect local equipment in the list (so the active card shows Équipé live).
  const liveItems = items.map((i) => ({ ...i, equipped: wearing(i.type) === i.code }));
  const tabItems = liveItems.filter((i) => i.type === activeTab);

  const previewAttrs: Record<string, string> = {};
  for (const slot of SLOTS) {
    const code = equipped[slot.type];
    if (code) previewAttrs[SLOT_ATTR[slot.type]] = code;
  }
  const equippedLabel = (type: CosmeticType): string =>
    items.find((i) => i.code === wearing(type))?.label ?? "Par défaut";

  return (
    <div className="page-container learning-catalogue learning-workspace progression-workspace locker-workspace">
      <ProgressionHeading
        eyebrow="Progression / Ta signature personnelle"
        title="Le casier"
        description="Tes succès débloquent de nouveaux détails. À toi de choisir ta signature : elle s’applique à tout le site dès que tu l’équipes."
      />
      <div className="catalogue-ledger">
        <span>
          <b>{liveItems.filter((item) => item.unlocked).length}</b> cosmétiques débloqués
        </span>
        <span>
          <b>{liveItems.length}</b> au catalogue
        </span>
        <span className="catalogue-ledger__total">{SLOTS.length} emplacements à personnaliser</span>
      </div>
      <div className="casier-layout">
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
          <p className="locker-slot-hint">{SLOT_HINT[activeTab]}</p>

          {tabItems.length === 0 && (
            <section className="locker-empty">
              <h2>Rien dans cet emplacement.</h2>
              <p>
                Aucun cosmétique n’est proposé ici pour le moment. L’aperçu conserve ta signature
                actuelle.
              </p>
              <Link href="/badges" className="workspace-link">
                Voir mes badges ↗
              </Link>
            </section>
          )}
          <div className="locker-grid">
            {tabItems.map((item) => (
              <Card
                key={item.id}
                item={item}
                initial={profile.initial}
                onEquip={equip}
                busy={busy}
              />
            ))}
          </div>
        </div>

        <LivePreview attrs={previewAttrs} profile={profile} equippedLabel={equippedLabel} />
      </div>
    </div>
  );
}

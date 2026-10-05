import Link from "next/link";
import { formatNumberFr } from "@cyberlearn/lib";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { Brackets } from "./corner-brackets";

export interface PathCatalogCardData {
  slug: string;
  refCode: string;
  title: string;
  description: string;
  category: string;
  track: string;
  difficulty: string;
  estimatedHours: number;
  xpTotal: number;
  lessonCount: number;
  hasCert: boolean;
  /** Learners' average, shown once somebody has rated the path. */
  rating?: PathRating | null;
}

export type Kind = "cyber" | "dev" | "net";

/** The stylesheet's name for each category, on the cards' modifier classes. */
export const CATEGORY_KIND: Record<string, Kind> = {
  CYBERSEC: "cyber",
  DEV: "dev",
  NETWORK: "net",
};

/** Three bars: the fourth level lights them all, like the third. */
export function barsOf(level: number): 1 | 2 | 3 {
  return level <= 1 ? 1 : level === 2 ? 2 : 3;
}

const TRACK_META: Record<string, string> = {
  SKILL: "Compétence",
  CAREER: "Métier",
};

/** The learners' average, once somebody has rated the path. */
export interface PathRating {
  avg: number;
  count: number;
}

/**
 * "★ 4,6" in a card's stats line, the count in the tooltip or spelled out.
 *
 * One drawing for the four cards of a path (the hero, the one in progress,
 * the certified one, the one to discover): the average showed on the path's
 * own page and on the cards to discover, and nowhere a reader had started it.
 */
export function RatingStat({
  rating,
  withCount = false,
}: {
  rating: PathRating;
  withCount?: boolean;
}): React.JSX.Element | null {
  if (rating.count <= 0) return null;
  const avg = rating.avg.toFixed(1).replace(".", ",");
  const title = `Note moyenne des apprenants : ${avg} sur 5, ${String(rating.count)} avis`;
  return (
    <span className="rating" title={title}>
      <span aria-hidden="true" className="rating__star">
        ★
      </span>{" "}
      <b>{avg}</b>
      {withCount && <> · {rating.count} avis</>}
    </span>
  );
}

/** Three bars, the first `level` lit: the difficulty gauge on every card and hero. */
export function DiffBars({ level }: { level: 1 | 2 | 3 }): React.JSX.Element {
  return (
    <span className={`diff-bars lv${String(level)}`}>
      <span />
      <span />
      <span />
    </span>
  );
}

/** The category's line drawing: a shield, brackets, a network. */
export function KindGlyph({ kind, size = 64 }: { kind: Kind; size?: number }): React.JSX.Element {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (kind === "cyber") {
    return (
      <svg className="kind-ico" {...props} aria-hidden="true">
        <path d="M32 5 L53 13 V31 C53 44 43 53 32 59 C21 53 11 44 11 31 V13 Z" />
        <path d="M23 32 L29 38 L42 23" />
      </svg>
    );
  }

  if (kind === "dev") {
    return (
      <svg className="kind-ico" {...props} aria-hidden="true">
        <path d="M22 19 L7 32 L22 45" />
        <path d="M42 19 L57 32 L42 45" />
        <path d="M37 12 L27 52" />
      </svg>
    );
  }

  return (
    <svg className="kind-ico" {...props} aria-hidden="true">
      <circle cx="32" cy="12" r="4.5" />
      <circle cx="12" cy="48" r="4.5" />
      <circle cx="52" cy="48" r="4.5" />
      <path d="M32 16.5 L13 43 M32 16.5 L51 43 M16 48 L48 48" />
      <circle cx="32" cy="32" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PathCatalogCard({
  path,
  href = `/paths/${path.slug}`,
  id,
}: {
  path: PathCatalogCardData;
  href?: string;
  id?: string;
}): React.JSX.Element {
  const category = categoryMeta(path.category);
  const kind = CATEGORY_KIND[path.category] ?? "cyber";
  const difficulty = difficultyMeta(path.difficulty);

  return (
    <Link id={id} href={href} className={`game-card game-card--${kind}`}>
      <Brackets />
      <div className="game-card__cover">
        <span className="game-card__cat">{category.short}</span>
        <span className="game-card__track">{TRACK_META[path.track] ?? "Compétence"}</span>
        <span className="game-card__diff">
          <DiffBars level={barsOf(difficulty.level)} />
          {difficulty.label}
        </span>
        <span className="game-card__glyph">
          <KindGlyph kind={kind} />
        </span>
        <span className="game-card__id">
          {"// "}
          <b>{path.refCode}</b>
        </span>
      </div>
      <div className="game-card__body">
        <h3 className="game-card__title">{path.title}</h3>
        <p className="game-card__desc">{path.description}</p>
        <div className="game-card__stats">
          <span>
            <b>{path.lessonCount}</b> miss.
          </span>
          <span className="sep">·</span>
          <span>
            <b>~{path.estimatedHours}H</b>
          </span>
          <span className="sep">·</span>
          <span className="xp">+{formatNumberFr(path.xpTotal)} XP</span>
          {path.rating && path.rating.count > 0 && (
            <>
              <span className="sep">·</span>
              <RatingStat rating={path.rating} />
            </>
          )}
          {path.hasCert && (
            <>
              <span className="sep">·</span>
              <span className="cert-mini" aria-label="Certificat inclus">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="8" cy="6" r="3" />
                  <path d="M5.5 8.5 L4.5 14 L8 12 L11.5 14 L10.5 8.5" />
                </svg>
              </span>
            </>
          )}
        </div>
      </div>
      <div className="game-card__foot">
        <span className="btn-start">
          Commencer
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 8 H13 M9 4 L13 8 L9 12" />
          </svg>
        </span>
      </div>
    </Link>
  );
}

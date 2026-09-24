import Link from "next/link";
import { formatNumberFr } from "@cyberlearn/lib";

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
}

type Kind = "cyber" | "dev" | "net";

const CATEGORY_META: Record<string, { label: string; kind: Kind }> = {
  CYBERSEC: { label: "Cybersec", kind: "cyber" },
  DEV: { label: "Dev", kind: "dev" },
  NETWORK: { label: "Réseau", kind: "net" },
};

const DIFF_META: Record<string, { label: string; level: 1 | 2 | 3 }> = {
  BEGINNER: { label: "Débutant", level: 1 },
  INTERMEDIATE: { label: "Intermédiaire", level: 2 },
  ADVANCED: { label: "Avancé", level: 3 },
  EXPERT: { label: "Expert", level: 3 },
};

const TRACK_META: Record<string, string> = {
  SKILL: "Compétence",
  CAREER: "Métier",
};

const CATEGORY_DEFAULT = { label: "?", kind: "cyber" as Kind };
const DIFF_DEFAULT = { label: "?", level: 1 as const };

function Brackets(): React.JSX.Element {
  return (
    <>
      <span className="bk tl" />
      <span className="bk tr" />
      <span className="bk bl" />
      <span className="bk br" />
    </>
  );
}

function DiffBars({ level }: { level: 1 | 2 | 3 }): React.JSX.Element {
  return (
    <span className={`diff-bars lv${String(level)}`}>
      <span />
      <span />
      <span />
    </span>
  );
}

function KindGlyph({ kind }: { kind: Kind }): React.JSX.Element {
  const props = {
    width: 64,
    height: 64,
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
  const category = CATEGORY_META[path.category] ?? CATEGORY_DEFAULT;
  const difficulty = DIFF_META[path.difficulty] ?? DIFF_DEFAULT;

  return (
    <Link id={id} href={href} className={`game-card game-card--${category.kind}`}>
      <Brackets />
      <div className="game-card__cover">
        <span className="game-card__cat">{category.label}</span>
        <span className="game-card__track">{TRACK_META[path.track] ?? "Compétence"}</span>
        <span className="game-card__diff">
          <DiffBars level={difficulty.level} />
          {difficulty.label}
        </span>
        <span className="game-card__glyph">
          <KindGlyph kind={category.kind} />
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

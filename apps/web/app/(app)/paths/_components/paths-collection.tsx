"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { PathCatalogCard } from "@/app/_components/path-catalog-card";
import { type DomainFilter, filterPaths, type TrackFilter } from "@/lib/paths/filter-paths";
import "./paths-catalog-v2.css";
import { formatNumberFr } from "@cyberlearn/lib";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SerializedPath {
  id: string;
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
  status: "idle" | "inprog" | "done";
  progressDone: number;
  progressTotal: number;
  rating: { avg: number; count: number } | null;
  /** Next not-yet-completed lesson (in-progress paths only) - drives the hero panel. */
  nextLesson: {
    n: string;
    title: string;
    slug: string;
    xpReward: number;
    estimatedMinutes: number;
  } | null;
}

interface Props {
  paths: SerializedPath[];
  inProgCount: number;
  doneCount: number;
  totalXp: number;
  totalHours: number;
}

// ── Design meta ─────────────────────────────────────────────────────────────────

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

// A path is either a competence or a job. Kept separate from the domain chip:
// they answer different questions and a learner filters on one or the other.
const TRACK_META: Record<string, { label: string; short: string }> = {
  SKILL: { label: "Compétence", short: "Compétence" },
  CAREER: { label: "Métier", short: "Métier" },
};
const TRACK_DEFAULT = { label: "Compétence", short: "Compétence" };

const CATEGORY_DEFAULT = { label: "?", kind: "cyber" as Kind };
const DIFF_DEFAULT = { label: "?", level: 1 as const };

type Filter = DomainFilter;
const TRACK_PILLS: { id: TrackFilter; label: string }[] = [
  { id: "all", label: "Tous" },
  { id: "SKILL", label: "Compétence" },
  { id: "CAREER", label: "Métier" },
];
const PILLS: { id: Filter; cls: string; label: string }[] = [
  { id: "all", cls: "all", label: "Tous" },
  { id: "CYBERSEC", cls: "cyber", label: "Cybersec" },
  { id: "DEV", cls: "dev", label: "Dev" },
  { id: "NETWORK", cls: "net", label: "Réseau" },
];

// Not toLocaleString: its thousands separator depends on the engine and
// breaks hydration. See formatNumberFr.
const fmtXp = (n: number): string => formatNumberFr(n);
const pctOf = (p: SerializedPath): number =>
  p.progressTotal > 0 ? Math.round((p.progressDone / p.progressTotal) * 100) : 0;

// ── Shared markup ───────────────────────────────────────────────────────────────

const ARROW = (
  <svg
    width="13"
    height="13"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 8 H13 M9 4 L13 8 L9 12" />
  </svg>
);

const CERT_ICON = (
  <svg
    width="13"
    height="13"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="8" cy="6" r="3" />
    <path d="M5.5 8.5 L4.5 14 L8 12 L11.5 14 L10.5 8.5" />
  </svg>
);

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

function KindGlyph({ kind, size }: { kind: Kind; size: number }): React.JSX.Element {
  const s = {
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
      <svg className="kind-ico" {...s}>
        <path d="M32 5 L53 13 V31 C53 44 43 53 32 59 C21 53 11 44 11 31 V13 Z" />
        <path d="M23 32 L29 38 L42 23" />
      </svg>
    );
  }
  if (kind === "dev") {
    return (
      <svg className="kind-ico" {...s}>
        <path d="M22 19 L7 32 L22 45" />
        <path d="M42 19 L57 32 L42 45" />
        <path d="M37 12 L27 52" />
      </svg>
    );
  }
  return (
    <svg className="kind-ico" {...s}>
      <circle cx="32" cy="12" r="4.5" />
      <circle cx="12" cy="48" r="4.5" />
      <circle cx="52" cy="48" r="4.5" />
      <path d="M32 16.5 L13 43 M32 16.5 L51 43 M16 48 L48 48" />
      <circle cx="32" cy="32" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SectionLabel({ tag, count }: { tag: string; count: string }): React.JSX.Element {
  return (
    <div className="pc2-section">
      <span className="pc2-section__tag">{tag}</span>
      <span className="pc2-section__count">{count}</span>
      <span className="pc2-section__rule" />
    </div>
  );
}

// ── Tier cards ──────────────────────────────────────────────────────────────────

function HeroPath({ path }: { path: SerializedPath }): React.JSX.Element {
  const cat = CATEGORY_META[path.category] ?? CATEGORY_DEFAULT;
  const diff = DIFF_META[path.difficulty] ?? DIFF_DEFAULT;
  const pct = pctOf(path);
  return (
    <article className={`hero-path hero-path--${cat.kind}`}>
      <Brackets />
      <div className="hero-path__main">
        <div className="hero-path__topline">
          <span className="state-chip">
            <span className="state-chip__dot" />
            En cours
          </span>
          <span className="dom-tag">
            <span className="dom-tag__dot" />
            {cat.label}
          </span>
          <span className="track-tag">{TRACK_META[path.track]?.short ?? TRACK_DEFAULT.short}</span>
          <span className="diff-tag">
            <DiffBars level={diff.level} />
            {diff.label}
          </span>
          <span className="refcode">
            {"// "}
            <b>{path.refCode}</b>
          </span>
        </div>
        <h2 className="hero-path__title">{path.title}</h2>
        <p className="hero-path__desc">{path.description}</p>
        <div className="hero-path__stats">
          <span>
            <b>{path.lessonCount}</b> missions
          </span>
          <span className="sep">·</span>
          <span>
            <b>~{path.estimatedHours}H</b>
          </span>
          <span className="sep">·</span>
          <span className="xp">+{fmtXp(path.xpTotal)} XP</span>
          {path.hasCert && (
            <>
              <span className="sep">·</span>
              <span className="cert">
                {CERT_ICON}
                Certificat
              </span>
            </>
          )}
        </div>
        <div className="hero-path__foot">
          <div className="hero-prog">
            <span>
              <b>{path.progressDone}</b> / {path.progressTotal} missions complétées
            </span>
            <span className="pct">{pct}%</span>
          </div>
          <div className="bar-thick">
            <div className="bar-thick__fill" style={{ width: `${String(pct)}%` }} />
          </div>
          <div className="hero-path__cta-row">
            <Link href={`/paths/${path.slug}`} className="btn-primary">
              Continuer le parcours {ARROW}
            </Link>
            <Link href={`/paths/${path.slug}`} className="btn-ghost">
              Aperçu
            </Link>
          </div>
        </div>
      </div>
      <div className="hero-path__console">
        <div className="hero-glyph">
          <span className="hero-glyph__halo" />
          <KindGlyph kind={cat.kind} size={132} />
        </div>
        {path.nextLesson && (
          <Link href={`/lessons/${path.nextLesson.slug}`} className="hero-next">
            <div className="hero-next__lbl">Prochaine mission · {path.nextLesson.n}</div>
            <h3 className="hero-next__title">{path.nextLesson.title}</h3>
            <div className="hero-next__meta">
              <span>
                +{path.nextLesson.xpReward} XP · {path.nextLesson.estimatedMinutes} MIN
              </span>
              <span className="go">Accéder →</span>
            </div>
          </Link>
        )}
      </div>
    </article>
  );
}

function ActiveCard({ path }: { path: SerializedPath }): React.JSX.Element {
  const cat = CATEGORY_META[path.category] ?? CATEGORY_DEFAULT;
  const pct = pctOf(path);
  return (
    <Link href={`/paths/${path.slug}`} className={`active-card active-card--${cat.kind}`}>
      <Brackets />
      <div className="active-card__glyph">
        <KindGlyph kind={cat.kind} size={56} />
      </div>
      <div className="active-card__body">
        <div className="active-card__top">
          <span className="state-chip">
            <span className="state-chip__dot" />
            En cours
          </span>
          <span className="active-card__refcode">
            {"// "}
            <b>{path.refCode}</b>
          </span>
        </div>
        <h3 className="active-card__title">{path.title}</h3>
        <div className="active-card__stats">
          <span>
            <b>{path.lessonCount}</b> missions
          </span>
          <span className="sep">·</span>
          <span>
            <b>~{path.estimatedHours}H</b>
          </span>
          <span className="sep">·</span>
          <span className="xp">+{fmtXp(path.xpTotal)} XP</span>
          {path.hasCert && (
            <>
              <span className="sep">·</span>
              <span className="cert-mini">{CERT_ICON}</span>
            </>
          )}
        </div>
        <div className="active-card__progline">
          <span>
            <b>{path.progressDone}</b> / {path.progressTotal} missions
          </span>
          <span className="pct">{pct}%</span>
        </div>
        <div className="bar-mid">
          <div className="bar-mid__fill" style={{ width: `${String(pct)}%` }} />
        </div>
        <span className="active-card__cta">Continuer {ARROW}</span>
      </div>
    </Link>
  );
}

function TrophyCard({ path }: { path: SerializedPath }): React.JSX.Element {
  return (
    <Link href={`/paths/${path.slug}`} className="trophy-card">
      <Brackets />
      <span className="trophy-card__seal">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="9" r="4.5" />
          <path d="M8 12.5 L6.5 21 L12 18 L17.5 21 L16 12.5" />
        </svg>
      </span>
      <div className="trophy-card__body">
        <div className="trophy-card__eyebrow">Certifié</div>
        <div className="trophy-card__refcode">
          {"// "}
          <b>{path.refCode}</b>
        </div>
        <h3 className="trophy-card__title">{path.title}</h3>
        <div className="trophy-card__done">
          <span className="ck">
            <svg
              width="11"
              height="11"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8 L7 12 L13 4" />
            </svg>
          </span>
          Parcours complété · 100%
        </div>
        <div className="trophy-card__stats">
          <span>
            <b>{path.lessonCount}</b> missions
          </span>
          <span className="sep">·</span>
          <span>
            <b>~{path.estimatedHours}H</b>
          </span>
          <span className="sep">·</span>
          <span className="xp">+{fmtXp(path.xpTotal)} XP gagnés</span>
        </div>
      </div>
      <div className="trophy-card__foot">
        <span className="btn-trophy">
          <svg
            width="13"
            height="13"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="4" width="12" height="8" />
            <path d="M5 14 L6.5 12.5 M11 14 L9.5 12.5" />
            <circle cx="8" cy="8" r="1.6" />
          </svg>
          Voir le certificat
        </span>
      </div>
    </Link>
  );
}

function EmptyState({ filterLabel }: { filterLabel: string }): React.JSX.Element {
  return (
    <div className="pc2-empty">
      <div className="pc2-empty__glyph">
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="8" y="12" width="32" height="26" />
          <path d="M8 18 H40 M14 25 H22 M14 30 H30" />
          <path d="M30 28 L40 38" />
        </svg>
      </div>
      <h3 className="pc2-empty__title">Aucun parcours trouvé</h3>
      <p className="pc2-empty__sub">{`// 0 résultat pour le filtre « ${filterLabel} »`}</p>
      <span className="pc2-empty__cmd">
        <span className="p">$</span> reset --filter=all
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PathsCollection({
  paths,
  inProgCount,
  doneCount,
  totalXp,
  totalHours,
}: Props): React.ReactElement {
  const [filter, setFilter] = useState<Filter>("all");
  const [trackFilter, setTrackFilter] = useState<TrackFilter>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => filterPaths(paths, { domain: filter, track: trackFilter, search }),
    [paths, filter, trackFilter, search],
  );

  const idleCount = paths.length - inProgCount - doneCount;
  const filterLabel = PILLS.find((p) => p.id === filter)?.label ?? "Tous";

  const inprog = filtered.filter((p) => p.status === "inprog");
  const done = filtered.filter((p) => p.status === "done");
  const idle = filtered.filter((p) => p.status === "idle");
  const hero = inprog[0];
  const secondary: { p: SerializedPath; type: "active" | "trophy" }[] = [
    ...inprog.slice(1).map((p) => ({ p, type: "active" as const })),
    ...done.map((p) => ({ p, type: "trophy" as const })),
  ];

  return (
    <div className="pc2-root">
      <div className="pc2">
        {/* breadcrumb */}
        <div className="pc2-crumb">
          <span className="p">$</span>
          <span>~/</span>
          <b>cyberlearn</b>
          <span className="slash">/</span>
          <span className="current">parcours</span>
          <span className="caret" />
        </div>

        {/* header */}
        <header className="pc2-head">
          <div>
            <h1 className="pc2-title">
              <em>{paths.length}</em> parcours disponibles
            </h1>
            <p className="pc2-sub">
              {
                "Chaque parcours mène d'une compétence brute à un certificat vérifiable. Tu progresses mission par mission."
              }
            </p>
            <Link href="/paths/guide" className="pc2-guide">
              <span className="pc2-guide__tag">Guide</span>
              Pas sûr de par où commencer ? Deux questions pour te proposer un parcours
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="pc2-telemetry">
            <div className="pc2-telemetry__row">
              <span>
                <b className="ip">{inProgCount}</b> en cours
              </span>
              <span className="pc2-telemetry__sep" />
              <span>
                <b className="cp">{doneCount}</b> certifié
              </span>
              <span className="pc2-telemetry__sep" />
              <span>
                <b>{idleCount}</b> à découvrir
              </span>
            </div>
            <div className="pc2-telemetry__rule" />
            <div className="pc2-telemetry__row">
              <span>
                <b>{totalHours}</b> H de contenu
              </span>
              <span className="pc2-telemetry__sep" />
              <span>
                <b>{fmtXp(totalXp)}</b> XP total
              </span>
            </div>
          </div>
        </header>

        {/* filters */}
        <div className="pc2-filters">
          <span className="pc2-filters__label">› DOMAINE</span>
          <div className="pc2-filters__group">
            {PILLS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`pc2-pill pc2-pill--${p.cls}${filter === p.id ? " is-active" : ""}`}
                onClick={() => {
                  setFilter(p.id);
                }}
              >
                <span className="pc2-pill__dot" />
                <span>{p.label}</span>
              </button>
            ))}
          </div>
          <span className="pc2-filters__sep" />
          <span className="pc2-filters__label">› TYPE</span>
          <div className="pc2-filters__group">
            {TRACK_PILLS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`pc2-pill pc2-pill--track${trackFilter === t.id ? " is-active" : ""}`}
                onClick={() => {
                  setTrackFilter(t.id);
                }}
              >
                <span className="pc2-pill__dot" />
                <span>{t.label}</span>
              </button>
            ))}
          </div>
          <span className="pc2-filters__sep" />
          <label className="pc2-search">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M11 11 L14 14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <input
              type="text"
              placeholder="/ chercher un parcours..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
            />
          </label>
        </div>

        {filtered.length === 0 && <EmptyState filterLabel={filterLabel} />}

        {hero && (
          <>
            <SectionLabel
              tag="Reprendre"
              count={`// ${String(inprog.length)} parcours actif${inprog.length > 1 ? "s" : ""}`}
            />
            <HeroPath path={hero} />
          </>
        )}

        {secondary.length > 0 && (
          <>
            <SectionLabel tag="Progression" count="// secondaires · certifiés" />
            <div className="pc2-duo">
              {secondary.map(({ p, type }) =>
                type === "active" ? (
                  <ActiveCard key={p.id} path={p} />
                ) : (
                  <TrophyCard key={p.id} path={p} />
                ),
              )}
            </div>
          </>
        )}

        {idle.length > 0 && (
          <>
            <SectionLabel tag="À découvrir" count={`// ${String(idle.length)} parcours`} />
            <div className="pc2-discover">
              {idle.map((p) => (
                <PathCatalogCard key={p.id} path={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

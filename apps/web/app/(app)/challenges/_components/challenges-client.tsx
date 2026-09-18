"use client";

// "use client" justified: filter state (useState) + countdown (useEffect/setInterval)

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Select } from "@cyberlearn/ui";

// ── Serializable item type (passed from server) ───────────────────────────────

export type DisplayStatus = "LOCKED" | "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";

export interface ChallengeItem {
  id: string;
  refCode: string;
  slug: string;
  title: string;
  description: string;
  category: "CYBERSEC" | "DEV" | "NETWORK";
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  type: "CTF" | "PUZZLE" | "LAB" | "SCRIPT";
  xpReward: number;
  timeLimitMin: number;
  maxAttempts: number;
  userAttempts: number;
  displayStatus: DisplayStatus;
  lockedByTitle: string | null;
}

interface Props {
  items: ChallengeItem[];
  featured: ChallengeItem | null;
  featuredEndMs: number;
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function IconTarget({ size = 56 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="32" cy="32" r="22" />
      <circle cx="32" cy="32" r="14" />
      <circle cx="32" cy="32" r="6" />
      <circle cx="32" cy="32" r="1.5" fill="currentColor" />
      <path d="M32 4 V16 M32 48 V60 M4 32 H16 M48 32 H60" />
    </svg>
  );
}

function IconCrosshair({ size = 44 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="32" cy="32" r="18" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
      <path d="M32 6 V20 M32 44 V58 M6 32 H20 M44 32 H58" />
    </svg>
  );
}

function IconPuzzle({ size = 44 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 18 H26 V14 C26 10 28 8 32 8 C36 8 38 10 38 14 V18 H50 V30 H46 C42 30 40 32 40 36 C40 40 42 42 46 42 H50 V54 H38 V50 C38 46 36 44 32 44 C28 44 26 46 26 50 V54 H14 V42 H18 C22 42 24 40 24 36 C24 32 22 30 18 30 H14 Z" />
    </svg>
  );
}

function IconTerminal({ size = 44 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="6" y="10" width="52" height="44" rx="2" />
      <path d="M6 20 H58" />
      <path d="M16 32 L24 38 L16 44" />
      <path d="M30 46 H44" />
    </svg>
  );
}

function IconLock({ size = 14 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="7" width="10" height="7" rx="1" />
      <path d="M5 7 V5 C5 3 6 2 8 2 C10 2 11 3 11 5 V7" />
    </svg>
  );
}

function IconCheck({ size = 13 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8 L7 12 L13 4" />
    </svg>
  );
}

function IconClock({ size = 11 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5 V8 L10.5 9.5" />
    </svg>
  );
}

function IconArrow({ size = 11 }: { size?: number }): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8 H13 M9 4 L13 8 L9 12" />
    </svg>
  );
}

// ── Difficulty bars ───────────────────────────────────────────────────────────

type DiffKind = "easy" | "med" | "hard";

interface DiffMeta {
  level: number;
  kind: DiffKind;
  label: string;
}

const DIFF_META: Record<ChallengeItem["difficulty"], DiffMeta> = {
  BEGINNER: { level: 1, kind: "easy", label: "FACILE" },
  INTERMEDIATE: { level: 2, kind: "med", label: "INTERMÉDIAIRE" },
  ADVANCED: { level: 3, kind: "hard", label: "AVANCÉ" },
  EXPERT: { level: 4, kind: "hard", label: "EXPERT" },
};

function DiffBars({ difficulty }: { difficulty: ChallengeItem["difficulty"] }): React.ReactElement {
  const { level, kind, label } = DIFF_META[difficulty];
  return (
    <span className={`cc__diff cc__diff--${kind}`}>
      <span className="cc__diff-bars">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < level ? "on" : ""} />
        ))}
      </span>
      {label}
    </span>
  );
}

// ── Category helpers ──────────────────────────────────────────────────────────

function catCssKey(cat: ChallengeItem["category"]): "cyber" | "dev" | "net" {
  if (cat === "CYBERSEC") return "cyber";
  if (cat === "DEV") return "dev";
  return "net";
}

function catLabel(cat: ChallengeItem["category"]): string {
  if (cat === "NETWORK") return "RÉSEAU";
  return cat;
}

function typeModifier(type: ChallengeItem["type"]): string {
  if (type === "PUZZLE") return "cc__type--puzzle";
  if (type === "LAB") return "cc__type--lab";
  if (type === "SCRIPT") return "cc__type--script";
  return "";
}

function TypeIcon({
  type,
  size = 44,
}: { type: ChallengeItem["type"]; size?: number }): React.ReactElement {
  if (type === "CTF") return <IconCrosshair size={size} />;
  if (type === "PUZZLE") return <IconPuzzle size={size} />;
  if (type === "SCRIPT") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 44 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="14 16 8 22 14 28" />
        <polyline points="30 16 36 22 30 28" />
        <line x1="26" y1="12" x2="18" y2="32" />
      </svg>
    );
  }
  return <IconTerminal size={size} />;
}

// ── Countdown component ───────────────────────────────────────────────────────

interface CountdownValue {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeCountdown(endMs: number): CountdownValue {
  const diff = Math.max(0, endMs - Date.now());
  const totalSecs = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    minutes: Math.floor((totalSecs % 3600) / 60),
    seconds: totalSecs % 60,
  };
}

function Countdown({ endMs }: { endMs: number }): React.ReactElement {
  const [value, setValue] = useState<CountdownValue>(() => computeCountdown(endMs));

  useEffect(() => {
    const id = setInterval(() => {
      setValue(computeCountdown(endMs));
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [endMs]);

  const pad = (n: number): string => String(n).padStart(2, "0");

  return (
    <div className="feat__countdown">
      <span className="feat__countdown-label">SE TERMINE DANS</span>
      <span className="feat__countdown-time">
        <span>
          {value.days}
          <u>J</u>
        </span>
        <span>
          {pad(value.hours)}
          <u>H</u>
        </span>
        <span>
          {pad(value.minutes)}
          <u>M</u>
        </span>
        <span>
          {pad(value.seconds)}
          <u>S</u>
        </span>
      </span>
    </div>
  );
}

// ── Featured challenge card ───────────────────────────────────────────────────

function Featured({
  challenge,
  endMs,
}: { challenge: ChallengeItem; endMs: number }): React.ReactElement {
  const ck = catCssKey(challenge.category);
  const tm = typeModifier(challenge.type);
  return (
    <section className="feat">
      {/* Cover */}
      <div className="feat__cover">
        <span className="feat__corner tl" />
        <span className="feat__corner tr" />
        <span className="feat__corner bl" />
        <span className="feat__corner br" />
        <span className="feat__coords">{"// PAYLOAD.LIVE"}</span>
        <span className="feat__coords feat__coords--right">
          [{challenge.type} · {challenge.refCode}]
        </span>
        <div className="feat__cover-glyph">
          <IconTarget size={140} />
        </div>
        <span className="feat__bonus">+2X XP</span>
      </div>

      {/* Body */}
      <div className="feat__body">
        <span className="feat__label">
          <span className="feat__label__pulse" />
          DÉFI DE LA SEMAINE
        </span>

        <div className="feat__ref">
          {"// "}
          {challenge.refCode} · {(challenge.title.split(" ")[0] ?? challenge.refCode).toUpperCase()}
        </div>

        <h2 className="feat__title">{challenge.title}</h2>

        <p className="feat__desc">{challenge.description}</p>

        <div className="feat__tags">
          <span className={`cc__tag cc__tag--${ck}`}>{catLabel(challenge.category)}</span>
          <DiffBars difficulty={challenge.difficulty} />
          <span className={`cc__type ${tm}`}>{challenge.type}</span>
        </div>

        <Countdown endMs={endMs} />

        <div className="feat__cta">
          <Link href={`/challenges/${challenge.slug}`} className="cc__btn" style={{ borderTop: 0 }}>
            RELEVER LE DÉFI <IconArrow size={13} />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Challenge card ────────────────────────────────────────────────────────────

function CCCard({ challenge }: { challenge: ChallengeItem }): React.ReactElement {
  const ck = catCssKey(challenge.category);
  const tm = typeModifier(challenge.type);
  const isDone = challenge.displayStatus === "COMPLETED";
  const isProg = challenge.displayStatus === "IN_PROGRESS";
  const isLocked = challenge.displayStatus === "LOCKED";

  const attemptsUsedPct =
    challenge.maxAttempts > 0
      ? Math.min(100, Math.round((challenge.userAttempts / challenge.maxAttempts) * 100))
      : 0;
  const remaining = Math.max(0, challenge.maxAttempts - challenge.userAttempts);

  let cls = `cc cc--${ck}`;
  if (isDone) cls += " cc--done";
  if (isProg) cls += " cc--prog";
  if (isLocked) cls += " cc--locked";

  return (
    <article className={cls}>
      <span className="cc__tick tl" />
      <span className="cc__tick tr" />
      <span className="cc__tick bl" />
      <span className="cc__tick br" />

      {/* Cover */}
      <div className="cc__cover">
        <div className="cc__cover-tl">
          <span className={`cc__tag cc__tag--${ck}`}>{catLabel(challenge.category)}</span>
        </div>
        <div className="cc__cover-tr">
          {isDone ? (
            <span className="cc__solved">
              <IconCheck size={11} /> RÉSOLU
            </span>
          ) : isLocked ? (
            <span className="cc__lock">
              <IconLock />
            </span>
          ) : (
            <>
              <DiffBars difficulty={challenge.difficulty} />
              <span className={`cc__type ${tm}`}>{challenge.type}</span>
            </>
          )}
        </div>
        <span className="cc__icon">
          <TypeIcon type={challenge.type} size={48} />
        </span>
      </div>

      {/* Body */}
      <div className="cc__body">
        <div className="cc__ref">
          {"// "}
          {challenge.refCode}
        </div>
        <h3 className="cc__title">{challenge.title}</h3>
        <p className="cc__desc">{challenge.description}</p>
      </div>

      {/* Progress bar (IN_PROGRESS only; shows attempts used) */}
      {isProg && (
        <div className="cc__progbar">
          <div className="cc__progbar-fill" style={{ width: `${String(attemptsUsedPct)}%` }} />
        </div>
      )}

      {/* Meta row */}
      <div className="cc__meta">
        <span className="cc__meta-xp">{challenge.xpReward} XP</span>
        <span className="cc__meta-time">
          <IconClock /> {challenge.timeLimitMin > 0 ? `${String(challenge.timeLimitMin)} MIN` : "∞"}
        </span>
        {isProg ? (
          <span className="cc__prog-ind" style={{ marginLeft: "auto" }}>
            {String(challenge.userAttempts)}/{String(challenge.maxAttempts)} · EN COURS
          </span>
        ) : isDone ? (
          <span
            className="cc__meta-tries"
            style={{ color: "var(--brand-turquoise)", marginLeft: "auto" }}
          >
            RÉSOLU
          </span>
        ) : isLocked ? (
          <span className="cc__meta-tries" style={{ marginLeft: "auto" }}>
            VERROUILLÉ
          </span>
        ) : (
          <span className="cc__meta-tries">
            {remaining} ESSAI{remaining > 1 ? "S" : ""} RESTANT{remaining > 1 ? "S" : ""}
          </span>
        )}
      </div>

      {/* Locked prerequisite message */}
      {isLocked && challenge.lockedByTitle !== null && (
        <div className="cc__lock-msg">
          <IconLock size={12} />
          <span>
            Complète d&apos;abord&nbsp;: <b>{challenge.lockedByTitle}</b>
          </span>
        </div>
      )}

      {/* CTA button */}
      {isDone ? (
        <Link href={`/challenges/${challenge.slug}`} className="cc__btn cc__btn--ghost">
          VOIR LE DÉFI <IconArrow size={12} />
        </Link>
      ) : isProg ? (
        <Link href={`/challenges/${challenge.slug}`} className="cc__btn cc__btn--orange">
          CONTINUER <IconArrow size={12} />
        </Link>
      ) : isLocked ? (
        <span className="cc__btn cc__btn--disabled">
          <IconLock size={12} /> VERROUILLÉ
        </span>
      ) : (
        <Link href={`/challenges/${challenge.slug}`} className="cc__btn">
          RELEVER LE DÉFI <IconArrow size={12} />
        </Link>
      )}
    </article>
  );
}

// ── Main client component ─────────────────────────────────────────────────────

type CatFilter = ChallengeItem["category"] | "TOUS";
type TypeFilter = ChallengeItem["type"] | "TOUS";
type DiffFilter = ChallengeItem["difficulty"] | "TOUS";
type StatFilter = DisplayStatus | "TOUS";

/** The filter row's type scale; the control brings the rest of its skin. */
const FILTER_TRIGGER: React.CSSProperties = {
  fontSize: 10.5,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "8px 12px",
};

export function ChallengesClient({ items, featured, featuredEndMs }: Props): React.ReactElement {
  const [cat, setCat] = useState<CatFilter>("TOUS");
  const [type, setType] = useState<TypeFilter>("TOUS");
  const [diff, setDiff] = useState<DiffFilter>("TOUS");
  const [status, setStatus] = useState<StatFilter>("TOUS");

  const inProgress = items.filter((c) => c.displayStatus === "IN_PROGRESS").length;
  const completed = items.filter((c) => c.displayStatus === "COMPLETED").length;
  const available = items.filter((c) => c.displayStatus === "AVAILABLE").length;

  const filtered = items.filter((c) => {
    if (featured !== null && c.id === featured.id) return false;
    if (cat !== "TOUS" && c.category !== cat) return false;
    if (type !== "TOUS" && c.type !== type) return false;
    if (diff !== "TOUS" && c.difficulty !== diff) return false;
    if (status !== "TOUS" && c.displayStatus !== status) return false;
    return true;
  });

  function handleTypeToggle(t: ChallengeItem["type"]): void {
    setType((prev) => (prev === t ? "TOUS" : t));
  }

  const CAT_PILLS: { label: string; value: CatFilter; dot: string }[] = [
    { label: "TOUS", value: "TOUS", dot: "all" },
    { label: "CYBERSEC", value: "CYBERSEC", dot: "cyber" },
    { label: "DEV", value: "DEV", dot: "dev" },
    { label: "RÉSEAU", value: "NETWORK", dot: "net" },
  ];

  return (
    <div className="chx">
      {/* ── Breadcrumb ──────────────────────────────────────────────── */}
      <div className="chx-breadcrumb">
        <span className="p">$</span>
        <span>~/</span>
        <b>cyberlearn</b>
        <span className="slash">/</span>
        <span className="current">défis</span>
        <span className="caret" />
      </div>

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="chx-head">
        <div>
          <h1 className="chx-title">
            DÉFIS &amp; <em>CHALLENGES</em>
          </h1>
          <p className="chx-sub">
            Teste tes compétences en conditions réelles. CTF, puzzles de code, labs réseau, le
            terrain attaque, à toi de défendre.
          </p>
        </div>
        <div className="chx-stats">
          <span className="chx-stats__item chx-stats__item--prog">
            <span className="chx-stats__dot chx-stats__dot--prog" />
            <b>{inProgress}</b> EN COURS
          </span>
          <span className="chx-stats__sep">·</span>
          <span className="chx-stats__item chx-stats__item--done">
            <span className="chx-stats__dot chx-stats__dot--done" />
            <b>{completed}</b> COMPLÉTÉS
          </span>
          <span className="chx-stats__sep">·</span>
          <span className="chx-stats__item chx-stats__item--avail">
            <span className="chx-stats__dot chx-stats__dot--avail" />
            <b>{available}</b> DISPONIBLES
          </span>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="chx-filters">
        <div className="chx-filters__row">
          <span className="chx-filters__label">{"// CAT"}</span>
          {CAT_PILLS.map(({ label, value, dot }) => (
            <button
              key={value}
              type="button"
              className={`x-pill${cat === value ? " is-active" : ""}`}
              onClick={() => {
                setCat(value);
              }}
            >
              <span className={`x-pill__dot x-pill__dot--${dot}`} />
              {label}
            </button>
          ))}

          <span className="chx-filters__split" />

          <span className="chx-filters__label">{"// TYPE"}</span>
          {(["CTF", "SCRIPT", "PUZZLE", "LAB"] as const).map((t) => (
            <button
              key={t}
              type="button"
              className={`x-pill x-pill--type${type === t ? " is-active" : ""}`}
              onClick={() => {
                handleTypeToggle(t);
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <Select
          block={false}
          aria-label="Difficulté"
          triggerStyle={FILTER_TRIGGER}
          value={diff}
          options={[
            { value: "TOUS", label: "DIFFICULTÉ · TOUTES" },
            { value: "BEGINNER", label: "FACILE" },
            { value: "INTERMEDIATE", label: "INTERMÉDIAIRE" },
            { value: "ADVANCED", label: "AVANCÉ" },
            { value: "EXPERT", label: "EXPERT" },
          ]}
          onChange={(next) => {
            setDiff(next as DiffFilter);
          }}
        />

        <Select
          block={false}
          aria-label="Statut"
          triggerStyle={FILTER_TRIGGER}
          value={status}
          options={[
            { value: "TOUS", label: "STATUT · TOUS" },
            { value: "AVAILABLE", label: "DISPONIBLE" },
            { value: "IN_PROGRESS", label: "EN COURS" },
            { value: "COMPLETED", label: "COMPLÉTÉ" },
            { value: "LOCKED", label: "VERROUILLÉ" },
          ]}
          onChange={(next) => {
            setStatus(next as StatFilter);
          }}
        />
      </div>

      {/* ── Featured ────────────────────────────────────────────────── */}
      {featured !== null ? (
        <Featured challenge={featured} endMs={featuredEndMs} />
      ) : (
        <div
          style={{
            padding: "48px 40px",
            textAlign: "center",
            border: "1px dashed #2A2560",
            background: "rgba(5,4,26,0.4)",
            marginBottom: 32,
          }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#6B6890", margin: 0 }}>
            Aucun défi disponible pour le moment.
          </p>
        </div>
      )}

      {/* ── Section heading ─────────────────────────────────────────── */}
      <div className="chx-section-head">
        <div>
          <span className="chx-section-head__eyebrow">{"// AVAILABLE.STACK"}</span>
          <h2 className="chx-section-head__title">Tous les défis</h2>
        </div>
        <span className="chx-section-head__count">
          <b>{filtered.length}</b> ENTRÉES · TRIÉ PAR PERTINENCE
        </span>
      </div>

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: "80px 40px",
            textAlign: "center",
            border: "1px dashed #2A2560",
            background: "rgba(5,4,26,0.4)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontWeight: 600,
              fontSize: 18,
              color: "#F5F5FA",
              margin: "0 0 8px",
            }}
          >
            Aucun défi trouvé
          </p>
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "#6B6890", margin: 0 }}>
            Essaie d&apos;autres filtres pour trouver tes challenges.
          </p>
        </div>
      ) : (
        <div className="chx-grid">
          {filtered.map((c) => (
            <CCCard key={c.id} challenge={c} />
          ))}
        </div>
      )}
    </div>
  );
}

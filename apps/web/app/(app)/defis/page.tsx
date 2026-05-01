"use client";

// "use client" justified: filter state (useState) + countdown (useEffect/setInterval)

import React, { useState, useEffect } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ChallengeCategory = "CYBERSEC" | "DEV" | "RESEAU";
type ChallengeDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
type ChallengeType = "CTF" | "PUZZLE" | "LAB";
type ChallengeStatus = "COMPLETED" | "IN_PROGRESS" | "LOCKED" | "AVAILABLE";

interface Challenge {
  id: string;
  title: string;
  description: string;
  category: ChallengeCategory;
  difficulty: ChallengeDifficulty;
  type: ChallengeType;
  status: ChallengeStatus;
  xpReward: number;
  timeLimitMin: number;
  attempts: number;
  maxAttempts: number;
  progress?: number; // 0–100, present when IN_PROGRESS
  lockedBy?: string; // prerequisite name, present when LOCKED
}

// ── Static mock data (no Challenge model in DB yet) ───────────────────────────

const CHALLENGES: Challenge[] = [
  {
    id: "c1",
    title: "SQL Injection — Bypass de l'authentification admin",
    description:
      "Trouve la faille dans le formulaire de login d'un panneau d'administration legacy et capture le flag stocké en base.",
    category: "CYBERSEC",
    difficulty: "ADVANCED",
    type: "CTF",
    status: "IN_PROGRESS",
    xpReward: 450,
    timeLimitMin: 45,
    attempts: 2,
    maxAttempts: 5,
    progress: 62,
  },
  {
    id: "c2",
    title: "Algo — Le détecteur de cycle minimal",
    description:
      "Implémente une fonction qui détecte un cycle dans un graphe orienté en O(V+E) sans utiliser de structure tierce.",
    category: "DEV",
    difficulty: "INTERMEDIATE",
    type: "PUZZLE",
    status: "AVAILABLE",
    xpReward: 320,
    timeLimitMin: 30,
    attempts: 0,
    maxAttempts: 3,
  },
  {
    id: "c3",
    title: "Wireshark — Reconstruire la session TCP exfiltrée",
    description:
      "Une capture réseau contient une exfiltration cachée dans des en-têtes DNS. Extrais le payload caché.",
    category: "RESEAU",
    difficulty: "INTERMEDIATE",
    type: "LAB",
    status: "COMPLETED",
    xpReward: 280,
    timeLimitMin: 25,
    attempts: 1,
    maxAttempts: 5,
  },
  {
    id: "c4",
    title: "JWT Forgery — Élève tes privilèges au rang root",
    description:
      "Le token de session utilise un algorithme faible. Trouve la clé, forge un token admin et capture le drapeau.",
    category: "CYBERSEC",
    difficulty: "EXPERT",
    type: "CTF",
    status: "AVAILABLE",
    xpReward: 520,
    timeLimitMin: 50,
    attempts: 0,
    maxAttempts: 3,
  },
  {
    id: "c5",
    title: "Race Condition — Patch le double-spend avant le déploiement",
    description:
      "Le service de transfert est vulnérable à une race condition. Identifie le bug, propose un patch atomique.",
    category: "DEV",
    difficulty: "ADVANCED",
    type: "LAB",
    status: "IN_PROGRESS",
    xpReward: 380,
    timeLimitMin: 40,
    attempts: 2,
    maxAttempts: 5,
    progress: 28,
  },
  {
    id: "c6",
    title: "Blind SQL — Exfiltrer le hash root caractère par caractère",
    description:
      "Aucun retour visible : seul le temps de réponse du serveur trahit le contenu. Automatise et extrais.",
    category: "CYBERSEC",
    difficulty: "EXPERT",
    type: "CTF",
    status: "LOCKED",
    xpReward: 600,
    timeLimitMin: 60,
    attempts: 0,
    maxAttempts: 3,
    lockedBy: "Introduction aux injections SQL",
  },
  {
    id: "c7",
    title: "Régex Golf — Match le pattern, rien d'autre",
    description:
      "Crée la regex la plus courte qui valide la liste verte sans jamais déclencher la liste rouge.",
    category: "DEV",
    difficulty: "INTERMEDIATE",
    type: "PUZZLE",
    status: "COMPLETED",
    xpReward: 240,
    timeLimitMin: 20,
    attempts: 1,
    maxAttempts: 5,
  },
  {
    id: "c8",
    title: "DNS Tunneling — Décode le canal caché du botnet",
    description:
      "Le trafic DNS sortant masque un C2. Décode les sous-domaines, reconstruis les commandes émises.",
    category: "RESEAU",
    difficulty: "ADVANCED",
    type: "CTF",
    status: "IN_PROGRESS",
    xpReward: 460,
    timeLimitMin: 45,
    attempts: 1,
    maxAttempts: 3,
    progress: 84,
  },
  {
    id: "c9",
    title: "BGP Hijack — Reroute le trafic dans une topologie isolée",
    description:
      "Compose une session BGP malicieuse dans le lab fermé. Comprends comment un AS peut détourner un préfixe.",
    category: "RESEAU",
    difficulty: "ADVANCED",
    type: "LAB",
    status: "AVAILABLE",
    xpReward: 540,
    timeLimitMin: 55,
    attempts: 0,
    maxAttempts: 3,
  },
  {
    id: "c10",
    title: "Buffer Overflow — Écris ton propre exploit ROP",
    description:
      "Stack non-exécutable, mais ASLR partiellement levée. Construis une chaîne ROP fonctionnelle.",
    category: "DEV",
    difficulty: "EXPERT",
    type: "PUZZLE",
    status: "LOCKED",
    xpReward: 720,
    timeLimitMin: 75,
    attempts: 0,
    maxAttempts: 2,
    lockedBy: "Mémoire & Exploitation Niveau 2",
  },
];

// Fixed future date for the featured challenge countdown (~2.5 days from "build time")
// SAFETY: This is intentionally a module-level constant evaluated at runtime.
const FEATURED_END_DATE = new Date(Date.now() + 2.5 * 86400 * 1000);

// The featured challenge: highest-XP AVAILABLE/IN_PROGRESS entry (hardcoded to c4 — JWT Forgery, 520 XP)
// SAFETY: index 3 is always present in the static CHALLENGES literal defined above.
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const FEATURED = CHALLENGES[3]!;

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

const DIFF_META: Record<ChallengeDifficulty, DiffMeta> = {
  BEGINNER: { level: 1, kind: "easy", label: "FACILE" },
  INTERMEDIATE: { level: 2, kind: "med", label: "INTERMÉDIAIRE" },
  ADVANCED: { level: 3, kind: "hard", label: "AVANCÉ" },
  EXPERT: { level: 4, kind: "hard", label: "EXPERT" },
};

function DiffBars({ difficulty }: { difficulty: ChallengeDifficulty }): React.ReactElement {
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

function catCssKey(cat: ChallengeCategory): "cyber" | "dev" | "net" {
  if (cat === "CYBERSEC") return "cyber";
  if (cat === "DEV") return "dev";
  return "net";
}

function catLabel(cat: ChallengeCategory): string {
  if (cat === "RESEAU") return "RÉSEAU";
  return cat;
}

function typeModifier(type: ChallengeType): string {
  if (type === "PUZZLE") return "cc__type--puzzle";
  if (type === "LAB") return "cc__type--lab";
  return "";
}

function TypeIcon({ type, size = 44 }: { type: ChallengeType; size?: number }): React.ReactElement {
  if (type === "CTF") return <IconCrosshair size={size} />;
  if (type === "PUZZLE") return <IconPuzzle size={size} />;
  return <IconTerminal size={size} />;
}

// ── Countdown component ───────────────────────────────────────────────────────

interface CountdownValue {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeCountdown(end: Date): CountdownValue {
  const diff = Math.max(0, end.getTime() - Date.now());
  const totalSecs = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    minutes: Math.floor((totalSecs % 3600) / 60),
    seconds: totalSecs % 60,
  };
}

function Countdown({ endDate }: { endDate: Date }): React.ReactElement {
  const [value, setValue] = useState<CountdownValue>(() => computeCountdown(endDate));

  useEffect(() => {
    const id = setInterval(() => {
      setValue(computeCountdown(endDate));
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [endDate]);

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

function Featured({ challenge }: { challenge: Challenge }): React.ReactElement {
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
        <span className="feat__coords feat__coords--right">[CTF · 0x4D]</span>
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
          {challenge.id.toUpperCase()} ·{" "}
          {(challenge.title.split(" ")[0] ?? challenge.id).toUpperCase()}
        </div>

        <h2 className="feat__title">{challenge.title}</h2>

        <p className="feat__desc">{challenge.description}</p>

        <div className="feat__tags">
          <span className={`cc__tag cc__tag--${ck}`}>{catLabel(challenge.category)}</span>
          <DiffBars difficulty={challenge.difficulty} />
          <span className={`cc__type ${tm}`}>{challenge.type}</span>
        </div>

        <Countdown endDate={FEATURED_END_DATE} />

        <div className="feat__cta">
          <a href="#" className="cc__btn" style={{ borderTop: 0 }}>
            RELEVER LE DÉFI <IconArrow size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}

// ── Challenge card ────────────────────────────────────────────────────────────

function CCCard({ challenge }: { challenge: Challenge }): React.ReactElement {
  const ck = catCssKey(challenge.category);
  const tm = typeModifier(challenge.type);
  const isDone = challenge.status === "COMPLETED";
  const isProg = challenge.status === "IN_PROGRESS";
  const isLocked = challenge.status === "LOCKED";

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
          {challenge.id.toUpperCase()}
        </div>
        <h3 className="cc__title">{challenge.title}</h3>
        <p className="cc__desc">{challenge.description}</p>
      </div>

      {/* Progress bar (IN_PROGRESS only) */}
      {isProg && (
        <div className="cc__progbar">
          <div
            className="cc__progbar-fill"
            style={{ width: `${String(challenge.progress ?? 0)}%` }}
          />
        </div>
      )}

      {/* Meta row */}
      <div className="cc__meta">
        <span className="cc__meta-xp">{challenge.xpReward} XP</span>
        <span className="cc__meta-time">
          <IconClock /> {challenge.timeLimitMin} MIN
        </span>
        {isProg ? (
          <span className="cc__prog-ind" style={{ marginLeft: "auto" }}>
            {challenge.progress ?? 0}% · EN COURS
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
            {challenge.maxAttempts - challenge.attempts} ESSAIS RESTANTS
          </span>
        )}
      </div>

      {/* Locked prerequisite message */}
      {isLocked && challenge.lockedBy !== undefined && (
        <div className="cc__lock-msg">
          <IconLock size={12} />
          <span>
            Complète d&apos;abord&nbsp;: <b>{challenge.lockedBy}</b>
          </span>
        </div>
      )}

      {/* CTA button */}
      {isDone ? (
        <a href="#" className="cc__btn cc__btn--ghost">
          VOIR LA SOLUTION <IconArrow size={12} />
        </a>
      ) : isProg ? (
        <a href="#" className="cc__btn cc__btn--orange">
          CONTINUER <IconArrow size={12} />
        </a>
      ) : isLocked ? (
        <span className="cc__btn cc__btn--disabled">
          <IconLock size={12} /> VERROUILLÉ
        </span>
      ) : (
        <a href="#" className="cc__btn">
          RELEVER LE DÉFI <IconArrow size={12} />
        </a>
      )}
    </article>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type CatFilter = ChallengeCategory | "TOUS";
type TypeFilter = ChallengeType | "TOUS";
type DiffFilter = ChallengeDifficulty | "TOUS";
type StatFilter = ChallengeStatus | "TOUS";

export default function DefisPage(): React.ReactElement {
  const [cat, setCat] = useState<CatFilter>("TOUS");
  const [type, setType] = useState<TypeFilter>("TOUS");
  const [diff, setDiff] = useState<DiffFilter>("TOUS");
  const [status, setStatus] = useState<StatFilter>("TOUS");

  // Computed stats from mock data
  const inProgress = CHALLENGES.filter((c) => c.status === "IN_PROGRESS").length;
  const completed = CHALLENGES.filter((c) => c.status === "COMPLETED").length;
  const available = CHALLENGES.filter((c) => c.status === "AVAILABLE").length;

  // Filtered list (excludes the featured card itself from filtering to avoid duplication)
  const filtered = CHALLENGES.filter((c) => {
    if (c.id === FEATURED.id) return false; // featured shown separately
    if (cat !== "TOUS" && c.category !== cat) return false;
    if (type !== "TOUS" && c.type !== type) return false;
    if (diff !== "TOUS" && c.difficulty !== diff) return false;
    if (status !== "TOUS" && c.status !== status) return false;
    return true;
  });

  // Toggle type filter (click again to deselect)
  function handleTypeToggle(t: ChallengeType): void {
    setType((prev) => (prev === t ? "TOUS" : t));
  }

  const CAT_PILLS: { label: string; value: CatFilter; dot: string }[] = [
    { label: "TOUS", value: "TOUS", dot: "all" },
    { label: "CYBERSEC", value: "CYBERSEC", dot: "cyber" },
    { label: "DEV", value: "DEV", dot: "dev" },
    { label: "RÉSEAU", value: "RESEAU", dot: "net" },
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
            Teste tes compétences en conditions réelles. CTF, puzzles de code, labs réseau&nbsp;— le
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
          {(["CTF", "PUZZLE", "LAB"] as const).map((t) => (
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

        <select
          className="x-sel"
          value={diff}
          onChange={(e) => {
            setDiff(e.target.value as DiffFilter);
          }}
        >
          <option value="TOUS">DIFFICULTÉ · TOUTES</option>
          <option value="BEGINNER">FACILE</option>
          <option value="INTERMEDIATE">INTERMÉDIAIRE</option>
          <option value="ADVANCED">AVANCÉ</option>
          <option value="EXPERT">EXPERT</option>
        </select>

        <select
          className="x-sel"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatFilter);
          }}
        >
          <option value="TOUS">STATUT · TOUS</option>
          <option value="AVAILABLE">DISPONIBLE</option>
          <option value="IN_PROGRESS">EN COURS</option>
          <option value="COMPLETED">COMPLÉTÉ</option>
          <option value="LOCKED">VERROUILLÉ</option>
        </select>
      </div>

      {/* ── Featured ────────────────────────────────────────────────── */}
      <Featured challenge={FEATURED} />

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

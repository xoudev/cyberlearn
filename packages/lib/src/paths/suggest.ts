/**
 * Which paths to suggest to somebody who says what they want to learn.
 *
 * A tester's remark: somebody who arrives knowing nothing faces sixteen paths
 * and a knowledge test, and does not know where to start. Two questions now
 * come first (what brings you here, where you start from), and this turns the
 * answers into two or three paths, each with the reason it was picked. They
 * are suggestions: the page always offers the whole catalogue beside them.
 *
 * Pure and dependency-free, so the site and the mobile app suggest the same
 * thing from the same answers.
 */

export const LEARNING_GOALS = ["DEV", "CYBERSEC", "NETWORK", "CAREER", "UNSURE"] as const;
export type LearningGoal = (typeof LEARNING_GOALS)[number];

export const STARTING_LEVELS = ["NEW", "SOME", "PRACTICING"] as const;
export type StartingLevel = (typeof STARTING_LEVELS)[number];

export type PathDomain = "DEV" | "CYBERSEC" | "NETWORK";
export type PathDifficulty = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

export interface SuggestablePath {
  slug: string;
  title: string;
  category: string;
  track: string;
  difficulty: string;
  lessonCount: number;
  /** CL-PATH-001, 002...: the order the curriculum was written in. */
  refCode?: string;
  /** Learners' average, when there is one. */
  avgRating?: number | null;
}

export interface PathSuggestion<P extends SuggestablePath> {
  path: P;
  /** Why this one, in French, one sentence. */
  reason: string;
}

/** The answers, with what each choice means, for the forms of both apps. */
export const GOAL_CHOICES: { value: LearningGoal; label: string; examples: string }[] = [
  {
    value: "DEV",
    label: "Apprendre à coder",
    examples: "Écrire mes premiers scripts Python, faire un site en JavaScript, comprendre Git.",
  },
  {
    value: "CYBERSEC",
    label: "Comprendre la cybersécurité",
    examples: "Savoir comment on attaque un site, protéger mes comptes, chiffrer des données.",
  },
  {
    value: "NETWORK",
    label: "Comprendre les réseaux et les systèmes",
    examples: "Comment Internet fonctionne, administrer un serveur Linux, le cloud.",
  },
  {
    value: "CAREER",
    label: "Me préparer à un métier",
    examples: "Analyste SOC, pentesteur, administrateur système, conformité.",
  },
  {
    value: "UNSURE",
    label: "Je ne sais pas encore",
    examples: "Je veux découvrir avant de choisir.",
  },
];

export const LEVEL_CHOICES: { value: StartingLevel; label: string; examples: string }[] = [
  {
    value: "NEW",
    label: "Je débute complètement",
    examples: "Je n'ai jamais programmé ni ouvert un terminal.",
  },
  {
    value: "SOME",
    label: "J'ai quelques bases",
    examples: "J'ai déjà suivi un cours, écrit un peu de code ou utilisé Linux.",
  },
  {
    value: "PRACTICING",
    label: "Je pratique déjà",
    examples: "Je code ou j'administre régulièrement, je veux aller plus loin.",
  },
];

const DOMAINS: PathDomain[] = ["DEV", "CYBERSEC", "NETWORK"];

/** "en …" and "le …", since French wants the article with some turns and not others. */
const DOMAIN_LABEL: Record<PathDomain, { bare: string; the: string }> = {
  DEV: { bare: "développement", the: "le développement" },
  CYBERSEC: { bare: "cybersécurité", the: "la cybersécurité" },
  NETWORK: { bare: "réseaux et systèmes", the: "les réseaux et les systèmes" },
};

const RANK: Record<string, number> = { BEGINNER: 0, INTERMEDIATE: 1, ADVANCED: 2, EXPERT: 3 };

/** The difficulty a level is best served by. */
const TARGET: Record<StartingLevel, number> = { NEW: 0, SOME: 1, PRACTICING: 1.5 };

function isDomain(value: string): value is PathDomain {
  return (DOMAINS as string[]).includes(value);
}

/** The domains the answers point at: all three when none is named. */
export function domainsOf(goals: readonly LearningGoal[]): PathDomain[] {
  const named = DOMAINS.filter((d) => goals.includes(d));
  return named.length > 0 ? named : DOMAINS;
}

function score(
  path: SuggestablePath,
  goals: readonly LearningGoal[],
  level: StartingLevel,
): number {
  const rank = RANK[path.difficulty] ?? 1;
  let s = -2 * Math.abs(rank - TARGET[level]);
  if (goals.includes("CAREER")) s += path.track === "CAREER" ? 2 : 0;
  else s += path.track === "CAREER" ? -1 : 0;
  return s;
}

function reasonFor(path: SuggestablePath, level: StartingLevel): string {
  const domain = isDomain(path.category)
    ? DOMAIN_LABEL[path.category]
    : { bare: "ce domaine", the: "ce domaine" };
  const rank = RANK[path.difficulty] ?? 1;
  const start =
    rank === 0
      ? `Sans prérequis : le point de départ en ${domain.bare}.`
      : rank === 1
        ? level === "NEW"
          ? `L'entrée la plus accessible en ${domain.bare}. Elle suppose d'être à l'aise avec un ordinateur.`
          : `Pour aller plus loin en ${domain.bare} avec quelques bases.`
        : `Pour qui pratique déjà ${domain.the}.`;
  const track =
    path.track === "CAREER"
      ? " Un parcours métier, qui enchaîne ce qu'il faut pour le poste."
      : ` ${String(path.lessonCount)} missions sur une compétence précise.`;
  return start + track;
}

/**
 * Up to `limit` paths for these answers, best first, with a reason each.
 *
 * One per named domain before a second in any, so that somebody who ticked
 * code and cybersecurity sees both rather than three code paths. "Je ne sais
 * pas encore" alone gives one entry point per domain.
 */
export function suggestPaths<P extends SuggestablePath>(
  paths: readonly P[],
  answers: { goals: readonly LearningGoal[]; level: StartingLevel },
  limit = 3,
): PathSuggestion<P>[] {
  const domains = domainsOf(answers.goals);
  const ranked = paths
    .filter((p) => isDomain(p.category) && domains.includes(p.category))
    // Somebody starting from nothing is not sent to an advanced path, not
    // even to fill the last slot: fewer suggestions beat a wrong one.
    .filter((p) => answers.level !== "NEW" || (RANK[p.difficulty] ?? 1) < 2)
    .map((p) => ({ p, s: score(p, answers.goals, answers.level) }))
    // Between paths that fit equally, the learners' rating decides, then the
    // order the curriculum was written in, which puts the domain's first path
    // first. Not how many started it: the app reads under RLS and cannot count
    // other people's progress, and both apps must suggest the same thing.
    .sort(
      (a, b) =>
        b.s - a.s ||
        (b.p.avgRating ?? 0) - (a.p.avgRating ?? 0) ||
        (a.p.refCode ?? "").localeCompare(b.p.refCode ?? "") ||
        a.p.title.localeCompare(b.p.title),
    );

  const picked: P[] = [];
  // First pass: the best path of each domain, in the order the domains rank.
  for (const domain of domains) {
    const best = ranked.find((r) => r.p.category === domain);
    if (best) picked.push(best.p);
  }
  picked.sort(
    (a, b) => (ranked.find((r) => r.p === b)?.s ?? 0) - (ranked.find((r) => r.p === a)?.s ?? 0),
  );
  // Then the rest, best first.
  for (const r of ranked) {
    if (picked.length >= limit) break;
    if (!picked.includes(r.p)) picked.push(r.p);
  }

  return picked.slice(0, limit).map((path) => ({ path, reason: reasonFor(path, answers.level) }));
}

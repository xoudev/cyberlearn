import type { WrappedPayload } from "@cyberlearn/lib";

/**
 * The year, told as a sequence rather than laid out as a page.
 *
 * Slides are data, not markup. Two reasons. One renderer means every slide
 * shares a scale and a rhythm, which is the thing that makes a story read as
 * one piece instead of five posters. And the narrative - which slides appear,
 * in what order, with what words when somebody has no badges or no season -
 * is the part that can be got wrong silently, so it is the part kept testable.
 */

export const SLIDE_MS = 5000;

/** Palette per slide, one colour each, in the order they are shown. */
export type AccentName = "blue" | "turquoise" | "amber" | "rose" | "violet";

/** The figure a slide is built around, when it has one. */
export interface SlideFigure {
  value: string;
  unit?: string;
}

export type SlideExtra =
  | { kind: "bars"; rows: { label: string; value: number; share: number }[] }
  | { kind: "list"; rows: { label: string; note: string }[] }
  | { kind: "share" };

export interface Slide {
  id: string;
  accent: AccentName;
  /** Mono, uppercase, above everything - the site's own eyebrow. */
  eyebrow: string;
  /** The line that sets up the figure, when the figure needs setting up. */
  kicker?: string;
  figure?: SlideFigure;
  /** Sits with the figure in the slide's colour, the way a name would. */
  headline?: string;
  /**
   * Puts the name above the figure instead of below it. On a reveal the name
   * is what is being revealed and the figure only backs it up - and it also
   * keeps a sentence split across the two from reading in the wrong order.
   */
  headlineFirst?: boolean;
  lead?: string;
  footer?: string;
  extra?: SlideExtra;
  /** The last slide stops the clock: nothing follows it to advance to. */
  terminal?: boolean;
}

const DOMAIN_LABEL: Record<string, string> = {
  DEV: "Dev",
  CYBERSEC: "Cybersec",
  NETWORK: "Réseau",
};

const RARITY_LABEL: Record<string, string> = {
  COMMON: "Commun",
  RARE: "Rare",
  EPIC: "Épique",
  LEGENDARY: "Légendaire",
};

const TIER_LABEL: Record<string, string> = {
  BRONZE: "Bronze",
  ARGENT: "Argent",
  OR: "Or",
  PLATINE: "Platine",
  DIAMANT: "Diamant",
  ELITE: "Élite",
};

export function fmtNumber(n: number): string {
  return n.toLocaleString("fr-FR");
}

/** "Mars 2026" from a "YYYY-MM" key. */
export function monthLabel(key: string): string {
  const label = new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}-01T12:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Where somebody sits among everyone, as the round number people quote. */
export function topPercent(rank: number, total: number): number {
  if (total <= 0) return 100;
  return Math.max(1, Math.round((rank / total) * 100));
}

export function buildStorySlides(payload: WrappedPayload): Slide[] {
  const year = payload.periodKey;
  const previous = String(Number(year) - 1);
  const slides: Slide[] = [];

  // ── The curtain ───────────────────────────────────────────────────────────
  // A recap that opens on its biggest number has spent it. This one opens on
  // the year and nothing else, so the first figure lands on a slide of its own.
  slides.push({
    id: "intro",
    accent: "turquoise",
    eyebrow: "Cyber Learn · Récap",
    figure: { value: year },
    headline: "Ton année",
    lead: "Douze mois de leçons, de séries et de badges. On déroule.",
  });

  // ── The headline volume ───────────────────────────────────────────────────
  const delta = payload.xp.deltaPct;
  slides.push({
    id: "xp",
    accent: "blue",
    eyebrow: "Tu as gagné",
    figure: { value: fmtNumber(payload.xp.thisYear), unit: "XP" },
    ...(delta !== null && {
      lead:
        delta >= 0
          ? `Soit ${String(delta)} % de plus qu'en ${previous}.`
          : `Soit ${String(Math.abs(delta))} % de moins qu'en ${previous}.`,
    }),
    footer: `${fmtNumber(payload.xp.lastYear)} XP en ${previous}`,
  });

  // ── The month that carried the year ───────────────────────────────────────
  if (payload.xp.bestMonthKey !== null) {
    slides.push({
      id: "best-month",
      accent: "violet",
      eyebrow: "Ton meilleur mois",
      headline: monthLabel(payload.xp.bestMonthKey),
      figure: { value: fmtNumber(payload.xp.bestMonthXp), unit: "XP" },
      lead: "À lui seul, le mois où tu en as fait le plus.",
    });
  }

  // ── Volume, then the split ────────────────────────────────────────────────
  const total = payload.lessons.total;
  const byDomain = payload.lessons.byDomain;
  const rows = (["CYBERSEC", "DEV", "NETWORK"] as const)
    .map((code) => ({
      label: DOMAIN_LABEL[code] ?? code,
      value: byDomain[code],
      share: total > 0 ? Math.round((byDomain[code] / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  slides.push({
    id: "lessons",
    accent: "amber",
    eyebrow: "Tu as terminé",
    figure: { value: fmtNumber(total), unit: total > 1 ? "leçons" : "leçon" },
    ...(total > 0 && { extra: { kind: "bars", rows } }),
    ...(total === 0 && { lead: "L'année prochaine est une page blanche." }),
  });

  // ── The reveal ────────────────────────────────────────────────────────────
  // Held back one slide behind a question, which is the whole trick: the split
  // above already shows it, so the line has to ask before the eye reads it.
  const top = payload.lessons.topDomain;
  if (top !== null) {
    slides.push({
      id: "domain",
      accent: "turquoise",
      eyebrow: "Et surtout",
      kicker: "Le domaine où tu as passé ton année",
      headline: DOMAIN_LABEL[top] ?? top,
      headlineFirst: true,
      figure: { value: String(payload.lessons.topDomainPct), unit: "%" },
      lead: "de tout ce que tu as terminé.",
    });
  }

  // ── Regularity ────────────────────────────────────────────────────────────
  slides.push({
    id: "streak",
    accent: "rose",
    eyebrow: "Ta plus longue série",
    figure: {
      value: fmtNumber(payload.streak.longest),
      unit: payload.streak.longest > 1 ? "jours" : "jour",
    },
    lead:
      payload.streak.longest > 1
        ? "D'affilée, sans en manquer un seul."
        : "Une série se construit un jour après l'autre.",
    footer: `${fmtNumber(payload.streak.daysThisYear)} jours actifs dans l'année`,
  });

  // ── The collection ────────────────────────────────────────────────────────
  const earned = payload.badges.thisYear;
  const named = payload.badges.recent.slice(0, 3);
  const others = Math.max(0, earned - named.length);
  slides.push({
    id: "badges",
    accent: "amber",
    eyebrow: "Tu as décroché",
    figure: { value: fmtNumber(earned), unit: earned > 1 ? "badges" : "badge" },
    ...(named.length > 0 && {
      extra: {
        kind: "list",
        rows: named.map((badge) => ({
          label: badge.name,
          note: RARITY_LABEL[badge.rarity] ?? badge.rarity,
        })),
      },
    }),
    ...(earned === 0 && { lead: "Aucun cette année. Le premier est le plus facile." }),
    ...(earned > 0 && {
      footer:
        others > 0
          ? `+ ${fmtNumber(others)} autres · collection de ${fmtNumber(payload.badges.total)}`
          : `collection de ${fmtNumber(payload.badges.total)}`,
    }),
  });

  // ── Where that puts somebody ──────────────────────────────────────────────
  const season = payload.season;
  if (season !== null && season.globalRank !== null) {
    const pct = topPercent(season.globalRank, season.totalMembers);
    const move = season.promoted ? "Promu." : season.relegated ? "Relégué." : "";
    slides.push({
      id: "rank",
      accent: "violet",
      eyebrow: "Fin de saison",
      kicker: "Parmi tout le monde, tu finis",
      figure: { value: `top ${String(pct)}`, unit: "%" },
      headline: `#${fmtNumber(season.globalRank)}`,
      lead: `Division ${TIER_LABEL[season.division] ?? season.division}. ${move}`.trim(),
      footer: `saison ${String(season.seasonIndex).padStart(2, "0")} · palier ${TIER_LABEL[payload.tier] ?? payload.tier}`,
    });
  }

  // ── The payoff ────────────────────────────────────────────────────────────
  slides.push({
    id: "share",
    accent: "turquoise",
    eyebrow: "Ta carte",
    headline: "À partager",
    extra: { kind: "share" },
    terminal: true,
  });

  return slides;
}

import type { DomainCode, WrappedPayload } from "./wrapped.js";

/**
 * The year on one image, at story size: what the site draws on a canvas and
 * the app renders and captures. Shared so the two images carry the same
 * figures in the same words; each side keeps its own way of drawing them.
 */

/** Story size, whatever screen it was exported from. */
export const WRAPPED_CARD_SIZE = { width: 1080, height: 1920 } as const;

const DOMAIN_LABEL: Record<DomainCode, string> = {
  DEV: "Dev",
  CYBERSEC: "Cybersec",
  NETWORK: "Réseau",
};

/** 1 250 → "1,3k": a card is read at a glance, so big numbers are shortened. */
export function fmtCompact(n: number): string {
  if (n >= 1000) return `${(n / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}k`;
  return String(n);
}

export interface WrappedCardContent {
  title: string;
  year: string;
  handle: string;
  /** Four figures, two per row, number first: the number is what gets shared. */
  stats: { value: string; label: string }[];
  /** "Domaine de l'année : Cybersec", or null for a year without a lesson. */
  domain: string | null;
  site: string;
  fileName: string;
}

export function wrappedCardContent(payload: WrappedPayload, handle: string): WrappedCardContent {
  const topDomain = payload.lessons.topDomain;
  return {
    title: "CYBERLEARN WRAPPED",
    year: payload.periodKey,
    handle: `@${handle}`,
    stats: [
      { value: fmtCompact(payload.xp.thisYear), label: "XP gagnés" },
      { value: String(payload.lessons.total), label: "leçons" },
      { value: String(payload.badges.thisYear), label: "badges" },
      { value: String(payload.streak.longest), label: "jours de série" },
    ],
    domain: topDomain !== null ? `Domaine de l'année : ${DOMAIN_LABEL[topDomain]}` : null,
    site: "cyberlearn.fr",
    fileName: `cyberlearn-wrapped-${payload.periodKey}.png`,
  };
}

import { z } from "zod";
import type { ProfilePreviewCard } from "@cyberlearn/db";
import { computeLevel } from "@cyberlearn/lib";

/**
 * The words on a profile's link preview (/u/[username]/opengraph-image).
 *
 * A shared link is read by whoever it is pasted to and by every crawler on
 * the way, never as a friend: a private profile, or a handle that does not
 * exist, gets the same card without a name, so the picture cannot confirm
 * what the page's 404 hides.
 */

export interface PreviewCardText {
  /** The small line over the title. */
  eyebrow: string;
  title: string;
  /** "@alex", or the site's line on the card without a name. */
  subtitle: string;
  /** Figures under the title, none on the card without a name. */
  stats: { label: string; value: string }[];
}

/** A handle as the address carries it, read as the app's profile route reads it. */
const handleSchema = z.string().trim().min(1).max(64);

/**
 * The handle to look up from the image route's parameter, or null for one no
 * profile could have: that card is drawn without a name, and nothing is read.
 */
export function previewHandle(raw: unknown): string | null {
  const parsed = handleSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * What the font next/og bundles (Geist Regular) draws, a subset of its own
 * table: Latin with its accents, Cyrillic, Vietnamese, the usual punctuation.
 * For any other character (an emoji, Chinese, Arabic, a narrow space...)
 * next/og fetches a font from Google Fonts, or the emoji's picture from a CDN,
 * while it draws, with the text in the request, and a fetch that fails can
 * fail the picture. Code point ranges, both ends included.
 */
const DRAWABLE: readonly (readonly [number, number])[] = [
  [0x0020, 0x007e], // Basic Latin
  [0x00a0, 0x00ac], // Latin-1 signs, up to the soft hyphen
  [0x00ae, 0x0113], // Latin-1 letters, then Latin Extended-A as far as the font goes
  [0x0116, 0x012b],
  [0x012e, 0x0137],
  [0x0139, 0x013e],
  [0x0141, 0x0148],
  [0x014a, 0x014d],
  [0x0150, 0x017e],
  [0x0400, 0x045f], // Cyrillic
  [0x1ea0, 0x1ef9], // Vietnamese
  [0x2013, 0x2014], // dashes
  [0x2018, 0x201a], // single quotes
  [0x201c, 0x201e], // double quotes
  [0x2026, 0x2026], // ellipsis
];

function isDrawable(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return DRAWABLE.some(([first, last]) => code >= first && code <= last);
}

/**
 * A name as the card can draw it with its own font: a letter the font lacks
 * keeps its base letter when it has one ("ĭ" becomes "i"), and anything else
 * is left out rather than fetched from elsewhere.
 */
export function drawableText(text: string): string {
  let drawn = "";
  for (const char of text) {
    if (isDrawable(char)) {
      drawn += char;
      continue;
    }
    for (const part of char.normalize("NFD")) {
      if (isDrawable(part)) drawn += part;
    }
  }
  return drawn.replace(/\s+/gu, " ").trim();
}

const NARROW_NO_BREAK_SPACE = String.fromCodePoint(0x202f);
const NO_BREAK_SPACE = String.fromCodePoint(0x00a0);

/**
 * A figure in French. Its thousands are set apart by a narrow no-break space,
 * which the font lacks: the no-break space it has stands in.
 */
const fr = (n: number): string =>
  n.toLocaleString("fr-FR").replaceAll(NARROW_NO_BREAK_SPACE, NO_BREAK_SPACE);

export function previewCardText(card: ProfilePreviewCard | null): PreviewCardText {
  if (card === null) {
    return {
      eyebrow: "CyberLearn · profil",
      title: "CyberLearn",
      subtitle: "Apprendre le développement, la cybersécurité et le réseau en pratique",
      stats: [],
    };
  }
  const handle = drawableText(card.username);
  const name = drawableText(card.displayName) || handle;
  const { level } = computeLevel(card.xpTotal);
  return {
    eyebrow: "CyberLearn · profil public",
    title: name,
    subtitle: `@${handle}`,
    stats: [
      { label: "Niveau", value: String(level) },
      { label: "XP", value: fr(card.xpTotal) },
      { label: card.badges > 1 ? "Badges" : "Badge", value: fr(card.badges) },
      { label: "Série", value: `${String(card.streakDays)} j` },
    ],
  };
}

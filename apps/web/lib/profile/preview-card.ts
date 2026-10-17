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

const fr = (n: number): string => n.toLocaleString("fr-FR");

export function previewCardText(card: ProfilePreviewCard | null): PreviewCardText {
  if (card === null) {
    return {
      eyebrow: "CyberLearn · profil",
      title: "CyberLearn",
      subtitle: "Apprendre le développement, la cybersécurité et le réseau en pratique",
      stats: [],
    };
  }
  const name = card.displayName.trim() || card.username;
  const { level } = computeLevel(card.xpTotal);
  return {
    eyebrow: "CyberLearn · profil public",
    title: name,
    subtitle: `@${card.username}`,
    stats: [
      { label: "Niveau", value: String(level) },
      { label: "XP", value: fr(card.xpTotal) },
      { label: card.badges > 1 ? "Badges" : "Badge", value: fr(card.badges) },
      { label: "Série", value: `${String(card.streakDays)} j` },
    ],
  };
}

/**
 * How a note is previewed on a card: a short plain-text excerpt and how long
 * ago it moved. Shared by the site's notes library and the app's, so a note
 * received on one reads the same on the other.
 */

/** Strip markdown to a short plain-text preview for the card. */
export function noteExcerpt(markdown: string): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>#[\]()~-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > 150 ? `${text.slice(0, 149).trimEnd()}…` : text;
}

/**
 * "il y a 3 h", or the date once it is a month old. `now` is null before the
 * clock is known (the site's first render), and then the date is all it says.
 */
export function timeAgo(iso: string, now: number | null): string {
  const then = new Date(iso).getTime();
  if (now === null) return new Date(iso).toLocaleDateString("fr-FR");
  const s = Math.max(0, Math.round((now - then) / 1000));
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${String(m)} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${String(h)} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `il y a ${String(d)} j`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

// Client-side .md export for notes. Builds markdown text and triggers a browser
// download from a user gesture (Blob + object URL) - the end user downloads their
// own note; nothing leaves the app.

export interface ExportableNote {
  lessonTitle: string;
  lessonSlug: string;
  pathTitle: string | null;
  categoryLabel: string;
  content: string;
  updatedAt: string; // ISO
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR");
}

/** Markdown for a single note: a title, a metadata line, then the content. */
export function noteToMarkdown(note: ExportableNote): string {
  const meta = [
    note.categoryLabel,
    note.pathTitle ?? "Sans parcours",
    `maj ${formatDate(note.updatedAt)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const body = note.content.trim();
  return `# ${note.lessonTitle}\n\n_${meta}_\n\n${body}\n`;
}

/** Markdown for a set of notes concatenated into one document. */
export function notesToMarkdown(notes: ExportableNote[], heading: string): string {
  const header = `# ${heading}\n\n_${String(notes.length)} note${notes.length > 1 ? "s" : ""} · exporté depuis Cyber Learn_\n`;
  const sections = notes.map((n) => noteToMarkdown(n)).join("\n---\n\n");
  return `${header}\n${sections}`;
}

/** Turn a string into a filesystem-safe basename (no extension). */
function safeBaseName(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "notes";
}

/** Trigger a client-side download of `content` as a .md file. */
export function downloadMarkdown(baseName: string, content: string): void {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeBaseName(baseName)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the download has committed.
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

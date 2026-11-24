import { z } from "zod";
import { noteFolderRepository, noteRepository, type NoteSummary } from "@cyberlearn/db";
import { CATEGORY_META } from "@cyberlearn/lib/content/vocabulary";
import { folderDescendants, folderPath, parentMap } from "@cyberlearn/lib/notes/workspace";
import { errorMessage, logger } from "@cyberlearn/lib/logger";
import { safeFileName } from "@/lib/notes/archive";
import { renderNotesPdf } from "@/lib/notes/render-pdf";
import type { PdfNote } from "@/lib/pdf/notes-template";
import { checkNotePdf } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/notes/pdf: the signed-in learner's notes as a PDF, rendered on
 * request and kept nowhere. One of:
 * - ?note=<id>: that note;
 * - ?folder=<id>: the folder and everything under it, with a cover;
 * - ?scope=all: every note outside the trash, with a cover.
 * Only the caller's own notes are read (every query is scoped by their id);
 * an id that is not theirs is not found. Bounded by MAX_NOTES and MAX_CHARS,
 * and by checkNotePdf: a whole library is real work for one request.
 */

const MAX_NOTES = 300;
const MAX_CHARS = 600_000;

const query = z.union([
  z.object({ note: z.guid() }),
  z.object({ folder: z.guid() }),
  z.object({ scope: z.literal("all") }),
]);

function metaOf(n: NoteSummary): string {
  const parts: string[] = [];
  if (n.lessonTitle) parts.push(`Leçon : ${n.lessonTitle}`);
  if (n.pathTitle) parts.push(n.pathTitle);
  if (n.lessonCategory) parts.push(CATEGORY_META[n.lessonCategory].short);
  parts.push(`mis à jour le ${n.updatedAt.toLocaleDateString("fr-FR")}`);
  return parts.join(" · ");
}

export async function GET(request: Request): Promise<Response> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response(null, { status: 401 });

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const parsed = query.safeParse(params);
  if (!parsed.success) return new Response(null, { status: 400 });

  const limit = await checkNotePdf(user.id);
  if (!limit.success) {
    return Response.json(
      { error: "Trop d'exports d'affilée. Réessaie dans quelques minutes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  try {
    const [all, folders] = await Promise.all([
      noteRepository.findAllForUser(user.id),
      noteFolderRepository.listForUser(user.id),
    ]);
    const live = all.filter((n) => n.deletedAt === null);
    const parents = parentMap(folders);

    let notes: NoteSummary[];
    let title: string;
    let folderCount = 0;
    if ("note" in parsed.data) {
      const id = parsed.data.note;
      notes = live.filter((n) => n.id === id);
      title = notes[0]?.title ?? "";
    } else if ("folder" in parsed.data) {
      const id = parsed.data.folder;
      const folder = folders.find((f) => f.id === id);
      if (!folder) return new Response(null, { status: 404 });
      const subtree = new Set([id, ...folderDescendants(parents, id)]);
      notes = live.filter((n) => n.folderId !== null && subtree.has(n.folderId));
      title = folder.name;
      folderCount = subtree.size;
    } else {
      notes = live;
      title = "Toutes mes notes";
      folderCount = folders.length;
    }
    if (notes.length === 0) return new Response(null, { status: 404 });

    const chars = notes.reduce((sum, n) => sum + n.content.length, 0);
    if (notes.length > MAX_NOTES || chars > MAX_CHARS) {
      return Response.json(
        {
          error: `Trop de notes pour un seul PDF (${String(MAX_NOTES)} au plus) : exporte un dossier à la fois, ou en .zip.`,
        },
        { status: 413 },
      );
    }

    // Folder order first, then title, so the document reads like the tree.
    const pathOf = (n: NoteSummary): string[] => folderPath(folders, n.folderId);
    const pdfNotes: PdfNote[] = notes
      .map((n) => ({ n, path: pathOf(n) }))
      .sort(
        (a, b) =>
          a.path.join("/").localeCompare(b.path.join("/"), "fr") ||
          a.n.title.localeCompare(b.n.title, "fr"),
      )
      .map(({ n, path }) => ({
        id: n.id,
        title: n.title,
        breadcrumb: path,
        meta: metaOf(n),
        content: n.content,
      }));

    const pdf = await renderNotesPdf({ title, notes: pdfNotes, folderCount });
    const fileName = `${safeFileName(title, "notes")}.pdf`;
    // An ASCII name for old clients, the real one (RFC 5987) for the others.
    const ascii =
      fileName
        .normalize("NFD")
        .replace(/[^\x20-\x7e]/g, "")
        .replace(/["\\]/g, "") || "notes.pdf";
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    logger.error({ scope: "notes-pdf", err: errorMessage(err) }, "notes pdf failed");
    return Response.json({ error: "Export PDF impossible." }, { status: 500 });
  }
}

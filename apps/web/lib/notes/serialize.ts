import type { NoteSummary } from "@cyberlearn/db";
import type { SerializedNote } from "@/app/(app)/notes/_components/notes-shared";

/** A note as the server hands it to the workspace: dates as ISO strings. */
export function serializeNote(n: NoteSummary): SerializedNote {
  return {
    id: n.id,
    title: n.title,
    lessonId: n.lessonId,
    lessonSlug: n.lessonSlug,
    lessonTitle: n.lessonTitle,
    lessonCategory: n.lessonCategory,
    pathSlug: n.pathSlug,
    pathTitle: n.pathTitle,
    folderId: n.folderId,
    content: n.content,
    wordCount: n.wordCount,
    pinned: n.pinned,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    deletedAt: n.deletedAt ? n.deletedAt.toISOString() : null,
  };
}

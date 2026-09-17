import React from "react";
import type { Metadata } from "next";
import { noteFolderRepository, noteRepository, noteShareRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { NotesLibrary } from "./_components/notes-library";
import type {
  SerializedFolder,
  SerializedIncomingNote,
  SerializedNote,
} from "./_components/notes-shared";

export const metadata: Metadata = { title: "Bloc-notes" };

export default async function NotesPage({
  searchParams,
}: {
  /** ?note=<id> opens that note straight away - how the navbar search lands here. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  const requested = (await searchParams).note;
  const openNoteId = typeof requested === "string" ? requested : null;
  // Tolerate the window between deploy and the prod notes/folders migration: a
  // missing table yields an empty library rather than a crashed page.
  const [notes, folders, incoming] = await Promise.all([
    noteRepository.findAllForUser(user.id).catch(() => []),
    noteFolderRepository.listForUser(user.id).catch(() => []),
    noteShareRepository.listSharedWithMe(user.id).catch(() => []),
  ]);

  const serializedNotes: SerializedNote[] = notes.map((n) => ({
    id: n.id,
    lessonId: n.lessonId,
    lessonSlug: n.lessonSlug,
    lessonTitle: n.lessonTitle,
    lessonCategory: n.lessonCategory,
    pathSlug: n.pathSlug,
    pathTitle: n.pathTitle,
    folderId: n.folderId,
    content: n.content,
    wordCount: n.wordCount,
    updatedAt: n.updatedAt.toISOString(),
  }));

  const serializedFolders: SerializedFolder[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    color: f.color,
    icon: f.icon,
    position: f.position,
  }));

  const serializedIncoming: SerializedIncomingNote[] = incoming.map((n) => ({
    id: n.id,
    // A recipient reads the note; they do not file it or edit it, so the
    // fields that only mean something to an owner are empty here.
    lessonId: "",
    lessonSlug: n.lessonSlug,
    lessonTitle: n.lessonTitle,
    lessonCategory: n.lessonCategory,
    pathSlug: null,
    pathTitle: null,
    folderId: null,
    content: n.content,
    wordCount: n.wordCount,
    updatedAt: n.updatedAt.toISOString(),
    authorName: n.authorName,
    sharedAt: n.sharedAt.toISOString(),
  }));

  return (
    <NotesLibrary
      notes={serializedNotes}
      folders={serializedFolders}
      incoming={serializedIncoming}
      openNoteId={openNoteId}
    />
  );
}

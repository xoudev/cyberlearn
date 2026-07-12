import React from "react";
import type { Metadata } from "next";
import { noteFolderRepository, noteRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { NotesLibrary } from "./_components/notes-library";
import type { SerializedFolder, SerializedNote } from "./_components/notes-shared";

export const metadata: Metadata = { title: "Bloc-notes" };

export default async function NotesPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  // Tolerate the window between deploy and the prod notes/folders migration: a
  // missing table yields an empty library rather than a crashed page.
  const [notes, folders] = await Promise.all([
    noteRepository.findAllForUser(user.id).catch(() => []),
    noteFolderRepository.listForUser(user.id).catch(() => []),
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

  return <NotesLibrary notes={serializedNotes} folders={serializedFolders} />;
}

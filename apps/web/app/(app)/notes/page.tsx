import React from "react";
import type { Metadata } from "next";
import { noteRepository } from "@cyberlearn/db";
import { requireRequestUser } from "@/lib/auth";
import { NotesLibrary, type SerializedNote } from "./_components/notes-library";

export const metadata: Metadata = { title: "Bloc-notes" };

export default async function NotesPage(): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  // Tolerate the window between deploy and the prod notes migration: a missing
  // table yields an empty library rather than a crashed page.
  const notes: Awaited<ReturnType<typeof noteRepository.findAllForUser>> = await noteRepository
    .findAllForUser(user.id)
    .catch(() => []);

  const serialized: SerializedNote[] = notes.map((n) => ({
    id: n.id,
    lessonSlug: n.lessonSlug,
    lessonTitle: n.lessonTitle,
    lessonCategory: n.lessonCategory,
    pathSlug: n.pathSlug,
    pathTitle: n.pathTitle,
    content: n.content,
    wordCount: n.wordCount,
    updatedAt: n.updatedAt.toISOString(),
  }));

  return <NotesLibrary notes={serialized} />;
}

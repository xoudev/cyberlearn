import React from "react";
import type { Metadata } from "next";
import {
  noteCardRepository,
  noteFolderRepository,
  noteRepository,
  noteShareRepository,
} from "@cyberlearn/db";
import { normalizeNoteTitle } from "@cyberlearn/lib/notes/rich-markdown";
import { requireRequestUser } from "@/lib/auth";
import { serializeNote } from "@/lib/notes/serialize";
import { NotesWorkspace } from "./_components/notes-workspace";
import type { SerializedFolder, SerializedIncomingNote } from "./_components/notes-shared";

export const metadata: Metadata = { title: "Bloc-notes" };

export default async function NotesPage({
  searchParams,
}: {
  /** ?note=<id> (the navbar search) or ?titre=<title> (a [[link]]) opens that note straight away. */
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<React.JSX.Element> {
  const user = await requireRequestUser();
  const params = await searchParams;
  const requested = typeof params.note === "string" ? params.note : null;
  // ?titre= is a [[link]] followed from outside the workspace (a lesson's
  // drawer): the note with that title, if the user has one.
  const titled =
    typeof params.titre === "string" ? normalizeNoteTitle(params.titre.slice(0, 200)) : null;
  const [notes, folders, incoming, cardCounts] = await Promise.all([
    noteRepository.findAllForUser(user.id),
    noteFolderRepository.listForUser(user.id),
    noteShareRepository.listSharedWithMe(user.id),
    noteCardRepository.counts(user.id, new Date()),
  ]);

  const openNoteId =
    requested ??
    (titled
      ? (notes.find((n) => n.deletedAt === null && normalizeNoteTitle(n.title) === titled)?.id ??
        null)
      : null);

  const serializedFolders: SerializedFolder[] = folders.map((f) => ({
    id: f.id,
    name: f.name,
    color: f.color,
    icon: f.icon,
    parentId: f.parentId,
    position: f.position,
  }));

  const serializedIncoming: SerializedIncomingNote[] = incoming.map((n) => ({
    id: n.id,
    title: n.title,
    // A recipient reads the note; they do not file it, edit it or pin it, so
    // the fields that only mean something to its owner are empty here.
    lessonId: null,
    lessonSlug: n.lessonSlug,
    lessonTitle: n.lessonTitle,
    lessonCategory: n.lessonCategory,
    pathSlug: null,
    pathTitle: null,
    folderId: null,
    content: n.content,
    wordCount: n.wordCount,
    pinned: false,
    createdAt: n.updatedAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    deletedAt: null,
    authorName: n.authorName,
    sharedAt: n.sharedAt.toISOString(),
  }));

  return (
    <NotesWorkspace
      notes={notes.map(serializeNote)}
      folders={serializedFolders}
      incoming={serializedIncoming}
      openNoteId={openNoteId}
      cardCounts={cardCounts}
    />
  );
}

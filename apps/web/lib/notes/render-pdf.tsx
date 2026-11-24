import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { NotesDocument, type PdfNote } from "@/lib/pdf/notes-template";

/** Notes as PDF bytes, rendered now. */
export async function renderNotesPdf(input: {
  title: string;
  notes: readonly PdfNote[];
  folderCount: number;
  generatedAt?: Date;
}): Promise<Buffer> {
  return renderToBuffer(
    <NotesDocument
      title={input.title}
      notes={input.notes}
      folderCount={input.folderCount}
      generatedAt={input.generatedAt ?? new Date()}
    />,
  );
}

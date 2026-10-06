import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { RevisionSheet } from "@cyberlearn/lib/paths/sheet";
import { SheetDocument } from "@/lib/pdf/sheet-template";

/** The sheet as PDF bytes, generated now. */
export async function renderSheetPdf(
  sheet: RevisionSheet,
  generatedAt = new Date(),
): Promise<Buffer> {
  return renderToBuffer(<SheetDocument sheet={sheet} generatedAt={generatedAt} />);
}

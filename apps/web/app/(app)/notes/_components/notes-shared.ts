import type { Category } from "@cyberlearn/db";

/** A note as serialized by the server for the library + reader. */
export interface SerializedNote {
  id: string;
  lessonId: string;
  lessonSlug: string;
  lessonTitle: string;
  lessonCategory: Category;
  pathSlug: string | null;
  pathTitle: string | null;
  folderId: string | null;
  content: string;
  wordCount: number;
  updatedAt: string; // ISO
}

/** A user's note folder. */
export interface SerializedFolder {
  id: string;
  name: string;
  color: string | null;
  position: number;
}

export const CAT: Record<Category, { label: string; color: string }> = {
  CYBERSEC: { label: "Cybersec", color: "#FF4757" },
  DEV: { label: "Dev", color: "#6E8BFF" },
  NETWORK: { label: "Réseau", color: "#0AFFD4" },
};

/** Fixed accent palette for folders (validated server-side too). */
export const FOLDER_PALETTE: readonly string[] = [
  "#6E8BFF",
  "#0AFFD4",
  "#FF4757",
  "#FFB020",
  "#B07CFF",
  "#3DD68C",
];

/** Default dot colour for a folder with no colour set. */
export const FOLDER_DEFAULT_COLOR = "#6F6B99";

import React from "react";
import { FOLDER_DEFAULT_ICON, FOLDER_ICON_NAMES, type FolderIconName } from "./notes-shared";

/**
 * Folder glyphs on the sidebar's grid: 24 units, a 1.75 stroke, square caps
 * and mitred joins, straight lines and 15° steps only, after the Bastion mark.
 * Tinted by the folder colour. Keyed by the names in FOLDER_ICON_NAMES, which
 * are what the database holds: a redraw changes the path, never the key.
 * The app draws the same paths (apps/mobile/components/folder-icons.tsx).
 */
const PATHS: Record<FolderIconName, string> = {
  folder: "M3 5H10L12 7H21V19H3Z",
  shield: "M4 3.5H20V12L12 20L4 12Z",
  terminal: "M3 4H21V20H3ZM7 9L10 12L7 15M12 15H17",
  book: "M12 6V20M12 6L3 3.59V17.59L12 20L21 17.59V3.59Z",
  bug: "M9 8H15L17 10V16L14 19H10L7 16V10ZM10 8V5H14V8M3 12H7M17 12H21M4 7L7 10M20 7L17 10M4 19L7 16M20 19L17 16",
  network: "M10 3H14V7H10ZM3 17H7V21H3ZM17 17H21V21H17ZM12 7V12M5 17V12H19V17",
  key: "M2.5 7.5H11.5V16.5H2.5ZM11.5 12H21.5M16.5 12V16M20 12V15.5",
  flask: "M9 3H15M10 3V9L3.65 20H20.35L14 9V3M6.54 15H17.46",
  star: "M12 4.2L14.06 9.97L20.18 10.14L15.33 13.88L17.05 19.76L12 16.3L6.95 19.76L8.67 13.88L3.82 10.14L9.94 9.97Z",
  code: "M8 7L3 12L8 17M16 7L21 12L16 17M13.88 5L10.12 19",
};

/** "All notes": three stacked sheets. Not a folder icon anybody picks. */
const ALL_NOTES_PATH = "M12 2.8L21 8L12 13.2L3 8ZM3 12L12 17.2L21 12M3 16L12 21.2L21 16";

/** Resolve a stored (possibly null / unknown) icon name to a valid glyph key. */
function resolveIcon(name: string | null): FolderIconName {
  return FOLDER_ICON_NAMES.find((icon) => icon === name) ?? FOLDER_DEFAULT_ICON;
}

function Glyph({ d, color, size }: { d: string; color: string; size: number }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  );
}

/** A folder glyph tinted by `color`. Accepts any stored icon string (falls back
 *  to the folder glyph for null / unknown values). */
export function FolderGlyph({
  name,
  color,
  size = 15,
}: {
  name: string | null;
  color: string;
  size?: number;
}): React.JSX.Element {
  return <Glyph d={PATHS[resolveIcon(name)]} color={color} size={size} />;
}

/** The "all notes" glyph (stacked layers) - not a user-selectable folder icon. */
export function AllNotesGlyph({
  color,
  size = 15,
}: {
  color: string;
  size?: number;
}): React.JSX.Element {
  return <Glyph d={ALL_NOTES_PATH} color={color} size={size} />;
}

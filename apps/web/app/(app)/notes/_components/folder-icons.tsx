import React from "react";
import { FOLDER_ICON_NAMES, type FolderIconName } from "./notes-shared";

// Stroke-based glyphs (16x16), tinted by the folder colour, matching the app's
// outline iconography. Keyed by the names in FOLDER_ICON_NAMES.
const PATHS: Record<FolderIconName, React.ReactNode> = {
  folder: (
    <path d="M2 5.2c0-.7.6-1.2 1.3-1.2h3l1.4 1.5h4.9c.8 0 1.4.6 1.4 1.3v4.5c0 .7-.6 1.3-1.4 1.3H3.3c-.7 0-1.3-.6-1.3-1.3z" />
  ),
  shield: <path d="M8 1.9l5 1.8v3.5c0 3-2.1 5.2-5 6.2-2.9-1-5-3.2-5-6.2V3.7z" />,
  terminal: (
    <>
      <rect x="2" y="3" width="12" height="10" rx="1.5" />
      <path d="M4.6 6.4l1.9 1.9-1.9 1.9" />
      <path d="M8.6 10.5h3.2" />
    </>
  ),
  book: (
    <path d="M8 4C6.5 3 4.6 3 3 3.4v8.2C4.6 11.2 6.5 11.2 8 12m0-8c1.5-1 3.4-1 5-.6v8.2c-1.6-.4-3.5-.4-5 .4M8 4v8" />
  ),
  bug: (
    <>
      <circle cx="8" cy="8.6" r="3.1" />
      <path d="M8 5.5V3.2M4.9 8H2.6M11.1 8h2.3M5.3 11l-1.6 1.4M10.7 11l1.6 1.4M5.3 5.7L3.8 4.3M10.7 5.7l1.5-1.4" />
    </>
  ),
  network: (
    <>
      <circle cx="8" cy="3.6" r="1.7" />
      <circle cx="3.6" cy="12.2" r="1.7" />
      <circle cx="12.4" cy="12.2" r="1.7" />
      <path d="M7.1 5.1L4.4 10.7M8.9 5.1l2.7 5.6M5.3 12.2h5.4" />
    </>
  ),
  key: (
    <>
      <circle cx="5.6" cy="6" r="2.9" />
      <path d="M7.7 8.1l4.6 4.6M10.3 10.7l1.4-1.4M12.1 12.5l1.4-1.4" />
    </>
  ),
  flask: (
    <>
      <path d="M6.5 2.2v3.9L3.3 11.4c-.5.9.1 2 1.1 2h7.2c1 0 1.6-1.1 1.1-2L9.5 6.1V2.2" />
      <path d="M6 2.2h4M5.3 9h5.4" />
    </>
  ),
  star: <path d="M8 2.2l1.8 3.6 4 .6-2.9 2.8.7 4L8 11.3l-3.6 1.9.7-4L2.2 6.4l4-.6z" />,
  code: <path d="M6 4.8L2.4 8 6 11.2M10 4.8L13.6 8 10 11.2" />,
};

/** Resolve a stored (possibly null / unknown) icon name to a valid glyph key. */
function resolveIcon(name: string | null): FolderIconName {
  return name && (FOLDER_ICON_NAMES as readonly string[]).includes(name)
    ? (name as FolderIconName)
    : "folder";
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
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {PATHS[resolveIcon(name)]}
    </svg>
  );
}

/** The "all notes" glyph (stacked layers) - not a user-selectable folder icon. */
export function AllNotesGlyph({
  color,
  size = 15,
}: { color: string; size?: number }): React.JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <path d="M8 2.2l5.5 2.8L8 7.8 2.5 5z" />
      <path d="M2.5 8l5.5 2.8L13.5 8M2.5 11l5.5 2.8L13.5 11" />
    </svg>
  );
}

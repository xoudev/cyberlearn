import type React from "react";

/**
 * Four L-shaped corner brackets for terminal-style cards. Extracted from the
 * data settings page and DeleteAccountSection, where it was duplicated. The
 * parent element must be `position: relative`.
 */
export function BracketCorners({ color }: { color: string }): React.JSX.Element {
  const base: React.CSSProperties = { position: "absolute", width: 20, height: 20 };
  return (
    <>
      <span
        aria-hidden="true"
        style={{
          ...base,
          top: -1,
          left: -1,
          borderTop: `2px solid ${color}`,
          borderLeft: `2px solid ${color}`,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          ...base,
          top: -1,
          right: -1,
          borderTop: `2px solid ${color}`,
          borderRight: `2px solid ${color}`,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          ...base,
          bottom: -1,
          left: -1,
          borderBottom: `2px solid ${color}`,
          borderLeft: `2px solid ${color}`,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          ...base,
          bottom: -1,
          right: -1,
          borderBottom: `2px solid ${color}`,
          borderRight: `2px solid ${color}`,
        }}
      />
    </>
  );
}

import type React from "react";

/**
 * The four corner brackets of a card, the mark of the site's terminal look.
 *
 * Two ways to draw them, once each. `Brackets` is four classed spans, for the
 * pages whose stylesheet draws `.bk` (the catalogue, a path, the exam);
 * `CornerBrackets` draws them itself, for a card with no stylesheet of its
 * own. They were written nine times across the app, no two quite alike: 12,
 * 14 or 20 pixels wide, 1.5 or 2 thick, with or without an opacity, at the
 * edge or eight pixels in. The parent is `position: relative`.
 */
export function Brackets(): React.JSX.Element {
  return (
    <>
      <span className="bk tl" />
      <span className="bk tr" />
      <span className="bk bl" />
      <span className="bk br" />
    </>
  );
}

const CORNERS = ["tl", "tr", "bl", "br"] as const;

export function CornerBrackets({
  color = "var(--cosmetic-accent)",
  size = 14,
  thickness = 2,
  opacity = 1,
  inset = -1,
}: {
  color?: string;
  size?: number;
  thickness?: number;
  opacity?: number;
  /** Where the corners sit from the parent's edge: on it by default, or inside it. */
  inset?: number;
}): React.JSX.Element {
  return (
    <>
      {CORNERS.map((pos) => {
        const top = pos.startsWith("t");
        const left = pos.endsWith("l");
        return (
          <span
            key={pos}
            aria-hidden="true"
            style={{
              position: "absolute",
              width: size,
              height: size,
              pointerEvents: "none",
              opacity,
              borderColor: color,
              borderStyle: "solid",
              borderTopWidth: top ? thickness : 0,
              borderBottomWidth: top ? 0 : thickness,
              borderLeftWidth: left ? thickness : 0,
              borderRightWidth: left ? 0 : thickness,
              ...(top ? { top: inset } : { bottom: inset }),
              ...(left ? { left: inset } : { right: inset }),
            }}
          />
        );
      })}
    </>
  );
}

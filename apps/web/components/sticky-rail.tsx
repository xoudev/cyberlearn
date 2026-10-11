"use client";

// "use client" justification: where a rail comes to rest depends on its height
// against the window's, only known by measuring both, and it changes as the
// rail grows (a hint revealed) or the window is resized.

import React, { useEffect, useState } from "react";
import { railStickyTop } from "@/lib/chrome";

type StickyRailProps = React.HTMLAttributes<HTMLElement> & {
  /** A rail is an aside, unless the page already drew it as something else. */
  as?: "aside" | "div" | "section";
};

/**
 * A column that follows the page while the reader scrolls past what it sits
 * beside: a challenge's hints, a lesson's outline, the locker's preview.
 *
 * The page's stylesheet says where the rail may stick, with `position: sticky`
 * under its own breakpoints: only it knows when the rail stands beside the
 * content rather than below it. This component says how far down the rail
 * comes to rest, with its `top`: below the navbar while the rail fits in the
 * window, by its bottom once it is taller (see railStickyTop). A tall rail
 * thus scrolls with the page until its last line is in sight, then stays.
 *
 * The server draws it without a `top`. Nothing is scrolled on the first paint,
 * so sticky or not the rail stands in the same place, and arming it once it
 * has been measured moves nothing.
 */
export function StickyRail({
  as: Tag = "aside",
  style,
  ...props
}: StickyRailProps): React.JSX.Element {
  const [node, setNode] = useState<HTMLElement | null>(null);
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    if (node === null) return;
    const measure = (): void => {
      setTop(railStickyTop(node.offsetHeight, window.innerHeight));
    };
    measure();
    // Absent from jsdom: there, the rail is measured when it mounts and when
    // the window is resized, not as it grows.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(node);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [node]);

  return <Tag ref={setNode} {...props} style={top === null ? style : { ...style, top }} />;
}

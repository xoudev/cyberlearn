"use client";

// "use client" justification: whether a rail fits below the navbar is only
// known by measuring it against the window, and it changes as the rail grows
// (a hint revealed) or the window is resized.

import React, { useEffect, useState } from "react";
import { STICKY_TOP, railFitsBelowNavbar } from "@/lib/chrome";

type StickyRailProps = React.HTMLAttributes<HTMLElement> & {
  /** A rail is an aside, unless the page already drew it as something else. */
  as?: "aside" | "div";
};

/**
 * A column that follows the page while the reader scrolls past what it sits
 * beside: a challenge's hints, a lesson's outline, the locker's preview.
 *
 * The page's stylesheet says where the rail may stick, with `position: sticky`
 * under its own breakpoints: only it knows when the rail stands beside the
 * content rather than below it. This component says how far down the rail
 * comes to rest, and whether it does at all: it gives the rail its `top` only
 * while the rail fits in the window below the navbar. A sticky box without a
 * `top` stays in the flow, which is where a rail too tall to be read whole
 * belongs.
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
  const [fits, setFits] = useState(false);

  useEffect(() => {
    if (node === null) return;
    const measure = (): void => {
      setFits(railFitsBelowNavbar(node.offsetHeight, window.innerHeight));
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

  return <Tag ref={setNode} {...props} style={fits ? { ...style, top: STICKY_TOP } : style} />;
}

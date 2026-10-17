import { type RefObject, useEffect, useState } from "react";

/**
 * The width of an element's content box, kept up to date as it is resized.
 *
 * Null on the server, on the first render, and where the browser has no
 * ResizeObserver: the server cannot measure, and the client's first render has
 * to agree with it. What depends on the width therefore starts from the
 * layout it would have with room, and settles once the element is measured.
 * Only for what CSS cannot do: a layout a container query can express belongs
 * in a stylesheet.
 */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const element = ref.current;
    if (element === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const last = entries[entries.length - 1];
      if (last !== undefined) setWidth(last.contentRect.width);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [ref]);
  return width;
}

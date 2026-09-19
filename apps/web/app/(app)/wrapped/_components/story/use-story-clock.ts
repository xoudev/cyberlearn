"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The clock behind a story: one slide at a time, filling, then the next.
 *
 * A timer per slide would drift and would have to be torn down and rebuilt on
 * every pause; one requestAnimationFrame loop measuring elapsed time against
 * the slide's duration does not, and it is also what draws the bar - the same
 * number both reads. The loop stops dead when the story is closed, paused, or
 * sitting on the last slide, because a story that has ended has nothing to
 * advance to.
 */

export interface StoryClock {
  index: number;
  /** 0 → 1 through the current slide, for the bar that is filling. */
  progress: number;
  paused: boolean;
  next: () => void;
  previous: () => void;
  goTo: (index: number) => void;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
}

export function useStoryClock({
  count,
  slideMs,
  running,
  autoAdvance,
  onEnd,
}: {
  count: number;
  slideMs: number;
  /** False while the story is closed: no clock runs behind a shut overlay. */
  running: boolean;
  /** Off under prefers-reduced-motion - it is then driven by hand only. */
  autoAdvance: boolean;
  onEnd?: () => void;
}): StoryClock {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const elapsedRef = useRef(0);

  const last = Math.max(0, count - 1);

  const goTo = useCallback(
    (target: number) => {
      elapsedRef.current = 0;
      setProgress(0);
      setIndex(Math.min(Math.max(0, target), last));
    },
    [last],
  );

  const next = useCallback(() => {
    setIndex((current) => {
      if (current >= last) return current;
      elapsedRef.current = 0;
      setProgress(0);
      return current + 1;
    });
  }, [last]);

  const previous = useCallback(() => {
    setIndex((current) => {
      // Rewinding the current slide first is what the bar being part-full
      // means; jumping straight back would skip what is on screen.
      elapsedRef.current = 0;
      setProgress(0);
      return current <= 0 ? 0 : current - 1;
    });
  }, []);

  const togglePaused = useCallback(() => {
    setPaused((value) => !value);
  }, []);

  // Reopening starts the story over rather than resuming somebody else's year
  // half way through.
  useEffect(() => {
    if (running) return;
    elapsedRef.current = 0;
    setIndex(0);
    setProgress(0);
    setPaused(false);
  }, [running]);

  useEffect(() => {
    if (!running || !autoAdvance || paused) return;
    if (index >= last) {
      // The last slide holds. Its bar is shown full rather than filling.
      setProgress(1);
      onEnd?.();
      return;
    }

    let frame = 0;
    let previousStamp: number | null = null;

    const tick = (stamp: number): void => {
      if (previousStamp !== null) elapsedRef.current += stamp - previousStamp;
      previousStamp = stamp;

      const ratio = elapsedRef.current / slideMs;
      if (ratio >= 1) {
        elapsedRef.current = 0;
        setProgress(0);
        setIndex((current) => Math.min(current + 1, last));
        return;
      }
      setProgress(ratio);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [running, autoAdvance, paused, index, last, slideMs, onEnd]);

  return { index, progress, paused, next, previous, goTo, setPaused, togglePaused };
}

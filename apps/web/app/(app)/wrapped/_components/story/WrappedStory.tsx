"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WrappedPayload } from "@cyberlearn/lib";
import { SLIDE_MS, buildStorySlides, type Slide } from "@cyberlearn/lib/gamification/wrapped-story";
import { useStoryClock } from "./use-story-clock";
import "./story.css";

/**
 * The year as a story: one figure per screen, a bar per slide across the top,
 * tap right to go on, tap left to go back, hold to stop it moving.
 *
 * That shape is not decoration. A recap laid out as a page is read the way a
 * page is read - the eye finds the biggest number, and the rest is skimmed.
 * Held one screen at a time, each figure gets its turn, and the one worth
 * waiting for can be put behind a question.
 */

/** Below this, a press was a tap; above it, somebody was holding to read. */
const HOLD_MS = 220;

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listen = (event: MediaQueryListEvent): void => {
      setReduced(event.matches);
    };
    query.addEventListener("change", listen);
    return () => {
      query.removeEventListener("change", listen);
    };
  }, []);
  return reduced;
}

function Bars({
  count,
  index,
  progress,
}: {
  count: number;
  index: number;
  progress: number;
}): React.JSX.Element {
  return (
    <div className="ws-bars" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="ws-bar">
          <span
            className="ws-bar__fill"
            style={{
              transform: `scaleX(${String(i < index ? 1 : i === index ? progress : 0)})`,
            }}
          />
        </span>
      ))}
    </div>
  );
}

function SlideView({
  slide,
  share,
}: {
  slide: Slide;
  /** The export panel, handed in so the story does not own a canvas. */
  share: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={`ws-slide ws-slide--${slide.accent}`} key={slide.id}>
      <p className="ws-eyebrow">{slide.eyebrow}</p>

      {slide.kicker !== undefined && <p className="ws-kicker">{slide.kicker}</p>}

      {slide.headline !== undefined && slide.headlineFirst === true && (
        <p className="ws-headline ws-headline--lead">{slide.headline}</p>
      )}

      {slide.figure !== undefined && (
        <p className="ws-figure">
          <span className="ws-figure__value">{slide.figure.value}</span>
          {slide.figure.unit !== undefined && (
            <span className="ws-figure__unit">{slide.figure.unit}</span>
          )}
        </p>
      )}

      {slide.headline !== undefined && slide.headlineFirst !== true && (
        <p className="ws-headline">{slide.headline}</p>
      )}
      {slide.lead !== undefined && <p className="ws-lead">{slide.lead}</p>}

      {slide.extra?.kind === "bars" && (
        <ul className="ws-split">
          {slide.extra.rows.map((row) => (
            <li key={row.label} className="ws-split__row">
              <span className="ws-split__label">{row.label}</span>
              <span className="ws-split__track">
                <span className="ws-split__fill" style={{ width: `${String(row.share)}%` }} />
              </span>
              <span className="ws-split__value">{row.value}</span>
            </li>
          ))}
        </ul>
      )}

      {slide.extra?.kind === "list" && (
        <ul className="ws-list">
          {slide.extra.rows.map((row) => (
            <li key={row.label} className="ws-list__row">
              <span className="ws-list__mark" aria-hidden="true" />
              <span className="ws-list__label">{row.label}</span>
              <span className="ws-list__note">{row.note}</span>
            </li>
          ))}
        </ul>
      )}

      {slide.extra?.kind === "share" && (
        // The one region where a press is not navigation: the card and its two
        // buttons sit on the left half of the story, where a tap would
        // otherwise have meant "back".
        <div
          className="ws-share"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          onPointerUp={(event) => {
            event.stopPropagation();
          }}
        >
          {share}
        </div>
      )}

      {slide.footer !== undefined && <p className="ws-footer">{slide.footer}</p>}
    </div>
  );
}

export function WrappedStory({
  payload,
  share,
  onClose,
}: {
  payload: WrappedPayload;
  share: React.ReactNode;
  onClose: () => void;
}): React.JSX.Element {
  const slides = useMemo(() => buildStorySlides(payload), [payload]);
  const reduced = useReducedMotion();
  const clock = useStoryClock({
    count: slides.length,
    slideMs: SLIDE_MS,
    running: true,
    autoAdvance: !reduced,
  });
  const { index, progress, paused, next, previous, setPaused, togglePaused } = clock;

  const pressedAt = useRef<number | null>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") previous();
      else if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        togglePaused();
      } else return;
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, next, previous, togglePaused]);

  const onPointerDown = useCallback(() => {
    pressedAt.current = Date.now();
    setPaused(true);
  }, [setPaused]);

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const started = pressedAt.current;
      pressedAt.current = null;
      setPaused(false);
      if (started === null) return;
      // A hold was somebody reading, not somebody navigating: releasing it
      // resumes the story where it stopped rather than skipping the slide.
      if (Date.now() - started >= HOLD_MS) return;

      const surface = surfaceRef.current;
      if (!surface) return;
      const { left, width } = surface.getBoundingClientRect();
      if (event.clientX - left < width / 2) previous();
      else next();
    },
    [next, previous, setPaused],
  );

  const slide = slides[index];
  if (!slide) return <></>;

  return (
    <div
      className="ws-root"
      role="dialog"
      aria-modal="true"
      aria-label={`Ton Wrapped ${payload.periodKey}`}
    >
      <div className="ws-frame">
        <Bars count={slides.length} index={index} progress={progress} />

        <div className="ws-chrome">
          <span className="ws-brand">
            <b>cyber</b> learn
          </span>
          <span className="ws-chrome__actions">
            <button
              type="button"
              className="ws-icon"
              onClick={togglePaused}
              aria-label={paused ? "Reprendre" : "Mettre en pause"}
            >
              {paused ? (
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 2.5v11l9-5.5z" />
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" />
                </svg>
              )}
            </button>
            <button type="button" className="ws-icon" onClick={onClose} aria-label="Fermer">
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <path d="M3 3 L13 13 M13 3 L3 13" />
              </svg>
            </button>
          </span>
        </div>

        {/* The tap surface. It carries no role of its own: everything it does
            is on the keyboard too, and announcing a button around the whole
            story would bury the story inside it. */}
        <div
          ref={surfaceRef}
          className="ws-surface"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            pressedAt.current = null;
            setPaused(false);
          }}
        >
          <div className="ws-stage" aria-live="polite">
            <SlideView slide={slide} share={share} />
          </div>
        </div>

        <div className="ws-steps">
          <button type="button" className="ws-step" onClick={previous} disabled={index === 0}>
            ← Précédent
          </button>
          <span className="ws-count">
            {index + 1} / {slides.length}
          </span>
          <button
            type="button"
            className="ws-step"
            onClick={next}
            disabled={index === slides.length - 1}
          >
            Suivant →
          </button>
        </div>
      </div>
    </div>
  );
}

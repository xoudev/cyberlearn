import React from "react";
import {
  placeLabel,
  TOURNAMENT_PHASE_LABELS,
  type TournamentPhase,
} from "@cyberlearn/lib/challenges/tournament";
import { ProgressBar } from "@/components/progress-bar";

/**
 * The small pieces the three tournament pages draw alike, on the classes of
 * tournaments.css: a section's head, a phase, the time window, a place on a
 * podium, a difficulty, what a hidden challenge looks like, and the icons.
 * No state and no server import, so the list and the challenge page (server)
 * and the scoreboard (client) share them.
 */

/**
 * A section's head: the site's `.section-head` (`// Title`), a figure on the
 * right, a dashed rule under it.
 */
export function SectionHead({
  title,
  meta,
  id,
}: {
  title: string;
  meta?: React.ReactNode;
  id?: string;
}): React.JSX.Element {
  return (
    <div className="trn-shead">
      <h2 className="section-head trn-shead__title" id={id}>
        {title}
      </h2>
      {meta !== undefined && <span className="trn-shead__meta">{meta}</span>}
    </div>
  );
}

/** A tournament's phase in words and in its colour; the dot pulses while it runs. */
export function PhaseBadge({ phase }: { phase: TournamentPhase }): React.JSX.Element {
  return (
    <span className="trn-phase" data-phase={phase}>
      <span className="trn-dot" aria-hidden="true" />
      {TOURNAMENT_PHASE_LABELS[phase]}
    </span>
  );
}

/** Said beside a scoreboard while it is read again every few seconds. */
export function LiveTag(): React.JSX.Element {
  return (
    <span className="trn-livetag">
      <span className="trn-dot" aria-hidden="true" />
      En direct
    </span>
  );
}

/** How much of the tournament's window has gone by, and what that means in words. */
export function WindowBar({
  share,
  caption,
}: {
  /** From 0 to 1. */
  share: number;
  caption: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="trn-window">
      <ProgressBar
        value={Math.floor(share * 100)}
        label="Temps écoulé"
        size="md"
        color="var(--trn-phase)"
      />
      <p className="trn-window__cap">{caption}</p>
    </div>
  );
}

/**
 * A place as a plate: "1er", "2e". The first three take the medal colours once
 * they have scored; a podium of teams still at zero would say nothing. Before
 * anybody has scored, every team ties first: the plate then says no place.
 */
export function Place({
  rank,
  scored,
  ranked = true,
  className = "trn-place",
}: {
  rank: number;
  scored: boolean;
  /** False while nobody has a point yet. */
  ranked?: boolean;
  className?: string;
}): React.JSX.Element {
  if (!ranked) {
    return (
      <span className={className}>
        <span aria-hidden="true">–</span>
        <span className="sr-only">sans place</span>
      </span>
    );
  }
  return (
    <span className={className} data-place={scored && rank <= 3 ? String(rank) : undefined}>
      {placeLabel(rank)}
    </span>
  );
}

/** A difficulty as four squares, as many filled as its level; the word goes beside it. */
export function Pips({ level }: { level: number }): React.JSX.Element {
  return (
    <span className="trn-pips" aria-hidden="true">
      {[1, 2, 3, 4].map((n) => (
        <i key={n} data-on={n <= level ? "true" : undefined} />
      ))}
    </span>
  );
}

/** What a challenge hidden until the start holds: its shape, not its content. */
export function Redacted({ widths }: { widths: readonly string[] }): React.JSX.Element {
  return (
    <span className="trn-redacted" aria-hidden="true">
      {widths.map((width, index) => (
        <span key={`${String(index)}-${width}`} style={{ width }} />
      ))}
    </span>
  );
}

/** A tick: a flag found, a challenge done. */
export function IconCheck(): React.JSX.Element {
  return (
    <svg className="trn-ico" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" />
    </svg>
  );
}

/** A padlock: a challenge sealed until the start, a flag that can no longer be given. */
export function IconLock(): React.JSX.Element {
  return (
    <svg className="trn-ico" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="3.5" y="7" width="9" height="6.5" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

/** A flag, beside the field it is given in. */
export function IconFlag(): React.JSX.Element {
  return (
    <svg className="trn-ico" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3.5 14V2.5M3.5 2.5h8l-1.8 3 1.8 3h-8" />
    </svg>
  );
}

/** An arrow into a tray: a challenge's file to download. */
export function IconDownload(): React.JSX.Element {
  return (
    <svg className="trn-ico" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" />
    </svg>
  );
}

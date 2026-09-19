"use client";

import React, { useEffect, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import type { WrappedPayload } from "@cyberlearn/lib";
import { getWrappedAction } from "@/app/(app)/_actions/wrapped-actions";
import { ModalShell } from "@/components/modal-shell";

/**
 * Fetched on the click, like the payload it renders.
 *
 * Imported plainly, the recap's cards landed in the signed-in layout's chunk -
 * 20 kB downloaded by every page, eleven months a year, to draw something
 * nobody can open. The build manifest is where that showed up, not the page
 * weights, which is why it is worth a line here.
 */
const WrappedBody = dynamic(
  async () => {
    const mod = await import("@/app/(app)/wrapped/_components/WrappedClient");
    return mod.WrappedBody;
  },
  { ssr: false, loading: () => <p className="wr-modal-note">Ouverture du récap…</p> },
);

/**
 * Wrapped, as an event in the navbar rather than an entry in the menu.
 *
 * It used to be a permanent tab in the sidebar, which is the shape of a place
 * you can always go - and for eleven months of the year going there got you a
 * locked door. A recap that arrives once a year is not a section of the site,
 * it is something that turns up; so it turns up, next to the bell, and it is
 * gone again in January.
 *
 * The chip is only rendered while the window is open - the navbar decides that
 * from the date, which costs nothing. The recap itself is a year of somebody's
 * activity aggregated, so it is read on the click and not before.
 */

/**
 * Next drives a redirect from a server guard by throwing, and marks it with a
 * digest. The action's guard is requireRequestUser, which redirects a lapsed
 * session to /login - so a catch that treated that as a failure would swallow
 * the navigation and leave somebody staring at a pop-up that never resolves.
 */
function isNextControlFlow(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const { digest } = error;
  return typeof digest === "string" && digest.startsWith("NEXT_");
}

/** Per edition: a new year's recap has to announce itself again. */
function seenKey(periodKey: string): string {
  return `cl-wrapped-seen:${periodKey}`;
}

function SparkGlyph(): React.JSX.Element {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 1.5 9.4 6.6 14.5 8 9.4 9.4 8 14.5 6.6 9.4 1.5 8 6.6 6.6z" />
    </svg>
  );
}

export function WrappedChip({ periodKey }: { periodKey: string }): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(true);
  const [data, setData] = useState<{ payload: WrappedPayload | null; handle: string } | null>(null);
  const [failed, setFailed] = useState<"closed" | "error" | null>(null);
  const [pending, start] = useTransition();

  // Starts "seen" and turns unseen once storage says so, rather than the other
  // way round: the server renders no chip at all, so the first client paint
  // deciding to pulse would be a flash on every page load for someone who has
  // already read it.
  useEffect(() => {
    try {
      setSeen(localStorage.getItem(seenKey(periodKey)) === "1");
    } catch {
      // Private mode, storage off: treat it as read rather than pulse forever.
      setSeen(true);
    }
  }, [periodKey]);

  function openModal(): void {
    setOpen(true);
    setFailed(null);
    setSeen(true);
    try {
      localStorage.setItem(seenKey(periodKey), "1");
    } catch {
      // Nothing to do: the pulse is a nicety, not the feature.
    }
    if (data !== null || pending) return;
    start(async () => {
      try {
        const result = await getWrappedAction();
        if (result.ok) {
          setData({ payload: result.payload ?? null, handle: result.handle ?? "moi" });
        } else {
          setFailed("closed");
        }
      } catch (error) {
        if (isNextControlFlow(error)) throw error;
        // Anything else - the database being down, a serialisation failure -
        // ends the transition without ending the wait, which left the pop-up
        // on "Calcul de ton année…" for good. It says so instead.
        setFailed("error");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className={`wr-chip${seen ? "" : " wr-chip--fresh"}`}
        aria-label={`Ton Wrapped ${periodKey}`}
      >
        <SparkGlyph />
        <span className="wr-chip__label">Wrapped</span>
        <span className="wr-chip__year">{periodKey}</span>
      </button>

      <ModalShell
        open={open}
        onClose={() => {
          setOpen(false);
        }}
        eyebrow={`Cyber Learn · Récap ${periodKey}`}
        title="Ton Wrapped"
        bodyPadding="24px 20px"
      >
        {pending && data === null && failed === null && (
          <p className="wr-modal-note">Calcul de ton année…</p>
        )}
        {failed === "closed" && (
          <p className="wr-modal-note">
            Ton récap n’est pas ouvert en ce moment. Il revient le 1er décembre.
          </p>
        )}
        {failed === "error" && (
          <p className="wr-modal-note">
            Ton récap n’a pas pu être chargé. Recharge la page et réessaie.
          </p>
        )}
        {data !== null && <WrappedBody payload={data.payload} handle={data.handle} />}
      </ModalShell>
    </>
  );
}

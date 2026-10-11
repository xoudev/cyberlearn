"use client";

// "use client" justified: the button swaps for its question in place and moves the focus.

import React, { useEffect, useId, useRef, useState } from "react";

/**
 * A button for something that cannot be taken back, which asks first, in
 * place.
 *
 * Pressed, it gives way to the question and two answers. The focus lands on
 * "Annuler", so a second Enter or a double click does not finish what the first
 * one started, and Escape backs out, handing the focus back to the button. In
 * place rather than in a dialog: these are small gestures in a row or a
 * toolbar, and a modal over the page would weigh more than what it guards.
 *
 * `ask` false makes it an ordinary button, so a control whose action is only
 * sometimes final (the friend button: adding is not, unfriending is) stays one
 * element, and keeps the focus, from one state to the next.
 */
export function ConfirmButton({
  children,
  className,
  question,
  detail,
  confirmLabel,
  onConfirm,
  ask = true,
  pending = false,
  showQuestion = true,
  onAskingChange,
}: {
  /** What the button says before it is pressed. */
  children: React.ReactNode;
  className: string;
  /** Read out as the group's name; shown too unless `showQuestion` is false. */
  question: string;
  /**
   * What answering yes does, on a line under the question. Always the group's
   * description, so a screen reader hears it; out of sight with the question
   * where `showQuestion` is false, since the row has no room for it either.
   */
  detail?: string;
  confirmLabel: string;
  onConfirm: () => void;
  ask?: boolean;
  pending?: boolean;
  /** False where the surrounding row says it in its own place. */
  showQuestion?: boolean;
  onAskingChange?: (asking: boolean) => void;
}): React.JSX.Element {
  const [asking, setAsking] = useState(false);
  const detailId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Whether the focus goes back to the button once the question is answered.
  // It does on "Annuler", and after a confirm too: the button is back while
  // the call runs, and stays after a refusal, or with its next label on a
  // profile. Where the row goes with it, there is no button left to take it.
  const restore = useRef(false);

  useEffect(() => {
    if (asking) {
      cancelRef.current?.focus();
    } else if (restore.current) {
      restore.current = false;
      triggerRef.current?.focus();
    }
  }, [asking]);

  const settle = (next: boolean): void => {
    restore.current = !next;
    setAsking(next);
    onAskingChange?.(next);
  };

  if (!asking) {
    return (
      <button
        ref={triggerRef}
        type="button"
        className={className}
        // aria-disabled rather than disabled: the focus is on this button
        // while the call runs, and a disabled button drops it on the page.
        aria-disabled={pending || undefined}
        onClick={() => {
          if (pending) return;
          if (ask) settle(true);
          else onConfirm();
        }}
      >
        {children}
      </button>
    );
  }

  return (
    <span
      role="group"
      aria-label={question}
      aria-describedby={detail !== undefined ? detailId : undefined}
      className="confirm-step"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        // Escape answers the question, not whatever panel holds it.
        event.stopPropagation();
        settle(false);
      }}
    >
      {showQuestion && <span className="confirm-step__question">{question}</span>}
      <button
        type="button"
        className="btn btn--danger btn--sm"
        onClick={() => {
          settle(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </button>
      <button
        ref={cancelRef}
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={() => {
          settle(false);
        }}
      >
        Annuler
      </button>
      {detail !== undefined && (
        // Still read out when hidden: a description points at it by id.
        <span id={detailId} className="confirm-step__detail" hidden={!showQuestion}>
          {detail}
        </span>
      )}
    </span>
  );
}

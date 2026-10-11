"use client";

// "use client" justified: the button swaps for its question in place and moves the focus.

import React, { useEffect, useRef, useState } from "react";

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
  confirmLabel: string;
  onConfirm: () => void;
  ask?: boolean;
  pending?: boolean;
  /** False where the surrounding row says it in its own place. */
  showQuestion?: boolean;
  onAskingChange?: (asking: boolean) => void;
}): React.JSX.Element {
  const [asking, setAsking] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Where the focus goes once the question is answered: back to the button on
  // "Annuler", left alone after a confirm (the row usually goes with it).
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
    setAsking(next);
    onAskingChange?.(next);
  };

  const cancel = (): void => {
    restore.current = true;
    settle(false);
  };

  if (!asking) {
    return (
      <button
        ref={triggerRef}
        type="button"
        className={className}
        disabled={pending}
        onClick={() => {
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
      className="confirm-step"
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        // Escape answers the question, not whatever panel holds it.
        event.stopPropagation();
        cancel();
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
      <button ref={cancelRef} type="button" className="btn btn--ghost btn--sm" onClick={cancel}>
        Annuler
      </button>
    </span>
  );
}

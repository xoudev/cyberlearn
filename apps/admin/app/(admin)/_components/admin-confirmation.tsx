"use client";

// Sensitive actions wait for an accessible dialog before the original form or transition runs.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ModalShell } from "@cyberlearn/ui";

type ConfirmAction = (question: string) => Promise<boolean>;
const ConfirmationContext = createContext<ConfirmAction | null>(null);

export function AdminConfirmationProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [question, setQuestion] = useState<string | null>(null);
  const answer = useRef<((accepted: boolean) => void) | null>(null);
  const confirm = useCallback<ConfirmAction>((message) => {
    answer.current?.(false);
    setQuestion(message);
    return new Promise<boolean>((resolve) => {
      answer.current = resolve;
    });
  }, []);
  const finish = useCallback((accepted: boolean) => {
    answer.current?.(accepted);
    answer.current = null;
    setQuestion(null);
  }, []);
  useEffect(
    () => () => {
      answer.current?.(false);
    },
    [],
  );

  return (
    <ConfirmationContext.Provider value={confirm}>
      {children}
      <ModalShell
        open={question !== null}
        onClose={() => {
          finish(false);
        }}
        maxWidth={560}
        eyebrow="ADMIN · Administration"
        title="Confirmer cette action"
        accent="var(--a-warning)"
        actions={
          <>
            <button
              type="button"
              className="a-btn a-btn--ghost"
              onClick={() => {
                finish(false);
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              className="a-btn a-btn--danger"
              onClick={() => {
                finish(true);
              }}
            >
              Confirmer l’action
            </button>
          </>
        }
      >
        <p className="a-confirmation-copy">{question}</p>
      </ModalShell>
    </ConfirmationContext.Provider>
  );
}

export function useAdminConfirmation(): ConfirmAction {
  const confirm = useContext(ConfirmationContext);
  if (!confirm) throw new Error("Admin confirmations require AdminConfirmationProvider");
  return confirm;
}

export function AdminConfirmForm({
  question,
  children,
  ...props
}: Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit"> & {
  question: string | ((form: HTMLFormElement) => string | null);
}): React.ReactElement {
  const confirm = useAdminConfirmation();
  const approved = useRef(false);
  const waiting = useRef(false);
  return (
    <form
      {...props}
      onSubmit={(event) => {
        if (approved.current) {
          approved.current = false;
          return;
        }
        const message = typeof question === "function" ? question(event.currentTarget) : question;
        if (message === null) return;
        event.preventDefault();
        if (waiting.current) return;
        waiting.current = true;
        const form = event.currentTarget;
        const submitter = event.nativeEvent.submitter;
        void confirm(message).then((accepted) => {
          waiting.current = false;
          if (!accepted || !form.isConnected) return;
          approved.current = true;
          try {
            if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement)
              form.requestSubmit(submitter);
            else form.requestSubmit();
          } finally {
            approved.current = false;
          }
        });
      }}
    >
      {children}
    </form>
  );
}

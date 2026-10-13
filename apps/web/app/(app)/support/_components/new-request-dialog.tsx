"use client";

// "use client" justification: a window over the page, opened and closed by
// the address in the browser; the form answers in place.

import React, { useId, useState, useTransition } from "react";
import Link from "next/link";
import { ModalShell, Select } from "@cyberlearn/ui";
import {
  ESTABLISHMENT_CHECKLIST,
  TICKET_FORM_THEMES,
  TICKET_MESSAGE_MAX,
  TICKET_MESSAGE_MIN,
  TICKET_SUBJECT_MAX,
  TICKET_SUBJECT_MIN,
  ticketDraftProblem,
} from "@cyberlearn/lib/tickets/tickets";
import type { QueryDialogProps } from "@/hooks/use-query-dialog";
import { fileRequestAction, type FileTicketResult } from "../_actions/request-actions";

type FieldErrors = Extract<FileTicketResult, { ok: false }>["fieldErrors"];

/**
 * A new help request, in a window over the page (?request=1, registered in
 * components/query-dialogs.ts).
 *
 * "Nouvelle demande" used to send a signed-in reader to the public /contact
 * page, out of the site's frame, to type an address the site already knew.
 * The window asks for the request alone (a theme, an object, a message), as
 * the app's screen does: the answer goes to the account's own address. The
 * public page stays, for visitors.
 *
 * Once sent, the window says so and the request is at the top of "Mes
 * demandes" behind it. Until then a click beside it or Escape closes it only
 * while nothing has been written: what was, the close button or "Annuler"
 * throws away on purpose.
 */
export default function NewRequestDialog({ onClose }: QueryDialogProps): React.JSX.Element {
  const formId = useId();
  const [theme, setTheme] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(undefined);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const written = theme !== "" || subject.trim() !== "" || message.trim() !== "";

  const submit = (e: React.SyntheticEvent): void => {
    e.preventDefault();
    setError(null);
    setFieldErrors(undefined);
    const problem = ticketDraftProblem({ theme: theme === "" ? null : theme, subject, message });
    if (problem !== null) {
      setError(problem);
      return;
    }
    start(() => {
      void fileRequestAction({ theme, subject: subject.trim(), message: message.trim() }).then(
        (res) => {
          if (res.ok) {
            setTicketId(res.ticketId);
            return;
          }
          // The address is the account's, not a field here: its fault is said
          // with the others'.
          setError(res.fieldErrors?.email ?? res.error);
          setFieldErrors(res.fieldErrors);
        },
        () => {
          // The call itself failed (the network, a deploy): nothing was filed.
          setError("Envoi impossible. Réessaie dans un moment.");
        },
      );
    });
  };

  if (ticketId !== null) {
    return (
      <ModalShell
        open
        onClose={onClose}
        eyebrow="Support"
        title="Demande envoyée"
        maxWidth={560}
        actions={
          <>
            <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
              Fermer
            </button>
            {/* In place of the window's step of the history: Back from the
                request goes to the page it was opened on. */}
            <Link href={`/support/${ticketId}`} replace className="btn btn--sm">
              Voir ma demande
            </Link>
          </>
        }
      >
        <div className="tk-new" role="status">
          <p className="tk-new__lede">
            Ta demande est enregistrée. L&apos;équipe te répond dans « Mes demandes » et par e-mail,
            à l&apos;adresse de ton compte.
          </p>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell
      open
      onClose={onClose}
      eyebrow="Support"
      title="Nouvelle demande"
      meta="L'équipe te répond ici et par e-mail, à l'adresse de ton compte."
      maxWidth={640}
      dismissable={!pending && !written}
      actions={
        <>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onClose}
            disabled={pending}
          >
            Annuler
          </button>
          <button type="submit" form={formId} className="btn btn--sm" disabled={pending}>
            {pending ? "Envoi…" : "Envoyer la demande"}
          </button>
        </>
      }
    >
      <form id={formId} className="tk-new" onSubmit={submit} noValidate>
        <div className="cls-field">
          <label className="cls-field__label" htmlFor={`${formId}-theme`}>
            Thème
          </label>
          <Select
            id={`${formId}-theme`}
            name="theme"
            value={theme}
            onChange={(next) => {
              setTheme(next);
              setError(null);
            }}
            placeholder="Choisir un thème…"
            options={TICKET_FORM_THEMES}
          />
          {fieldErrors?.theme !== undefined && (
            <p className="tk-new__error" role="alert">
              {fieldErrors.theme}
            </p>
          )}
          {/* The one theme that needs saying what to put in it, said before the
              message box rather than in a reply a day later. */}
          {theme === "ESTABLISHMENT_REQUEST" && (
            <div className="tk-checklist">
              <p className="tk-checklist__title">À mettre dans ton message</p>
              <ul>
                {ESTABLISHMENT_CHECKLIST.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="cls-field">
          <label className="cls-field__label" htmlFor={`${formId}-subject`}>
            Objet
          </label>
          <input
            id={`${formId}-subject`}
            name="subject"
            className="cls-input"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setError(null);
            }}
            minLength={TICKET_SUBJECT_MIN}
            maxLength={TICKET_SUBJECT_MAX}
            placeholder="Résume ton problème en quelques mots"
            aria-describedby={
              fieldErrors?.subject !== undefined ? `${formId}-subject-error` : undefined
            }
          />
          {fieldErrors?.subject !== undefined && (
            <p id={`${formId}-subject-error`} className="tk-new__error" role="alert">
              {fieldErrors.subject}
            </p>
          )}
        </div>

        <div className="cls-field">
          <label className="cls-field__label" htmlFor={`${formId}-message`}>
            Message
          </label>
          <textarea
            id={`${formId}-message`}
            name="message"
            className="cls-input tk-new__message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setError(null);
            }}
            minLength={TICKET_MESSAGE_MIN}
            maxLength={TICKET_MESSAGE_MAX}
            rows={7}
            placeholder="Décris ta demande en détail…"
            aria-describedby={
              fieldErrors?.message !== undefined ? `${formId}-message-error` : undefined
            }
          />
          {fieldErrors?.message !== undefined && (
            <p id={`${formId}-message-error`} className="tk-new__error" role="alert">
              {fieldErrors.message}
            </p>
          )}
        </div>

        {error !== null && (
          <p className="cls-alert" data-tone="bad" role="alert">
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
}

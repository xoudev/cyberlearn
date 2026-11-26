"use client";

// "use client" justification: a window over the page, opened and closed by
// the address in the browser; the form answers in place.

import React, { useId, useState, useTransition } from "react";
import Link from "next/link";
import { ModalShell, Select } from "@cyberlearn/ui";
import "../support.css";
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
import { newRequestPrefill, PAGE_REPORT_VALUE } from "./new-request-query";

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
 * Opened as « Signaler un souci » (?request=page, from the navbar or the
 * account tray), it is the same window over the page the reader is on: a bug,
 * the page's title in the subject, and the page, the screen and the browser
 * sent with the message, which says so before it is sent.
 *
 * Once sent, the window says so and the request is at the top of "Mes
 * demandes" behind it. Until then a click beside it or Escape closes it only
 * while nothing has been written: what was, the close button or "Annuler"
 * throws away on purpose.
 */
export default function NewRequestDialog({ value, onClose }: QueryDialogProps): React.JSX.Element {
  const formId = useId();
  // What a link wrote in advance (an error screen's incident, the Android
  // app's "Être prévenu"), the same as the public form does from its address.
  // A report reads its page once, when it opens: the path and the title of
  // what is under the window, and the screen it is seen on.
  const [report] = useState(() =>
    value === PAGE_REPORT_VALUE && typeof window !== "undefined"
      ? {
          page: window.location.pathname,
          width: window.innerWidth,
          height: window.innerHeight,
          title: document.title,
        }
      : null,
  );
  const [prefill] = useState(() => newRequestPrefill(value, report?.title));
  const [theme, setTheme] = useState<string>(prefill?.theme ?? "");
  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(undefined);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Beyond what the link wrote: that was not the reader's to lose.
  const written =
    theme !== (prefill?.theme ?? "") ||
    subject.trim() !== (prefill?.subject ?? "") ||
    message.trim() !== "";

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
      const sent = { theme, subject: subject.trim(), message: message.trim() };
      const filing =
        report === null
          ? fileRequestAction(sent)
          : fileRequestAction(sent, {
              page: report.page,
              width: report.width,
              height: report.height,
            });
      void filing.then(
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
        className="community-dialog request-dialog"
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
      title={report === null ? "Nouvelle demande" : "Signaler un souci"}
      className="community-dialog request-dialog"
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
            panelClassName="community-select-panel"
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
            placeholder={
              report === null
                ? "Décris ta demande en détail…"
                : "Ce que tu faisais, ce qui s'est passé, ce que tu attendais…"
            }
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

        {report !== null && (
          <p className="tk-new__context">
            Envoyé avec ta demande : la page <code>{report.page}</code>, la taille de ton écran (
            {report.width} × {report.height}) et ton navigateur.
          </p>
        )}

        {error !== null && (
          <p className="cls-alert" data-tone="bad" role="alert">
            {error}
          </p>
        )}
      </form>
    </ModalShell>
  );
}

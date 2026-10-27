"use client";

// The action result, theme-specific checklist and anti-spam timestamp need browser state.
import React, { useActionState, useEffect, useState } from "react";
import { submitContactAction, type ContactFormState } from "./_actions/contact-actions";
import { Select } from "@cyberlearn/ui";
import { ESTABLISHMENT_CHECKLIST, TICKET_FORM_THEMES } from "@cyberlearn/lib/tickets/tickets";
import { BastionLogo } from "@/components/bastion-logo";

const THEMES = TICKET_FORM_THEMES;
const initialState: ContactFormState = {};

function FieldError({
  field,
  error,
}: {
  field: string;
  error: string | undefined;
}): React.ReactElement | null {
  return error ? (
    <p id={`contact-${field}-error`} className="contact-error" role="alert">
      {error}
    </p>
  ) : null;
}

export default function ContactPage(): React.ReactElement {
  const [state, action, isPending] = useActionState(submitContactAction, initialState);
  const [incidentRef, setIncidentRef] = useState<string | null>(null);
  const [initialSubject, setInitialSubject] = useState<string | null>(null);
  const [initialTheme, setInitialTheme] = useState("");
  const [theme, setTheme] = useState("");
  const [loadedAt, setLoadedAt] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setIncidentRef(params.get("ref"));
    setInitialSubject(params.get("subject"));
    const requestedTheme = params.get("theme");
    const known = THEMES.some((item) => item.value === requestedTheme)
      ? (requestedTheme ?? "")
      : "";
    setInitialTheme(known);
    setTheme(known);
    setLoadedAt(String(Date.now()));
  }, []);
  // What the theme control starts from: what a refused send held, else the link's.
  const shownTheme = state.values?.theme ?? initialTheme;

  if (state.success)
    return (
      <div className="contact-success" role="status">
        <BastionLogo size={48} />
        <h2>Message envoyé.</h2>
        <p>Ton message a été reçu. L’équipe te répondra par e-mail.</p>
      </div>
    );

  return (
    <form action={action} className="contact-form">
      <p className="contact-required">Tous les champs sont obligatoires.</p>
      <input type="hidden" name="loaded_at" value={loadedAt} readOnly />
      <div
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
      >
        <label>
          Ne pas remplir
          <input name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>
      <div className="contact-field">
        <label htmlFor="contact-email">Adresse e-mail</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={state.values?.email ?? ""}
          placeholder="toi@exemple.fr"
          aria-invalid={Boolean(state.fieldErrors?.email)}
          aria-describedby={state.fieldErrors?.email ? "contact-email-error" : undefined}
        />
        <FieldError field="email" error={state.fieldErrors?.email} />
      </div>
      <div className="contact-field">
        <label htmlFor="contact-theme">Thème</label>
        <Select
          id="contact-theme"
          key={shownTheme || "theme"}
          name="theme"
          required
          defaultValue={shownTheme}
          placeholder="Choisir un thème…"
          options={THEMES}
          onChange={setTheme}
          panelClassName="contact-options"
        />
        {(theme || shownTheme) === "ESTABLISHMENT_REQUEST" && (
          <aside className="contact-checklist">
            <h2>À mettre dans ton message</h2>
            <ul>
              {ESTABLISHMENT_CHECKLIST.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </aside>
        )}
        <FieldError field="theme" error={state.fieldErrors?.theme} />
      </div>
      <div className="contact-field">
        <label htmlFor="contact-subject">Sujet</label>
        <input
          id="contact-subject"
          key={incidentRef ?? initialSubject ?? "subject"}
          name="subject"
          type="text"
          required
          minLength={5}
          maxLength={200}
          defaultValue={
            state.values?.subject ??
            (incidentRef ? `Incident ${incidentRef}` : (initialSubject ?? undefined))
          }
          placeholder="Résume ta demande en quelques mots"
          aria-invalid={Boolean(state.fieldErrors?.subject)}
          aria-describedby={state.fieldErrors?.subject ? "contact-subject-error" : undefined}
        />
        <FieldError field="subject" error={state.fieldErrors?.subject} />
      </div>
      <div className="contact-field">
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={20}
          maxLength={5000}
          rows={7}
          defaultValue={state.values?.message ?? ""}
          placeholder="Décris ta demande en détail…"
          aria-invalid={Boolean(state.fieldErrors?.message)}
          aria-describedby={state.fieldErrors?.message ? "contact-message-error" : undefined}
        />
        <FieldError field="message" error={state.fieldErrors?.message} />
      </div>
      {state.error && (
        <p className="contact-error contact-error--summary" role="alert">
          {state.error}
        </p>
      )}
      <button className="contact-submit" type="submit" disabled={isPending}>
        {isPending ? "Envoi en cours…" : "Envoyer le message"}
      </button>
      <span className="sr-only" aria-live="polite">
        {isPending ? "Envoi du message en cours" : ""}
      </span>
    </form>
  );
}

"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { requestDeletionAction, type RequestDeletionState } from "../_actions/request-deletion";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { ModalShell } from "@cyberlearn/ui";
import "@/components/community-workspace.css";
import { useSettingsReload } from "../../_components/settings-reload";

interface Props {
  pendingExpiresAt: string | null;
  certificateCount: number;
}

const INITIAL_STATE: RequestDeletionState = {};

export function DeleteAccountSection({
  pendingExpiresAt,
  certificateCount,
}: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [state, formAction, pending] = useActionState(requestDeletionAction, INITIAL_STATE);
  const reloadSettings = useSettingsReload();

  // The drawer loaded its data once: it asks for it again, to show the
  // pending request.
  useEffect(() => {
    if (!state.success) return;
    setOpen(false);
    reloadSettings();
  }, [state.success, reloadSettings]);

  // The word typed to confirm does not survive a closed dialog.
  useEffect(() => {
    if (!open) setInputValue("");
  }, [open]);

  const minutesLeft = pendingExpiresAt
    ? Math.max(1, Math.ceil((new Date(pendingExpiresAt).getTime() - Date.now()) / 60_000))
    : null;

  const isPending = pendingExpiresAt !== null;
  const isConfirmed = inputValue === "SUPPRIMER";

  const modal = (
    <ModalShell
      open={open}
      onClose={() => {
        setOpen(false);
      }}
      eyebrow="// RGPD · ART. 17 · ACTION IRRÉVERSIBLE"
      title="Suppression définitive du compte"
      className="community-dialog account-delete-dialog"
      maxWidth={520}
    >
      <div className="account-delete-dialog__content">
        {/* Description */}
        <p
          style={{
            margin: "0 0 14px",
            color: "var(--color-text-primary)",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          Cette action est{" "}
          <span style={{ color: "var(--color-danger)", fontWeight: 700 }}>irréversible</span>. Les
          éléments suivants seront supprimés ou anonymisés :
        </p>

        <ul
          style={{
            paddingLeft: 0,
            margin: "0 0 14px",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            listStyle: "none",
          }}
        >
          {[
            "Tes données personnelles (profil, préférences, progression)",
            "Tes contributions Q&A et notes (anonymisées)",
            "Tes logs d'audit (pseudonymisés)",
            "Tu seras immédiatement déconnecté·e",
          ].map((item) => (
            <li
              key={item}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--color-text-muted)",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <span style={{ color: "var(--color-danger)", flexShrink: 0 }}>·</span>
              {item}
            </li>
          ))}
          <li
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--color-text-muted)",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ color: "var(--cosmetic-accent)", flexShrink: 0 }}>·</span>
            Tes certificats restent vérifiables publiquement, mais ne portent plus ton nom
          </li>
        </ul>

        {certificateCount > 0 && (
          <div
            style={{
              padding: "10px 14px",
              background: "color-mix(in srgb, var(--cosmetic-accent) 4%, transparent)",
              border: "1px solid color-mix(in srgb, var(--cosmetic-accent) 15%, transparent)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "var(--cosmetic-accent)",
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <span>
              Tu as{" "}
              <b>
                {certificateCount} certificat{certificateCount > 1 ? "s" : ""}
              </b>
              . Télécharge-les avant la suppression.
            </span>
            <Link
              href="/certificates"
              onClick={() => {
                setOpen(false);
              }}
              style={{ color: "var(--color-info)", textDecoration: "none", fontSize: 11 }}
            >
              ▶ Voir mes certificats →
            </Link>
          </div>
        )}

        <label
          className="mono-label"
          htmlFor="delete-confirm-input"
          style={{
            display: "block",
            color: "var(--color-text-muted)",
            marginBottom: 6,
          }}
        >
          Pour confirmer, tape{" "}
          <b style={{ color: "var(--color-danger)", letterSpacing: "0.12em" }}>SUPPRIMER</b>
        </label>
        <input
          id="delete-confirm-input"
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
          }}
          autoComplete="off"
          spellCheck={false}
          placeholder="SUPPRIMER"
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "var(--color-bg-sunken)",
            border: `1px solid ${isConfirmed ? "var(--color-danger)" : "var(--color-border-default)"}`,
            color: "var(--color-text-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            letterSpacing: "0.08em",
            outline: "none",
            boxSizing: "border-box",
          }}
        />

        {state.error && (
          <p
            role="alert"
            style={{
              marginTop: 8,
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--color-danger)",
              letterSpacing: "0.04em",
            }}
          >
            {state.error}
          </p>
        )}

        <form action={formAction}>
          <input type="hidden" name="confirmation" value={inputValue} />
          <div
            className="account-delete-dialog__actions"
            style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}
          >
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              onClick={() => {
                setOpen(false);
              }}
            >
              Annuler
            </button>
            <button
              className="mono-label mono-label--md account-delete-confirm"
              type="submit"
              disabled={!isConfirmed || pending}
              style={{
                padding: "8px 20px",
                fontWeight: 700,
                background: isConfirmed && !pending ? "var(--color-danger)" : "transparent",
                border: `1px solid ${isConfirmed && !pending ? "var(--color-danger)" : "#2A1B1B"}`,
                color: isConfirmed && !pending ? "#ffffff" : "var(--color-text-disabled)",
                cursor: isConfirmed && !pending ? "pointer" : "not-allowed",
                transition: "all 150ms ease",
              }}
            >
              {pending ? "Envoi..." : "Envoyer la demande"}
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );

  return (
    <>
      <SettingsCard
        title="Supprimer mon compte"
        variant="danger"
        desc="La suppression efface ou anonymise les données associées à ton compte. Tu recevras un lien par e-mail pour la confirmer."
      >
        {isPending ? (
          <div className="settings-data-pending" role="status">
            <strong>Demande en cours</strong>
            <p>
              E-mail envoyé : regarde ta boîte de réception. Le lien reste valide pendant{" "}
              {minutesLeft} min.
            </p>
          </div>
        ) : (
          <>
            <p className="settings-data-meta">
              Article 17 RGPD · confirmation par e-mail · 3 demandes par 24 h
            </p>
            <button
              className="settings-button settings-button--danger"
              type="button"
              onClick={() => {
                setOpen(true);
              }}
            >
              Demander la suppression
            </button>
          </>
        )}
      </SettingsCard>
      {modal}
    </>
  );
}

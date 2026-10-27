"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { profileTabHref } from "@cyberlearn/lib/social/profile-tabs";
import { requestDeletionAction, type RequestDeletionState } from "../_actions/request-deletion";
import { SettingsCard } from "../../_components/SettingsPrimitives";
import { ModalShell } from "@cyberlearn/ui";
import "@/components/community-workspace.css";
import { useSettingsDrawer } from "../../_components/SettingsDrawer";
import { useSettingsReload } from "../../_components/settings-reload";

interface Props {
  pendingExpiresAt: string | null;
  certificateCount: number;
}

const INITIAL_STATE: RequestDeletionState = {};

/** Bastion's danger: what this dialog destroys, and the button that does it. */
const DANGER = "var(--color-state-danger)";

const ITEM: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.5,
  color: "#c2bfb8",
  display: "flex",
  gap: 10,
  alignItems: "baseline",
};

/** A square list mark, like every Bastion mark. */
const MARK: React.CSSProperties = {
  width: 6,
  height: 6,
  flexShrink: 0,
  transform: "translateY(-2px)",
};

export function DeleteAccountSection({
  pendingExpiresAt,
  certificateCount,
}: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [state, formAction, pending] = useActionState(requestDeletionAction, INITIAL_STATE);
  const reloadSettings = useSettingsReload();
  const drawer = useSettingsDrawer();

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
      eyebrow="RGPD, article 17 · action irréversible"
      title="Suppression définitive du compte"
      className="community-dialog account-delete-dialog"
      maxWidth={520}
    >
      <div className="account-delete-dialog__content">
        {/* Description */}
        <p
          style={{
            margin: "0 0 14px",
            color: "#f4f2ed",
            fontWeight: 500,
            fontSize: 14,
          }}
        >
          Cette action est <span style={{ color: DANGER, fontWeight: 700 }}>irréversible</span>. Les
          éléments suivants seront supprimés ou anonymisés :
        </p>

        <ul
          style={{
            paddingLeft: 0,
            margin: "0 0 14px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            listStyle: "none",
          }}
        >
          {[
            "Tes données personnelles (profil, préférences, progression)",
            "Tes contributions Q&A et notes (anonymisées)",
            "Tes logs d'audit (pseudonymisés)",
            "Tu seras immédiatement déconnecté·e",
          ].map((item) => (
            <li key={item} style={ITEM}>
              <span aria-hidden="true" style={{ ...MARK, background: DANGER }} />
              {item}
            </li>
          ))}
          <li style={ITEM}>
            <span aria-hidden="true" style={{ ...MARK, background: "#aaa79f" }} />
            Tes certificats restent vérifiables publiquement, mais ne portent plus ton nom
          </li>
        </ul>

        {certificateCount > 0 && (
          <div
            style={{
              padding: "12px 14px",
              background: "#121418",
              border: "1px solid #74767d",
              fontSize: 13,
              lineHeight: 1.5,
              color: "#c2bfb8",
              marginBottom: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <span>
              Tu as{" "}
              <b style={{ color: "#f4f2ed" }}>
                {certificateCount} certificat{certificateCount > 1 ? "s" : ""}
              </b>
              . Télécharge-les avant la suppression.
            </span>
            <Link
              href={profileTabHref("certificats")}
              onClick={() => {
                setOpen(false);
                // Opened over the profile, the drawer would stay: the
                // pathname does not change, only the tab under it.
                drawer?.leave();
              }}
              style={{
                width: "fit-content",
                color: "var(--cosmetic-accent-hover)",
                textDecoration: "underline",
                textUnderlineOffset: 3,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Voir mes certificats →
            </Link>
          </div>
        )}

        <label
          className="mono-label"
          htmlFor="delete-confirm-input"
          style={{
            display: "block",
            color: "#c2bfb8",
            marginBottom: 6,
          }}
        >
          Pour confirmer, tape <b style={{ color: DANGER }}>SUPPRIMER</b>
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
            minHeight: 44,
            padding: "8px 12px",
            background: "#0b0c0e",
            border: `1px solid ${isConfirmed ? DANGER : "#74767d"}`,
            color: "#f4f2ed",
            fontSize: 14,
            boxSizing: "border-box",
          }}
        />

        {state.error && (
          <p
            role="alert"
            style={{
              marginTop: 8,
              fontSize: 13,
              color: DANGER,
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
                minHeight: 44,
                padding: "8px 20px",
                fontWeight: 700,
                background: isConfirmed && !pending ? DANGER : "transparent",
                border: `1px solid ${isConfirmed && !pending ? DANGER : "#303137"}`,
                color: isConfirmed && !pending ? "#141518" : "#aaa79f",
                cursor: isConfirmed && !pending ? "pointer" : "not-allowed",
                transition: "background-color 150ms ease, border-color 150ms ease",
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

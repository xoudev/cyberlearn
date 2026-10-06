"use client";

import React, { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { requestDeletionAction, type RequestDeletionState } from "../_actions/request-deletion";
import { CornerBrackets } from "@/app/_components/corner-brackets";
import { ModalShell } from "@/components/modal-shell";
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
      maxWidth={520}
    >
      <div style={{ padding: 24 }}>
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
            "Vos données personnelles (profil, préférences, progression)",
            "Vos contributions Q&A et notes (anonymisées)",
            "Vos logs d'audit (pseudonymisés)",
            "Vous serez immédiatement déconnecté",
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
            Vos certificats restent vérifiables publiquement, mais ne portent plus votre nom
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
              Vous avez{" "}
              <b>
                {certificateCount} certificat{certificateCount > 1 ? "s" : ""}
              </b>
              . Téléchargez-les avant la suppression.
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
          Pour confirmer, tapez{" "}
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
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
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
              className="mono-label mono-label--md"
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
      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          background: "rgba(5,4,26,0.6)",
          border: isPending ? "1px solid #2A1B1B" : "1px solid var(--color-border-subtle)",
          padding: "18px 20px",
        }}
      >
        <CornerBrackets
          size={20}
          color={isPending ? "var(--color-danger)" : "var(--color-border-default)"}
        />

        {/* Eyebrow */}
        <div
          className="mono-label"
          style={{
            color: "var(--color-text-muted)",
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 16,
              height: 1,
              background: isPending ? "var(--color-danger)" : "var(--color-text-disabled)",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          Effacement
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              color: isPending ? "var(--color-danger)" : "var(--color-text-disabled)",
              letterSpacing: "0.18em",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: isPending ? "var(--color-danger)" : "transparent",
                border: isPending ? "none" : "1px solid var(--color-text-disabled)",
                boxShadow: isPending ? "0 0 6px #FF475788" : "none",
              }}
            />
            {isPending ? "EN ATTENTE" : "ACTIF"}
          </span>
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: "-0.02em",
            color: "var(--color-text-primary)",
            margin: "0 0 10px",
          }}
        >
          Article 17 RGPD
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: 14,
            color: "var(--color-text-secondary)",
            lineHeight: "1.6",
            margin: "0 0 12px",
          }}
        >
          Conformément à l&apos;article 17 du RGPD (droit à l&apos;effacement), vous pouvez
          supprimer votre compte et toutes les données associées de manière permanente.
        </p>

        {/* Info / status row */}
        <div
          className="mono-label"
          style={{
            paddingTop: 12,
            borderTop: "1px dashed var(--color-border-subtle)",
            color: "var(--color-text-muted)",
            marginBottom: 18,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "4px 8px",
          }}
        >
          {isPending ? (
            <>
              <span style={{ color: "var(--color-danger)" }}>
                Email envoyé · vérifiez votre boite de réception
              </span>
              <span style={{ color: "var(--color-border-subtle)" }}>·</span>
              <span>
                Lien valide encore{" "}
                <b style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>
                  {minutesLeft}min
                </b>
              </span>
            </>
          ) : (
            <>
              <span>Limite</span>
              <b style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>3/24H</b>
              <span style={{ color: "var(--color-border-subtle)" }}>·</span>
              <span>Confirmation</span>
              <b style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>Email</b>
              <span style={{ color: "var(--color-border-subtle)" }}>·</span>
              <span>Effet</span>
              <b style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>Immédiat</b>
            </>
          )}
        </div>

        {/* CTA */}
        {isPending ? (
          <div
            className="mono-label mono-label--md"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              fontWeight: 600,
              border: "1px solid #2A1B1B",
              color: "var(--color-text-muted)",
              cursor: "default",
            }}
          >
            <span style={{ color: "#FF475750" }}>&#9656;</span>
            Demande en cours
          </div>
        ) : (
          <button
            className="mono-label mono-label--md"
            type="button"
            onClick={() => {
              setOpen(true);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              fontWeight: 600,
              background: "transparent",
              border: "1px solid #FF475788",
              color: "var(--color-text-primary)",
              cursor: "pointer",
            }}
          >
            <span style={{ color: "var(--color-danger)" }}>&#9656;</span>
            Demander la suppression
          </button>
        )}
      </div>

      {modal}
    </>
  );
}

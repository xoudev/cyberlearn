"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { requestDeletionAction, type RequestDeletionState } from "../_actions/request-deletion";
import { BracketCorners } from "../../_components/BracketCorners";

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
  const [mounted, setMounted] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (state.success) setOpen(false);
  }, [state.success]);

  // ESC closes the modal
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Focus the modal container on open for keyboard/screen-reader access
  useEffect(() => {
    if (open) modalRef.current?.focus();
    else setInputValue("");
  }, [open]);

  const minutesLeft = pendingExpiresAt
    ? Math.max(1, Math.ceil((new Date(pendingExpiresAt).getTime() - Date.now()) / 60_000))
    : null;

  const isPending = pendingExpiresAt !== null;
  const isConfirmed = inputValue === "SUPPRIMER";

  const modal = (
    <>
      {/* Overlay - click to close */}
      <div
        aria-hidden="true"
        onClick={() => {
          setOpen(false);
        }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.65)",
          zIndex: 9998,
        }}
      />

      {/* Modal panel */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        tabIndex={-1}
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          width: "calc(100vw - 32px)",
          maxWidth: 520,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          background: "#0A0826",
          border: "1px solid #2A2560",
          padding: "24px",
          outline: "none",
        }}
      >
        {/* Section header */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "#3F3D5C",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          {"// RGPD · ART. 17 · ACTION IRRÉVERSIBLE"}
          <span
            aria-hidden="true"
            style={{ flex: 1, height: 1, background: "#1F1B47", display: "inline-block" }}
          />
          {/* Close button */}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
            }}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "none",
              color: "#3F3D5C",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              lineHeight: 1,
              padding: "2px 4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <h2
          id="delete-dialog-title"
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 18,
            color: "#F5F5FA",
            letterSpacing: "-0.02em",
            margin: "0 0 20px",
          }}
        >
          Suppression définitive du compte
        </h2>

        {/* Description */}
        <p style={{ margin: "0 0 14px", color: "#F5F5FA", fontWeight: 500, fontSize: 14 }}>
          Cette action est <span style={{ color: "#FF4757", fontWeight: 700 }}>irréversible</span>.
          Les éléments suivants seront supprimés ou anonymisés :
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
                color: "#6B6890",
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
              }}
            >
              <span style={{ color: "#FF4757", flexShrink: 0 }}>·</span>
              {item}
            </li>
          ))}
          <li
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#6B6890",
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <span style={{ color: "#0AFFD4", flexShrink: 0 }}>·</span>
            Vos certificats restent vérifiables publiquement, mais ne portent plus votre nom
          </li>
        </ul>

        {certificateCount > 0 && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(10,255,212,0.04)",
              border: "1px solid rgba(10,255,212,0.15)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#0AFFD4",
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
              href="/certifs"
              onClick={() => {
                setOpen(false);
              }}
              style={{ color: "#4D8BFF", textDecoration: "none", fontSize: 11 }}
            >
              ▶ Voir mes certificats →
            </Link>
          </div>
        )}

        <label
          htmlFor="delete-confirm-input"
          style={{
            display: "block",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.08em",
            color: "#6B6890",
            marginBottom: 6,
            textTransform: "uppercase",
          }}
        >
          Pour confirmer, tapez{" "}
          <b style={{ color: "#FF4757", letterSpacing: "0.12em" }}>SUPPRIMER</b>
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
            background: "#05041A",
            border: `1px solid ${isConfirmed ? "#FF4757" : "#2A2560"}`,
            color: "#F5F5FA",
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
              color: "#FF4757",
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
              type="button"
              onClick={() => {
                setOpen(false);
              }}
              style={{
                padding: "8px 20px",
                fontFamily: "var(--font-mono)",
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: "transparent",
                border: "1px solid #2A2560",
                color: "#6B6890",
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || pending}
              style={{
                padding: "8px 20px",
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                background: isConfirmed && !pending ? "#FF4757" : "transparent",
                border: `1px solid ${isConfirmed && !pending ? "#FF4757" : "#2A1B1B"}`,
                color: isConfirmed && !pending ? "#ffffff" : "#3F3D5C",
                cursor: isConfirmed && !pending ? "pointer" : "not-allowed",
                transition: "all 150ms ease",
              }}
            >
              {pending ? "Envoi..." : "Envoyer la demande"}
            </button>
          </div>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* ── Card ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "relative",
          background: "rgba(5,4,26,0.6)",
          border: isPending ? "1px solid #2A1B1B" : "1px solid #1F1B47",
          padding: "18px 20px",
        }}
      >
        <BracketCorners color={isPending ? "#FF4757" : "#2A2560"} />

        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#3F3D5C",
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
              background: isPending ? "#FF4757" : "#3F3D5C",
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
              color: isPending ? "#FF4757" : "#3F3D5C",
              letterSpacing: "0.18em",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: isPending ? "#FF4757" : "transparent",
                border: isPending ? "none" : "1px solid #3F3D5C",
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
            color: "#F5F5FA",
            margin: "0 0 10px",
          }}
        >
          Article 17 RGPD
        </h2>

        {/* Description */}
        <p
          style={{
            fontSize: 14,
            color: "#B8B5D1",
            lineHeight: "1.6",
            margin: "0 0 12px",
          }}
        >
          Conformément à l&apos;article 17 du RGPD (droit à l&apos;effacement), vous pouvez
          supprimer votre compte et toutes les données associées de manière permanente.
        </p>

        {/* Info / status row */}
        <div
          style={{
            paddingTop: 12,
            borderTop: "1px dashed #1F1B47",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#3F3D5C",
            marginBottom: 18,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "4px 8px",
          }}
        >
          {isPending ? (
            <>
              <span style={{ color: "#FF4757" }}>
                Email envoyé · vérifiez votre boite de réception
              </span>
              <span style={{ color: "#1F1B47" }}>·</span>
              <span>
                Lien valide encore{" "}
                <b style={{ color: "#B8B5D1", fontWeight: 500 }}>{minutesLeft}min</b>
              </span>
            </>
          ) : (
            <>
              <span>Limite</span>
              <b style={{ color: "#B8B5D1", fontWeight: 500 }}>3/24H</b>
              <span style={{ color: "#1F1B47" }}>·</span>
              <span>Confirmation</span>
              <b style={{ color: "#B8B5D1", fontWeight: 500 }}>Email</b>
              <span style={{ color: "#1F1B47" }}>·</span>
              <span>Effet</span>
              <b style={{ color: "#B8B5D1", fontWeight: 500 }}>Immédiat</b>
            </>
          )}
        </div>

        {/* CTA */}
        {isPending ? (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              border: "1px solid #2A1B1B",
              color: "#6B6890",
              cursor: "default",
            }}
          >
            <span style={{ color: "#FF475750" }}>&#9656;</span>
            Demande en cours
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 20px",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 13,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid #FF475788",
              color: "#F5F5FA",
              cursor: "pointer",
            }}
          >
            <span style={{ color: "#FF4757" }}>&#9656;</span>
            Demander la suppression
          </button>
        )}
      </div>

      {/* ── Portal modal - rendered directly into document.body ───────────── */}
      {mounted && open && createPortal(modal, document.body)}
    </>
  );
}

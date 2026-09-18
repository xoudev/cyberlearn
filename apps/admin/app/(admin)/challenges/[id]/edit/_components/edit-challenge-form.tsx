"use client";

// "use client" justified: useActionState, bound action, controlled type field, delete confirmation

import React, { useActionState, useState, useOptimistic, useTransition } from "react";
import {
  updateChallengeAction,
  setChallengeActiveAction,
  deleteChallengeAction,
} from "../../../_actions/challenge-admin-actions";
import type { ChallengeFormState } from "../../../_actions/challenge-admin-actions";
import type { ChallengeOption } from "../../../new/_components/new-challenge-form";
import { Select } from "@cyberlearn/ui";

interface ChallengeData {
  id: string;
  refCode: string;
  slug: string;
  title: string;
  description: string;
  instructions: string;
  category: "CYBERSEC" | "DEV" | "NETWORK";
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  type: "CTF" | "PUZZLE" | "LAB" | "SCRIPT";
  xpReward: number;
  timeLimitMin: number;
  maxAttempts: number;
  flag: string | null;
  starterCode: string | null;
  isActive: boolean;
  orderIndex: number;
  prerequisiteId: string | null;
  attachmentUrl: string | null;
  resourceUrl: string | null;
  solveCount: number;
}

interface Props {
  challenge: ChallengeData;
  prerequisites: ChallengeOption[];
}

const INITIAL: ChallengeFormState = {};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "#060420",
  border: "1px solid #2A2560",
  color: "#F5F5FA",
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "#6B6890",
  marginBottom: 6,
};

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string | undefined;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <label htmlFor={name} style={labelStyle}>
        {label}
      </label>
      {children}
      {error !== undefined && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#FF4D6D", marginTop: 4 }}>
          {error}
        </p>
      )}
    </div>
  );
}

export function EditChallengeForm({ challenge, prerequisites }: Props): React.ReactElement {
  const boundUpdate = updateChallengeAction.bind(null, challenge.id);
  const [state, action, pending] = useActionState(boundUpdate, INITIAL);
  const [type, setType] = useState<"CTF" | "PUZZLE" | "LAB" | "SCRIPT">(challenge.type);
  const [deleteStep, setDeleteStep] = useState(0);
  const [togglePending, startToggle] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | undefined>();
  const [confirmedActive, setConfirmedActive] = useState(challenge.isActive);
  const [optimisticActive, setOptimisticActive] = useOptimistic(confirmedActive);
  const fe = state.fieldErrors ?? {};

  function handleToggleActive(): void {
    const next = !optimisticActive;
    startToggle(async () => {
      setOptimisticActive(next);
      const res = await setChallengeActiveAction(challenge.id, next);
      if (!res.error) setConfirmedActive(next);
    });
  }

  function handleDelete(): void {
    if (deleteStep === 0) {
      setDeleteStep(1);
      return;
    }
    startDelete(async () => {
      const result = await deleteChallengeAction(challenge.id);
      if (result.error !== undefined) {
        setDeleteError(result.error);
        setDeleteStep(0);
      }
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      {/* Stats bar */}
      <div
        style={{
          display: "flex",
          gap: 32,
          padding: "16px 20px",
          background: "rgba(10,255,212,0.03)",
          border: "1px solid rgba(10,255,212,0.12)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#6B6890",
              marginBottom: 2,
            }}
          >
            RÉSOLUS
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 20,
              color: "#0AFFD4",
            }}
          >
            {challenge.solveCount}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#6B6890",
              marginBottom: 2,
            }}
          >
            XP
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 20,
              color: "#F5F5FA",
            }}
          >
            {challenge.xpReward}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#6B6890",
              marginBottom: 2,
            }}
          >
            STATUT
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 13,
              color: optimisticActive ? "#0AFFD4" : "#6B6890",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: optimisticActive ? "#0AFFD4" : "#6B6890",
                display: "inline-block",
                boxShadow: optimisticActive ? "0 0 6px rgba(10,255,212,0.5)" : "none",
              }}
            />
            {optimisticActive ? "ACTIF" : "INACTIF"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <button
            type="button"
            disabled={togglePending}
            onClick={handleToggleActive}
            style={{
              padding: "7px 16px",
              background: "transparent",
              border: `1px solid ${optimisticActive ? "rgba(255,77,109,0.4)" : "rgba(10,255,212,0.3)"}`,
              color: optimisticActive ? "#FF4D6D" : "#0AFFD4",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: togglePending ? "not-allowed" : "pointer",
              opacity: togglePending ? 0.5 : 1,
            }}
          >
            {optimisticActive ? "Désactiver" : "Activer"}
          </button>
        </div>
      </div>

      {/* Edit form */}
      <form action={action} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {state.error !== undefined && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(255,77,109,0.08)",
              border: "1px solid rgba(255,77,109,0.3)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#FF4D6D",
            }}
          >
            {state.error}
          </div>
        )}
        {Object.keys(fe).length === 0 && state.error === undefined && state !== INITIAL && (
          <div
            style={{
              padding: "12px 16px",
              background: "rgba(10,255,212,0.06)",
              border: "1px solid rgba(10,255,212,0.2)",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              color: "#0AFFD4",
            }}
          >
            Modifications enregistrées.
          </div>
        )}

        <section>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#6B6890",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: "1px solid #1F1B47",
            }}
          >
            {"// IDENTIFICATION"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Code de référence *" name="refCode" error={fe.refCode}>
              <input
                id="refCode"
                name="refCode"
                required
                style={inputStyle}
                defaultValue={challenge.refCode}
              />
            </Field>
            <Field label="Slug *" name="slug" error={fe.slug}>
              <input
                id="slug"
                name="slug"
                required
                style={inputStyle}
                defaultValue={challenge.slug}
              />
            </Field>
          </div>
        </section>

        <section>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#6B6890",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: "1px solid #1F1B47",
            }}
          >
            {"// CONTENU"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Titre *" name="title" error={fe.title}>
              <input
                id="title"
                name="title"
                required
                style={inputStyle}
                maxLength={200}
                defaultValue={challenge.title}
              />
            </Field>
            <Field label="Description courte *" name="description" error={fe.description}>
              <textarea
                id="description"
                name="description"
                required
                rows={3}
                maxLength={1000}
                style={{ ...inputStyle, resize: "vertical" }}
                defaultValue={challenge.description}
              />
            </Field>
            <Field label="Instructions (Markdown) *" name="instructions" error={fe.instructions}>
              <textarea
                id="instructions"
                name="instructions"
                required
                rows={10}
                style={{ ...inputStyle, resize: "vertical" }}
                defaultValue={challenge.instructions}
              />
            </Field>
          </div>
        </section>

        <section>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#6B6890",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: "1px solid #1F1B47",
            }}
          >
            {"// CLASSIFICATION"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Field label="Catégorie *" name="category" error={fe.category}>
              <Select
                name="category"
                required
                defaultValue={challenge.category}
                id="category"
                options={[
                  { value: "CYBERSEC", label: "CYBERSEC" },
                  { value: "DEV", label: "DEV" },
                  { value: "NETWORK", label: "RÉSEAU" },
                ]}
              />
            </Field>
            <Field label="Difficulté *" name="difficulty" error={fe.difficulty}>
              <Select
                name="difficulty"
                required
                defaultValue={challenge.difficulty}
                id="difficulty"
                options={[
                  { value: "BEGINNER", label: "Facile" },
                  { value: "INTERMEDIATE", label: "Intermédiaire" },
                  { value: "ADVANCED", label: "Avancé" },
                  { value: "EXPERT", label: "Expert" },
                ]}
              />
            </Field>
            <Field label="Type *" name="type" error={fe.type}>
              <Select
                name="type"
                required
                value={type}
                onChange={(next) => {
                  setType(next as typeof type);
                }}
                id="type"
                options={[
                  { value: "CTF", label: "CTF" },
                  { value: "SCRIPT", label: "SCRIPT (Python)" },
                  { value: "PUZZLE", label: "PUZZLE" },
                  { value: "LAB", label: "LAB" },
                ]}
              />
            </Field>
          </div>
        </section>

        <section>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "#6B6890",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: "1px solid #1F1B47",
            }}
          >
            {"// PARAMÈTRES"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
            <Field label="XP Récompense *" name="xpReward" error={fe.xpReward}>
              <input
                id="xpReward"
                name="xpReward"
                type="number"
                required
                min={1}
                max={10000}
                defaultValue={challenge.xpReward}
                style={inputStyle}
              />
            </Field>
            <Field label="Limite (min)" name="timeLimitMin" error={fe.timeLimitMin}>
              <input
                id="timeLimitMin"
                name="timeLimitMin"
                type="number"
                min={0}
                max={600}
                defaultValue={challenge.timeLimitMin}
                style={inputStyle}
              />
            </Field>
            <Field label="Max tentatives" name="maxAttempts" error={fe.maxAttempts}>
              <input
                id="maxAttempts"
                name="maxAttempts"
                type="number"
                min={1}
                max={100}
                defaultValue={challenge.maxAttempts}
                style={inputStyle}
              />
            </Field>
            <Field label="Ordre d&apos;affichage" name="orderIndex" error={fe.orderIndex}>
              <input
                id="orderIndex"
                name="orderIndex"
                type="number"
                min={0}
                defaultValue={challenge.orderIndex}
                style={inputStyle}
              />
            </Field>
          </div>

          {(type === "CTF" || type === "SCRIPT") && (
            <div style={{ marginTop: 16 }}>
              <Field
                label={type === "SCRIPT" ? "Flag (attendu en sortie)" : "Flag (CTF)"}
                name="flag"
                error={fe.flag}
              >
                <input
                  id="flag"
                  name="flag"
                  style={inputStyle}
                  defaultValue={challenge.flag ?? ""}
                  placeholder={type === "SCRIPT" ? "FLAG{valeur_calculee}" : "CTF{le_flag_secret}"}
                  autoComplete="off"
                />
              </Field>
            </div>
          )}

          {type === "SCRIPT" && (
            <div style={{ marginTop: 16 }}>
              <Field label="Code de départ (Python)" name="starterCode" error={fe.starterCode}>
                <textarea
                  id="starterCode"
                  name="starterCode"
                  rows={8}
                  style={{
                    ...inputStyle,
                    resize: "vertical",
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                  }}
                  defaultValue={challenge.starterCode ?? ""}
                />
              </Field>
            </div>
          )}

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="URL de connexion / cible" name="resourceUrl" error={fe.resourceUrl}>
              <input
                id="resourceUrl"
                name="resourceUrl"
                style={inputStyle}
                defaultValue={challenge.resourceUrl ?? ""}
                placeholder="http://10.0.0.1:8080 ou nc ctf.example.com 1337"
              />
            </Field>
            <Field label="URL pièce jointe" name="attachmentUrl" error={fe.attachmentUrl}>
              <input
                id="attachmentUrl"
                name="attachmentUrl"
                style={inputStyle}
                defaultValue={challenge.attachmentUrl ?? ""}
                placeholder="https://cdn.example.com/challenge.zip"
              />
            </Field>
          </div>

          <div style={{ marginTop: 16 }}>
            <Field label="Prérequis (optionnel)" name="prerequisiteId" error={fe.prerequisiteId}>
              <Select
                id="prerequisiteId"
                name="prerequisiteId"
                defaultValue={challenge.prerequisiteId ?? ""}
                options={[
                  { value: "", label: "Aucun prérequis" },
                  ...prerequisites
                    .filter((p) => p.id !== challenge.id)
                    .map((p) => ({ value: p.id, label: p.title, hint: p.refCode })),
                ]}
              />
            </Field>
          </div>
        </section>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 8 }}>
          <a
            href="/challenges"
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "9px 20px",
              border: "1px solid #2A2560",
              color: "#6B6890",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 11,
              letterSpacing: "0.12em",
              textDecoration: "none",
              textTransform: "uppercase",
            }}
          >
            Retour
          </a>
          <button
            type="submit"
            disabled={pending}
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "9px 24px",
              background: pending ? "#2A2560" : "#FF4D6D",
              color: "#fff",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              border: "none",
              cursor: pending ? "not-allowed" : "pointer",
            }}
          >
            {pending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div
        style={{
          padding: "20px 24px",
          border: "1px solid rgba(255,77,109,0.25)",
          background: "rgba(255,77,109,0.03)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "#FF4D6D",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          {"// ZONE DANGEREUSE"}
        </div>

        {challenge.solveCount > 0 && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#6B6890",
              margin: "0 0 12px",
            }}
          >
            Ce challenge a été résolu par {challenge.solveCount} utilisateur
            {challenge.solveCount > 1 ? "s" : ""} et ne peut pas être supprimé.
          </p>
        )}

        {deleteError !== undefined && (
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "#FF4D6D",
              margin: "0 0 12px",
            }}
          >
            {deleteError}
          </p>
        )}

        <button
          type="button"
          disabled={challenge.solveCount > 0 || deletePending}
          onClick={handleDelete}
          style={{
            padding: "7px 16px",
            background: "transparent",
            border: "1px solid rgba(255,77,109,0.4)",
            color: deleteStep === 1 ? "#fff" : "#FF4D6D",
            backgroundColor: deleteStep === 1 ? "#FF4D6D" : "transparent",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            cursor: challenge.solveCount > 0 || deletePending ? "not-allowed" : "pointer",
            opacity: challenge.solveCount > 0 ? 0.4 : 1,
          }}
        >
          {deletePending
            ? "Suppression..."
            : deleteStep === 1
              ? "Confirmer la suppression"
              : "Supprimer le challenge"}
        </button>
        {deleteStep === 1 && (
          <button
            type="button"
            onClick={() => {
              setDeleteStep(0);
            }}
            style={{
              marginLeft: 10,
              padding: "7px 16px",
              background: "transparent",
              border: "1px solid #2A2560",
              color: "#6B6890",
              fontFamily: "var(--font-mono)",
              fontWeight: 600,
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

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
import { Tag } from "../../../../_components/admin-ui";
import { keepFormInput } from "@/lib/form-input";
import { notifyResult } from "@/lib/notify";

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
  /** The machine as JSON text, "" when the challenge has none. */
  machine: string;
  starterCode: string | null;
  isActive: boolean;
  orderIndex: number;
  prerequisiteId: string | null;
  attachmentUrl: string | null;
  resourceUrl: string | null;
  solveCount: number;
}

/** What a machine looks like, in the field's placeholder. */
const MACHINE_PLACEHOLDER = `{
  "title": "Le serveur oublié",
  "files": {
    "logs/auth.log": "Oct  3 12:00:01 srv sshd[812]: Accepted password for admin\n",
    ".cache/.notes.txt": "{{FLAG}}"
  }
}`;

interface Props {
  challenge: ChallengeData;
  prerequisites: ChallengeOption[];
}

const INITIAL: ChallengeFormState = {};

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
    <div className="a-field">
      <label htmlFor={name} className="a-label">
        {label}
      </label>
      {children}
      {error !== undefined && (
        <p style={{ margin: 0, fontSize: 12, color: "var(--a-danger)" }}>{error}</p>
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
      // Same answer as the toggle in the list: a refusal used to be swallowed.
      const ok = notifyResult(res, {
        success: next ? "Challenge activé." : "Challenge désactivé.",
        error: "Le challenge n'a pas pu être modifié.",
      });
      if (ok) setConfirmedActive(next);
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
          background: "var(--a-surface)",
          border: "1px solid var(--a-border)",
        }}
      >
        <div>
          <div className="a-meta-label" style={{ marginBottom: 2 }}>
            Résolus
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 20,
              color: "var(--a-fg)",
            }}
          >
            {challenge.solveCount}
          </div>
        </div>
        <div>
          <div className="a-meta-label" style={{ marginBottom: 2 }}>
            XP
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 20,
              color: "var(--a-fg)",
            }}
          >
            {challenge.xpReward}
          </div>
        </div>
        <div>
          <div className="a-meta-label" style={{ marginBottom: 6 }}>
            Statut
          </div>
          <Tag tone={optimisticActive ? "success" : "neutral"}>
            {optimisticActive ? "Actif" : "Inactif"}
          </Tag>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center" }}>
          <button
            type="button"
            disabled={togglePending}
            onClick={handleToggleActive}
            className="a-btn a-btn--sm"
            style={{
              background: "transparent",
              border: `1px solid ${optimisticActive ? "var(--a-danger)" : "var(--a-success)"}`,
              color: optimisticActive ? "var(--a-danger)" : "var(--a-success)",
              cursor: togglePending ? "not-allowed" : "pointer",
              opacity: togglePending ? 0.5 : 1,
            }}
          >
            {optimisticActive ? "Désactiver" : "Activer"}
          </button>
        </div>
      </div>

      {/* Edit form */}
      <form
        action={action}
        onReset={keepFormInput}
        style={{ display: "flex", flexDirection: "column", gap: 24 }}
      >
        {state.error !== undefined && <p className="a-form-error">{state.error}</p>}
        {Object.keys(fe).length === 0 && state.error === undefined && state !== INITIAL && (
          <p
            className="a-form-notice"
            style={{
              borderLeftColor: "var(--a-success)",
              background: "color-mix(in srgb, var(--a-success) 7%, transparent)",
              color: "var(--a-success)",
            }}
          >
            Modifications enregistrées.
          </p>
        )}

        <section>
          <h2
            className="a-section-title"
            style={{
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: "1px solid var(--a-border)",
            }}
          >
            Identification
          </h2>
          <div className="a-fields-grid">
            <Field label="Code de référence *" name="refCode" error={fe.refCode}>
              <input
                id="refCode"
                name="refCode"
                required
                className="a-input"
                defaultValue={challenge.refCode}
              />
            </Field>
            <Field label="Slug *" name="slug" error={fe.slug}>
              <input
                id="slug"
                name="slug"
                required
                className="a-input"
                defaultValue={challenge.slug}
              />
            </Field>
          </div>
        </section>

        <section>
          <h2
            className="a-section-title"
            style={{
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: "1px solid var(--a-border)",
            }}
          >
            Contenu
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Field label="Titre *" name="title" error={fe.title}>
              <input
                id="title"
                name="title"
                required
                className="a-input"
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
                className="a-textarea"
                defaultValue={challenge.description}
              />
            </Field>
            <Field label="Instructions (Markdown) *" name="instructions" error={fe.instructions}>
              <textarea
                id="instructions"
                name="instructions"
                required
                rows={10}
                className="a-textarea"
                defaultValue={challenge.instructions}
              />
            </Field>
          </div>
        </section>

        <section>
          <h2
            className="a-section-title"
            style={{
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: "1px solid var(--a-border)",
            }}
          >
            Classification
          </h2>
          <div className="a-fields-grid a-fields-grid--3">
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
          <h2
            className="a-section-title"
            style={{
              marginBottom: 16,
              paddingBottom: 8,
              borderBottom: "1px solid var(--a-border)",
            }}
          >
            Paramètres
          </h2>
          <div className="a-fields-grid a-fields-grid--4">
            <Field label="XP Récompense *" name="xpReward" error={fe.xpReward}>
              <input
                id="xpReward"
                name="xpReward"
                type="number"
                required
                min={1}
                max={10000}
                defaultValue={challenge.xpReward}
                className="a-input"
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
                className="a-input"
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
                className="a-input"
              />
            </Field>
            <Field label="Ordre d&apos;affichage" name="orderIndex" error={fe.orderIndex}>
              <input
                id="orderIndex"
                name="orderIndex"
                type="number"
                min={0}
                defaultValue={challenge.orderIndex}
                className="a-input"
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
                  className="a-input"
                  defaultValue={challenge.flag ?? ""}
                  placeholder={type === "SCRIPT" ? "FLAG{valeur_calculee}" : "CTF{le_flag_secret}"}
                  autoComplete="off"
                />
              </Field>
            </div>
          )}

          {type === "CTF" && (
            <div style={{ marginTop: 16 }}>
              <Field label="Machine Linux (JSON, optionnelle)" name="machine" error={fe.machine}>
                <textarea
                  id="machine"
                  name="machine"
                  rows={10}
                  className="a-textarea"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                  defaultValue={challenge.machine}
                  placeholder={MACHINE_PLACEHOLDER}
                />
              </Field>
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--a-muted)" }}>
                Les fichiers placés dans /mnt de la machine du navigateur. Écris {"{{FLAG}}"} là où
                va le flag : chaque élève y reçoit le sien, et le champ Flag ne sert plus.
              </p>
            </div>
          )}

          {type === "SCRIPT" && (
            <div style={{ marginTop: 16 }}>
              <Field label="Code de départ (Python)" name="starterCode" error={fe.starterCode}>
                <textarea
                  id="starterCode"
                  name="starterCode"
                  rows={8}
                  className="a-textarea"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                  defaultValue={challenge.starterCode ?? ""}
                />
              </Field>
            </div>
          )}

          <div className="a-fields-grid" style={{ marginTop: 16 }}>
            <Field label="URL de connexion / cible" name="resourceUrl" error={fe.resourceUrl}>
              <input
                id="resourceUrl"
                name="resourceUrl"
                className="a-input"
                defaultValue={challenge.resourceUrl ?? ""}
                placeholder="http://10.0.0.1:8080 ou nc ctf.example.com 1337"
              />
            </Field>
            <Field label="URL pièce jointe" name="attachmentUrl" error={fe.attachmentUrl}>
              <input
                id="attachmentUrl"
                name="attachmentUrl"
                className="a-input"
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
          <a href="/challenges" className="a-btn a-btn--ghost">
            Retour
          </a>
          <button type="submit" disabled={pending} className="a-btn a-btn--primary">
            {pending ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div
        style={{
          padding: "20px 24px",
          border: "1px solid var(--a-danger)",
          background: "var(--a-surface)",
        }}
      >
        <h2 className="a-section-title" style={{ color: "var(--a-danger)", marginBottom: 12 }}>
          Zone dangereuse
        </h2>

        {challenge.solveCount > 0 && (
          <p className="a-field-hint" style={{ margin: "0 0 12px" }}>
            Ce challenge a été résolu par {challenge.solveCount} utilisateur
            {challenge.solveCount > 1 ? "s" : ""} et ne peut pas être supprimé.
          </p>
        )}

        {deleteError !== undefined && (
          <p style={{ fontSize: 12, color: "var(--a-danger)", margin: "0 0 12px" }}>
            {deleteError}
          </p>
        )}

        <button
          type="button"
          disabled={challenge.solveCount > 0 || deletePending}
          onClick={handleDelete}
          className="a-btn a-btn--danger a-btn--sm"
          style={{
            border: "1px solid var(--a-danger)",
            color: deleteStep === 1 ? "var(--a-ink)" : "var(--a-danger)",
            backgroundColor: deleteStep === 1 ? "var(--a-danger)" : "transparent",
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
            className="a-btn a-btn--ghost a-btn--sm"
            style={{ marginLeft: 10 }}
          >
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}

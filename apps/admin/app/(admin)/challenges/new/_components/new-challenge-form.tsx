"use client";

// "use client" justified: useActionState, controlled flag field visibility

import React, { useActionState, useState } from "react";
import { createChallengeAction } from "../../_actions/challenge-admin-actions";
import type { ChallengeFormState } from "../../_actions/challenge-admin-actions";
import { Select } from "@cyberlearn/ui";
import { keepFormInput } from "@/lib/form-input";

export interface ChallengeOption {
  id: string;
  refCode: string;
  title: string;
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

export function NewChallengeForm({ prerequisites }: Props): React.ReactElement {
  const [state, action, pending] = useActionState(createChallengeAction, INITIAL);
  const [type, setType] = useState<"CTF" | "PUZZLE" | "LAB" | "SCRIPT">("CTF");
  const fe = state.fieldErrors ?? {};

  return (
    <form
      action={action}
      onReset={keepFormInput}
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {state.error !== undefined && <p className="a-form-error">{state.error}</p>}

      {/* Identification */}
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
            <input id="refCode" name="refCode" required className="a-input" placeholder="CTF-001" />
          </Field>
          <Field label="Slug *" name="slug" error={fe.slug}>
            <input
              id="slug"
              name="slug"
              required
              className="a-input"
              placeholder="sql-injection-bypass"
            />
          </Field>
        </div>
      </section>

      {/* Content */}
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
            <input id="title" name="title" required className="a-input" maxLength={200} />
          </Field>
          <Field label="Description courte *" name="description" error={fe.description}>
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              maxLength={1000}
              className="a-textarea"
            />
          </Field>
          <Field label="Instructions (Markdown) *" name="instructions" error={fe.instructions}>
            <textarea
              id="instructions"
              name="instructions"
              required
              rows={10}
              className="a-textarea"
              style={{ fontFamily: "var(--font-mono)" }}
              placeholder="## Objectif&#10;&#10;Trouve le flag caché dans..."
            />
          </Field>
        </div>
      </section>

      {/* Classification */}
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

      {/* Parameters */}
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
              defaultValue={300}
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
              defaultValue={0}
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
              defaultValue={3}
              className="a-input"
            />
          </Field>
          <Field label="Ordre d&apos;affichage" name="orderIndex" error={fe.orderIndex}>
            <input
              id="orderIndex"
              name="orderIndex"
              type="number"
              min={0}
              defaultValue={0}
              className="a-input"
            />
          </Field>
        </div>

        {/* Flag - CTF and SCRIPT */}
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
                placeholder={MACHINE_PLACEHOLDER}
              />
            </Field>
            <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--a-muted)" }}>
              Les fichiers placés dans /mnt de la machine du navigateur. Écris {"{{FLAG}}"} là où va
              le flag : chaque élève y reçoit le sien, et le champ Flag ne sert plus.
            </p>
          </div>
        )}

        {/* Starter code - SCRIPT only */}
        {type === "SCRIPT" && (
          <div style={{ marginTop: 16 }}>
            <Field label="Code de départ (Python)" name="starterCode" error={fe.starterCode}>
              <textarea
                id="starterCode"
                name="starterCode"
                rows={8}
                className="a-textarea"
                style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
                placeholder={
                  "# Déchiffre le message et trouve le flag\nciphertext = 'Uryyb Jbeyq'\n\n# Ton code ici...\nprint('FLAG{...}')"
                }
              />
            </Field>
          </div>
        )}

        {/* Resource & attachment URLs */}
        <div className="a-fields-grid" style={{ marginTop: 16 }}>
          <Field label="URL de connexion / cible" name="resourceUrl" error={fe.resourceUrl}>
            <input
              id="resourceUrl"
              name="resourceUrl"
              className="a-input"
              placeholder="http://10.0.0.1:8080 ou nc ctf.example.com 1337"
            />
          </Field>
          <Field label="URL pièce jointe" name="attachmentUrl" error={fe.attachmentUrl}>
            <input
              id="attachmentUrl"
              name="attachmentUrl"
              className="a-input"
              placeholder="https://cdn.example.com/challenge.zip"
            />
          </Field>
        </div>

        {/* Prerequisite */}
        <div style={{ marginTop: 16 }}>
          <Field label="Prérequis (optionnel)" name="prerequisiteId" error={fe.prerequisiteId}>
            <Select
              id="prerequisiteId"
              name="prerequisiteId"
              defaultValue=""
              options={[
                { value: "", label: "Aucun prérequis" },
                ...prerequisites.map((p) => ({
                  value: p.id,
                  label: p.title,
                  hint: p.refCode,
                })),
              ]}
            />
          </Field>
        </div>
      </section>

      {/* Submit */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, paddingTop: 8 }}>
        <a href="/challenges" className="a-btn a-btn--ghost">
          Annuler
        </a>
        <button type="submit" disabled={pending} className="a-btn a-btn--primary">
          {pending ? "Création..." : "Créer le challenge"}
        </button>
      </div>
    </form>
  );
}

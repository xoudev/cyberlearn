"use client";

// "use client" justified: useActionState, controlled flag field visibility

import React, { useActionState, useState } from "react";
import { createChallengeAction } from "../../_actions/challenge-admin-actions";
import type { ChallengeFormState } from "../../_actions/challenge-admin-actions";
import { Select } from "@cyberlearn/ui";

export interface ChallengeOption {
  id: string;
  refCode: string;
  title: string;
}

interface Props {
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

export function NewChallengeForm({ prerequisites }: Props): React.ReactElement {
  const [state, action, pending] = useActionState(createChallengeAction, INITIAL);
  const [type, setType] = useState<"CTF" | "PUZZLE" | "LAB" | "SCRIPT">("CTF");
  const fe = state.fieldErrors ?? {};

  return (
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

      {/* Identification */}
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
            <input id="refCode" name="refCode" required style={inputStyle} placeholder="CTF-001" />
          </Field>
          <Field label="Slug *" name="slug" error={fe.slug}>
            <input
              id="slug"
              name="slug"
              required
              style={inputStyle}
              placeholder="sql-injection-bypass"
            />
          </Field>
        </div>
      </section>

      {/* Content */}
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
            <input id="title" name="title" required style={inputStyle} maxLength={200} />
          </Field>
          <Field label="Description courte *" name="description" error={fe.description}>
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              maxLength={1000}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </Field>
          <Field label="Instructions (Markdown) *" name="instructions" error={fe.instructions}>
            <textarea
              id="instructions"
              name="instructions"
              required
              rows={10}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "var(--font-mono)" }}
              placeholder="## Objectif&#10;&#10;Trouve le flag caché dans..."
            />
          </Field>
        </div>
      </section>

      {/* Classification */}
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
              defaultValue={300}
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
              defaultValue={0}
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
              defaultValue={3}
              style={inputStyle}
            />
          </Field>
          <Field label="Ordre d&apos;affichage" name="orderIndex" error={fe.orderIndex}>
            <input
              id="orderIndex"
              name="orderIndex"
              type="number"
              min={0}
              defaultValue={0}
              style={inputStyle}
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
                style={inputStyle}
                placeholder={type === "SCRIPT" ? "FLAG{valeur_calculee}" : "CTF{le_flag_secret}"}
                autoComplete="off"
              />
            </Field>
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
                style={{
                  ...inputStyle,
                  resize: "vertical",
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                }}
                placeholder={
                  "# Déchiffre le message et trouve le flag\nciphertext = 'Uryyb Jbeyq'\n\n# Ton code ici...\nprint('FLAG{...}')"
                }
              />
            </Field>
          </div>
        )}

        {/* Resource & attachment URLs */}
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="URL de connexion / cible" name="resourceUrl" error={fe.resourceUrl}>
            <input
              id="resourceUrl"
              name="resourceUrl"
              style={inputStyle}
              placeholder="http://10.0.0.1:8080 ou nc ctf.example.com 1337"
            />
          </Field>
          <Field label="URL pièce jointe" name="attachmentUrl" error={fe.attachmentUrl}>
            <input
              id="attachmentUrl"
              name="attachmentUrl"
              style={inputStyle}
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
          Annuler
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
          {pending ? "Création..." : "Créer le challenge"}
        </button>
      </div>
    </form>
  );
}

"use client";

// "use client" justified: inline edit state, useTransition for hint mutations, router.refresh()

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createHintAction,
  updateHintAction,
  deleteHintAction,
} from "../../../_actions/challenge-admin-actions";

interface Hint {
  id: string;
  orderIndex: number;
  content: string;
  xpCost: number;
}

interface Props {
  challengeId: string;
  hints: Hint[];
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
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
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#7F7BA9",
  marginBottom: 4,
};

export function HintsManager({ challengeId, hints }: Props): React.ReactElement {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editXpCost, setEditXpCost] = useState(0);
  const [addingNew, setAddingNew] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newXpCost, setNewXpCost] = useState(0);
  const [newOrderIndex, setNewOrderIndex] = useState(hints.length);
  const [opError, setOpError] = useState<string | undefined>();
  const [savePending, startSave] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [createPending, startCreate] = useTransition();

  function startEdit(hint: Hint): void {
    setEditingId(hint.id);
    setEditContent(hint.content);
    setEditXpCost(hint.xpCost);
    setOpError(undefined);
  }

  function cancelEdit(): void {
    setEditingId(null);
    setOpError(undefined);
  }

  function handleSave(hintId: string): void {
    startSave(async () => {
      const result = await updateHintAction(hintId, editContent, editXpCost);
      if (result.error !== undefined) {
        setOpError(result.error);
        return;
      }
      setEditingId(null);
      router.refresh();
    });
  }

  function handleDelete(hintId: string): void {
    startDelete(async () => {
      const result = await deleteHintAction(hintId);
      if (result.error !== undefined) {
        setOpError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleCreate(): void {
    if (!newContent.trim()) {
      setOpError("Le contenu de l'indice est requis.");
      return;
    }
    startCreate(async () => {
      const result = await createHintAction(
        challengeId,
        newContent.trim(),
        newXpCost,
        newOrderIndex,
      );
      if (result.error !== undefined) {
        setOpError(result.error);
        return;
      }
      setAddingNew(false);
      setNewContent("");
      setNewXpCost(0);
      setNewOrderIndex(hints.length + 1);
      setOpError(undefined);
      router.refresh();
    });
  }

  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "#7F7BA9",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid #1F1B47",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{"// INDICES"}</span>
        <span style={{ color: "#7F7BA9", fontSize: 9 }}>
          {String(hints.length)} indice{hints.length !== 1 ? "s" : ""}
        </span>
      </div>

      {opError !== undefined && (
        <div
          style={{
            padding: "10px 14px",
            background: "rgba(255,77,109,0.08)",
            border: "1px solid rgba(255,77,109,0.3)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#FF4D6D",
            marginBottom: 12,
          }}
        >
          {opError}
        </div>
      )}

      {hints.length === 0 && !addingNew && (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#7F7BA9",
            marginBottom: 12,
          }}
        >
          Aucun indice. Ajoutez-en ci-dessous.
        </p>
      )}

      {hints.map((hint) => (
        <div
          key={hint.id}
          style={{
            marginBottom: 10,
            padding: "14px 16px",
            background: editingId === hint.id ? "rgba(10,255,212,0.03)" : "#060420",
            border: `1px solid ${editingId === hint.id ? "rgba(10,255,212,0.2)" : "#2A2560"}`,
          }}
        >
          {editingId === hint.id ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label style={labelStyle}>Contenu</label>
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                  }}
                  rows={3}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Coût XP</label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={editXpCost}
                    onChange={(e) => {
                      setEditXpCost(Number(e.target.value));
                    }}
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  disabled={savePending}
                  onClick={() => {
                    handleSave(hint.id);
                  }}
                  style={{
                    padding: "6px 14px",
                    background: savePending ? "#2A2560" : "#0AFFD4",
                    color: savePending ? "#7F7BA9" : "#030219",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    border: "none",
                    cursor: savePending ? "not-allowed" : "pointer",
                  }}
                >
                  {savePending ? "..." : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={{
                    padding: "6px 14px",
                    background: "transparent",
                    border: "1px solid #2A2560",
                    color: "#7F7BA9",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    fontSize: 10,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 9,
                    color: "#7F7BA9",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  #{String(hint.orderIndex + 1)} ·{" "}
                  {hint.xpCost > 0 ? `${String(hint.xpCost)} XP` : "gratuit"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "#B8B5D1",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {hint.content}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => {
                    startEdit(hint);
                  }}
                  style={{
                    padding: "4px 10px",
                    background: "transparent",
                    border: "1px solid #2A2560",
                    color: "#7F7BA9",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Éditer
                </button>
                <button
                  type="button"
                  disabled={deletePending}
                  onClick={() => {
                    handleDelete(hint.id);
                  }}
                  style={{
                    padding: "4px 10px",
                    background: "transparent",
                    border: "1px solid rgba(255,77,109,0.3)",
                    color: "#FF4D6D",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    cursor: deletePending ? "not-allowed" : "pointer",
                    opacity: deletePending ? 0.5 : 1,
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {addingNew ? (
        <div
          style={{
            padding: "16px",
            background: "rgba(10,255,212,0.03)",
            border: "1px solid rgba(10,255,212,0.15)",
            marginTop: 8,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={labelStyle}>Contenu de l&apos;indice *</label>
              <textarea
                value={newContent}
                onChange={(e) => {
                  setNewContent(e.target.value);
                }}
                rows={3}
                placeholder="Regarde du côté des en-têtes HTTP..."
                style={{ ...inputStyle, resize: "vertical" }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={labelStyle}>Coût XP</label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={newXpCost}
                  onChange={(e) => {
                    setNewXpCost(Number(e.target.value));
                  }}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Ordre d&apos;affichage</label>
                <input
                  type="number"
                  min={0}
                  value={newOrderIndex}
                  onChange={(e) => {
                    setNewOrderIndex(Number(e.target.value));
                  }}
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                disabled={createPending}
                onClick={handleCreate}
                style={{
                  padding: "6px 14px",
                  background: createPending ? "#2A2560" : "#0AFFD4",
                  color: createPending ? "#7F7BA9" : "#030219",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  border: "none",
                  cursor: createPending ? "not-allowed" : "pointer",
                }}
              >
                {createPending ? "..." : "Ajouter l'indice"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAddingNew(false);
                  setNewContent("");
                  setNewXpCost(0);
                  setOpError(undefined);
                }}
                style={{
                  padding: "6px 14px",
                  background: "transparent",
                  border: "1px solid #2A2560",
                  color: "#7F7BA9",
                  fontFamily: "var(--font-mono)",
                  fontWeight: 600,
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setAddingNew(true);
            setNewOrderIndex(hints.length);
            setOpError(undefined);
          }}
          style={{
            marginTop: hints.length > 0 ? 4 : 0,
            padding: "7px 16px",
            background: "transparent",
            border: "1px solid rgba(10,255,212,0.2)",
            color: "#0AFFD4",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          + Ajouter un indice
        </button>
      )}
    </div>
  );
}

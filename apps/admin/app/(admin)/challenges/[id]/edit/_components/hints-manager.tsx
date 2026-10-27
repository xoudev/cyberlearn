"use client";

// "use client" justified: inline edit state, useTransition for hint mutations, router.refresh()

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { notifyResult } from "@/lib/notify";
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

  // The errors stay in the banner above the hints, beside the fields they are
  // about; a success, which used to say nothing, is a toast.
  function handleSave(hintId: string): void {
    startSave(async () => {
      const result = await updateHintAction(hintId, editContent, editXpCost);
      if (!notifyResult(result, { success: "Indice enregistré.", error: false })) {
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
      if (!notifyResult(result, { success: "Indice supprimé.", error: false })) {
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
      if (!notifyResult(result, { success: "Indice ajouté.", error: false })) {
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
          marginBottom: 16,
          paddingBottom: 8,
          borderBottom: "1px solid var(--a-border)",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <h2 className="a-section-title">Indices</h2>
        <span className="a-meta-label">
          {String(hints.length)} indice{hints.length !== 1 ? "s" : ""}
        </span>
      </div>

      {opError !== undefined && (
        <p className="a-form-error" style={{ marginBottom: 12 }}>
          {opError}
        </p>
      )}

      {hints.length === 0 && !addingNew && (
        <p className="a-field-hint" style={{ margin: "0 0 12px" }}>
          Aucun indice. Ajoutez-en ci-dessous.
        </p>
      )}

      {hints.map((hint) => (
        <div
          key={hint.id}
          style={{
            marginBottom: 10,
            padding: "14px 16px",
            background: editingId === hint.id ? "var(--a-overlay)" : "var(--a-surface)",
            border: `1px solid ${editingId === hint.id ? "var(--a-accent)" : "var(--a-border-2)"}`,
          }}
        >
          {editingId === hint.id ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div>
                <label className="a-label" style={{ display: "block", marginBottom: 6 }}>
                  Contenu
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                  }}
                  rows={3}
                  className="a-textarea"
                />
              </div>
              <div className="a-fields-grid">
                <div>
                  <label className="a-label" style={{ display: "block", marginBottom: 6 }}>
                    Coût XP
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={editXpCost}
                    onChange={(e) => {
                      setEditXpCost(Number(e.target.value));
                    }}
                    className="a-input"
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
                  className="a-btn a-btn--primary a-btn--sm"
                >
                  {savePending ? "..." : "Enregistrer"}
                </button>
                <button type="button" onClick={cancelEdit} className="a-btn a-btn--ghost a-btn--sm">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="a-meta-label" style={{ marginBottom: 4 }}>
                  <span className="a-mono">#{String(hint.orderIndex + 1)}</span> ·{" "}
                  {hint.xpCost > 0 ? (
                    <span className="a-mono">{String(hint.xpCost)} XP</span>
                  ) : (
                    "gratuit"
                  )}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: 12,
                    color: "var(--a-fg-2)",
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
                  className="a-btn a-btn--ghost a-btn--sm"
                >
                  Éditer
                </button>
                <button
                  type="button"
                  disabled={deletePending}
                  onClick={() => {
                    handleDelete(hint.id);
                  }}
                  className="a-btn a-btn--danger a-btn--sm"
                  style={{ opacity: deletePending ? 0.5 : 1 }}
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
            background: "var(--a-surface)",
            border: "1px solid var(--a-border)",
            marginTop: 8,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label className="a-label" style={{ display: "block", marginBottom: 6 }}>
                Contenu de l&apos;indice *
              </label>
              <textarea
                value={newContent}
                onChange={(e) => {
                  setNewContent(e.target.value);
                }}
                rows={3}
                placeholder="Regarde du côté des en-têtes HTTP..."
                className="a-textarea"
              />
            </div>
            <div className="a-fields-grid">
              <div>
                <label className="a-label" style={{ display: "block", marginBottom: 6 }}>
                  Coût XP
                </label>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={newXpCost}
                  onChange={(e) => {
                    setNewXpCost(Number(e.target.value));
                  }}
                  className="a-input"
                />
              </div>
              <div>
                <label className="a-label" style={{ display: "block", marginBottom: 6 }}>
                  Ordre d&apos;affichage
                </label>
                <input
                  type="number"
                  min={0}
                  value={newOrderIndex}
                  onChange={(e) => {
                    setNewOrderIndex(Number(e.target.value));
                  }}
                  className="a-input"
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                disabled={createPending}
                onClick={handleCreate}
                className="a-btn a-btn--primary a-btn--sm"
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
                className="a-btn a-btn--ghost a-btn--sm"
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
          className="a-btn a-btn--ghost a-btn--sm"
          style={{ marginTop: hints.length > 0 ? 4 : 0 }}
        >
          + Ajouter un indice
        </button>
      )}
    </div>
  );
}

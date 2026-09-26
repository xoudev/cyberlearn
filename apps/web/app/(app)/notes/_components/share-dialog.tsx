"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  loadShareAudienceAction,
  shareNoteAction,
  unshareNoteAction,
  type ShareAudienceEntry,
} from "../_actions/share-actions";

/**
 * Who gets the note.
 *
 * Deliberately a list of people rather than a link or an address field. The
 * note goes to people the author is already tied to, so those ties are what is
 * shown - a group per class with its teachers at the top, then one for the
 * friends who are not already in one of them. There is nothing to type, which
 * is also why there is nothing to mistype.
 */
export function ShareDialog({
  noteId,
  lessonTitle,
  onClose,
}: {
  noteId: string;
  lessonTitle: string;
  onClose: () => void;
}): React.JSX.Element {
  const [entries, setEntries] = useState<ShareAudienceEntry[] | null>(null);
  const [noAudience, setNoAudience] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void loadShareAudienceAction(noteId).then((state) => {
      if (!live) return;
      setEntries(state.entries);
      setNoAudience(state.noAudience);
    });
    return () => {
      live = false;
    };
  }, [noteId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Grouped by class then friends, teachers first inside each class - the
  // order the repository already returns them in, kept rather than re-sorted.
  //
  // The key is the group's id and the heading is its label, because they are
  // not the same thing: two classes can share a name, and grouping on the name
  // would file both sets of people under one heading.
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; people: ShareAudienceEntry[] }>();
    for (const e of entries ?? []) {
      const group = map.get(e.groupId);
      if (group) group.people.push(e);
      else map.set(e.groupId, { label: e.groupLabel, people: [e] });
    }
    return [...map];
  }, [entries]);

  const toggle = (id: string): void => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError(null);
    setDone(null);
  };

  const submit = (): void => {
    if (picked.size === 0 || busy) return;
    setBusy(true);
    setError(null);
    setDone(null);
    void shareNoteAction({ noteId, recipientIds: [...picked] })
      .then((res) => {
        if (!res.ok) {
          setError(res.error ?? "Partage impossible.");
          return;
        }
        const n = res.shared ?? 0;
        setDone(
          n === 0
            ? "Ces personnes avaient déjà cette note."
            : `Note partagée à ${String(n)} personne${n > 1 ? "s" : ""}.`,
        );
        setEntries((prev) =>
          (prev ?? []).map((e) => (picked.has(e.id) ? { ...e, holds: true } : e)),
        );
        setPicked(new Set());
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const takeBack = (id: string): void => {
    setBusy(true);
    void unshareNoteAction(noteId, id)
      .then((res) => {
        if (!res.ok) return;
        setEntries((prev) => (prev ?? []).map((e) => (e.id === id ? { ...e, holds: false } : e)));
        setDone(null);
      })
      .finally(() => {
        setBusy(false);
      });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Partager la note : ${lessonTitle}`}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 70,
        display: "grid",
        placeItems: "center",
        padding: "clamp(12px,4vw,40px)",
        background: "rgba(2,1,14,0.78)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
        }}
        style={{
          display: "flex",
          flexDirection: "column",
          width: "min(520px, 100%)",
          maxHeight: "100%",
          background: "#08061c",
          border: "1px solid #2A2560",
          borderTop: "3px solid var(--cosmetic-accent)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #1F1B47" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--cosmetic-accent)",
            }}
          >
            Partager
          </span>
          <h3
            style={{
              margin: "8px 0 0",
              fontFamily: "var(--font-sans)",
              fontWeight: 700,
              fontSize: 17,
              color: "#F5F5FA",
              lineHeight: 1.25,
            }}
          >
            {lessonTitle}
          </h3>
          <p
            style={{
              margin: "8px 0 0",
              fontFamily: "var(--font-body)",
              fontSize: 12.5,
              color: "#8B88A8",
            }}
          >
            Ta note reste la tienne : tu peux la reprendre à tout moment.
          </p>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
          {entries === null ? (
            <p style={mutedLine}>Chargement…</p>
          ) : noAudience ? (
            <p style={mutedLine}>
              {
                "Une note se partage avec les membres de ta classe et avec tes amis, et tu n'as encore ni l'un ni l'autre. Ton établissement peut t'ajouter à une classe, et tu peux ajouter quelqu'un en ami depuis son profil."
              }
            </p>
          ) : (
            groups.map(([groupId, group]) => (
              <div key={groupId} style={{ marginBottom: 18 }}>
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "#7F7BA9",
                    marginBottom: 8,
                  }}
                >
                  {group.label}
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 4 }}>
                  {group.people.map((p) => (
                    <li key={p.id}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "8px 10px",
                          border: `1px solid ${picked.has(p.id) ? "var(--cosmetic-accent)" : "#1F1B47"}`,
                          background: picked.has(p.id)
                            ? "color-mix(in srgb, var(--cosmetic-accent) 8%, transparent)"
                            : "rgba(5,4,26,0.4)",
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            flex: 1,
                            minWidth: 0,
                            cursor: p.holds ? "default" : "pointer",
                          }}
                        >
                          {/* Somebody who already holds the note gets a mark
                              rather than a dead checkbox: a box that cannot be
                              ticked reads as "not allowed", which is the
                              opposite of what it means here. */}
                          {p.holds ? (
                            <span
                              aria-hidden="true"
                              title="A déjà cette note"
                              style={{
                                width: 15,
                                textAlign: "center",
                                color: "var(--cosmetic-accent)",
                                fontFamily: "var(--font-mono)",
                                fontSize: 13,
                              }}
                            >
                              ✓
                            </span>
                          ) : (
                            <input
                              type="checkbox"
                              checked={picked.has(p.id)}
                              disabled={busy}
                              onChange={() => {
                                toggle(p.id);
                              }}
                              style={{
                                accentColor: "var(--cosmetic-accent)",
                                width: 15,
                                height: 15,
                              }}
                            />
                          )}
                          <span style={{ minWidth: 0 }}>
                            <span
                              style={{
                                display: "block",
                                fontFamily: "var(--font-sans)",
                                fontSize: 14,
                                color: "#F5F5FA",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {p.name}
                            </span>
                            {p.kind === "TEACHER" && (
                              <span
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: 9.5,
                                  letterSpacing: "0.14em",
                                  textTransform: "uppercase",
                                  color: "#6E8BFF",
                                }}
                              >
                                Professeur
                              </span>
                            )}
                          </span>
                        </label>
                        {p.holds && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              takeBack(p.id);
                            }}
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 10,
                              fontWeight: 700,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "#FF6B7A",
                              background: "transparent",
                              border: "1px solid rgba(255,71,87,0.4)",
                              padding: "5px 9px",
                              cursor: "pointer",
                              flexShrink: 0,
                            }}
                          >
                            Reprendre
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}

          {error !== null && (
            <p
              role="alert"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                lineHeight: 1.5,
                color: "#FF6B7A",
                border: "1px solid rgba(255,71,87,0.35)",
                background: "rgba(255,71,87,0.06)",
                padding: "10px 12px",
                margin: 0,
              }}
            >
              {error}
            </p>
          )}
          {done !== null && (
            <p
              role="status"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--cosmetic-accent)",
                margin: 0,
              }}
            >
              {done}
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 10,
            padding: "14px 20px",
            borderTop: "1px solid #1F1B47",
          }}
        >
          <button type="button" onClick={onClose} style={ghostBtn}>
            Fermer
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || picked.size === 0}
            style={{
              ...accentBtn,
              opacity: busy || picked.size === 0 ? 0.45 : 1,
              cursor: busy || picked.size === 0 ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "…" : `Partager${picked.size > 0 ? ` (${String(picked.size)})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

const mutedLine: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12.5,
  lineHeight: 1.6,
  color: "#7F7BA9",
  margin: 0,
};

const ghostBtn: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#B8B5D1",
  background: "transparent",
  border: "1px solid #2A2560",
  padding: "8px 12px",
  cursor: "pointer",
};

const accentBtn: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#05041A",
  background: "var(--cosmetic-accent)",
  border: "1px solid var(--cosmetic-accent)",
  padding: "8px 12px",
};

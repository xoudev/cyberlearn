"use client";

import React, { useMemo, useState, useTransition } from "react";
import { addMembersByIdAction } from "../_actions/class-actions";

/**
 * Picking from the people who exist, instead of retyping their addresses.
 *
 * The roster had one way in: a box you paste addresses into. That is the right
 * tool for a class list copied out of a school system, and the wrong one for
 * "add these three", where every character typed is a chance to add nobody at
 * all - the paste box's whole error message is about addresses that matched no
 * account.
 *
 * Filtering happens here rather than on the server. The directory arrives with
 * the page, already scoped to accounts that are not in the class, and a school
 * is hundreds of people rather than millions - so a keystroke costs nothing and
 * the list answers instantly.
 */

export interface PickableUser {
  id: string;
  label: string;
  email: string;
  role: string;
  search: string;
}

export function MemberPicker({
  classId,
  candidates,
}: {
  classId: string;
  candidates: PickableUser[];
}): React.ReactElement {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [added, setAdded] = useState<number | null>(null);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q.length === 0 ? candidates : candidates.filter((c) => c.search.includes(q));
    // Capped rather than scrolled forever: a list of four hundred names is not
    // a list anyone reads, it is a prompt to type one more letter.
    return pool.slice(0, 40);
  }, [candidates, query]);

  function toggle(id: string): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setAdded(null);
  }

  if (candidates.length === 0) {
    return (
      <p className="a-form-notice">
        Tous les comptes existants sont déjà dans cette classe. Utilise le champ ci-dessous pour
        inviter une adresse qui n&apos;a pas encore de compte.
      </p>
    );
  }

  return (
    <div className="a-form">
      <label className="a-field">
        <span className="a-label">Ajouter depuis les comptes existants</span>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
          }}
          placeholder="Nom, pseudo ou adresse…"
          className="a-input"
        />
        <span className="a-field-hint">
          {candidates.length} compte{candidates.length > 1 ? "s" : ""} hors de cette classe.
        </span>
      </label>

      <div className="a-picker">
        {matches.length === 0 ? (
          <p className="a-field-hint" style={{ padding: "10px 12px" }}>
            Aucun compte ne correspond.
          </p>
        ) : (
          matches.map((c) => (
            <label key={c.id} className="a-picker-row">
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => {
                  toggle(c.id);
                }}
              />
              <span className="a-picker-name">{c.label}</span>
              <span className="mono a-picker-meta">{c.email}</span>
            </label>
          ))
        )}
      </div>

      <div className="a-row-actions">
        <button
          type="button"
          disabled={pending || selected.size === 0}
          onClick={() => {
            const ids = [...selected];
            start(async () => {
              const result = await addMembersByIdAction(classId, ids);
              if (result.ok) {
                setSelected(new Set());
                setAdded(result.added ?? 0);
              }
            });
          }}
          className="a-btn a-btn--primary"
        >
          {pending
            ? "…"
            : selected.size === 0
              ? "Sélectionne des comptes"
              : `Ajouter ${String(selected.size)} compte${selected.size > 1 ? "s" : ""}`}
        </button>

        {added !== null && (
          <span className="a-field-hint">
            {added} compte{added > 1 ? "s" : ""} ajouté{added > 1 ? "s" : ""}.
          </span>
        )}
      </div>
    </div>
  );
}

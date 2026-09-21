"use client";

import React, { useMemo, useState } from "react";
import { moderate, moderationNotice, RULE_LABEL } from "@cyberlearn/lib";
import { UI } from "../../_components/admin-ui";

/**
 * The filter, with a box to type into.
 *
 * The analyser is a pure function over a string, so there is no reason to
 * guess at what it will do to a sentence: this runs it as you type, on the
 * client, and shows the verdict, the score and every rule that fired.
 *
 * It is the tool the last round of moderation work needed and did not have.
 * "Tu est nul vas te faire foutre" scored zero for weeks and nobody could see
 * it without writing a test - and a filter whose behaviour is invisible is a
 * filter that drifts.
 *
 * Nothing is recorded. Typing here writes no queue row and no event.
 */

const VERDICT_TONE: Record<string, string> = {
  ALLOW: UI.turquoise,
  REVIEW: UI.warning,
  BLOCK: UI.danger,
};

const VERDICT_SAYS: Record<string, string> = {
  ALLOW: "Publié sans rien enregistrer.",
  REVIEW: "Enregistré pour un humain. Sur un partage de note, refusé.",
  BLOCK: "Refusé partout, et l'auteur est prévenu.",
};

/** Sentences worth having one click away, each for its own reason. */
const CANNED: { label: string; text: string }[] = [
  { label: "L'insulte signalée", text: "Tu est nul vas te faire foutre" },
  { label: "Une locution fléchie", text: "espèce d'enculé" },
  { label: "Chevauchement", text: "ferme ta gueule" },
  { label: "Grossièreté seule", text: "merde ça marche pas" },
  { label: "Deux grossièretés", text: "merde ce bordel" },
  { label: "Faux positif classique", text: "Le cône de signalisation était réputé solide." },
  { label: "Coordonnées", text: "appelle-moi au 06 12 34 56 78" },
  { label: "Détresse", text: "j'ai envie de mourir" },
];

export function ModerationProbe(): React.JSX.Element {
  const [text, setText] = useState("Tu est nul vas te faire foutre");
  const [allowLinks, setAllowLinks] = useState(false);

  const result = useMemo(() => moderate(text, { allowLinks }), [text, allowLinks]);
  // What the author would be told, for the two stages a refusal can reach.
  const notice = useMemo(
    () => moderationNotice({ stage: "refused", surface: "note.share", sanctionLabel: null }),
    [],
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CANNED.map((c) => (
          <button
            key={c.label}
            type="button"
            className="a-btn a-btn--ghost a-btn--sm"
            onClick={() => {
              setText(c.text);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span className="a-field-hint">Texte à analyser</span>
        <textarea
          className="a-textarea"
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
        />
      </label>

      <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="checkbox"
          checked={allowLinks}
          onChange={(e) => {
            setAllowLinks(e.target.checked);
          }}
        />
        <span className="a-field-hint">
          Liens attendus sur cette surface (un forum, oui ; une note partagée, non)
        </span>
      </label>

      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 12,
          padding: "10px 12px",
          background: UI.surfaceDeep,
          border: `1px solid ${UI.border}`,
        }}
      >
        <strong
          style={{
            font: `700 18px ${UI.mono}`,
            color: VERDICT_TONE[result.verdict] ?? UI.fg,
          }}
        >
          {result.verdict}
        </strong>
        <span style={{ font: `600 14px ${UI.mono}`, color: UI.fg2 }}>{result.score} pts</span>
        <span className="a-field-hint">{VERDICT_SAYS[result.verdict]}</span>
      </div>

      {result.findings.length > 0 ? (
        <table className="a-table">
          <thead>
            <tr>
              <th>Motif</th>
              <th>Poids</th>
              <th>Ce qui a déclenché</th>
            </tr>
          </thead>
          <tbody>
            {result.findings.map((f, i) => (
              <tr key={`${f.rule}-${String(i)}`}>
                <td>{RULE_LABEL[f.rule]}</td>
                <td style={{ font: `600 13px ${UI.mono}` }}>{f.severity}</td>
                <td style={{ font: `400 13px ${UI.mono}`, color: UI.fg2 }}>{f.match}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="a-field-hint">Aucun motif. Le texte passe sans laisser de trace.</p>
      )}

      <div style={{ borderTop: `1px solid ${UI.border}`, paddingTop: 12 }}>
        <p className="a-field-hint" style={{ marginBottom: 6 }}>
          Ce que lit l&apos;auteur d&apos;une note refusée :
        </p>
        <p style={{ font: `700 14px ${UI.sans}`, color: UI.fg, margin: "0 0 4px" }}>
          {notice.title}
        </p>
        <p style={{ font: `400 13px ${UI.sans}`, color: UI.fg2, margin: 0 }}>{notice.body}</p>
      </div>
    </div>
  );
}

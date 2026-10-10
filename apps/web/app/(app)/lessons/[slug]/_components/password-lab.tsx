"use client";

import React, { useState } from "react";
import {
  ALPHABET,
  ALPHABETS,
  type AlphabetId,
  type AttackMethod,
  type AttackResult,
  ATTACK_METHODS,
  candidatesFor,
  type CrackedAccount,
  DICTIONARY_LEVELS,
  DICTIONARY_NAMES,
  DICTIONARY_NOTES,
  type DictionaryLevel,
  estimate,
  formatDuration,
  type FunctionId,
  GUESS_FUNCTION,
  GUESS_FUNCTIONS,
  groupDigits,
  METHOD_NAMES,
  METHOD_NOTES,
  observations,
  realDictionaryRows,
  runAttack,
  runSummary,
  secondsToTry,
  shortHash,
  STRENGTH_LABELS,
  type Strength,
} from "@cyberlearn/lib/crypto/cracking";
import { parsePasswordLab } from "@cyberlearn/types";
import { ACCENT, AMBER, MONO, RED } from "@cyberlearn/ui";

/**
 * <PasswordLab>: a table of sample accounts as a platform's database would
 * hold them, and a dictionary attack the learner runs on it: which passwords
 * fall, which resist, what a salt changes, what length and a slow function
 * are worth. Client-side because it answers clicks; the attack runs in the
 * browser, on the lesson's made-up hashes, and nothing is sent anywhere.
 */

const STRENGTH_COLOR: Record<Strength, string> = { weak: RED, fair: AMBER, strong: ACCENT };

const chip = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  border: `1px solid ${active ? ACCENT : "var(--color-border-default)"}`,
  background: active ? ACCENT : "transparent",
  color: active ? "var(--color-bg-base)" : "var(--color-text-secondary)",
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
});

const action: React.CSSProperties = {
  padding: "8px 16px",
  border: `1px solid ${ACCENT}`,
  background: "transparent",
  color: ACCENT,
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
};

const tag: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const prose: React.CSSProperties = {
  margin: 0,
  color: "var(--color-text-secondary)",
  fontSize: 14,
  lineHeight: 1.6,
};

const muted: React.CSSProperties = {
  margin: 0,
  color: "var(--color-text-muted)",
  fontSize: 13,
  lineHeight: 1.5,
};

const cell: React.CSSProperties = {
  padding: "8px 10px",
  borderBottom: "1px solid var(--color-border-subtle)",
  textAlign: "left",
  verticalAlign: "top",
  fontSize: 13,
};

const step: React.CSSProperties = {
  borderTop: "1px solid var(--color-border-subtle)",
  paddingTop: 14,
  display: "grid",
  gap: 10,
};

export function PasswordLab(props: Record<string, unknown>): React.ReactElement {
  const parsed = parsePasswordLab(props);
  const [level, setLevel] = useState<DictionaryLevel>("top10");
  const [method, setMethod] = useState<AttackMethod>("table");
  const [cracked, setCracked] = useState<Record<string, CrackedAccount>>({});
  const [last, setLast] = useState<AttackResult | null>(null);
  const [exhaustive, setExhaustive] = useState(false);
  const [alphabetId, setAlphabetId] = useState<AlphabetId>("all");
  const [length, setLength] = useState(8);
  const [functionId, setFunctionId] = useState<FunctionId>("sha256");
  const [tried, setTried] = useState<number[]>([]);
  const [solved, setSolved] = useState(false);

  if (!parsed.ok) {
    return (
      <div
        role="note"
        style={{
          margin: "24px 0",
          padding: "14px 16px",
          border: `1px solid ${RED}`,
          color: "var(--color-text-secondary)",
          fontSize: 14,
        }}
      >
        Exercice « Atelier mots de passe » indisponible : {parsed.problem}
      </div>
    );
  }
  const lab = parsed.value;
  const found = Object.keys(cracked).length;
  const allFound = found >= lab.weak;
  const asked = lab.question !== undefined && lab.options !== undefined;
  const done = allFound && (!asked || solved);

  const alphabet = ALPHABET[alphabetId];
  const shown = Math.min(length, alphabet.max);
  const guess = GUESS_FUNCTION[functionId];
  const reading = estimate(alphabet, shown, guess);

  const launch = (): void => {
    const result = runAttack(lab.accounts, level, method);
    setLast(result);
    setCracked((before) => {
      const after = { ...before };
      for (const hit of result.cracked) after[hit.user] = hit;
      return after;
    });
    if (level === "variants" && method === "each") setExhaustive(true);
  };

  const choose = (index: number): void => {
    if (solved || tried.includes(index)) return;
    if (index === lab.correct) setSolved(true);
    else setTried([...tried, index]);
  };

  return (
    <section
      aria-label={`Atelier mots de passe${lab.title ? ` : ${lab.title}` : ""}`}
      style={{
        margin: "28px 0",
        border: "1px solid var(--color-border-subtle)",
        borderTop: `2px solid ${ACCENT}`,
        background: "var(--color-bg-sunken)",
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border-subtle)",
          display: "flex",
          gap: 10,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <span style={{ ...tag, color: ACCENT }}>Atelier mots de passe</span>
        {lab.title ? (
          <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontSize: 15 }}>
            {lab.title}
          </span>
        ) : null}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 11,
            color: done ? ACCENT : "var(--color-text-muted)",
          }}
        >
          {done ? "Réussi" : `${String(found)} / ${String(lab.weak)} cassés`}
        </span>
      </header>

      <div style={{ padding: "14px 16px 16px", display: "grid", gap: 16 }}>
        {lab.task ? <p style={prose}>{lab.task}</p> : null}
        <p style={muted}>
          Tout se passe dans ton navigateur, sur des empreintes d&apos;exemple : rien n&apos;est
          envoyé, et rien ici ne s&apos;attaque à un vrai compte. L&apos;exercice sert à comprendre
          pourquoi un mot de passe tombe, et comment s&apos;en protéger.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table
            aria-label="Les comptes volés"
            style={{ borderCollapse: "collapse", width: "100%", minWidth: 480 }}
          >
            <thead>
              <tr>
                {["Compte", "Sel", "Empreinte SHA-256", "Résultat"].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    style={{
                      ...cell,
                      ...tag,
                      color: "var(--color-text-muted)",
                      fontWeight: 400,
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lab.accounts.map((account) => {
                const hit = cracked[account.user];
                const showNote = account.note !== undefined && (hit !== undefined || exhaustive);
                return (
                  <tr key={account.user}>
                    <th
                      scope="row"
                      style={{
                        ...cell,
                        fontFamily: MONO,
                        fontWeight: 400,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {account.user}
                    </th>
                    <td style={{ ...cell, fontFamily: MONO, color: "var(--color-text-secondary)" }}>
                      {account.salt ?? (
                        <span style={{ color: "var(--color-text-muted)" }}>aucun</span>
                      )}
                    </td>
                    <td style={{ ...cell, fontFamily: MONO, color: "var(--color-text-secondary)" }}>
                      <code title={account.hash}>{shortHash(account.hash)}</code>
                    </td>
                    <td style={cell}>
                      {hit !== undefined ? (
                        <span style={{ color: RED, fontFamily: MONO }}>
                          {hit.password}{" "}
                          <span style={{ color: "var(--color-text-muted)" }}>
                            ({groupDigits(hit.tries)} {hit.tries < 2 ? "essai" : "essais"})
                          </span>
                        </span>
                      ) : last === null ? (
                        <span style={{ color: "var(--color-text-muted)" }}>pas encore attaqué</span>
                      ) : exhaustive ? (
                        <span style={{ color: ACCENT }}>résiste au dictionnaire</span>
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>pas trouvé</span>
                      )}
                      {showNote ? <p style={{ ...muted, marginTop: 4 }}>{account.note}</p> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <span style={{ ...tag, color: "var(--color-text-muted)" }}>1 · L&apos;attaque</span>
          <div
            role="group"
            aria-label="Dictionnaire"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {DICTIONARY_LEVELS.map((candidate) => (
              <button
                key={candidate}
                type="button"
                aria-pressed={candidate === level}
                onClick={() => {
                  setLevel(candidate);
                }}
                style={chip(candidate === level)}
              >
                {DICTIONARY_NAMES[candidate]}
              </button>
            ))}
          </div>
          <p style={muted}>
            {DICTIONARY_NOTES[level]} ({groupDigits(candidatesFor(level).length)} mots à essayer.)
          </p>
          <div
            role="group"
            aria-label="Méthode"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {ATTACK_METHODS.map((candidate) => (
              <button
                key={candidate}
                type="button"
                aria-pressed={candidate === method}
                onClick={() => {
                  setMethod(candidate);
                }}
                style={chip(candidate === method)}
              >
                {METHOD_NAMES[candidate]}
              </button>
            ))}
          </div>
          <p style={muted}>{METHOD_NOTES[method]}</p>
          <button type="button" onClick={launch} style={{ ...action, justifySelf: "start" }}>
            Lancer l&apos;attaque
          </button>
          <div aria-live="polite" style={{ display: "grid", gap: 6 }}>
            {last !== null ? (
              <p style={{ ...prose, color: "var(--color-text-primary)" }}>
                {runSummary(last, lab.accounts.length)}
              </p>
            ) : null}
            {observations(lab.accounts, Object.values(cracked)).map((line) => (
              <p key={line} style={prose}>
                {line}
              </p>
            ))}
            {last !== null && !allFound ? (
              <p style={muted}>
                Il en reste {String(lab.weak - found)} à trouver. Un dictionnaire plus large, ou une
                autre méthode, en fait tomber d&apos;autres.
              </p>
            ) : null}
          </div>
        </div>

        <div style={step}>
          <span style={{ ...tag, color: "var(--color-text-muted)" }}>
            2 · La longueur et la lenteur
          </span>
          <p style={prose}>
            Un mot de passe qui n&apos;est dans aucun dictionnaire reste attaquable : il suffit de
            tout essayer. Le calculateur donne le nombre de possibilités et le temps pour toutes les
            parcourir, avec la fonction qui garde les empreintes. Ce sont des ordres de grandeur
            pour une carte graphique grand public, pas des mesures.
          </p>
          <div
            role="group"
            aria-label="Fonction de stockage"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {GUESS_FUNCTIONS.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={candidate.id === functionId}
                onClick={() => {
                  setFunctionId(candidate.id);
                }}
                style={chip(candidate.id === functionId)}
              >
                {candidate.label}
              </button>
            ))}
          </div>
          <p style={muted}>
            {guess.note} Environ {guess.rate}.
          </p>
          <ul aria-label="Le prix d'un dictionnaire" style={{ margin: 0, paddingLeft: 18 }}>
            {last !== null ? (
              <li style={prose}>
                L&apos;attaque que tu viens de lancer ({groupDigits(last.hashes)}{" "}
                {last.hashes < 2 ? "calcul" : "calculs"}) :{" "}
                <strong style={{ color: "var(--color-text-primary)" }}>
                  {formatDuration(secondsToTry(last.hashes, guess.perSecond))}
                </strong>
                .
              </li>
            ) : null}
            {realDictionaryRows(guess).map((row) => (
              <li key={row.label} style={prose}>
                {row.label} :{" "}
                <strong style={{ color: "var(--color-text-primary)" }}>{row.duration}</strong>.
              </li>
            ))}
          </ul>

          <div
            role="group"
            aria-label="Type de caractères"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {ALPHABETS.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                aria-pressed={candidate.id === alphabetId}
                onClick={() => {
                  setAlphabetId(candidate.id);
                }}
                style={chip(candidate.id === alphabetId)}
              >
                {candidate.label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              aria-label={`Un ${alphabet.unit} de moins`}
              disabled={shown <= 1}
              onClick={() => {
                setLength(Math.max(1, shown - 1));
              }}
              style={chip(false)}
            >
              −
            </button>
            <span
              aria-live="polite"
              style={{ fontFamily: MONO, fontSize: 13, color: "var(--color-text-primary)" }}
            >
              {String(shown)} {shown < 2 ? alphabet.unit : alphabet.unitMany}
            </span>
            <button
              type="button"
              aria-label={`Un ${alphabet.unit} de plus`}
              disabled={shown >= alphabet.max}
              onClick={() => {
                setLength(Math.min(alphabet.max, shown + 1));
              }}
              style={chip(false)}
            >
              +
            </button>
          </div>
          <div
            aria-live="polite"
            style={{
              borderLeft: `2px solid ${STRENGTH_COLOR[reading.strength]}`,
              paddingLeft: 12,
              display: "grid",
              gap: 4,
            }}
          >
            <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
              {reading.combinations} mots de passe possibles. Pour tous les essayer, à {guess.rate}{" "}
              :
            </span>
            <strong
              style={{ fontFamily: MONO, fontSize: 18, color: STRENGTH_COLOR[reading.strength] }}
            >
              {reading.duration}
            </strong>
            <span style={{ ...tag, color: STRENGTH_COLOR[reading.strength] }}>
              {STRENGTH_LABELS[reading.strength]}
            </span>
          </div>
          <p style={muted}>
            Chaque {alphabet.unit} de plus multiplie le travail par {groupDigits(alphabet.size)}.
            C&apos;est pourquoi la longueur compte plus que la bizarrerie, et pourquoi une fonction
            lente change tout : elle multiplie le prix de chaque essai, sans que le mot de passe
            change.
          </p>
        </div>

        {asked ? (
          <div style={step}>
            <span style={{ ...tag, color: "var(--color-text-muted)" }}>3 · À toi de conclure</span>
            <fieldset style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: 8 }}>
              <legend style={{ ...prose, color: "var(--color-text-primary)", padding: 0 }}>
                {lab.question}
              </legend>
              {(lab.options ?? []).map((option, index) => {
                const wrong = tried.includes(index);
                const right = solved && index === lab.correct;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={solved || wrong}
                    aria-pressed={right}
                    onClick={() => {
                      choose(index);
                    }}
                    style={{
                      padding: "10px 14px",
                      border: `1px solid ${right ? ACCENT : wrong ? RED : "var(--color-border-default)"}`,
                      background: "transparent",
                      color: right
                        ? ACCENT
                        : wrong
                          ? "var(--color-text-muted)"
                          : "var(--color-text-primary)",
                      textAlign: "left",
                      fontSize: 14,
                      lineHeight: 1.5,
                      cursor: solved || wrong ? "default" : "pointer",
                      textDecoration: wrong ? "line-through" : "none",
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </fieldset>
            <div aria-live="polite">
              {solved ? (
                <p style={{ ...prose, color: ACCENT }}>
                  Oui.{lab.explanation ? ` ${lab.explanation}` : ""}
                </p>
              ) : tried.length > 0 ? (
                <p style={{ margin: 0, color: RED, fontSize: 14 }}>
                  Non, ce n&apos;est pas encore ça. Reprends ce que tu as vu : la liste, le sel, le
                  prix de chaque essai.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div
          aria-live="polite"
          style={{ ...step, fontFamily: MONO, fontSize: 12, color: "var(--color-text-secondary)" }}
        >
          <span>
            {allFound ? "✓" : "○"} Comptes faibles retrouvés : {String(Math.min(found, lab.weak))}{" "}
            sur {String(lab.weak)}
          </span>
          {asked ? (
            <span>
              {solved ? "✓" : "○"} Question de synthèse : {solved ? "réussie" : "à répondre"}
            </span>
          ) : null}
          {done ? (
            <span style={{ color: ACCENT }}>
              ✓ Atelier réussi : un mot de passe long, un sel par compte et une fonction lente.
            </span>
          ) : null}
        </div>
      </div>
    </section>
  );
}

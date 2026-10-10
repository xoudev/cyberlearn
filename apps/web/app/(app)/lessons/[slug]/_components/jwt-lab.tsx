"use client";

import { ACCENT, AMBER, MONO, RED } from "@cyberlearn/ui";
import React, { useState } from "react";
import { guessSecret, splitToken } from "@cyberlearn/lib/crypto/jwt";
import {
  type CodeLine,
  type Draft,
  draftToken,
  isAttackLevel,
  isForgery,
  isLifetimeAnswer,
  jsonProblem,
  LEVEL_SERVICES,
  LEVEL_TEXTS,
  publicKeyFacts,
  publicKeyPem,
  receivedToken,
  type Replay,
  replay,
  replayHolds,
  replaysFor,
  SANDBOX_CLOCK,
  SERVICE_CODE,
  SERVICE_NAMES,
  type ServiceId,
  type SignatureKind,
  startDraft,
  type Verdict,
  verifyAt,
  viewToken,
  WORDLIST,
} from "@cyberlearn/lib/crypto/jwt-lab";
import { type JwtLab as JwtLabProps, type JwtLevel, parseJwtLab } from "@cyberlearn/types";

/**
 * <JwtLab>: a JWT taken apart, then forged to fool three services that are set
 * up wrongly on purpose (they trust `alg: none`, sign with a word from the
 * dictionary, let the token pick its own algorithm), and finally replayed
 * against the same services corrected. The keys, secrets and tokens are the
 * platform's, made for this lab (@cyberlearn/lib/crypto/jwt-lab). Client-side
 * because it answers keystrokes and clicks; nothing is sent anywhere.
 */

/** The three parts of a token, in the colours of the legend: header, payload, signature. */
const PART_COLORS = [ACCENT, AMBER, "var(--color-category-dev)"] as const;

const field: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid var(--color-border-default)",
  background: "var(--color-bg-elevated)",
  color: "var(--color-text-primary)",
  fontFamily: MONO,
  fontSize: 13,
  width: "100%",
  boxSizing: "border-box",
};

const chip = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  border: `1px solid ${active ? ACCENT : "var(--color-border-default)"}`,
  background: active ? ACCENT : "transparent",
  color: active ? "var(--color-bg-base)" : "var(--color-text-secondary)",
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
});

const small: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid var(--color-border-default)",
  background: "transparent",
  color: "var(--color-text-secondary)",
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
};

const primary: React.CSSProperties = { ...small, border: `1px solid ${ACCENT}`, color: ACCENT };

const label: React.CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  color: "var(--color-text-muted)",
};

const paragraph: React.CSSProperties = {
  margin: 0,
  color: "var(--color-text-secondary)",
  fontSize: 14,
  lineHeight: 1.55,
};

/** "Service A" read in a sentence: "envoyer au service A". */
const inSentence = (name: string): string => name.charAt(0).toLowerCase() + name.slice(1);

export function JwtLab(props: Record<string, unknown>): React.ReactElement {
  const parsed = parseJwtLab(props);
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
        Exercice « Atelier JWT » indisponible : {parsed.problem}
      </div>
    );
  }
  return <Lab lab={parsed.value} />;
}

interface Sent {
  readonly token: string;
  readonly verdict: Verdict;
}

function Lab({ lab }: { lab: JwtLabProps }): React.ReactElement {
  const [chosen, setChosen] = useState<JwtLevel | null>(null);
  const [done, setDone] = useState<Partial<Record<JwtLevel, true>>>({});
  const [forged, setForged] = useState<Partial<Record<ServiceId, string>>>({});
  const [drafts, setDrafts] = useState<Partial<Record<ServiceId, Draft>>>({});
  const [sent, setSent] = useState<Partial<Record<ServiceId, Sent>>>({});

  const level = chosen ?? lab.levels[0] ?? "decode";
  const text = LEVEL_TEXTS[level];
  const finish = (finished: JwtLevel): void => {
    setDone((before) => ({ ...before, [finished]: true }));
  };
  const doneCount = lab.levels.filter((l) => done[l] === true).length;

  return (
    <section
      className="card card--sunken"
      aria-label={`Atelier JWT${lab.title ? ` : ${lab.title}` : ""}`}
      style={{ margin: "28px 0", borderTop: `2px solid ${ACCENT}` }}
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
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: ACCENT }}>
          ATELIER JWT
        </span>
        {lab.title ? (
          <span style={{ color: "var(--color-text-primary)", fontWeight: 600, fontSize: 15 }}>
            {lab.title}
          </span>
        ) : null}
        <span style={{ marginLeft: "auto", ...label }}>
          {String(doneCount)} / {String(lab.levels.length)} étapes
        </span>
      </header>

      <div style={{ padding: "12px 16px 16px", display: "grid", gap: 12 }}>
        {lab.task ? <p style={paragraph}>{lab.task}</p> : null}
        <p style={{ ...paragraph, fontSize: 13, color: "var(--color-text-muted)" }}>
          Bac à sable : des clés, des secrets et des jetons d&apos;exemple de la plateforme, une
          horloge fixée au {SANDBOX_CLOCK}. Rien ne part de ta machine, et rien de tout cela ne
          protège quoi que ce soit.
        </p>

        {lab.levels.length > 1 ? (
          <div
            role="group"
            aria-label="Étapes"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {lab.levels.map((candidate) => (
              <button
                key={candidate}
                type="button"
                aria-pressed={candidate === level}
                onClick={() => {
                  setChosen(candidate);
                }}
                style={chip(candidate === level)}
              >
                {LEVEL_TEXTS[candidate].name}
                {done[candidate] === true ? " ✓" : ""}
              </button>
            ))}
          </div>
        ) : null}

        <div style={{ display: "grid", gap: 10 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: "var(--color-text-primary)" }}>
            {text.title}
          </h3>
          {text.intro.map((paragraphText) => (
            <p key={paragraphText} style={paragraph}>
              {paragraphText}
            </p>
          ))}
          <p style={{ ...paragraph, color: "var(--color-text-primary)" }}>
            <strong style={{ fontFamily: MONO, fontSize: 11, color: ACCENT }}>OBJECTIF </strong>
            {text.goal}
          </p>
        </div>

        {level === "decode" ? (
          <DecodeStep
            solved={done.decode === true}
            hint={text.hint}
            onSolved={() => {
              finish("decode");
            }}
          />
        ) : level === "fixed" ? (
          <FixedStep
            levels={lab.levels}
            forged={forged}
            onDone={() => {
              finish("fixed");
            }}
          />
        ) : isAttackLevel(level) ? (
          <ForgeStep
            level={level}
            hint={text.hint}
            forged={forged}
            drafts={drafts}
            sent={sent}
            onDraft={(service, draft) => {
              setDrafts((before) => ({ ...before, [service]: draft }));
            }}
            onSent={(service, attempt) => {
              setSent((before) => ({ ...before, [service]: attempt }));
            }}
            onForged={(service, token) => {
              setForged((before) => ({ ...before, [service]: token }));
              finish(level);
            }}
          />
        ) : null}

        {done[level] === true ? (
          <div
            style={{
              borderTop: "1px solid var(--color-border-subtle)",
              paddingTop: 10,
              display: "grid",
              gap: 8,
            }}
          >
            <span style={{ ...label, color: ACCENT }}>POURQUOI</span>
            {text.why.map((paragraphText) => (
              <p key={paragraphText} style={paragraph}>
                {paragraphText}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ── pieces ───────────────────────────────────────────────────────────────────

function TokenText({ token, name }: { token: string; name: string }): React.ReactElement {
  const parts = splitToken(token);
  return (
    <pre
      aria-label={name}
      tabIndex={0}
      style={{ ...field, margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-all" }}
    >
      {parts === null ? (
        token
      ) : (
        <>
          <span style={{ color: PART_COLORS[0] }}>{parts.header}</span>.
          <span style={{ color: PART_COLORS[1] }}>{parts.payload}</span>.
          <span style={{ color: PART_COLORS[2] }}>{parts.signature}</span>
        </>
      )}
    </pre>
  );
}

function Legend(): React.ReactElement {
  return (
    <p style={{ ...label, margin: 0, display: "flex", gap: 12, flexWrap: "wrap" }}>
      {["En-tête", "Charge utile", "Signature"].map((name, i) => (
        <span key={name} style={{ color: PART_COLORS[i] }}>
          ■ {name}
        </span>
      ))}
    </p>
  );
}

function CodeBlock({
  title,
  lines,
}: {
  title: string;
  lines: readonly CodeLine[];
}): React.ReactElement {
  return (
    <pre
      aria-label={title}
      tabIndex={0}
      style={{ ...field, margin: 0, overflowX: "auto", lineHeight: 1.5 }}
    >
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            whiteSpace: "pre",
            background:
              line.mark === "flaw"
                ? `color-mix(in srgb, ${AMBER} 20%, transparent)`
                : line.mark === "fix"
                  ? `color-mix(in srgb, ${ACCENT} 18%, transparent)`
                  : "transparent",
          }}
        >
          <span aria-hidden="true" style={{ color: "var(--color-text-muted)" }}>
            {line.mark === "flaw" ? "! " : line.mark === "fix" ? "+ " : "  "}
          </span>
          {line.text === "" ? " " : line.text}
        </div>
      ))}
    </pre>
  );
}

function VerdictView({ verdict }: { verdict: Verdict }): React.ReactElement {
  return (
    <div aria-live="polite" style={{ display: "grid", gap: 6 }}>
      <p
        style={{
          margin: 0,
          fontFamily: MONO,
          fontSize: 12,
          color: verdict.accepted ? ACCENT : RED,
        }}
      >
        {verdict.accepted ? "✓ Jeton accepté" : "✗ Jeton refusé"}
      </p>
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
        {verdict.steps.map((step) => (
          <li
            key={step.text}
            style={{
              fontSize: 13,
              lineHeight: 1.5,
              color:
                step.tone === "bad"
                  ? RED
                  : step.tone === "ok"
                    ? ACCENT
                    : "var(--color-text-secondary)",
            }}
          >
            {step.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── step 1: reading a token ──────────────────────────────────────────────────

function DecodeStep({
  solved,
  hint,
  onSolved,
}: {
  solved: boolean;
  hint: string;
  onSolved: () => void;
}): React.ReactElement {
  const token = receivedToken("trusting");
  const view = viewToken(token);
  const [shown, setShown] = useState<readonly boolean[]>([false, false, false]);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState(0);
  const names = ["l'en-tête", "la charge utile", "la signature"] as const;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <span style={label}>LE JETON D&apos;ALICE</span>
      <TokenText token={token} name="Jeton d'alice" />
      <Legend />
      {view !== null ? (
        <div style={{ display: "grid", gap: 8 }}>
          {view.map((part, i) => (
            <div key={part.label} style={{ display: "grid", gap: 6 }}>
              <button
                type="button"
                aria-pressed={shown[i] === true}
                onClick={() => {
                  setShown((before) => before.map((was, k) => (k === i ? !was : was)));
                }}
                style={{ ...small, justifySelf: "start", color: PART_COLORS[i] }}
              >
                Décoder {names[i]}
              </button>
              {shown[i] === true ? (
                <pre
                  aria-label={`${part.label} décodé`}
                  style={{ ...field, margin: 0, color: PART_COLORS[i] }}
                >
                  {part.decoded}
                </pre>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (solved || answer.trim() === "") return;
          if (isLifetimeAnswer(answer)) onSolved();
          else setAttempts((n) => n + 1);
        }}
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
      >
        <input
          value={answer}
          onChange={(event) => {
            setAnswer(event.target.value);
          }}
          readOnly={solved}
          aria-label="Durée de validité du jeton"
          placeholder="Une durée, avec son unité"
          spellCheck={false}
          autoComplete="off"
          style={{ ...field, flex: "1 1 220px", width: "auto" }}
        />
        <button type="submit" disabled={solved || answer.trim() === ""} style={primary}>
          Vérifier
        </button>
      </form>
      <div aria-live="polite">
        {solved ? (
          <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: ACCENT }}>
            ✓ Une heure : exp moins iat fait 3600 secondes.
          </p>
        ) : attempts > 0 ? (
          <p style={{ margin: 0, color: RED, fontSize: 14 }}>
            Non, ce n&apos;est pas encore ça.
            <span style={{ color: "var(--color-text-secondary)" }}> Indice : {hint}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ── steps 2 to 4: forging ────────────────────────────────────────────────────

interface ForgeProps {
  level: "none" | "weak-secret" | "confusion";
  hint: string;
  forged: Partial<Record<ServiceId, string>>;
  drafts: Partial<Record<ServiceId, Draft>>;
  sent: Partial<Record<ServiceId, Sent>>;
  onDraft: (service: ServiceId, draft: Draft) => void;
  onSent: (service: ServiceId, attempt: Sent) => void;
  onForged: (service: ServiceId, token: string) => void;
}

const SIGNATURE_CHOICES: readonly { kind: SignatureKind; text: string }[] = [
  { kind: "keep", text: "Garder la signature d'origine" },
  { kind: "none", text: "Aucune signature" },
  { kind: "hmac", text: "HMAC-SHA256 avec ce secret" },
];

function ForgeStep(props: ForgeProps): React.ReactElement {
  const { level, hint, forged, drafts, sent, onDraft, onSent, onForged } = props;
  const services: readonly ServiceId[] = LEVEL_SERVICES[level];
  const [picked, setPicked] = useState<ServiceId | null>(null);
  const service = picked ?? services[0] ?? "trusting";
  const draft = drafts[service] ?? startDraft(service);
  const token = draftToken(service, draft);
  const attempt = sent[service];
  const name = SERVICE_NAMES[service];
  const asymmetric = service === "rsa" || service === "ec";
  const edit = (change: Partial<Draft>): void => {
    onDraft(service, { ...draft, ...change });
  };

  const send = (): void => {
    const verdict = verifyAt(service, "vulnerable", token);
    onSent(service, { token, verdict });
    if (isForgery(verdict)) onForged(service, token);
  };

  const headerProblem = jsonProblem(draft.header);
  const payloadProblem = jsonProblem(draft.payload);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {services.length > 1 ? (
        <div
          role="group"
          aria-label="Clé du service"
          style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
        >
          {services.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={candidate === service}
              onClick={() => {
                setPicked(candidate);
              }}
              style={chip(candidate === service)}
            >
              {SERVICE_NAMES[candidate]}
              {forged[candidate] !== undefined ? " ✓" : ""}
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 6 }}>
        <span style={label}>
          LE JETON QUE {name.toUpperCase()} T&apos;A REMIS (alice, rôle user)
        </span>
        <TokenText token={receivedToken(service)} name="Jeton reçu" />
        <Legend />
      </div>

      <details open>
        <summary style={{ ...label, cursor: "pointer" }}>Le code du {inSentence(name)}</summary>
        <div style={{ marginTop: 6 }}>
          <CodeBlock
            title={`Code du ${inSentence(name)}`}
            lines={SERVICE_CODE[service].vulnerable}
          />
        </div>
      </details>

      {service === "weak" ? (
        <Dictionary
          onFound={(word) => {
            edit({ signature: "hmac", secret: word });
          }}
        />
      ) : null}

      {asymmetric ? (
        <details open>
          <summary style={{ ...label, cursor: "pointer" }}>{publicKeyFacts(service).title}</summary>
          <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
            <ul
              style={{
                margin: 0,
                paddingLeft: 18,
                fontSize: 13,
                color: "var(--color-text-secondary)",
              }}
            >
              {publicKeyFacts(service).lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <pre
              aria-label="Clé publique du service (PEM)"
              tabIndex={0}
              style={{ ...field, margin: 0, overflowX: "auto" }}
            >
              {publicKeyPem(service)}
            </pre>
          </div>
        </details>
      ) : null}

      <div style={{ display: "grid", gap: 8 }}>
        <span style={label}>TON JETON</span>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={label}>En-tête (JSON)</span>
          <textarea
            value={draft.header}
            onChange={(event) => {
              edit({ header: event.target.value });
            }}
            aria-label="En-tête (JSON)"
            rows={2}
            spellCheck={false}
            style={{ ...field, resize: "vertical" }}
          />
        </label>
        {headerProblem !== null ? (
          <p style={{ margin: 0, color: RED, fontSize: 13 }}>{headerProblem}</p>
        ) : null}
        <label style={{ display: "grid", gap: 4 }}>
          <span style={label}>Charge utile (JSON)</span>
          <textarea
            value={draft.payload}
            onChange={(event) => {
              edit({ payload: event.target.value });
            }}
            aria-label="Charge utile (JSON)"
            rows={4}
            spellCheck={false}
            style={{ ...field, resize: "vertical" }}
          />
        </label>
        {payloadProblem !== null ? (
          <p style={{ margin: 0, color: RED, fontSize: 13 }}>{payloadProblem}</p>
        ) : null}

        <fieldset style={{ border: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
          <legend style={label}>Signature</legend>
          {SIGNATURE_CHOICES.map((choice) => (
            <label
              key={choice.kind}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                fontSize: 14,
                color: "var(--color-text-secondary)",
              }}
            >
              <input
                type="radio"
                name={`signature-${service}`}
                checked={draft.signature === choice.kind}
                onChange={() => {
                  edit({ signature: choice.kind });
                }}
              />
              {choice.text}
            </label>
          ))}
          <textarea
            value={draft.secret}
            onChange={(event) => {
              edit({ secret: event.target.value });
            }}
            disabled={draft.signature !== "hmac"}
            aria-label="Secret HMAC"
            placeholder="Le secret, tel quel"
            rows={asymmetric ? 3 : 1}
            spellCheck={false}
            style={{ ...field, resize: "vertical" }}
          />
          {asymmetric ? (
            <button
              type="button"
              onClick={() => {
                edit({ signature: "hmac", secret: publicKeyPem(service) });
              }}
              style={{ ...small, justifySelf: "start" }}
            >
              Prendre la clé publique du service comme secret
            </button>
          ) : null}
        </fieldset>

        <TokenText token={token} name="Ton jeton forgé" />
        <button type="button" onClick={send} style={{ ...primary, justifySelf: "start" }}>
          Envoyer au {inSentence(name)}
        </button>
      </div>

      {attempt !== undefined ? (
        <div style={{ display: "grid", gap: 8 }}>
          <VerdictView verdict={attempt.verdict} />
          {isForgery(attempt.verdict) ? (
            <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: ACCENT }}>
              ✓ Forgé : le {inSentence(name)} te prend pour un administrateur.
            </p>
          ) : (
            <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: 14 }}>
              <span style={{ color: RED }}>Pas encore.</span> Indice : {hint}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Dictionary({ onFound }: { onFound: (word: string) => void }): React.ReactElement {
  const token = receivedToken("weak");
  const [run, setRun] = useState<{ found: string | null; tried: number } | null>(null);
  const [word, setWord] = useState("");
  const tested = word === "" ? null : guessSecret(token, [word]).found;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <details>
        <summary style={{ ...label, cursor: "pointer" }}>
          Le dictionnaire ({String(WORDLIST.length)} mots)
        </summary>
        <p style={{ ...paragraph, fontFamily: MONO, fontSize: 12, marginTop: 6 }}>
          {WORDLIST.join(" · ")}
        </p>
      </details>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => {
            setRun(guessSecret(token, WORDLIST));
          }}
          style={primary}
        >
          Lancer le dictionnaire
        </button>
        <input
          value={word}
          onChange={(event) => {
            setWord(event.target.value);
          }}
          aria-label="Mot à essayer comme secret"
          placeholder="Ou un mot de ton choix"
          spellCheck={false}
          autoComplete="off"
          style={{ ...field, flex: "1 1 200px", width: "auto" }}
        />
      </div>
      <div aria-live="polite" style={{ display: "grid", gap: 6 }}>
        {run !== null ? (
          run.found !== null ? (
            <>
              <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: ACCENT }}>
                ✓ Secret trouvé : « {run.found} » à l&apos;essai {String(run.tried)} sur{" "}
                {String(WORDLIST.length)}. Chaque essai est un HMAC du jeton, comparé à sa
                signature.
              </p>
              <button
                type="button"
                onClick={() => {
                  onFound(run.found ?? "");
                }}
                style={{ ...small, justifySelf: "start" }}
              >
                Signer avec « {run.found} »
              </button>
            </>
          ) : (
            <p style={{ margin: 0, color: RED, fontSize: 13 }}>
              Aucun des {String(run.tried)} mots ne redonne la signature.
            </p>
          )
        ) : null}
        {tested !== null ? (
          <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: ACCENT }}>
            ✓ « {word} » redonne la signature du jeton : c&apos;est le secret.
          </p>
        ) : word !== "" ? (
          <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: 13 }}>
            « {word} » ne redonne pas la signature du jeton.
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ── step 5: the corrected services ───────────────────────────────────────────

interface Played {
  readonly token: string;
  readonly verdict: Verdict;
}

function FixedStep({
  levels,
  forged,
  onDone,
}: {
  levels: readonly JwtLevel[];
  forged: Partial<Record<ServiceId, string>>;
  onDone: () => void;
}): React.ReactElement {
  const replays = replaysFor(levels, forged);
  const [played, setPlayed] = useState<Partial<Record<string, Played>>>({});
  const services = [...new Set(replays.map((entry) => entry.service))];

  const holds = (entry: Replay, table: Partial<Record<string, Played>>): boolean => {
    const result = table[entry.key];
    return result?.token === entry.token && replayHolds(entry, result.verdict);
  };

  const play = (entry: Replay): void => {
    const next = { ...played, [entry.key]: { token: entry.token, verdict: replay(entry) } };
    setPlayed(next);
    if (replays.every((candidate) => holds(candidate, next))) onDone();
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 8 }}>
        {replays.map((entry) => {
          const result = played[entry.key];
          const current = result?.token === entry.token ? result : undefined;
          return (
            <div
              key={entry.key}
              style={{
                border: "1px solid var(--color-border-subtle)",
                padding: "10px 12px",
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
                <strong style={{ fontSize: 14, color: "var(--color-text-primary)" }}>
                  {entry.label}
                </strong>
                <span style={label}>
                  {entry.legit ? "jeton légitime" : entry.own ? "ton jeton" : "attaque type"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    play(entry);
                  }}
                  aria-label={`${entry.legit ? "Envoyer" : "Rejouer"} : ${entry.label}`}
                  style={{ ...primary, marginLeft: "auto" }}
                >
                  {entry.legit ? "Envoyer" : "Rejouer"}
                </button>
              </div>
              <details>
                <summary style={{ ...label, cursor: "pointer" }}>Le jeton envoyé</summary>
                <div style={{ marginTop: 6 }}>
                  <TokenText token={entry.token} name={`Jeton : ${entry.label}`} />
                </div>
              </details>
              {current !== undefined ? (
                <div style={{ display: "grid", gap: 6 }}>
                  <VerdictView verdict={current.verdict} />
                  <p
                    style={{
                      margin: 0,
                      fontFamily: MONO,
                      fontSize: 12,
                      color: replayHolds(entry, current.verdict) ? ACCENT : RED,
                    }}
                  >
                    {replayHolds(entry, current.verdict)
                      ? entry.legit
                        ? "✓ Accepté, comme il faut : la correction ne casse rien."
                        : "✓ Refusé, comme il faut."
                      : entry.legit
                        ? "Inattendu : le jeton légitime est refusé."
                        : "Inattendu : l'attaque passe encore."}
                  </p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {services.map((service) => (
        <details key={service}>
          <summary style={{ ...label, cursor: "pointer" }}>
            Le code corrigé du {inSentence(SERVICE_NAMES[service])}
          </summary>
          <div style={{ marginTop: 6 }}>
            <CodeBlock
              title={`Code corrigé du ${inSentence(SERVICE_NAMES[service])}`}
              lines={SERVICE_CODE[service].patched}
            />
          </div>
        </details>
      ))}
    </div>
  );
}

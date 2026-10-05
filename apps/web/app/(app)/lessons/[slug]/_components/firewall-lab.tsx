"use client";

import { ACCENT, AMBER, MONO, RED } from "@cyberlearn/ui";
import React, { useState } from "react";
import {
  decide,
  describePacket,
  describeVerdict,
  type Packet,
  parseRules,
  RULE_SYNTAX,
  satisfies,
  type Verdict,
} from "@cyberlearn/lib/network/firewall";
import { type FirewallProbe, parseFirewallLab } from "@cyberlearn/types";

/**
 * <FirewallLab>: the rules of a host firewall to write, and test packets that
 * go through them as the rules are typed. Each packet shows its verdict and
 * the rule that gave it; the lesson's packets say what should happen to them,
 * and the exercise is done when every one does. The learner can send packets
 * of their own too. Client-side because it answers keystrokes; nothing is sent
 * anywhere.
 */

const field: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #2A2560",
  background: "#0A0826",
  color: "#F5F5FA",
  fontFamily: MONO,
  fontSize: 13,
};

const small: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #2A2560",
  background: "transparent",
  color: "#B8B5D1",
  fontFamily: MONO,
  fontSize: 12,
  cursor: "pointer",
};

const verdictColor = (verdict: Verdict): string => (verdict === "accept" ? ACCENT : AMBER);

const packetOf = (probe: FirewallProbe): Packet => ({
  proto: probe.proto,
  from: probe.from,
  ...(probe.port === undefined ? {} : { port: probe.port }),
  state: probe.state,
});

export function FirewallLab(props: Record<string, unknown>): React.ReactElement {
  const parsed = parseFirewallLab(props);
  const [typed, setTyped] = useState<string | null>(null);
  const [extra, setExtra] = useState<Packet[]>([]);
  const [draft, setDraft] = useState({
    proto: "tcp" as Packet["proto"],
    from: "198.51.100.7",
    port: "22",
  });
  const [draftProblem, setDraftProblem] = useState<string | null>(null);

  if (!parsed.ok) {
    return (
      <div
        role="note"
        style={{
          margin: "24px 0",
          padding: "14px 16px",
          border: `1px solid ${RED}`,
          color: "#B8B5D1",
          fontSize: 14,
        }}
      >
        Exercice « Pare-feu » indisponible : {parsed.problem}
      </div>
    );
  }
  const lab = parsed.value;
  const text = typed ?? lab.rules;
  const rules = parseRules(text);
  const ruleset = rules.ok ? rules.ruleset : null;
  const results = lab.probes.map((probe) => {
    const packet = packetOf(probe);
    const decision = ruleset === null ? null : decide(ruleset, packet);
    return {
      probe,
      packet,
      decision,
      ok: decision !== null && satisfies(decision.verdict, probe.expect),
    };
  });
  const right = results.filter((r) => r.ok).length;
  const done = ruleset !== null && right === results.length;

  const byWhom = (by: number | null): string => {
    if (ruleset === null) return "";
    if (by === null) return `par la politique ${ruleset.policy}`;
    const rule = ruleset.rules[by];
    return rule === undefined ? "" : `par la règle de la ligne ${String(rule.line)} : ${rule.text}`;
  };

  const sendDraft = (): void => {
    const port = Number(draft.port);
    if (
      draft.proto !== "icmp" &&
      (draft.port.trim() === "" || !Number.isInteger(port) || port < 0 || port > 65535)
    ) {
      setDraftProblem("Le port est un nombre de 0 à 65535.");
      return;
    }
    if (!/^\d{1,3}(?:\.\d{1,3}){3}$/u.test(draft.from.trim())) {
      setDraftProblem("L'adresse source s'écrit en quatre nombres : 198.51.100.7.");
      return;
    }
    setDraftProblem(null);
    setExtra([
      ...extra,
      {
        proto: draft.proto,
        from: draft.from.trim(),
        ...(draft.proto === "icmp" ? {} : { port }),
        state: "new",
      },
    ]);
  };

  return (
    <section
      className="card card--sunken"
      aria-label={`Pare-feu${lab.title ? ` : ${lab.title}` : ""}`}
      style={{
        margin: "28px 0",
        borderTop: `2px solid ${ACCENT}`,
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid #1F1B47",
          display: "flex",
          gap: 10,
          alignItems: "baseline",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: ACCENT }}>
          PARE-FEU
        </span>
        {lab.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{lab.title}</span>
        ) : null}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: MONO,
            fontSize: 12,
            color: done ? ACCENT : "#7F7BA9",
          }}
        >
          {String(right)} / {String(results.length)} paquets font ce qu&apos;il faut
        </span>
      </header>

      <div style={{ padding: "12px 16px 16px", display: "grid", gap: 12 }}>
        <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>{lab.task}</p>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 11, color: "#7F7BA9" }}>
              RÈGLES DE LA CHAÎNE D&apos;ENTRÉE
            </span>
            <button
              type="button"
              onClick={() => {
                setTyped(null);
              }}
              disabled={text === lab.rules}
              style={{ ...small, marginLeft: "auto", opacity: text === lab.rules ? 0.5 : 1 }}
            >
              Remettre les règles d&apos;origine
            </button>
          </div>
          <textarea
            value={text}
            onChange={(event) => {
              setTyped(event.target.value);
            }}
            aria-label="Règles du pare-feu"
            rows={Math.min(14, Math.max(5, text.split("\n").length + 1))}
            spellCheck={false}
            style={{ ...field, resize: "vertical", lineHeight: 1.6 }}
          />
          {rules.ok ? null : (
            <p role="alert" style={{ margin: 0, color: RED, fontSize: 14 }}>
              Ligne {String(rules.line)} : {rules.problem}
            </p>
          )}
          <details style={{ fontSize: 13, color: "#B8B5D1" }}>
            <summary style={{ cursor: "pointer" }}>Comment écrire une règle</summary>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "grid", gap: 4 }}>
              {RULE_SYNTAX.map((line) => (
                <li key={line} style={{ fontFamily: MONO, fontSize: 12 }}>
                  {line}
                </li>
              ))}
            </ul>
          </details>
        </div>

        <ul
          aria-label="Paquets de test"
          style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}
        >
          {results.map(({ probe, packet, decision, ok }) => (
            <li
              key={probe.label}
              style={{
                display: "grid",
                gap: 2,
                padding: "8px 10px",
                border: `1px solid ${ok ? ACCENT : "#2A2560"}`,
                background: ok
                  ? "color-mix(in srgb, var(--cosmetic-accent, #0AFFD4) 8%, transparent)"
                  : "transparent",
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                <span
                  style={{ fontFamily: MONO, color: ok ? ACCENT : RED }}
                  aria-label={ok ? "comme attendu" : "pas comme attendu"}
                >
                  {ok ? "✓" : "✗"}
                </span>
                <span style={{ color: "#F5F5FA", fontSize: 14, fontWeight: 600 }}>
                  {probe.label}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 12, color: "#7F7BA9" }}>
                  {probe.expect === "accept" ? "doit passer" : "doit être bloqué"}
                </span>
              </div>
              <div style={{ fontFamily: MONO, fontSize: 12, color: "#B8B5D1" }}>
                {describePacket(packet)}
              </div>
              {decision === null ? (
                <div style={{ fontSize: 13, color: "#7F7BA9" }}>En attente de règles lisibles.</div>
              ) : (
                <div style={{ fontSize: 13, color: "#B8B5D1" }}>
                  <strong style={{ color: verdictColor(decision.verdict) }}>
                    {describeVerdict(decision.verdict)}
                  </strong>{" "}
                  {byWhom(decision.by)}
                </div>
              )}
            </li>
          ))}
        </ul>

        <div style={{ borderTop: "1px solid #1F1B47", paddingTop: 10, display: "grid", gap: 8 }}>
          <span style={{ fontFamily: MONO, fontSize: 11, color: "#7F7BA9" }}>
            ESSAYER UN PAQUET
          </span>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendDraft();
            }}
            style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
          >
            <select
              value={draft.proto}
              onChange={(event) => {
                const proto =
                  event.target.value === "udp"
                    ? "udp"
                    : event.target.value === "icmp"
                      ? "icmp"
                      : "tcp";
                setDraft({ ...draft, proto });
              }}
              aria-label="Protocole"
              style={field}
            >
              <option value="tcp">tcp</option>
              <option value="udp">udp</option>
              <option value="icmp">icmp</option>
            </select>
            <input
              value={draft.from}
              onChange={(event) => {
                setDraft({ ...draft, from: event.target.value });
              }}
              aria-label="Adresse source"
              placeholder="198.51.100.7"
              spellCheck={false}
              style={{ ...field, width: 150 }}
            />
            {draft.proto === "icmp" ? null : (
              <input
                value={draft.port}
                onChange={(event) => {
                  setDraft({ ...draft, port: event.target.value });
                }}
                aria-label="Port de destination"
                placeholder="22"
                inputMode="numeric"
                style={{ ...field, width: 80 }}
              />
            )}
            <button
              type="submit"
              style={{ ...small, border: `1px solid ${ACCENT}`, color: ACCENT }}
            >
              Envoyer
            </button>
          </form>
          {draftProblem !== null ? (
            <p style={{ margin: 0, color: RED, fontSize: 14 }}>{draftProblem}</p>
          ) : null}
          {extra.length > 0 ? (
            <ul
              aria-label="Tes paquets"
              style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}
            >
              {extra.map((packet, i) => {
                const decision = ruleset === null ? null : decide(ruleset, packet);
                return (
                  <li
                    key={`${describePacket(packet)}-${String(i)}`}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "baseline",
                      flexWrap: "wrap",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: 12, color: "#B8B5D1" }}>
                      {describePacket(packet)}
                    </span>
                    {decision === null ? null : (
                      <span style={{ color: "#B8B5D1" }}>
                        <strong style={{ color: verdictColor(decision.verdict) }}>
                          {describeVerdict(decision.verdict)}
                        </strong>{" "}
                        {byWhom(decision.by)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setExtra(extra.filter((_, k) => k !== i));
                      }}
                      aria-label={`Retirer : ${describePacket(packet)}`}
                      style={{ ...small, padding: "2px 8px" }}
                    >
                      Retirer
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div aria-live="polite">
          {done ? (
            <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: ACCENT }}>
              ✓ Pare-feu réglé : chaque paquet de test fait ce qu&apos;il faut.
            </p>
          ) : null}
        </div>

        {lab.hints && lab.hints.length > 0 ? (
          <details style={{ borderTop: "1px solid #1F1B47", paddingTop: 10 }}>
            <summary
              style={{ cursor: "pointer", fontFamily: MONO, fontSize: 12, color: "#B8B5D1" }}
            >
              Indices ({String(lab.hints.length)})
            </summary>
            <ol
              style={{
                margin: "8px 0 0",
                paddingLeft: 20,
                color: "#B8B5D1",
                fontSize: 14,
                display: "grid",
                gap: 4,
              }}
            >
              {lab.hints.map((hint) => (
                <li key={hint}>{hint}</li>
              ))}
            </ol>
          </details>
        ) : null}
      </div>
    </section>
  );
}

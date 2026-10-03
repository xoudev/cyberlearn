"use client";

import React, { useState } from "react";
import { parsePhishingEmail, phishingPartLabel } from "@cyberlearn/types";

/**
 * <PhishingEmail>: a message laid out as a mail client lays it out, in which
 * the learner reports what gives it away by clicking it: the sender, the
 * subject, a paragraph, the link, the attachment. Client-side because it
 * answers clicks; nothing is sent anywhere.
 *
 * A suspicious part, once clicked, stays marked and its reason is listed under
 * the message; a harmless one says so. As in a real client, the link's true
 * address shows on hover or focus, under the message. After three harmless
 * clicks the learner may ask to see the clues.
 */

const RED = "#FF4757";
const ACCENT = "var(--cosmetic-accent, #0AFFD4)";

type PartStatus = "open" | "suspect" | "harmless";

export function PhishingEmail(props: Record<string, unknown>): React.ReactElement {
  const parsed = parsePhishingEmail(props);
  const [found, setFound] = useState<string[]>([]);
  const [harmless, setHarmless] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [lastHarmless, setLastHarmless] = useState<string | null>(null);
  const [linkShown, setLinkShown] = useState(false);

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
        Exercice « Boîte mail piégée » indisponible : {parsed.problem}
      </div>
    );
  }

  const mail = parsed.mail;
  const clueParts = mail.clues.map((c) => c.part);
  const done = revealed || clueParts.every((p) => found.includes(p));

  const report = (part: string): void => {
    if (done) return;
    if (clueParts.includes(part)) {
      if (!found.includes(part)) setFound([...found, part]);
      setLastHarmless(null);
    } else {
      if (!harmless.includes(part)) setHarmless([...harmless, part]);
      setLastHarmless(part);
    }
  };
  const restart = (): void => {
    setFound([]);
    setHarmless([]);
    setRevealed(false);
    setLastHarmless(null);
  };
  const statusOf = (part: string): PartStatus => {
    if (clueParts.includes(part) && (found.includes(part) || revealed)) return "suspect";
    if (harmless.includes(part)) return "harmless";
    return "open";
  };
  const shared = { done, onReport: report };
  const shownClues = mail.clues.filter((c) => found.includes(c.part) || revealed);

  return (
    <section
      aria-label={`Boîte mail piégée${mail.title ? ` : ${mail.title}` : ""}`}
      style={{
        margin: "28px 0",
        border: "1px solid #1F1B47",
        borderTop: `2px solid ${ACCENT}`,
        background: "#05041A",
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
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.16em",
            color: ACCENT,
          }}
        >
          BOÎTE MAIL PIÉGÉE
        </span>
        {mail.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{mail.title}</span>
        ) : null}
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 12,
            color: done ? ACCENT : "#7F7BA9",
          }}
        >
          {String(found.length)} / {String(clueParts.length)} indices
        </span>
      </header>

      <p style={{ margin: 0, padding: "12px 16px 0", color: "#B8B5D1", fontSize: 14 }}>
        Clique sur chaque élément qui te paraît suspect. Survole le lien pour voir où il mène.
      </p>

      <div
        style={{
          margin: "12px 16px",
          border: "1px solid #1F1B47",
          background: "#0A0826",
          color: "#D8D6EA",
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        <div
          style={{
            padding: "8px 6px",
            borderBottom: "1px solid #1F1B47",
            display: "grid",
            gap: 2,
          }}
        >
          <PartButton part="sender" status={statusOf("sender")} {...shared}>
            <span style={{ color: "#7F7BA9" }}>De : </span>
            <strong style={{ color: "#F5F5FA" }}>{mail.fromName}</strong>{" "}
            <span style={{ color: "#B8B5D1" }}>&lt;{mail.fromAddress}&gt;</span>
          </PartButton>
          <PartButton part="subject" status={statusOf("subject")} {...shared}>
            <span style={{ color: "#7F7BA9" }}>Objet : </span>
            <strong style={{ color: "#F5F5FA" }}>{mail.subject}</strong>
          </PartButton>
        </div>

        <div style={{ padding: "8px 6px", display: "grid", gap: 4 }}>
          {mail.body.map((paragraph, i) => {
            const part = `body-${String(i + 1)}`;
            return (
              <PartButton key={part} part={part} status={statusOf(part)} {...shared}>
                {paragraph}
              </PartButton>
            );
          })}
          {mail.linkText !== undefined ? (
            <div
              onMouseEnter={() => {
                setLinkShown(true);
              }}
              onMouseLeave={() => {
                setLinkShown(false);
              }}
              onFocus={() => {
                setLinkShown(true);
              }}
              onBlur={() => {
                setLinkShown(false);
              }}
              style={{ padding: "6px 0" }}
            >
              <PartButton part="link" status={statusOf("link")} inline {...shared}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    background: "#0024FF",
                    color: "#FFFFFF",
                    fontWeight: 600,
                  }}
                >
                  {mail.linkText}
                </span>
              </PartButton>
            </div>
          ) : null}
          {mail.attachment !== undefined ? (
            <PartButton part="attachment" status={statusOf("attachment")} inline {...shared}>
              <span
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  padding: "4px 10px",
                  border: "1px solid #2A2560",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                }}
              >
                <span aria-hidden="true">📎</span>
                {mail.attachment}
              </span>
            </PartButton>
          ) : null}
        </div>

        {mail.linkUrl !== undefined ? (
          <div
            aria-live="polite"
            style={{
              minHeight: 26,
              padding: "4px 12px",
              borderTop: "1px solid #1F1B47",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              color: "#7F7BA9",
              overflowWrap: "anywhere",
            }}
          >
            {linkShown ? `Lien vers : ${mail.linkUrl}` : null}
          </div>
        ) : null}
      </div>

      <div aria-live="polite" style={{ padding: "0 16px 16px", display: "grid", gap: 10 }}>
        {lastHarmless !== null && !done ? (
          <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>
            {phishingPartLabel(lastHarmless)} : rien d&apos;anormal ici.
          </p>
        ) : null}

        {shownClues.length > 0 ? (
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
            {shownClues.map((clue) => (
              <li key={clue.part} style={{ color: "#B8B5D1", fontSize: 14, lineHeight: 1.6 }}>
                <strong style={{ color: RED }}>⚑ {phishingPartLabel(clue.part)}</strong> :{" "}
                {clue.why}
              </li>
            ))}
          </ul>
        ) : null}

        {done ? (
          <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14, lineHeight: 1.6 }}>
            <strong style={{ color: ACCENT }}>
              {found.length < clueParts.length ? "Les indices." : "Tout trouvé."}
            </strong>{" "}
            {mail.conclusion ?? "Ne clique sur rien : signale le message, puis supprime-le."}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!done && harmless.length >= 3 ? (
            <button
              type="button"
              onClick={() => {
                setRevealed(true);
              }}
              style={SMALL_BUTTON}
            >
              Montrer les indices
            </button>
          ) : null}
          {done ? (
            <button type="button" onClick={restart} style={SMALL_BUTTON}>
              Recommencer
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/** A reportable part of the message: a button that shows what was decided about it. */
function PartButton({
  part,
  status,
  done,
  inline,
  onReport,
  children,
}: {
  part: string;
  status: PartStatus;
  done: boolean;
  inline?: boolean;
  onReport: (part: string) => void;
  children: React.ReactNode;
}): React.ReactElement {
  const suspect = status === "suspect";
  return (
    <button
      type="button"
      onClick={() => {
        onReport(part);
      }}
      disabled={done}
      className="phishing-email__part"
      style={{
        display: inline ? "inline-block" : "block",
        width: inline ? "auto" : "100%",
        margin: 0,
        padding: "6px 10px",
        border: `1px solid ${suspect ? RED : "transparent"}`,
        background: suspect ? "rgba(255, 71, 87, 0.10)" : "transparent",
        color: status === "harmless" ? "#7F7BA9" : "inherit",
        font: "inherit",
        textAlign: "left",
        cursor: done ? "default" : "pointer",
      }}
    >
      {children}
      {suspect ? (
        <span aria-hidden="true" style={{ color: RED, marginLeft: 8, fontSize: 12 }}>
          ⚑
        </span>
      ) : null}
      {/* The state, for a screen reader: the button's own text stays what it reads. */}
      {suspect ? <span className="sr-only"> (signalé comme suspect)</span> : null}
      {status === "harmless" ? <span className="sr-only"> (rien d&apos;anormal)</span> : null}
    </button>
  );
}

const SMALL_BUTTON: React.CSSProperties = {
  padding: "6px 12px",
  border: "1px solid #2A2560",
  background: "transparent",
  color: "#B8B5D1",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 12,
  cursor: "pointer",
};

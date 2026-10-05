"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { parsePhpLab, type PhpRequestInput, phpLabFiles } from "@cyberlearn/types";
import { describeFinding } from "@/lib/php/executable";
import {
  checkExpectation,
  executableIn,
  headerValue,
  isHtml,
  type PhpResponse,
} from "@/lib/php/expect";
import { previewDocument } from "@/lib/php/preview";
import { type PhpOutcome, PhpSandbox } from "@/lib/php/sandbox";
import type { WorkerLike } from "@/lib/sql/sandbox";

/**
 * <PhpLab>: a small web page in real PHP that the learner attacks with a
 * request, then fixes by editing its code. PHP runs in a Web Worker of the
 * learner's browser (@/lib/php/sandbox), one fresh PHP per request, with no
 * way out: nothing is sent anywhere, and nothing runs but the lab's own pages.
 * Client-side because the PHP, the editor and the answer all live in the
 * learner's browser; the runtime (13 MB) is fetched on the first request, not
 * when the page opens.
 *
 * The answer is shown as a browser would draw it, in a frame that can do
 * nothing (no script, no form, a world of its own), next to its source. That
 * the injected code would have run is told by reading the answer with the
 * HTML parser, not by running it.
 */

const RED = "#FF4757";
const AMBER = "#FFB020";
const ACCENT = "var(--cosmetic-accent, #0AFFD4)";
const MONO = "var(--font-mono, monospace)";

type Verdict = { ok: true } | { ok: false; reason: string };

function matches(
  when: { url?: string | undefined; cookie?: string | undefined } | undefined,
  request: PhpRequestInput,
): boolean {
  return (
    (when?.url === undefined || request.url.includes(when.url)) &&
    (when?.cookie === undefined || (request.cookie ?? "").includes(when.cookie))
  );
}

function statusColor(status: number): string {
  if (status >= 500) return RED;
  if (status >= 400) return AMBER;
  return ACCENT;
}

export function PhpLab(
  props: Record<string, unknown> & { createWorker?: () => WorkerLike },
): React.ReactElement {
  const { createWorker, ...raw } = props;
  const parsed = parsePhpLab(raw);
  const first = parsed.ok ? parsed.value.requests?.[0] : undefined;
  const [code, setCode] = useState(parsed.ok ? parsed.value.code : "");
  const [openFile, setOpenFile] = useState<string | null>(null);
  const [method, setMethod] = useState<"GET" | "POST">(first?.method ?? "GET");
  const [url, setUrl] = useState(first?.url ?? (parsed.ok ? `/${parsed.value.file}` : "/"));
  const [cookie, setCookie] = useState(first?.cookie ?? "");
  const [body, setBody] = useState(first?.body ?? "");
  const [running, setRunning] = useState(false);
  const [outcome, setOutcome] = useState<PhpOutcome | null>(null);
  const [view, setView] = useState<"preview" | "source">("preview");
  const [seen, setSeen] = useState<string[]>([]);
  const [verification, setVerification] = useState<Record<string, Verdict> | null>(null);
  const [verifying, setVerifying] = useState(false);
  const sandbox = useRef<PhpSandbox | null>(null);

  useEffect(
    () => () => {
      sandbox.current?.reset();
    },
    [],
  );

  const response: PhpResponse | null = outcome?.ok === true ? outcome.response : null;
  const findings = useMemo(() => (response === null ? [] : executableIn(response)), [response]);

  if (!parsed.ok) {
    return (
      <div
        role="note"
        style={{ margin: "24px 0", padding: "14px 16px", border: `1px solid ${RED}` }}
      >
        Laboratoire PHP indisponible : {parsed.problem}
      </div>
    );
  }
  const lab = parsed.value;
  const checks = lab.checks ?? [];
  const support = lab.support ?? {};
  const pages = [lab.file, ...Object.keys(support)];
  const shown = openFile ?? lab.file;
  const editing = shown === lab.file;

  const server = (): PhpSandbox => {
    sandbox.current ??= new PhpSandbox(createWorker);
    return sandbox.current;
  };

  const send = async (request: PhpRequestInput): Promise<void> => {
    if (running || verifying) return;
    setRunning(true);
    const result = await server().request(phpLabFiles(lab, code), request);
    setRunning(false);
    setOutcome(result);
    if (!result.ok) return;
    setSeen((current) => {
      const next = new Set(current);
      for (const check of checks) {
        if (check.kind !== "seen" || next.has(check.label) || !matches(check.when, request))
          continue;
        if (checkExpectation(check.expect, result.response).ok) next.add(check.label);
      }
      return [...next];
    });
  };

  const typed = (): PhpRequestInput => ({
    method,
    url,
    ...(cookie.trim() === "" ? {} : { cookie: cookie.trim() }),
    ...(method === "POST" && body !== "" ? { body } : {}),
  });

  const verify = async (): Promise<void> => {
    if (running || verifying) return;
    setVerifying(true);
    const results: Record<string, Verdict> = {};
    for (const check of checks) {
      if (check.kind !== "fixed") continue;
      const answered = await server().request(phpLabFiles(lab, code), check.request);
      results[check.label] = answered.ok
        ? checkExpectation(check.expect, answered.response)
        : { ok: false, reason: answered.error };
    }
    setVerification(results);
    setVerifying(false);
  };

  const verdictOf = (label: string, kind: "seen" | "fixed"): Verdict | null => {
    if (kind === "seen") return seen.includes(label) ? { ok: true } : null;
    return verification?.[label] ?? null;
  };
  const done =
    checks.length > 0 && checks.every((check) => verdictOf(check.label, check.kind)?.ok === true);
  const hasFixed = checks.some((check) => check.kind === "fixed");

  return (
    <section
      className="card card--sunken"
      aria-label={`Laboratoire PHP${lab.title ? ` : ${lab.title}` : ""}`}
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
          PHP · VRAI SERVEUR
        </span>
        {lab.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{lab.title}</span>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setCode(lab.code);
            setVerification(null);
          }}
          disabled={code === lab.code}
          style={{ ...smallButton, marginLeft: "auto" }}
        >
          Remettre le code d&apos;origine
        </button>
      </header>

      <div style={{ padding: "12px 16px", display: "grid", gap: 14 }}>
        <p style={{ margin: 0, color: "#B8B5D1", fontSize: 14 }}>{lab.task}</p>

        <div style={{ display: "grid", gap: 6 }}>
          {pages.length > 1 ? (
            <div
              role="group"
              aria-label="Pages du serveur"
              style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
            >
              {pages.map((page) => (
                <button
                  key={page}
                  type="button"
                  aria-pressed={page === shown}
                  onClick={() => {
                    setOpenFile(page);
                  }}
                  style={{
                    ...smallButton,
                    color: page === shown ? "#030219" : "#B8B5D1",
                    background: page === shown ? ACCENT : "transparent",
                    borderColor: page === shown ? ACCENT : "#2A2560",
                  }}
                >
                  {page}
                  {page === lab.file ? " · à corriger" : ""}
                </button>
              ))}
            </div>
          ) : null}
          {editing ? (
            <textarea
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setVerification(null);
              }}
              rows={Math.min(26, Math.max(8, code.split("\n").length + 1))}
              spellCheck={false}
              aria-label={`Code PHP de ${lab.file}`}
              style={{ ...codeBox, resize: "vertical" }}
            />
          ) : (
            <pre
              tabIndex={0}
              aria-label={`Code PHP de ${shown}, en lecture seule`}
              style={{ ...codeBox, margin: 0, overflow: "auto", whiteSpace: "pre" }}
            >
              {support[shown]}
            </pre>
          )}
        </div>

        <div style={{ display: "grid", gap: 8 }}>
          {lab.requests !== undefined && lab.requests.length > 0 ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontFamily: MONO, fontSize: 11, color: "#7F7BA9" }}>
                REQUÊTES TOUTES FAITES
              </span>
              {lab.requests.map((shortcut) => (
                <button
                  key={shortcut.label}
                  type="button"
                  disabled={running || verifying}
                  onClick={() => {
                    setMethod(shortcut.method);
                    setUrl(shortcut.url);
                    setCookie(shortcut.cookie ?? "");
                    setBody(shortcut.body ?? "");
                    void send({
                      method: shortcut.method,
                      url: shortcut.url,
                      ...(shortcut.cookie ? { cookie: shortcut.cookie } : {}),
                      ...(shortcut.body ? { body: shortcut.body } : {}),
                    });
                  }}
                  style={smallButton}
                >
                  {shortcut.label}
                </button>
              ))}
            </div>
          ) : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(typed());
            }}
            style={{ display: "grid", gap: 8 }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <select
                value={method}
                onChange={(event) => {
                  setMethod(event.target.value === "POST" ? "POST" : "GET");
                }}
                aria-label="Méthode"
                style={{ ...field, width: "auto" }}
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
              <input
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                }}
                aria-label="Adresse de la requête"
                placeholder="/page.php?q=php"
                spellCheck={false}
                style={{ ...field, flex: "1 1 260px", minWidth: 0 }}
              />
              <button
                type="submit"
                disabled={running || verifying || url.trim() === ""}
                style={primaryButton}
              >
                {running ? "Envoi…" : "Envoyer"}
              </button>
            </div>
            <input
              value={cookie}
              onChange={(event) => {
                setCookie(event.target.value);
              }}
              aria-label="Cookie de la requête"
              placeholder="Cookie : session=…  (facultatif)"
              spellCheck={false}
              style={field}
            />
            {method === "POST" ? (
              <textarea
                value={body}
                onChange={(event) => {
                  setBody(event.target.value);
                }}
                aria-label="Corps de la requête"
                placeholder="Corps : nom=valeur&autre=valeur"
                rows={2}
                spellCheck={false}
                style={field}
              />
            ) : null}
          </form>
        </div>

        <div aria-live="polite" style={{ display: "grid", gap: 8 }}>
          {outcome?.ok === false ? (
            <p role="alert" style={{ margin: 0, color: RED, fontSize: 14 }}>
              {outcome.error}
            </p>
          ) : null}
          {response !== null ? (
            <>
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <strong
                  style={{ fontFamily: MONO, fontSize: 13, color: statusColor(response.status) }}
                >
                  HTTP {String(response.status)}
                </strong>
                {headerValue(response, "location") !== null ? (
                  <span style={{ fontFamily: MONO, fontSize: 12, color: "#B8B5D1" }}>
                    → {headerValue(response, "location")}
                  </span>
                ) : null}
                <details style={{ fontSize: 12, color: "#B8B5D1" }}>
                  <summary style={{ cursor: "pointer" }}>
                    En-têtes ({String(response.headers.length)})
                  </summary>
                  <pre style={{ margin: "6px 0 0", fontFamily: MONO, whiteSpace: "pre-wrap" }}>
                    {response.headers.join("\n") || "(aucun)"}
                  </pre>
                </details>
                <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                  {(["preview", "source"] as const).map((which) => (
                    <button
                      key={which}
                      type="button"
                      aria-pressed={view === which}
                      onClick={() => {
                        setView(which);
                      }}
                      style={{
                        ...smallButton,
                        color: view === which ? "#030219" : "#B8B5D1",
                        background: view === which ? ACCENT : "transparent",
                        borderColor: view === which ? ACCENT : "#2A2560",
                      }}
                    >
                      {which === "preview" ? "Aperçu" : "Source"}
                    </button>
                  ))}
                </span>
              </div>
              {findings.length > 0 ? (
                <p
                  style={{
                    margin: 0,
                    padding: "8px 12px",
                    border: `1px solid ${AMBER}`,
                    color: AMBER,
                    fontSize: 14,
                  }}
                >
                  ⚠ Le navigateur exécuterait du code qui vient de la requête :{" "}
                  {findings.map(describeFinding).join(", ")}. L&apos;aperçu ci-dessous ne
                  l&apos;exécute pas.
                </p>
              ) : null}
              {view === "preview" && isHtml(response) ? (
                <iframe
                  title="Aperçu de la page"
                  sandbox=""
                  referrerPolicy="no-referrer"
                  srcDoc={previewDocument(response.body)}
                  style={{
                    width: "100%",
                    height: 220,
                    border: "1px solid #1F1B47",
                    background: "#FFFFFF",
                  }}
                />
              ) : (
                <pre
                  tabIndex={0}
                  aria-label="Source de la réponse"
                  style={{
                    ...codeBox,
                    margin: 0,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    maxHeight: 260,
                  }}
                >
                  {response.body === "" ? "(réponse vide)" : response.body}
                </pre>
              )}
            </>
          ) : null}
        </div>

        {checks.length > 0 ? (
          <div style={{ borderTop: "1px solid #1F1B47", paddingTop: 10, display: "grid", gap: 8 }}>
            <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
              {checks.map((check) => {
                const verdict = verdictOf(check.label, check.kind);
                return (
                  <li key={check.label} style={{ fontFamily: MONO, fontSize: 12 }}>
                    <span
                      style={{ color: verdict === null ? "#6B6890" : verdict.ok ? ACCENT : RED }}
                    >
                      {verdict === null ? "○" : verdict.ok ? "✓" : "✗"} {check.label}
                    </span>
                    {verdict !== null && !verdict.ok ? (
                      <span style={{ display: "block", color: "#B8B5D1", paddingLeft: 16 }}>
                        {verdict.reason}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {hasFixed ? (
              <button
                type="button"
                onClick={() => void verify()}
                disabled={running || verifying}
                style={{ ...primaryButton, justifySelf: "start" }}
              >
                {verifying ? "Vérification…" : "Vérifier mon correctif"}
              </button>
            ) : null}
            <div aria-live="polite">
              {done ? (
                <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: ACCENT }}>
                  ✓ Exercice complété : tout ce qui était demandé est fait.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {lab.hints && lab.hints.length > 0 ? (
          <details style={{ borderTop: "1px solid #1F1B47", paddingTop: 10 }}>
            <summary
              style={{
                cursor: "pointer",
                fontFamily: MONO,
                fontSize: 10,
                color: ACCENT,
                letterSpacing: "0.18em",
                fontWeight: 600,
              }}
            >
              INDICES ({String(lab.hints.length)})
            </summary>
            <ol style={{ margin: "10px 0 0", paddingLeft: 22, display: "grid", gap: 6 }}>
              {lab.hints.map((hint) => (
                <li
                  key={hint}
                  style={{ fontFamily: MONO, fontSize: 12, color: "#B8B5D1", lineHeight: 1.55 }}
                >
                  {hint}
                </li>
              ))}
            </ol>
          </details>
        ) : null}
      </div>
    </section>
  );
}

const field: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  background: "#0A0826",
  border: "1px solid #2A2560",
  color: "#D8D6EA",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 13,
};

const codeBox: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "#030219",
  border: "1px solid #2A2560",
  color: "#D8D6EA",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 12.5,
  lineHeight: 1.6,
  tabSize: 4,
};

const primaryButton: React.CSSProperties = {
  padding: "7px 16px",
  border: "none",
  background: "var(--cosmetic-accent, #0AFFD4)",
  color: "#030219",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

const smallButton: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #2A2560",
  background: "transparent",
  color: "#B8B5D1",
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 12,
  cursor: "pointer",
};

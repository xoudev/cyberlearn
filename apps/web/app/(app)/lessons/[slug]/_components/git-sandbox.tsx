"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { checkHolds } from "@cyberlearn/lib/git/checks";
import { DEFAULT_GEOMETRY, layoutGraph } from "@cyberlearn/lib/git/graph";
import { type GitState, promptOf, run, runSetup, statusOf } from "@cyberlearn/lib/git/sandbox";
import { parseGitSandbox } from "@cyberlearn/types";

/**
 * <GitSandbox>: a Git repository simulated in the page, a terminal to drive
 * it, and the branch graph drawn as the learner types. Client-side because
 * the repository lives in the learner's browser, command after command; the
 * engine (@cyberlearn/lib/git) is the one the app runs too.
 */

const RED = "#FF4757";
const ACCENT = "var(--cosmetic-accent, #0AFFD4)";
const LANE_COLORS = [ACCENT, "#7B61FF", "#FFB020", "#FF6BCB", "#4DA3FF"];
const MONO = "var(--font-mono, monospace)";

interface Entry {
  readonly key: number;
  readonly prompt: string;
  readonly line: string;
  readonly output: string;
  readonly ok: boolean;
}

function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length] ?? ACCENT;
}

/** The files as `git status --short` writes them: two columns, then the path. */
function shortStatus(state: GitState): { code: string; path: string }[] {
  const s = statusOf(state);
  const rows = new Map<string, [string, string]>();
  const letter = { "new file": "A", modified: "M", deleted: "D" } as const;
  for (const f of s.staged) rows.set(f.path, [letter[f.kind], " "]);
  for (const f of s.unstaged) {
    rows.set(f.path, [rows.get(f.path)?.[0] ?? " ", letter[f.kind]]);
  }
  for (const p of s.untracked) rows.set(p, ["?", "?"]);
  for (const p of s.unmerged) rows.set(p, ["U", "U"]);
  return [...rows.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([path, [x, y]]) => ({ code: `${x}${y}`, path }));
}

function GitGraph({ state }: { state: GitState }): React.ReactElement {
  const layout = useMemo(() => layoutGraph(state), [state]);
  const { rowHeight } = DEFAULT_GEOMETRY;
  if (layout.rows.length === 0) {
    return (
      <p style={{ margin: 0, color: "#5A5680", fontSize: 13, fontFamily: MONO }}>
        {state.initialized ? "Pas encore de commit." : "Pas encore de dépôt : git init."}
      </p>
    );
  }
  return (
    <div
      style={{ position: "relative", height: layout.height, minWidth: layout.width + 220 }}
      role="img"
      aria-label={`Graphe des commits : ${layout.rows
        .map((r) => `${r.message}${r.branches.length > 0 ? ` (${r.branches.join(", ")})` : ""}`)
        .join(", puis ")}`}
    >
      <svg
        width={layout.width}
        height={layout.height}
        style={{ position: "absolute", left: 0, top: 0 }}
        aria-hidden="true"
      >
        {layout.edges.map((edge) => (
          <path
            key={edge.d}
            d={edge.d}
            fill="none"
            stroke={laneColor(edge.lane)}
            strokeWidth={2}
            opacity={0.85}
          />
        ))}
        {layout.rows.map((row) => (
          <circle
            key={row.id}
            cx={row.x}
            cy={row.y}
            r={row.merge ? 6 : 5}
            fill={row.head ? laneColor(row.lane) : "#05041A"}
            stroke={laneColor(row.lane)}
            strokeWidth={2}
          />
        ))}
      </svg>
      {layout.rows.map((row) => (
        <div
          key={row.id}
          aria-hidden="true"
          style={{
            position: "absolute",
            left: layout.width + 4,
            top: row.y - rowHeight / 2,
            height: rowHeight,
            right: 0,
            display: "flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
            fontSize: 12.5,
          }}
        >
          <span style={{ fontFamily: MONO, color: "#5A5680" }}>{row.id}</span>
          {row.branches.map((name, i) => (
            <span
              key={name}
              style={{
                fontFamily: MONO,
                fontSize: 11,
                padding: "1px 6px",
                border: `1px solid ${row.head && i === 0 ? ACCENT : "#2A2560"}`,
                color: row.head && i === 0 ? ACCENT : "#B8B5D1",
              }}
            >
              {row.head && i === 0 ? `HEAD → ${name}` : name}
            </span>
          ))}
          <span style={{ color: "#D8D6EA", overflow: "hidden", textOverflow: "ellipsis" }}>
            {row.message}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GitSandbox(props: Record<string, unknown>): React.ReactElement {
  const parsed = parseGitSandbox(props);
  // A lesson's props do not change while it is open: the setup runs once.
  const [setup] = useState(() => runSetup(parsed.ok ? (parsed.value.setup ?? []) : []));
  const start = setup.ok ? setup.state : null;
  const [state, setState] = useState<GitState | null>(start);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [line, setLine] = useState("");
  const [past, setPast] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const counter = useRef(0);
  const screen = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = screen.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  if (!parsed.ok || !setup.ok || state === null) {
    const problem = !parsed.ok
      ? parsed.problem
      : !setup.ok
        ? `la commande de préparation « ${setup.command} » échoue : ${setup.output}`
        : "";
    return (
      <div
        role="note"
        style={{ margin: "24px 0", padding: "14px 16px", border: `1px solid ${RED}` }}
      >
        Bac à sable Git indisponible : {problem}
      </div>
    );
  }
  const exercise = parsed.value;
  const checks = exercise.checks ?? [];
  const passed = checks.map((c) => checkHolds(state, c));
  const allDone = checks.length > 0 && passed.every(Boolean);
  const files = shortStatus(state);

  const submit = (event: React.SyntheticEvent): void => {
    event.preventDefault();
    const typed = line.trim();
    setLine("");
    setCursor(null);
    if (typed === "") return;
    setPast((p) => [...p.filter((x) => x !== typed), typed].slice(-50));
    if (typed === "clear") {
      setEntries([]);
      return;
    }
    const result = run(state, typed);
    counter.current += 1;
    setEntries((e) => [
      ...e.slice(-80),
      {
        key: counter.current,
        prompt: promptOf(state),
        line: typed,
        output: result.output,
        ok: result.ok,
      },
    ]);
    setState(result.state);
  };

  const browse = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    if (past.length === 0) return;
    const at = cursor ?? past.length;
    const next = event.key === "ArrowUp" ? Math.max(0, at - 1) : Math.min(past.length, at + 1);
    setCursor(next === past.length ? null : next);
    setLine(next === past.length ? "" : (past[next] ?? ""));
  };

  return (
    <section
      className="card card--sunken"
      aria-label={`Bac à sable Git${exercise.title ? ` : ${exercise.title}` : ""}`}
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
          GIT · BAC À SABLE
        </span>
        {exercise.title ? (
          <span style={{ color: "#F5F5FA", fontWeight: 600, fontSize: 15 }}>{exercise.title}</span>
        ) : null}
        <button
          type="button"
          onClick={() => {
            setState(start);
            setEntries([]);
          }}
          className="btn btn--ghost btn--sm"
          style={{ marginLeft: "auto" }}
        >
          Réinitialiser
        </button>
      </header>
      {exercise.task ? (
        <p style={{ margin: 0, padding: "12px 16px 0", color: "#B8B5D1", fontSize: 14 }}>
          {exercise.task}
        </p>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
          gap: 12,
          padding: "12px 16px",
        }}
      >
        <div
          className="card card--sunken"
          style={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            ref={screen}
            aria-live="polite"
            style={{
              height: 260,
              overflowY: "auto",
              padding: "10px 12px",
              fontFamily: MONO,
              fontSize: 12.5,
              lineHeight: 1.55,
            }}
          >
            {entries.length === 0 ? (
              <p style={{ margin: 0, color: "#5A5680" }}>Tape help pour la liste des commandes.</p>
            ) : null}
            {entries.map((entry) => (
              <div key={entry.key} style={{ marginBottom: 6 }}>
                <div style={{ color: "#7F7BA9", overflowWrap: "anywhere" }}>
                  {entry.prompt} <span style={{ color: "#F5F5FA" }}>{entry.line}</span>
                </div>
                {entry.output !== "" ? (
                  <pre
                    style={{
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      tabSize: 4,
                      fontFamily: "inherit",
                      color: entry.ok ? "#D8D6EA" : RED,
                    }}
                  >
                    {entry.output}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
          <form
            onSubmit={submit}
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              borderTop: "1px solid #1F1B47",
              padding: "8px 12px",
            }}
          >
            <label
              htmlFor={`git-${exercise.id}`}
              style={{ fontFamily: MONO, fontSize: 12.5, color: "#7F7BA9", whiteSpace: "nowrap" }}
            >
              {promptOf(state)}
            </label>
            <input
              id={`git-${exercise.id}`}
              value={line}
              onChange={(e) => {
                setLine(e.target.value);
              }}
              onKeyDown={browse}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Commande"
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#F5F5FA",
                fontFamily: MONO,
                fontSize: 12.5,
              }}
            />
          </form>
        </div>
        <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
          <div style={{ maxHeight: 300, overflow: "auto", padding: "4px 0" }}>
            <GitGraph state={state} />
          </div>
          {files.length > 0 ? (
            <ul
              aria-label="Fichiers modifiés"
              style={{
                margin: 0,
                padding: "8px 0 0",
                listStyle: "none",
                borderTop: "1px solid #1F1B47",
              }}
            >
              {files.map((f) => (
                <li
                  key={f.path}
                  style={{ fontFamily: MONO, fontSize: 12, color: "#B8B5D1", whiteSpace: "pre" }}
                >
                  <span
                    style={{ color: f.code === "??" ? "#7F7BA9" : f.code === "UU" ? RED : ACCENT }}
                  >
                    {f.code}
                  </span>{" "}
                  {f.path}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
      {checks.length > 0 ? (
        <div style={{ borderTop: "1px solid #1F1B47", padding: "12px 16px" }}>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
            {checks.map((check, i) => (
              <li
                key={check.label}
                style={{ fontFamily: MONO, fontSize: 12, color: passed[i] ? ACCENT : "#6B6890" }}
              >
                {passed[i] ? "✓" : "○"} {check.label}
              </li>
            ))}
          </ul>
          <div aria-live="polite">
            {allDone ? (
              <p style={{ margin: "10px 0 0", fontFamily: MONO, fontSize: 12, color: ACCENT }}>
                ✓ Exercice complété : tout ce qui était demandé est fait.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
      {exercise.hints && exercise.hints.length > 0 ? (
        <details style={{ borderTop: "1px solid #1F1B47", padding: "12px 16px" }}>
          <summary
            style={{
              cursor: "pointer",
              fontFamily: MONO,
              fontSize: 10,
              color: ACCENT,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
          >
            Indices ({String(exercise.hints.length)})
          </summary>
          <ol style={{ margin: "10px 0 0", paddingLeft: 22, display: "grid", gap: 6 }}>
            {exercise.hints.map((hint) => (
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
    </section>
  );
}

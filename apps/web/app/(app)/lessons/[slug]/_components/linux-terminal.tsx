"use client";

import "@xterm/xterm/css/xterm.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { Terminal as TerminalType } from "@xterm/xterm";
import {
  checkHolds,
  createLineTracker,
  endsWithPrompt,
  isLessonFilePath,
  normalizeCommand,
  setupCommand,
  toSerial,
  type PathState,
  type StateCheck,
} from "@/lib/linux-terminal/session";

/**
 * A real Linux in the lesson: v86, an x86 emulator in WebAssembly, boots a
 * Buildroot image in the learner's browser and hands its shell to xterm.
 * Unlike SimulatedTerminal, every command works, and does what it does on a
 * real system - on a machine that lives in the tab and vanishes with it.
 *
 * Nothing starts until the learner asks: the first start downloads about
 * 12 MB (public/runtimes/v86, verified by scripts/verify-runtimes.sh), which
 * the browser then keeps.
 */

// ── Props (MDX-supplied, so read, not trusted) ───────────────────────────────

const propsSchema = z.object({
  id: z.string().optional(),
  title: z.string().max(120).optional(),
  height: z.number().int().min(200).max(900).optional(),
  /** Files placed in /mnt before the learner starts: path → text content. */
  files: z
    .record(z.string(), z.string().max(64 * 1024))
    .refine((f) => Object.keys(f).length <= 40, "Au plus 40 fichiers.")
    .refine((f) => Object.keys(f).every(isLessonFilePath), "Chemin de fichier invalide.")
    .optional(),
  /** Commands the learner is asked to type, checked as they submit them. */
  expectedCommands: z.array(z.string().max(200)).max(30).optional(),
  /**
   * What the learner must leave behind in /mnt, checked in the machine after
   * each command: a file (with a text in it, if given), a directory, or no
   * trace of a path.
   */
  checks: z
    .array(
      z.object({
        label: z.string().max(200),
        path: z.string().refine(isLessonFilePath, "Chemin de vérification invalide."),
        expect: z.enum(["file", "dir", "absent"]),
        contains: z.string().max(500).optional(),
      }),
    )
    .max(30)
    .optional(),
  hints: z.array(z.string().max(500)).max(20).optional(),
});

export type LinuxTerminalProps = z.input<typeof propsSchema>;

// ── The emulator, as much of it as this component uses ───────────────────────

interface V86Emulator {
  add_listener(event: "serial0-output-byte", listener: (byte: number) => void): void;
  serial0_send(data: string): void;
  create_file(path: string, data: Uint8Array): Promise<void>;
  /** Rejects for a directory as for a missing path. */
  read_file(path: string): Promise<Uint8Array>;
  restart(): void;
  destroy(): Promise<void>;
  /**
   * The 9p filesystem behind /mnt. Not in v86's typings, so optional here: it
   * is the only way to tell a directory from a missing path, and without it a
   * directory check simply does not pass.
   */
  fs9p?: {
    SearchPath(path: string): { id: number };
    IsDirectory(id: number): boolean;
  };
}

/** What a path of /mnt is, and a file's text when there is one. */
async function probe(
  emulator: V86Emulator,
  path: string,
): Promise<{ state: PathState; text: string | null }> {
  const fs = emulator.fs9p;
  if (fs) {
    const { id } = fs.SearchPath(path);
    if (id === -1) return { state: "absent", text: null };
    if (fs.IsDirectory(id)) return { state: "dir", text: null };
  }
  try {
    const bytes = await emulator.read_file(path);
    return { state: "file", text: new TextDecoder().decode(bytes) };
  } catch {
    return { state: "absent", text: null };
  }
}

type V86Constructor = new (options: Record<string, unknown>) => V86Emulator;

const RUNTIME = "/runtimes/v86";

function readV86(): V86Constructor | null {
  if (!("V86" in window) || typeof window.V86 !== "function") return null;
  // SAFETY: libv86.js defines window.V86 as the emulator's constructor; the
  // interface above lists only the documented methods this file calls.
  return window.V86 as V86Constructor;
}

let runtime: Promise<V86Constructor> | null = null;

/**
 * Loads libv86.js once per page. A script added by the page's own code: the
 * CSP's 'strict-dynamic' trusts it, and 'wasm-unsafe-eval' (already there for
 * Pyodide) lets it compile its WebAssembly.
 */
function loadV86(): Promise<V86Constructor> {
  runtime ??= new Promise<V86Constructor>((resolve, reject) => {
    const loaded = readV86();
    if (loaded) {
      resolve(loaded);
      return;
    }
    const script = document.createElement("script");
    script.src = `${RUNTIME}/libv86.js`;
    script.async = true;
    script.onload = () => {
      const ctor = readV86();
      if (ctor) resolve(ctor);
      else reject(new Error("v86 introuvable après chargement"));
    };
    script.onerror = () => {
      runtime = null;
      reject(new Error("Chargement de v86 impossible"));
    };
    document.head.appendChild(script);
  });
  return runtime;
}

// ── Component ────────────────────────────────────────────────────────────────

type Phase = "idle" | "loading" | "booting" | "ready" | "error";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "",
  loading: "Téléchargement de la machine…",
  booting: "Démarrage de Linux…",
  ready: "",
  error: "",
};

export function LinuxTerminal(rawProps: LinuxTerminalProps): React.ReactElement {
  const parsed = propsSchema.safeParse(rawProps);
  const props = parsed.success ? parsed.data : {};
  const title = props.title ?? "Linux · root@cyberlearn";
  const height = props.height ?? 380;
  const files = props.files ?? {};
  const expected = (props.expectedCommands ?? []).map(normalizeCommand);
  const checks: StateCheck[] = props.checks ?? [];
  const hints = props.hints ?? [];

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<TerminalType | null>(null);
  const emulatorRef = useRef<V86Emulator | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [done, setDone] = useState<string[]>([]);
  const [passed, setPassed] = useState<string[]>([]);

  const filesRef = useRef(files);
  filesRef.current = files;
  const expectedRef = useRef(expected);
  expectedRef.current = expected;
  const checksRef = useRef(checks);
  checksRef.current = checks;

  /**
   * Looks at /mnt in the machine and records which checks hold now.
   *
   * Looks can overlap - a learner types faster than the machine runs - and
   * each one awaits the filesystem, so an older look could finish after a
   * newer one and put back a state that no longer is. Only the latest look
   * started gets to write.
   */
  const lookSeq = useRef(0);
  const evaluate = useCallback(async (): Promise<void> => {
    const emulator = emulatorRef.current;
    if (!emulator || checksRef.current.length === 0) return;
    const seq = ++lookSeq.current;
    const holding: string[] = [];
    for (const check of checksRef.current) {
      try {
        const { state, text } = await probe(emulator, check.path);
        if (checkHolds(check, state, text)) holding.push(check.label);
      } catch {
        // A path the filesystem cannot answer for does not hold, and does not
        // stop the checks after it.
      }
    }
    if (seq === lookSeq.current) setPassed(holding);
  }, []);

  /**
   * Waits for the shell's prompt, then types the setup line, waits for the
   * prompt again, writes the lesson's files and only then shows the screen.
   * Until that point the output is kept off it: boot messages and the setup
   * line are the page's business, not the learner's.
   */
  const prepare = useCallback(
    (emulator: V86Emulator, term: TerminalType) => {
      const decoder = new TextDecoder();
      let tail = "";
      let stage: "boot" | "setup" | "live" = "boot";
      let pending: number[] = [];
      let flushing = false;
      // The live output, decoded, to see the prompt come back: that is when
      // the command has finished and the files are worth looking at.
      const liveDecoder = new TextDecoder();
      let liveTail = "";
      let lookTimer: ReturnType<typeof setTimeout> | undefined;
      const scheduleLook = (delay: number): void => {
        clearTimeout(lookTimer);
        lookTimer = setTimeout(() => void evaluate(), delay);
      };

      const flush = (): void => {
        flushing = false;
        if (pending.length === 0) return;
        term.write(new Uint8Array(pending));
        pending = [];
      };

      const goLive = async (): Promise<void> => {
        const encoder = new TextEncoder();
        for (const [path, content] of Object.entries(filesRef.current)) {
          await emulator.create_file(path, encoder.encode(content));
        }
        stage = "live";
        setPhase("ready");
        term.focus();
        // Redraws a clean prompt, now that the screen shows the output.
        emulator.serial0_send("clear\n");
      };

      emulator.add_listener("serial0-output-byte", (byte) => {
        if (stage === "live") {
          pending.push(byte);
          if (!flushing) {
            flushing = true;
            setTimeout(flush, 0);
          }
          liveTail = (
            liveTail + liveDecoder.decode(new Uint8Array([byte]), { stream: true })
          ).slice(-200);
          if (endsWithPrompt(liveTail)) {
            liveTail = "";
            scheduleLook(100);
          }
          return;
        }
        tail = (tail + decoder.decode(new Uint8Array([byte]), { stream: true })).slice(-200);
        if (!endsWithPrompt(tail)) return;
        tail = "";
        if (stage === "boot") {
          stage = "setup";
          emulator.serial0_send(setupCommand(Object.keys(filesRef.current), term.cols, term.rows));
        } else {
          stage = "live";
          void goLive().catch(() => {
            setPhase("error");
          });
        }
      });

      const track = createLineTracker(
        (line) => {
          if (!expectedRef.current.includes(line)) return;
          setDone((prev) => (prev.includes(line) ? prev : [...prev, line]));
        },
        // Normally the prompt coming back triggers the look. A command that
        // keeps the screen, like less, never shows it: look anyway, later.
        () => {
          scheduleLook(1500);
        },
      );
      term.onData((data) => {
        if (stage !== "live") return;
        track(data);
        emulator.serial0_send(toSerial(data));
      });
    },
    [evaluate],
  );

  const start = useCallback(async (): Promise<void> => {
    if (!containerRef.current || emulatorRef.current) return;
    setPhase("loading");
    try {
      const [V86, { Terminal }, { FitAddon }] = await Promise.all([
        loadV86(),
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      const term = new Terminal({
        theme: {
          background: "#030219",
          foreground: "#B8B5D1",
          cursor: "#0AFFD4",
          black: "#030219",
          blue: "#6E8BFF",
          brightBlue: "#6E8BFF",
          cyan: "#4D8BFF",
          brightCyan: "#4D8BFF",
          green: "#0AFFD4",
          brightGreen: "#0AFFD4",
          red: "#FF4757",
          brightRed: "#FF4757",
          yellow: "#FFB020",
          brightYellow: "#FFB547",
          magenta: "#B14DFF",
          brightMagenta: "#D580FF",
          white: "#F5F5FA",
          brightWhite: "#F5F5FA",
          brightBlack: "#3F3D5C",
        },
        fontFamily: "JetBrains Mono, Menlo, monospace",
        fontSize: 13,
        lineHeight: 1.35,
        cursorBlink: true,
        allowTransparency: true,
      });
      const fit = new FitAddon();
      term.loadAddon(fit);
      term.open(containerRef.current);
      fit.fit();
      termRef.current = term;

      setPhase("booting");
      const emulator = new V86({
        wasm_path: `${RUNTIME}/v86.wasm`,
        bios: { url: `${RUNTIME}/seabios.bin` },
        vga_bios: { url: `${RUNTIME}/vgabios.bin` },
        bzimage: { url: `${RUNTIME}/buildroot-bzimage68.bin` },
        cmdline: "tsc=reliable mitigations=off random.trust_cpu=on",
        memory_size: 64 * 1024 * 1024,
        vga_memory_size: 2 * 1024 * 1024,
        // The in-memory filesystem the image mounts at /mnt.
        filesystem: {},
        disable_keyboard: true,
        disable_mouse: true,
        autostart: true,
      });
      emulatorRef.current = emulator;
      prepare(emulator, term);
    } catch {
      setPhase("error");
    }
  }, [prepare]);

  const stop = useCallback((): void => {
    const emulator = emulatorRef.current;
    emulatorRef.current = null;
    if (emulator) void emulator.destroy().catch(() => undefined);
    termRef.current?.dispose();
    termRef.current = null;
  }, []);

  const restart = useCallback((): void => {
    stop();
    setDone([]);
    setPassed([]);
    setPhase("idle");
    // The container is empty again once React has re-rendered the idle state.
    setTimeout(() => void start(), 0);
  }, [start, stop]);

  useEffect(() => stop, [stop]);

  const total = expected.length + checks.length;
  const count = done.length + checks.filter((c) => passed.includes(c.label)).length;
  const allDone =
    total > 0 &&
    expected.every((c) => done.includes(c)) &&
    checks.every((c) => passed.includes(c.label));

  if (!parsed.success) {
    return (
      <div role="note" className="linux-terminal linux-terminal--broken">
        Ce terminal Linux est mal configuré dans la leçon :{" "}
        {parsed.error.issues[0]?.message ?? "propriétés invalides"}.
      </div>
    );
  }

  return (
    <div
      className="linux-terminal"
      style={{
        margin: "32px 0",
        border: "1px solid #1F1B47",
        background: "var(--cosmetic-terminal-bg, #030219)",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "11px 16px",
          borderBottom: "1px solid #1F1B47",
          background: "rgba(5,4,26,0.7)",
        }}
      >
        <div style={{ display: "inline-flex", gap: 7, flexShrink: 0 }}>
          {(["#FF4757", "#FFB020", "var(--cosmetic-accent)"] as const).map((c) => (
            <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />
          ))}
        </div>
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            color: "var(--cosmetic-accent)",
            letterSpacing: "0.04em",
            flex: 1,
            textAlign: "center",
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: allDone ? "var(--cosmetic-accent)" : "#44406B",
            flexShrink: 0,
          }}
        >
          {total > 0 ? `${allDone ? "✓ " : ""}${String(count)}/${String(total)}` : "vrai Linux"}
        </span>
        {phase === "ready" || phase === "error" ? (
          <button
            type="button"
            onClick={restart}
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              background: "transparent",
              border: "1px solid #3F3D5C",
              color: "#B8B5D1",
              padding: "4px 8px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Redémarrer
          </button>
        ) : null}
      </div>

      <div style={{ position: "relative", height }}>
        <div
          ref={containerRef}
          style={{ height: "100%", padding: "12px 14px", boxSizing: "border-box" }}
        />
        {phase !== "ready" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              padding: 24,
              textAlign: "center",
              background: "var(--cosmetic-terminal-bg, #030219)",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              color: "#B8B5D1",
              lineHeight: 1.6,
            }}
          >
            {phase === "idle" ? (
              <>
                <p style={{ margin: 0, maxWidth: 520 }}>
                  Un vrai Linux tourne ici, dans ton navigateur : toutes les commandes marchent, et
                  rien ne sort de cet onglet. Le premier démarrage télécharge environ 12 Mo.
                </p>
                <button
                  type="button"
                  onClick={() => void start()}
                  style={{
                    padding: "0 22px",
                    minHeight: 44,
                    fontFamily: "var(--font-mono, monospace)",
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: "0.2em",
                    textTransform: "uppercase",
                    background: "var(--cosmetic-accent)",
                    color: "#030219",
                    border: 0,
                    cursor: "pointer",
                  }}
                >
                  Démarrer la machine
                </button>
              </>
            ) : phase === "error" ? (
              <p role="alert" style={{ margin: 0, color: "#FF4757", maxWidth: 520 }}>
                La machine n&apos;a pas pu démarrer. Ton navigateur est peut-être trop ancien, ou le
                téléchargement a été interrompu : clique sur Redémarrer pour réessayer.
              </p>
            ) : (
              <p aria-live="polite" style={{ margin: 0 }}>
                {PHASE_LABEL[phase]}
              </p>
            )}
          </div>
        ) : null}
      </div>

      {total > 0 ? (
        <div style={{ borderTop: "1px solid #1F1B47", padding: "12px 18px" }}>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexWrap: "wrap",
              gap: "6px 14px",
            }}
          >
            {expected.map((cmd) => {
              const ok = done.includes(cmd);
              return (
                <li
                  key={cmd}
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 12,
                    color: ok ? "var(--cosmetic-accent)" : "#6B6890",
                  }}
                >
                  {ok ? "✓" : "○"} {cmd}
                </li>
              );
            })}
          </ul>
          {checks.length > 0 ? (
            <ul
              style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 4 }}
            >
              {checks.map((check) => {
                const ok = passed.includes(check.label);
                return (
                  <li
                    key={check.label}
                    style={{
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 12,
                      color: ok ? "var(--cosmetic-accent)" : "#6B6890",
                    }}
                  >
                    {ok ? "✓" : "○"} {check.label}
                  </li>
                );
              })}
            </ul>
          ) : null}
          {allDone ? (
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 12,
                color: "var(--cosmetic-accent)",
              }}
            >
              ✓ Exercice complété : tout ce qui était demandé est fait.
            </p>
          ) : null}
        </div>
      ) : null}

      {hints.length > 0 ? (
        <div
          style={{
            borderTop: "1px solid #1F1B47",
            padding: "14px 18px",
            background: "rgba(5,4,26,0.5)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              color: "var(--cosmetic-accent)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            {"// "} Indices ({String(hints.length)})
          </div>
          <ol style={{ margin: 0, paddingLeft: 22, display: "grid", gap: 6 }}>
            {hints.map((hint) => (
              <li
                key={hint}
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  color: "#B8B5D1",
                  lineHeight: 1.55,
                }}
              >
                {hint}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}

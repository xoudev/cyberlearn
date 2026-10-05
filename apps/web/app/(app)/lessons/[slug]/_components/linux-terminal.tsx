"use client";

import "@xterm/xterm/css/xterm.css";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import type { Terminal as TerminalType } from "@xterm/xterm";
import {
  BASH_FILE,
  checkHolds,
  createLineTracker,
  endsWithPrompt,
  installBashCommand,
  isLessonFilePath,
  normalizeCommand,
  octalMode,
  setupCommand,
  TERMINFO_FILE,
  toSerial,
  type PathObservation,
  type StateCheck,
} from "@/lib/linux-terminal/session";
import { clockText, formatClock, minutesLabel, readTimer } from "@/lib/linux-terminal/timer";

/**
 * A real Linux in the lesson: v86, an x86 emulator in WebAssembly, boots a
 * Buildroot image in the learner's browser and hands its shell to xterm.
 * Unlike SimulatedTerminal, every command works, and does what it does on a
 * real system - on a machine that lives in the tab and vanishes with it.
 *
 * Nothing starts until the learner asks: the first start downloads about
 * 15 MB (public/runtimes/v86, verified by scripts/verify-runtimes.sh), which
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
   * each command: a file (with a text in it, if given), a directory, a
   * symbolic link (to a given target), or no trace of a path; and, if given,
   * its permissions and its number of hard links.
   */
  checks: z
    .array(
      z.object({
        label: z.string().max(200),
        path: z.string().refine(isLessonFilePath, "Chemin de vérification invalide."),
        expect: z.enum(["file", "dir", "link", "absent"]),
        contains: z.string().max(500).optional(),
        mode: z
          .string()
          .regex(/^[0-7]{3,4}$/, "Permissions en octal : 640, 750, 4755.")
          .optional(),
        target: z.string().max(200).optional(),
        links: z.number().int().min(1).max(100).optional(),
      }),
    )
    .max(30)
    .optional(),
  hints: z.array(z.string().max(500)).max(20).optional(),
  /**
   * A timed exercise, such as a path's practical exam: the clock starts when
   * the machine is ready, stops when everything asked is done, and the score
   * at the limit is kept. The learner may still finish past it.
   */
  timeLimitMinutes: z.number().int().min(1).max(180).optional(),
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
    /** The inode itself: st_mode, the target of a symlink, the link count. */
    GetInode(id: number): { mode: number; symlink: string; nlinks: number };
  };
}

const S_IFMT = 0o170000;
const S_IFLNK = 0o120000;

const NOTHING: PathObservation = {
  state: "absent",
  text: null,
  mode: null,
  target: null,
  links: null,
};

/**
 * What a path of /mnt is: a file and its text, a directory, a symbolic link
 * and its target, or nothing; with its permissions and link count. SearchPath
 * does not follow a link, so a link is seen as itself.
 */
async function probe(emulator: V86Emulator, path: string): Promise<PathObservation> {
  const fs = emulator.fs9p;
  let inode: { mode: number; symlink: string; nlinks: number } | null = null;
  if (fs) {
    const { id } = fs.SearchPath(path);
    if (id === -1) return NOTHING;
    inode = fs.GetInode(id);
    const meta = { mode: octalMode(inode.mode), links: inode.nlinks };
    if ((inode.mode & S_IFMT) === S_IFLNK) {
      return { ...NOTHING, ...meta, state: "link", target: inode.symlink };
    }
    if (fs.IsDirectory(id)) return { ...NOTHING, ...meta, state: "dir" };
  }
  try {
    const bytes = await emulator.read_file(path);
    return {
      ...NOTHING,
      state: "file",
      text: new TextDecoder().decode(bytes),
      mode: inode ? octalMode(inode.mode) : null,
      links: inode ? inode.nlinks : null,
    };
  } catch {
    // v86 rejects reading an empty file as it does a missing one. A file the
    // filesystem just found is there, and empty: what touch or : > leaves.
    if (inode === null) return NOTHING;
    return {
      ...NOTHING,
      state: "file",
      text: "",
      mode: octalMode(inode.mode),
      links: inode.nlinks,
    };
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
const extras = new Map<string, Promise<Uint8Array | null>>();

/**
 * A file the image lacks, served next to it: the static bash, and the
 * terminal description its line editor needs. Fetched once per page while the
 * machine boots. Without them the terminal still works, with ash alone: a
 * lesson that needs bash fails on its own command, not the whole machine.
 */
function loadExtra(name: "bash" | "terminfo-linux"): Promise<Uint8Array | null> {
  let file = extras.get(name);
  if (!file) {
    file = fetch(`${RUNTIME}/${name}`)
      .then(async (res) => (res.ok ? new Uint8Array(await res.arrayBuffer()) : null))
      .catch(() => null);
    extras.set(name, file);
  }
  return file;
}

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
  const limitMinutes = props.timeLimitMinutes ?? null;
  const limitMs = limitMinutes === null ? null : limitMinutes * 60_000;

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<TerminalType | null>(null);
  const emulatorRef = useRef<V86Emulator | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [done, setDone] = useState<string[]>([]);
  const [passed, setPassed] = useState<string[]>([]);
  // The clock of a timed exercise: when the machine became ready, the time
  // last read, when everything asked was done, and the score at the limit.
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [scoreAtLimit, setScoreAtLimit] = useState<number | null>(null);

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
        if (checkHolds(check, await probe(emulator, check.path))) holding.push(check.label);
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
        const [bashBytes, terminfo] = await Promise.all([
          loadExtra("bash"),
          loadExtra("terminfo-linux"),
        ]);
        if (bashBytes) await emulator.create_file(BASH_FILE, bashBytes);
        if (bashBytes && terminfo) await emulator.create_file(TERMINFO_FILE, terminfo);
        stage = "live";
        setPhase("ready");
        term.focus();
        // Installs bash if it came, then redraws a clean prompt, now that the
        // screen shows the output.
        emulator.serial0_send(
          bashBytes ? `${installBashCommand(terminfo !== null)}; clear\n` : "clear\n",
        );
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
    void loadExtra("bash");
    void loadExtra("terminfo-linux");
    try {
      const [V86, { Terminal }, { FitAddon }] = await Promise.all([
        loadV86(),
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      const term = new Terminal({
        theme: {
          background: "var(--color-bg-base)",
          foreground: "var(--color-text-secondary)",
          cursor: "var(--color-brand-turquoise)",
          black: "var(--color-bg-base)",
          blue: "var(--color-rarity-rare)",
          brightBlue: "var(--color-rarity-rare)",
          cyan: "var(--color-info)",
          brightCyan: "var(--color-info)",
          green: "var(--color-brand-turquoise)",
          brightGreen: "var(--color-brand-turquoise)",
          red: "var(--color-category-cybersec)",
          brightRed: "var(--color-category-cybersec)",
          yellow: "var(--color-warning)",
          brightYellow: "var(--color-rarity-legendary)",
          magenta: "#B14DFF",
          brightMagenta: "#D580FF",
          white: "var(--color-text-primary)",
          brightWhite: "var(--color-text-primary)",
          brightBlack: "var(--color-text-disabled)",
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
    // Starting over starts the clock over: the work is gone with the machine.
    setStartedAt(null);
    setFinishedAt(null);
    setScoreAtLimit(null);
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

  // The clock starts when the learner can type, not while the machine
  // downloads or boots.
  useEffect(() => {
    if (limitMs === null || phase !== "ready" || startedAt !== null) return;
    const t = Date.now();
    setStartedAt(t);
    setNow(t);
  }, [limitMs, phase, startedAt]);

  const reading =
    limitMs !== null && startedAt !== null ? readTimer(limitMs, startedAt, now, finishedAt) : null;
  const expired = reading?.expired ?? false;
  const finished = reading?.finished ?? false;
  const running = reading !== null && !finished && scoreAtLimit === null;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => {
      clearInterval(id);
    };
  }, [running]);

  useEffect(() => {
    if (startedAt !== null && allDone && finishedAt === null) setFinishedAt(Date.now());
  }, [startedAt, allDone, finishedAt]);

  // At the limit, the score is kept: it is the result of the exercise, even
  // if the learner goes on to finish.
  useEffect(() => {
    if (expired && !finished && scoreAtLimit === null) setScoreAtLimit(count);
  }, [expired, finished, scoreAtLimit, count]);

  const clockColor =
    reading === null
      ? "var(--color-text-secondary)"
      : finished && !expired
        ? "var(--cosmetic-accent)"
        : expired
          ? "var(--color-category-cybersec)"
          : reading.remaining < 5 * 60_000
            ? "var(--color-warning)"
            : "var(--color-text-secondary)";

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
        border: "1px solid var(--color-border-subtle)",
        background: "var(--cosmetic-terminal-bg, var(--color-bg-base))",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "11px 16px",
          borderBottom: "1px solid var(--color-border-subtle)",
          background: "rgba(5,4,26,0.7)",
        }}
      >
        <div style={{ display: "inline-flex", gap: 7, flexShrink: 0 }}>
          {(
            [
              "var(--color-category-cybersec)",
              "var(--color-warning)",
              "var(--cosmetic-accent)",
            ] as const
          ).map((c) => (
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
        {limitMs !== null ? (
          <span
            role="timer"
            aria-label={finished ? "Temps mis" : "Temps restant"}
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              fontVariantNumeric: "tabular-nums",
              color: clockColor,
              flexShrink: 0,
            }}
          >
            ⏱ {reading ? clockText(reading) : formatClock(limitMs / 1000)}
          </span>
        ) : null}
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: allDone ? "var(--cosmetic-accent)" : "var(--color-text-faint)",
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
              border: "1px solid var(--color-text-disabled)",
              color: "var(--color-text-secondary)",
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
              background: "var(--cosmetic-terminal-bg, var(--color-bg-base))",
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 12,
              color: "var(--color-text-secondary)",
              lineHeight: 1.6,
            }}
          >
            {phase === "idle" ? (
              <>
                <p style={{ margin: 0, maxWidth: 520 }}>
                  Un vrai Linux tourne ici, dans ton navigateur : toutes les commandes marchent, et
                  rien ne sort de cet onglet. Le premier démarrage télécharge environ 15 Mo.
                </p>
                {limitMinutes !== null ? (
                  <p style={{ margin: 0, maxWidth: 520, color: "var(--color-warning)" }}>
                    Épreuve chronométrée : {minutesLabel(limitMinutes)}, à partir du moment où la
                    machine est prête. Le chronomètre s&apos;arrête dès que tout est fait.
                  </p>
                ) : null}
                <button
                  className="btn btn--accent btn--sm"
                  type="button"
                  onClick={() => void start()}
                >
                  Démarrer la machine
                </button>
              </>
            ) : phase === "error" ? (
              <p
                role="alert"
                style={{ margin: 0, color: "var(--color-category-cybersec)", maxWidth: 520 }}
              >
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
        <div style={{ borderTop: "1px solid var(--color-border-subtle)", padding: "12px 18px" }}>
          {expected.length > 0 ? (
            // The steps, one per line and numbered: a command is read as a
            // whole, and the order is the lesson's.
            <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 4 }}>
              {expected.map((cmd, i) => {
                const ok = done.includes(cmd);
                return (
                  <li
                    key={cmd}
                    style={{
                      display: "flex",
                      gap: 10,
                      fontFamily: "var(--font-mono, monospace)",
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: ok ? "var(--cosmetic-accent)" : "#6B6890",
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>
                      {ok ? "✓" : "○"} {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{ overflowWrap: "anywhere" }}>{cmd}</span>
                  </li>
                );
              })}
            </ol>
          ) : null}
          {checks.length > 0 ? (
            <ul
              style={{
                margin: expected.length > 0 ? "10px 0 0" : 0,
                padding: 0,
                listStyle: "none",
                display: "grid",
                gap: 4,
              }}
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
          <div aria-live="polite">
            {allDone && limitMinutes === null ? (
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
            {limitMinutes !== null && reading !== null && (finished || expired) ? (
              <p
                style={{
                  margin: "10px 0 0",
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 12,
                  color: finished && !expired ? "var(--cosmetic-accent)" : "var(--color-warning)",
                }}
              >
                {finished && !expired
                  ? `✓ Épreuve réussie en ${clockText(reading)}, pour un temps imparti de ${minutesLabel(limitMinutes)}.`
                  : finished
                    ? // The score at the limit is unknown if the tab slept through it.
                      `✓ Tout est fait, en ${clockText(reading)} : hors délai.${
                        scoreAtLimit === null
                          ? ""
                          : ` À la fin du temps imparti, ${String(scoreAtLimit)} sur ${String(total)}.`
                      }`
                    : `Temps imparti écoulé (${minutesLabel(limitMinutes)}) : ${String(scoreAtLimit ?? count)} sur ${String(total)}. Tu peux continuer pour finir, hors délai.`}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {hints.length > 0 ? (
        <div
          style={{
            borderTop: "1px solid var(--color-border-subtle)",
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
                  color: "var(--color-text-secondary)",
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

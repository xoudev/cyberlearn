"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

const SESSION_KEY = "cl-splash-shown";
const ENTER_MS = 950;
const FADE_MS = 420;

/**
 * Brand splash shown on the first page load of a browser session. Subsequent
 * navigations and reloads skip it entirely so it never gets in the way.
 */
export function SplashScreen(): React.ReactElement | null {
  const [phase, setPhase] = useState<"idle" | "visible" | "fading" | "done">("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf = 0;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) {
        setPhase("done");
        return;
      }
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Storage unavailable (private mode): still show the splash once.
    }

    setPhase("visible");
    const start = performance.now();
    const tick = (now: number): void => {
      const t = Math.min((now - start) / ENTER_MS, 1);
      // Ease-out curve keeps the bar lively at the start, settled at the end.
      setProgress(Math.round((1 - (1 - t) ** 3) * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setPhase("fading");
        setTimeout(() => {
          setPhase("done");
        }, FADE_MS);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);

  if (phase === "idle" || phase === "done") return null;

  return (
    <div
      aria-hidden="true"
      data-splash="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 26,
        background:
          "radial-gradient(ellipse 80% 55% at 50% 30%, rgba(0,36,255,0.16), transparent 65%), #030219",
        opacity: phase === "fading" ? 0 : 1,
        transition: `opacity ${String(FADE_MS)}ms ease`,
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
    >
      <style>{`
        @keyframes cl-splash-ring { to { transform: rotate(360deg); } }
        @keyframes cl-splash-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cl-splash-ring { animation: none !important; }
        }
      `}</style>

      {/* Logo inside a rotating accent arc */}
      <div
        style={{
          position: "relative",
          width: 96,
          height: 96,
          display: "grid",
          placeItems: "center",
          animation: "cl-splash-in 400ms ease both",
        }}
      >
        <span
          className="cl-splash-ring"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: "1px solid rgba(42,37,96,0.9)",
            borderTopColor: "var(--cosmetic-accent)",
            animation: "cl-splash-ring 1.1s linear infinite",
          }}
        />
        <Image
          src="/Logo_principal.png"
          alt=""
          width={52}
          height={52}
          priority
          style={{ objectFit: "contain" }}
        />
      </div>

      <div style={{ textAlign: "center", animation: "cl-splash-in 400ms ease 80ms both" }}>
        <div
          style={{
            fontFamily: "var(--font-sans)",
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: "-0.02em",
            color: "#F5F5FA",
          }}
        >
          cyber<span style={{ color: "var(--cosmetic-accent)" }}>learn</span>
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: "var(--font-mono)",
            fontSize: 9.5,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#6B6890",
          }}
        >
          Chargement sécurisé
        </div>
      </div>

      <div
        style={{
          width: 180,
          height: 3,
          background: "#1F1B47",
          overflow: "hidden",
          animation: "cl-splash-in 400ms ease 140ms both",
        }}
      >
        <div
          style={{
            width: `${String(progress)}%`,
            height: "100%",
            background: "linear-gradient(90deg, #0024FF, var(--cosmetic-accent))",
          }}
        />
      </div>
    </div>
  );
}

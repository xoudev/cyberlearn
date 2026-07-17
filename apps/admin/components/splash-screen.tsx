"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

const SESSION_KEY = "cl-admin-splash-shown";
const ENTER_MS = 850;
const FADE_MS = 380;

/** Console splash shown on the first load of a browser session only. */
export function AdminSplashScreen(): React.ReactElement | null {
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
        gap: 24,
        background:
          "radial-gradient(ellipse 80% 55% at 50% 30%, rgba(0,36,255,0.16), transparent 65%), #030219",
        opacity: phase === "fading" ? 0 : 1,
        transition: `opacity ${String(FADE_MS)}ms ease`,
        pointerEvents: phase === "fading" ? "none" : "auto",
      }}
    >
      <style>{`
        @keyframes cl-splash-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ animation: "cl-splash-in 380ms ease both" }}>
        <Image
          src="/Admin_logo.png"
          alt=""
          width={190}
          height={42}
          priority
          style={{ width: "auto", height: 42, objectFit: "contain" }}
        />
      </div>

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 9.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#6B6890",
          animation: "cl-splash-in 380ms ease 70ms both",
        }}
      >
        Console d&apos;administration
      </div>

      <div
        style={{
          width: 180,
          height: 3,
          background: "#1F1B47",
          overflow: "hidden",
          animation: "cl-splash-in 380ms ease 130ms both",
        }}
      >
        <div
          style={{
            width: `${String(progress)}%`,
            height: "100%",
            background: "linear-gradient(90deg, #0024FF, #0AFFD4)",
          }}
        />
      </div>
    </div>
  );
}

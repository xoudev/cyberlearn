"use client";

import { useEffect, useState } from "react";
import { cn } from "../lib/utils.js";

interface XPBarProps {
  currentXP: number;
  xpForNextLevel: number;
  level: number;
  showValues?: boolean;
  className?: string;
}

export function XPBar({
  currentXP,
  xpForNextLevel,
  level,
  showValues = false,
  className,
}: XPBarProps) {
  const target = xpForNextLevel > 0 ? Math.min((currentXP / xpForNextLevel) * 100, 100) : 0;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setWidth(target);
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [target]);

  return (
    <div className={cn("w-full space-y-1.5", className)}>
      {showValues && (
        <div
          className="flex items-center justify-between font-mono text-xs"
          style={{ color: "#7F7BA9" }}
        >
          <span>
            <span style={{ color: "var(--cosmetic-accent)" }}>
              {currentXP.toLocaleString("fr-FR")}
            </span>
            {" / "}
            {xpForNextLevel.toLocaleString("fr-FR")} XP
          </span>
          <span>Niv. {level + 1}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={currentXP}
        aria-valuemin={0}
        aria-valuemax={xpForNextLevel}
        aria-label={`Niveau ${String(level)} - ${String(currentXP)} / ${String(xpForNextLevel)} XP`}
        className="h-2 w-full overflow-hidden rounded-full"
        style={{ backgroundColor: "#1F1B47" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${String(width)}%`,
            background: "linear-gradient(90deg, var(--color-brand-blue), var(--cosmetic-accent))",
            boxShadow: "0 0 12px color-mix(in srgb, var(--cosmetic-accent) 50%, transparent)",
            transition: "width 800ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

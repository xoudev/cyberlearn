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
          style={{ color: "#6B6890" }}
        >
          <span>
            <span style={{ color: "#0AFFD4" }}>{currentXP.toLocaleString("fr-FR")}</span>
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
            background: "linear-gradient(90deg, #0024FF, #0AFFD4)",
            boxShadow: "0 0 12px rgba(10,255,212,0.5)",
            transition: "width 800ms ease-out",
          }}
        />
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useRef, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface LessonsSearchBarProps {
  initialQuery: string;
}

export function LessonsSearchBar({ initialQuery }: LessonsSearchBarProps): React.ReactElement {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) {
        next.set("q", value);
      } else {
        next.delete("q");
      }
      next.delete("page");
      startTransition(() => {
        router.replace(`/lessons?${next.toString()}`);
      });
    }, 300);
  }

  return (
    <div style={{ position: "relative", height: 34, minWidth: 220 }}>
      <svg
        viewBox="0 0 16 16"
        width={14}
        height={14}
        fill="none"
        style={{
          position: "absolute",
          left: 12,
          top: "50%",
          transform: "translateY(-50%)",
          color: "#7F7BA9",
          pointerEvents: "none",
        }}
      >
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth={1.5} />
        <path d="M11 11 L14 14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
      </svg>
      <input
        type="search"
        defaultValue={initialQuery}
        onChange={handleChange}
        placeholder="/ rechercher une leçon..."
        style={{
          width: "100%",
          height: "100%",
          padding: "0 12px 0 36px",
          background: "#05041A",
          border: "1px solid #2A2560",
          color: "#F5F5FA",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          borderRadius: 0,
          outline: "none",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}

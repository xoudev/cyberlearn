"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { CosmeticAttrs } from "@/lib/cosmetics/attrs";

/**
 * Applies the user's equipped cosmetics (data-accent / data-hex / data-frame /
 * data-terminal) on a display:contents wrapper around the whole authenticated
 * app, and lets client code update them optimistically. tokens.css maps those
 * attributes to the var(--cosmetic-*) values, so equipping a cosmetic re-styles
 * the entire app instantly instead of only after a full reload.
 *
 * The wrapper is seeded with the server-computed attributes so the first paint
 * is correct (no flash), then kept in sync with the server on refresh.
 */

type SlotAttr = keyof CosmeticAttrs;

interface CosmeticsContextValue {
  /** Set (code) or clear (null) one cosmetic slot, applied app-wide at once. */
  setCosmetic: (attr: SlotAttr, code: string | null) => void;
}

const CosmeticsContext = createContext<CosmeticsContextValue | null>(null);

export function useCosmetics(): CosmeticsContextValue {
  const ctx = useContext(CosmeticsContext);
  if (!ctx) {
    throw new Error("useCosmetics must be used within a CosmeticsProvider.");
  }
  return ctx;
}

export function CosmeticsProvider({
  initial,
  children,
}: {
  initial: CosmeticAttrs;
  children: React.ReactNode;
}): React.JSX.Element {
  const [attrs, setAttrs] = useState<CosmeticAttrs>(initial);

  // Re-sync when the server sends a fresh loadout (e.g. after router.refresh,
  // or an equip/unequip made on another surface). Compared by value so an
  // identical loadout does not clobber an in-flight optimistic update.
  const initialKey = JSON.stringify(initial);
  useEffect(() => {
    setAttrs(JSON.parse(initialKey) as CosmeticAttrs);
  }, [initialKey]);

  const setCosmetic = useCallback((attr: SlotAttr, code: string | null) => {
    setAttrs((prev) => {
      const next = { ...prev };
      if (code) {
        next[attr] = code;
      } else {
        delete next[attr];
      }
      return next;
    });
  }, []);

  return (
    <CosmeticsContext.Provider value={{ setCosmetic }}>
      <div {...attrs} style={{ display: "contents" }}>
        {children}
      </div>
    </CosmeticsContext.Provider>
  );
}

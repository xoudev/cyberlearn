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
// Every slot is always present; an unequipped slot is `undefined`, which React
// omits when spread onto the wrapper (so the CSS falls back to the default).
// Keeping every key present means clearing a slot is a plain assignment rather
// than a dynamic delete.
type SlotRecord = Record<SlotAttr, string | undefined>;

function toRecord(attrs: CosmeticAttrs): SlotRecord {
  return {
    "data-accent": attrs["data-accent"],
    "data-hex": attrs["data-hex"],
    "data-frame": attrs["data-frame"],
    "data-terminal": attrs["data-terminal"],
  };
}

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
  const [attrs, setAttrs] = useState<SlotRecord>(() => toRecord(initial));

  // Re-sync when the server sends a fresh loadout (e.g. after router.refresh, or
  // an equip/unequip made on another surface). Compared by value so an identical
  // loadout does not clobber an in-flight optimistic update.
  const initialKey = JSON.stringify(initial);
  useEffect(() => {
    // Parse back the serialised initial attributes to rebuild the record.
    setAttrs(toRecord(JSON.parse(initialKey) as CosmeticAttrs));
  }, [initialKey]);

  const setCosmetic = useCallback((attr: SlotAttr, code: string | null) => {
    setAttrs((prev) => ({ ...prev, [attr]: code ?? undefined }));
  }, []);

  return (
    <CosmeticsContext.Provider value={{ setCosmetic }}>
      <div {...attrs} style={{ display: "contents" }}>
        {children}
      </div>
    </CosmeticsContext.Provider>
  );
}

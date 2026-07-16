import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { accents, colors, rarity, setActiveAccentColor } from "@cyberlearn/tokens";
import { useLocker, type CosmeticType } from "@/lib/queries";

export interface CosmeticLoadout {
  terminalTheme: string | null;
  hexagonStyle: string | null;
  profileFrame: string | null;
  accentColor: string | null;
}

export interface MobileCosmeticTheme {
  accent: string;
  terminal: {
    background: string;
    foreground: string;
  };
  hex: {
    fillOpacity: number;
    glowOpacity: number;
    strokeWidth: number;
    dash: number[] | undefined;
  };
  frame: {
    color: string;
    glowOpacity: number;
    strokeWidth: number;
  };
}

interface CosmeticsState {
  loadout: CosmeticLoadout;
  theme: MobileCosmeticTheme;
  setCosmetic: (type: CosmeticType, code: string | null) => void;
}

const EMPTY_LOADOUT: CosmeticLoadout = {
  terminalTheme: null,
  hexagonStyle: null,
  profileFrame: null,
  accentColor: null,
};

const ACCENT_BY_CODE: Record<string, string> = {
  "accent-turquoise": accents.turquoise,
  "accent-blue": accents.blue,
  "accent-amber": accents.gold,
  "accent-magenta": accents.pink,
  "accent-violet": accents.violet,
  "accent-acid": accents.green,
};

const TERMINAL_BY_CODE: Record<string, MobileCosmeticTheme["terminal"]> = {
  "theme-midnight-ops": {
    background: colors.bgElevated,
    foreground: colors.textSecondary,
  },
  "theme-acid": { background: "#001b00", foreground: "#39ff14" },
  "theme-amber-mono": { background: "#1a1200", foreground: "#ffb000" },
  "theme-synthwave": { background: "#1a0b2e", foreground: "#ff6ad5" },
  "theme-ghost": { background: "#0e0e14", foreground: "#9aa0b5" },
  "theme-red-team": { background: "#1a0000", foreground: "#ff5b5b" },
};

const HEX_BY_CODE: Record<string, MobileCosmeticTheme["hex"]> = {
  "hex-solid": { fillOpacity: 0.16, glowOpacity: 0, strokeWidth: 2.5, dash: undefined },
  "hex-outline": { fillOpacity: 0, glowOpacity: 0, strokeWidth: 2.5, dash: undefined },
  "hex-neon": { fillOpacity: 0.08, glowOpacity: 0.42, strokeWidth: 3.2, dash: undefined },
  "hex-circuit": { fillOpacity: 0.1, glowOpacity: 0.12, strokeWidth: 2.4, dash: [5, 3] },
  "hex-glitch": { fillOpacity: 0.08, glowOpacity: 0.3, strokeWidth: 3, dash: [9, 2] },
  "hex-prisme": { fillOpacity: 0.18, glowOpacity: 0.36, strokeWidth: 3.4, dash: undefined },
};

const FRAME_BY_CODE: Record<string, MobileCosmeticTheme["frame"]> = {
  "frame-standard": { color: colors.borderDefault, glowOpacity: 0, strokeWidth: 0 },
  "frame-carbon": { color: "#8892a0", glowOpacity: 0.14, strokeWidth: 2 },
  "frame-gilded": { color: "#ffd700", glowOpacity: 0.34, strokeWidth: 2.8 },
  "frame-hologram": { color: accents.turquoise, glowOpacity: 0.4, strokeWidth: 3 },
  "frame-elite": { color: rarity.EPIC, glowOpacity: 0.42, strokeWidth: 3.2 },
};

const DEFAULT_THEME: MobileCosmeticTheme = {
  accent: accents.turquoise,
  terminal: TERMINAL_BY_CODE["theme-midnight-ops"] ?? {
    background: colors.bgElevated,
    foreground: colors.textSecondary,
  },
  hex: HEX_BY_CODE["hex-solid"] ?? {
    fillOpacity: 0.16,
    glowOpacity: 0,
    strokeWidth: 2.5,
    dash: undefined,
  },
  frame: FRAME_BY_CODE["frame-standard"] ?? {
    color: colors.borderDefault,
    glowOpacity: 0,
    strokeWidth: 0,
  },
};

const CosmeticsContext = createContext<CosmeticsState>({
  loadout: EMPTY_LOADOUT,
  theme: DEFAULT_THEME,
  setCosmetic: () => undefined,
});

function normalizedLoadout(value: Record<string, string | null> | undefined): CosmeticLoadout {
  return {
    terminalTheme: value?.terminalTheme ?? null,
    hexagonStyle: value?.hexagonStyle ?? null,
    profileFrame: value?.profileFrame ?? null,
    accentColor: value?.accentColor ?? null,
  };
}

export function cosmeticCodeForType(loadout: CosmeticLoadout, type: CosmeticType): string | null {
  switch (type) {
    case "TERMINAL_THEME":
      return loadout.terminalTheme;
    case "HEXAGON_STYLE":
      return loadout.hexagonStyle;
    case "PROFILE_FRAME":
      return loadout.profileFrame;
    case "ACCENT_COLOR":
      return loadout.accentColor;
  }
}

export function loadoutWithCosmetic(
  loadout: CosmeticLoadout,
  type: CosmeticType,
  code: string | null,
): CosmeticLoadout {
  switch (type) {
    case "TERMINAL_THEME":
      return { ...loadout, terminalTheme: code };
    case "HEXAGON_STYLE":
      return { ...loadout, hexagonStyle: code };
    case "PROFILE_FRAME":
      return { ...loadout, profileFrame: code };
    case "ACCENT_COLOR":
      return { ...loadout, accentColor: code };
  }
}

export function resolveCosmeticTheme(loadout: CosmeticLoadout): MobileCosmeticTheme {
  const accent = loadout.accentColor
    ? (ACCENT_BY_CODE[loadout.accentColor] ?? accents.turquoise)
    : accents.turquoise;
  const terminal = loadout.terminalTheme
    ? (TERMINAL_BY_CODE[loadout.terminalTheme] ?? DEFAULT_THEME.terminal)
    : DEFAULT_THEME.terminal;
  const hex = loadout.hexagonStyle
    ? (HEX_BY_CODE[loadout.hexagonStyle] ?? DEFAULT_THEME.hex)
    : DEFAULT_THEME.hex;
  const selectedFrame = loadout.profileFrame
    ? (FRAME_BY_CODE[loadout.profileFrame] ?? DEFAULT_THEME.frame)
    : DEFAULT_THEME.frame;

  return {
    accent,
    terminal,
    hex,
    frame:
      loadout.profileFrame === "frame-hologram"
        ? { ...selectedFrame, color: accent }
        : selectedFrame,
  };
}

export function CosmeticsProvider({
  userId,
  children,
}: {
  userId: string | undefined;
  children: React.ReactNode;
}): React.JSX.Element {
  const { data } = useLocker(userId);
  const [loadout, setLoadout] = useState<CosmeticLoadout>(EMPTY_LOADOUT);

  useEffect(() => {
    const next = userId ? normalizedLoadout(data?.loadout) : EMPTY_LOADOUT;
    setActiveAccentColor(resolveCosmeticTheme(next).accent);
    setLoadout(next);
  }, [data, userId]);

  const setCosmetic = useCallback(
    (type: CosmeticType, code: string | null): void => {
      const next = loadoutWithCosmetic(loadout, type, code);
      setActiveAccentColor(resolveCosmeticTheme(next).accent);
      setLoadout(next);
    },
    [loadout],
  );

  const value = useMemo<CosmeticsState>(
    () => ({ loadout, theme: resolveCosmeticTheme(loadout), setCosmetic }),
    [loadout, setCosmetic],
  );
  const renderKey = [
    loadout.accentColor,
    loadout.terminalTheme,
    loadout.hexagonStyle,
    loadout.profileFrame,
  ].join(":");

  return (
    <CosmeticsContext.Provider value={value}>
      <React.Fragment key={renderKey}>{children}</React.Fragment>
    </CosmeticsContext.Provider>
  );
}

export function useCosmetics(): CosmeticsState {
  return useContext(CosmeticsContext);
}

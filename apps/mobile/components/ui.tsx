import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Text as RNText,
  type TextProps,
  type TextStyle,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";
import { colors, fonts, space } from "@cyberlearn/tokens";
import { useCosmetics } from "@/lib/cosmetics";

// ── Typography ────────────────────────────────────────────────────────────────

type Variant = "display" | "h1" | "h2" | "h3" | "body" | "bodySm" | "mono" | "micro";

const VARIANTS: Record<Variant, TextStyle> = {
  display: {
    fontFamily: `${fonts.sans}_800ExtraBold`,
    fontSize: 32,
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  h1: {
    fontFamily: `${fonts.sans}_700Bold`,
    fontSize: 23,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  h2: { fontFamily: `${fonts.sans}_700Bold`, fontSize: 17, color: colors.textPrimary },
  h3: { fontFamily: `${fonts.sans}_600SemiBold`, fontSize: 14.5, color: colors.textPrimary },
  body: {
    fontFamily: `${fonts.sans}_400Regular`,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  bodySm: {
    fontFamily: `${fonts.sans}_400Regular`,
    fontSize: 12.5,
    color: colors.textMuted,
    lineHeight: 18,
  },
  mono: { fontFamily: `${fonts.mono}_400Regular`, fontSize: 12, color: colors.textSecondary },
  micro: {
    fontFamily: `${fonts.mono}_500Medium`,
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1.3,
    textTransform: "uppercase",
  },
};

// A span inside a line ("Bonjour, <accent>name</accent>") must inherit that
// line's font, size and line height, as nested RN text does. Falling back to
// `body` there set a 20px line height under a 30px title and clipped it.
const InsideText = React.createContext(false);

export function Text({
  variant,
  style,
  ...rest
}: TextProps & { variant?: Variant }): React.JSX.Element {
  const nested = React.useContext(InsideText);
  const base = variant ? VARIANTS[variant] : nested ? null : VARIANTS.body;
  return (
    <InsideText.Provider value={true}>
      <RNText {...rest} style={[base, style]} />
    </InsideText.Provider>
  );
}

// ── Surfaces ──────────────────────────────────────────────────────────────────

/** Square-cornered elevated card, matching the mockup. */
export function Card({
  style,
  accent,
  children,
  ...rest
}: ViewProps & { accent?: string }): React.JSX.Element {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.bgElevated,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          borderLeftWidth: accent ? 3 : 1,
          borderLeftColor: accent ?? colors.borderDefault,
          padding: space.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider({ style }: { style?: ViewStyle }): React.JSX.Element {
  return <View style={[{ height: 1, backgroundColor: colors.borderSubtle }, style]} />;
}

/** Eyebrow + title row used above each section. */
export function SectionLabel({
  eyebrow,
  title,
  right,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
}): React.JSX.Element {
  const { theme } = useCosmetics();

  return (
    <View style={{ marginBottom: space.md }}>
      {eyebrow ? (
        <Text variant="micro" style={{ color: theme.accent, marginBottom: 4 }}>
          {`// ${eyebrow}`}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="h2">{title}</Text>
        {right}
      </View>
    </View>
  );
}

/** Small mono uppercase pill / chip. */
export function Pill({
  label,
  color,
  active = false,
  dot,
}: {
  label: string;
  color?: string;
  active?: boolean;
  dot?: string;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const resolvedColor = color ?? theme.accent;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: active ? resolvedColor : colors.borderDefault,
        backgroundColor: active ? resolvedColor : "transparent",
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      {dot ? (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: active ? colors.bgBase : dot,
          }}
        />
      ) : null}
      <Text
        variant="micro"
        style={{ color: active ? colors.bgBase : resolvedColor, letterSpacing: 0.8 }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Stat cell (big number + label) for the profile / dashboard grids. */
export function StatCell({
  value,
  label,
  accent = colors.textPrimary,
}: {
  value: string | number;
  label: string;
  accent?: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        paddingVertical: 12,
        alignItems: "center",
      }}
    >
      <Text style={{ fontFamily: `${fonts.sans}_800ExtraBold`, fontSize: 22, color: accent }}>
        {value}
      </Text>
      <Text variant="micro" style={{ marginTop: 4 }}>
        {label}
      </Text>
    </View>
  );
}

// ── XP bar ────────────────────────────────────────────────────────────────────

export function XPBar({
  current,
  needed,
  height = 6,
}: {
  current: number;
  needed: number;
  height?: number;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const pct = needed > 0 ? Math.max(0, Math.min(1, current / needed)) : 0;
  return (
    <View
      style={{
        height,
        backgroundColor: "rgba(5,4,26,0.9)",
        borderWidth: 1,
        borderColor: colors.borderDefault,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={[colors.brandBlue, theme.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: "100%", width: `${pct * 100}%` }}
      />
    </View>
  );
}

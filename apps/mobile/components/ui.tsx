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
import { colors, fonts, radius, space } from "@cyberlearn/tokens";

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

export function Text({
  variant = "body",
  style,
  ...rest
}: TextProps & { variant?: Variant }): React.JSX.Element {
  return <RNText {...rest} style={[VARIANTS[variant], style]} />;
}

// ── Surfaces ──────────────────────────────────────────────────────────────────

/** Rounded elevated card; `accent` draws an inner colored strip on the left. */
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
          borderRadius: radius.lg,
          padding: space.lg,
          shadowColor: accent ?? "#000",
          shadowOpacity: accent ? 0.25 : 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 5 },
          elevation: 3,
        },
        style,
      ]}
    >
      {accent ? (
        // Inner strip instead of a thicker left border: a non-uniform border
        // would bend and taper around the rounded corners.
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 12,
            bottom: 12,
            width: 3,
            borderRadius: 2,
            backgroundColor: accent,
          }}
        />
      ) : null}
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
  return (
    <View style={{ marginBottom: space.md }}>
      {eyebrow ? (
        <Text variant="micro" style={{ color: colors.accent, marginBottom: 4 }}>
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
  color = colors.textSecondary,
  active = false,
  dot,
}: {
  label: string;
  color?: string;
  active?: boolean;
  dot?: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        borderWidth: 1,
        borderColor: active ? color : colors.borderDefault,
        backgroundColor: active ? color : "rgba(5,4,26,0.5)",
        borderRadius: radius.pill,
        paddingHorizontal: 12,
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
      <Text variant="micro" style={{ color: active ? colors.bgBase : color, letterSpacing: 0.8 }}>
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
        borderRadius: radius.md,
        backgroundColor: "rgba(10,8,38,0.5)",
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
  const pct = needed > 0 ? Math.max(0, Math.min(1, current / needed)) : 0;
  return (
    <View
      style={{
        height,
        backgroundColor: "rgba(5,4,26,0.9)",
        borderWidth: 1,
        borderColor: colors.borderDefault,
        borderRadius: radius.pill,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={[colors.brandBlue, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ height: "100%", width: `${pct * 100}%` }}
      />
    </View>
  );
}

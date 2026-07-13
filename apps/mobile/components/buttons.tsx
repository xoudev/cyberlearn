import { useRouter } from "expo-router";
import React from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { ChevronLeft } from "@/components/icons";
import { Text } from "@/components/ui";

// Mobile affordance rule: anything tappable must LOOK tappable. These chips
// give every inline action a visible bounding box, a pressed state, a >=36px
// touch target (plus hitSlop) and an accessibility role.

/** Bordered back chip used at the top of every pushed screen. */
export function BackButton({ label = "Retour" }: { label?: string }): React.JSX.Element {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel={`Revenir en arrière (${label})`}
      hitSlop={8}
      style={({ pressed }) => ({
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: 36,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: pressed ? colors.accent : colors.borderDefault,
        backgroundColor: pressed ? "rgba(10,255,212,0.08)" : "rgba(5,4,26,0.5)",
      })}
    >
      <ChevronLeft color={colors.textSecondary} size={13} strokeWidth={1.8} />
      <Text variant="micro" style={{ color: colors.textSecondary, letterSpacing: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Small bordered action chip for inline text actions ("Tout lire", "Notes"…). */
export function ActionChip({
  label,
  onPress,
  tone = "accent",
  icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  tone?: "accent" | "neutral" | "danger";
  icon?: React.ReactNode;
  disabled?: boolean;
}): React.JSX.Element {
  const color =
    tone === "accent" ? colors.accent : tone === "danger" ? colors.danger : colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        minHeight: 34,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: pressed ? color : `${color}66`,
        backgroundColor: pressed ? `${color}14` : "transparent",
        opacity: disabled ? 0.45 : 1,
      })}
    >
      {icon}
      <Text variant="micro" style={{ color, letterSpacing: 0.8 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Circular bordered icon button (header bell, etc.). */
export function IconButton({
  onPress,
  accessibilityLabel,
  children,
  badge,
  style,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
  style?: ViewStyle;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={6}
      style={({ pressed }) => [
        {
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: pressed ? colors.accent : colors.borderDefault,
          backgroundColor: pressed ? "rgba(10,255,212,0.08)" : "rgba(5,4,26,0.5)",
        },
        style,
      ]}
    >
      {children}
      {badge ? <View style={{ position: "absolute", top: -2, right: -2 }}>{badge}</View> : null}
    </Pressable>
  );
}

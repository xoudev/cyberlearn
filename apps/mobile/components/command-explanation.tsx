import React from "react";
import { View } from "react-native";
import { explainLine, PART_KIND_LABELS, type PartKind } from "@cyberlearn/lib/terminal/explain";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * A command line explained word by word, the site's panel in the app: what
 * the terminal card shows under a command the learner taps
 * (@cyberlearn/lib/terminal/explain, the same words on both sides).
 */

const MONO = `${fonts.mono}_500Medium`;

export function CommandExplanation({ line }: { line: string }): React.JSX.Element {
  const { theme } = useCosmetics();
  const { parts, commands } = explainLine(line);
  const colorOf = (kind: PartKind): string =>
    kind === "command" || kind === "subcommand"
      ? theme.accent
      : kind === "operator"
        ? colors.danger
        : kind === "unknown"
          ? colors.textMuted
          : colors.textPrimary;

  return (
    <View
      accessibilityLabel={`Explication : ${line}`}
      style={{
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        padding: 10,
        gap: 8,
        marginBottom: 4,
      }}
    >
      {parts.length === 0 ? (
        <Text variant="bodySm">Rien à expliquer : la ligne est vide.</Text>
      ) : null}
      {commands.length > 0 ? (
        <Text variant="bodySm" style={{ color: colors.textSecondary }}>
          {commands.map((command) => `${command.name} : ${command.summary}`).join(" · ")}
        </Text>
      ) : null}
      {parts.map((part, k) => (
        <View key={k} style={{ gap: 2 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
            <Text style={{ fontFamily: MONO, fontSize: 12.5, color: colorOf(part.kind) }}>
              {part.text}
            </Text>
            <Text variant="micro">{PART_KIND_LABELS[part.kind]}</Text>
          </View>
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            {part.role}
          </Text>
        </View>
      ))}
    </View>
  );
}

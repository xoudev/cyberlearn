import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { CommandExplanation } from "@/components/command-explanation";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";
import type { Block } from "@/lib/lesson-blocks";

type TerminalBlock = Extract<Block, { kind: "terminal" }>;

/**
 * The card the app shows for a SimulatedTerminal or a LinuxTerminal: the
 * commands to practise and the hints; the terminal itself runs on the site
 * (docs/MOBILE_PARITY.md). A tap on a command explains it word by word, the
 * way a click does on the site.
 */
export function TerminalCard({ block }: { block: TerminalBlock }): React.JSX.Element {
  const { theme } = useCosmetics();
  const [explained, setExplained] = useState<number | null>(null);

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.borderDefault,
        backgroundColor: theme.terminal.background,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        }}
      >
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger }} />
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.warning }} />
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success }} />
        <Text variant="micro" style={{ marginLeft: 6, color: colors.textMuted }}>
          {block.title ?? "Terminal"}
        </Text>
      </View>
      <View style={{ padding: 12, gap: 6 }}>
        {block.timeLimitMinutes !== undefined ? (
          <Text variant="bodySm" style={{ color: colors.warning }}>
            Épreuve chronométrée : {block.timeLimitMinutes} minute
            {block.timeLimitMinutes > 1 ? "s" : ""}, à passer dans le vrai terminal, sur le site.
          </Text>
        ) : null}
        {block.commands.length > 0 ? (
          <>
            <Text variant="micro" style={{ color: colors.textMuted }}>
              Commandes à essayer · touche une commande pour l'expliquer
            </Text>
            {block.commands.map((command, i) => (
              <View key={i} style={{ gap: 6 }}>
                <Pressable
                  onPress={() => {
                    setExplained(explained === i ? null : i);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`${explained === i ? "Replier" : "Expliquer"} : ${command}`}
                  accessibilityState={{ expanded: explained === i }}
                >
                  <Text
                    style={{
                      fontFamily: `${fonts.mono}_500Medium`,
                      fontSize: 12.5,
                      color: explained === i ? theme.accent : theme.terminal.foreground,
                    }}
                  >
                    $ {command}
                  </Text>
                </Pressable>
                {explained === i ? <CommandExplanation line={command} /> : null}
              </View>
            ))}
          </>
        ) : (
          <Text
            style={{
              fontFamily: `${fonts.mono}_400Regular`,
              fontSize: 12.5,
              color: theme.terminal.foreground,
            }}
          >
            $ _ terminal interactif (sur le web)
          </Text>
        )}
        {block.hints.length > 0 ? (
          <View style={{ marginTop: 4, gap: 3 }}>
            {block.hints.map((hint, i) => (
              <Text key={i} variant="bodySm" style={{ color: colors.textMuted }}>
                › {hint}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
}

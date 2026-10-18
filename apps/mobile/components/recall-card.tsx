import React from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import {
  RECALL_NOTE,
  RECALL_STATE_ACTION,
  RECALL_STATE_TEXT,
  type RecallState,
} from "@cyberlearn/lib/revisions/recall-copy";
import { ActionChip, GradientButton } from "@/components/buttons";
import { Card, Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The day's recall on the home tab, as the site's dashboard shows it: to do,
 * done, or nothing to ask, and the way into the Révisions screen. It never
 * says how many questions wait: a number that only grows while one is away
 * is a reason not to come back. Same words as the site
 * (@cyberlearn/lib/revisions/recall-copy).
 */
export function RecallCard({
  state,
  onOpen,
}: {
  state: RecallState;
  onOpen: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const action = RECALL_STATE_ACTION[state];
  return (
    <Card accent={state === "todo" ? theme.accent : colors.borderDefault} style={{ gap: 10 }}>
      <Text variant="body" style={state === "todo" ? { color: colors.textPrimary } : undefined}>
        {RECALL_STATE_TEXT[state]}
      </Text>
      {action === null ? null : state === "todo" ? (
        <GradientButton label={action} onPress={onOpen} />
      ) : (
        <View style={{ alignSelf: "flex-start" }}>
          <ActionChip label={action} tone="neutral" onPress={onOpen} />
        </View>
      )}
      <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
        {RECALL_NOTE}
      </Text>
    </Card>
  );
}

import React from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import {
  TICKET_STATUS_LABEL,
  TICKET_STATUS_TONE,
  type TicketStatusKey,
} from "@cyberlearn/lib/tickets/tickets";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/** "Reçu", "En traitement", "Résolu", "Clos", in the site's colours. */
export function TicketStatusPill({ status }: { status: TicketStatusKey }): React.JSX.Element {
  const { theme } = useCosmetics();
  const tone = TICKET_STATUS_TONE[status];
  const color =
    tone === "accent" ? theme.accent : tone === "warning" ? colors.warning : colors.textMuted;
  return (
    <View style={{ borderWidth: 1, borderColor: color, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text variant="micro" style={{ color, fontSize: 9 }}>
        {TICKET_STATUS_LABEL[status]}
      </Text>
    </View>
  );
}

import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { ChevronRight } from "@/components/icons";
import { Card, Divider, Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";
import { invitationMeta, type DuelSummary } from "@/lib/duels";
import type { TournamentSummary } from "@/lib/tournaments";

/**
 * What will not wait, on the home tab as on the site's dashboard: the duels a
 * friend sent the reader, still waiting on an answer, then the tournaments
 * under way. Each row opens its screen, where the invitation is answered and
 * the tournament played. Drawn only when there is one (planSections' "play").
 */
export function YourMove({
  invitations,
  tournaments,
}: {
  invitations: DuelSummary[];
  tournaments: TournamentSummary[];
}): React.JSX.Element {
  const router = useRouter();
  const { theme } = useCosmetics();

  const rows: {
    key: string;
    eyebrow: string;
    tone: string;
    title: string;
    meta: string;
    open: () => void;
  }[] = [
    ...invitations.map((duel) => ({
      key: `duel-${duel.id}`,
      eyebrow: "Défi reçu",
      tone: theme.accent,
      title: `${duel.other.name} te défie sur « ${duel.pathTitle} »`,
      meta: invitationMeta(duel),
      open: () => {
        router.push({ pathname: "/duels/[id]", params: { id: duel.id } });
      },
    })),
    ...tournaments.map((t) => ({
      key: `tournament-${t.id}`,
      eyebrow: "Tournoi en cours",
      tone: colors.danger,
      title: t.title,
      meta: `Se termine ${t.endsLabel}`,
      open: () => {
        router.push({ pathname: "/tournaments/[id]", params: { id: t.id } });
      },
    })),
  ];

  return (
    <Card style={{ padding: 0 }}>
      {rows.map((row, i) => (
        <View key={row.key}>
          {i > 0 ? <Divider /> : null}
          <PressableScale
            onPress={row.open}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 14,
              paddingVertical: 12,
            }}
          >
            <View style={{ flex: 1, paddingRight: 12, gap: 2 }}>
              <Text variant="micro" style={{ color: row.tone }}>
                {row.eyebrow}
              </Text>
              <Text variant="bodySm" style={{ color: colors.textPrimary }} numberOfLines={2}>
                {row.title}
              </Text>
              <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                {row.meta}
              </Text>
            </View>
            <ChevronRight color={row.tone} size={16} />
          </PressableScale>
        </View>
      ))}
    </Card>
  );
}

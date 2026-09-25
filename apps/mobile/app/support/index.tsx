import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { TICKET_STATUS_LABEL } from "@cyberlearn/lib/tickets/tickets";
import { PressableScale } from "@/components/anim";
import { BackButton, GradientButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { TicketStatusPill } from "@/components/support";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";
import { useSupportTickets } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { ticketListMeta } from "@/lib/support";

/**
 * Everything this account has asked the team, and where each one stands: the
 * site's /support. The answers arrive here and by e-mail.
 */
export default function SupportList(): React.JSX.Element {
  const router = useRouter();
  const { theme } = useCosmetics();
  const { session } = useSession();
  const { data, isLoading, error, refetch } = useSupportTickets(session?.user.id);

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton />
      </View>
      <View style={{ gap: 8, marginBottom: 20 }}>
        <Text variant="micro" style={{ color: theme.accent }}>
          {`// Support · ${String(data?.length ?? 0)} demande${(data?.length ?? 0) > 1 ? "s" : ""}`}
        </Text>
        <Text variant="display" style={{ fontSize: 28 }}>
          Mes demandes
        </Text>
        <Text variant="body">
          Ce que tu as envoyé à l&apos;équipe, et où ça en est. Les réponses arrivent ici et par
          e-mail.
        </Text>
      </View>

      <GradientButton
        label="Nouvelle demande"
        onPress={() => {
          router.push("/support/new");
        }}
        style={{ marginBottom: 20 }}
      />

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="SUPPORT_LOAD" />
      ) : data.length === 0 ? (
        <EmptyState
          title="Rien d'envoyé pour l'instant"
          body="Un bug, une question, une erreur dans une leçon ou une demande d'ajout de ton établissement : c'est ici que ça commence."
        />
      ) : (
        <View style={{ gap: 10 }}>
          {data.map((ticket) => (
            <PressableScale
              key={ticket.id}
              accessibilityLabel={`${ticket.subject}, ${TICKET_STATUS_LABEL[ticket.status]}`}
              onPress={() => {
                router.push({ pathname: "/support/[id]", params: { id: ticket.id } });
              }}
            >
              <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text variant="h3" numberOfLines={2}>
                    {ticket.subject}
                  </Text>
                  <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
                    {ticketListMeta(ticket)}
                  </Text>
                </View>
                <TicketStatusPill status={ticket.status} />
              </Card>
            </PressableScale>
          ))}
        </View>
      )}
    </Screen>
  );
}

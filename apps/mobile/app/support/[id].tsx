import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import {
  TICKET_REPLY_MAX,
  TICKET_THEME_LABEL,
  ticketReplyProblem,
} from "@cyberlearn/lib/tickets/tickets";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { MessageInput } from "@/components/forum";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { TicketStatusPill } from "@/components/support";
import { Card, Text } from "@/components/ui";
import { replySupportTicketApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import { useSupportThread } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { closedNotice, speakerLine, type SupportThread } from "@/lib/support";

/**
 * One request, as the person who opened it sees it: the site's /support/<id>.
 * The ticket's own message opens the thread, the team's answers follow, and
 * the reply box stays only while the request takes replies. That rule is the
 * repository's (acceptsReplies); a reply it refuses is refused in its words.
 */
export default function SupportTicketScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const { data, isLoading, error, refetch } = useSupportThread(session?.user.id, id);

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Mes demandes" />
      </View>
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="SUPPORT_TICKET" />
      ) : (
        <Thread
          ticket={data}
          onReplied={async () => {
            await refetch();
          }}
        />
      )}
    </Screen>
  );
}

function Thread({
  ticket,
  onReplied,
}: {
  ticket: SupportThread;
  onReplied: () => Promise<void>;
}): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme } = useCosmetics();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (): Promise<void> => {
    const problem = ticketReplyProblem(body);
    if (problem !== null) {
      setError(problem);
      return;
    }
    setSending(true);
    setError(null);
    const reply = await replySupportTicketApi(ticket.id, body.trim());
    setSending(false);
    if (!reply.ok) {
      setError(reply.error ?? "Le message n'a pas pu être envoyé. Réessaie.");
      // The request may have ended since the screen opened: show where it is.
      await onReplied();
      return;
    }
    setBody("");
    void queryClient.invalidateQueries({ queryKey: ["support"] });
    await onReplied();
  };

  const turns = [
    // The ticket's own message is the first turn of the conversation.
    {
      id: "opening",
      body: ticket.message,
      fromStaff: false,
      createdAt: ticket.createdAt,
      authorName: null,
    },
    ...ticket.messages,
  ];

  return (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Text variant="micro" style={{ color: theme.accent }}>
          {`// ${TICKET_THEME_LABEL[ticket.theme]}`}
        </Text>
        <Text variant="display" style={{ fontSize: 24 }}>
          {ticket.subject}
        </Text>
        <View style={{ alignSelf: "flex-start" }}>
          <TicketStatusPill status={ticket.status} />
        </View>
      </View>

      <View style={{ gap: 10 }}>
        {turns.map((turn) => (
          <Card
            key={turn.id}
            accent={turn.fromStaff ? theme.accent : undefined}
            style={{ gap: 6, marginLeft: turn.fromStaff ? 0 : 24 }}
          >
            <Text
              variant="micro"
              style={{ color: turn.fromStaff ? theme.accent : colors.textMuted }}
            >
              {speakerLine(turn)}
            </Text>
            <Text variant="body" selectable style={{ color: colors.textPrimary }}>
              {turn.body}
            </Text>
          </Card>
        ))}
      </View>

      {ticket.acceptsReplies ? (
        <View style={{ gap: 8 }}>
          <Text variant="micro">Répondre</Text>
          <MessageInput
            value={body}
            onChangeText={(text) => {
              setBody(text);
              setError(null);
            }}
            maxLength={TICKET_REPLY_MAX}
            placeholder="Ton message…"
            accessibilityLabel="Ton message"
          />
          {error !== null ? (
            <Text
              variant="bodySm"
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={{ color: colors.danger }}
            >
              {error}
            </Text>
          ) : null}
          <GradientButton
            label={sending ? "Envoi…" : "Envoyer"}
            disabled={sending}
            onPress={() => void send()}
          />
        </View>
      ) : (
        <Card style={{ gap: 10 }}>
          <Text variant="bodySm">{closedNotice(ticket)}</Text>
          {error !== null ? (
            <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}
          <View style={{ alignSelf: "flex-start" }}>
            <ActionChip
              label="Nouvelle demande"
              onPress={() => {
                router.push("/support/new");
              }}
            />
          </View>
        </Card>
      )}
    </View>
  );
}

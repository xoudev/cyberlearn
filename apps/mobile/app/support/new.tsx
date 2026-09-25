import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import {
  ESTABLISHMENT_CHECKLIST,
  TICKET_FORM_THEMES,
  TICKET_MESSAGE_MAX,
  TICKET_SUBJECT_MAX,
  ticketDraftProblem,
  type TicketFormTheme,
} from "@cyberlearn/lib/tickets/tickets";
import { BackButton, GradientButton } from "@/components/buttons";
import { MessageInput } from "@/components/forum";
import { Screen } from "@/components/screen";
import { Text } from "@/components/ui";
import { fileSupportTicketApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * A new request: the site's contact form, for a signed-in account. No address
 * to type: the answer goes to the account's own, which the server reads.
 */
export default function SupportNew(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme: cosmetic } = useCosmetics();
  const [theme, setTheme] = useState<TicketFormTheme | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (): Promise<void> => {
    const problem = ticketDraftProblem({ theme, subject, message });
    if (problem !== null || theme === null) {
      setError(problem ?? "Choisis un thème.");
      return;
    }
    setSending(true);
    setError(null);
    const reply = await fileSupportTicketApi({
      theme,
      subject: subject.trim(),
      message: message.trim(),
    });
    setSending(false);
    if (!reply.ok) {
      const firstField = reply.fieldErrors ? Object.values(reply.fieldErrors)[0] : undefined;
      setError(firstField ?? reply.error);
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["support"] });
    router.replace({ pathname: "/support/[id]", params: { id: reply.ticketId } });
  };

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Mes demandes" />
      </View>
      <View style={{ gap: 18 }}>
        <View style={{ gap: 8 }}>
          <Text variant="micro" style={{ color: cosmetic.accent }}>
            {"// Support"}
          </Text>
          <Text variant="display" style={{ fontSize: 28 }}>
            Nouvelle demande
          </Text>
          <Text variant="body">
            L&apos;équipe te répond ici et par e-mail, à l&apos;adresse de ton compte.
          </Text>
        </View>

        <View style={{ gap: 8 }}>
          <Text variant="micro">Thème</Text>
          <View
            accessibilityRole="radiogroup"
            style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
          >
            {TICKET_FORM_THEMES.map((option) => {
              const selected = theme === option.value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => {
                    setTheme(option.value);
                    setError(null);
                  }}
                  style={{
                    minHeight: 40,
                    justifyContent: "center",
                    paddingHorizontal: 12,
                    borderWidth: 1,
                    borderColor: selected ? cosmetic.accent : colors.borderDefault,
                    backgroundColor: selected ? `${cosmetic.accent}14` : "transparent",
                  }}
                >
                  <Text
                    variant="bodySm"
                    style={{ color: selected ? cosmetic.accent : colors.textSecondary }}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {/* The one theme that needs saying what to put in it, said before
              the message box rather than in a reply a day later. */}
          {theme === "ESTABLISHMENT_REQUEST" ? (
            <View
              style={{
                gap: 6,
                padding: 12,
                borderLeftWidth: 3,
                borderLeftColor: cosmetic.accent,
                backgroundColor: `${cosmetic.accent}0D`,
              }}
            >
              <Text variant="micro" style={{ color: cosmetic.accent }}>
                À mettre dans ton message
              </Text>
              {ESTABLISHMENT_CHECKLIST.map((line) => (
                <Text key={line} variant="bodySm" style={{ color: colors.textSecondary }}>
                  • {line}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ gap: 6 }}>
          <Text variant="micro">Objet</Text>
          <MessageInput
            value={subject}
            onChangeText={(text) => {
              setSubject(text);
              setError(null);
            }}
            multiline={false}
            minHeight={48}
            maxLength={TICKET_SUBJECT_MAX}
            placeholder="Résume ton problème en quelques mots"
            accessibilityLabel="Objet"
          />
        </View>

        <View style={{ gap: 6 }}>
          <Text variant="micro">Message</Text>
          <MessageInput
            value={message}
            onChangeText={(text) => {
              setMessage(text);
              setError(null);
            }}
            minHeight={160}
            maxLength={TICKET_MESSAGE_MAX}
            placeholder="Décris ta demande en détail…"
            accessibilityLabel="Message"
          />
        </View>

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
          label={sending ? "Envoi…" : "Envoyer la demande"}
          disabled={sending}
          onPress={() => void send()}
        />
      </View>
    </Screen>
  );
}

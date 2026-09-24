import { useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { ActionChip, GradientButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { ListSkeleton } from "@/components/states";
import { Card, Text } from "@/components/ui";
import { acknowledgeBanApi, appealBanApi } from "@/lib/api";
import { APPEAL_MAX_LENGTH, appealProblem, banDurationLabel } from "@/lib/ban";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useActiveBan } from "@/lib/use-active-ban";

/**
 * Where a banned account lands, and the only screen it can open: the site's
 * /banned. The reason, when it was decided, how long is left, and the appeal.
 * The root layout sends people here while a ban is in force and back home once
 * it ends or is lifted.
 */
export default function Banned(): React.JSX.Element {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const { data: ban } = useActiveBan(userId);
  const acknowledgedRef = useRef(false);
  const [appealOpen, setAppealOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // The whole screen is the notice: having shown it counts as seen, which the
  // site records when its notice is closed.
  useEffect(() => {
    if (ban && !ban.acknowledged && !acknowledgedRef.current) {
      acknowledgedRef.current = true;
      void acknowledgeBanApi();
    }
  }, [ban]);

  if (!ban) {
    return (
      <Screen>
        <ListSkeleton rows={3} />
      </Screen>
    );
  }

  const appealed = sent || ban.appealed;
  const issuedOn = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(ban.createdAt);

  const send = async (): Promise<void> => {
    const problem = appealProblem(message);
    if (problem !== null) {
      setError(problem);
      return;
    }
    setSending(true);
    setError(null);
    const result = await appealBanApi(message.trim());
    setSending(false);
    if (!result.ok) {
      setError(result.error ?? "L'appel n'a pas pu être envoyé. Réessaie.");
      return;
    }
    setSent(true);
    setAppealOpen(false);
    void queryClient.invalidateQueries({ queryKey: ["ban", userId] });
  };

  return (
    <Screen>
      <View style={{ gap: 20, paddingTop: 24 }}>
        <View style={{ gap: 10 }}>
          <Text variant="micro" style={{ color: colors.danger }}>
            Accès suspendu · 403
          </Text>
          <Text variant="display" style={{ fontSize: 28 }}>
            Ton compte est banni.
          </Text>
          <Text variant="body">
            Tu ne peux plus publier ni suivre de leçon pour l&apos;instant. Ta progression, tes
            notes et tes badges sont intacts : rien n&apos;a été supprimé.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Fact label="Décidé le" value={issuedOn} />
          <Fact label="Durée" value={banDurationLabel(ban, new Date())} />
        </View>

        <Card accent={colors.danger} style={{ gap: 6 }}>
          <Text variant="micro">Motif</Text>
          <Text variant="body" style={{ color: colors.textPrimary }}>
            {ban.reason}
          </Text>
        </Card>

        {appealed ? (
          <Card style={{ gap: 6 }}>
            <Text variant="micro" style={{ color: colors.success }}>
              Appel transmis
            </Text>
            <Text variant="bodySm" style={{ color: colors.textSecondary }}>
              Ton appel a été transmis à l&apos;équipe de modération. La réponse arrivera par e-mail
              : elle contient la décision, pas seulement un avis de passage.
            </Text>
          </Card>
        ) : appealOpen ? (
          <View style={{ gap: 10 }}>
            <Text variant="micro">Ton message</Text>
            <TextInput
              value={message}
              onChangeText={(text) => {
                setMessage(text);
                setError(null);
              }}
              maxLength={APPEAL_MAX_LENGTH}
              multiline
              placeholder="Explique ce qui s'est passé, de ton point de vue."
              placeholderTextColor={colors.textDisabled}
              accessibilityLabel="Ton message d'appel"
              style={{
                minHeight: 140,
                padding: 12,
                borderWidth: 1,
                borderColor: colors.borderDefault,
                backgroundColor: colors.bgBase,
                color: colors.textPrimary,
                fontFamily: `${fonts.sans}_400Regular`,
                fontSize: 14,
                textAlignVertical: "top",
              }}
            />
            <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
              {message.trim().length} / {APPEAL_MAX_LENGTH} · 30 caractères au minimum
            </Text>
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
              label={sending ? "Envoi…" : "Envoyer l'appel"}
              disabled={sending}
              onPress={() => void send()}
            />
            <View style={{ alignSelf: "flex-start" }}>
              <ActionChip
                label="Annuler"
                tone="neutral"
                disabled={sending}
                onPress={() => {
                  setAppealOpen(false);
                  setError(null);
                }}
              />
            </View>
          </View>
        ) : (
          <GradientButton
            label="Faire appel"
            onPress={() => {
              setAppealOpen(true);
            }}
          />
        )}

        <View style={{ alignSelf: "flex-start" }}>
          <ActionChip
            label="Se déconnecter"
            tone="neutral"
            onPress={() => void supabase.auth.signOut()}
          />
        </View>
      </View>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        gap: 4,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <Text variant="micro">{label}</Text>
      <Text variant="bodySm" style={{ color: colors.textPrimary }}>
        {value}
      </Text>
    </View>
  );
}

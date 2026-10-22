import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { ActionChip, GradientButton } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { ListSkeleton } from "@/components/states";
import { Card, Text } from "@/components/ui";
import { acknowledgeBanApi, appealBanApi, SITE_URL } from "@/lib/api";
import { APPEAL_MAX_LENGTH, appealProblem, banDurationLabel } from "@/lib/ban";
import { appealView } from "@cyberlearn/lib/tickets/appeal";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";
import { useActiveBan } from "@/lib/use-active-ban";
import { useBanAppeal } from "@/lib/use-ban-appeal";

/** The day of the team's answer. */
const REPLY_DAY = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Where a banned account lands, and the only screen it can open: the site's
 * /banned. The reason, when it was decided, how long is left, and the appeal,
 * with the team's answer once there is one: the appeal's ticket is closed to
 * its author while the ban stands, so this screen is where the answer is read.
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
  const { data: standing } = useBanAppeal(userId, sent || ban?.appealed === true);

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
    void queryClient.invalidateQueries({ queryKey: ["ban-appeal", userId] });
  };

  // An appeal sent a moment ago has no ticket read yet: it is just received.
  const view = standing ?? appealView({ status: "OPEN", reply: null });

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
          <Card style={{ gap: 6 }} accessibilityLiveRegion="polite">
            {/* An appeal examined and refused is not a success to be shown in green. */}
            <Text
              variant="micro"
              style={{ color: view.stage === "DECIDED" ? colors.textMuted : colors.success }}
            >
              {view.title}
            </Text>
            <Text variant="bodySm" style={{ color: colors.textSecondary }}>
              {view.text}
            </Text>
            {view.reply !== null ? (
              <View
                style={{
                  gap: 4,
                  marginTop: 6,
                  paddingLeft: 10,
                  borderLeftWidth: 2,
                  borderLeftColor: colors.borderDefault,
                }}
              >
                <Text variant="micro">
                  Réponse de l&apos;équipe · {REPLY_DAY.format(new Date(view.reply.createdAt))}
                </Text>
                <Text variant="body" style={{ color: colors.textPrimary }}>
                  {view.reply.body}
                </Text>
              </View>
            ) : null}
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

        {/* A ban closes the app, not the rights over what it holds (RGPD art.
            15, 17 and 20). The export and the deletion live on the site
            (docs/MOBILE_PARITY.md), whose /banned page offers the download;
            a deletion goes through privacy@, as the privacy page says. */}
        <Card style={{ gap: 8 }}>
          <Text variant="micro">Tes données</Text>
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            Le bannissement ne touche pas à tes droits sur tes données. Tu peux en télécharger une
            copie sur le site, une fois connecté·e. Pour supprimer ton compte, écris à
            privacy@cyberlearn.fr depuis l&apos;adresse associée à ton compte : la réponse arrive
            sous un mois au plus.
          </Text>
          <View style={{ alignSelf: "flex-start" }}>
            <ActionChip
              label="Mes données sur le site"
              tone="neutral"
              onPress={() => void WebBrowser.openBrowserAsync(`${SITE_URL}/banned`)}
            />
          </View>
        </Card>

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

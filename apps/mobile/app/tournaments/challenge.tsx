import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { BlockView } from "@/components/lesson-render";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Text } from "@/components/ui";
import { fetchTournamentChallengeApi, submitTournamentFlagApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import { parseLesson } from "@/lib/lesson-blocks";
import { flagReplyLine, type TournamentChallengeView } from "@/lib/tournaments";

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || "https://cyberlearn.fr";

/**
 * One challenge of a tournament, as the site's page shows it, less what only
 * the site can play: a Linux machine or the Python runner, one tap away. The
 * statement and the flag are here.
 */
export default function TournamentChallengeScreen(): React.JSX.Element {
  const { id, slug } = useLocalSearchParams<{ id: string; slug: string }>();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["tournament-challenge", id, slug],
    enabled: Boolean(id) && Boolean(slug),
    queryFn: () => fetchTournamentChallengeApi(id ?? "", slug ?? ""),
  });

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Le tournoi" />
      </View>
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error !== null ? (
        <ErrorState onRetry={() => void refetch()} code="TOURNAMENT_CHALLENGE_LOAD" />
      ) : data === null || data === undefined ? (
        <EmptyState
          title="Défi introuvable"
          body="Ce défi n'est pas ouvert : le tournoi n'a peut-être pas commencé."
        />
      ) : (
        <ChallengeBody page={data} />
      )}
    </Screen>
  );
}

function ChallengeBody({ page }: { page: TournamentChallengeView }): React.JSX.Element {
  const { theme } = useCosmetics();
  const { tournament, challenge, solved } = page;
  const sections = useMemo(() => parseLesson(challenge.instructions).sections, [challenge]);
  const siteUrl = `${SITE_URL}/tournaments/${tournament.id}/${challenge.slug}`;
  const notice =
    tournament.phase === "FINISHED"
      ? "Le tournoi est terminé : les flags ne comptent plus."
      : tournament.canPlay
        ? null
        : "Seuls les élèves des classes du tournoi y donnent un flag.";

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
          {`${tournament.title} · ${categoryMeta(challenge.category).label} · ${difficultyMeta(challenge.difficulty).label} · ${String(challenge.points)} pts`}
        </Text>
        <Text variant="display" style={{ fontSize: 26 }}>
          {challenge.title}
        </Text>
        <Text variant="body">{challenge.description}</Text>
      </View>

      <View style={{ gap: 12 }}>
        {sections.map((section) => (
          <View key={section.title} style={{ gap: 10 }}>
            {section.title !== "Introduction" ? <Text variant="h2">{section.title}</Text> : null}
            {section.blocks.map((block, i) => (
              <BlockView key={i} block={block} index={i} />
            ))}
          </View>
        ))}
      </View>

      {challenge.onMachine || challenge.type === "SCRIPT" ? (
        <Card accent={theme.accent} style={{ gap: 8 }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            {challenge.onMachine ? "MACHINE LINUX" : "PYTHON"}
          </Text>
          <Text variant="bodySm">
            {challenge.onMachine
              ? "Ce défi se joue sur une machine Linux qui tourne dans le navigateur, sur le site : il faut un clavier et un écran. Le flag que tu y trouves est le tien ; reviens le donner ici ou sur le site."
              : "Le code se lance sur le site, dans son interpréteur Python. Le flag qu'il affiche se donne ici ou là-bas."}
          </Text>
          <ActionChip
            label="Ouvrir sur le site"
            onPress={() => {
              void WebBrowser.openBrowserAsync(siteUrl);
            }}
          />
        </Card>
      ) : null}

      {solved ? (
        <Card accent={colors.success} style={{ gap: 4 }}>
          <Text variant="micro" style={{ color: colors.success }}>
            TROUVÉ
          </Text>
          <Text variant="bodySm">
            {`Ce défi compte pour toi et pour ${tournament.myTeam ?? "ton équipe"}.`}
          </Text>
        </Card>
      ) : notice !== null ? (
        <Text variant="bodySm" style={{ color: colors.textMuted }}>
          {notice}
        </Text>
      ) : (
        <FlagForm tournamentId={tournament.id} challengeId={challenge.id} />
      )}
    </View>
  );
}

function FlagForm({
  tournamentId,
  challengeId,
}: {
  tournamentId: string;
  challengeId: string;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [flag, setFlag] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    const reply = await submitTournamentFlagApi(tournamentId, challengeId, flag);
    setBusy(false);
    setMessage(flagReplyLine(reply));
    if (reply.ok && reply.correct) {
      setFlag("");
      void queryClient.invalidateQueries({ queryKey: ["tournament-challenge", tournamentId] });
      void queryClient.invalidateQueries({ queryKey: ["tournament", tournamentId] });
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <Text variant="h2">Ton flag</Text>
      <TextInput
        value={flag}
        onChangeText={(text) => {
          setFlag(text);
          setMessage(null);
        }}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={500}
        placeholder="CL{...}"
        placeholderTextColor={colors.textDisabled}
        accessibilityLabel="Ton flag"
        editable={!busy}
        style={{
          padding: 12,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          backgroundColor: colors.bgBase,
          color: colors.textPrimary,
          fontFamily: `${fonts.mono}_400Regular`,
          fontSize: 14,
        }}
      />
      {message !== null ? (
        <Text variant="bodySm" style={{ color: message.ok ? colors.success : colors.danger }}>
          {message.text}
        </Text>
      ) : null}
      <GradientButton
        label="Valider le flag"
        loading={busy}
        disabled={flag.trim() === ""}
        onPress={() => void submit()}
      />
    </View>
  );
}

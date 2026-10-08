import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import { TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import {
  CHALLENGE_STATUS_LABELS,
  challengeStatus,
  challengeTypeLabel,
  flagNotice,
  tournamentDateLabel,
} from "@cyberlearn/lib/challenges/tournament";
import { categoryMeta, difficultyMeta } from "@cyberlearn/lib/content/vocabulary";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { CheckIcon, LockIcon } from "@/components/icons";
import { BlockView } from "@/components/lesson-render";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Figure, NumberedFacts, PhasePill, SectionCount } from "@/components/tournament-parts";
import { Card, Pill, SectionLabel, Text } from "@/components/ui";
import { fetchTournamentChallengeApi, submitTournamentFlagApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import { parseLesson } from "@/lib/lesson-blocks";
import {
  CHALLENGE_STATUS_COLOR,
  flagReplyLine,
  siteLink,
  TOURNAMENT_ACCENT,
  type TournamentChallengeView,
} from "@/lib/tournaments";

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || "https://cyberlearn.fr";

/** The tournament's rules, in the site's words. */
const RULES: readonly { text: string }[] = [
  {
    text: "Les points du défi vont à ton équipe la première fois qu'un de ses membres trouve le flag.",
  },
  { text: "Ton score à toi compte les flags que tu trouves toi-même." },
  {
    text: "Un mauvais flag ne coûte rien. Trop d'essais d'affilée, et il faut attendre une minute.",
  },
];

/** The fourth rule, on a challenge played on a machine. */
const MACHINE_RULE = {
  text: "Sur la machine, le flag est à toi seul : celui d'un camarade ne marchera pas chez toi.",
};

/**
 * One challenge of a tournament, as the site's page shows it, less what only
 * the site can play: a Linux machine or the Python runner, one tap away. The
 * tournament it belongs to, the briefing (its points, where the reader stands
 * with it, their team, the end), the statement, its connection and its file,
 * the flag and the tournament's rules are here.
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

/**
 * The challenge once read: its tournament and its head, its briefing, its
 * statement, its flag and the rules.
 */
function ChallengeBody({ page }: { page: TournamentChallengeView }): React.JSX.Element {
  const { theme } = useCosmetics();
  const { tournament, challenge, solved } = page;
  const sections = useMemo(() => parseLesson(challenge.instructions).sections, [challenge]);
  const siteUrl = `${SITE_URL}/tournaments/${tournament.id}/${challenge.slug}`;
  const notice = flagNotice(tournament);
  const status = challengeStatus(tournament, solved);
  const category = categoryMeta(challenge.category);
  const diff = difficultyMeta(challenge.difficulty);
  const attachment =
    challenge.attachmentUrl === null ? null : siteLink(challenge.attachmentUrl, SITE_URL);
  // A flag given here counts for the tournament, which a Python challenge,
  // also in the catalogue, has to say.
  const scriptNote = challenge.type === "SCRIPT" && !solved && notice === null;

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 10 }}>
        <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
          {`Tournoi · ${tournament.title}`}
        </Text>
        <Text variant="micro" style={{ color: TOURNAMENT_ACCENT }}>
          {`// Défi de tournoi · ${category.short}`}
        </Text>
        <Text variant="display" style={{ fontSize: 26 }}>
          {challenge.title}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          <Pill label={category.short} color={category.color} />
          <Pill label={diff.label} color={diff.color} />
          <Pill label={challengeTypeLabel(challenge.type)} color={colors.textSecondary} />
        </View>
        <Text variant="body">{challenge.description}</Text>
      </View>

      <Card accent={TOURNAMENT_ACCENT} style={{ gap: 16 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <Text variant="micro" style={{ color: TOURNAMENT_ACCENT }}>
            Défi · briefing
          </Text>
          <PhasePill phase={tournament.phase} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
          <Figure label="Points" value={String(challenge.points)} unit="pts" big />
          <Figure
            label="Statut"
            value={CHALLENGE_STATUS_LABELS[status]}
            color={CHALLENGE_STATUS_COLOR[status]}
          />
          <Figure
            label={tournament.myTeam !== null ? "Ton équipe" : "Tournoi"}
            value={tournament.myTeam ?? tournament.title}
          />
          <Figure
            label={tournament.phase === "FINISHED" ? "Terminé le" : "Fin"}
            value={tournamentDateLabel(new Date(tournament.endsAt))}
          />
        </View>
      </Card>

      <View>
        <SectionLabel
          title="Instructions"
          right={<SectionCount text={`${String(challenge.points)} pts`} />}
        />
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

      {challenge.resourceUrl !== null ? (
        <View>
          <SectionLabel title="Connexion" />
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              padding: 12,
              backgroundColor: colors.bgBase,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
            <Text variant="mono" style={{ color: TOURNAMENT_ACCENT }}>
              $
            </Text>
            <Text selectable variant="mono" style={{ flex: 1, color: colors.textPrimary }}>
              {challenge.resourceUrl}
            </Text>
          </View>
        </View>
      ) : null}

      {attachment !== null ? (
        <View>
          <SectionLabel title="Pièce jointe" />
          <View style={{ alignSelf: "flex-start" }}>
            <ActionChip
              label="Télécharger le fichier"
              onPress={() => {
                void WebBrowser.openBrowserAsync(attachment);
              }}
            />
          </View>
        </View>
      ) : null}

      <View>
        {/* Once no flag can be given, the head no longer invites one. */}
        <SectionLabel title={notice !== null && !solved ? "Le flag" : "Soumettre le flag"} />
        {solved ? (
          <Card accent={colors.success} style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <CheckIcon size={14} color={colors.success} strokeWidth={2} />
              <Text variant="micro" style={{ color: colors.success }}>
                Flag trouvé
              </Text>
            </View>
            <Text variant="bodySm">
              {`Ce défi compte pour toi et pour ${tournament.myTeam ?? "ton équipe"}.`}
            </Text>
          </Card>
        ) : notice !== null ? (
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
            <LockIcon size={14} color={colors.textMuted} />
            <Text variant="bodySm" style={{ flex: 1 }}>
              {notice}
            </Text>
          </View>
        ) : (
          <FlagForm
            tournamentId={tournament.id}
            challengeId={challenge.id}
            points={challenge.points}
          />
        )}
        {scriptNote ? (
          <Text variant="bodySm" style={{ marginTop: 10, color: colors.textMuted }}>
            Le flag donné ici compte pour le tournoi, pas pour le catalogue.
          </Text>
        ) : null}
      </View>

      <View>
        <SectionLabel title="Règles du tournoi" />
        <Card>
          <NumberedFacts facts={challenge.onMachine ? [...RULES, MACHINE_RULE] : RULES} />
        </Card>
      </View>
    </View>
  );
}

/**
 * The flag of a tournament challenge. A right one counts for the player and
 * their team, once; a wrong one costs nothing but a moment, which the line
 * under the field says until the server answers.
 */
function FlagForm({
  tournamentId,
  challengeId,
  points,
}: {
  tournamentId: string;
  challengeId: string;
  points: number;
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
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <Text variant="micro" style={{ color: TOURNAMENT_ACCENT }}>
          Flag
        </Text>
        <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
          {`${String(points)} points`}
        </Text>
      </View>
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
        accessibilityLabel="Flag"
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
        <Text
          variant="bodySm"
          accessibilityLiveRegion="polite"
          style={{ color: message.ok ? colors.success : colors.danger }}
        >
          {message.text}
        </Text>
      ) : (
        <Text variant="bodySm">Un mauvais flag ne coûte rien.</Text>
      )}
      <GradientButton
        label="Valider"
        loading={busy}
        disabled={flag.trim() === ""}
        onPress={() => void submit()}
      />
    </View>
  );
}

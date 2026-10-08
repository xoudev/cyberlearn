import { useQueryClient } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { ChallengeWriteups } from "@/components/challenge-writeups";
import { BlockView } from "@/components/lesson-render";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, Text } from "@/components/ui";
import { WeeklyCountdown } from "@/components/weekly-countdown";
import { completeChallengeApi, revealChallengeHintApi, submitChallengeFlagApi } from "@/lib/api";
import {
  attemptsLeft,
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  STATUS_META,
  takesFlag,
  type ChallengeDetail,
} from "@/lib/challenges";
import { useCosmetics } from "@/lib/cosmetics";
import { parseLesson } from "@/lib/lesson-blocks";
import { useChallenge } from "@/lib/queries";
import { useSession } from "@/lib/session";
import { siteLink } from "@/lib/tournaments";

const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL || "https://cyberlearn.fr";

/**
 * One challenge, as the site's page shows it, less what only the site can
 * play: a Linux machine or the Python runner. The statement, where to
 * connect, the file to download, the hints (for the XP they cost) and the
 * flag are here; the machine is one tap away, on the site.
 */
export default function ChallengeScreen(): React.JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { session } = useSession();
  const { data, isLoading, error, refetch } = useChallenge(session?.user.id, slug);

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Défis" />
      </View>
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : error || !data ? (
        <ErrorState onRetry={() => void refetch()} code="CHALLENGE_LOAD" />
      ) : (
        <ChallengeBody challenge={data} />
      )}
    </Screen>
  );
}

function ChallengeBody({ challenge }: { challenge: ChallengeDetail }): React.JSX.Element {
  const { theme } = useCosmetics();
  const queryClient = useQueryClient();
  const status = STATUS_META[challenge.displayStatus];
  const sections = useMemo(() => parseLesson(challenge.instructions).sections, [challenge]);
  const router = useRouter();
  const done = challenge.displayStatus === "COMPLETED";
  const locked = challenge.displayStatus === "LOCKED";
  const weekly = challenge.weekly ?? null;
  // As on the site's page, both are shown whatever the state, a lock included.
  const resource = challenge.resourceUrl ?? null;
  const file = challenge.attachmentUrl ?? null;
  const attachment = file === null ? null : siteLink(file, SITE_URL);
  // Twice the reward while this is the week's challenge; what was earned, once solved.
  const xp = done
    ? (challenge.xpEarned ?? challenge.xpReward)
    : challenge.xpReward * (weekly?.multiplier ?? 1);

  const refresh = (): void => {
    void queryClient.invalidateQueries({ queryKey: ["challenge", challenge.slug] });
    void queryClient.invalidateQueries({ queryKey: ["challenges"] });
  };

  return (
    <View style={{ gap: 18 }}>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Pill label={status.label} color={status.color} />
          <Text variant="mono" style={{ fontSize: 10.5, color: colors.textMuted }}>
            {`${challenge.refCode} · ${CATEGORY_LABEL[challenge.category]} · ${DIFFICULTY_LABEL[challenge.difficulty]} · ${String(xp)} XP`}
          </Text>
        </View>
        <Text variant="display" style={{ fontSize: 26 }}>
          {challenge.title}
        </Text>
        <Text variant="body">{challenge.description}</Text>
      </View>

      {weekly !== null ? (
        <Card accent={colors.danger} style={{ gap: 6 }}>
          <Text variant="micro" style={{ color: colors.danger }}>
            DÉFI DE LA SEMAINE
          </Text>
          <Text variant="bodySm">
            {done
              ? `Résolu cette semaine : ${String(xp)} XP gagnés.`
              : `${String(xp)} XP jusqu'à lundi, au lieu de ${String(challenge.xpReward)}.`}
          </Text>
          <WeeklyCountdown
            endsAt={weekly.endsAt}
            prefix={done ? "Prochain défi dans" : `XP ×${String(weekly.multiplier)} encore`}
            onEnd={refresh}
          />
        </Card>
      ) : null}

      {locked && challenge.prerequisiteTitle !== null ? (
        <Card style={{ gap: 8 }}>
          <Text variant="micro" style={{ color: colors.textMuted }}>
            VERROUILLÉ
          </Text>
          <Text variant="bodySm">{`Résous d'abord « ${challenge.prerequisiteTitle} ».`}</Text>
          {challenge.prerequisiteSlug ? (
            <ActionChip
              label={`Ouvrir « ${challenge.prerequisiteTitle} »`}
              tone="danger"
              onPress={() => {
                router.push({
                  pathname: "/challenges/[slug]",
                  params: { slug: challenge.prerequisiteSlug ?? "" },
                });
              }}
            />
          ) : null}
        </Card>
      ) : null}

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

      {challenge.onMachine && !locked ? (
        <Card accent={theme.accent} style={{ gap: 8 }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            MACHINE LINUX
          </Text>
          <Text variant="bodySm">
            Ce défi se joue sur une machine Linux qui tourne dans le navigateur, sur le site : il
            faut un clavier et un écran. Le flag que tu y trouves est le tien ; reviens le donner
            ici ou sur le site.
          </Text>
          <ActionChip
            label="Ouvrir sur le site"
            onPress={() => {
              void WebBrowser.openBrowserAsync(`${SITE_URL}/challenges/${challenge.slug}`);
            }}
          />
        </Card>
      ) : null}

      {challenge.type === "SCRIPT" && !locked ? (
        <Text variant="bodySm" style={{ color: colors.textSecondary }}>
          Le code se lance sur le site, dans son interpréteur Python. Le flag qu&apos;il affiche se
          donne ici ou là-bas.
        </Text>
      ) : null}

      {resource !== null ? (
        <View style={{ gap: 8 }}>
          <Text variant="h2">Connexion</Text>
          <Card accent={theme.accent} style={{ flexDirection: "row", gap: 8 }}>
            <Text variant="mono" style={{ color: theme.accent }}>
              $
            </Text>
            <Text selectable variant="mono" style={{ flex: 1, color: colors.textPrimary }}>
              {resource}
            </Text>
          </Card>
          <Text variant="bodySm" style={{ color: colors.textMuted }}>
            Appuie longuement pour copier.
          </Text>
        </View>
      ) : null}

      {attachment !== null ? (
        <View style={{ gap: 8 }}>
          <Text variant="h2">Pièces jointes</Text>
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

      {challenge.hints.length > 0 && !locked ? (
        <Hints hints={challenge.hints} done={done} onRevealed={refresh} />
      ) : null}

      {!locked && !done ? (
        takesFlag(challenge.type) ? (
          <FlagForm challenge={challenge} onAnswered={refresh} />
        ) : (
          <MarkDone challenge={challenge} onDone={refresh} />
        )
      ) : null}

      {done ? (
        <Card accent={colors.success} style={{ gap: 4 }}>
          <Text variant="micro" style={{ color: colors.success }}>
            RÉSOLU
          </Text>
          <Text variant="bodySm">{`Défi résolu : ${String(xp)} XP gagnés.`}</Text>
        </Card>
      ) : null}

      {!locked ? <ChallengeWriteups challengeId={challenge.id} /> : null}
    </View>
  );
}

function Hints({
  hints,
  done,
  onRevealed,
}: {
  hints: ChallengeDetail["hints"];
  done: boolean;
  onRevealed: () => void;
}): React.JSX.Element {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reveal = (hint: ChallengeDetail["hints"][number]): void => {
    const go = async (): Promise<void> => {
      setBusy(hint.id);
      setError(null);
      const result = await revealChallengeHintApi(hint.id);
      setBusy(null);
      if (result.error !== undefined) setError(result.error);
      else onRevealed();
    };
    if (hint.xpCost === 0) {
      void go();
      return;
    }
    Alert.alert("Révéler l'indice ?", `Il coûte ${String(hint.xpCost)} XP.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Révéler", onPress: () => void go() },
    ]);
  };

  return (
    <View style={{ gap: 8 }}>
      <Text variant="h2">Indices</Text>
      {hints.map((hint, i) => (
        <Card key={hint.id} style={{ gap: 6 }}>
          <Text variant="micro" style={{ color: colors.textMuted }}>
            {`INDICE ${String(i + 1)}${hint.xpCost > 0 ? ` · ${String(hint.xpCost)} XP` : " · gratuit"}`}
          </Text>
          {hint.content !== null ? (
            <Text variant="bodySm">{hint.content}</Text>
          ) : done ? null : (
            <ActionChip
              label={busy === hint.id ? "…" : "Révéler"}
              disabled={busy !== null}
              onPress={() => {
                reveal(hint);
              }}
            />
          )}
        </Card>
      ))}
      {error !== null ? (
        <Text variant="bodySm" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function FlagForm({
  challenge,
  onAnswered,
}: {
  challenge: ChallengeDetail;
  onAnswered: () => void;
}): React.JSX.Element {
  const [flag, setFlag] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const left = attemptsLeft(challenge);

  const submit = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    const result = await submitChallengeFlagApi(challenge.id, flag);
    setBusy(false);
    if (result.correct) {
      setFlag("");
      onAnswered();
      return;
    }
    setMessage(result.error ?? "Flag incorrect.");
    onAnswered();
  };

  return (
    <View style={{ gap: 10 }}>
      <Text variant="h2">Ton flag</Text>
      <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
        {`${String(left)} essai${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}`}
      </Text>
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
        editable={left > 0 && !busy}
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
        <Text variant="bodySm" style={{ color: colors.danger }}>
          {message}
        </Text>
      ) : null}
      <GradientButton
        label="Valider le flag"
        loading={busy}
        disabled={flag.trim() === "" || left === 0}
        onPress={() => void submit()}
      />
    </View>
  );
}

function MarkDone({
  challenge,
  onDone,
}: {
  challenge: ChallengeDetail;
  onDone: () => void;
}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ gap: 8 }}>
      {error !== null ? (
        <Text variant="bodySm" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      <GradientButton
        label="J'ai terminé"
        loading={busy}
        onPress={() => {
          setBusy(true);
          void completeChallengeApi(challenge.id).then((result) => {
            setBusy(false);
            if (result.error !== undefined) setError(result.error);
            else onDone();
          });
        }}
      />
    </View>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { AuthField } from "@/components/auth-form";
import { ActionChip, GradientButton } from "@/components/buttons";
import { MessageInput } from "@/components/forum";
import { Avatar } from "@/components/media";
import { PathGuideFlow, type GuideAnswers } from "@/components/path-guide";
import { Screen } from "@/components/screen";
import { Card, SectionLabel, Text } from "@/components/ui";
import {
  finishOnboardingApi,
  saveOnboardingAvatarApi,
  saveOnboardingGoalsApi,
  saveOnboardingProfileApi,
  type OnboardingProfileReply,
} from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import {
  BIO_MAX,
  DEFAULT_ONBOARDING_AVATAR,
  DISPLAY_NAME_MAX,
  ONBOARDING_AVATAR_CHOICES,
  ONBOARDING_STEPS,
  USERNAME_MAX,
  handleInput,
  isOnboardingAvatar,
  type OnboardingStep,
} from "@/lib/onboarding";
import { PLACEMENT_COPY, offersPlacementTest } from "@/lib/placement";
import { useSession } from "@/lib/session";
import { supabase } from "@/lib/supabase";

/**
 * Signing up, in the app: the site's three steps (who you are, what you look
 * like, what you came for), through the site's service. It used to send
 * people to cyberlearn.fr and ask them to come back.
 */
export default function Onboarding(): React.JSX.Element {
  const { step: requested } = useLocalSearchParams<{ step?: string }>();
  const [step, setStep] = useState<OnboardingStep>(
    requested === "avatar" || requested === "goals" ? requested : "profile",
  );
  const { session } = useSession();
  const userId = session?.user.id;
  const { data: account } = useQuery({
    queryKey: ["onboarding-account", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("username,displayName,bio,avatarUrl")
        .eq("id", userId as string) // gated by `enabled`
        .maybeSingle();
      return data as {
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
      } | null;
    },
  });

  return (
    <Screen>
      <Stepper current={step} />

      {step === "profile" ? (
        <ProfileStep initial={account ?? null} onDone={() => setStep("avatar")} />
      ) : step === "avatar" ? (
        <AvatarStep
          initial={account?.avatarUrl ?? null}
          displayName={account?.displayName ?? ""}
          onBack={() => setStep("profile")}
          onDone={() => setStep("goals")}
        />
      ) : (
        <GoalsStep onBack={() => setStep("avatar")} />
      )}

      <Pressable
        onPress={() => void supabase.auth.signOut()}
        accessibilityRole="button"
        style={{ marginTop: 28, minHeight: 44, justifyContent: "center" }}
      >
        <Text variant="micro" style={{ textAlign: "center" }}>
          Se déconnecter
        </Text>
      </Pressable>
    </Screen>
  );
}

function Stepper({ current }: { current: OnboardingStep }): React.JSX.Element {
  const { theme } = useCosmetics();
  const index = ONBOARDING_STEPS.findIndex((s) => s.step === current);
  return (
    <View style={{ gap: 10, marginBottom: 22 }}>
      <Text variant="micro" style={{ color: theme.accent }}>
        {`// Inscription · ${String(index + 1).padStart(2, "0")}/03`}
      </Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {ONBOARDING_STEPS.map((s, i) => (
          <View key={s.step} style={{ flex: 1, gap: 6 }}>
            <View
              style={{
                height: 3,
                backgroundColor: i <= index ? theme.accent : colors.borderDefault,
              }}
            />
            <Text variant="micro" style={{ color: i === index ? theme.accent : colors.textMuted }}>
              {s.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FieldError({ message }: { message: string | undefined }): React.JSX.Element | null {
  if (message === undefined) return null;
  return (
    <Text
      variant="bodySm"
      accessibilityRole="alert"
      style={{ color: colors.danger, marginTop: -6 }}
    >
      {message}
    </Text>
  );
}

function ProfileStep({
  initial,
  onDone,
}: {
  initial: { username: string | null; displayName: string; bio: string | null } | null;
  onDone: () => void;
}): React.JSX.Element {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [sending, setSending] = useState(false);
  const [reply, setReply] = useState<OnboardingProfileReply | null>(null);

  // What the account already holds, once it is read: a name taken from the
  // e-mail at sign-up, or what an earlier visit to this step saved.
  useEffect(() => {
    if (!initial) return;
    setUsername((v) => v || (initial.username ?? ""));
    setDisplayName((v) => v || initial.displayName);
    setBio((v) => v || (initial.bio ?? ""));
  }, [initial]);

  const errors = reply && !reply.ok ? (reply.errors ?? {}) : {};

  const send = async (): Promise<void> => {
    setSending(true);
    setReply(null);
    const result = await saveOnboardingProfileApi({ username, displayName, bio });
    setSending(false);
    if (result.ok) onDone();
    else setReply(result);
  };

  return (
    <View style={{ gap: 14 }}>
      <SectionLabel eyebrow="Profil" title="Qui es-tu ?" />
      <Text variant="body" style={{ color: colors.textSecondary }}>
        Ton identifiant sert d'adresse à ton profil, ton nom est celui que les autres voient.
      </Text>

      <AuthField
        label="Identifiant · 3 à 32 · a-z 0-9 -"
        value={username}
        onChangeText={(text) => setUsername(handleInput(text))}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={USERNAME_MAX}
        placeholder="mon-pseudo"
        accessibilityLabel="Identifiant"
      />
      <FieldError message={errors.username} />

      <AuthField
        label="Nom affiché"
        value={displayName}
        onChangeText={setDisplayName}
        maxLength={DISPLAY_NAME_MAX}
        placeholder="Ton nom ou pseudo"
        accessibilityLabel="Nom affiché"
      />
      <FieldError message={errors.displayName} />

      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="micro">Bio</Text>
          <Text
            variant="micro"
            style={{ color: bio.length > BIO_MAX * 0.85 ? colors.warning : colors.textMuted }}
          >
            {`${String(bio.length)} / ${String(BIO_MAX)}`}
          </Text>
        </View>
        <MessageInput
          value={bio}
          onChangeText={setBio}
          minHeight={90}
          maxLength={BIO_MAX}
          placeholder="Qui es-tu ? Qu'est-ce qui t'a amené ici ?"
          accessibilityLabel="Bio"
        />
      </View>
      <FieldError message={errors.bio} />

      {reply && !reply.ok && reply.error ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {reply.error}
        </Text>
      ) : null}

      <GradientButton
        label="Continuer"
        loading={sending}
        disabled={username === "" || displayName.trim() === ""}
        onPress={() => void send()}
      />
    </View>
  );
}

function AvatarStep({
  initial,
  displayName,
  onBack,
  onDone,
}: {
  initial: string | null;
  displayName: string;
  onBack: () => void;
  onDone: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const [picked, setPicked] = useState<string>(
    isOnboardingAvatar(initial) ? initial : DEFAULT_ONBOARDING_AVATAR,
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOnboardingAvatar(initial)) setPicked(initial);
  }, [initial]);

  const send = async (): Promise<void> => {
    setSending(true);
    setError(null);
    const result = await saveOnboardingAvatarApi(picked);
    setSending(false);
    if (result.ok) onDone();
    else setError(result.error ?? "Enregistrement impossible.");
  };

  return (
    <View style={{ gap: 14 }}>
      <SectionLabel eyebrow="Avatar" title="Choisis ton avatar" />
      <Text variant="body" style={{ color: colors.textSecondary }}>
        Il t'accompagne sur ton profil, dans le classement et sur le forum. Une photo peut se mettre
        plus tard, depuis le site.
      </Text>
      <View
        accessibilityRole="radiogroup"
        style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}
      >
        {ONBOARDING_AVATAR_CHOICES.map((choice) => {
          const selected = picked === choice.path;
          return (
            <Pressable
              key={choice.path}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Avatar ${choice.label}`}
              onPress={() => setPicked(choice.path)}
              style={{
                width: "22%",
                flexGrow: 1,
                alignItems: "center",
                gap: 6,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: selected ? theme.accent : colors.borderSubtle,
                backgroundColor: selected ? `${theme.accent}12` : "transparent",
              }}
            >
              <Avatar avatarUrl={choice.path} displayName={displayName || "?"} size={56} />
              <Text variant="micro" style={{ color: selected ? theme.accent : colors.textMuted }}>
                {choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      <GradientButton label="Continuer" loading={sending} onPress={() => void send()} />
      <View style={{ alignSelf: "flex-start" }}>
        <ActionChip label="← Retour" tone="neutral" onPress={onBack} />
      </View>
    </View>
  );
}

/**
 * The last step: the questionnaire, then where to start. Whatever the button,
 * the sign-up ends there, as on the site; the placement test it offers to
 * those who already have a base stays on the site for now.
 */
function GoalsStep({ onBack }: { onBack: () => void }): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (answers: GuideAnswers | null, then: () => void): Promise<void> => {
    if (finishing) return;
    setFinishing(true);
    setError(null);
    const result = await finishOnboardingApi(answers);
    if (!result.ok) {
      setFinishing(false);
      setError(result.error ?? "Impossible de terminer pour l'instant.");
      return;
    }
    // The flag lives in the token: a fresh one carries it, so the site does
    // not send this account back into onboarding either.
    await supabase.auth.refreshSession().catch(() => undefined);
    await queryClient.invalidateQueries();
    then();
  };

  // The test is still part of signing up: the answers are kept, and handing
  // the test in, or skipping it, is what ends it, as on the site.
  const toPlacement = async (answers: GuideAnswers): Promise<void> => {
    if (finishing) return;
    setFinishing(true);
    setError(null);
    const result = await saveOnboardingGoalsApi(answers);
    setFinishing(false);
    if (!result.ok) {
      setError(result.error ?? "Impossible d'enregistrer tes réponses pour l'instant.");
      return;
    }
    router.push("/placement");
  };

  return (
    <View style={{ gap: 14 }}>
      <SectionLabel eyebrow="Objectif" title="Qu'est-ce que tu veux apprendre ?" />
      {error !== null ? (
        <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      <PathGuideFlow
        intro="Deux questions pour te proposer par où commencer. Ce sont des suggestions : tout le catalogue reste ouvert, et tu pourras changer d'avis."
        chooseLabel={finishing ? "…" : "Commencer ce parcours"}
        onChoose={(slug, answers) =>
          void finish(answers, () => {
            router.replace("/home");
            router.push({ pathname: "/paths/[slug]", params: { slug } });
          })
        }
        footer={(answers) => (
          <View style={{ gap: 12, marginTop: 8 }}>
            {offersPlacementTest(answers.level) ? (
              <View style={{ gap: 6 }}>
                <View style={{ alignSelf: "flex-start" }}>
                  <ActionChip
                    label={PLACEMENT_COPY.offer}
                    disabled={finishing}
                    onPress={() => void toPlacement(answers)}
                  />
                </View>
                <Text variant="bodySm">{PLACEMENT_COPY.offerNote}</Text>
              </View>
            ) : null}
            <View style={{ alignSelf: "flex-start" }}>
              <ActionChip
                label="Voir tout le catalogue"
                tone="neutral"
                disabled={finishing}
                onPress={() => void finish(answers, () => router.replace("/paths"))}
              />
            </View>
          </View>
        )}
        questionsFooter={
          <Card style={{ gap: 10 }}>
            <ActionChip
              label="Passer, j'explore seul"
              tone="neutral"
              disabled={finishing}
              onPress={() => void finish(null, () => router.replace("/home"))}
            />
            <ActionChip label="← Retour" tone="neutral" onPress={onBack} />
          </Card>
        }
      />
    </View>
  );
}

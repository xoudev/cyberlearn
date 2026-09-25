import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { ActionChip, BackButton, GradientButton } from "@/components/buttons";
import { CheckIcon } from "@/components/icons";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, StatCell, Text, XPBar } from "@/components/ui";
import { fetchPlacementApi, finishOnboardingApi, submitPlacementApi } from "@/lib/api";
import { useCosmetics } from "@/lib/cosmetics";
import { CATEGORY_COLOR } from "@/lib/db";
import {
  PLACEMENT_CATEGORIES,
  PLACEMENT_CATEGORY_LABEL,
  PLACEMENT_COPY,
  PLACEMENT_DIFFICULTY_LABEL,
  masteredPlacementDomains,
  missingAnswersLabel,
  placementLevelFor,
  placementQuestionHeading,
  placementScoreOf,
  strongestPlacementDomain,
  unansweredPlacementQuestions,
  type PlacementQuestion,
  type PlacementResult,
} from "@/lib/placement";
import { supabase } from "@/lib/supabase";

/**
 * The placement test, the last part of signing up for somebody who says they
 * have a base: the site's /onboarding/placement-test on a phone. The questions
 * come without their answers; the score, the lessons it unlocks and the path
 * it recommends are the server's (/api/mobile/placement/*). Handing it in, or
 * skipping it, ends the sign-up.
 */

type Phase =
  | { kind: "intro" }
  | { kind: "taking"; index: number }
  | { kind: "result"; result: PlacementResult };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export default function PlacementScreen(): React.JSX.Element {
  const router = useRouter();
  const queryClient = useQueryClient();
  const test = useQuery({ queryKey: ["placement"], queryFn: fetchPlacementApi });
  const [phase, setPhase] = useState<Phase>({ kind: "intro" });
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The completion flag lives in the token: a fresh one carries it, so the
  // site does not send this account back into onboarding either.
  const settle = async (): Promise<void> => {
    await supabase.auth.refreshSession().catch(() => undefined);
    await queryClient.invalidateQueries();
  };

  const leave = async (): Promise<void> => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await finishOnboardingApi(null);
    if (!result.ok) {
      setBusy(false);
      setError(result.error ?? "Impossible de terminer pour l'instant.");
      return;
    }
    await settle();
    router.replace("/home");
  };

  const submit = async (questions: PlacementQuestion[]): Promise<void> => {
    if (busy) return;
    const missing = unansweredPlacementQuestions(
      questions.map((q) => q.id),
      selected,
    );
    if (missing.length > 0) {
      setError(missingAnswersLabel(missing.length));
      setPhase({ kind: "taking", index: questions.findIndex((q) => q.id === missing[0]) });
      return;
    }
    setBusy(true);
    setError(null);
    const reply = await submitPlacementApi(selected);
    if (!reply.ok) {
      setBusy(false);
      setError(reply.error ?? "Envoi impossible pour l'instant.");
      if (reply.taken === true) void test.refetch();
      return;
    }
    await settle();
    setBusy(false);
    setPhase({
      kind: "result",
      result: { scores: reply.scores, recommendedPathSlug: reply.recommendedPathSlug },
    });
  };

  if (phase.kind === "result") {
    return (
      <ResultView
        result={phase.result}
        onOpenPath={(slug) => {
          router.replace("/home");
          router.push({ pathname: "/paths/[slug]", params: { slug } });
        }}
        onBrowse={() => router.replace("/paths")}
        onHome={() => router.replace("/home")}
      />
    );
  }

  if (test.isPending) {
    return (
      <Screen>
        <ListSkeleton rows={4} />
      </Screen>
    );
  }
  if (test.isError) {
    return (
      <Screen>
        <ErrorState onRetry={() => void test.refetch()} />
      </Screen>
    );
  }

  const data = test.data;
  if (data.status !== "open") {
    return (
      <ClosedView
        taken={data.status === "taken"}
        busy={busy}
        error={error}
        onContinue={() => void leave()}
      />
    );
  }

  if (phase.kind === "intro") {
    return (
      <IntroView
        questions={data.questions}
        estimatedMinutes={data.estimatedMinutes}
        busy={busy}
        error={error}
        onStart={() => {
          setError(null);
          setPhase({ kind: "taking", index: 0 });
        }}
        onSkip={() => void leave()}
      />
    );
  }

  return (
    <TakingView
      questions={data.questions}
      index={phase.index}
      selected={selected}
      busy={busy}
      error={error}
      onSelect={(questionId, optionId) => {
        setError(null);
        setSelected((current) => ({ ...current, [questionId]: optionId }));
      }}
      onGoto={(index) => setPhase({ kind: "taking", index })}
      onFinish={() => void submit(data.questions)}
    />
  );
}

// ── No test to take: already taken, or no question to ask ────────────────────

function ClosedView({
  taken,
  busy,
  error,
  onContinue,
}: {
  taken: boolean;
  busy: boolean;
  error: string | null;
  onContinue: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  return (
    <Screen>
      <View style={{ gap: 16 }}>
        <Text variant="micro" style={{ color: theme.accent }}>
          {"// Test de positionnement"}
        </Text>
        <Text variant="h1">{taken ? "Test déjà passé." : "Test indisponible."}</Text>
        <Text variant="body">
          {taken
            ? "Tu as déjà passé le test de positionnement : il ne se passe qu'une fois. Tes résultats restent appliqués à tes leçons."
            : "Le test de positionnement n'est pas disponible pour l'instant. Tu peux terminer ton inscription et explorer les parcours."}
        </Text>
        <FormError message={error} />
        <GradientButton
          label={busy ? "…" : "Terminer l'inscription"}
          disabled={busy}
          onPress={onContinue}
        />
      </View>
    </Screen>
  );
}

function FormError({ message }: { message: string | null }): React.JSX.Element | null {
  if (message === null) return null;
  return (
    <Text
      variant="bodySm"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{ color: colors.danger }}
    >
      {message}
    </Text>
  );
}

// ── Intro: what the test is, how long, and what it unlocks ───────────────────

function IntroView({
  questions,
  estimatedMinutes,
  busy,
  error,
  onStart,
  onSkip,
}: {
  questions: PlacementQuestion[];
  estimatedMinutes: number;
  busy: boolean;
  error: string | null;
  onStart: () => void;
  onSkip: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const domains = PLACEMENT_CATEGORIES.map((category) => ({
    category,
    count: questions.filter((q) => q.category === category).length,
  })).filter((d) => d.count > 0);

  return (
    <Screen>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Objectif" />
      </View>

      <View style={{ gap: 20 }}>
        <View>
          <Text variant="micro" style={{ color: theme.accent, marginBottom: 6 }}>
            {"// Test de positionnement"}
          </Text>
          <Text variant="display" style={{ fontSize: 26 }}>
            {PLACEMENT_COPY.title}
          </Text>
          <Text variant="body" style={{ marginTop: 12 }}>
            {PLACEMENT_COPY.intro(questions.length)}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <StatCell value={questions.length} label="Questions" />
          <StatCell value={`${String(estimatedMinutes)} min`} label="Durée" />
          <StatCell value={0} label="XP" accent={theme.accent} />
        </View>

        <Card style={{ gap: 12 }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            {"// Domaines évalués"}
          </Text>
          {domains.map((d) => (
            <View
              key={d.category}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingLeft: 12,
                borderLeftWidth: 2,
                borderLeftColor: CATEGORY_COLOR[d.category],
              }}
            >
              <Text variant="h3">{PLACEMENT_CATEGORY_LABEL[d.category]}</Text>
              <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
                {`${String(d.count)} question${d.count > 1 ? "s" : ""}`}
              </Text>
            </View>
          ))}
        </Card>

        <View
          style={{
            borderLeftWidth: 3,
            borderLeftColor: theme.accent,
            backgroundColor: colors.bgElevated,
            padding: 12,
          }}
        >
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            {PLACEMENT_COPY.waiverNote}
          </Text>
        </View>

        <View style={{ gap: 10 }}>
          <GradientButton label="Commencer le test" disabled={busy} onPress={onStart} />
          <FormError message={error} />
          <View style={{ alignSelf: "flex-start" }}>
            <ActionChip
              label="Passer, j'explore seul"
              tone="neutral"
              disabled={busy}
              onPress={onSkip}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

// ── Taking: one question at a time, every question to answer ─────────────────

function TakingView({
  questions,
  index,
  selected,
  busy,
  error,
  onSelect,
  onGoto,
  onFinish,
}: {
  questions: PlacementQuestion[];
  index: number;
  selected: Readonly<Record<string, string>>;
  busy: boolean;
  error: string | null;
  onSelect: (questionId: string, optionId: string) => void;
  onGoto: (index: number) => void;
  onFinish: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const question = questions[index];
  const heading = placementQuestionHeading(questions, index);
  const total = questions.length;
  const answered =
    total -
    unansweredPlacementQuestions(
      questions.map((q) => q.id),
      selected,
    ).length;
  const last = index === total - 1;
  const tone = heading ? CATEGORY_COLOR[heading.category] : theme.accent;

  return (
    <Screen scroll={false}>
      <View style={{ gap: 6, marginBottom: 12 }}>
        <Text variant="micro" style={{ color: theme.accent }}>
          {"// Test de positionnement"}
        </Text>
        {heading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text variant="h3" style={{ flex: 1, color: tone }} numberOfLines={1}>
              {heading.label}
            </Text>
            <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
              {`${pad2(heading.position)} / ${pad2(heading.count)}`}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ gap: 6, marginBottom: 14 }}>
        <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
          Répondues <Text style={{ color: colors.textPrimary }}>{answered}</Text> / {total}
        </Text>
        <XPBar current={answered} needed={Math.max(total, 1)} height={4} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {question ? (
          <>
            <Card accent={tone} style={{ marginBottom: 14, gap: 10 }}>
              <View style={{ alignSelf: "flex-start" }}>
                <Pill
                  label={PLACEMENT_DIFFICULTY_LABEL[question.difficulty] ?? question.difficulty}
                  color={tone}
                />
              </View>
              <Text variant="h2">{question.question}</Text>
            </Card>
            <View style={{ gap: 10 }} accessibilityRole="radiogroup">
              {question.options.map((option, i) => {
                const isSelected = selected[question.id] === option.id;
                return (
                  <Pressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected }}
                    onPress={() => {
                      onSelect(question.id, option.id);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      minHeight: 52,
                      padding: 14,
                      borderWidth: 1.5,
                      borderColor: isSelected ? theme.accent : colors.borderDefault,
                      backgroundColor: isSelected ? `${theme.accent}10` : colors.bgElevated,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text
                      variant="mono"
                      style={{ fontSize: 12, color: isSelected ? theme.accent : colors.textMuted }}
                    >
                      {String.fromCharCode(65 + i)}
                    </Text>
                    <Text variant="body" style={{ flex: 1, color: colors.textPrimary }}>
                      {option.text}
                    </Text>
                    {isSelected ? (
                      <CheckIcon color={theme.accent} size={16} strokeWidth={2} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, marginTop: 12 }}
        contentContainerStyle={{ gap: 6 }}
      >
        {questions.map((q, i) => {
          const done = selected[q.id] !== undefined;
          const current = i === index;
          return (
            <Pressable
              key={q.id}
              accessibilityRole="button"
              accessibilityLabel={`Question ${String(i + 1)}${done ? ", répondue" : ""}`}
              accessibilityState={{ selected: current }}
              onPress={() => {
                onGoto(i);
              }}
              style={{
                width: 40,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: current ? 2 : 1,
                borderColor: current
                  ? theme.accent
                  : done
                    ? `${theme.accent}66`
                    : colors.borderDefault,
                backgroundColor: done ? `${theme.accent}14` : "transparent",
              }}
            >
              <Text
                variant="mono"
                style={{ fontSize: 11, color: current || done ? theme.accent : colors.textMuted }}
              >
                {pad2(i + 1)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ marginTop: error !== null ? 10 : 0 }}>
        <FormError message={error} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 12 }}>
        <ActionChip
          label="Précédent"
          tone="neutral"
          disabled={index === 0}
          onPress={() => {
            onGoto(Math.max(0, index - 1));
          }}
        />
        {last ? (
          <GradientButton
            label={busy ? "Envoi…" : "Voir mon résultat"}
            disabled={busy}
            onPress={onFinish}
            style={{ flex: 1 }}
          />
        ) : (
          <GradientButton
            label="Suivant"
            onPress={() => {
              onGoto(Math.min(total - 1, index + 1));
            }}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </Screen>
  );
}

// ── Result: the three scores, what they unlocked, where to start ─────────────

function ResultView({
  result,
  onOpenPath,
  onBrowse,
  onHome,
}: {
  result: PlacementResult;
  onOpenPath: (slug: string) => void;
  onBrowse: () => void;
  onHome: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const { scores, recommendedPathSlug } = result;
  const strongest = strongestPlacementDomain(scores);
  const mastered = masteredPlacementDomains(scores);

  return (
    <Screen>
      <View style={{ gap: 20 }}>
        <View style={{ gap: 8 }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            {"// Résultats · Test de positionnement"}
          </Text>
          <Text variant="display" style={{ fontSize: 28 }}>
            {PLACEMENT_COPY.resultTitle}
          </Text>
        </View>

        <Card style={{ padding: 0 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              padding: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.borderDefault,
            }}
          >
            <Text variant="micro" style={{ color: theme.accent }}>
              Scores par domaine
            </Text>
            <Text variant="micro">
              Point fort ·{" "}
              <Text variant="micro" style={{ color: CATEGORY_COLOR[strongest] }}>
                {PLACEMENT_CATEGORY_LABEL[strongest].split(" ")[0]}
              </Text>
            </Text>
          </View>
          {PLACEMENT_CATEGORIES.map((category, i) => {
            const score = placementScoreOf(scores, category);
            const color = CATEGORY_COLOR[category];
            return (
              <View
                key={category}
                accessibilityLabel={`${PLACEMENT_CATEGORY_LABEL[category]} : ${String(score)} %, ${placementLevelFor(score)}`}
                style={{
                  gap: 8,
                  padding: 14,
                  borderBottomWidth: i < PLACEMENT_CATEGORIES.length - 1 ? 1 : 0,
                  borderBottomColor: colors.borderSubtle,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
                  <View style={{ width: 3, height: 14, backgroundColor: color }} />
                  <Text variant="h3" style={{ flex: 1 }}>
                    {PLACEMENT_CATEGORY_LABEL[category]}
                  </Text>
                  <Text style={{ fontFamily: `${fonts.sans}_800ExtraBold`, fontSize: 20, color }}>
                    {`${String(score)} %`}
                  </Text>
                </View>
                <View
                  style={{
                    height: 6,
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                    backgroundColor: "rgba(5,4,26,0.9)",
                  }}
                >
                  <View
                    style={{
                      height: "100%",
                      width: `${Math.max(0, Math.min(100, score))}%`,
                      backgroundColor: color,
                    }}
                  />
                </View>
                <Text variant="micro" style={{ color: colors.textMuted }}>
                  {placementLevelFor(score)}
                </Text>
              </View>
            );
          })}
        </Card>

        {mastered.length > 0 ? (
          <View
            style={{
              borderLeftWidth: 3,
              borderLeftColor: colors.success,
              backgroundColor: colors.bgElevated,
              padding: 12,
            }}
          >
            <Text variant="bodySm" style={{ color: colors.textSecondary }}>
              {PLACEMENT_COPY.waived}
            </Text>
          </View>
        ) : null}

        {recommendedPathSlug !== null ? (
          <Card accent={theme.accent} style={{ gap: 12 }}>
            <Text variant="micro" style={{ color: theme.accent }}>
              Parcours recommandé
            </Text>
            <Text variant="body">{PLACEMENT_COPY.recommended}</Text>
            <GradientButton
              label="Voir le parcours"
              onPress={() => {
                onOpenPath(recommendedPathSlug);
              }}
            />
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            {mastered.length === 0 ? (
              <Text variant="body">{PLACEMENT_COPY.fromScratch}</Text>
            ) : null}
            <GradientButton label="Explorer les parcours" onPress={onBrowse} />
          </View>
        )}

        <View style={{ alignSelf: "flex-start" }}>
          <ActionChip label="Accéder à l'accueil" tone="neutral" onPress={onHome} />
        </View>
      </View>
    </Screen>
  );
}

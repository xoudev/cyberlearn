import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import {
  AnimatedXPBar,
  CountUp,
  LevelUpOverlay,
  PopIn,
  PressableScale,
  Rise,
  SparkBurst,
} from "@/components/anim";
import { ActionChip, BackButton } from "@/components/buttons";
import { CheckIcon } from "@/components/icons";
import { BlockView } from "@/components/lesson-render";
import { Screen } from "@/components/screen";
import { ErrorState, ListSkeleton } from "@/components/states";
import { Card, Pill, Text } from "@/components/ui";
import { completeLessonApi, type CompleteLessonResult } from "@/lib/api";
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  DIFFICULTY_LABEL,
  RARITY_COLOR,
  type Rarity,
} from "@/lib/db";
import { parseLesson } from "@/lib/lesson-blocks";
import { markLessonOpened, useLessonDetail } from "@/lib/queries";
import { useSession } from "@/lib/session";

type Step =
  | { mode: "read"; section: number }
  | { mode: "quiz"; qIndex: number; correctCount: number; picked: number | null; revealed: boolean }
  | { mode: "result"; correctCount: number; reward: CompleteLessonResult | null; saving: boolean };

export default function LessonReader(): React.JSX.Element {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const { data, isLoading, error, refetch } = useLessonDetail(userId, slug);

  const [step, setStep] = useState<Step>({ mode: "read", section: 0 });
  const [showLevelUp, setShowLevelUp] = useState(false);

  const parsed = useMemo(() => (data ? parseLesson(data.contentMdx) : null), [data]);

  // Resume tracking: opening a lesson marks it IN_PROGRESS (no XP involved).
  useEffect(() => {
    if (userId && data && data.status !== "COMPLETED") {
      void markLessonOpened(userId, data.id);
    }
  }, [userId, data]);

  if (isLoading || !data || !parsed) {
    return (
      <Screen>
        <View style={{ marginBottom: 16 }}>
          <BackButton />
        </View>
        {error ? (
          <ErrorState onRetry={() => void refetch()} code="LESSON_LOAD" />
        ) : (
          <ListSkeleton rows={3} />
        )}
      </Screen>
    );
  }

  const cat = CATEGORY_COLOR[data.category];
  const sections = parsed.sections;
  const quizzes = parsed.quizzes;
  const totalSteps = sections.length + (quizzes.length > 0 ? 1 : 0);

  async function finishLesson(correctCount: number): Promise<void> {
    setStep({ mode: "result", correctCount, reward: null, saving: true });
    const reward = await completeLessonApi(data?.id ?? "");
    setStep({ mode: "result", correctCount, reward, saving: false });
    if (reward?.leveledUp) setShowLevelUp(true);
    // Refresh every cached read (dashboard, catalogs, profile, paths).
    void queryClient.invalidateQueries();
  }

  return (
    <Screen scroll={false}>
      {/* Header */}
      <View style={{ marginBottom: 12, gap: 8 }}>
        <View
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <BackButton label="Quitter" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <ActionChip
              label="✎ Notes"
              tone="neutral"
              onPress={() =>
                router.push({
                  pathname: "/notes/[lessonId]",
                  params: { lessonId: data.id, title: data.title },
                })
              }
            />
            <Text variant="micro" style={{ color: colors.accent }}>
              {step.mode === "read"
                ? `${String(step.section + 1)} / ${String(sections.length)}`
                : step.mode === "quiz"
                  ? `Quiz ${String(step.qIndex + 1)} / ${String(quizzes.length)}`
                  : "Résultat"}
            </Text>
          </View>
        </View>
        <Text variant="micro" style={{ color: cat }}>
          {CATEGORY_LABEL[data.category]} · {DIFFICULTY_LABEL[data.difficulty]}
        </Text>
        <Text variant="h1" numberOfLines={2}>
          {data.title}
        </Text>
        <AnimatedXPBar
          current={
            step.mode === "read"
              ? step.section + 1
              : step.mode === "quiz"
                ? sections.length + 1
                : totalSteps
          }
          needed={totalSteps}
          height={4}
          delay={0}
        />
      </View>

      {/* Body */}
      {step.mode === "read" ? (
        <ReadView
          key={step.section}
          blocks={sections[step.section]?.blocks ?? []}
          title={sections[step.section]?.title ?? ""}
          isFirst={step.section === 0}
          isLast={step.section === sections.length - 1}
          hasQuiz={quizzes.length > 0}
          onPrev={() => setStep({ mode: "read", section: Math.max(0, step.section - 1) })}
          onNext={() => {
            if (step.section < sections.length - 1) {
              setStep({ mode: "read", section: step.section + 1 });
            } else if (quizzes.length > 0) {
              setStep({ mode: "quiz", qIndex: 0, correctCount: 0, picked: null, revealed: false });
            } else {
              void finishLesson(0);
            }
          }}
        />
      ) : step.mode === "quiz" ? (
        <QuizView
          key={step.qIndex}
          quiz={quizzes[step.qIndex] ?? null}
          picked={step.picked}
          revealed={step.revealed}
          onPick={(i) => setStep({ ...step, picked: i })}
          onValidate={() => setStep({ ...step, revealed: true })}
          onNext={() => {
            const gained = step.picked === quizzes[step.qIndex]?.correct ? 1 : 0;
            const newCount = step.correctCount + gained;
            if (step.qIndex < quizzes.length - 1) {
              setStep({
                mode: "quiz",
                qIndex: step.qIndex + 1,
                correctCount: newCount,
                picked: null,
                revealed: false,
              });
            } else {
              void finishLesson(newCount);
            }
          }}
          isLast={step.qIndex === quizzes.length - 1}
        />
      ) : (
        <ResultView
          correctCount={step.correctCount}
          total={quizzes.length}
          reward={step.reward}
          saving={step.saving}
          onReplay={() =>
            setStep({ mode: "quiz", qIndex: 0, correctCount: 0, picked: null, revealed: false })
          }
          onContinue={() => router.back()}
          hasQuiz={quizzes.length > 0}
        />
      )}

      {showLevelUp && step.mode === "result" && step.reward ? (
        <LevelUpOverlay level={step.reward.newLevel} onClose={() => setShowLevelUp(false)} />
      ) : null}
    </Screen>
  );
}

// ── Reading view ──────────────────────────────────────────────────────────────

function ReadView({
  blocks,
  title,
  isFirst,
  isLast,
  hasQuiz,
  onPrev,
  onNext,
}: {
  blocks: React.ComponentProps<typeof BlockView>["block"][];
  title: string;
  isFirst: boolean;
  isLast: boolean;
  hasQuiz: boolean;
  onPrev: () => void;
  onNext: () => void;
}): React.JSX.Element {
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <Rise index={0}>
          <Text variant="h2" style={{ marginBottom: 14 }}>
            {title}
          </Text>
        </Rise>
        <View style={{ gap: 14 }}>
          {blocks.map((b, i) => (
            <Rise key={i} index={Math.min(i + 1, 6)}>
              <BlockView block={b} index={i} />
            </Rise>
          ))}
        </View>
      </ScrollView>
      <View style={{ flexDirection: "row", gap: 10, paddingVertical: 10 }}>
        {!isFirst ? (
          <PressableScale
            onPress={onPrev}
            style={{
              flex: 1,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.borderDefault,
            }}
          >
            <Text variant="micro">← Précédent</Text>
          </PressableScale>
        ) : null}
        <PressableScale
          onPress={onNext}
          style={{
            flex: 2,
            height: 46,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accent,
          }}
        >
          <Text variant="micro" style={{ color: colors.bgBase, letterSpacing: 1 }}>
            {isLast ? (hasQuiz ? "Passer au quiz →" : "Terminer la leçon ✓") : "Continuer →"}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

// ── Quiz view ─────────────────────────────────────────────────────────────────

function QuizView({
  quiz,
  picked,
  revealed,
  onPick,
  onValidate,
  onNext,
  isLast,
}: {
  quiz: { question: string; options: string[]; correct: number } | null;
  picked: number | null;
  revealed: boolean;
  onPick: (i: number) => void;
  onValidate: () => void;
  onNext: () => void;
  isLast: boolean;
}): React.JSX.Element {
  if (!quiz) return <View />;
  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <Rise index={0}>
          <Card accent={colors.accent} style={{ marginBottom: 16 }}>
            <Text variant="h2">{quiz.question}</Text>
          </Card>
        </Rise>
        <View style={{ gap: 10 }}>
          {quiz.options.map((opt, i) => {
            const isPicked = picked === i;
            const isCorrect = revealed && i === quiz.correct;
            const isWrong = revealed && isPicked && i !== quiz.correct;
            const border = isCorrect
              ? colors.success
              : isWrong
                ? colors.danger
                : isPicked
                  ? colors.accent
                  : colors.borderDefault;
            return (
              <Rise key={i} index={i + 1}>
                <PressableScale disabled={revealed} onPress={() => onPick(i)}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      borderWidth: 1.5,
                      borderColor: border,
                      backgroundColor:
                        isPicked && !revealed ? "rgba(10,255,212,0.06)" : colors.bgElevated,
                      padding: 14,
                    }}
                  >
                    <Text
                      variant="mono"
                      style={{
                        color: isCorrect
                          ? colors.success
                          : isWrong
                            ? colors.danger
                            : colors.textMuted,
                        fontSize: 12,
                      }}
                    >
                      {String.fromCharCode(65 + i)}
                    </Text>
                    <Text variant="body" style={{ flex: 1, color: colors.textPrimary }}>
                      {opt}
                    </Text>
                    {isCorrect ? (
                      <CheckIcon color={colors.success} size={16} strokeWidth={2} />
                    ) : null}
                  </View>
                </PressableScale>
              </Rise>
            );
          })}
        </View>
        {revealed ? (
          <PopIn style={{ marginTop: 14 }}>
            <View
              style={{
                borderLeftWidth: 3,
                borderLeftColor: picked === quiz.correct ? colors.success : colors.danger,
                backgroundColor:
                  picked === quiz.correct ? "rgba(10,255,212,0.07)" : "rgba(255,77,109,0.07)",
                padding: 12,
              }}
            >
              <Text
                variant="micro"
                style={{ color: picked === quiz.correct ? colors.success : colors.danger }}
              >
                {picked === quiz.correct
                  ? "Bonne réponse !"
                  : `Raté - la bonne réponse était ${String.fromCharCode(65 + quiz.correct)}.`}
              </Text>
            </View>
          </PopIn>
        ) : null}
      </ScrollView>
      <View style={{ paddingVertical: 10 }}>
        <PressableScale
          onPress={revealed ? onNext : onValidate}
          disabled={picked === null}
          style={{
            height: 46,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: picked === null ? colors.bgOverlay : colors.accent,
          }}
        >
          <Text
            variant="micro"
            style={{ color: picked === null ? colors.textMuted : colors.bgBase, letterSpacing: 1 }}
          >
            {revealed
              ? isLast
                ? "Voir le résultat →"
                : "Question suivante →"
              : "Valider ma réponse"}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

// ── Result view ───────────────────────────────────────────────────────────────

function ResultView({
  correctCount,
  total,
  reward,
  saving,
  onReplay,
  onContinue,
  hasQuiz,
}: {
  correctCount: number;
  total: number;
  reward: CompleteLessonResult | null;
  saving: boolean;
  onReplay: () => void;
  onContinue: () => void;
  hasQuiz: boolean;
}): React.JSX.Element {
  const xp = reward?.xpGained ?? 0;
  return (
    <ScrollView
      style={{ flex: 1 }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      <View style={{ alignItems: "center", paddingVertical: 26, gap: 8 }}>
        <PopIn>
          <View
            style={{
              width: 74,
              height: 74,
              borderRadius: 37,
              borderWidth: 2,
              borderColor: colors.success,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(10,255,212,0.08)",
            }}
          >
            <CheckIcon color={colors.success} size={30} strokeWidth={2} />
          </View>
        </PopIn>
        <Text variant="h1" style={{ marginTop: 8 }}>
          Leçon terminée !
        </Text>
        {hasQuiz ? (
          <Text variant="bodySm">
            {correctCount}/{total} bonnes réponses
          </Text>
        ) : null}

        {/* XP reward */}
        <View style={{ alignItems: "center", marginTop: 16, minHeight: 96, paddingTop: 4 }}>
          {saving ? (
            <ActivityIndicator color={colors.accent} />
          ) : reward ? (
            reward.alreadyCompleted ? (
              <Pill label="Déjà complétée · pas de nouvel XP" color={colors.textMuted} />
            ) : (
              <View style={{ alignItems: "center" }}>
                <SparkBurst count={12} />
                <CountUp to={xp} prefix="+" suffix=" XP" fontSize={44} delay={200} />
                <Text variant="micro" style={{ marginTop: 4 }}>
                  XP gagnés
                </Text>
              </View>
            )
          ) : (
            <Pill label="XP non synchronisés · réessaie depuis la leçon" color={colors.warning} />
          )}
        </View>

        {/* New badges */}
        {reward && reward.newBadges.length > 0 ? (
          <View style={{ width: "100%", marginTop: 18, gap: 10 }}>
            <Text variant="micro" style={{ textAlign: "center", color: colors.accent }}>
              Badge{reward.newBadges.length > 1 ? "s" : ""} débloqué
              {reward.newBadges.length > 1 ? "s" : ""} !
            </Text>
            {reward.newBadges.map((b, i) => {
              const rarityColor =
                RARITY_COLOR[
                  (b.rarity as Rarity) in RARITY_COLOR ? (b.rarity as Rarity) : "COMMON"
                ];
              return (
                <PopIn key={b.name} delay={400 + i * 200}>
                  <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        borderWidth: 1.5,
                        borderColor: rarityColor,
                        backgroundColor: `${rarityColor}18`,
                      }}
                    />
                    <View style={{ flex: 1 }}>
                      <Text variant="h3">{b.name}</Text>
                      <Text variant="micro" style={{ color: rarityColor }}>
                        {b.rarity} · +{b.xpReward} XP
                      </Text>
                    </View>
                  </Card>
                </PopIn>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {hasQuiz ? (
          <PressableScale
            onPress={onReplay}
            style={{
              flex: 1,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.borderDefault,
            }}
          >
            <Text variant="micro">Rejouer</Text>
          </PressableScale>
        ) : null}
        <PressableScale
          onPress={onContinue}
          style={{
            flex: 2,
            height: 46,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.accent,
          }}
        >
          <Text variant="micro" style={{ color: colors.bgBase, letterSpacing: 1 }}>
            Continuer →
          </Text>
        </PressableScale>
      </View>
    </ScrollView>
  );
}

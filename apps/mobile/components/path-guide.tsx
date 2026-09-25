import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import {
  GOAL_CHOICES,
  LEARNING_GOALS,
  LEVEL_CHOICES,
  type LearningGoal,
  type StartingLevel,
} from "@cyberlearn/lib/paths/suggest";
import { ActionChip, GradientButton } from "@/components/buttons";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";
import { CATEGORY_COLOR, CATEGORY_LABEL, DIFFICULTY_LABEL } from "@/lib/db";
import { suggestionsFor, toggleGoal } from "@/lib/path-guide";
import { useGuidePaths } from "@/lib/queries";

/** Both answers, once given. */
export interface GuideAnswers {
  goals: LearningGoal[];
  level: StartingLevel;
}

/**
 * The site's two questions, then two or three paths with the reason each was
 * picked. Used by "Trouver mon parcours" (nothing recorded) and by the last
 * step of signing up (the answers kept, as on the site): what a suggestion's
 * button does and what sits under the list is the caller's.
 */
export function PathGuideFlow({
  intro,
  chooseLabel,
  onChoose,
  footer,
  questionsFooter,
}: {
  intro: string;
  /** The button on each suggested path. */
  chooseLabel: string;
  onChoose: (slug: string, answers: GuideAnswers) => void;
  /** Under the suggestions. */
  footer: (answers: GuideAnswers) => React.ReactNode;
  /** Under the questions, before they are answered. */
  questionsFooter?: React.ReactNode;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const { data, isLoading, error, refetch } = useGuidePaths();
  const [goals, setGoals] = useState<LearningGoal[]>([]);
  const [level, setLevel] = useState<StartingLevel | null>(null);
  const [answered, setAnswered] = useState(false);

  const suggestions = useMemo(
    () => (answered && data ? suggestionsFor(data, goals, level) : []),
    [answered, data, goals, level],
  );

  if (!answered || level === null) {
    return (
      <View style={{ gap: 22 }}>
        <Text variant="body">{intro}</Text>

        <Question
          legend="Question 1 sur 2"
          title="Qu'est-ce qui t'amène ?"
          hint="Coche tout ce qui te parle."
        >
          {GOAL_CHOICES.map((c) => (
            <Choice
              key={c.value}
              kind="checkbox"
              label={c.label}
              detail={`Par exemple : ${c.examples}`}
              checked={goals.includes(c.value)}
              onPress={() => setGoals((g) => toggleGoal(g, c.value, LEARNING_GOALS))}
            />
          ))}
        </Question>

        <Question
          legend="Question 2 sur 2"
          title="Tu pars d'où ?"
          hint="Pour ne te proposer ni trop facile, ni trop dur."
        >
          {LEVEL_CHOICES.map((c) => (
            <Choice
              key={c.value}
              kind="radio"
              label={c.label}
              detail={c.examples}
              checked={level === c.value}
              onPress={() => setLevel(c.value)}
            />
          ))}
        </Question>

        <GradientButton
          label="Voir mes suggestions"
          disabled={goals.length === 0 || level === null}
          onPress={() => setAnswered(true)}
        />
        {goals.length === 0 || level === null ? (
          <Text variant="bodySm" style={{ textAlign: "center", marginTop: -12 }}>
            Réponds aux deux questions pour continuer.
          </Text>
        ) : null}
        {questionsFooter}
      </View>
    );
  }

  const answers: GuideAnswers = { goals, level };
  return (
    <View style={{ gap: 12 }}>
      <Recap goals={goals} level={level} onEdit={() => setAnswered(false)} />
      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} code="GUIDE_LOAD" />
      ) : suggestions.length === 0 ? (
        <EmptyState
          title="Rien à suggérer pour l'instant"
          body="Aucun parcours publié ne correspond encore à ces réponses. Le catalogue complet reste ouvert."
        />
      ) : (
        suggestions.map(({ path, reason }, i) => {
          const cat = CATEGORY_COLOR[path.category];
          const choose = (): void => onChoose(path.slug, answers);
          return (
            <Card key={path.slug} accent={cat} style={{ gap: 8 }}>
              <Text variant="micro" style={{ color: cat }}>
                {CATEGORY_LABEL[path.category]} · {DIFFICULTY_LABEL[path.difficulty]}
                {path.track === "CAREER" ? " · Métier" : ""} · {path.lessonCount} missions
              </Text>
              <Text variant="h3">{path.title}</Text>
              <Text variant="bodySm">
                <Text variant="micro" style={{ color: theme.accent }}>
                  Pourquoi{"  "}
                </Text>
                {reason}
              </Text>
              {i === 0 ? (
                <GradientButton label={chooseLabel} onPress={choose} style={{ marginTop: 4 }} />
              ) : (
                <View style={{ alignSelf: "flex-start", marginTop: 4 }}>
                  <ActionChip label={chooseLabel} onPress={choose} />
                </View>
              )}
            </Card>
          );
        })
      )}
      {footer(answers)}
    </View>
  );
}

function Question({
  legend,
  title,
  hint,
  children,
}: {
  legend: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View accessibilityRole="none" style={{ gap: 8 }}>
      <Text variant="micro">{legend}</Text>
      <Text variant="h2" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="bodySm">{hint}</Text>
      <View style={{ gap: 8, marginTop: 4 }}>{children}</View>
    </View>
  );
}

function Choice({
  kind,
  label,
  detail,
  checked,
  onPress,
}: {
  kind: "checkbox" | "radio";
  label: string;
  detail: string;
  checked: boolean;
  onPress: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={kind}
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      accessibilityHint={detail}
      style={({ pressed }) => ({
        flexDirection: "row",
        gap: 12,
        minHeight: 44,
        padding: 14,
        borderWidth: 1,
        borderColor: checked ? theme.accent : pressed ? colors.textMuted : colors.borderDefault,
        backgroundColor: checked ? `${theme.accent}10` : "rgba(5,4,26,0.6)",
      })}
    >
      <View
        style={{
          width: 16,
          height: 16,
          marginTop: 2,
          borderWidth: 1.5,
          borderColor: checked ? theme.accent : colors.textMuted,
          backgroundColor: checked ? theme.accent : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked ? <View style={{ width: 6, height: 6, backgroundColor: colors.bgBase }} /> : null}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text variant="h3">{label}</Text>
        <Text variant="bodySm">{detail}</Text>
      </View>
    </Pressable>
  );
}

function Recap({
  goals,
  level,
  onEdit,
}: {
  goals: LearningGoal[];
  level: StartingLevel | null;
  onEdit: () => void;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const goalLabels = GOAL_CHOICES.filter((c) => goals.includes(c.value)).map((c) => c.label);
  const levelLabel = LEVEL_CHOICES.find((c) => c.value === level)?.label ?? "";
  return (
    <Card accent={theme.accent} style={{ gap: 8 }}>
      <Text variant="micro" style={{ color: theme.accent }}>
        Tu as répondu
      </Text>
      <Text variant="bodySm">
        {goalLabels.join(", ")} · {levelLabel}.
      </Text>
      <View style={{ alignSelf: "flex-start" }}>
        <ActionChip label="Modifier mes réponses" tone="neutral" onPress={onEdit} />
      </View>
    </Card>
  );
}

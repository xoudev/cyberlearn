import React, { useState } from "react";
import { Pressable, View } from "react-native";
import {
  debriefLine,
  ENDING_LABELS,
  endingsOf,
  paragraphsOf,
  play,
  recommendedPath,
  VERDICT_LABELS,
} from "@cyberlearn/lib/story/incident";
import type { IncidentStory, StoryEnding, StoryVerdict } from "@cyberlearn/types";
import { colors, fonts } from "@cyberlearn/tokens";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * The site's <IncidentStory>, played in the app: the same scenes, decided by
 * a tap, each decision kept on screen with its verdict and its consequence
 * (@cyberlearn/lib/story/incident), the debrief at an ending, and a replay
 * that keeps counting the endings found.
 */

const MONO = `${fonts.mono}_400Regular`;
const BOLD = `${fonts.sans}_700Bold`;

export function IncidentStoryExercise({ story }: { story: IncidentStory }): React.JSX.Element {
  const { theme } = useCosmetics();
  const [picks, setPicks] = useState<number[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [showPath, setShowPath] = useState(false);

  const verdictColor: Record<StoryVerdict, string> = {
    good: theme.accent,
    risky: colors.warning,
    bad: colors.danger,
  };
  const endingColor: Record<StoryEnding, string> = {
    success: theme.accent,
    partial: colors.warning,
    failure: colors.danger,
  };

  const run = play(story, picks);
  const endings = endingsOf(story);
  const path = recommendedPath(story);

  const choose = (pick: number): void => {
    const next = [...picks, pick];
    const after = play(story, next);
    setPicks(next);
    if (after.ending !== null && !found.includes(after.scene.id)) {
      setFound([...found, after.scene.id]);
    }
  };

  const restart = (): void => {
    setPicks([]);
    setShowPath(false);
  };

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.borderDefault,
        borderTopWidth: 2,
        borderTopColor: theme.accent,
        backgroundColor: colors.bgElevated,
      }}
    >
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          gap: 2,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text variant="micro" style={{ color: theme.accent }}>
            INCIDENT À CHOIX
          </Text>
          <Text variant="micro">
            {run.ending === null ? `Décision ${String(run.steps.length + 1)}` : "Fin"}
          </Text>
        </View>
        {story.title !== undefined ? (
          <Text variant="body" style={{ fontFamily: BOLD }}>
            {story.title}
          </Text>
        ) : null}
      </View>

      <View style={{ padding: 12, gap: 12 }}>
        {story.role !== undefined ? (
          <Text variant="bodySm" style={{ color: colors.textSecondary, fontStyle: "italic" }}>
            {story.role}
          </Text>
        ) : null}
        {story.task !== undefined ? (
          <Text variant="bodySm" style={{ color: colors.textSecondary }}>
            {story.task}
          </Text>
        ) : null}

        {run.steps.map((step, k) => (
          <View
            key={k}
            accessibilityLabel={`Décision ${String(k + 1)} : ${step.choice.text}, ${VERDICT_LABELS[step.choice.verdict]}`}
            style={{
              borderLeftWidth: 2,
              borderLeftColor: verdictColor[step.choice.verdict],
              paddingLeft: 10,
              gap: 3,
            }}
          >
            {step.scene.title !== undefined ? (
              <Text style={{ fontFamily: MONO, fontSize: 11, color: colors.textMuted }}>
                {step.scene.title}
              </Text>
            ) : null}
            <Text variant="bodySm" style={{ color: colors.textPrimary }}>
              {step.choice.text}
            </Text>
            <Text variant="micro" style={{ color: verdictColor[step.choice.verdict] }}>
              {VERDICT_LABELS[step.choice.verdict]}
            </Text>
            <Text variant="bodySm" style={{ color: colors.textSecondary }}>
              {step.choice.consequence}
            </Text>
          </View>
        ))}

        <View
          style={{
            borderWidth: 1,
            borderColor: run.ending === null ? colors.borderDefault : endingColor[run.ending],
            padding: 10,
            gap: 8,
          }}
        >
          {run.ending !== null ? (
            <Text variant="micro" style={{ color: endingColor[run.ending] }}>
              {ENDING_LABELS[run.ending]}
            </Text>
          ) : null}
          {run.scene.title !== undefined ? (
            <Text style={{ fontFamily: MONO, fontSize: 12, color: colors.textMuted }}>
              {run.scene.title}
            </Text>
          ) : null}
          {paragraphsOf(run.scene.text).map((paragraph, k) => (
            <Text key={k} variant="body" style={{ color: colors.textPrimary }}>
              {paragraph}
            </Text>
          ))}
          {run.scene.choices !== undefined ? (
            <View style={{ gap: 6 }}>
              {run.scene.choices.map((choice, k) => (
                <Pressable
                  key={k}
                  onPress={() => {
                    choose(k);
                  }}
                  accessibilityRole="button"
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                  }}
                >
                  <Text variant="bodySm" style={{ color: colors.textPrimary }}>
                    {choice.text}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {run.ending !== null ? (
          <View style={{ gap: 8 }}>
            <Text variant="bodySm" style={{ color: colors.textPrimary }}>
              {debriefLine(run)}
            </Text>
            <Text variant="bodySm" style={{ color: colors.textSecondary }}>
              Fins découvertes : {String(found.length)} sur {String(endings.length)}.
              {found.length < endings.length
                ? " Rejoue pour voir où mènent les autres décisions."
                : ""}
            </Text>
            {showPath && path ? (
              <View style={{ gap: 4 }}>
                <Text variant="micro">LA SUITE CONSEILLÉE</Text>
                {path.map((step, k) => (
                  <Text key={k} variant="bodySm" style={{ color: colors.textSecondary }}>
                    {String(k + 1)}.{" "}
                    {step.scene.title !== undefined ? `${step.scene.title} : ` : ""}
                    {step.choice.text}
                  </Text>
                ))}
              </View>
            ) : null}
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
              <Pressable
                onPress={restart}
                accessibilityRole="button"
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: theme.accent,
                }}
              >
                <Text variant="bodySm" style={{ color: theme.accent }}>
                  Rejouer
                </Text>
              </Pressable>
              {path && !showPath ? (
                <Pressable
                  onPress={() => {
                    setShowPath(true);
                  }}
                  accessibilityRole="button"
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: colors.borderDefault,
                  }}
                >
                  <Text variant="micro" style={{ color: colors.textSecondary }}>
                    Voir la suite conseillée
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

import React, { useEffect, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { GradientButton } from "@/components/buttons";
import { Card, Text } from "@/components/ui";
import { fetchMyPathRating, ratePathApi } from "@/lib/api";
import { ratingLabel } from "@/lib/rating";

/**
 * The path's rating, as on the site: open once one of its lessons is
 * completed, changeable at any time, with a comment for the team.
 */
export function PathRatingCard({
  pathId,
  canRate,
  onRated,
}: {
  pathId: string;
  canRate: boolean;
  /** Called with the path's new average, so the screen can refresh it. */
  onRated: () => void;
}): React.JSX.Element {
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canRate) return;
    let cancelled = false;
    void fetchMyPathRating(pathId).then((mine) => {
      if (cancelled || !mine) return;
      setScore(mine.score);
      setFeedback(mine.feedback ?? "");
      setSaved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [pathId, canRate]);

  if (!canRate) {
    return (
      <Card style={{ gap: 6 }}>
        <Text variant="h3">Ton avis</Text>
        <Text variant="bodySm">Termine une première mission pour noter ce parcours.</Text>
      </Card>
    );
  }

  async function send(): Promise<void> {
    setSending(true);
    setError(null);
    const reply = await ratePathApi(pathId, score, feedback.trim() || undefined);
    setSending(false);
    if (reply.ok) {
      setSaved(true);
      onRated();
    } else {
      setError(reply.error);
    }
  }

  return (
    <Card style={{ gap: 12 }}>
      <Text variant="h3">{saved ? "Ta note est enregistrée" : "Note ce parcours"}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${String(n)} étoile${n > 1 ? "s" : ""}`}
            disabled={sending}
            onPress={() => {
              setScore(n);
              setSaved(false);
            }}
            hitSlop={6}
          >
            <Text
              style={{ fontSize: 28, color: n <= score ? colors.warning : colors.borderDefault }}
            >
              ★
            </Text>
          </Pressable>
        ))}
        {score > 0 ? (
          <Text variant="bodySm" style={{ marginLeft: 6 }}>
            {ratingLabel(score)}
          </Text>
        ) : null}
      </View>
      {score > 0 && !saved ? (
        <>
          <TextInput
            value={feedback}
            onChangeText={setFeedback}
            maxLength={500}
            multiline
            textAlignVertical="top"
            placeholder="Un mot pour l'équipe : ce qui manque, ce qui est de trop (facultatif)"
            placeholderTextColor={colors.textDisabled}
            style={{
              minHeight: 80,
              borderWidth: 1,
              borderColor: colors.borderDefault,
              backgroundColor: "rgba(5,4,26,0.6)",
              color: colors.textPrimary,
              fontFamily: `${fonts.mono}_400Regular`,
              fontSize: 13,
              padding: 10,
            }}
          />
          {error ? (
            <Text variant="bodySm" style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}
          <GradientButton
            label={sending ? "Envoi…" : "Envoyer la note"}
            onPress={() => void send()}
            disabled={sending}
          />
        </>
      ) : null}
    </Card>
  );
}

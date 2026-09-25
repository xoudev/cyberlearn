import React, { useEffect, useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { GradientButton } from "@/components/buttons";
import { Card, Text } from "@/components/ui";
import { averageLine, ratingLabel } from "@/lib/rating";

export interface RatingCopy {
  /** Before any rating: "Note ce parcours", "Note cette leçon". */
  title: string;
  /** Shown instead of the stars until rating is open. */
  locked: string;
}

export type RatingSendResult =
  | { ok: true; avgRating: number | null; ratingsCount: number }
  | { ok: false; error: string };

/**
 * A star rating with a comment for the team, as on the site: for a path once
 * one of its lessons is completed, for a lesson once it is. Changeable at any
 * time. Where it is read and sent is the caller's; the rule on who may rate is
 * the server's.
 */
export function RatingCard({
  canRate,
  copy,
  load,
  submit,
  onRated,
}: {
  canRate: boolean;
  copy: RatingCopy;
  /** The reader's own rating, and the average when the caller shows it. */
  load: () => Promise<{
    mine: { score: number; feedback: string | null } | null;
    avgRating?: number | null;
    ratingsCount?: number;
  }>;
  submit: (score: number, feedback: string | undefined) => Promise<RatingSendResult>;
  onRated?: () => void;
}): React.JSX.Element {
  const [average, setAverage] = useState<string | null>(null);
  // The loader is a new function on each render of the caller: read the latest
  // one, but load again only when rating opens or closes.
  const loadRef = useRef(load);
  loadRef.current = load;
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadRef.current().then(({ mine, avgRating, ratingsCount }) => {
      if (cancelled) return;
      if (avgRating !== undefined) setAverage(averageLine(avgRating, ratingsCount ?? 0));
      if (!mine || !canRate) return;
      setScore(mine.score);
      setFeedback(mine.feedback ?? "");
      setSaved(true);
    });
    return () => {
      cancelled = true;
    };
  }, [canRate]);

  if (!canRate) {
    return (
      <Card style={{ gap: 6 }}>
        <Text variant="h3">Ton avis</Text>
        {average !== null ? (
          <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
            <Text style={{ color: colors.warning }}>★</Text> {average}
          </Text>
        ) : null}
        <Text variant="bodySm">{copy.locked}</Text>
      </Card>
    );
  }

  async function send(): Promise<void> {
    setSending(true);
    setError(null);
    const reply = await submit(score, feedback.trim() || undefined);
    setSending(false);
    if (reply.ok) {
      setSaved(true);
      setAverage(averageLine(reply.avgRating, reply.ratingsCount));
      onRated?.();
    } else {
      setError(reply.error);
    }
  }

  return (
    <Card style={{ gap: 12 }}>
      <Text variant="h3">{saved ? "Ta note est enregistrée" : copy.title}</Text>
      {average !== null ? (
        <Text variant="mono" style={{ fontSize: 11, color: colors.textMuted }}>
          <Text style={{ color: colors.warning }}>★</Text> {average}
        </Text>
      ) : null}
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

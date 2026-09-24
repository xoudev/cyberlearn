import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import {
  QUIZ_REPORT_COMMENT_MAX,
  QUIZ_REPORT_REASON_KEYS,
  QUIZ_REPORT_REASON_LABELS,
  type QuizReportReasonKey,
} from "@cyberlearn/lib/quiz/report-reasons";
import { ActionChip, GradientButton } from "@/components/buttons";
import { Text } from "@/components/ui";
import { useCosmetics } from "@/lib/cosmetics";

/**
 * "Signaler cette question", under a quiz: the site's control, with the same
 * reasons. The report goes through the site's service; the console lists
 * them grouped by question.
 */
export function QuizReportControl({
  reported,
  onSend,
}: {
  reported: boolean;
  onSend: (
    reason: QuizReportReasonKey,
    comment: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}): React.JSX.Element {
  const { theme } = useCosmetics();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<QuizReportReasonKey | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  if (!open) {
    return (
      <View style={{ marginTop: 14, gap: 8 }}>
        {reported ? (
          <Text variant="bodySm" accessibilityLiveRegion="polite">
            {justSent
              ? "Merci, c'est signalé. L'équipe va relire cette question."
              : "Tu as signalé cette question. L'équipe va la relire."}
          </Text>
        ) : null}
        <View style={{ alignSelf: "flex-start" }}>
          <ActionChip
            label={reported ? "Modifier le signalement" : "Signaler cette question"}
            tone="neutral"
            onPress={() => {
              setOpen(true);
              setJustSent(false);
            }}
          />
        </View>
      </View>
    );
  }

  const send = async (): Promise<void> => {
    if (reason === null || sending) return;
    setSending(true);
    setError(null);
    const result = await onSend(reason, comment.trim());
    setSending(false);
    if (result.ok) {
      setOpen(false);
      setJustSent(true);
    } else {
      setError(result.error);
    }
  };

  return (
    <View
      style={{
        marginTop: 14,
        padding: 14,
        gap: 8,
        borderWidth: 1,
        borderColor: colors.borderDefault,
        backgroundColor: "rgba(5,4,26,0.6)",
      }}
    >
      <Text variant="micro">Qu&apos;est-ce qui ne va pas ?</Text>
      {QUIZ_REPORT_REASON_KEYS.map((key) => {
        const checked = reason === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            onPress={() => {
              setReason(key);
              setError(null);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              minHeight: 44,
              paddingHorizontal: 12,
              borderWidth: 1,
              borderColor: checked ? theme.accent : colors.borderSubtle,
              backgroundColor: checked ? `${theme.accent}10` : "transparent",
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderWidth: 1.5,
                borderColor: checked ? theme.accent : colors.textMuted,
                backgroundColor: checked ? theme.accent : "transparent",
                transform: [{ rotate: "45deg" }],
              }}
            />
            <Text variant="body" style={{ flex: 1, color: colors.textPrimary }}>
              {QUIZ_REPORT_REASON_LABELS[key]}
            </Text>
          </Pressable>
        );
      })}
      <TextInput
        value={comment}
        onChangeText={setComment}
        maxLength={QUIZ_REPORT_COMMENT_MAX}
        multiline
        placeholder="Précise si tu veux (facultatif)"
        placeholderTextColor={colors.textDisabled}
        accessibilityLabel="Précision, facultative"
        style={{
          minHeight: 72,
          padding: 10,
          borderWidth: 1,
          borderColor: colors.borderDefault,
          backgroundColor: colors.bgBase,
          color: colors.textPrimary,
          fontFamily: `${fonts.sans}_400Regular`,
          fontSize: 14,
          textAlignVertical: "top",
        }}
      />
      {error !== null ? (
        <Text variant="bodySm" style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <GradientButton
          label={sending ? "Envoi…" : "Envoyer"}
          disabled={reason === null || sending}
          onPress={() => void send()}
          style={{ flex: 1 }}
        />
        <ActionChip
          label="Annuler"
          tone="neutral"
          onPress={() => {
            setOpen(false);
            setError(null);
          }}
        />
      </View>
    </View>
  );
}

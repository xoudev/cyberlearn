import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import {
  NOTE_REPORT_COMMENT_MAX,
  NOTE_REPORT_REASON_KEYS,
  NOTE_REPORT_REASON_LABELS,
  type NoteReportReasonKey,
} from "@cyberlearn/lib/notes/report-reasons";
import { ActionChip, GradientButton } from "@/components/buttons";
import { Text } from "@/components/ui";

/**
 * Reporting a received note, as the site's reader does: the same reasons, an
 * optional comment for the team, and the note leaves the reader's list once
 * it is sent. The author is not told who reported it.
 */
export function NoteReportForm({
  onSend,
  onCancel,
}: {
  onSend: (
    reason: NoteReportReasonKey,
    comment: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onCancel: () => void;
}): React.JSX.Element {
  const [reason, setReason] = useState<NoteReportReasonKey | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (): Promise<void> => {
    if (reason === null || sending) return;
    setSending(true);
    setError(null);
    const result = await onSend(reason, comment.trim());
    setSending(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <View
      style={{
        padding: 14,
        gap: 8,
        borderWidth: 1,
        borderColor: `${colors.danger}66`,
        backgroundColor: "rgba(255,71,87,0.05)",
      }}
    >
      <Text variant="micro">Pourquoi signaler cette note ?</Text>
      {NOTE_REPORT_REASON_KEYS.map((key) => {
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
              borderColor: checked ? colors.danger : colors.borderSubtle,
              backgroundColor: checked ? `${colors.danger}10` : "transparent",
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                borderWidth: 1.5,
                borderColor: checked ? colors.danger : colors.textMuted,
                backgroundColor: checked ? colors.danger : "transparent",
                transform: [{ rotate: "45deg" }],
              }}
            />
            <Text variant="body" style={{ flex: 1, color: colors.textPrimary }}>
              {NOTE_REPORT_REASON_LABELS[key]}
            </Text>
          </Pressable>
        );
      })}
      <TextInput
        value={comment}
        onChangeText={setComment}
        maxLength={NOTE_REPORT_COMMENT_MAX}
        multiline
        placeholder="Précisions pour l'équipe (facultatif)"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Précisions pour l'équipe, facultatives"
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
      <Text variant="bodySm">
        L&apos;auteur ne saura pas qui a signalé sa note. Elle sera retirée de tes notes reçues.
      </Text>
      {error !== null ? (
        <Text variant="bodySm" style={{ color: colors.danger }} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <GradientButton
          label={sending ? "Envoi…" : "Envoyer le signalement"}
          disabled={reason === null || sending}
          onPress={() => void send()}
          style={{ flex: 1 }}
        />
        <ActionChip label="Annuler" tone="neutral" onPress={onCancel} />
      </View>
    </View>
  );
}

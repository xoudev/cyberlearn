import React, { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import {
  CONTENT_REPORT_COMMENT_MAX,
  CONTENT_REPORT_PRIVACY,
  CONTENT_REPORT_REASON_KEYS,
  CONTENT_REPORT_REASON_LABELS,
  CONTENT_REPORT_SENT,
  contentReportQuestion,
  type ContentReportReasonKey,
  type ContentReportSurfaceKey,
} from "@cyberlearn/lib/moderation/report-reasons";
import { AppModal } from "@/components/app-modal";
import { ActionChip, GradientButton } from "@/components/buttons";
import { Text } from "@/components/ui";
import { reportContentApi } from "@/lib/api";

/**
 * « Signaler », under what somebody else published, as the site has it: the
 * same reasons and words (@cyberlearn/lib/moderation/report-reasons), an
 * optional comment for the team, and the same service behind
 * /api/mobile/reports. A sheet over the screen, the app's form of the site's
 * window. Nothing leaves the screen once it is sent: the content stays until
 * the team has read it, and the chip says it was reported.
 */
export function ReportContentChip({
  surface,
  contentId,
}: {
  surface: ContentReportSurfaceKey;
  contentId: string;
}): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  return (
    <>
      <ActionChip
        label={sent ? "Signalé" : "Signaler"}
        tone="neutral"
        disabled={sent}
        onPress={() => {
          setOpen(true);
        }}
      />
      <ContentReportSheet
        visible={open}
        surface={surface}
        onClose={() => {
          setOpen(false);
        }}
        onSend={async (reason, comment) => {
          const result = await reportContentApi(surface, contentId, reason, comment);
          if (result.ok) setSent(true);
          return result;
        }}
      />
    </>
  );
}

export function ContentReportSheet({
  visible,
  surface,
  onClose,
  onSend,
}: {
  visible: boolean;
  surface: ContentReportSurfaceKey;
  onClose: () => void;
  onSend: (
    reason: ContentReportReasonKey,
    comment: string,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}): React.JSX.Element {
  const [reason, setReason] = useState<ContentReportReasonKey | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (): Promise<void> => {
    if (reason === null || sending) return;
    setSending(true);
    setError(null);
    const result = await onSend(reason, comment.trim());
    setSending(false);
    if (result.ok) setDone(true);
    else setError(result.error);
  };

  return (
    <AppModal visible={visible} onClose={onClose} closeDisabled={sending} scroll>
      {done ? (
        <>
          <Text variant="h2">Signalement envoyé</Text>
          <Text variant="body" accessibilityRole="alert">
            {CONTENT_REPORT_SENT}
          </Text>
          <ActionChip label="Fermer" tone="neutral" onPress={onClose} />
        </>
      ) : (
        <>
          <Text variant="h2">{contentReportQuestion(surface)}</Text>
          {CONTENT_REPORT_REASON_KEYS.map((key) => {
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
                  {CONTENT_REPORT_REASON_LABELS[key]}
                </Text>
              </Pressable>
            );
          })}
          <TextInput
            value={comment}
            onChangeText={setComment}
            maxLength={CONTENT_REPORT_COMMENT_MAX}
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
          <Text variant="bodySm">{CONTENT_REPORT_PRIVACY}</Text>
          {error !== null ? (
            <Text variant="bodySm" style={{ color: colors.danger }} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <GradientButton
            label={sending ? "Envoi…" : "Envoyer le signalement"}
            disabled={reason === null || sending}
            onPress={() => void send()}
          />
          <ActionChip label="Annuler" tone="neutral" disabled={sending} onPress={onClose} />
        </>
      )}
    </AppModal>
  );
}

import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, View } from "react-native";
import { colors } from "@cyberlearn/tokens";
import { ActionChip, BackButton } from "@/components/buttons";
import { NoteMarkdown } from "@/components/note-markdown";
import { NoteReportForm } from "@/components/note-report";
import { useReceivedNotes } from "@/components/received-notes";
import { Screen } from "@/components/screen";
import { EmptyState, ErrorState, ListSkeleton } from "@/components/states";
import { Card, Text } from "@/components/ui";
import { NOTE_REPORT_SENT } from "@cyberlearn/lib/notes/report-reasons";
import { dismissReceivedNoteApi, reportReceivedNoteApi } from "@/lib/api";
import { useSession } from "@/lib/session";

/**
 * A note somebody handed to the reader, read-only: the site's reader with
 * "partagée par". It is theirs, so there is nothing to edit or share on.
 * Read from the same list as the library, so a note taken back by its author
 * reads as gone rather than lingering.
 */
export default function ReceivedNote(): React.JSX.Element {
  const { noteId } = useLocalSearchParams<{ noteId: string }>();
  const { session } = useSession();
  const { data, isLoading, error, refetch } = useReceivedNotes(session?.user.id);
  const note = data?.find((n) => n.id === noteId) ?? null;
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dismissing, setDismissing] = useState(false);
  const [dismissFailed, setDismissFailed] = useState(false);
  const [reporting, setReporting] = useState(false);

  // As on the site: a received note can hold anything its author wrote, and the
  // reader can at least take it out of their list.
  const dismiss = async (): Promise<void> => {
    if (!note) return;
    setDismissing(true);
    setDismissFailed(false);
    const ok = await dismissReceivedNoteApi(note.id);
    setDismissing(false);
    if (!ok) {
      setDismissFailed(true);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["notes", session?.user.id, "received"] });
    router.back();
  };

  // Reported, the note has left the list on the server: same way out as a
  // dismiss, with the site's words, and never an excerpt of the note.
  const report = async (
    reason: string,
    comment: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!note) return { ok: false, error: "Note introuvable." };
    const result = await reportReceivedNoteApi(note.id, reason, comment);
    if (result.ok) {
      await queryClient.invalidateQueries({ queryKey: ["notes", session?.user.id, "received"] });
      Alert.alert("Signalement envoyé", NOTE_REPORT_SENT);
      router.back();
    }
    return result;
  };

  return (
    <Screen onRefresh={() => refetch()}>
      <View style={{ marginBottom: 16 }}>
        <BackButton label="Bloc-notes" />
      </View>

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState onRetry={() => void refetch()} code="NOTE_RECEIVED" />
      ) : !note ? (
        <EmptyState
          title="Note introuvable"
          body="La personne qui te l'a partagée l'a peut-être reprise."
        />
      ) : (
        <View style={{ gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Text variant="micro" style={{ color: colors.accent }}>
              Note reçue
            </Text>
            <Text variant="h2">{note.lessonTitle}</Text>
            <Text variant="micro" style={{ color: colors.textMuted }}>
              {`maj ${new Date(note.updatedAt).toLocaleDateString("fr-FR")} · ${String(note.wordCount)} mot${note.wordCount > 1 ? "s" : ""} · `}
              <Text variant="micro" style={{ color: colors.accent }}>
                {`partagée par ${note.authorName}`}
              </Text>
            </Text>
          </View>
          <Card>
            {note.content.trim() === "" ? (
              <Text variant="bodySm">Note vide</Text>
            ) : (
              <NoteMarkdown markdown={note.content} />
            )}
          </Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <ActionChip
              label={dismissing ? "…" : "Masquer cette note"}
              tone="neutral"
              disabled={dismissing}
              onPress={() => void dismiss()}
            />
            <ActionChip
              label="Signaler"
              tone="danger"
              onPress={() => {
                setReporting((open) => !open);
              }}
            />
          </View>
          {reporting ? (
            <NoteReportForm
              onSend={report}
              onCancel={() => {
                setReporting(false);
              }}
            />
          ) : null}
          {dismissFailed ? (
            <Text variant="bodySm" accessibilityRole="alert" style={{ color: colors.danger }}>
              Impossible de la masquer, réessaie.
            </Text>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

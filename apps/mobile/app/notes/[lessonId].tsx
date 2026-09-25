import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { colors, fonts } from "@cyberlearn/tokens";
import { PressableScale } from "@/components/anim";
import { ActionChip } from "@/components/buttons";
import { Screen } from "@/components/screen";
import { Text } from "@/components/ui";
import { fetchNoteForLesson, saveNoteForLesson } from "@/lib/queries";
import { useSession } from "@/lib/session";

export default function NoteEditor(): React.JSX.Element {
  const router = useRouter();
  const { lessonId, title } = useLocalSearchParams<{ lessonId: string; title?: string }>();
  const { session } = useSession();
  const userId = session?.user.id;
  const queryClient = useQueryClient();

  const [content, setContent] = useState<string | null>(null); // null = loading
  // The stored note's id, once there is one: sharing needs it.
  const [noteId, setNoteId] = useState<string | null>(null);
  const [sharePending, setSharePending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const dirty = useRef(false);

  useEffect(() => {
    if (!userId || !lessonId) return;
    void fetchNoteForLesson(userId, lessonId).then((note) => {
      setContent(note?.content ?? "");
      setNoteId(note?.id ?? null);
    });
  }, [userId, lessonId]);

  async function save(): Promise<boolean> {
    if (!userId || !lessonId || content === null) return false;
    setSaving(true);
    setSaveError(null);
    try {
      await saveNoteForLesson(userId, lessonId, content);
    } catch {
      setSaving(false);
      setSaveError("Enregistrement impossible. Réessaie.");
      return false;
    }
    setSaving(false);
    setSavedAt(Date.now());
    dirty.current = false;
    void queryClient.invalidateQueries({ queryKey: ["notes", userId] });
    return true;
  }

  /**
   * Opens the share screen. What goes out is the stored note, so unsaved
   * changes are saved first: sharing a version the author has not kept would
   * hand over something they never meant to.
   */
  async function openShare(): Promise<void> {
    if (!userId || !lessonId) return;
    setSharePending(true);
    let id = noteId;
    if (dirty.current || id === null) {
      const saved = await save();
      if (!saved) {
        setSharePending(false);
        return;
      }
      id = (await fetchNoteForLesson(userId, lessonId))?.id ?? null;
      setNoteId(id);
    }
    setSharePending(false);
    if (id === null) return;
    router.push({ pathname: "/notes/share/[noteId]", params: { noteId: id, title: title ?? "" } });
  }

  const words = content && content.trim() !== "" ? content.trim().split(/\s+/).length : 0;

  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <Pressable onPress={() => router.back()}>
            <Text variant="micro">← Retour</Text>
          </Pressable>
          <Text variant="micro" style={{ color: saveError ? colors.danger : colors.textMuted }}>
            {saveError ??
              `${String(words)} mots${savedAt && !dirty.current ? " · enregistré ✓" : ""}`}
          </Text>
        </View>

        <Text variant="micro" style={{ color: colors.accent, marginBottom: 4 }}>
          Note de leçon
        </Text>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
          <Text variant="h2" numberOfLines={2} style={{ flex: 1 }}>
            {title ?? "Ma note"}
          </Text>
          {/* Sharing an empty note is refused by the server; the button waits
              for something to hand over. */}
          {content !== null && content.trim() !== "" ? (
            <ActionChip
              label={sharePending ? "…" : "Partager"}
              disabled={sharePending || saving}
              onPress={() => void openShare()}
            />
          ) : null}
        </View>

        {content === null ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: 30 }} />
        ) : (
          <>
            <TextInput
              value={content}
              onChangeText={(t) => {
                setContent(t);
                dirty.current = true;
              }}
              multiline
              textAlignVertical="top"
              placeholder="Tape tes notes ici… (markdown bienvenu)"
              placeholderTextColor={colors.textDisabled}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: colors.borderDefault,
                backgroundColor: "rgba(5,4,26,0.6)",
                color: colors.textPrimary,
                fontFamily: `${fonts.mono}_400Regular`,
                fontSize: 13,
                lineHeight: 20,
                padding: 14,
              }}
            />
            <PressableScale
              onPress={() => void save()}
              disabled={saving}
              style={{
                marginTop: 12,
                height: 46,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.accent,
              }}
            >
              {saving ? (
                <ActivityIndicator color={colors.bgBase} />
              ) : (
                <Text variant="micro" style={{ color: colors.bgBase, letterSpacing: 1 }}>
                  Enregistrer
                </Text>
              )}
            </PressableScale>
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
